# 08 — Screen List

**Deliverable H.** Every Factory Live screen, its canonical route, owning module, the paper form it
replaces (or `NEW` where no paper equivalent exists), its primary role, purpose, and key actions.
Routes are reproduced exactly as fixed in the brief — no route in this file has been altered or invented.

Related reading: [`06-user-roles.md`](06-user-roles.md) for what each role may do on these screens,
[`09-factory-live-drilldown.md`](09-factory-live-drilldown.md) for the five drilldown screens in detail,
and [`10-migration-plan.md`](10-migration-plan.md) for the phase definitions referenced in the **Phase**
column.

---

## Navigation shell

Factory Live is a distinct application surface inside IC-website, not an extension of the Design
Studio's admin area:

- It does **not** use the Studio's `AdminChrome` component or its navigation. Factory Live gets its
  **own nav shell** — a process/module-oriented sidebar or top-nav suited to shop-floor and store use,
  not the Studio's design-review-oriented chrome.
- All `/factory/*` routes are **lazy-loaded into their own bundle**, separate from the Studio's bundle,
  so a shop-floor tablet loading `/factory/production/entry` does not pull in Studio design-editor code,
  and vice versa.
- Role-based visibility is applied at the nav-shell level as well as at the route/RLS level: a user only
  sees nav entries for modules their role has at least `View` on (per the matrix in
  [`06-user-roles.md`](06-user-roles.md) §2) — the route guard is the enforcement point, the nav is only
  the presentation of what is already permitted.

---

## Phase key

Phase names match the five phases defined in [`10-migration-plan.md`](10-migration-plan.md): **Phase 1**
Core Digital Transactions, **Phase 2** Factory Live, **Phase 3** Quality & Finishing, **Phase 4**
QuickBooks, **Phase 5** IoT. A small number of screens exist in two forms across phases — a minimal
Phase 1 version needed for the first vertical slice, and a fuller Phase 2+ version — these are marked
**1 → 2**.

---

## M6 — Production & Factory Live

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Factory Overview (Level 1) | `/factory` | `NEW` — aggregates F4/F5 | Production Manager, Viewer | Home screen: the eight process cards with live status counts | Navigate into a process; scan factory-wide alerts | 2 |
| Process Detail (Level 2) | `/factory/process/:slug` | `NEW` | Production Manager | Machine groups within one process (e.g. Fabric Production → Warp Knitting, Jacquard…) | Drill into a machine group | 2 |
| Machine Group Detail (Level 3) | `/factory/group/:groupId` | `NEW` | Supervisor | Machines within one machine group | Drill into a machine | 2 |
| Machine Detail (Level 4) | `/factory/machine/:machineId` | F5 (per-machine row); F1 (`MCH 13` reference) | Operator, Supervisor | Machine status, current order, running history | **1:** assign/confirm machine to an order, change status. **2:** full live counters, KPI cards, downtime history | 1 → 2 |
| Production Order Detail (Level 5a) | `/factory/order/:orderId` | F9 (order booking); F5 (aggregated) | Production Manager | Order detail, status timeline, linked batches | Transition order status; view Order Completion % | 1 |
| Production Batch Detail (Level 5b) | `/factory/batch/:batchId` | F5 rows (grouped by NAME/shift) | Operator, Supervisor | One machine, one shift, one day's entries | View/verify entries; view downtime logged against the batch | 1 |
| Production Entry | `/factory/production/entry` | F5 (**IC-FM-01**) | Operator | Per-shift, per-machine data capture — the digital replacement for the controlled form itself | Enter meter/kg reading, wastage (if any), stop reason & duration, mark article change | **1** — core vertical slice |
| Daily Production Report | `/factory/production/daily-report` | F5 (**IC-FM-01**, printed/reviewed view) | Supervisor, Production Manager | Reviewable roll-up of the day's entries, grouped by operator/shift exactly as the paper form is grouped | Review, Prepared By / Reviewed By sign-off, export/print | **1** |

## M1 — Order Booking

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Order List | `/factory/orders` | F9 (list view) | Production Manager | List of orders handed off from the Studio (`ORDER_CONFIRMED`) plus their factory-side status | Filter by status/customer/product; open an order | **1** |
| New Order Intake | `/factory/orders/new` | F9 (manual booking fallback) | Production Manager | Manually create a production order **not** driven by a Studio handoff (rework, sample runs, legacy carry-over) | Create order, attach product/customer, set quantity | 2 |

## M4 — Goods Receiving

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Goods Receiving (GRN) | `/factory/grn` | F2 (Goods Receiving Entry Sheet) | Store | One vehicle arrival = one header + many article lines, mirroring F2's structure exactly | Create GRN header, add article lines, post to stock ledger | **1** |

## M5 — Stock & Lots

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Stock Overview / Ledger | `/factory/stock` | F3 (now **generated**, never keyed) + F4 (all-item view) | Store | Live stock ledger, all-item snapshot | Filter by item / ownership / stock category; drill to a product's register | **1** |
| Stock Register (per product) | `/factory/stock/register/:productId` | F8 (**IC-FM-05**) | Store | Per-product running card — Opening / Production / Dispatch / Balance | View history; print register; Prepared By / Checked By sign-off | **1** |
| Daily Stock Report | `/factory/stock/daily-report` | F4 (Daily Stock Report, all items) | Store, Accounts | All-item daily snapshot, generated from the ledger, reproducing F4's Day/Night shift-split footer | View, export, sign-off | **1** |

## M3 — Purchase Request

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Purchase Requests | `/factory/purchase-requests` | F7 (**IC-FM-04**) | Purchase | Raise and progress a PR through all four approval levels | Create PR; act at Prepared/Checked/Preapproved/Approved stage (per [`06-user-roles.md`](06-user-roles.md) §4) | **1** |

## M7 — Quality Control

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| QC Inspections | `/factory/qc` | F9's Authorization-block sampling rule; no dedicated paper QC form otherwise | Quality | Log inspections and defects per the configurable QC plan rule | Record inspection result, apply sampling rule, raise `QC_HOLD` or `QC_APPROVED` | 3 |

## M8 — Packing & Finished Goods

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Packing | `/factory/packing` | `NEW` | Store | Record packing of QC-approved output into rolls/cartons | Create packing record; count/derive Rolls Completed | 3 |
| Finished Goods | `/factory/finished-goods` | F4 / F8 (finished-goods subset) | Store | Finished-goods stock view | View balances; stage for dispatch | 3 |

## M9 — Dispatch & Gate Pass

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Dispatch | `/factory/dispatch` | `NEW` (drives the Gate Pass) | Store | Record a dispatch against an order | Create dispatch; link to a Gate Pass | 3 |
| Gate Pass | `/factory/gate-pass` | F6 (**IC-FM-02**) | Store | Returnable / Non-Returnable gate pass, exactly per the paper checkboxes | Create gate pass; Prepared By / Receiver / Authorized Signature | **1** |

## M10 — Traceability

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Traceability | `/factory/traceability` | `NEW` — synthesised from the stock ledger + audit log, no single paper equivalent | Viewer, Quality | Trace a lot/batch forward to dispatch or backward to receiving | Search by lot/order/customer; view chain of custody | 3 |

## M2 — Product & Costing

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Costing | `/factory/costing` | F1 (Elastic Costing / Construction Sheet) | Production Manager | Digitises the standalone costing sheet (composition, price-per-Kg/Lbs/Mtr blocks) | Enter composition; view confirmed formulas (per `03-field-extraction.md`); flag the unresolved `Total = 439` figure rather than guess it | 2 |

## M11 — QuickBooks Bridge

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| QuickBooks Admin | `/factory/admin/quickbooks` | `NEW` | Accounts | Monitor and manage the reference-only sync described in `07-quickbooks-mapping.md` | View sync status/errors; trigger re-sync; no ledger entry is ever created here | 4 |

## M12 — Administration & Master Data

Each master screen is `Full` for Admin; the **Primary role** column names the role with the closest
functional ownership, per `13-master-data-migration.md`'s Owner column — that role typically has
`Edit`, Admin retains override.

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Machines | `/factory/masters/machines` | F1 `MCH 13`; F5 `MACH NO` (**not yet mapped — see §9 of `09-factory-live-drilldown.md`**) | Production Manager | Machine master: `machine_id`, `legacy_machine_no`, group, type, speed, etc. | Create/edit machine; record legacy number mapping once confirmed | **1** |
| Machine Groups | `/factory/masters/machine-groups` | `NEW` (configurable master) | Production Manager | Warp Knitting, Jacquard, Needle Loom, Crochet, Warping, Cone Winding, Press/Finishing, Packing, Other | Create/edit groups | **1** |
| Products | `/factory/masters/products` | F4 `ITEM NAME`; F9 `Product Description`; F1 sheet title | Production Manager | Product master (26 fields), `g_per_meter` canonical | Create/edit product; derived fields computed, not keyed | **1** |
| Materials | `/factory/masters/materials` | F2 `Article`; F9 `Rubber`/thread specs | Store | Raw material master (21 fields, 8 categories) | Create/edit material; set `lot_control_required`, `expiry_control_required` | **1** |
| Suppliers | `/factory/masters/suppliers` | F2 `Supplier`; F3 `Supplier` | Purchase | Supplier master | Create/edit supplier | **1** |
| Customers | `/factory/masters/customers` | F9 `Customer Information` block | Production Manager | Customer master (may reference Studio customer data rather than duplicate it — see `05-database-schema.md`) | Create/edit customer | **1** |
| Operators | `/factory/masters/operators` | F5 `NAME` (operator half of the concatenated field) | Supervisor | Operator master | Create/edit operator | **1** |
| Shifts | `/factory/masters/shifts` | F4 footer (`A & N`/`N & Z`); F5 `SHIFT TIME` | Production Manager | Shift master — `shift_code`, `start_time`, `end_time`, `cross_midnight` | Create/edit shift. **Seeding blocked:** the Day/Night/A/N/Z mapping is `NEEDS CONFIRMATION` — see `11-needs-confirmation.md` | **1** (screen ships; data entry blocked pending confirmation) |
| Downtime Reasons | `/factory/masters/downtime-reasons` | F5 `REMARKS` (informal downtime log) | Maintenance | Downtime category/reason master, seeded from both OBSERVED (paper remarks) and PROPOSED reasons | Create/edit reason; set planned vs unplanned category (see `14-kpi-dictionary.md` §"Excluded time") | **1** |
| Locations | `/factory/masters/locations` | Implicit on F2/F4/F8 (single-site assumption) | Store | Physical/logical stock locations | Create/edit location | **1** |
| UOMs | `/factory/masters/uoms` | Meters, Kg, Rolls, Strips, Cones, Pieces (per `03-field-extraction.md` UOM table) | Production Manager | UOM master plus conversion layer | Create/edit UOM and conversions (`meters_per_kg`, `meters = roll_length × rolls`, `strips = kg ÷ kg_per_strip`) | **1** |
| Routes | `/factory/masters/routes` | `NEW` (configurable master; Jacquard Elastic / Knitted Elastic as example templates) | Production Manager | Process routing master over the 13 process steps | Create/edit route, assign to product | **1** |
| QC Rules | `/factory/masters/qc-rules` | F9 Authorization-block sampling rule | Quality | Configurable QC plan rules (sample counts by order-size band) | Create/edit rule; threshold above 5,000 m is `NEEDS CONFIRMATION` | 3 |

## M12 — Administration (system)

| Screen name | Route | Replaces (form) | Primary role | Purpose | Key actions | Phase |
|---|---|---|---|---|---|---|
| Audit Log | `/factory/admin/audit` | `NEW` — mirrors the Studio's `activity_log` pattern | Admin | The 18 named audit events (Design Approved … GRN Posted, per `05-database-schema.md` §27) | Search/filter audit trail; no edit — append-only | **1** |

---

## Screen count summary

| Phase | Screens |
|---|---|
| 1 (Core Digital Transactions) | 20 |
| 1 → 2 (minimal in Phase 1, full in Phase 2) | 1 (Machine Detail) |
| 2 (Factory Live) | 4 |
| 3 (Quality & Finishing) | 6 |
| 4 (QuickBooks) | 1 |
| 5 (IoT) | 0 — IoT enriches existing screens' data sources rather than adding new ones (see `09-factory-live-drilldown.md` data source matrix) |

**Total distinct screens: 32.**

---

## Cross-references

- Role permissions per module and per status transition: [`06-user-roles.md`](06-user-roles.md)
- The five-level drilldown screens (Level 1–5) in full detail: [`09-factory-live-drilldown.md`](09-factory-live-drilldown.md)
- Phase definitions and the first vertical slice: [`10-migration-plan.md`](10-migration-plan.md)
- Master data required before each Phase 1 screen can be used: [`13-master-data-migration.md`](13-master-data-migration.md)
