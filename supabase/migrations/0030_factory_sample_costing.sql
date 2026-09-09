-- Cost physical sample development before quotation and production release.
create table public.sample_costings(
  sample_costing_id uuid primary key default gen_random_uuid(),
  sample_id uuid not null unique references public.factory_samples(sample_id) on delete cascade,
  currency text not null default 'PKR',
  overhead_percent numeric not null default 0 check(overhead_percent>=0),
  status text not null default 'DRAFT' check(status in('DRAFT','FINAL')),
  notes text,
  created_at timestamptz not null default now(),
  created_by text not null default 'system',
  updated_at timestamptz not null default now(),
  updated_by text
);

create table public.sample_costing_lines(
  sample_costing_line_id uuid primary key default gen_random_uuid(),
  sample_costing_id uuid not null references public.sample_costings(sample_costing_id) on delete cascade,
  line_no int not null,
  cost_type text not null check(cost_type in('MATERIAL','LABOR','MACHINE','OUTSIDE_SERVICE','PACKAGING','OTHER')),
  description text not null,
  quantity numeric not null check(quantity>0),
  uom text not null,
  unit_cost numeric not null check(unit_cost>=0),
  created_at timestamptz not null default now(),
  unique(sample_costing_id,line_no)
);

alter table public.sample_costings enable row level security;
alter table public.sample_costing_lines enable row level security;
create policy factory_read_sample_costings on public.sample_costings for select using(has_factory_role(auth.uid(),array['admin','production_manager','accounts','viewer']));
create policy factory_read_sample_costing_lines on public.sample_costing_lines for select using(exists(select 1 from public.sample_costings c where c.sample_costing_id=sample_costing_lines.sample_costing_id and has_factory_role(auth.uid(),array['admin','production_manager','accounts','viewer'])));

create or replace function public.save_sample_costing(p_sample uuid,p_currency text,p_overhead_percent numeric,p_status text,p_notes text,p_lines jsonb)returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_line jsonb;v_no int:=0;v_subtotal numeric:=0;
begin
  if not has_factory_role(auth.uid(),array['admin','production_manager','accounts'])then raise exception'not authorized';end if;
  if p_status not in('DRAFT','FINAL')then raise exception'invalid costing status';end if;
  if p_overhead_percent<0 then raise exception'overhead cannot be negative';end if;
  if jsonb_typeof(p_lines)<>'array'or jsonb_array_length(p_lines)=0 then raise exception'at least one cost line is required';end if;
  if not exists(select 1 from factory_samples where sample_id=p_sample)then raise exception'sample not found';end if;
  insert into sample_costings(sample_id,currency,overhead_percent,status,notes,created_by,updated_by)
  values(p_sample,upper(coalesce(nullif(trim(p_currency),''),'PKR')),p_overhead_percent,p_status,nullif(trim(p_notes),''),auth.uid()::text,auth.uid()::text)
  on conflict(sample_id)do update set currency=excluded.currency,overhead_percent=excluded.overhead_percent,status=excluded.status,notes=excluded.notes,updated_at=now(),updated_by=auth.uid()::text
  returning sample_costing_id into v_id;
  delete from sample_costing_lines where sample_costing_id=v_id;
  for v_line in select value from jsonb_array_elements(p_lines)loop
    v_no:=v_no+1;
    if (v_line->>'cost_type')not in('MATERIAL','LABOR','MACHINE','OUTSIDE_SERVICE','PACKAGING','OTHER')or nullif(trim(v_line->>'description'),'')is null or nullif(trim(v_line->>'uom'),'')is null or coalesce((v_line->>'quantity')::numeric,0)<=0 or coalesce((v_line->>'unit_cost')::numeric,-1)<0 then raise exception'invalid cost line %',v_no;end if;
    insert into sample_costing_lines(sample_costing_id,line_no,cost_type,description,quantity,uom,unit_cost)
    values(v_id,v_no,v_line->>'cost_type',trim(v_line->>'description'),(v_line->>'quantity')::numeric,upper(trim(v_line->>'uom')),(v_line->>'unit_cost')::numeric);
    v_subtotal:=v_subtotal+((v_line->>'quantity')::numeric*(v_line->>'unit_cost')::numeric);
  end loop;
  insert into audit_log(user_id,action,entity_type,entity_id,new_value)values(auth.uid(),'Sample Costing Saved','sample_costings',v_id,jsonb_build_object('sample_id',p_sample,'status',p_status,'subtotal',v_subtotal,'overhead_percent',p_overhead_percent,'total',v_subtotal*(1+p_overhead_percent/100)));
  return v_id;
end$$;

revoke all on function public.save_sample_costing(uuid,text,numeric,text,text,jsonb)from public;
grant execute on function public.save_sample_costing(uuid,text,numeric,text,text,jsonb)to authenticated;
