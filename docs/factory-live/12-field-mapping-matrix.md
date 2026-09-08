# 12 — Field Mapping Matrix

Every legacy field from F1–F9, resolved through the same 15 columns, into the canonical digital
schema. Table, module, screen and route names are exactly as defined in the approved plan — no
alternate names are introduced here. `Y`/`N` is used for the four yes/no columns. See
[03-field-extraction.md](03-field-extraction.md) for the source values these rows are built from,
and [00-README.md](00-README.md) for the status legend.

**Data Source** values used below: `MANUAL`, `CALCULATED`, `DERIVED`, `QUICKBOOKS`. (`STUDIO`,
`IOT_SENSOR`, `PLC` are not used by any *legacy* field in this matrix — they apply only to fields
that do not yet exist on paper; see the Notes column for where a future `PLC`/`IOT_SENSOR` path is
flagged for a currently-manual field.)

No legacy field is dropped without an explicit reason stated in its Notes cell.

---

## F1 — Elastic Costing / Construction Sheet → M2 Product & Costing

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | Sheet title (`6 TAR SINGLE 38 RUBBER 500/1000 MTR`) | `6 TAR SINGLE 38 RUBBER 500/1000 MTR` | Product identity for the costing sheet | Master | M12 Administration & Master Data | products | description | /factory/masters/products | MANUAL | Y | Y | N | N | Encoded construction string; family fields (Taar/Rubber/roll length) split out separately below |
| F1 | Machine reference `MCH 13` | MCH 13 | Legacy machine associated with this costing | Master | M12 Administration & Master Data | machines | legacy_machine_no | /factory/masters/machines | MANUAL | Y | N | N | N | Kept as a separate `legacy_machine_no` field, distinct from `machine_id` — mapping to the 6 × 24-needle WKM machines is BLOCKING, see [11-needs-confirmation.md](11-needs-confirmation.md) |
| F1 | Elastic wt Gr (composition, 5.97) | 5.97 | Canonical elastic weight per metre (grams) | Master | M2 Product & Costing | products | g_per_meter | /factory/masters/products | MANUAL | Y | Y | N | N | Canonical field per the product master spec; the totals-block figure (5.96) below reconciles to this one value, eliminating the paper's two-cell rounding gap |
| F1 | — % (composition, 100%) | 100% | Composition baseline | Derived | M2 Product & Costing | product_costings | elastic_pct | /factory/costing | CALCULATED | N | N | Y | N | Always 100% by definition; not stored as an independent input |
| F1 | Order Quantity (column heading, blank) | *(blank)* | Quantity for the order tied to this costing | Transaction | M1 Order Booking | order_items | quantity_meters | /factory/order/:orderId | MANUAL | Y | N | N | N | Blank in the sample; linkage from a costing sheet to a specific order is `NEW per §11` (Studio handoff design) where absent today |
| F1 | Rubber Gr | 2.91 | Grams of rubber per metre | Master | M2 Product & Costing | product_costings | rubber_g_per_mtr | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | Rubber Gr % | 49% | Rubber share of total weight | Derived | M2 Product & Costing | product_costings | rubber_pct | /factory/costing | CALCULATED | N | N | Y | N | `rubber_g_per_mtr / g_per_meter` |
| F1 | 150/0 Gr | 1.16 | Grams of 150-denier yarn per metre | Master | M2 Product & Costing | product_costings | yarn_150d_g_per_mtr | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | 150/0 Gr % | 19% | Share of total weight | Derived | M2 Product & Costing | product_costings | yarn_150d_pct | /factory/costing | CALCULATED | N | N | Y | N | |
| F1 | 300/0 Gr | 1.89 | Grams of 300-denier yarn per metre | Master | M2 Product & Costing | product_costings | yarn_300d_g_per_mtr | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | 300/0 Gr % | 32% | Share of total weight | Derived | M2 Product & Costing | product_costings | yarn_300d_pct | /factory/costing | CALCULATED | N | N | Y | N | |
| F1 | Total Rubber % | 2.91 / 49% | Totals-block restatement | Derived | M2 Product & Costing | product_costings | total_rubber_pct | /factory/costing | CALCULATED | N | N | Y | N | Same value as row-level `rubber_pct`; paper repeats it, digital computes once |
| F1 | Total Yarn % | 3.05 / 51% | Totals-block restatement | Derived | M2 Product & Costing | product_costings | total_yarn_pct | /factory/costing | CALCULATED | N | N | Y | N | `yarn_150d_pct + yarn_300d_pct` |
| F1 | Elastic wt Gr (totals, 5.96) | 5.96 | Totals-block restatement of `g_per_meter` | Derived | M2 Product & Costing | products | g_per_meter | /factory/masters/products | CALCULATED | N | N | Y | N | Collapses onto the single canonical `g_per_meter` field above; paper's two slightly different figures (5.97 vs 5.96) become one stored value |
| F1 | Yarn Price — Per Lbs | 250 | Yarn price per pound | Master | M2 Product & Costing | product_costings | yarn_price_per_lb | /factory/costing | MANUAL | Y | N | N | N | |
| F1 | Yarn Price — Per Kg | 550 | Yarn price per kilogram | Master | M2 Product & Costing | product_costings | yarn_price_per_kg | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | Yarn Price — Per Mtr | 1.68 | Yarn cost per metre | Derived | M2 Product & Costing | product_costings | yarn_cost_per_mtr | /factory/costing | CALCULATED | N | N | Y | N | `yarn_150d_g_per_mtr+yarn_300d_g_per_mtr) × yarn_price_per_kg / 1000` |
| F1 | Rubber — Per Lbs | 680 | Rubber price per pound | Master | M2 Product & Costing | product_costings | rubber_price_per_lb | /factory/costing | MANUAL | Y | N | N | N | |
| F1 | Rubber — Per Kg | 1500 | Rubber price per kilogram | Master | M2 Product & Costing | product_costings | rubber_price_per_kg | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | Rubber — Per Mtr | 4.37 | Rubber cost per metre | Derived | M2 Product & Costing | product_costings | rubber_cost_per_mtr | /factory/costing | CALCULATED | N | N | Y | N | `rubber_g_per_mtr × rubber_price_per_kg / 1000` |
| F1 | Over Head — Per Kg | 2500 | Overhead rate per kilogram | Master | M2 Product & Costing | product_costings | overhead_rate_per_kg | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | Over Head — Per Mtr | 14.93 | Overhead cost per metre | Derived | M2 Product & Costing | product_costings | overhead_cost_per_mtr | /factory/costing | CALCULATED | N | N | Y | N | `g_per_meter × overhead_rate_per_kg / 1000` |
| F1 | Total — Per Kg (439) | 439 | Printed figure that does not reconcile | Derived | M2 Product & Costing | product_costings | total_per_kg_legacy | /factory/costing | MANUAL | Y | N | N | N | Preserved as a legacy reference value, not recomputed — formula unknown, `NEEDS CONFIRMATION` |
| F1 | Total — Per Mtr | 20.97 | Cost subtotal before wastage | Derived | M2 Product & Costing | product_costings | subtotal_cost_per_mtr | /factory/costing | CALCULATED | N | N | Y | N | `yarn_cost_per_mtr + rubber_cost_per_mtr + overhead_cost_per_mtr` |
| F1 | Wastage — Per Lbs | 2% | Wastage allowance rate | Master | M2 Product & Costing | product_costings | wastage_pct | /factory/costing | MANUAL | Y | Y | N | N | |
| F1 | Wastage — Per Mtr | 0.42 | Wastage cost per metre | Derived | M2 Product & Costing | product_costings | wastage_cost_per_mtr | /factory/costing | CALCULATED | N | N | Y | N | `wastage_pct × subtotal_cost_per_mtr` |
| F1 | Total per Mtr Cost | 21.39 | Final cost per metre | Derived | M2 Product & Costing | product_costings | total_cost_per_mtr | /factory/costing | CALCULATED | N | N | Y | N | `subtotal_cost_per_mtr + wastage_cost_per_mtr` |
| F1 | Meter In Per Kg | 168 | Metres per kilogram | Derived | M2 Product & Costing | uom_conversions | meters_per_kg | /factory/masters/uoms | CALCULATED | N | N | Y | N | `1000 / g_per_meter`, computed via the UOM conversion layer, never re-keyed |
| F1 | Amount In Per Kg | 3,582 | Cost per kilogram | Derived | M2 Product & Costing | product_costings | amount_per_kg | /factory/costing | CALCULATED | N | N | Y | N | `total_cost_per_mtr × meters_per_kg`; small variance vs printed figure due to unrounded paper inputs — preserved as observed, not corrected |

**F1 legacy field count: 29. All 29 accounted for.**

---

## F2 — Goods Receiving Entry Sheet → M4 Goods Receiving

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F2 | Serial # | 2 | Sequential entry number per vehicle arrival | Transaction | M4 Goods Receiving | grns | serial_no_legacy | /factory/grn | MANUAL | Y | N | N | N | Preserved as a legacy reference alongside the new `grn_number` (see §"Fields added" in [03-field-extraction.md](03-field-extraction.md)) |
| F2 | DATE | 03/06/2025 | Date goods received | Transaction | M4 Goods Receiving | grns | received_date | /factory/grn | MANUAL | Y | Y | N | N | |
| F2 | Time | `-` / `1:00` | Time goods received | Transaction | M4 Goods Receiving | grns | received_time | /factory/grn | MANUAL | Y | N | N | N | Inconsistently populated on paper; kept optional |
| F2 | Supplier | Z&Z Packages | Supplier name | Master | M12 Administration & Master Data | suppliers | supplier_name | /factory/masters/suppliers | MANUAL | Y | Y | N | N | Looked up/created from the supplier master when a GRN is entered |
| F2 | Driver Name | Ramzan | Driver's name | Transaction | M4 Goods Receiving | grns | driver_name | /factory/grn | MANUAL | Y | N | N | N | |
| F2 | `Vechile #` *(sic)* | JW-2172 | Vehicle registration number | Transaction | M4 Goods Receiving | grns | vehicle_number | /factory/grn | MANUAL | Y | N | N | N | Legacy misspelling not carried into the column name; the source spelling is preserved verbatim only in this pack's documentation |
| F2 | Article | Rubber Fintex(32) | Material/article received | Master | M12 Administration & Master Data | materials | description | /factory/masters/materials | MANUAL | Y | Y | N | N | Looked up/created from the materials master |
| F2 | QTY | 43 | Quantity of the article | Transaction | M4 Goods Receiving | grn_lines | quantity | /factory/grn | MANUAL | Y | Y | N | N | Unit resolved via the article's UOM, not assumed |
| F2 | Total Weight | 1075 Kg | Total weight received | Transaction | M4 Goods Receiving | grn_lines | total_weight_kg | /factory/grn | MANUAL | Y | N | N | N | |
| F2 | Per Cone Wt | 25 | Weight per cone/unit | Transaction | M4 Goods Receiving | grn_lines | weight_per_unit | /factory/grn | MANUAL | Y | N | N | N | |
| F2 | Remarks | Rcvd From Z&Z | Free note | Transaction | M4 Goods Receiving | grn_lines | remarks | /factory/grn | MANUAL | Y | N | N | N | |

**F2 legacy field count: 11. All 11 accounted for.** (The seven `NEW per §7` fields — `grn_number`,
`supplier_lot`, `internal_lot`, `po_reference`, `quickbooks_po_reference`, `received_by`,
`checked_by` — are additions, not legacy fields, and are catalogued in
[03-field-extraction.md](03-field-extraction.md) §"Fields added in the digital system", not
repeated here.)

---

## F3 — Monthly Goods Receiving Summary → M5 Stock & Lots (derived, no data-entry screen)

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F3 | Serial # | 1 | Row sequence | Metadata | M5 Stock & Lots | grn_lines | *(row order, not stored)* | /factory/stock/daily-report | DERIVED | N | N | Y | N | Purely presentational in a generated report |
| F3 | Article # | Rubber | Material category | Master | M12 Administration & Master Data | materials | material_category | /factory/masters/materials | MANUAL | Y | Y | N | N | Same master field as F2 `Article`, grouped by category for the summary |
| F3 | Count | 32 / `300 Danier` / `Empty Metal Free` | Material sub-type or specification | Master | M12 Administration & Master Data | materials | specification | /factory/masters/materials | MANUAL | Y | Y | N | N | `300 Danier` spelling preserved in source documentation only |
| F3 | Supplier | Fintex / `World Flex Thialand` | Supplier name | Master | M12 Administration & Master Data | suppliers | supplier_name | /factory/masters/suppliers | MANUAL | Y | Y | N | N | Abbreviated supplier names on F3 resolve to the same `suppliers` row as the full name on F2 |
| F3 | Rcvd | 167 | Monthly received total for the article | Derived | M5 Stock & Lots | grn_lines | *(SUM(quantity) grouped by material + month)* | /factory/stock/daily-report | DERIVED | N | N | Y | N | Generated by query over `grn_lines`, verified exact match against source detail — see [02-form-inventory.md](02-form-inventory.md) §5. Never a keyed field in the digital system |

**F3 legacy field count: 5. All 5 accounted for** — as a query over `grn_lines`, with no dedicated
data-entry screen (this is the point: F3 is retired as an input, not replaced field-for-field).

---

## F4 — Daily Stock Report → M5 Stock & Lots

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F4 | Date:- | 23/06/2025 | Report date | Transaction | M5 Stock & Lots | stock_ledger | transaction_date | /factory/stock/daily-report | DERIVED | N | N | Y | N | Report is a date-filtered query, not a saved sheet |
| F4 | S. # | 4 | Row sequence | Metadata | M5 Stock & Lots | *(display order, not stored)* | — | /factory/stock/daily-report | DERIVED | N | N | Y | N | |
| F4 | ITEM NAME | `6 Taar Double 32 R 500 M` | Encoded product identity | Master | M12 Administration & Master Data | products | description | /factory/masters/products | MANUAL | Y | Y | N | N | Same master field referenced by F1, F5 `Column2`, F8 `Product Name` |
| F4 | OPENING STOCK | 299 | Stock at start of day | Transaction | M5 Stock & Lots | stock_ledger | *(prior day closing balance, queried)* | /factory/stock/daily-report | DERIVED | N | N | Y | N | Computed as the running balance carried from the prior ledger entry, not re-keyed each day |
| F4 | PRODUCTION | 68 | Quantity produced that day | Transaction | M5 Stock & Lots | stock_ledger | quantity (movement_type = PRODUCTION) | /factory/stock/daily-report | DERIVED | N | N | Y | N | Aggregated from `production_entries` postings to the ledger |
| F4 | DISPATCH | 0 | Quantity dispatched that day | Transaction | M5 Stock & Lots | stock_ledger | quantity (movement_type = DISPATCH) | /factory/stock/daily-report | DERIVED | N | N | Y | N | Aggregated from `dispatches` postings to the ledger |
| F4 | BALANCE | 367 | Running stock balance | Derived | M5 Stock & Lots | stock_ledger | running_balance | /factory/stock/daily-report | CALCULATED | N | N | Y | N | `OPENING + PRODUCTION − DISPATCH`, verified formula |
| F4 | REMARKS | *(blank)* | Free note | Metadata | M5 Stock & Lots | stock_ledger | remarks | /factory/stock/daily-report | MANUAL | Y | N | N | N | |
| F4 | Footer: `Day ( A & N )` | 0 | Day-shift production subtotal | Derived | M6 Production & Factory Live | production_entries | *(SUM by shift group)* | /factory/production/daily-report | CALCULATED | N | N | Y | N | Shift-letter grouping (`A`/`N`) mapping is `NEEDS CONFIRMATION` — see [03-field-extraction.md](03-field-extraction.md) §"Shift evidence"; column preserved pending that answer |
| F4 | Footer: `Night ( N & Z )` | 68 | Night-shift production subtotal | Derived | M6 Production & Factory Live | production_entries | *(SUM by shift group)* | /factory/production/daily-report | CALCULATED | N | N | Y | N | Same shift-mapping caveat as above |
| F4 | Footer: `Total` | 68 | Day + night total | Derived | M6 Production & Factory Live | production_entries | *(SUM total)* | /factory/production/daily-report | CALCULATED | N | N | Y | N | |
| F4 | Signature: Chief Financial officer | *(signed)* | Approving signatory | Approval | M5 Stock & Lots | audit_log | user_id / role / action=APPROVE | /factory/stock/daily-report | MANUAL | N | Y | N | Y | Captured as an approval event, not a stored signature image |
| F4 | Signature: Bilal | *(signed)* | Named signatory | Approval | M5 Stock & Lots | audit_log | user_id / role / action=APPROVE | /factory/stock/daily-report | MANUAL | N | N | N | Y | Named individual resolves to a `factory_user_roles` entry once roles are confirmed |
| F4 | Signature: Haroon | *(signed)* | Named signatory | Approval | M5 Stock & Lots | audit_log | user_id / role / action=APPROVE | /factory/stock/daily-report | MANUAL | N | N | N | Y | Same as above |

**F4 legacy field count: 14. All 14 accounted for.**

---

## F5 — Daily Production Report (`IC-FM-01`) → M6 Production & Factory Live

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F5 | DOCUMENT # | IC-FM-01 | Controlled-form document number | Metadata | M6 Production & Factory Live | — | — | /factory/production/entry | MANUAL | N | N | N | N | No dedicated column — preserved as a static legacy document reference on the screen, per [02-form-inventory.md](02-form-inventory.md) §4, not as transactional data |
| F5 | ISSUE # | 01 | Document issue number | Metadata | M6 Production & Factory Live | — | — | /factory/production/entry | MANUAL | N | N | N | N | Same treatment as DOCUMENT # above |
| F5 | ISSUE DATE | 01/03/2024 | Document issue date | Metadata | M6 Production & Factory Live | — | — | /factory/production/entry | MANUAL | N | N | N | N | Same treatment |
| F5 | Rev | 00 | Document revision | Metadata | M6 Production & Factory Live | — | — | /factory/production/entry | MANUAL | N | N | N | N | Same treatment |
| F5 | Date : | 21-June-2025 | Production report date | Transaction | M6 Production & Factory Live | production_entries | production_date | /factory/production/entry | MANUAL | Y | Y | N | N | |
| F5 | NAME | `Awias Day` | Operator + shift, concatenated | Master/Transaction | M12 Administration & Master Data | operators / shifts | operator_id / shift_id | /factory/masters/operators, /factory/masters/shifts | MANUAL | Y | Y | N | N | Splits into two foreign keys on `production_entries`; free-text concatenation retired |
| F5 | Column2 | `6 Taar Double` | Article/product description | Master | M12 Administration & Master Data | products | description | /factory/masters/products | MANUAL | Y | Y | N | N | `INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION` on meaning (see [03-field-extraction.md](03-field-extraction.md)); mapped here on the strength of matching F4/F9 vocabulary, but flagged for review |
| F5 | MACH NO | 8 | Machine number | Master | M12 Administration & Master Data | machines | legacy_machine_no | /factory/masters/machines | MANUAL | Y | Y | N | N | Same BLOCKING mapping question as F1's `MCH 13` |
| F5 | Taar | 6 | Ends/tapes per unit (apparent) | Master | M6 Production & Factory Live | production_entries | taar_raw | /factory/production/entry | MANUAL | Y | N | N | N | Captured at the transaction grain pending confirmation of whether this is a product or machine attribute — `NEEDS CONFIRMATION` |
| F5 | SHIFT TIME | `12 hours` | Shift duration | Master | M12 Administration & Master Data | shifts | *(cross-checked against shift start/end)* | /factory/masters/shifts | MANUAL | Y | N | N | N | Shift mapping itself `NEEDS CONFIRMATION`; no shift time is hardcoded in the schema |
| F5 | RUBBER | 32 | Rubber count/denier code | Master | M12 Administration & Master Data | products | rubber_count | /factory/masters/products | MANUAL | Y | Y | N | N | |
| F5 | machine speed | 400 | Machine running speed | Master | M6 Production & Factory Live | production_entries | machine_speed_raw | /factory/production/entry | MANUAL | Y | N | N | N | Unit unknown — `NEEDS CONFIRMATION`. Future: `PLC`/`IOT_SENSOR` once machine telemetry exists |
| F5 | PLY | 600 | Ply parameter | Master | M6 Production & Factory Live | production_entries | ply_raw | /factory/production/entry | MANUAL | Y | N | N | N | Meaning/unit unknown — `NEEDS CONFIRMATION` |
| F5 | GAUGE | 15 / 12 | Gauge parameter | Master | M6 Production & Factory Live | production_entries | gauge_raw | /factory/production/entry | MANUAL | Y | N | N | N | Meaning/unit unknown — `NEEDS CONFIRMATION` |
| F5 | STRIP | 40 | Parallel tapes per machine (apparent) | Master | M6 Production & Factory Live | production_entries | strip_raw | /factory/production/entry | MANUAL | Y | N | N | N | Machine-vs-article attribute question `NEEDS CONFIRMATION` |
| F5 | G.WT/MTR | 5.6 | Gross weight per metre | Master | M2 Product & Costing | products | g_per_meter | /factory/masters/products | MANUAL | Y | Y | N | N | Same canonical field as F1's `Elastic wt Gr` and F9's derived weight-per-metre |
| F5 | Column1 | 1.4 | Kilograms per strip (inferred) | Derived | M6 Production & Factory Live | production_entries | kg_per_strip | /factory/production/entry | CALCULATED | N | N | Y | N | `INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION`; reconciles exactly (`PER MACHINE KG = Column1 × STRIP`) across the sample |
| F5 | TOTAL METER PER STRIP | 280 | Metres per strip | Transaction | M6 Production & Factory Live | production_entries | meters_per_strip | /factory/production/entry | MANUAL | Y | Y | N | N | |
| F5 | PER MACHINE KG | 56.00 | Weight produced per machine | Derived | M6 Production & Factory Live | production_entries | machine_kg | /factory/production/entry | CALCULATED | N | N | Y | N | `kg_per_strip × strip_raw`, arithmetic verified |
| F5 | TOTAL METER | 11,200 | Total metres produced | Derived | M6 Production & Factory Live | production_entries | actual_quantity | /factory/production/entry | CALCULATED | N | N | Y | N | `meters_per_strip × strip_raw`, arithmetic verified; feeds the `NEW per §16` `actual_quantity` field |
| F5 | WASTAGE | *(empty)* | Wastage quantity | Transaction | M6 Production & Factory Live | production_entries | wastage_quantity | /factory/production/entry | MANUAL | Y | N | N | N | Empty on every observed row — whether recorded in practice is `NEEDS CONFIRMATION`; field kept, not dropped |
| F5 | REMARKS | `Machine Fault Baring` | Free note, doubling as downtime log | Metadata/Transaction | M6 Production & Factory Live | downtime_events | downtime_reason_id / notes | /factory/production/entry | MANUAL | Y | N | N | N | Structured replacement: free text becomes a `downtime_reasons` lookup plus optional free-text note — see [03-field-extraction.md](03-field-extraction.md) §"Downtime reason seed list" |
| F5 | PR STRIP AMOUNT | 406 | Possible piece-rate wage amount | Transaction | M6 Production & Factory Live | production_entries | pr_strip_amount_raw | /factory/production/entry | MANUAL | Y | N | N | N | Meaning unknown, possible payroll implication — `NEEDS CONFIRMATION`; not wired into any payroll table until confirmed |
| F5 | TOTAL (subtotal row per NAME group) | e.g. `TOT M/STRIP=1320`, `PER MACH KG=257.10`, `TOTAL METER=51,420` | Per-operator, per-shift subtotal | Derived | M6 Production & Factory Live | production_entries | *(aggregate query, not stored)* | /factory/production/daily-report | DERIVED | N | N | Y | N | Reproduced as a live aggregate, not a separately keyed row |
| F5 | Prepared By | *(signed)* | Preparer | Approval | M6 Production & Factory Live | audit_log | user_id / role / action=PREPARE | /factory/production/daily-report | MANUAL | N | Y | N | Y | |
| F5 | Reviewed By | *(signed)* | Reviewer | Approval | M6 Production & Factory Live | audit_log | user_id / role / action=REVIEW | /factory/production/daily-report | MANUAL | N | Y | N | Y | |

**F5 legacy field count: 26. All 26 accounted for.**

---

## F6 — Gate Pass (`IC-FM-02`) → M9 Dispatch & Gate Pass

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F6 | DOCUMENT # | IC-FM-02 | Controlled-form document number | Metadata | M9 Dispatch & Gate Pass | — | — | /factory/gate-pass | MANUAL | N | N | N | N | Legacy reference on screen, not a stored column — see [02-form-inventory.md](02-form-inventory.md) §4 |
| F6 | ISSUE # | 01 | Document issue number | Metadata | M9 Dispatch & Gate Pass | — | — | /factory/gate-pass | MANUAL | N | N | N | N | Same treatment |
| F6 | ISSUE DATE | 01-03-2024 | Document issue date | Metadata | M9 Dispatch & Gate Pass | — | — | /factory/gate-pass | MANUAL | N | N | N | N | Same treatment |
| F6 | Rev | 00 | Document revision | Metadata | M9 Dispatch & Gate Pass | — | — | /factory/gate-pass | MANUAL | N | N | N | N | Same treatment |
| F6 | Returnable *(checkbox)* | *(blank)* | Movement type flag | Transaction | M9 Dispatch & Gate Pass | gate_passes | movement_type | /factory/gate-pass | MANUAL | Y | Y | N | N | `Returnable`/`Non Returnable` become one enumerated column |
| F6 | Non Returnable *(checkbox)* | *(blank)* | Movement type flag | Transaction | M9 Dispatch & Gate Pass | gate_passes | movement_type | /factory/gate-pass | MANUAL | Y | Y | N | N | Same column as above — the two checkboxes are mutually exclusive states of one field |
| F6 | Serial No. | *(blank)* | Gate pass serial number | Transaction | M9 Dispatch & Gate Pass | gate_passes | gate_pass_number | /factory/gate-pass | MANUAL | N | Y | Y | N | System-generated sequence replaces manual numbering |
| F6 | Company Name : | *(blank)* | Receiving/sending company | Master | M12 Administration & Master Data | customers / suppliers | company_name | /factory/masters/customers, /factory/masters/suppliers | MANUAL | Y | Y | N | N | Resolves to whichever master applies to the movement direction |
| F6 | Address : | *(blank)* | Company address | Master | M12 Administration & Master Data | customers / suppliers | address | /factory/masters/customers, /factory/masters/suppliers | MANUAL | Y | N | N | N | |
| F6 | Date: | *(blank)* | Gate pass date | Transaction | M9 Dispatch & Gate Pass | gate_passes | gate_pass_date | /factory/gate-pass | MANUAL | Y | Y | N | N | |
| F6 | Time | *(blank)* | Gate pass time | Transaction | M9 Dispatch & Gate Pass | gate_passes | gate_pass_time | /factory/gate-pass | MANUAL | Y | N | N | N | |
| F6 | Person Name: | *(blank)* | Person named on the pass | Transaction | M9 Dispatch & Gate Pass | gate_passes | person_name | /factory/gate-pass | MANUAL | Y | N | N | N | |
| F6 | Vehicle No | *(blank)* | Vehicle registration | Transaction | M9 Dispatch & Gate Pass | gate_passes | vehicle_number | /factory/gate-pass | MANUAL | Y | N | N | N | |
| F6 | Dispatcher : | *(blank)* | Dispatching staff member | Transaction | M9 Dispatch & Gate Pass | gate_passes | dispatcher_user_id | /factory/gate-pass | MANUAL | Y | Y | N | N | Resolves to a `factory_user_roles` user rather than free text |
| F6 | Reason : | *(blank)* | Reason for the pass | Transaction | M9 Dispatch & Gate Pass | gate_passes | reason | /factory/gate-pass | MANUAL | Y | Y | N | N | |
| F6 | S.NO *(line)* | *(blank)* | Line sequence | Transaction | M9 Dispatch & Gate Pass | gate_pass_lines | line_no | /factory/gate-pass | MANUAL | N | Y | Y | N | System-generated |
| F6 | DESCRIPTION *(line)* | *(blank)* | Item description | Transaction | M9 Dispatch & Gate Pass | gate_pass_lines | description | /factory/gate-pass | MANUAL | Y | Y | N | N | |
| F6 | QTY *(line)* | *(blank)* | Quantity | Transaction | M9 Dispatch & Gate Pass | gate_pass_lines | quantity | /factory/gate-pass | MANUAL | Y | Y | N | N | |
| F6 | Prepared By: | *(blank)* | Preparer | Approval | M9 Dispatch & Gate Pass | audit_log | user_id / role / action=PREPARE | /factory/gate-pass | MANUAL | N | Y | N | Y | |
| F6 | Receiver: | *(blank)* | Receiving party | Approval | M9 Dispatch & Gate Pass | gate_passes | receiver_name | /factory/gate-pass | MANUAL | Y | Y | N | Y | External party — captured as a name, not a system user |
| F6 | Authorized Signature: | *(blank)* | Authorising signatory | Approval | M9 Dispatch & Gate Pass | audit_log | user_id / role / action=AUTHORIZE | /factory/gate-pass | MANUAL | N | Y | N | Y | |

**F6 legacy field count: 21. All 21 accounted for.**

---

## F7 — Purchase Request (`IC-FM-04`) → M3 Purchase Request

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F7 | DOCUMENT # | IC-FM-04 | Controlled-form document number | Metadata | M3 Purchase Request | — | — | /factory/purchase-requests | MANUAL | N | N | N | N | Legacy reference on screen, not a stored column |
| F7 | ISSUE # | 01 | Document issue number | Metadata | M3 Purchase Request | — | — | /factory/purchase-requests | MANUAL | N | N | N | N | Same treatment |
| F7 | ISSUE DATE | 01-03-2024 | Document issue date | Metadata | M3 Purchase Request | — | — | /factory/purchase-requests | MANUAL | N | N | N | N | Same treatment |
| F7 | Rev | 00 | Document revision | Metadata | M3 Purchase Request | — | — | /factory/purchase-requests | MANUAL | N | N | N | N | Same treatment |
| F7 | Date: | *(blank)* | Request date | Transaction | M3 Purchase Request | purchase_requests | request_date | /factory/purchase-requests | MANUAL | Y | Y | N | N | |
| F7 | Purchase request No: | *(blank)* | PR number | Transaction | M3 Purchase Request | purchase_requests | pr_number | /factory/purchase-requests | MANUAL | N | Y | Y | N | System-generated sequence |
| F7 | S. No. *(line)* | *(blank)* | Line sequence | Transaction | M3 Purchase Request | purchase_request_lines | line_no | /factory/purchase-requests | MANUAL | N | Y | Y | N | System-generated |
| F7 | Item Description *(line)* | *(blank)* | Item requested | Master | M12 Administration & Master Data | materials | description | /factory/masters/materials | MANUAL | Y | Y | N | N | Looked up/created from materials master |
| F7 | Purpose *(line)* | *(blank)* | Purpose of the purchase | Transaction | M3 Purchase Request | purchase_request_lines | purpose | /factory/purchase-requests | MANUAL | Y | N | N | N | |
| F7 | Quantity *(line)* | *(blank)* | Quantity requested | Transaction | M3 Purchase Request | purchase_request_lines | quantity | /factory/purchase-requests | MANUAL | Y | Y | N | N | |
| F7 | Rate *(line)* | *(blank)* | Unit rate | Transaction | M3 Purchase Request | purchase_request_lines | rate | /factory/purchase-requests | MANUAL | Y | N | N | N | |
| F7 | Remarks *(line)* | *(blank)* | Free note | Metadata | M3 Purchase Request | purchase_request_lines | remarks | /factory/purchase-requests | MANUAL | Y | N | N | N | |
| F7 | Prepared By | *(blank)* | Level 1 sign-off | Approval | M3 Purchase Request | purchase_request_approvals | user_id / level=PREPARED | /factory/purchase-requests | MANUAL | N | Y | N | Y | All four approval levels preserved — see [06-user-roles.md](06-user-roles.md) for the authorised role per level |
| F7 | Checked by | *(blank)* | Level 2 sign-off | Approval | M3 Purchase Request | purchase_request_approvals | user_id / level=CHECKED | /factory/purchase-requests | MANUAL | N | Y | N | Y | |
| F7 | Preapproved by | *(blank)* | Level 3 sign-off | Approval | M3 Purchase Request | purchase_request_approvals | user_id / level=PREAPPROVED | /factory/purchase-requests | MANUAL | N | Y | N | Y | |
| F7 | Approved By | *(blank)* | Level 4 sign-off | Approval | M3 Purchase Request | purchase_request_approvals | user_id / level=APPROVED | /factory/purchase-requests | MANUAL | N | Y | N | Y | |

**F7 legacy field count: 16. All 16 accounted for.**

---

## F8 — Stock Register (`IC-FM-05`) → M5 Stock & Lots

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F8 | DOCUMENT # | IC-FM-05 | Controlled-form document number | Metadata | M5 Stock & Lots | — | — | /factory/stock/register/:productId | MANUAL | N | N | N | N | Legacy reference on screen, not a stored column |
| F8 | ISSUE # | 01 | Document issue number | Metadata | M5 Stock & Lots | — | — | /factory/stock/register/:productId | MANUAL | N | N | N | N | Same treatment |
| F8 | ISSUE DATE | 01-03-2024 | Document issue date | Metadata | M5 Stock & Lots | — | — | /factory/stock/register/:productId | MANUAL | N | N | N | N | Same treatment |
| F8 | Rev | 00 | Document revision | Metadata | M5 Stock & Lots | — | — | /factory/stock/register/:productId | MANUAL | N | N | N | N | Same treatment |
| F8 | Product Name: | *(blank)* | Product this register tracks | Master | M12 Administration & Master Data | products | description | /factory/masters/products | MANUAL | Y | Y | N | N | Same master field as F4 `ITEM NAME` |
| F8 | Supplier Name: | *(blank)* | Supplier (raw-material scope implied) | Master | M12 Administration & Master Data | suppliers | supplier_name | /factory/masters/suppliers | MANUAL | Y | N | N | N | Whether F8 is raw-material-only, finished-goods, or both is `NEEDS CONFIRMATION` — see [02-form-inventory.md](02-form-inventory.md) §5 |
| F8 | Serial No. | *(blank)* | Register serial number | Transaction | M5 Stock & Lots | stock_ledger | register_serial_no | /factory/stock/register/:productId | MANUAL | N | N | Y | N | System-generated |
| F8 | S. No. *(line)* | *(blank)* | Line sequence | Transaction | M5 Stock & Lots | stock_ledger | *(row order)* | /factory/stock/register/:productId | DERIVED | N | N | Y | N | |
| F8 | Date *(line)* | *(blank)* | Movement date | Transaction | M5 Stock & Lots | stock_ledger | transaction_date | /factory/stock/register/:productId | MANUAL | Y | Y | N | N | |
| F8 | Product specification *(line)* | *(blank)* | Product specification detail | Master | M12 Administration & Master Data | products | product_spec | /factory/masters/products | MANUAL | Y | N | N | N | |
| F8 | Opening Stock *(line)* | *(blank)* | Stock at start of period | Transaction | M5 Stock & Lots | stock_ledger | *(prior balance, queried)* | /factory/stock/register/:productId | DERIVED | N | N | Y | N | Same running-balance model as F4 |
| F8 | Production *(line)* | *(blank)* | Quantity produced | Transaction | M5 Stock & Lots | stock_ledger | quantity (movement_type = PRODUCTION) | /factory/stock/register/:productId | DERIVED | N | N | Y | N | |
| F8 | Dispatch *(line)* | *(blank)* | Quantity dispatched | Transaction | M5 Stock & Lots | stock_ledger | quantity (movement_type = DISPATCH) | /factory/stock/register/:productId | DERIVED | N | N | Y | N | |
| F8 | Balance *(line)* | *(blank)* | Running balance | Derived | M5 Stock & Lots | stock_ledger | running_balance | /factory/stock/register/:productId | CALCULATED | N | N | Y | N | Same formula as F4, and the same underlying `stock_ledger` rows — F4 and F8 become two views of one table |
| F8 | Remarks *(line)* | *(blank)* | Free note | Metadata | M5 Stock & Lots | stock_ledger | remarks | /factory/stock/register/:productId | MANUAL | Y | N | N | N | |
| F8 | Prepared By: | *(blank)* | Preparer | Approval | M5 Stock & Lots | audit_log | user_id / role / action=PREPARE | /factory/stock/register/:productId | MANUAL | N | Y | N | Y | |
| F8 | Checked By: | *(blank)* | Checker | Approval | M5 Stock & Lots | audit_log | user_id / role / action=CHECK | /factory/stock/register/:productId | MANUAL | N | Y | N | Y | |

**F8 legacy field count: 17. All 17 accounted for.**

---

## F9 — Elastic Order Booking / Processing Form → M1 Order Booking

| Legacy Form | Legacy Field | Sample Value | Meaning | M/T/D | Digital Module | Table | Column | Screen | Data Source | Edit? | Req? | Der? | Appr? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F9 | Company Name | PAKEEZAH DYEING & BLEACHING | Customer company name | Master | M12 Administration & Master Data | customers | company_name | /factory/masters/customers | MANUAL | Y | Y | N | N | Looked up/created from the customer master when a new order is booked |
| F9 | Address | DP 50/B, Sector 12D, North Karachi Industrial Area Karachi | Customer address | Master | M12 Administration & Master Data | customers | address | /factory/masters/customers | MANUAL | Y | N | N | N | |
| F9 | Contact Person | Mustafa (Merchandiser) | Named contact and role | Master | M12 Administration & Master Data | customers | contact_person | /factory/masters/customers | MANUAL | Y | N | N | N | |
| F9 | Through-Email-Phone-Verbal | info@pakeezah.net | Order channel | Transaction | M1 Order Booking | orders | order_channel | /factory/orders/new | MANUAL | Y | N | N | N | |
| F9 | Phone | 0314-5040874 | Customer phone number | Master | M12 Administration & Master Data | customers | phone | /factory/masters/customers | MANUAL | Y | N | N | N | |
| F9 | Order Date | 03-Apr-2025 | Date order placed | Transaction | M1 Order Booking | orders | order_date | /factory/orders/new | MANUAL | Y | Y | N | N | |
| F9 | Product Description | 13 Tar | Ordered construction description | Transaction | M1 Order Booking | order_items | product_description | /factory/orders/new | MANUAL | Y | Y | N | N | Resolves against `products` where an existing product match exists |
| F9 | Quantity | 55400 Meters | Ordered quantity | Transaction | M1 Order Booking | order_items | quantity_meters | /factory/orders/new | MANUAL | Y | Y | N | N | |
| F9 | Elastic: Needle/Jacquard/Crochet Type | Crochet | Elastic production type | Master | M12 Administration & Master Data | products | elastic_type | /factory/masters/products | MANUAL | Y | Y | N | N | |
| F9 | Width | 1 inch | Product width | Master | M12 Administration & Master Data | products | width_inch | /factory/masters/products | MANUAL | Y | N | N | N | Plan designates `width_inch` as derived once a canonical mm value exists via Studio; captured manually in V1 |
| F9 | Wt of 1000 Mtr | 8.76 Kg | Weight per 1000 metres | Master | M2 Product & Costing | products | g_per_meter | /factory/masters/products | MANUAL | Y | Y | N | N | Same canonical field as F1 `Elastic wt Gr` and F5 `G.WT/MTR`, entered here in a different unit and converted via `uom_conversions` |
| F9 | Mtrs in 1 kg | 114 Meters | Metres per kilogram | Derived | M2 Product & Costing | uom_conversions | meters_per_kg | /factory/masters/uoms | CALCULATED | N | N | Y | N | `1000 / g_per_meter`, verified against the printed 114 |
| F9 | Pull Ratio | 5 to 12 Inches | Elastic pull ratio range | Master | M12 Administration & Master Data | products | pull_ratio | /factory/masters/products | MANUAL | Y | N | N | N | |
| F9 | Rubber | 52 | Rubber count/denier code | Master | M12 Administration & Master Data | products | rubber_count | /factory/masters/products | MANUAL | Y | Y | N | N | Same field family as F5 `RUBBER` |
| F9 | Colour | White | Product colour | Master | M12 Administration & Master Data | products | colour | /factory/masters/products | MANUAL | Y | N | N | N | Collapses with `Color` below into one column, removing the paper form's duplicate |
| F9 | Color | White | Product colour (duplicate of `Colour`) | Master | M12 Administration & Master Data | products | colour | /factory/masters/products | MANUAL | Y | N | N | N | Same column as `Colour` above — the paper form's duplicate field is intentionally not replicated digitally |
| F9 | Poly Thread Weft / Warp | 150 Danier or 300 Danier Poly thread | Weft/warp thread specification | Master | M12 Administration & Master Data | products | poly_thread_spec | /factory/masters/products | MANUAL | Y | N | N | N | `Danier` spelling preserved in source documentation only |
| F9 | Finish: Starch/Starching/Ironing/Soft Finished | Starch | Finishing type | Master | M12 Administration & Master Data | products | finish_type | /factory/masters/products | MANUAL | Y | N | N | N | |
| F9 | Cutting Instructions (if applicable) | N/A | Cutting instructions | Transaction | M1 Order Booking | order_items | cutting_instructions | /factory/orders/new | MANUAL | Y | N | N | N | |
| F9 | Packaging Requirements (if applicable) | N/A | Packaging instructions | Transaction | M8 Packing & Finished Goods | order_items | packaging_requirements | /factory/orders/new | MANUAL | Y | N | N | N | Consumed downstream by packing (M8) |
| F9 | Delivery Required | 10,000 Meters Per Day | Required delivery rate | Transaction | M1 Order Booking | orders | delivery_rate_per_day | /factory/orders/new | MANUAL | Y | N | N | N | |
| F9 | Delivery Committed Date | N/A | Committed delivery date | Transaction | M1 Order Booking | orders | delivery_committed_date | /factory/orders/new | MANUAL | Y | N | N | N | |
| F9 | Special Instructions (if applicable) | N/A | Special instructions | Transaction | M1 Order Booking | orders | special_instructions | /factory/orders/new | MANUAL | Y | N | N | N | |
| F9 | Authorization text | *(signed)* | Confirms accuracy; authorises processing; embeds QC sampling rule | Approval | M1 Order Booking / M7 Quality Control | orders / qc_plan_rules | authorised_by / rule parameters | /factory/orders/new, /factory/masters/qc-rules | MANUAL | N | Y | N | Y | The QC rule text is modelled as configurable `qc_plan_rules` rows, not stored as free text — see [03-field-extraction.md](03-field-extraction.md) §"QC sampling rule extraction" |
| F9 | Physical Sample attached (YES or NO) | *(circled value not stated in evidence)* | Whether a physical sample was attached | Transaction | M7 Quality Control | qc_inspections | physical_sample_attached | /factory/qc | MANUAL | Y | N | N | N | Field exists; which value was circled on the source is `NEEDS CONFIRMATION` |
| F9 | Pg # 1 of 2 / Pg # 2 of 2 | Pg # 1 of 2 / Pg # 2 of 2 | Page identifier | Metadata | — | — | — | — | — | N | N | N | N | No digital equivalent required — a pagination artefact of the two-page paper form; the digital order screen is a single continuous form, not paginated this way |

**F9 legacy field count: 26. All 26 accounted for.**

---

## Coverage check

| Form | Legacy field count | Accounted for |
|---|---|---|
| F1 | 29 | 29 / 29 |
| F2 | 11 | 11 / 11 |
| F3 | 5 | 5 / 5 |
| F4 | 14 | 14 / 14 |
| F5 | 26 | 26 / 26 |
| F6 | 21 | 21 / 21 |
| F7 | 16 | 16 / 16 |
| F8 | 17 | 17 / 17 |
| F9 | 26 | 26 / 26 |
| **Total** | **165** | **165 / 165** |

Every legacy field from every one of the nine forms resolves to a digital table and column, a
generated/derived query, an explicit collapse into a shared field (the F9 `Colour`/`Color`
duplicate), or an explicit "no digital equivalent required" with a stated reason (F9's page-footer
pagination). No field disappears silently. Fields whose *business meaning* is not yet confirmed
(`Column1`, `Column2`, `machine speed`, `PLY`, `GAUGE`, `STRIP`, `Taar`, `PR STRIP AMOUNT`, the
`A`/`N`/`Z` shift codes, F8's raw-material-vs-finished-goods scope) are still given a database home
so no data capture is blocked — but none of those meanings is asserted as settled. See
[11-needs-confirmation.md](11-needs-confirmation.md) for the full open-questions register.

---

Previous: [03-field-extraction.md](03-field-extraction.md). Related:
[05-database-schema.md](05-database-schema.md) for the full schema these tables sit in,
[08-screen-list.md](08-screen-list.md) for the complete screen/route list.
