-- Factory Live Phase 1: first vertical slice
-- Confirmed order -> production order -> machine assignment -> production entry
-- -> completion -> append-only stock ledger.

create table public.factory_roles (
  factory_role_id uuid primary key default gen_random_uuid(),
  role_code text not null unique check (role_code in (
    'admin','production_manager','supervisor','operator','store','purchase',
    'quality','maintenance','accounts','viewer'
  )),
  role_name text not null
);

insert into public.factory_roles (role_code, role_name) values
  ('admin','Admin'), ('production_manager','Production Manager'),
  ('supervisor','Supervisor'), ('operator','Operator'), ('store','Store'),
  ('purchase','Purchase'), ('quality','Quality'), ('maintenance','Maintenance'),
  ('accounts','Accounts'), ('viewer','Viewer');

create table public.factory_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  factory_role_id uuid not null references public.factory_roles(factory_role_id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by text not null default 'system',
  primary key (user_id, factory_role_id)
);

create or replace function public.has_factory_role(uid uuid, allowed text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.factory_user_roles ur
    join public.factory_roles r using (factory_role_id)
    where ur.user_id = uid and (allowed is null or r.role_code = any(allowed))
  ) or public.is_staff(uid);
$$;

create table public.machine_groups (
  machine_group_id uuid primary key default gen_random_uuid(),
  group_code text not null unique,
  group_name text not null,
  description text,
  display_order int,
  active_status boolean not null default true,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

insert into public.machine_groups (group_code, group_name, display_order) values
  ('WARP-KNIT','Warp Knitting',1), ('JACQUARD','Jacquard',2),
  ('NEEDLE-LOOM','Needle Loom',3), ('CROCHET','Crochet',4),
  ('WARPING','Warping',5), ('CONE-WIND','Cone Winding',6),
  ('PRESS-FIN','Press / Finishing',7), ('PACKING','Packing',8), ('OTHER','Other',9);

create table public.locations (
  location_id uuid primary key default gen_random_uuid(), location_code text not null unique,
  location_name text not null, location_type text not null check (location_type in
    ('RAW_MATERIAL_STORE','WIP','FINISHED_GOODS_STORE','DISPATCH','OTHER')),
  parent_location_id uuid references public.locations(location_id), active_status boolean not null default true,
  notes text, created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

insert into public.locations (location_code, location_name, location_type) values
  ('WIP-FLOOR','WIP Floor','WIP'), ('FG-STORE','Finished Goods Store','FINISHED_GOODS_STORE');

create table public.uoms (
  uom_id uuid primary key default gen_random_uuid(), uom_code text not null unique,
  uom_name text not null, uom_type text not null check (uom_type in ('LENGTH','WEIGHT','COUNT')),
  is_base_unit boolean not null default false, active_status boolean not null default true,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

insert into public.uoms (uom_code,uom_name,uom_type,is_base_unit) values
  ('MTR','Meters','LENGTH',true), ('KG','Kilograms','WEIGHT',true),
  ('ROLL','Rolls','COUNT',true), ('STRIP','Strips','COUNT',false),
  ('CONE','Cones','COUNT',false), ('PCS','Pieces','COUNT',false),
  ('IN','Inches','LENGTH',false), ('MM','Millimeters','LENGTH',false);

create table public.shifts (
  shift_id uuid primary key default gen_random_uuid(), shift_code text not null unique,
  shift_name text not null, start_time time, end_time time, cross_midnight boolean not null default false,
  active boolean not null default true, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);
insert into public.shifts (shift_code,shift_name) values ('DAY','Day'),('NIGHT','Night');

create table public.teams (
  team_id uuid primary key default gen_random_uuid(), team_code text not null unique, team_name text,
  active boolean not null default true, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);
insert into public.teams (team_code,team_name) values ('A','Team A'),('N','Team N'),('Z','Team Z');

create table public.machines (
  machine_id uuid primary key default gen_random_uuid(), legacy_machine_no int unique check (legacy_machine_no between 1 and 17),
  machine_group uuid not null references public.machine_groups(machine_group_id), machine_name text not null,
  machine_type text, working_width_mm numeric check (working_width_mm > 0), active_status boolean not null default true,
  notes text, created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

-- NC-28 remains open, so machines are deliberately not seeded with guessed groups.

create table public.operators (
  operator_id uuid primary key default gen_random_uuid(), operator_code text not null unique,
  full_name text not null, default_shift_id uuid references public.shifts(shift_id),
  default_machine_group uuid references public.machine_groups(machine_group_id), active_status boolean not null default true,
  notes text, created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.customers (
  customer_id uuid primary key default gen_random_uuid(), customer_code text not null unique,
  customer_name text not null, contact_person text, contact_phone text, contact_email text,
  active_status boolean not null default true, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.products (
  product_id uuid primary key default gen_random_uuid(), product_code text not null unique,
  product_family char(1) not null check (product_family in ('J','K','W')),
  description text not null, width_mm numeric not null check (width_mm > 0),
  g_per_meter numeric not null check (g_per_meter > 0), standard_roll_length numeric,
  active_status boolean not null default true, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.orders (
  order_id uuid primary key default gen_random_uuid(), order_no text not null unique,
  customer_id uuid not null references public.customers(customer_id), order_date date not null default current_date,
  order_channel text, design_project_id uuid references public.design_projects(id),
  status text not null default 'ORDER_CONFIRMED' check (status in ('ORDER_CONFIRMED','CANCELLED','CLOSED')),
  notes text, created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.order_items (
  order_item_id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(order_id) on delete cascade,
  product_id uuid not null references public.products(product_id), quantity numeric not null check (quantity > 0),
  uom_id uuid not null references public.uoms(uom_id), notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.production_orders (
  production_order_id uuid primary key default gen_random_uuid(), production_order_no text not null unique,
  order_item_id uuid not null unique references public.order_items(order_item_id), product_id uuid not null references public.products(product_id),
  design_project_id uuid references public.design_projects(id), design_revision_id uuid references public.design_revisions(id),
  production_spec_id uuid references public.production_specs(id),
  status text not null default 'ORDER_CONFIRMED' check (status in (
    'ORDER_CONFIRMED','PRODUCTION_PLANNED','MATERIALS_PENDING','MATERIALS_READY','MACHINE_ASSIGNED',
    'IN_SETUP','IN_PRODUCTION','ON_HOLD','QC_PENDING','CANCELLED')),
  machine_group_id uuid references public.machine_groups(machine_group_id), target_quantity numeric,
  uom_id uuid references public.uoms(uom_id), planned_start_date date, planned_end_date date,
  actual_start_date date, actual_end_date date, priority text, notes text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.production_batches (
  production_batch_id uuid primary key default gen_random_uuid(),
  production_order_id uuid not null references public.production_orders(production_order_id) on delete cascade,
  batch_code text not null unique, machine_id uuid references public.machines(machine_id), planned_quantity numeric,
  actual_quantity numeric not null default 0, status text not null default 'ASSIGNED' check (status in ('ASSIGNED','SETUP','RUNNING','COMPLETE')),
  start_time timestamptz, end_time timestamptz,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.production_entries (
  production_entry_id uuid primary key default gen_random_uuid(), report_date date not null default current_date,
  production_order_id uuid not null references public.production_orders(production_order_id),
  batch_id uuid not null references public.production_batches(production_batch_id),
  operator_id uuid references public.operators(operator_id), shift_id uuid references public.shifts(shift_id),
  team_id uuid references public.teams(team_id), legacy_machine_no int, taar int, shift_time text default '12 hours',
  rubber int, machine_speed numeric, ply numeric, gauge numeric, strip numeric not null check (strip > 0),
  g_wt_per_mtr numeric, column1_kg_per_strip numeric, column2_article text,
  total_meter_per_strip numeric not null check (total_meter_per_strip >= 0),
  per_machine_kg numeric generated always as (coalesce(column1_kg_per_strip,0) * strip) stored,
  total_meter numeric generated always as (total_meter_per_strip * strip) stored,
  wastage numeric check (wastage is null or wastage >= 0), remarks text, pr_strip_amount numeric,
  start_time timestamptz, stop_time timestamptz, target_quantity numeric,
  actual_quantity numeric, reject_quantity numeric, prepared_by text, reviewed_by text,
  created_at timestamptz not null default now(), created_by text not null default 'system',
  updated_at timestamptz not null default now(), updated_by text
);

create table public.stock_ledger (
  stock_ledger_id uuid primary key default gen_random_uuid(), transaction_date timestamptz not null default now(),
  product_id uuid references public.products(product_id), quantity numeric not null,
  uom_id uuid not null references public.uoms(uom_id), location_id uuid not null references public.locations(location_id),
  ownership text not null check (ownership in ('INTERCONVERTERS_OWNED','CUSTOMER_OWNED','TOLL_MANUFACTURING','CONSIGNMENT','OTHER')),
  stock_category text not null check (stock_category in ('RAW_MATERIAL','WIP','FINISHED_GOODS','PACKAGING','SCRAP','REJECT','CUSTOMER_OWNED_MATERIAL')),
  source_transaction_type text not null check (source_transaction_type in ('PRODUCTION_ENTRY','ADJUSTMENT','OPENING_BALANCE')),
  source_transaction_id uuid, batch_id uuid references public.production_batches(production_batch_id),
  reference_note text, created_at timestamptz not null default now(), created_by text not null default 'system',
  check (product_id is not null)
);

create table public.audit_log (
  audit_log_id uuid primary key default gen_random_uuid(), event_timestamp timestamptz not null default now(),
  user_id uuid references auth.users(id), user_role text, action text not null, entity_type text not null,
  entity_id uuid not null, old_value jsonb, new_value jsonb, reason text,
  source text not null default 'factory_live_web', created_at timestamptz not null default now()
);

create index idx_production_orders_status on public.production_orders(status);
create index idx_batches_order on public.production_batches(production_order_id);
create index idx_entries_batch on public.production_entries(batch_id, report_date);
create index idx_stock_product on public.stock_ledger(product_id, location_id, transaction_date);

-- Atomic actions keep status, audit history and stock in agreement.
create or replace function public.assign_factory_machine(p_production_order uuid, p_machine uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_batch uuid; v_old text; v_no text;
begin
  if not has_factory_role(auth.uid(), array['admin','production_manager','supervisor']) then raise exception 'not authorized'; end if;
  select status, production_order_no into v_old, v_no from production_orders where production_order_id=p_production_order for update;
  if v_old not in ('MATERIALS_READY','PRODUCTION_PLANNED','ORDER_CONFIRMED') then raise exception 'order cannot be assigned from status %',v_old; end if;
  insert into production_batches(production_order_id,batch_code,machine_id,created_by)
  values(p_production_order,v_no||'-B'||lpad((select (count(*)+1)::text from production_batches where production_order_id=p_production_order),2,'0'),p_machine,auth.uid()::text)
  returning production_batch_id into v_batch;
  update production_orders set status='MACHINE_ASSIGNED',updated_at=now(),updated_by=auth.uid()::text where production_order_id=p_production_order;
  insert into audit_log(user_id,action,entity_type,entity_id,old_value,new_value)
  values(auth.uid(),'Machine Assigned','production_orders',p_production_order,jsonb_build_object('status',v_old),jsonb_build_object('status','MACHINE_ASSIGNED','machine_id',p_machine));
  return v_batch;
end $$;

create or replace function public.record_factory_production(
  p_batch uuid, p_operator uuid, p_shift uuid, p_team uuid, p_strip numeric,
  p_meter_per_strip numeric, p_kg_per_strip numeric, p_wastage numeric default null, p_remarks text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_entry uuid; v_order uuid; v_machine int;
begin
  if not has_factory_role(auth.uid(), array['admin','production_manager','supervisor','operator']) then raise exception 'not authorized'; end if;
  select b.production_order_id,m.legacy_machine_no into v_order,v_machine from production_batches b
  left join machines m on m.machine_id=b.machine_id where b.production_batch_id=p_batch for update;
  insert into production_entries(production_order_id,batch_id,operator_id,shift_id,team_id,legacy_machine_no,strip,
    total_meter_per_strip,column1_kg_per_strip,wastage,remarks,start_time,actual_quantity,created_by)
  values(v_order,p_batch,p_operator,p_shift,p_team,v_machine,p_strip,p_meter_per_strip,p_kg_per_strip,p_wastage,p_remarks,now(),p_meter_per_strip*p_strip,auth.uid()::text)
  returning production_entry_id into v_entry;
  update production_batches set status='RUNNING',start_time=coalesce(start_time,now()),
    actual_quantity=(select coalesce(sum(total_meter),0) from production_entries where batch_id=p_batch),updated_at=now() where production_batch_id=p_batch;
  update production_orders set status='IN_PRODUCTION',actual_start_date=coalesce(actual_start_date,current_date),updated_at=now() where production_order_id=v_order;
  insert into audit_log(user_id,action,entity_type,entity_id,new_value)
  values(auth.uid(),'Production Started','production_entries',v_entry,jsonb_build_object('batch_id',p_batch,'total_meter',p_meter_per_strip*p_strip));
  return v_entry;
end $$;

create or replace function public.complete_factory_batch(p_batch uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_product uuid; v_qty numeric; v_uom uuid; v_location uuid; v_ledger uuid;
begin
  if not has_factory_role(auth.uid(), array['admin','production_manager','supervisor','operator']) then raise exception 'not authorized'; end if;
  select b.production_order_id,po.product_id into v_order,v_product
  from production_batches b join production_orders po using(production_order_id)
  where b.production_batch_id=p_batch for update of b;
  if not found then raise exception 'batch not found'; end if;
  select coalesce(sum(total_meter),0) into v_qty from production_entries where batch_id=p_batch;
  if v_qty <= 0 then raise exception 'batch has no production'; end if;
  select uom_id into v_uom from uoms where uom_code='MTR';
  select location_id into v_location from locations where location_code='WIP-FLOOR';
  insert into stock_ledger(product_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,source_transaction_id,batch_id,reference_note,created_by)
  values(v_product,v_qty,v_uom,v_location,'INTERCONVERTERS_OWNED','WIP','PRODUCTION_ENTRY',p_batch,p_batch,'Completed production batch',auth.uid()::text)
  returning stock_ledger_id into v_ledger;
  update production_batches set status='COMPLETE',end_time=now(),actual_quantity=v_qty,updated_at=now() where production_batch_id=p_batch;
  update production_orders set status='QC_PENDING',actual_end_date=current_date,updated_at=now() where production_order_id=v_order;
  insert into audit_log(user_id,action,entity_type,entity_id,new_value)
  values(auth.uid(),'Production Completed','production_orders',v_order,jsonb_build_object('status','QC_PENDING','quantity',v_qty,'stock_ledger_id',v_ledger));
  return v_ledger;
end $$;

alter table public.factory_roles enable row level security;
alter table public.factory_user_roles enable row level security;
alter table public.machine_groups enable row level security;
alter table public.locations enable row level security;
alter table public.uoms enable row level security;
alter table public.shifts enable row level security;
alter table public.teams enable row level security;
alter table public.machines enable row level security;
alter table public.operators enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.production_orders enable row level security;
alter table public.production_batches enable row level security;
alter table public.production_entries enable row level security;
alter table public.stock_ledger enable row level security;
alter table public.audit_log enable row level security;

create policy factory_read_roles on public.factory_roles for select using (has_factory_role(auth.uid()));
create policy factory_read_user_roles on public.factory_user_roles for select using (has_factory_role(auth.uid()) or user_id=auth.uid());
create policy factory_admin_user_roles on public.factory_user_roles for all using (has_factory_role(auth.uid(),array['admin'])) with check (has_factory_role(auth.uid(),array['admin']));

do $$ declare t text; begin foreach t in array array['machine_groups','locations','uoms','shifts','teams','machines','operators','customers','products','orders','order_items','production_orders','production_batches'] loop
  execute format('create policy factory_read_%1$s on public.%1$I for select using (has_factory_role(auth.uid()))',t);
  execute format('create policy factory_admin_%1$s on public.%1$I for all using (has_factory_role(auth.uid(),array[''admin''])) with check (has_factory_role(auth.uid(),array[''admin'']))',t);
end loop; end $$;

create policy factory_manage_products on public.products for all
  using (has_factory_role(auth.uid(),array['production_manager'])) with check (has_factory_role(auth.uid(),array['production_manager']));
create policy factory_manage_orders on public.orders for all
  using (has_factory_role(auth.uid(),array['production_manager'])) with check (has_factory_role(auth.uid(),array['production_manager']));
create policy factory_manage_order_items on public.order_items for all
  using (has_factory_role(auth.uid(),array['production_manager'])) with check (has_factory_role(auth.uid(),array['production_manager']));
create policy factory_manage_production_orders on public.production_orders for all
  using (has_factory_role(auth.uid(),array['production_manager','supervisor'])) with check (has_factory_role(auth.uid(),array['production_manager','supervisor']));
create policy factory_manage_batches on public.production_batches for all
  using (has_factory_role(auth.uid(),array['production_manager','supervisor'])) with check (has_factory_role(auth.uid(),array['production_manager','supervisor']));

create policy factory_read_entries on public.production_entries for select using (has_factory_role(auth.uid()));
create policy factory_insert_entries on public.production_entries for insert with check (has_factory_role(auth.uid(),array['admin','production_manager','supervisor','operator']));
create policy factory_read_stock on public.stock_ledger for select using (has_factory_role(auth.uid()));
create policy factory_insert_stock on public.stock_ledger for insert with check (has_factory_role(auth.uid(),array['admin','store']));
create policy factory_read_audit on public.audit_log for select using (has_factory_role(auth.uid(),array['admin','production_manager','quality','accounts']));

-- Corrections are compensating rows; existing ledger facts cannot be changed.
revoke update, delete on public.stock_ledger from anon, authenticated;

grant execute on function public.assign_factory_machine(uuid,uuid) to authenticated;
grant execute on function public.record_factory_production(uuid,uuid,uuid,uuid,numeric,numeric,numeric,numeric,text) to authenticated;
grant execute on function public.complete_factory_batch(uuid) to authenticated;
