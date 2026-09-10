-- Phase 1 Jacquard technical-graph controls belong to the Manufacturing
-- Capability Library so administrators can disable generation or lower the
-- permitted graph size without a code deployment.

insert into public.capability_rules (family, rule_key, rule_value, notes)
values
  ('J', 'technical_graph_enabled', 'true', 'Allow approved Jacquard specifications to generate technical graphs'),
  ('J', 'max_technical_graph_cells', '16000000', 'Maximum warp-end × weft-pick cells in one generated Jacquard repeat')
on conflict (family, rule_key) do nothing;
