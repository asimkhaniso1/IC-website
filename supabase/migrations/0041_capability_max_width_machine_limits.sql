-- Correct max_width_mm to the actual confirmed loom/machine reed widths
-- (previously placeholder business estimates from 0002_production_specs.sql).
--
--  - J (jacquard elastic): Jiangsu Jingwu JYNFJ family — reed widths
--    27/42/50/65mm, 12 frames, 128-640 jacquard hooks depending on setup.
--    Max width = 65mm.
--  - W (woven elastic/tape): Jingwu JYF family — reed widths
--    30/35/45/55/80mm, weft density ~3.5-36.7 picks/cm depending on setup.
--    Max width = 80mm.
--  - K (knitted elastic): left untouched — the Wenzhou Jiasheng JSGA760/B3
--    knit machine's max width for this family has not been confirmed yet,
--    so the prior business default (150mm) stands until it is.
--
-- max_colors / elongation_range remain business settings, not machine
-- specs, and are intentionally not touched here.

update public.capability_rules
set rule_value = '65', notes = 'Maximum manufacturable width — Jiangsu Jingwu JYNFJ reed width (confirmed 2026-09-11)'
where family = 'J' and rule_key = 'max_width_mm';

update public.capability_rules
set rule_value = '80', notes = 'Maximum manufacturable width — Jingwu JYF reed width (confirmed 2026-09-11)'
where family = 'W' and rule_key = 'max_width_mm';

-- In case either row is somehow missing (fresh DB that skipped 0002's
-- seed for some reason), insert rather than silently no-op.
insert into public.capability_rules (family, rule_key, rule_value, notes)
values
  ('J', 'max_width_mm', '65', 'Maximum manufacturable width — Jiangsu Jingwu JYNFJ reed width (confirmed 2026-09-11)'),
  ('W', 'max_width_mm', '80', 'Maximum manufacturable width — Jingwu JYF reed width (confirmed 2026-09-11)')
on conflict (family, rule_key) do nothing;
