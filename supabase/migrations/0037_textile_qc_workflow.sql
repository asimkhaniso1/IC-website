create sequence if not exists public.seq_qc_report start 1;

alter table public.qc_inspections
  add column if not exists report_no text unique,
  add column if not exists lot_batch_no text,
  add column if not exists roll_no text,
  add column if not exists measured_width_mm numeric,
  add column if not exists measured_pull_ratio numeric,
  add column if not exists measured_size_mm numeric,
  add column if not exists reinspection_of uuid references public.qc_inspections(qc_inspection_id);

create table if not exists public.qc_specifications(
  qc_specification_id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(product_id),
  width_min_mm numeric,
  width_max_mm numeric,
  pull_ratio_min numeric,
  pull_ratio_max numeric,
  size_min_mm numeric,
  size_max_mm numeric,
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text not null default 'system',
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.qc_specifications enable row level security;
create policy factory_read_qc_specs on public.qc_specifications for select
  using(public.has_factory_role(auth.uid()));
create policy factory_manage_qc_specs on public.qc_specifications for all
  using(public.has_factory_role(auth.uid(),array['admin','quality']))
  with check(public.has_factory_role(auth.uid(),array['admin','quality']));

create or replace function public.submit_textile_qc_inspection(
  p_batch uuid,p_inspector uuid,p_type text,p_sample_size int,p_lot text,p_roll text,
  p_width numeric,p_pull numeric,p_size numeric,p_result text,p_sample_attached boolean,
  p_notes text,p_defects jsonb default '[]',p_reinspection_of uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_order uuid;v_defect jsonb;v_report text;
begin
  if not has_factory_role(auth.uid(),array['admin','quality']) then raise exception 'not authorized'; end if;
  if p_result not in('PASS','HOLD','REJECT') then raise exception 'invalid result'; end if;
  if p_result <> 'PASS' and jsonb_array_length(p_defects)=0 then raise exception 'a defect is required for hold or reject'; end if;
  select production_order_id into v_order from production_batches where production_batch_id=p_batch;
  if not found then raise exception 'batch not found'; end if;
  v_report:='QC-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_qc_report')::text,5,'0');
  insert into qc_inspections(report_no,production_batch_id,inspector_id,inspection_type,sample_size,
    lot_batch_no,roll_no,measured_width_mm,measured_pull_ratio,measured_size_mm,
    width_check_result,pull_ratio_check_result,size_check_result,overall_result,
    physical_sample_attached,notes,reinspection_of,created_by)
  values(v_report,p_batch,p_inspector,p_type,p_sample_size,nullif(trim(p_lot),''),nullif(trim(p_roll),''),
    p_width,p_pull,p_size,null,null,null,p_result,p_sample_attached,nullif(trim(p_notes),''),p_reinspection_of,auth.uid()::text)
  returning qc_inspection_id into v_id;
  for v_defect in select value from jsonb_array_elements(p_defects) loop
    insert into qc_defects(qc_inspection_id,defect_type,defect_severity,quantity_affected,disposition,notes,created_by)
    values(v_id,v_defect->>'defect_type',v_defect->>'severity',nullif(v_defect->>'quantity','')::numeric,
      nullif(v_defect->>'disposition',''),v_defect->>'notes',auth.uid()::text);
  end loop;
  update production_orders set status=case when p_result='PASS' then 'QC_APPROVED' else 'QC_HOLD' end,
    updated_at=now(),updated_by=auth.uid()::text where production_order_id=v_order;
  insert into audit_log(user_id,action,entity_type,entity_id,new_value)
  values(auth.uid(),case when p_result='PASS' then 'QC Released' else 'QC Hold' end,'qc_inspections',v_id,
    jsonb_build_object('report_no',v_report,'result',p_result,'batch_id',p_batch,'roll_no',p_roll));
  return v_id;
end$$;

grant execute on function public.submit_textile_qc_inspection(uuid,uuid,text,int,text,text,numeric,numeric,numeric,text,boolean,text,jsonb,uuid) to authenticated;
