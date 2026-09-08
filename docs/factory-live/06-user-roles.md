# 06 — User Roles, Permissions & Status Transition Authority

**Deliverable F.** Defines the ten Factory Live roles, what each may see and touch, the module-by-module
permission matrix, who may move a production order between which of the 21 statuses, the four-level
Purchase Request approval chain, and how the paper forms' signature blocks map onto these digital roles.

Related reading: [`05-database-schema.md`](05-database-schema.md) for the schema these roles govern,
[`08-screen-list.md`](08-screen-list.md) for the screens each role opens, and
[`11-needs-confirmation.md`](11-needs-confirmation.md) for the open questions raised below.

---

## 1. The ten roles

One person may hold more than one role (e.g. a working supervisor who is also the shift's Quality
checker on a small line) — the system assigns roles per user via `factory_user_roles`, not one role
per person. Nothing below invents a headcount; "typical job title" describes the function, not a named
individual.

| Role | Purpose | Typical real job title at Interconverters | What they can see | What they can create / edit | What they must never touch |
|---|---|---|---|---|---|
| **Admin** | System owner. Configures masters, resolves exceptions, holds override authority. | Owner / General Manager / IT-responsible principal | Everything | Everything, including other users' role assignments | Nothing is withheld from Admin by design — but Admin acting as a transacting role (e.g. approving their own Purchase Request) should still be logged distinctly in `audit_log` so maker-checker is visible even when one person holds two roles |
| **Production Manager** | Owns the production plan: order intake into the factory, machine assignment, status progression, downtime review, output vs plan. | Production Manager / Factory Manager | All production, stock, and order data; QuickBooks reference fields (read-only) | Production orders, batches, machine assignment, process routes, downtime categorisation, master data for machines/machine groups/routes | QuickBooks sync actions; final Purchase Request approval; QC pass/fail verdicts |
| **Supervisor** | Shift-level oversight of the machines and operators reporting to them; the "Reviewed By" checkpoint on the Daily Production Report. | Shift Supervisor / Shift In-Charge | Their shift's machines, orders, operators, and downtime entries; read access to adjacent shifts for handover | Reviews and countersigns operator production entries for their shift; logs downtime; requests machine status change | Purchase Requests; QC verdicts; master data; QuickBooks |
| **Operator** | Runs an individual machine for a shift and logs what it produced — the person behind the `NAME` column on IC-FM-01. | Machine Operator / Machine Man | Their assigned machine(s) and current order for the shift only | Their own production entries (meters, kg, wastage where recorded, stop reason) for the shift in progress | Any other operator's entries once submitted; status transitions beyond starting/stopping their own machine; any master data |
| **Store** | Owns physical stock: goods receiving, the stock ledger, stock registers, packing, dispatch and gate passes. | Store Keeper / Storekeeper / Dispatch Clerk | All stock, GRN, packing, finished goods and gate pass records; read access to orders and materials | GRNs, stock ledger entries, stock registers, packing records, dispatches, gate passes | Purchase Request approval beyond the "Checked by" stage; production status transitions; QC verdicts |
| **Purchase** | Raises and progresses Purchase Requests; liaises with suppliers. | Purchase Officer / Procurement Officer | Purchase Requests, suppliers, materials, GRNs (read-only) | Purchase Requests (Prepared By stage), supplier master | Stock ledger postings; production data; final PR approval |
| **Quality** | Owns QC inspection, sampling and defect recording; gatekeeper for `QC_APPROVED`. | Quality Controller / QC Inspector | Orders and batches awaiting or under inspection; QC plan rules; defect history | QC inspections, defects, QC plan rules master | Production entries; stock ledger; Purchase Requests; dispatch |
| **Maintenance** | Owns machine health: logs and clears `DOWN`/`MAINTENANCE` status, maintains the downtime-reason vocabulary. | Maintenance Technician / Fitter | Machine status and downtime history across the factory | Machine status transitions to/from `DOWN` and `MAINTENANCE`; downtime events they are called to; downtime-reason master | Production entries; QC verdicts; stock, orders, Purchase Requests |
| **Accounts** | Owns the QuickBooks Bridge and the financial-approval step on Purchase Requests; the digital analogue of the "Chief Financial Officer" signature seen on F4. | Accounts Officer / Finance Officer | Financial reference fields across all modules (order value, PR rates, invoice/sync status); read access to stock and dispatch for reconciliation | QuickBooks sync actions and reference-field corrections; final ("Approved By") stage of Purchase Requests | Production entries; machine status; QC verdicts; stock ledger postings (Accounts reconciles the ledger, it does not post to it) |
| **Viewer** | Read-only access for management reporting, audit, or an external stakeholder who should never transact. | Director / Owner (dashboard-only use) / external auditor | Everything Admin can see, in read-only form, including audit log and QuickBooks sync status | Nothing | Nothing — Viewer has no create, edit, or approve permission anywhere in the system |

---

## 2. Permission matrix — modules × roles

Rows are the 12 canonical modules; columns are the 10 roles. Cell values: **None** (no access) · **View**
(read-only) · **Create** (may add new records) · **Edit** (may add and modify) · **Approve** (may action
an approval/verdict step specifically) · **Full** (unrestricted create/edit/approve/delete within the
module).

Where a module contains screens owned by different roles (chiefly **M12**), the cell shows the
broadest right any role holds in that module; the per-screen owner is authoritative and is listed in
[`08-screen-list.md`](08-screen-list.md) and [`13-master-data-migration.md`](13-master-data-migration.md).

| Module | Admin | Production Manager | Supervisor | Operator | Store | Purchase | Quality | Maintenance | Accounts | Viewer |
|---|---|---|---|---|---|---|---|---|---|---|
| **M1** Order Booking | Full | Edit | View | None | None | None | None | None | View | View |
| **M2** Product & Costing | Full | Edit | View | None | None | View | View | None | View | View |
| **M3** Purchase Request | Full | Create / Approve¹ | None | None | Edit¹ | Full | None | View | Approve¹ | View |
| **M4** Goods Receiving | Full | View | View | None | Full | View | None | None | View | View |
| **M5** Stock & Lots | Full | View | View | None | Full | View | View | None | View | View |
| **M6** Production & Factory Live | Full | Full | Edit | Create² | View | None | View | Edit³ | View | View |
| **M7** Quality Control | Full | View | View | None | None | None | Full | None | None | View |
| **M8** Packing & Finished Goods | Full | View | View | None | Full | None | View | None | View | View |
| **M9** Dispatch & Gate Pass | Full | View | View | None | Full | None | None | None | View | View |
| **M10** Traceability | Full | View | View | None | View | View | View | None | View | View |
| **M11** QuickBooks Bridge | Full | View | None | None | None | View | None | None | Full | View |
| **M12** Administration & Master Data | Full | Edit | View | None | Edit | Edit | Edit | Edit | View | View |

¹ See §4 below — the four Purchase Request approval levels split across Purchase, Store, Production
Manager and Accounts; no single role owns the whole approval chain except Admin.
² Operator create-rights in M6 are scoped to their own production entries for their own machine and
shift only — never another operator's row, and never a status transition beyond starting/stopping their
own machine.
³ Maintenance's Edit right in M6 is scoped to machine status (`DOWN` ⇄ `MAINTENANCE`) and downtime
events — not to production entries, orders, or batches.

---

## 3. Status transition authority — the 21-state production order model

The full lifecycle spans two systems: the first five states belong to the existing Design Studio
(`design_projects.status`, **FROZEN**, defined in `0001_init.sql`) and are shown here only for
continuity of the order's life story — Factory Live does not own or enforce those transitions. From
`PRODUCTION_PLANNED` onward, the states belong to Factory Live's `production_orders.status` and this
table is the authoritative transition-authority reference.

> **Naming note:** `DESIGN_DRAFT`, `TECHNICAL_REVIEW`, `TECHNICAL_APPROVED`, `QUOTATION` and
> `ORDER_CONFIRMED` are this pack's plain-English labels for the corresponding Studio states
> (`Draft`, `Under Technical Review`, `Sample Approved`, `Quoted`, `Order Confirmed` — see
> `design_projects.status` in `0001_init.sql`, which also includes `Submitted`, `Modification Required`,
> `Sample Development`, `Rejected` and `Archived` as intermediate/exit states not reproduced here). The
> Studio's actual enum is not renamed or altered by this pack.

| # | State | Meaning | Entered from | Role(s) authorised to trigger this transition | 2nd-person approval required? | Notes |
|---|---|---|---|---|---|---|
| 1 | `DESIGN_DRAFT` | Design created in the Studio | — (start) | Studio user (outside Factory Live's role model) | No | Studio-owned |
| 2 | `TECHNICAL_REVIEW` | Technical team reviewing weavability/constraints | `DESIGN_DRAFT` | Studio user | No | Studio-owned |
| 3 | `TECHNICAL_APPROVED` | Sample/technical spec approved | `TECHNICAL_REVIEW` | Studio user | **Yes** | Studio-owned; approval is inherently a second-person action |
| 4 | `QUOTATION` | Price quoted to customer | `TECHNICAL_APPROVED` | Studio user | No | Studio-owned |
| 5 | `ORDER_CONFIRMED` | Customer has confirmed the order | `QUOTATION` | Studio user | No | Studio-owned. **Handoff condition into Factory Live:** design status `Order Confirmed` **AND** `production_specs.status = 'approved'` (per `05-database-schema.md` §11) |
| 6 | `PRODUCTION_PLANNED` | Factory Live creates a `production_order` referencing the confirmed design/spec | `ORDER_CONFIRMED` | Production Manager | No | First Factory Live state; carries `design_project_id`, `design_revision_id`, `production_spec_id` as FKs |
| 7 | `MATERIALS_PENDING` | Awaiting confirmation that raw materials are in stock | `PRODUCTION_PLANNED` | Production Manager, Store | No | Automatic candidate state once a route/BOM is attached — see `11-needs-confirmation.md` for BOM-source status |
| 8 | `MATERIALS_READY` | Store confirms sufficient stock (or toll-in material) is available | `MATERIALS_PENDING` | Store | No | Store attests against the stock ledger |
| 9 | `MACHINE_ASSIGNED` | A specific machine (and machine group) is assigned to the order | `MATERIALS_READY` | Production Manager | No | Machine ID mapping is itself a BLOCKING open item — see §9 of `09-factory-live-drilldown.md` |
| 10 | `IN_SETUP` | Operator/Supervisor preparing the machine (article change, threading) | `MACHINE_ASSIGNED` | Supervisor, Operator | No | Corresponds to the paper form's "Article Change" remark |
| 11 | `IN_PRODUCTION` | Machine running, production entries being logged | `IN_SETUP` | Operator (with Supervisor visibility) | No | First entry against the batch typically triggers this |
| 12 | `ON_HOLD` | Production paused (machine fault, absence, material shortage, quality concern) | `IN_PRODUCTION`, `IN_SETUP` | Supervisor, Production Manager, Quality, Maintenance | No to place on hold; **Yes** to release back to `IN_PRODUCTION` | Placing a hold is a safety/quality action and should not be gated; releasing one should be, so a second person confirms the cause is resolved |
| 13 | `QC_PENDING` | Production output awaiting inspection | `IN_PRODUCTION` | Supervisor, Operator | No | |
| 14 | `QC_HOLD` | Quality has found a non-conformance | `QC_PENDING` | Quality | No | |
| 15 | `QC_APPROVED` | Quality has signed off the output | `QC_PENDING`, `QC_HOLD` (after resolution) | Quality | **Yes** | An approval verdict by definition; the QC plan rule in `03-field-extraction.md` §19 governs sampling |
| 16 | `PACKING` | Output being packed | `QC_APPROVED` | Store | No | |
| 17 | `FINISHED` | Packing complete, goods moved to finished-goods stock | `PACKING` | Store | No | |
| 18 | `READY_FOR_DISPATCH` | Finished goods staged for despatch | `FINISHED` | Store, Production Manager | No | |
| 19 | `DISPATCHED` | Goods have left the factory against a Gate Pass | `READY_FOR_DISPATCH` | Store (Dispatcher, per F6's `Dispatcher :` field) | No | Gate Pass footer signatures (`Prepared By` / `Receiver` / `Authorized Signature`) apply — see §5 |
| 20 | `CLOSED` | Order administratively closed (dispatched and invoiced) | `DISPATCHED` | Accounts | **Yes** | Financial closure; Accounts confirms invoice/QuickBooks status before close |
| 21 | `CANCELLED` | Order abandoned at any stage | Any state prior to `CLOSED` | Admin | **Yes** | Cross-cutting exit state — always requires Admin sign-off and a logged reason in `audit_log`, regardless of which state it is cancelled from |

**Cross-cutting rule:** every transition into a state marked "2nd-person approval required" must record
a *different* `user_id` for the approver than the `user_id` on the immediately preceding transition
into that record's history, mirroring the maker-checker principle used throughout the paper forms
(Prepared By / Reviewed By, Prepared By / Checked By, the four PR levels). This is an audit-log
invariant, not a UI restriction — the system should refuse to log an approval where preparer and
approver are the same `user_id`, Admin included.

---

## 4. Four-level Purchase Request approval

Source: **IC-FM-04**, footer signatures verbatim — `Prepared By` / `Checked by` / `Preapproved by` /
`Approved By`. All four levels are preserved; this is **not** reduced to a three-step maker-checker
chain.

| Level | Paper signature | Digital role | What this stage confirms |
|---|---|---|---|
| 1 | `Prepared By` | **Purchase** | The request is raised: item, purpose, quantity, indicative rate |
| 2 | `Checked by` | **Store** | Quantity and necessity are checked against current stock on the ledger (Store is closest to the physical stock position) |
| 3 | `Preapproved by` | **Production Manager** | Departmental sign-off that the request supports a real production need |
| 4 | `Approved By` | **Accounts** | Final financial sign-off before the PR is released to the supplier |

Each level writes one row to `purchase_request_approvals` (approver `user_id`, role, timestamp,
decision, comment) rather than overwriting a single status field — so the full four-signature history
is retrievable exactly as it would be read off a signed paper PR. A PR may be **rejected** at any level
and returns to Purchase for revision; it does not silently skip a level.

**NEEDS CONFIRMATION** — this pack assigns Store/Production Manager/Accounts to levels 2–4 based on
functional fit with each role's domain (stock knowledge, departmental ownership, financial control).
The paper form does not name who actually signs each line today; Interconverters should confirm or
correct this mapping before go-live.

---

## 5. Signature blocks on the paper forms → digital roles

Every controlled and uncontrolled form carries a footer signature block. Digitising the workflow means
that block becomes an audit-log entry (`user_id`, role, timestamp) rather than a handwritten name.
The mapping below is proposed on functional grounds — **tag `NEEDS CONFIRMATION`** throughout, since
none of the source forms name the real individuals who sign each line, and F4 names two individuals
directly without stating their function.

| Form | Signature block (verbatim) | Proposed digital role | Confirmation status |
|---|---|---|---|
| **F5** (IC-FM-01, Daily Production Report) | `Prepared By:` / `Reviewed By:` | Prepared By → **Supervisor** (compiles the shift's operator readings) · Reviewed By → **Production Manager** | `NEEDS CONFIRMATION` |
| **F7** (IC-FM-04, Purchase Request) | `Prepared By` / `Checked by` / `Preapproved by` / `Approved By` | See the four-level table in §4 above (Purchase / Store / Production Manager / Accounts) | `NEEDS CONFIRMATION` |
| **F8** (IC-FM-05, Stock Register) | `Prepared By:` / `Checked By:` | Prepared By → **Store** · Checked By → **Production Manager** | `NEEDS CONFIRMATION` |
| **F6** (IC-FM-02, Gate Pass) | `Prepared By:` / `Receiver:` / `Authorized Signature:` | Prepared By → **Store** (Dispatcher) · Receiver → *external party, not a system role* (the person taking delivery — recorded as free text, not a `factory_user_roles` entry) · Authorized Signature → **Production Manager** or **Admin** | `NEEDS CONFIRMATION` |
| **F4** (Daily Stock Report, no document number) | `Chief Financial officer` plus named signatories **Bilal** and **Haroon** | Chief Financial Officer → **Accounts** (closest functional analogue in the ten-role model — Accounts is also assigned the final Purchase Request approval in §4 on the same reasoning) · Bilal / Haroon → *unknown function — could be Production Manager, Supervisor, or Admin* | `NEEDS CONFIRMATION` — **real-person-to-role mapping**, per the source pack instruction. Do not assume Bilal and Haroon are the same two functions across other forms without confirmation. |

---

## 6. Tenancy and row-level security

Factory Live is **single-tenant** — there is no `org_id` anywhere in the schema, and no multi-company
partitioning is designed for. Access control is entirely **role-based** RLS, mirroring the pattern
already proven in the Studio's `0001_init.sql`:

- The Studio defines a `security definer` helper function, `is_staff(uid)`, that returns true if a row
  for that user exists in `profiles`. Every RLS policy on a Studio table calls `is_staff(auth.uid())`
  rather than re-deriving the check inline (e.g. `staff_all_projects`, `staff_all_revisions`).
- Factory Live should mirror this exactly, not reinvent it: a parallel helper function reads
  `factory_user_roles` (mapping `auth.users.id` → one or more `factory_roles.role_code` values drawn
  from the ten roles in §1) and every `factory_*` table's RLS policy calls that helper rather than
  encoding the role check per-table. This keeps the access model in one place, auditable, and
  consistent with how the existing codebase already does it — no new pattern is introduced.
- Because there is no `org_id`, RLS here does the job of *role* isolation (an Operator cannot see
  another operator's in-progress entry; Purchase cannot see production data) rather than *tenant*
  isolation. The two are not the same problem and should not be conflated when this is implemented.

---

## Cross-references

- Screens each role opens: [`08-screen-list.md`](08-screen-list.md)
- The five-level Factory Live drilldown and its process cards: [`09-factory-live-drilldown.md`](09-factory-live-drilldown.md)
- KPI ownership (each KPI in the dictionary names an Owner role): [`14-kpi-dictionary.md`](14-kpi-dictionary.md)
- Schema and RLS detail: [`05-database-schema.md`](05-database-schema.md)
- Open questions raised in this file: [`11-needs-confirmation.md`](11-needs-confirmation.md)
