-- Convert approved purchase requests into supplier purchase orders.
create sequence if not exists public.seq_purchase_order start 1;

create table public.purchase_orders (
  purchase_order_id uuid primary key default gen_random_uuid(),
  purchase_order_no text not null unique,
  purchase_request_id uuid not null unique references public.purchase_requests(purchase_request_id),
  supplier_id uuid not null references public.suppliers(supplier_id),
  order_date date not null default current_date,
  expected_date date,
  status text not null default 'ISSUED' check(status in ('DRAFT','ISSUED','PART_RECEIVED','RECEIVED','CANCELLED')),
  terms text, remarks text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.purchase_order_lines (
  purchase_order_line_id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(purchase_order_id) on delete cascade,
  line_no int not null, material_id uuid references public.materials(material_id),
  item_description text not null, quantity numeric not null check(quantity>0),
  uom_text text not null, rate numeric check(rate is null or rate>=0),
  remarks text, created_at timestamptz not null default now(), created_by text not null default 'system',
  unique(purchase_order_id,line_no)
);

create or replace function public.create_purchase_order(p_request uuid,p_supplier uuid,p_expected date,p_terms text default null,p_remarks text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_no text;v_status text;
begin
 if not has_factory_role(auth.uid(),array['admin','purchase']) then raise exception 'not authorized';end if;
 select status into v_status from purchase_requests where purchase_request_id=p_request for update;
 if v_status is distinct from 'APPROVED' then raise exception 'purchase request must be approved';end if;
 if exists(select 1 from purchase_orders where purchase_request_id=p_request) then raise exception 'purchase order already exists for this request';end if;
 v_no:='PO-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_purchase_order')::text,4,'0');
 insert into purchase_orders(purchase_order_no,purchase_request_id,supplier_id,expected_date,terms,remarks,created_by)
 values(v_no,p_request,p_supplier,p_expected,p_terms,p_remarks,auth.uid()::text) returning purchase_order_id into v_id;
 insert into purchase_order_lines(purchase_order_id,line_no,material_id,item_description,quantity,uom_text,rate,remarks,created_by)
 select v_id,line_no,material_id,item_description,quantity,uom_text,rate,remarks,auth.uid()::text from purchase_request_lines where purchase_request_id=p_request order by line_no;
 insert into audit_log(user_id,action,entity_type,entity_id,new_value) values(auth.uid(),'Purchase Order Issued','purchase_orders',v_id,jsonb_build_object('purchase_order_no',v_no,'purchase_request_id',p_request,'supplier_id',p_supplier));
 return v_id;
end $$;

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
create policy factory_read_po on public.purchase_orders for select using(has_factory_role(auth.uid(),array['admin','purchase','accounts','store','viewer']));
create policy factory_read_po_lines on public.purchase_order_lines for select using(has_factory_role(auth.uid(),array['admin','purchase','accounts','store','viewer']));
grant execute on function public.create_purchase_order(uuid,uuid,date,text,text) to authenticated;
