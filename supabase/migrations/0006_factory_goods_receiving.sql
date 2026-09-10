-- Factory Live Phase 1: Goods Receiving and raw-material stock posting.

create table public.suppliers (
  supplier_id uuid primary key default gen_random_uuid(), supplier_code text not null unique,
  supplier_name text not null, supplier_type text, contact_person text, contact_phone text,
  active_status boolean not null default true, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.materials (
  material_id uuid primary key default gen_random_uuid(), material_code text not null unique,
  material_name text not null, material_category text not null,
  primary_uom uuid not null references public.uoms(uom_id),
  lot_control_required boolean not null default false,
  active_status boolean not null default true, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create sequence public.seq_grn start 1;

create table public.grns (
  grn_id uuid primary key default gen_random_uuid(), grn_no text not null unique,
  grn_date date not null default current_date, grn_time time default localtime,
  supplier_id uuid not null references public.suppliers(supplier_id), driver_name text, vehicle_no text,
  received_by text, checked_by text, status text not null default 'DRAFT' check(status in ('DRAFT','POSTED','CANCELLED')),
  ownership text not null check(ownership in ('INTERCONVERTERS_OWNED','CUSTOMER_OWNED','TOLL_MANUFACTURING','CONSIGNMENT','OTHER')),
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.grn_lines (
  grn_line_id uuid primary key default gen_random_uuid(), grn_id uuid not null references public.grns(grn_id) on delete cascade,
  line_no int not null, article_text_legacy text not null, material_id uuid not null references public.materials(material_id),
  qty numeric not null check(qty > 0), total_weight numeric check(total_weight is null or total_weight > 0),
  per_cone_wt numeric, remarks text, supplier_lot_no text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text,
  unique(grn_id,line_no)
);

alter table public.stock_ledger add column material_id uuid references public.materials(material_id);
alter table public.stock_ledger drop constraint if exists stock_ledger_check;
alter table public.stock_ledger add constraint stock_ledger_one_item check (
  (material_id is not null and product_id is null) or (material_id is null and product_id is not null)
);
alter table public.stock_ledger drop constraint if exists stock_ledger_source_transaction_type_check;
alter table public.stock_ledger add constraint stock_ledger_source_type check (
  source_transaction_type in ('GRN','PRODUCTION_ENTRY','ADJUSTMENT','OPENING_BALANCE')
);
create index idx_stock_material on public.stock_ledger(material_id,location_id,transaction_date);

create or replace function public.post_factory_grn(
  p_supplier uuid, p_ownership text, p_driver text, p_vehicle text,
  p_lines jsonb, p_received_by text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_grn uuid; v_no text; v_location uuid; v_kg uuid; v_line jsonb; v_line_id uuid; v_count int:=0;
begin
  if not has_factory_role(auth.uid(),array['admin','store']) then raise exception 'not authorized'; end if;
  if p_ownership not in ('INTERCONVERTERS_OWNED','CUSTOMER_OWNED','TOLL_MANUFACTURING','CONSIGNMENT','OTHER') then raise exception 'invalid ownership'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines)=0 then raise exception 'at least one line is required'; end if;
  select location_id into v_location from locations where location_code='WIP-FLOOR';
  select uom_id into v_kg from uoms where uom_code='KG';
  v_no := 'GRN-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_grn')::text,4,'0');
  insert into grns(grn_no,supplier_id,driver_name,vehicle_no,ownership,status,received_by,created_by)
  values(v_no,p_supplier,p_driver,p_vehicle,p_ownership,'POSTED',p_received_by,auth.uid()::text) returning grn_id into v_grn;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_count:=v_count+1;
    if coalesce((v_line->>'total_weight')::numeric,0)<=0 then raise exception 'line % requires total weight',v_count; end if;
    insert into grn_lines(grn_id,line_no,article_text_legacy,material_id,qty,total_weight,per_cone_wt,remarks,supplier_lot_no,created_by)
    values(v_grn,v_count,v_line->>'article',nullif(v_line->>'material_id','')::uuid,(v_line->>'qty')::numeric,
      (v_line->>'total_weight')::numeric,nullif(v_line->>'per_cone_wt','')::numeric,v_line->>'remarks',v_line->>'supplier_lot_no',auth.uid()::text)
    returning grn_line_id into v_line_id;
    insert into stock_ledger(material_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,source_transaction_id,reference_note,created_by)
    values(nullif(v_line->>'material_id','')::uuid,(v_line->>'total_weight')::numeric,v_kg,v_location,p_ownership,
      case when p_ownership in ('CUSTOMER_OWNED','TOLL_MANUFACTURING') then 'CUSTOMER_OWNED_MATERIAL' else 'RAW_MATERIAL' end,
      'GRN',v_line_id,v_no,auth.uid()::text);
  end loop;
  insert into audit_log(user_id,action,entity_type,entity_id,new_value)
  values(auth.uid(),'GRN Posted','grns',v_grn,jsonb_build_object('grn_no',v_no,'lines',v_count,'ownership',p_ownership));
  return v_grn;
end $$;

alter table public.suppliers enable row level security;
alter table public.materials enable row level security;
alter table public.grns enable row level security;
alter table public.grn_lines enable row level security;
create policy factory_read_suppliers on public.suppliers for select using(has_factory_role(auth.uid()));
create policy factory_manage_suppliers on public.suppliers for all using(has_factory_role(auth.uid(),array['admin','purchase'])) with check(has_factory_role(auth.uid(),array['admin','purchase']));
create policy factory_read_materials on public.materials for select using(has_factory_role(auth.uid()));
create policy factory_manage_materials on public.materials for all using(has_factory_role(auth.uid(),array['admin','purchase'])) with check(has_factory_role(auth.uid(),array['admin','purchase']));
create policy factory_read_grns on public.grns for select using(has_factory_role(auth.uid()));
create policy factory_read_grn_lines on public.grn_lines for select using(has_factory_role(auth.uid()));
grant execute on function public.post_factory_grn(uuid,text,text,text,jsonb,text) to authenticated;
