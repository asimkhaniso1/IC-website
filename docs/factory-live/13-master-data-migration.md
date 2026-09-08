# 13 — Master Data Migration

**Section §13 of the pack.** Twelve masters must exist, populated with real Interconverters data, before
Factory Live can run a single real transaction. This file specifies, for each master: where its data
comes from today, who owns it, and how it gets into the system — plus three fill-in templates the
factory can complete by hand, using the exact column lists defined in
[`05-database-schema.md`](05-database-schema.md).

**Reads with:** [`05-database-schema.md`](05-database-schema.md) for the authoritative column lists ·
[`11-needs-confirmation.md`](11-needs-confirmation.md) for every NC-xx item referenced below ·
[`10-migration-plan.md`](10-migration-plan.md) for the phase entry criteria this file feeds ·
[`06-user-roles.md`](06-user-roles.md) for the ten roles named as Owners below · [`00-README.md`](00-README.md)
for the status legend (`CONFIRMED`, `NEEDS CONFIRMATION`, `BLOCKING`, `DERIVED`, `NEW per §<n>`, etc.).

**No master row is invented here.** Every Source cell below points at a real form and field; every
worked example row in Part B is built only from values that appear in
`SOURCE-EVIDENCE.md`. Where the evidence does not support a value, the cell says
`NEEDS CONFIRMATION`, not a guess.

---

## Part A — The twelve masters

Twelve subsections, one per master. Each table covers: **Source** (where the data comes from today),
**Owner** (the canonical role per [`06-user-roles.md`](06-user-roles.md) responsible for keeping the
master accurate), **Required Fields**, **Unique Identifier**, **Validation Rules**, **Duplicate
Handling**, **Legacy Reference** (the exact form/column this master replaces), and **Migration Method**
(`BULK IMPORT` / `MANUAL ENTRY` / `DERIVED` / `SEEDED`).

### 1. Machines

| | |
|---|---|
| **Source** | F1's `MCH 13` reference (top-left of the costing sheet); F5's `MACH NO` column, values 1–17 observed across all sampled groups |
| **Owner** | Production Manager (`06-user-roles.md` §1 — Edit right over "master data for machines/machine groups/routes"), with Maintenance contributing model/serial/installation detail |
| **Required Fields** | `machine_group`, `machine_name`, `active_status` — `legacy_machine_no` is deliberately **not** required for the record to exist, only for it to be complete (see Migration Method) |
| **Unique Identifier** | `machine_id` (system-generated) |
| **Validation Rules** | `machine_group` must resolve to a seeded `machine_groups` row; `legacy_machine_no`, if populated, must not be entered against an illustrative `WKM-24-01`…`06` ID until NC-02 and NC-03 close |
| **Duplicate Handling** | One `machine_id` per physical machine. `legacy_machine_no` is **not** unique-constrained today — until NC-02/NC-03 close it is not established whether one legacy number maps to exactly one canonical machine, so no uniqueness rule can safely be enforced on it yet |
| **Legacy Reference** | F1 `MCH 13`; F5 `MACH NO` 1–17 |
| **Migration Method** | `MANUAL ENTRY` for every non-legacy field (group, name, model, etc.), which may proceed now; `legacy_machine_no` population is **BLOCKED** — see Part C |

### 2. Machine Groups

| | |
|---|---|
| **Source** | Configurable master; the nine-row seed list in `05-database-schema.md` §c (`WARP-KNIT`, `JACQUARD`, `NEEDLE-LOOM`, `CROCHET`, `WARPING`, `CONE-WIND`, `PRESS-FIN`, `PACKING`, `OTHER`) |
| **Owner** | Production Manager, with Admin holding Full override |
| **Required Fields** | `group_code`, `group_name`, `active_status` |
| **Unique Identifier** | `group_code` |
| **Validation Rules** | `group_code` unique; `display_order` integer where set |
| **Duplicate Handling** | The nine seed rows are a starting point, not a fixed list — the factory may add, rename or deactivate groups, but must not create a near-synonym of an existing group (e.g. a second "Warping" group spelt differently) |
| **Legacy Reference** | None direct — inferred from the process-step vocabulary in `05-database-schema.md` §f, which the paper forms' construction language (F9's Needle/Jacquard/Crochet circle-one list) is consistent with |
| **Migration Method** | `SEEDED` (the nine rows above), editable thereafter through M12 |

### 3. Products

| | |
|---|---|
| **Source** | F4 `ITEM NAME`; F5 `Column2` (`INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION`); F9 `Product Description`; F1 sheet title; F8 `Product specification` |
| **Owner** | Production Manager (`06-user-roles.md` M2 Product & Costing, Edit right) |
| **Required Fields** | `product_code`, `product_family`, `description`, `g_per_meter` |
| **Unique Identifier** | `product_code` (system-generated) — `description` alone is not reliable: F4 and F5 show spelling drift for what appears to be the same concept (`"6 Taar Single"` vs `"6 Tar Single"`) |
| **Validation Rules** | `product_family` constrained to `J` \| `K` \| `W` (the Design Studio's FROZEN `Family` type); `g_per_meter` numeric, not null; `meters_per_kg` and `width_inch` must never be keyed directly — both are `DERIVED` |
| **Duplicate Handling** | Every spelling variant of a Taar/roll-length description (`"6 Taar Double"`, `"6 Tar Double"`, etc.) must resolve to one `product_code`, chosen once and recorded as the canonical `description`; do not create a second product row because the source form spelt it differently |
| **Legacy Reference** | F4 `ITEM NAME` rows (e.g. `"6 Taar Double 32 R 500 M"`); F5 `Column2` (e.g. `"6 Taar Double"`); F9 `Product Description` (`"13 Tar"`) |
| **Migration Method** | `BULK IMPORT` of F4's ~10 sampled item-name rows as a starting population, cross-checked against F9 order history; `MANUAL ENTRY` for anything the sample does not cover. `g_per_meter` must be sourced from F1 / F9 / F5 `G.WT/MTR`, never estimated |

### 4. Materials

| | |
|---|---|
| **Source** | F2 `Article`; F3 `Article #` + `Count` (the monthly roll-up, itself `DERIVED` from F2 — see `05-database-schema.md` §c) |
| **Owner** | Purchase (raises Purchase Requests against materials), with Store maintaining stock-side fields (`stock_location`, `minimum_stock`, `reorder_level`) |
| **Required Fields** | `material_code`, `description`, `material_category`, `primary_uom` |
| **Unique Identifier** | `material_code` |
| **Validation Rules** | `material_category` constrained to the fixed enum (`Rubber` · `Yarn` · `Polyester Thread` · `Other Thread` · `Packaging` · `Consumables` · `Accessories` · `Other`); `primary_uom` must resolve to a seeded `uoms` row |
| **Duplicate Handling** | F2's `"Rubber Fintex(32)"` and `"Rubber (38) Thailand W/F"` are two specifications of one category (Rubber), not two unrelated materials — model one `material_code` per specification, not per free-text article string. `"Elastic Machine (Single)"` (F2, received "for Production") is deliberately **excluded** — capital equipment, not a raw material, per `05-database-schema.md` §c |
| **Legacy Reference** | F2 `Article` values: `Rubber Fintex(32)`, `Rubber (38) Thailand W/F`, `Thread Polyester (China)`, `300/96-YDPS-071NA-PO`, `Empty Carton`, `Machine Garari`, `Weight Pcs For Thread` |
| **Migration Method** | `BULK IMPORT` of the ~7 distinct articles evidenced in F2/F3 as a starting population; `MANUAL ENTRY` for anything not yet in the sample |

### 5. Customers

| | |
|---|---|
| **Source** | F9 `Customer Information` block — Company Name, Address, Contact Person, `Through-Email-Phone-Verbal`, Phone |
| **Owner** | Production Manager (M1 Order Booking, Edit right) |
| **Required Fields** | `customer_code`, `customer_name` |
| **Unique Identifier** | `customer_code` (system-generated) |
| **Validation Rules** | `contact_email` format-checked where supplied; `order_channel_default` constrained to Email / Phone / Verbal |
| **Duplicate Handling** | Only one customer is evidenced in the sample (`PAKEEZAH DYEING & BLEACHING`) — no duplicate observed yet, but the same canonical-name discipline as Suppliers (§6 below) applies as volume grows |
| **Legacy Reference** | F9 `Customer Information` block |
| **Migration Method** | `MANUAL ENTRY`, one row per order booked — no consolidated customer list exists on paper to bulk import from |

### 6. Suppliers

| | |
|---|---|
| **Source** | F2 `Supplier` (`Z&Z Packages`, `Gatron`); F3 `Supplier` (`Fintex`, `World Flex Thialand`, `China`, `Gatron`, `Z&Z`) |
| **Owner** | Purchase (`06-user-roles.md` — supplier master Edit right) |
| **Required Fields** | `supplier_code`, `supplier_name` |
| **Unique Identifier** | `supplier_code` (system-generated) |
| **Validation Rules** | `supplier_name` must resolve to exactly one canonical spelling per real-world supplier (see Duplicate Handling); `supplier_type` is populated only once NC-13 (the Z&Z/Gatron relationship) is resolved |
| **Duplicate Handling** | **The load-bearing example for this whole master.** F2 records the delivering party as `"Z&Z Packages"` and `"Gatron"`; F3, covering the same reporting month, records supplier for the same physical goods as `"Fintex"`, `"World Flex Thialand"` [sic], `"China"`, `"Gatron"` and `"Z&Z"` — five strings for what the evidence suggests is a handful of real relationships. `"Z&Z Packages"` / `"Z&Z"` is the clearest spelling-drift pair; `"World Flex Thialand"` [sic, likely *Thailand*] is a probable typo, in the same pattern as F5's `"Baring"`/Bearing. F3's `"China"` (for the Thread Polyester line) is a **country, not a supplier name**, and must not be migrated as one — it needs a real supplier substituted. Every legacy string must be matched to exactly one `supplier_code` by a human reconciliation pass; none may be auto-created on first sight |
| **Legacy Reference** | F2 `Supplier` column; F3 `Supplier` column |
| **Migration Method** | `MANUAL ENTRY`, preceded by a supplier-reconciliation pass (match F2/F3 spellings to real entities) — **not** a naive bulk import of distinct strings, which would create duplicate suppliers |

### 7. Operators

| | |
|---|---|
| **Source** | F5 `NAME` column (`Ahmed`, `Awias`, `Bahadue`, `Hamza`), concatenated with a shift token as free text |
| **Owner** | Production Manager / Supervisor, under M12 Administration |
| **Required Fields** | `operator_code`, `full_name` |
| **Unique Identifier** | `operator_code` (system-generated) — `full_name` alone is insufficient, since F5 records first names only |
| **Validation Rules** | `full_name` must be split cleanly from the concatenated `NAME` string before import; `default_shift_id` is left null until NC-10 (shift naming) closes |
| **Duplicate Handling** | F5's `NAME` column is not an operator field today — it reads `"Ahmed Day"`, `"Awias Day"`, `"Bahadue Night"`, `"Hamza Day"`. Migration must split this into `operator_id` (Ahmed / Awias / Bahadue / Hamza) **+** `shift_id` (Day / Night); the concatenated string is never stored as a value. First-name-only records must be reconciled against real employee identity before `employee_id_external` is populated — otherwise two different people both called "Ahmed" on different shifts would incorrectly collapse into one `operator_id` |
| **Legacy Reference** | F5 `NAME` column, 21-June-2025 sample |
| **Migration Method** | `MANUAL ENTRY` — the name-split is a one-time cleansing pass, not a mechanical bulk import of the `NAME` column as-is |

### 8. Shifts

| | |
|---|---|
| **Source** | F4 footer (`Day (A & N)` / `Night (N & Z)`); F5 `NAME` suffix (Day/Night) + `SHIFT TIME` (12 hours) |
| **Owner** | Production Manager / Supervisor |
| **Required Fields** | `shift_code`, `shift_name` |
| **Unique Identifier** | `shift_code` |
| **Validation Rules** | `shift_code` must **not** be finalised until NC-10 closes — what `A`/`N`/`Z` denote, and how "Day"/"Night" as written on F5 map onto them, is unresolved; `start_time`/`end_time` stay null until confirmed (F5 states only a 12-hour duration, no clock times) |
| **Duplicate Handling** | Do not seed both a literal "Day"/"Night" pair **and** an "A"/"N"/"Z" triplet as if independent — they are two descriptions of what may be the *same* shift system. Creating both would double the shift master before the true mapping is known |
| **Legacy Reference** | F4 footer summary block; F5 `NAME` suffix + `SHIFT TIME` |
| **Migration Method** | **`BLOCKED`** pending NC-10 — no shift row is authoritative master data until the mapping is confirmed. "Day"/"Night" may be used as a clearly-marked provisional placeholder for Phase 1 planning only |

### 9. Locations

| | |
|---|---|
| **Source** | Not named directly on any form; implied by process — F2 receiving implies a raw-material store, F5/production implies a WIP floor, F4/F8 balances imply a finished-goods store, F6 Gate Pass implies a dispatch bay |
| **Owner** | Store, with Admin for structural changes |
| **Required Fields** | `location_code`, `location_name`, `location_type` |
| **Unique Identifier** | `location_code` |
| **Validation Rules** | `location_type` constrained to `RAW_MATERIAL_STORE` \| `WIP` \| `FINISHED_GOODS_STORE` \| `DISPATCH` \| `OTHER`; `parent_location_id`, if used, must not create a cycle |
| **Duplicate Handling** | Seed one row per functional zone actually operated physically — not one per product or per report. F4/F8's apparent "location" concept is really `stock_ledger.stock_category`, a separate field, and must not be confused with a physical `locations` row |
| **Legacy Reference** | None direct — inferred from F2/F4/F6 process context only |
| **Migration Method** | `SEEDED` (minimal starter set: Raw Material Store, WIP Floor, Finished Goods Store, Dispatch Bay) + `MANUAL ENTRY` to refine into sub-zones |

### 10. Downtime Reasons

| | |
|---|---|
| **Source** | F5 `REMARKS` column, doing duty today as an informal downtime log |
| **Owner** | Maintenance (downtime-reason master Edit right, `06-user-roles.md`), with Production Manager owning `downtime_categories` |
| **Required Fields** | `reason_code`, `reason_name`, `downtime_category_id`, `origin` |
| **Unique Identifier** | `reason_code` |
| **Validation Rules** | `origin` constrained to `OBSERVED` \| `PROPOSED`; every `OBSERVED` row must trace to a specific F5 sample row; `PROPOSED` rows require Production/Maintenance sign-off before `active_status = true` |
| **Duplicate Handling** | Only four values are evidenced — `Machine Man Absent`, `Machine Off`, `Machine Fault Baring` [sic — read as *Bearing*], `Article Change` — and these four must be seeded **exactly as observed**, spelling preserved for traceability (the likely intended word may be recorded in `notes`, not substituted into `reason_name`). A further categorised `PROPOSED` list must come from Production/Maintenance, not be invented here |
| **Legacy Reference** | F5 `REMARKS`: Ahmed Day / Bahadue Night groups = Machine Man Absent; `MACH NO` 10 = Machine Fault Baring; `MACH NO` 14/16 = Machine Off; `MACH NO` 17 = Article Change |
| **Migration Method** | `SEEDED` (the four `OBSERVED` reasons) + `MANUAL ENTRY` for the `PROPOSED` categorised list once supplied |

### 11. UOMs

| | |
|---|---|
| **Source** | Units in active use across the pack: Meters (F9, F5 `TOTAL METER`), Kg (F1, F2 `Total Weight`, F5 `PER MACHINE KG`), Rolls (F4 balances, `NEEDS CONFIRMATION` NC-17), Strips (F5 `STRIP`), Cones (F2 `Per Cone Wt`), Pieces (F2 `QTY` for cartons/parts), Inches (F9 `Width`, `Pull Ratio`), Millimetres (Design Studio canonical) |
| **Owner** | Admin (M12 Administration) |
| **Required Fields** | `uom_code`, `uom_name`, `uom_type` |
| **Unique Identifier** | `uom_code` |
| **Validation Rules** | `uom_type` constrained to `LENGTH` \| `WEIGHT` \| `COUNT`; exactly one `is_base_unit = true` per `uom_type` |
| **Duplicate Handling** | Eight canonical codes only (`MTR`, `KG`, `ROLL`, `STRIP`, `CONE`, `PCS`, `IN`, `MM`) — no free-text unit labels anywhere else in the schema. `ROLL` specifically is seeded provisionally: its exact meaning on F4 is `NEEDS CONFIRMATION` (NC-17) |
| **Legacy Reference** | As listed under Source above |
| **Migration Method** | `SEEDED` (the eight codes) + `uom_conversions` seeded for fixed pairs only (e.g. `MM` ↔ `IN` at 25.4). Item-specific conversions (`g_per_meter`, kg per strip) are **never** stored as `uom_conversions` rows — they are `DERIVED` per product/entry, per `05-database-schema.md` §e |

### 12. Product Routes

| | |
|---|---|
| **Source** | Not captured as an explicit routing document on any form; derived from the 13 canonical process steps and the two illustrative templates (Jacquard Elastic, Knitted Elastic) in `05-database-schema.md` §f |
| **Owner** | Production Manager (routes Edit right, `06-user-roles.md`) |
| **Required Fields** | `route_code`, `route_name`, at least one `process_route_steps` row (`sequence_no` + `process_step_id`) |
| **Unique Identifier** | `route_code` |
| **Validation Rules** | `sequence_no` unique within a route; `product_family`, where set, constrained to `J` \| `K` \| `W`; `is_template` distinguishes example configurations from live routes |
| **Duplicate Handling** | The two published templates are examples, not a ceiling — F9's own sampled order used Crochet construction on what would be a Knitted-family product, which neither template covers exactly, so a distinct "Crochet Elastic" route is a legitimate addition, not a duplicate. Avoid near-identical routes that differ only by a renamed machine group |
| **Legacy Reference** | None direct — F9's construction field (`Needle` / `Jacquard` / `Crochet`) is the closest paper evidence of a routing choice |
| **Migration Method** | `MANUAL ENTRY` — configured once by Production Manager during Phase 2 setup per `10-migration-plan.md`; not bulk-importable, since no source list of routes exists on paper |

---

## Part B — Fill-in migration templates

Three worked templates, using the exact column lists from [`05-database-schema.md`](05-database-schema.md).
Worked example rows use only values that appear in `SOURCE-EVIDENCE.md`; blank rows follow for the
factory to complete.

### B1. MACHINE MASTER MIGRATION TEMPLATE

> ⚠️ **`WKM-24-01` … `WKM-24-06` are illustrative example IDs only, taken from `05-database-schema.md`
> §c.** They must **NOT** be pre-filled against legacy numbers 1–17 (or against any `legacy_machine_no`)
> until NC-02 and NC-03 close. It is not established that the six 24-needle warp-knitting machines and
> the seventeen `MACH NO` values on IC-FM-01 are the same population, an overlapping population, or two
> entirely separate populations. Populating this mapping anywhere ahead of that answer is exactly the
> mistake this pack exists to prevent.

| machine_id | legacy_machine_no | machine_group | machine_type | machine_name | needle_taar_configuration | machine_model | manufacturer | serial_number | quantity_reference | physical_location | production_section | process_step | active_status | installation_date | capacity | standard_speed | compatible_product_families | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **BLANK — see note** | 8 | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION (no display name printed against `MACH NO` 8 on any form — F1 only names `MCH 13`, a different machine) | "6 Taar Double" (F5) | | | | | NEEDS CONFIRMATION | | | TRUE | | | 400 — unit NEEDS CONFIRMATION | NEEDS CONFIRMATION | Source: F5, "Awias Day" group, IC-FM-01, 21-June-2025. `MACH NO` 8, `Taar` 6, `Column2` "6 Taar Double", `RUBBER` 32, `machine speed` 400, `PLY` 600, `GAUGE` 15, `STRIP` 40, `G.WT/MTR` 5.6. Do not treat any field on this row as final before NC-02, NC-03, NC-06 and NC-07 close |
| | | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | |

**Why `machine_id` is blank on the worked row:** assigning a canonical `machine_id` — even a placeholder
— would pre-empt the very question this row exists to illustrate. The legacy-to-new machine mapping
(NC-02, NC-03) is `BLOCKING`: it changes whether `machines` needs one flat list, a machine-type split, or
two entirely separate populations. No `machine_id` should be generated for any legacy-numbered machine
until that question closes. `legacy_machine_no` is shown here only as evidence transcription (it is a
real value printed on F5), not as a resolved mapping.

**A further flag for whoever fills the blank rows below:** `needle_taar_configuration` itself carries the
same open question as F5's `STRIP` column (NC-07) — it is not established whether a Taar/needle
configuration is a fixed attribute of the machine or an attribute of the article being run on it. Do not
assume it belongs on `machines` merely because a column exists for it here.

### B2. PRODUCT MASTER MIGRATION TEMPLATE

| Column | Worked example 1 (F9 order) | Worked example 2 (F1 / F4) |
|---|---|---|
| `product_id` | *(blank — assigned once `product_code` scheme is confirmed)* | *(blank)* |
| `product_code` | NEEDS CONFIRMATION (no coding scheme exists yet) | NEEDS CONFIRMATION |
| `product_family` | **NEEDS CONFIRMATION** — F9 records `Type: Crochet` under "Elastic: Needle / Jacquard / Crochet", which is a **construction type**, not one of the Design Studio's `J`/`W`/`K` family codes; mapping Crochet construction onto a family is not established | NEEDS CONFIRMATION — same issue; "Single" is a construction descriptor, not a coded family |
| `description` | `13 Tar` | `6 Tar Single 38 Rubber 500/1000 MTR` (F1 sheet title); note F4 spells the same concept `6 Taar Single 500 MTR` / `6 Taar Single 1000 MTR` — spelling drift, resolve to one canonical `description`, see Part D |
| `customer_reference` | *(blank — none supplied on F9)* | *(blank)* |
| `width_mm` | `25.4` — entered value, converted from F9's native inch reading (`1 inch × 25.4`); `DERIVED FROM SOURCE`, not separately keyed | *(blank — not evidenced for this product)* |
| `width_inch` | `1` — `DERIVED`, never keyed; shown here only as proof it reconciles against F9's printed "Width: 1 inch" | *(blank)* |
| `elastic_non_elastic` | `Elastic` (F9 title: "ELASTIC ORDER BOOKING…") | *(blank)* |
| `construction` | `Crochet` (F9 circle-one, chosen) | `Single` — `NEEDS CONFIRMATION` whether this is a `construction` value in the same sense as F9's Needle/Jacquard/Crochet list, or a distinct attribute |
| `rubber_core_configuration` | *(blank)* | *(blank)* |
| `rubber_specification` | `52` (F9 `Rubber: 52`) | `38` (F1 sheet title `RUBBER`) |
| `yarn_type` | *(blank — not separately named beyond `poly_thread`)* | *(blank)* |
| `yarn_count` | *(blank)* | NEEDS CONFIRMATION — F1 composition shows `150/0 Gr` and `300/0 Gr` rows consistent with 150/300 denier, but F1 itself never writes the word "denier" |
| `poly_thread` | `150 Danier or 300 Danier Poly thread` — verbatim F9 (printed spelling "Danier"; likely intended "Denier", preserved per the pack's practice for F5's "Baring"/Bearing) | *(blank — F1 does not use this exact field label)* |
| `color` | `White` (F9 — both its `Colour:` and `Color:` fields read White; treated as one field per `05-database-schema.md`) | *(blank)* |
| `finish` | `Starch` (F9 circle-one, chosen) | *(blank)* |
| `edge_style` | *(blank)* | *(blank)* |
| `g_per_meter` | `8.76` — **CANONICAL**, from F9 `Wt of 1000 Mtr 8.76 Kg` ÷ 1000 | `5.97` — **CANONICAL**, from F1 `Elastic wt Gr` (composition block) |
| `meters_per_kg` | `114` — `DERIVED`, matches F9's own printed `Mtrs in 1 kg 114 Meters` | `168` — `DERIVED`, matches F1's own printed `Meter In Per Kg 168` |
| `standard_roll_length` | *(blank — F9's order quantity, 55,400 Meters, is a total order size, not a roll-length standard)* | `500 / 1000` — F1 title "500/1000 MTR"; F4 records these as **two separate `ITEM NAME` rows**, raising NC-18 (is this one product with two roll-length variants, or two products?) — resolve before finalising this row |
| `target_elongation` | NEEDS CONFIRMATION — F9's `Pull Ratio: 5 to 12 Inches` may or may not be the same concept as `target_elongation`; not assumed here | *(blank)* |
| `tolerance` | *(blank)* | *(blank)* |
| `machine_group_compatibility` | NEEDS CONFIRMATION — depends on the `product_family` question above | *(blank)* |
| `machine_compatibility` | *(blank)* | *(blank)* |
| `standard_cost_per_meter` | *(blank — no matching costing sheet evidenced for this order)* | `21.39` — F1's highlighted `Total per Mtr Cost` |
| `active_status` | TRUE | TRUE |
| `legacy_reference` | F9 order, Pakeezah Dyeing & Bleaching, 03-Apr-2025, Pg 1 of 2 | F1 costing sheet (no document number); F4 Daily Stock Report 23/06/2025, `ITEM NAME` rows 2 & 3 |
| `notes` | `product_family` cannot safely default to any of J/K/W from "Crochet" alone — record the construction as evidenced and leave family open until confirmed | See NC-18 on whether 500 m and 1000 m are two `standard_roll_length` variants of one `product_code` or two separate products |

*(blank rows for further products follow — factory to complete)*

| product_id | product_code | product_family | description | customer_reference | width_mm | width_inch | elastic_non_elastic | construction | rubber_core_configuration | rubber_specification | yarn_type | yarn_count | poly_thread | color | finish | edge_style | g_per_meter | meters_per_kg | standard_roll_length | target_elongation | tolerance | machine_group_compatibility | machine_compatibility | standard_cost_per_meter | active_status | legacy_reference | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | *(DERIVED)* | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | *(DERIVED)* | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | *(DERIVED)* | | | | | | | | | |

### B3. RAW MATERIAL MASTER MIGRATION TEMPLATE

| Column | Rubber Fintex(32) | Rubber (38) Thailand W/F | Thread Polyester (China) | 300/96-YDPS-071NA-PO | Empty Carton | Machine Garari |
|---|---|---|---|---|---|---|
| `material_id` | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* |
| `material_code` | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION |
| `description` | Rubber Fintex(32) | Rubber (38) Thailand W/F | Thread Polyester (China) | 300/96-YDPS-071NA-PO | Empty Carton | Machine Garari |
| `material_category` | Rubber | Rubber | Polyester Thread | Polyester Thread | Packaging | Accessories |
| `specification` | 32 | 38 | NEEDS CONFIRMATION (F2's article string carries no denier figure; F3 separately records "150 Polyester" for what appears to be the same receipt) | 300 Danier (F3 spelling preserved) | *(blank)* | NEEDS CONFIRMATION — item definition itself is `NEEDS CONFIRMATION` per `05-database-schema.md` §c |
| `supplier` | Fintex → *(FK, resolve via supplier reconciliation, §6 above)* | World Flex Thialand [sic] → *(FK, resolve via supplier reconciliation)* | **NEEDS CONFIRMATION** — F2 attributes this receiving line to Z&Z Packages (the delivering party); F3 records the supplier as `"China"`, a country, not a supplier name. These do not agree; do not migrate "China" as a supplier | Gatron | Z&Z Packages | Z&Z Packages |
| `supplier_item_code` | *(blank)* | *(blank)* | *(blank)* | 300/96-YDPS-071NA-PO *(the F2 article string itself looks like a supplier item code)* | *(blank)* | *(blank)* |
| `primary_uom` | KG | KG | KG | KG | PCS | PCS — `NEEDS CONFIRMATION` (no weight column populated for this article on F2) |
| `secondary_uom` | CONE | CONE | CONE | CONE | *(blank)* | *(blank)* |
| `conversion_factor` | 25 (cone → kg) — reconciles: F2 Serial 2, 43 cones × 25 = 1,075 kg, matches printed `Total Weight` exactly | 25 (cone → kg) — reconciles: F2 Serial 6, 74 cones × 25 = 1,850 kg, matches printed `Total Weight` exactly | 34.8 (cone → kg) — reconciles: F2 Serial 6, 53 cones × 34.8 = 1,844.4 kg, matches printed `Total Weight` exactly | 32 (cone → kg) — reconciles: F2 Serial 3, 200 cones × 32 = 6,400 kg, matches printed `Total Weight` exactly | *(blank — no per-unit weight evidenced)* | *(blank)* |
| `weight_per_unit` | 25 kg (F2 `Per Cone Wt`) | 25 kg (F2 `Per Cone Wt`) | 34.8 kg (F2 `Per Cone Wt`) | 32 kg (F2 `Per Cone Wt`) | *(blank)* | *(blank)* |
| `standard_cost` | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* |
| `quickbooks_item_id` | *(blank — Phase 4)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* |
| `lot_control_required` | NEEDS CONFIRMATION (NC-15 — no lot capture exists on F2 today) | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | FALSE (assumed) | FALSE (assumed) |
| `expiry_control_required` | FALSE (assumed — no expiry evidenced for rubber) | FALSE (assumed) | FALSE (assumed) | FALSE (assumed) | FALSE | FALSE |
| `stock_location` | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION | NEEDS CONFIRMATION |
| `minimum_stock` | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* |
| `reorder_level` | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* | *(blank)* |
| `active_status` | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE |
| `notes` | F2 Serial 2/4/5, all "Z&Z Packages" | F2 Serial 6, "Z&Z Packages" | Supplier conflict — see `supplier` cell above | F2 Serial 3, "Gatron (Inter Converter)" | F2 Serial 2 (2,900) + Serial 6 (1,440); F3 confirms 4,340 total exactly | Item definition NEEDS CONFIRMATION |

*(blank rows for further materials follow — factory to complete)*

| material_id | material_code | description | material_category | specification | supplier | supplier_item_code | primary_uom | secondary_uom | conversion_factor | weight_per_unit | standard_cost | quickbooks_item_id | lot_control_required | expiry_control_required | stock_location | minimum_stock | reorder_level | active_status | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | | |

---

## Part C — Data collection sequence

The order below reflects real dependency, not file order. An item marked `BLOCKED` cannot be completed —
not merely "not yet started" — until the cited NC-xx item closes.

| Order | Master | Status | Depends on | Notes |
|---|---|---|---|---|
| 1 | UOMs | Ready now | — | Foundational — every other master's quantity fields ultimately resolve to a `uoms` row. `SEEDED`, eight codes |
| 2 | Locations | Ready now | — | `SEEDED` starter set of four zones; no upstream dependency |
| 3 | Machine Groups | Ready now | — | `SEEDED` nine-row list; editable, not blocked |
| 4 | Downtime Reasons (`OBSERVED`) | Ready now | — | The four evidenced reasons can be seeded immediately; the `PROPOSED` categorised list is a parallel, non-blocking workstream for Production/Maintenance |
| 5 | Suppliers | Ready now, but effortful | UOMs (for any weight fields on the supplier record itself — none required) | Requires the reconciliation pass in §6 above before it is *trustworthy*, not before it technically exists. Do not let reconciliation stall Phase 1 — seed provisional rows, correct as the mapping firms up |
| 6 | Customers | Ready now | — | Low volume; no blocking dependency |
| 7 | Materials | Ready now, in parallel with Suppliers | Suppliers (soft — `materials.supplier` FK may be left null if the supplier match is still pending), UOMs | Can proceed even if a handful of `supplier` links are temporarily null |
| 8 | Products | Ready now, with a caveat | — | `product_family` (`J`/`K`/`W`) is `not null` in the schema, yet the paper evidence (F9's Needle/Jacquard/Crochet construction list) does not map cleanly onto it for every product — this is a **per-row data-quality task**, not itself one of the seven schema-changing BLOCKING items, but it must be resolved product-by-product before each row is finalised |
| 9 | **Shifts** | **`BLOCKED`** | **NC-10** | Cannot be seeded as authoritative master data — what `A`/`N`/`Z` denote and how they map to F5's Day/Night suffix is unresolved. See `05-database-schema.md` §c |
| 10 | Operators | Partially blocked | Shifts (NC-10) for `default_shift_id`; NC-21 for `employee_id_external` | The name-splitting cleansing pass (Ahmed / Awias / Bahadue / Hamza) can start immediately; the shift-linkage field cannot be completed until item 9 above closes |
| 11 | **Machines** | **`BLOCKED`** | **NC-02, NC-03** (and, for full confidence, NC-07) | **The machine master cannot be completed until the legacy-machine-number question closes.** `machine_group`, `machine_name` and other non-legacy fields may be entered ahead of time, but `legacy_machine_no` — the field that makes the master usable against IC-FM-01 history — must wait. NC-07 (whether `STRIP`/needle-taar configuration is a machine or product attribute) further affects which columns on this master are even the right ones to fill; if NC-07 resolves toward "product attribute," this template's `needle_taar_configuration` cell moves to the Products master instead |
| 12 | Product Routes | Ready once Products (item 8) and Machine Groups (item 3) are stable | Products, Machine Groups, Process Steps | Configured once by Production Manager during Phase 2 setup, per `10-migration-plan.md` — not a Phase 1 gating item, but cannot start meaningfully before product families are settled |

**Phase 1 entry criteria, restated against this sequence:** `10-migration-plan.md` §1 lists "core masters
(Machines, Products, Materials, Shifts, Operators, Customers, Suppliers) populated" as a Phase 1 entry
criterion. **NC-02, NC-03 and NC-10 are now RESOLVED** ([`11-needs-confirmation.md`](11-needs-confirmation.md)),
so Machines and Shifts are no longer schema-blocked — Phase 1 coding may proceed. One residual,
non-blocking item still gates *real* Machines data specifically: **NC-28**, which 6 of the 17 confirmed
`legacy_machine_no` values are the warp-knitting units (and what the other 11 are). The `machines`
master cannot be populated with real rows until NC-28 is answered, even though the schema itself no
longer depends on it — treat NC-28 as the practical critical path for this master, alongside NC-26
(shift clock start/end times) for `shifts`.

---

## Part D — Data quality rules

1. **One canonical spelling per supplier — always.** Every legacy string (`"Z&Z Packages"`, `"Z&Z"`,
   `"World Flex Thialand"` [sic], `"Fintex"`, `"Gatron"`) must map to exactly one `supplier_code`; store
   the legacy spellings as searchable aliases in `notes`, never as a second supplier row. `"China"` (F3)
   is a country, not a supplier, and must never be migrated as a `supplier_name`.

2. **Operator + shift must always be split, never stored concatenated.** F5's `NAME` column
   (`"Ahmed Day"`, `"Awias Day"`, `"Bahadue Night"`, `"Hamza Day"`) is a legacy artefact of a single
   free-text Excel cell doing two jobs. The digital model always carries `operator_id` and `shift_id` as
   two separate foreign keys; no screen, report, or migrated row should ever reconstruct or store the
   concatenated string as a field value.

3. **`g_per_meter` is the one canonical weight-per-metre field. `meters_per_kg` is always `DERIVED`,
   never keyed.** The same rule applies to `width_mm` (canonical, keyed) versus `width_inch`
   (`DERIVED`, never keyed) — see the worked proof in `05-database-schema.md` §c. A user-facing screen
   may *display* an inch or per-kg figure for convenience, but the value must always be computed from
   the canonical field at read time, never captured as an independent input that could drift out of sync.

4. **No free text where a master exists.** Machine name, product description, material description and
   supplier name must always be **selected** from their respective master on a transaction screen, never
   re-typed. This is the direct, structural fix for the exact failure mode evidenced in this file: F2 and
   F3, covering the identical physical receiving events for the identical month, produced five different
   spellings of what is at most a handful of real suppliers, purely because each sheet re-typed the name
   by hand instead of picking it from a list.

---

## Cross-references

- [`05-database-schema.md`](05-database-schema.md) — the authoritative column lists used throughout Part B
- [`11-needs-confirmation.md`](11-needs-confirmation.md) — NC-02, NC-03, NC-07, NC-10, NC-13, NC-15,
  NC-17, NC-18, NC-21 all bear directly on one or more masters in this file
- [`10-migration-plan.md`](10-migration-plan.md) §0–§1 — the readiness gate and Phase 1 entry criteria
  this file's Part C is built against
- [`06-user-roles.md`](06-user-roles.md) — the role definitions behind every Owner cell in Part A
- [`15-form-retirement-matrix.md`](15-form-retirement-matrix.md) — when the source forms behind these
  masters may themselves stop being used
