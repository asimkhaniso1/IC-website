# 11 — Needs Confirmation

**The sign-off checklist.** This is the most operationally important file in the pack. Every item below
is something the evidence could not settle. **None of them is resolved here** — this file's job is to
ask well, not to answer. Interconverters must answer each one before the classification next to it
allows the related work to proceed.

**If you are the factory owner or plant manager and have limited time, read this file first.**

---

## How to read this register

| Column | Meaning |
|---|---|
| ID | Stable reference used elsewhere in the pack |
| Question | The exact thing that needs an answer — asked, not guessed |
| Why it matters | What breaks, or must be assumed, if this stays open |
| Evidence | What the source forms actually show (see `SOURCE-EVIDENCE.md` and [`03-field-extraction.md`](03-field-extraction.md)) |
| Impact | What part of the design depends on the answer |
| Classification | `BLOCKING` or `NON-BLOCKING` — see below |
| Who can answer | The most likely role, not a confirmed assignment (role-to-person mapping is itself item 21) |
| Status | `OPEN` (unanswered), `RESOLVED` (confirmed by Interconverters, design decision recorded), or a short note where a first answer needs a follow-up pick |

**Classification rule:** `BLOCKING` means the answer would change the database model — a table, a key
column, or which entity a field belongs to — so Phase 1 coding cannot safely start while it is open (see
the readiness gate in [`10-migration-plan.md`](10-migration-plan.md) §0). `NON-BLOCKING` means the item
can be settled during Phase 1, through configuration or master data, without reworking the schema.

---

## RESOLVED items — answered directly by Interconverters

**All seven original BLOCKING items are now closed.** The design decisions that follow from each are
recorded in [`05-database-schema.md`](05-database-schema.md); the original question and evidence stay
here for audit trail.

| ID | Question | Confirmed answer | Design decision | Resolved |
|---|---|---|---|---|
| NC-02 | What does `MACH NO` 1–17 on IC-FM-01 refer to? | **Machine number** — identifies a physical machine directly, one-to-one. | `machines.legacy_machine_no` retained exactly as designed: a direct physical-machine identifier, not a process station or line position. | 2026-09-08 |
| NC-03 | Are the 6 × 24-needle warp knitting machines the same population as `MACH NO` 1–17, a subset of them, or an entirely different population? | **Subset.** The factory operates **17 machines in total** under the legacy `MACH NO` system; the six 24-needle warp-knitting machines are a confirmed subset of those 17 — not the same population (17 ≠ 6) and not a separate one (they're part of the same 17). | `legacy_machine_no` (1–17) is the complete, confirmed machine population. **One residual item is non-blocking, not schema-affecting** — see NC-28 below: which specific 6 of the 17 are the warp-knitting units, and what the other 11 are, is master-data population, not a schema question. | 2026-09-08 |
| NC-07 | Is `STRIP` a machine attribute or a product attribute? | **Neither purely.** Strips are the number of parallel lanes of tape produced simultaneously on one machine; the count is set by how many times the article's width divides into the machine's working width. | Added `machines.working_width_mm` (`NEW`). `STRIP` is a per-job setup value — suggested from `working_width_mm ÷ product.width_mm`, confirmed by the operator at production entry — not a fixed column on either master alone. | 2026-09-08 |
| NC-08 | Is `PR STRIP AMOUNT` a piece-rate wage? | **Most likely yes.** Reverse-computed at roughly **Rs 7.25–7.26/kg** for 6 Taar Double on Awias Day (406÷56.00=7.25, 392÷54.00=7.26, 363÷50.00=7.26). Estimated missing Mach 11 value ≈ Rs 420–421 at that rate, close to the Rs 419 estimate supplied. | Confirmed in scope as a *captured/reference* figure only — Factory Live does not become the payroll system of record (mirrors the QuickBooks non-duplication principle, §24). **Not a computed field**: the Hamza Day group on the same report breaks the clean per-kg formula (see caveat below), so no single universal rate can be assumed. | 2026-09-08 |
| NC-10 | What do `A`, `N`, `Z` mean, given `Day`/`Night` are already separate labels on F5? | **Not shift names.** `Day`/`Night` are the real shifts; `A`/`N`/`Z` are team or group codes — a separate rotating-crew dimension. | `shifts` stays a 2-row master (`Day`, `Night`); clock start/end times remain open (see NC-26). A new configurable `teams` master holds `A`/`N`/`Z`, referenced from `production_entries.team_id` alongside `shift_id`, not merged into it. | 2026-09-08 |
| NC-13 | What is the Z&Z / Gatron relationship? | **Dual role for Z&Z.** Both Z&Z and Gatron are vendors, but Z&Z is *also* a customer of Interconverters. Gatron is vendor-only. | `suppliers` and `customers` confirmed non-exclusive — the same business can hold a row in both. Gatron defaults to `INTERCONVERTERS_OWNED` (ordinary purchase); Z&Z defaults to `TOLL_MANUFACTURING`/`CUSTOMER_OWNED`, consistent with F3's own title, *"For Z&Z Production."* Per-transaction override still needed — see NC-27. | 2026-09-08 |
| NC-14 | Do `Column1` (kg per strip) and `Column2` (article/product description) on IC-FM-01 actually mean what the arithmetic implies? | **Confirmed.** `Column1` = kilograms per strip; `Column2` = article/product description, exactly as the arithmetic inferred. | `production_entries.column1_kg_per_strip` and `.column2_article` re-tagged `CONFIRMED`, retiring the `INFERRED FROM ARITHMETIC` tag. | 2026-09-08 |

> **NC-08 caveat, evidence-based:** the ≈7.25/kg formula fits the Awias Day 6-Taar-Double rows cleanly,
> but the **opposite** pattern appears in the Hamza Day group on the same report: `MACH NO 14`
> (26.00 kg produced) and `MACH NO 16` (16.50 kg produced) both carry a **blank** `PR STRIP AMOUNT`,
> while `MACH NO 15` and `MACH NO 17` — both **zero-output** rows — carry values of `168` and `142`
> respectively (the latter remarked `Article Change`). A pure per-kg piece rate cannot explain
> zero-output rows being paid while non-zero-output rows are blank. The likely explanation is that the
> field does double duty — piece-rate pay on productive rows, a flat setup/changeover or idle allowance
> on non-productive ones — but this is inference, not confirmation. Tracked as NC-25 below.

**Three residual, non-blocking follow-ups produced by these answers:**

| ID | Question | Why it matters | Evidence | Impact | Classification | Who can answer | Status |
|---|---|---|---|---|---|---|---|
| NC-25 | Does `PR STRIP AMOUNT` sometimes represent a flat setup/changeover or idle allowance rather than per-kg piece-rate pay? | If the field serves two purposes depending on context, it cannot be computed by a single formula and must remain a captured/imported value; conflating the two would misstate wages either way. | F5, Hamza Day group, IC-FM-01, 21-June-2025 — `MACH NO 14` (26.00 kg): blank; `MACH NO 16` (16.50 kg): blank; `MACH NO 15` (0 kg): `168`; `MACH NO 17` (0 kg, "Article Change"): `142`. | `production_entries.pr_strip_amount` field design (captured vs computed); payroll process documentation if Factory Live is later asked to formalise wage capture | NON-BLOCKING | Production Manager / HR-Payroll / whoever prepares IC-FM-01 | OPEN |
| NC-26 | Exact clock start/end times for the `Day` and `Night` shifts — duration confirmed as 12 hours (F5 `SHIFT TIME`), but not the start clock time. | `shifts.start_time`/`end_time` need real values for time-of-day reporting or IoT correlation later; the table structure is unaffected either way. | F5's `SHIFT TIME` column reads `12 hours` on every sampled row; no clock time is printed anywhere on any form. | `shifts` seed data only, not schema | NON-BLOCKING | Production Manager / Supervisor | OPEN |
| NC-27 | Should every Z&Z-sourced receipt default to `TOLL_MANUFACTURING`/`CUSTOMER_OWNED`, or does Z&Z — confirmed as both vendor and customer — also sell Interconverters ordinary purchased material at times? | Determines the default `ownership` value the Goods Receiving screen should suggest for a Z&Z-sourced line; the schema already supports either value per transaction, so this affects only the default, not the table design. | NC-13 confirmed Z&Z holds a dual vendor/customer role; F2/F3 do not distinguish which specific receipts relate to which role. | GRN screen default logic; `stock_ledger.ownership` data quality for Z&Z transactions | NON-BLOCKING | Production Manager / Accounts / Owner | OPEN |
| NC-28 | Which 6 of the 17 `legacy_machine_no` values are the warp-knitting machines, and what machine group do the other 11 belong to? | The `machines` table has one row per legacy number with a `machine_group` FK — populating that FK correctly is master-data entry, not a schema decision, but real machine records cannot be created until it is answered. | NC-03 confirmed 17 machines total with 6 as a warp-knitting subset, but did not specify which 6. F5's sample data shows machines running `6 Taar`, `7 Taar`, `13 Taar`, `8 Tar` and `26 Tar 5 CM` articles across the 17 — more variety than six identical warp-knitting units alone would produce — and F9 separately selects `Crochet` as the elastic construction type, a distinct machine group from Warp Knitting in the brief's own §13 list. A split of 6 Warp Knitting plus a mix of Crochet/Needle Loom/other across the remaining 11 is plausible, not concluded. | `machines` master-data population; critical path already identified in [`13-master-data-migration.md`](13-master-data-migration.md) | NON-BLOCKING | Production Manager / Maintenance | OPEN |

---

## NON-BLOCKING items — can be settled during Phase 1 without schema rework

| ID | Question | Why it matters | Evidence | Impact | Classification | Who can answer | Status |
|---|---|---|---|---|---|---|---|
| NC-01 | IC-FM-03 is missing from the form pack — what form is it, and is it still in use? | Document control is incomplete without it; it may represent a process not otherwise covered by F1–F9. | The document-control sequence runs IC-FM-01, IC-FM-02, then jumps to IC-FM-04 and IC-FM-05 — IC-FM-03 is simply absent from the scanned pack. | `02-form-inventory.md` completeness, possible additional digital module | NON-BLOCKING | Admin / Quality (document controller) | OPEN |
| NC-04 | `machine speed` = 400 on IC-FM-01 — what unit? (RPM? courses/minute? metres/hour?) | Needed to make Machine Speed a meaningful, comparable figure and to validate it against manufacturer specification once IoT feeds arrive. | Every sampled IC-FM-01 row shows `machine speed = 400`, identical across every machine and article in the sample, with no unit printed. | Machine attribute display/labelling, future speed-based KPIs and IoT Phase 5 validation | NON-BLOCKING | Production Manager / Maintenance | OPEN |
| NC-05 | `PLY` = 600 on IC-FM-01 — what does it mean, and what unit? (600 is implausibly high for a literal ply count.) | Affects how this field is labelled and interpreted; may be a different quantity entirely (e.g. a machine setting code) rather than a textile "ply" in the conventional sense. | Every sampled IC-FM-01 row shows `PLY = 600`, identical across every machine and article sampled — a constant this uniform across differing articles is itself a clue that it may not vary per-article, but its meaning is not stated. | Field labelling on the production-entry screen; whether it belongs on `machines` or `products` | NON-BLOCKING | Production Manager | OPEN |
| NC-06 | `GAUGE` = 15 or 12 on IC-FM-01 — what does it mean? (Needle gauge? Gauge per inch? Something else?) | Affects field labelling and whether this is a machine-fixed attribute or an article-driven setting. | IC-FM-01 rows show `GAUGE` values of 15 (6 Taar Double, 6 Tar Single, 7 Taar) and 12 (13 Taar, 26 Tar 5 CM) — it varies by article group, which is at least consistent with it being an article-linked setting, but this is not confirmed. | Field placement on `machines` vs `products`; process-route configuration | NON-BLOCKING | Production Manager / Maintenance | OPEN |
| NC-09 | F1 costing: the `Total` row `Per Kg` cell = 439 does not reconcile with any other figure on the sheet. What does it represent? | The costing sheet is otherwise fully verified by arithmetic (see `SOURCE-EVIDENCE.md` F1); this one cell is the exception and its meaning is unexplained. | F1's price block shows Yarn 550, Rubber 1,500, Overhead 2,500 in the `Per Kg` column, but the `Total` row's `Per Kg` cell reads 439 — it does not equal the sum, nor any combination of 20.97/21.39 (the `Per Mtr` totals), nor any other printed figure. | `product_costings` field interpretation and validation; whether 439 should even be captured as a field | NON-BLOCKING | Production Manager / whoever prepared the F1 sheet | OPEN |
| NC-11 | Stock Register (IC-FM-05 / F8) scope — is it used for raw material, finished goods, or both? | Affects how F8 migration templates are filled and which `stock_category` values are expected on cards migrated from it; does not require a schema change since `stock_ledger.stock_category` already supports all relevant values. | F8's header carries both `Product Name:` and `Supplier Name:` (suggesting raw material) but its columns are headed `Production` (suggesting output, i.e. finished/WIP goods) — the form itself is ambiguous about which side of the process it tracks. | `13-master-data-migration.md` Stock Register migration scope; `15-form-retirement-matrix.md` digital route for F8 | NON-BLOCKING | Store / Production Manager | OPEN |
| NC-12 | Is wastage actually recorded in practice? The `WASTAGE` column exists on IC-FM-01 but is empty on every sampled row. | Determines whether Wastage % (a defined KPI in `14-kpi-dictionary.md`) can be populated from day one, or whether it needs a process change/training push before it produces meaningful numbers. | Every sampled IC-FM-01 row across all four groups (Ahmed Day, Awias Day, Bahadue Night, Hamza Day) shows a blank `WASTAGE` cell, including rows with substantial non-zero output. | Wastage %-KPI reliability; whether Phase 1 training must specifically address this gap | NON-BLOCKING | Production Manager / Supervisor | OPEN |
| NC-15 | Goods receiving has no lot number, PO reference or GRN number today — are lots recorded anywhere else at all? | Traceability cannot function without lot capture somewhere. If lots genuinely exist nowhere today, Batch Traceability (Phase 3) starts from zero at cutover rather than being back-filled, which needs to be planned for rather than discovered late. | F2's columns are `Serial # | DATE | Time | Supplier | Driver Name | Vechile # | Article | QTY | Total Weight | Per Cone Wt | Remarks` — no lot, PO or GRN-number field exists anywhere on the form. | `10-migration-plan.md` Phase 3 entry criteria; realistic scope of Batch Traceability at go-live | NON-BLOCKING | Store / Purchase | OPEN |
| NC-16 | The QC sampling rule on F9 — what happens above 5,000 m, and does "over and above 2 sample per shift" mean *in addition to* the 3–5 samples, or *instead of* them? | `qc_plan_rules` needs an unambiguous threshold and sample-count rule; the current wording supports two different readings that produce different sampling intensity. | F9's Authorization clause reads verbatim: *"3 – 5 Samples attached for qty 1000 mtr – 5000 mtr order / Over and above 2 sample per shift, Check width, Pull Ratio, Size."* | `qc_plan_rules` configuration; QC workload planning for large orders | NON-BLOCKING | Quality | OPEN |
| NC-17 | The unit on F4's Daily Stock Report — rolls is implied but never stated. | UOM assignment for every F4-derived balance depends on this; "rolls" is currently only an inference from context (item names carrying roll-length descriptors, whole-number balances). | F4's columns (`OPENING STOCK`, `PRODUCTION`, `DISPATCH`, `BALANCE`) carry whole numbers such as 19, 52, 299, 367 with no unit column or label anywhere on the form. | UOM conversion layer, opening-balance strategy in `10-migration-plan.md` §3 | NON-BLOCKING | Store / Production Manager | OPEN |
| NC-18 | Roll length standards — 500 m and 1000 m appear in item names; is this the complete set of standard roll lengths, or are there others not present in this sample? | Affects whether `roll_length` should be a free-entry field or a constrained/enumerated master list on `products`. | F1's title and F4's item names both show only 500 MTR and 1000 MTR roll lengths across the sampled data. | `products` master `roll_length` field design; product master migration template | NON-BLOCKING | Production Manager / Sales | OPEN |
| NC-19 | Costing currency (assumed PKR, but never printed on any form) — and should material prices sync from QuickBooks rather than being keyed independently in Factory Live? | Currency confirmation is needed for correct display and any future multi-currency handling; the sync question determines whether `product_costings` price inputs are manually maintained or pulled via `quickbooks_item_id` in Phase 4. | F1's price figures (550, 1500, 2500, 439, 21.39, 3,582 etc.) carry no currency symbol or code anywhere on the sheet. | `product_costings` schema and Phase 4 QuickBooks item-price sync design (see `07-quickbooks-mapping.md`) | NON-BLOCKING | Accounts | OPEN |
| NC-20 | Target production quantity has no source on any current form — how are targets set today, if at all? | Production Achievement % (a defined KPI) is meaningless without a target; if targets are informal/verbal today, Factory Live needs an explicit process for setting `target_quantity`, not just a field to hold it. | No form in the pack (F1–F9) contains a target-quantity field of any kind — targets, if they exist, are not currently written down anywhere in the sampled evidence. | `production_orders.target_quantity` population process; Production Achievement % / Production Variance KPI reliability | NON-BLOCKING | Production Manager | OPEN |
| NC-21 | Real-person-to-role mapping for the signatories on the forms — who are Bilal, Haroon and the Chief Financial Officer in terms of the canonical roles (Admin, Production Manager, Supervisor, Store, Purchase, Quality, Maintenance, Accounts)? | `factory_user_roles` cannot be seeded with real accounts until named individuals are mapped to canonical roles; also needed to correctly answer "Who can answer" for every other item in this register. | F4 is signed by both `Bilal` and `Haroon`, alongside a `Chief Financial officer` signature line, with no job title printed against either named individual. | `factory_user_roles` seeding; approval-authority mapping in `06-user-roles.md` | NON-BLOCKING | Admin / Owner | OPEN |
| NC-22 | What production-entry frequency is intended in the digital system — per shift as today, or more often (e.g. hourly, per meter-reading)? | Affects operator workflow design and training, though the `production_entries` schema (with `start_time`/`stop_time`) already accommodates either frequency without structural change. | IC-FM-01 as currently used captures one row per machine per shift per day — no intra-shift entries are evidenced anywhere in the sample. | Production Entry screen UX; data volume and KPI calculation frequency in `14-kpi-dictionary.md` | NON-BLOCKING | Production Manager / Supervisor | OPEN |
| NC-23 | PR STRIP AMOUNT group total does not reconcile — on IC-FM-01 for 21-June-2025, the "Awias Day" group prints a `TOTAL` of `1,914` for `PR STRIP AMOUNT`, but the visible individual row values in that group (`334 + 406 + 392` + two blank cells `+ 363`) sum to `1,495` — a difference of `419`. Is this a scan/legibility issue with a misaligned row, or are values genuinely missing from the source form? | If `PR STRIP AMOUNT` is a piece-rate wage (see NC-08), group totals feed payroll — an unreconciled total means either a transcription error on the paper form or a genuinely missing figure, and the digital system must not silently carry forward an unreconciled historical total when this group is migrated. | F5, "Awias Day" group, IC-FM-01, 21-June-2025: individual `PR STRIP AMOUNT` values `334`, `406`, `392`, *(blank, MACH NO 10)*, *(blank, MACH NO 11 — see NC-24)*, `363`, summing to `1,495`; the group's own printed `TOTAL` row reads `1,914`. | `production_entries` legacy-data reconciliation checks; historical-data migration quality for IC-FM-01 groups carried forward from paper | NON-BLOCKING | Production Manager / whoever prepares IC-FM-01 | OPEN |
| NC-24 | Awias Day machine 11 has output but no PR STRIP AMOUNT — the row for `MACH NO 11` in the same group shows `290` m/strip, `58.00` kg, `11,600` total metres, but its `PR STRIP AMOUNT` cell is blank, while comparable rows in the same group with similar output all carry a value. Why does this row carry no `PR STRIP AMOUNT`? | Same payroll implication as NC-23 if `PR STRIP AMOUNT` is a wage figure; this row is also one of the two blank cells behind the NC-23 reconciliation gap, so its answer may resolve part of that gap too. **A working estimate now exists**: at the ≈Rs 7.25–7.26/kg rate derived from NC-08, 58.00 kg implies ≈ Rs 420–421 — close to the Rs 419 independently estimated for this row. | F5, "Awias Day" group, IC-FM-01, 21-June-2025, `MACH NO 11` row: `TOT M/STRIP` 290, `PER MACH KG` 58.00, `TOTAL METER` 11,600, `PR STRIP AMOUNT` blank; comparable non-zero rows in the same group (`MACH NO` 7, 8, 9, 12) all carry a non-blank `PR STRIP AMOUNT` value. | `production_entries` legacy-data reconciliation checks; historical-data migration quality for IC-FM-01 groups carried forward from paper | NON-BLOCKING | Production Manager / whoever prepares IC-FM-01 | OPEN |

---

## Summary

| | Count |
|---|---|
| **RESOLVED** | **7** (NC-02, NC-03, NC-07, NC-08, NC-10, NC-13, NC-14) — all originally BLOCKING |
| **BLOCKING (open)** | **0** |
| **NON-BLOCKING (open)** | **21** (NC-01, NC-04, NC-05, NC-06, NC-09, NC-11, NC-12, NC-15, NC-16, NC-17, NC-18, NC-19, NC-20, NC-21, NC-22, NC-23, NC-24, NC-25, NC-26, NC-27, NC-28) |
| **Total items tracked** | **28** |

### Verdict

**Ready for Phase 1 coding.** All seven original BLOCKING items are now resolved directly by
Interconverters, and [`05-database-schema.md`](05-database-schema.md) has been updated to match every
one of them: `machines` gains `working_width_mm` and a confirmed 17-machine population, a new `teams`
master separates crew codes from shifts, `pr_strip_amount` is confirmed payroll-adjacent but captured
rather than computed, the Z&Z/Gatron ownership split has working defaults, and
`column1_kg_per_strip`/`column2_article` are `CONFIRMED` rather than inferred.

**Twenty-one NON-BLOCKING items remain**, none of which stop Phase 1 coding from starting. One deserves
attention before real machine records are entered rather than during general Phase 1 cleanup:
**NC-28** — which 6 of the 17 `legacy_machine_no` values are the warp-knitting machines, and what the
other 11 are — is master-data population, not a schema question, but the `machines` table cannot hold
real data until it is answered. This is already the identified critical path in
[`13-master-data-migration.md`](13-master-data-migration.md) §C.

The remaining twenty items should be worked through during Phase 1 so they do not silently accumulate
into Phase 2 and 3 risk — the vertical slice in [`10-migration-plan.md`](10-migration-plan.md) §2 can
begin now.
