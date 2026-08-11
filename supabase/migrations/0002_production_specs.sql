-- ===========================================================================
-- Interconverters Narrow Fabric Design Studio — production specifications +
-- manufacturing capability library
--
-- Core principle: the CUSTOMER DESIGN REQUIREMENT (design_projects /
-- design_revisions.spec, from 0001_init.sql) and the INTERNAL PRODUCTION
-- SPECIFICATION (production_specs, defined here) are two separate records.
-- The technical team's production parameters never overwrite the customer's
-- original requirement, and customer choices never automatically become an
-- approved manufacturing spec — a production_specs row must be explicitly
-- created/approved by staff.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- production_specs — internal-only, one per project (V1)
-- ---------------------------------------------------------------------------

create table public.production_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.design_projects (id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index idx_production_specs_project on public.production_specs (project_id);

alter table public.production_specs enable row level security;

-- Staff-only, full access. No anon access of any kind — production
-- parameters are never exposed to the customer-facing app.
create policy staff_all_production_specs on public.production_specs
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

revoke all on public.production_specs from anon;

-- ---------------------------------------------------------------------------
-- capability_rules — manufacturing capability library foundation
--
-- Drives client-side validation / recommendation later; for now it is a
-- structured, queryable version of the constants in src/lib/constants.ts
-- (CAPABILITIES, STANDARD_WIDTHS_MM, STANDARD_ROLL_LENGTHS_M,
-- CONSTRUCTION_LIBRARY). Anon SELECT is intentionally allowed — these are
-- non-sensitive manufacturing limits, not project data.
-- ---------------------------------------------------------------------------

create table public.capability_rules (
  id uuid primary key default gen_random_uuid(),
  family char(1) not null references public.product_families (code),
  rule_key text not null,
  rule_value jsonb not null,
  notes text,
  updated_at timestamptz not null default now(),
  unique (family, rule_key)
);

alter table public.capability_rules enable row level security;

create policy staff_all_capability_rules on public.capability_rules
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy capability_rules_public_read on public.capability_rules
  for select using (true);

grant select on public.capability_rules to anon;

-- Seed rows per family, mirroring src/lib/constants.ts as of this migration.
-- moq is a placeholder (null) until minimum-order-quantity data is captured.

insert into public.capability_rules (family, rule_key, rule_value, notes) values
  -- Jacquard
  ('J', 'min_width_mm', '10', 'Minimum manufacturable width'),
  ('J', 'max_width_mm', '100', 'Maximum manufacturable width'),
  ('J', 'standard_widths_mm', '[10, 15, 20, 25, 30, 32, 38, 40, 50]', 'Standard catalogue widths'),
  ('J', 'max_colors', '6', 'Maximum simultaneous colors'),
  ('J', 'elongation_range', '{"min": 10, "max": 200}', 'Achievable elongation range, percent'),
  ('J', 'standard_roll_lengths_m', '[25, 50, 100, 150, 200]', 'Standard roll lengths'),
  ('J', 'min_text_height_mm', '4', 'Minimum legible woven text height'),
  ('J', 'moq', 'null', 'Minimum order quantity — not yet defined'),
  ('J', 'constructions', '["Jacquard", "Other"]', 'Construction library for this family'),

  -- Woven
  ('W', 'min_width_mm', '2', 'Minimum manufacturable width'),
  ('W', 'max_width_mm', '320', 'Maximum manufacturable width'),
  ('W', 'standard_widths_mm', '[10, 15, 20, 25, 30, 32, 38, 40, 50]', 'Standard catalogue widths'),
  ('W', 'max_colors', '8', 'Maximum simultaneous colors'),
  ('W', 'elongation_range', '{"min": 10, "max": 200}', 'Achievable elongation range, percent'),
  ('W', 'standard_roll_lengths_m', '[25, 50, 100, 150, 200]', 'Standard roll lengths'),
  ('W', 'moq', 'null', 'Minimum order quantity — not yet defined'),
  ('W', 'constructions', '["Plain", "Twill", "Ribbed / Corded", "Striped", "Jacquard", "Other"]', 'Construction library for this family'),

  -- Knitted
  ('K', 'min_width_mm', '5', 'Minimum manufacturable width'),
  ('K', 'max_width_mm', '150', 'Maximum manufacturable width'),
  ('K', 'standard_widths_mm', '[10, 15, 20, 25, 30, 32, 38, 40, 50]', 'Standard catalogue widths'),
  ('K', 'max_colors', '4', 'Maximum simultaneous colors'),
  ('K', 'elongation_range', '{"min": 10, "max": 200}', 'Achievable elongation range, percent'),
  ('K', 'standard_roll_lengths_m', '[25, 50, 100, 150, 200]', 'Standard roll lengths'),
  ('K', 'moq', 'null', 'Minimum order quantity — not yet defined'),
  ('K', 'constructions', '["Crochet", "Warp Knit", "Raschel", "Rib Knit", "Patterned Knit", "Other"]', 'Construction library for this family');
