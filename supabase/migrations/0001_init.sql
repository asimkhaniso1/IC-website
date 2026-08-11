-- ===========================================================================
-- Interconverters Narrow Fabric Design Studio — initial schema
--
-- Access model:
--   * Anonymous customers NEVER touch tables directly. All customer operations
--     go through SECURITY DEFINER RPCs that verify a client-generated
--     owner_token (UUID kept in the browser's localStorage).
--   * Internal staff (profiles.role in 'admin','technical') authenticate via
--     Supabase Auth and get full table access through RLS policies.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'technical')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Any row in profiles marks an internal staff member.
create or replace function public.is_staff(uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = uid);
$$;

-- ---------------------------------------------------------------------------
-- Product families
-- ---------------------------------------------------------------------------

create table public.product_families (
  code char(1) primary key,
  name text not null,
  constraints jsonb not null default '{}'::jsonb
);

insert into public.product_families (code, name, constraints) values
  ('J', 'Jacquard', '{"minWidthMm": 10, "maxWidthMm": 100, "maxColors": 6, "elongation": "10%-200%"}'),
  ('W', 'Woven',    '{"minWidthMm": 2,  "maxWidthMm": 320, "maxColors": 8, "elongation": "10%-200%"}'),
  ('K', 'Knitted',  '{"minWidthMm": 5,  "maxWidthMm": 150, "maxColors": 4, "elongation": "10%-200%"}');

-- ---------------------------------------------------------------------------
-- Design projects + revisions
-- ---------------------------------------------------------------------------

create table public.design_projects (
  id uuid primary key default gen_random_uuid(),
  design_code text not null unique,
  family char(1) not null references public.product_families (code),
  name text not null default 'Untitled design',
  owner_token uuid not null,
  status text not null default 'Draft' check (status in (
    'Draft', 'Submitted', 'Under Technical Review', 'Modification Required',
    'Sample Development', 'Sample Approved', 'Quoted', 'Order Confirmed',
    'Rejected', 'Archived'
  )),
  customer_name text,
  customer_company text,
  customer_email text,
  customer_phone text,
  current_revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_design_projects_owner on public.design_projects (owner_token);
create index idx_design_projects_status on public.design_projects (status);

create table public.design_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.design_projects (id) on delete cascade,
  revision_no int not null,
  spec jsonb not null,
  weavability jsonb,
  preview_png_path text,
  notes text,
  created_by text not null default 'customer', -- 'customer' | staff email
  created_at timestamptz not null default now(),
  unique (project_id, revision_no)
);

-- Colorways are folded into spec JSONB for V1; a dedicated colorways table is
-- deferred until the yarn shade-card library lands.

create table public.artwork_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.design_projects (id) on delete cascade,
  storage_path text not null,
  filename text,
  mime text,
  size_bytes int,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RFQs, reviews, activity
-- ---------------------------------------------------------------------------

create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.design_projects (id) on delete cascade,
  revision_id uuid references public.design_revisions (id),
  kind text not null check (kind in ('sample', 'quote')),
  contact_name text not null,
  company text,
  email text not null,
  phone text,
  country text,
  quantity text,
  quantity_unit text,
  annual_requirement text,
  target_price text,
  target_date date,
  application text,
  message text,
  status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create table public.design_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.design_projects (id) on delete cascade,
  author uuid references auth.users (id),
  comment text not null,
  internal boolean not null default true,
  decision text,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.design_projects (id) on delete cascade,
  actor text not null,           -- 'customer:<token-prefix>' | staff email | 'system'
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Design ID sequences (server-authoritative, per family)
-- ---------------------------------------------------------------------------

create sequence public.seq_design_j;
create sequence public.seq_design_w;
create sequence public.seq_design_k;

create or replace function public.next_design_code(fam char)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  n bigint;
begin
  case upper(fam)
    when 'J' then n := nextval('public.seq_design_j');
    when 'W' then n := nextval('public.seq_design_w');
    when 'K' then n := nextval('public.seq_design_k');
    else raise exception 'Unknown product family: %', fam;
  end case;
  return upper(fam) || '-DES-' || lpad(n::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer RPCs (SECURITY DEFINER — the ONLY anon access path)
-- ---------------------------------------------------------------------------

-- Shape a project + its latest revision as the JSON DesignRecord the client expects.
create or replace function public.design_record_json(p public.design_projects)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'designCode', p.design_code,
    'family', p.family,
    'status', p.status,
    'revisionNo', p.current_revision,
    'spec', r.spec,
    'weavability', r.weavability,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at
  )
  from public.design_revisions r
  where r.project_id = p.id and r.revision_no = p.current_revision;
$$;

create or replace function public.create_design(
  p_family char,
  p_name text,
  p_spec jsonb,
  p_token uuid,
  p_weavability jsonb default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  proj public.design_projects;
begin
  if p_token is null then
    raise exception 'owner token required';
  end if;

  insert into public.design_projects (design_code, family, name, owner_token)
  values (public.next_design_code(p_family), upper(p_family), coalesce(nullif(p_name, ''), 'Untitled design'), p_token)
  returning * into proj;

  insert into public.design_revisions (project_id, revision_no, spec, weavability)
  values (proj.id, 1, p_spec, p_weavability);

  insert into public.activity_log (project_id, actor, action, payload)
  values (proj.id, 'customer:' || left(p_token::text, 8), 'design.created',
          jsonb_build_object('designCode', proj.design_code));

  return public.design_record_json(proj);
end;
$$;

create or replace function public.save_revision(
  p_project uuid,
  p_token uuid,
  p_spec jsonb,
  p_weavability jsonb default null,
  p_name text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  proj public.design_projects;
begin
  select * into proj from public.design_projects
  where id = p_project and owner_token = p_token
  for update;
  if not found then
    raise exception 'design not found or token mismatch';
  end if;

  update public.design_projects
  set current_revision = proj.current_revision + 1,
      name = coalesce(nullif(p_name, ''), name),
      updated_at = now()
  where id = proj.id
  returning * into proj;

  insert into public.design_revisions (project_id, revision_no, spec, weavability)
  values (proj.id, proj.current_revision, p_spec, p_weavability);

  insert into public.activity_log (project_id, actor, action, payload)
  values (proj.id, 'customer:' || left(p_token::text, 8), 'design.revised',
          jsonb_build_object('revision', proj.current_revision));

  return public.design_record_json(proj);
end;
$$;

create or replace function public.get_designs_by_token(p_token uuid)
returns setof jsonb
language sql stable security definer
set search_path = public
as $$
  select public.design_record_json(p)
  from public.design_projects p
  where p.owner_token = p_token
  order by p.updated_at desc;
$$;

create or replace function public.get_design(p_project uuid, p_token uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select public.design_record_json(p)
  from public.design_projects p
  where p.id = p_project and p.owner_token = p_token;
$$;

create or replace function public.submit_rfq(
  p_project uuid,
  p_token uuid,
  p_rfq jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  proj public.design_projects;
  rev_id uuid;
  rfq_id uuid;
begin
  select * into proj from public.design_projects
  where id = p_project and owner_token = p_token;
  if not found then
    raise exception 'design not found or token mismatch';
  end if;

  select id into rev_id from public.design_revisions
  where project_id = proj.id and revision_no = proj.current_revision;

  insert into public.rfqs (
    project_id, revision_id, kind, contact_name, company, email, phone,
    country, quantity, quantity_unit, annual_requirement, target_price,
    target_date, application, message
  ) values (
    proj.id, rev_id,
    coalesce(p_rfq->>'kind', 'sample'),
    p_rfq->>'contactName',
    p_rfq->>'company',
    p_rfq->>'email',
    p_rfq->>'phone',
    p_rfq->>'country',
    p_rfq->>'quantity',
    p_rfq->>'quantityUnit',
    p_rfq->>'annualRequirement',
    p_rfq->>'targetPrice',
    nullif(p_rfq->>'targetDate', '')::date,
    p_rfq->>'application',
    p_rfq->>'message'
  ) returning id into rfq_id;

  update public.design_projects
  set status = 'Submitted',
      customer_name = coalesce(p_rfq->>'contactName', customer_name),
      customer_company = coalesce(p_rfq->>'company', customer_company),
      customer_email = coalesce(p_rfq->>'email', customer_email),
      customer_phone = coalesce(p_rfq->>'phone', customer_phone),
      updated_at = now()
  where id = proj.id;

  insert into public.activity_log (project_id, actor, action, payload)
  values (proj.id, 'customer:' || left(p_token::text, 8), 'rfq.submitted',
          jsonb_build_object('rfqId', rfq_id, 'kind', coalesce(p_rfq->>'kind', 'sample')));

  return jsonb_build_object('ok', true, 'reference', proj.design_code, 'rfqId', rfq_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.product_families enable row level security;
alter table public.design_projects enable row level security;
alter table public.design_revisions enable row level security;
alter table public.artwork_assets enable row level security;
alter table public.rfqs enable row level security;
alter table public.design_reviews enable row level security;
alter table public.activity_log enable row level security;

-- Staff: full access everywhere.
create policy staff_all_profiles on public.profiles
  for select using (is_staff(auth.uid()) or id = auth.uid());
create policy staff_all_projects on public.design_projects
  for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy staff_all_revisions on public.design_revisions
  for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy staff_all_artwork on public.artwork_assets
  for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy staff_all_rfqs on public.rfqs
  for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy staff_all_reviews on public.design_reviews
  for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy staff_all_activity on public.activity_log
  for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- Product families are public reference data.
create policy families_public_read on public.product_families
  for select using (true);

-- Anonymous customers: NO table policies (denied) — RPCs only.
revoke all on all tables in schema public from anon;
grant select on public.product_families to anon;

-- RPC execute grants.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_design(char, text, jsonb, uuid, jsonb) to anon, authenticated;
grant execute on function public.save_revision(uuid, uuid, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.get_designs_by_token(uuid) to anon, authenticated;
grant execute on function public.get_design(uuid, uuid) to anon, authenticated;
grant execute on function public.submit_rfq(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.is_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private artwork bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('artwork', 'artwork', false)
on conflict (id) do nothing;

-- Anonymous uploads only into the bucket (paths namespaced by owner token
-- client-side); no anonymous reads. Staff read/manage everything.
create policy artwork_anon_insert on storage.objects
  for insert to anon
  with check (bucket_id = 'artwork');

create policy artwork_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'artwork' and is_staff(auth.uid()));
