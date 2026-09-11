-- The customer-facing jacquard weave graph (studio Graph tab, spec sheet PDF)
-- is drawn at a NOMINAL density before a design has an approved production
-- specification. That density was previously hardcoded in application code;
-- move it into the Manufacturing Capability Library alongside the other
-- Phase 1 technical-graph controls (0038) so administrators can tune it
-- without a code deployment. Values match the prior hardcoded default, so
-- this changes nothing visible until an admin edits it.

insert into public.capability_rules (family, rule_key, rule_value, notes)
values
  ('J', 'nominal_ends_per_cm', '40', 'Warp-end density (ends/cm, across the tape width) used for the indicative graph before production densities are approved'),
  ('J', 'nominal_picks_per_cm', '30', 'Weft-pick density (picks/cm, along the running length) used for the indicative graph before production densities are approved')
on conflict (family, rule_key) do nothing;
