-- Give Factory the exact Studio revision submitted with the request.
create or replace function public.list_factory_quote_preparation_sources_v2()
returns table(rfq_id uuid,design_project_id uuid,design_revision_id uuid,design_code text,design_name text,family text,revision_no int,design_spec jsonb,weavability jsonb,contact_name text,company text,email text,quantity text,quantity_unit text,target_price text,target_date date)
language sql stable security definer set search_path=public as $$
  select r.id,p.id,dr.id,p.design_code,p.name,p.family::text,dr.revision_no,dr.spec,dr.weavability,r.contact_name,r.company,r.email,r.quantity,r.quantity_unit,r.target_price,r.target_date
  from public.rfqs r
  join public.design_projects p on p.id=r.project_id
  join public.design_revisions dr on dr.id=r.revision_id
  where public.has_factory_role(auth.uid(),array['admin','production_manager','accounts','viewer'])
    and r.kind in('quote','sample')
    and r.status in('Submitted','Under Review','Sample Development','Sample Approved')
    and not exists(select 1 from public.factory_quotations q where q.rfq_id=r.id)
  order by r.created_at;
$$;
revoke all on function public.list_factory_quote_preparation_sources_v2() from public;
grant execute on function public.list_factory_quote_preparation_sources_v2() to authenticated;

-- Sample cost belongs to RFQ costing; Sample Development tracks physical work.
alter table public.quote_costings add column if not exists sample_required boolean not null default false;

create or replace function public.save_quote_preparation_v2(p_rfq uuid,p_details jsonb,p_currency text,p_overhead_percent numeric,p_status text,p_sample_required boolean,p_notes text,p_lines jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_cost uuid;v_family text;v_fixed_count int;
begin
  select p.family::text into v_family from public.rfqs r join public.design_projects p on p.id=r.project_id where r.id=p_rfq;
  if not found then raise exception 'request not found'; end if;
  if coalesce(p_sample_required,false) and v_family='J' then
    select count(*) into v_fixed_count from jsonb_array_elements(p_lines) x where x->>'description'='Jacquard sample development charge' and (x->>'quantity')::numeric=1 and upper(x->>'uom')='JOB' and (x->>'unit_cost')::numeric=15000;
    if v_fixed_count<>1 or upper(coalesce(nullif(trim(p_currency),''),'PKR'))<>'PKR' then raise exception 'Jacquard sample development requires one fixed PKR 15,000 charge'; end if;
  end if;
  v_cost:=public.save_quote_preparation(p_rfq,p_details,p_currency,p_overhead_percent,p_status,p_notes,p_lines);
  update public.quote_costings set sample_required=coalesce(p_sample_required,false) where quote_costing_id=v_cost;
  return v_cost;
end $$;

create or replace function public.list_factory_sample_sources_v2()
returns table(rfq_id uuid,design_project_id uuid,design_code text,design_name text,family text,revision_no int,contact_name text,company text,email text,quantity text,quantity_unit text,target_date date,application text,message text)
language sql stable security definer set search_path=public as $$
  select r.id,p.id,p.design_code,p.name,p.family::text,dr.revision_no,r.contact_name,r.company,r.email,r.quantity,r.quantity_unit,r.target_date,r.application,r.message
  from public.rfqs r join public.design_projects p on p.id=r.project_id join public.design_revisions dr on dr.id=r.revision_id
  join public.quote_costings c on c.rfq_id=r.id and c.status='FINAL' and c.sample_required
  where public.has_factory_role(auth.uid(),array['admin','production_manager','quality','viewer']) and r.status='Under Review'
    and not exists(select 1 from public.factory_samples s where s.rfq_id=r.id) order by r.created_at;
$$;

create or replace function public.create_factory_sample_v2(p_rfq uuid,p_assigned_to text,p_target_date date default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_no text;r record;
begin
  if not public.has_factory_role(auth.uid(),array['admin','production_manager','quality']) then raise exception 'not authorized'; end if;
  if nullif(trim(p_assigned_to),'') is null then raise exception 'assigned person is required'; end if;
  select q.*,p.id project_id,p.design_code,p.name design_name,dr.revision_no into r from public.rfqs q
  join public.design_projects p on p.id=q.project_id join public.design_revisions dr on dr.id=q.revision_id
  join public.quote_costings c on c.rfq_id=q.id and c.status='FINAL' and c.sample_required
  where q.id=p_rfq and q.status='Under Review' for update of q,p;
  if not found then raise exception 'sample request is unavailable'; end if;
  v_no:='SMP-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('public.seq_factory_sample')::text,4,'0');
  insert into public.factory_samples(sample_no,rfq_id,design_project_id,design_code,design_name,revision_no,contact_name,company,email,requested_quantity,target_date,assigned_to,notes,created_by)
  values(v_no,p_rfq,r.project_id,r.design_code,r.design_name,r.revision_no,r.contact_name,r.company,r.email,concat_ws(' ',r.quantity,r.quantity_unit),coalesce(p_target_date,r.target_date),trim(p_assigned_to),nullif(trim(p_notes),''),auth.uid()::text) returning sample_id into v_id;
  update public.rfqs set status='Sample Development' where id=p_rfq;
  update public.design_projects set status='Sample Development',updated_at=now() where id=r.project_id;
  return v_id;
end $$;

create or replace function public.list_factory_quote_sources_v2()
returns table(rfq_id uuid,design_project_id uuid,design_code text,design_name text,family text,revision_no int,contact_name text,company text,email text,quantity text,quantity_unit text,target_price text,target_date date)
language sql stable security definer set search_path=public as $$
  select r.id,p.id,p.design_code,p.name,p.family::text,dr.revision_no,r.contact_name,r.company,r.email,r.quantity,r.quantity_unit,r.target_price,r.target_date
  from public.rfqs r join public.design_projects p on p.id=r.project_id join public.design_revisions dr on dr.id=r.revision_id
  join public.quote_costings c on c.rfq_id=r.id and c.status='FINAL'
  where public.has_factory_role(auth.uid(),array['admin','production_manager','accounts','viewer'])
    and ((not c.sample_required and r.status='Under Review') or (c.sample_required and r.status='Sample Approved'))
    and not exists(select 1 from public.factory_quotations q where q.rfq_id=r.id) order by r.created_at;
$$;

revoke all on function public.save_quote_preparation_v2(uuid,jsonb,text,numeric,text,boolean,text,jsonb) from public;
revoke all on function public.list_factory_sample_sources_v2() from public;
revoke all on function public.create_factory_sample_v2(uuid,text,date,text) from public;
revoke all on function public.list_factory_quote_sources_v2() from public;
grant execute on function public.save_quote_preparation_v2(uuid,jsonb,text,numeric,text,boolean,text,jsonb) to authenticated;
grant execute on function public.list_factory_sample_sources_v2() to authenticated;
grant execute on function public.create_factory_sample_v2(uuid,text,date,text) to authenticated;
grant execute on function public.list_factory_quote_sources_v2() to authenticated;
