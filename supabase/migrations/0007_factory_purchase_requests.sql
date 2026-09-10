create sequence public.seq_purchase_request start 1;
create table public.purchase_requests (
  purchase_request_id uuid primary key default gen_random_uuid(), purchase_request_no text not null unique,
  request_date date not null default current_date, requested_by text, department text, purpose text, remarks text,
  status text not null default 'PENDING_CHECK' check(status in ('PENDING_CHECK','PENDING_PREAPPROVAL','PENDING_APPROVAL','APPROVED','REJECTED')),
  quickbooks_po_id text, created_at timestamptz not null default now(), created_by text not null default 'system', updated_at timestamptz not null default now(), updated_by text
);
create table public.purchase_request_lines (
  purchase_request_line_id uuid primary key default gen_random_uuid(), purchase_request_id uuid not null references public.purchase_requests(purchase_request_id) on delete cascade,
  line_no int not null, item_description text not null, material_id uuid references public.materials(material_id), quantity numeric not null check(quantity>0),
  uom_text text not null default 'PCS', rate numeric check(rate is null or rate>=0), remarks text,
  created_at timestamptz not null default now(), created_by text not null default 'system', updated_at timestamptz not null default now(), updated_by text, unique(purchase_request_id,line_no)
);
create table public.purchase_request_approvals (
  purchase_request_approval_id uuid primary key default gen_random_uuid(), purchase_request_id uuid not null references public.purchase_requests(purchase_request_id) on delete cascade,
  approval_level text not null check(approval_level in ('PREPARED','CHECKED','PREAPPROVED','APPROVED')), approver_name text, approved_at timestamptz,
  notes text, created_at timestamptz not null default now(), created_by text not null default 'system', unique(purchase_request_id,approval_level)
);
create or replace function public.create_purchase_request(p_requested_by text,p_department text,p_purpose text,p_remarks text,p_lines jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_no text;v_line jsonb;v_n int:=0;
begin
 if not has_factory_role(auth.uid(),array['admin','purchase']) then raise exception 'not authorized';end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'at least one line is required';end if;
 v_no:='PR-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_purchase_request')::text,4,'0');
 insert into purchase_requests(purchase_request_no,requested_by,department,purpose,remarks,created_by) values(v_no,p_requested_by,p_department,p_purpose,p_remarks,auth.uid()::text) returning purchase_request_id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop v_n:=v_n+1;
  insert into purchase_request_lines(purchase_request_id,line_no,item_description,quantity,uom_text,rate,remarks,created_by)
  values(v_id,v_n,v_line->>'item_description',(v_line->>'quantity')::numeric,coalesce(nullif(v_line->>'uom',''),'PCS'),nullif(v_line->>'rate','')::numeric,v_line->>'remarks',auth.uid()::text);
 end loop;
 insert into purchase_request_approvals(purchase_request_id,approval_level,approver_name,approved_at,created_by) values(v_id,'PREPARED',p_requested_by,now(),auth.uid()::text);
 insert into audit_log(user_id,action,entity_type,entity_id,new_value) values(auth.uid(),'Purchase Request Approval','purchase_requests',v_id,jsonb_build_object('level','PREPARED','status','PENDING_CHECK'));
 return v_id;
end $$;
create or replace function public.advance_purchase_request(p_request uuid,p_approver_name text,p_notes text default null)
returns text language plpgsql security definer set search_path=public as $$
declare v_status text;v_level text;v_next text;v_roles text[];
begin
 select status into v_status from purchase_requests where purchase_request_id=p_request for update;
 case v_status when 'PENDING_CHECK' then v_level:='CHECKED';v_next:='PENDING_PREAPPROVAL';v_roles:=array['admin','purchase']; when 'PENDING_PREAPPROVAL' then v_level:='PREAPPROVED';v_next:='PENDING_APPROVAL';v_roles:=array['admin','production_manager']; when 'PENDING_APPROVAL' then v_level:='APPROVED';v_next:='APPROVED';v_roles:=array['admin']; else raise exception 'request cannot advance from status %',v_status;end case;
 if not has_factory_role(auth.uid(),v_roles) then raise exception 'not authorized for %',v_level;end if;
 insert into purchase_request_approvals(purchase_request_id,approval_level,approver_name,approved_at,notes,created_by) values(p_request,v_level,p_approver_name,now(),p_notes,auth.uid()::text);
 update purchase_requests set status=v_next,updated_at=now(),updated_by=auth.uid()::text where purchase_request_id=p_request;
 insert into audit_log(user_id,action,entity_type,entity_id,old_value,new_value) values(auth.uid(),'Purchase Request Approval','purchase_requests',p_request,jsonb_build_object('status',v_status),jsonb_build_object('status',v_next,'level',v_level));return v_next;
end $$;
alter table public.purchase_requests enable row level security;alter table public.purchase_request_lines enable row level security;alter table public.purchase_request_approvals enable row level security;
create policy factory_read_pr on public.purchase_requests for select using(has_factory_role(auth.uid(),array['admin','production_manager','store','purchase','accounts','viewer']));
create policy factory_read_pr_lines on public.purchase_request_lines for select using(has_factory_role(auth.uid(),array['admin','production_manager','store','purchase','accounts','viewer']));
create policy factory_read_pr_approvals on public.purchase_request_approvals for select using(has_factory_role(auth.uid(),array['admin','production_manager','purchase','accounts','viewer']));
grant execute on function public.create_purchase_request(text,text,text,text,jsonb) to authenticated;grant execute on function public.advance_purchase_request(uuid,text,text) to authenticated;
