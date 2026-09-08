# 10 — Migration Plan

**Section J of the pack.** How Interconverters gets from the current paper/Excel system to Factory
Live, phase by phase, starting from a single proven vertical slice rather than a broad rollout.

Related: [`11-needs-confirmation.md`](11-needs-confirmation.md) (the readiness gate this plan depends
on), [`13-master-data-migration.md`](13-master-data-migration.md) (master data collection behind
Phase 1), [`15-form-retirement-matrix.md`](15-form-retirement-matrix.md) (when each paper form actually
stops being used), [`06-user-roles.md`](06-user-roles.md) (roles referenced in the training plan).

---

## 0. Readiness gate — read this before anything else

> **Phase 1 coding must not start while any BLOCKING item in [`11-needs-confirmation.md`](11-needs-confirmation.md)
> is still open**, because each BLOCKING item changes the database model — the machine master, the
> stock-ownership model, the shift master, or the meaning of `STRIP` / `Column1`. Building against a
> schema that then has to change is more expensive than waiting for the answers. This is not a
> soft recommendation: it is the entry criterion for Phase 1 in the table below.

---

## 1. The five phases

Each phase is scoped narrowly on purpose. A phase's exit criteria must be met — not merely its coding
finished — before the next phase begins.

### Phase 1 — Core Digital Transactions

| | |
|---|---|
| **Scope** | Order Booking, Production Order, Machine Assignment, Daily Production (entry), GRN, Stock Ledger |
| **Entry criteria** | All BLOCKING items in `11-needs-confirmation.md` closed; core masters (Machines, Products, Materials, Shifts, Operators, Customers, Suppliers) populated per `13-master-data-migration.md`; the vertical slice in §2 below is designed |
| **Exit criteria** | The vertical slice (§2) runs reliably for a full week of real production against the reconciliation tests in §4; daily production totals match IC-FM-01 subtotals; stock balances match F4's arithmetic |
| **Forms affected** | F5 / IC-FM-01 (Daily Production Report), F2 (Goods Receiving Entry Sheet), F4 (Daily Stock Report), F9 (Order Booking) |
| **Roles trained** | Operator, Supervisor, Store, Production Manager |
| **Risks** | Machine master built on an unconfirmed mapping (mitigated by the gate above); operators reject double-entry if paper is not genuinely retired in parallel (see §5); production floor has no reliable device/connectivity at point of entry |

### Phase 2 — Factory Live

| | |
|---|---|
| **Scope** | Process Overview, Machine Groups, Individual Machine View, Shift Dashboard, Downtime |
| **Entry criteria** | Phase 1 exit criteria met; downtime categories/reasons seeded (both OBSERVED and PROPOSED, per `03-field-extraction.md` §17); shift master confirmed (BLOCKING item 10 closed) |
| **Exit criteria** | Live machine status, current order and downtime are visible and correct against a floor walk-through spot check; every KPI shown on a Factory Live card resolves to a definition in `14-kpi-dictionary.md` |
| **Forms affected** | F5 / IC-FM-01 (REMARKS column becomes structured downtime capture) |
| **Roles trained** | Supervisor, Production Manager, Maintenance, Viewer |
| **Risks** | Downtime capture depends on operators actually logging stoppages instead of leaving REMARKS blank, as observed today (see `11-needs-confirmation.md` item 12 on wastage — the same discipline risk applies to downtime); dashboard is only as live as manual entry allows in V1 (IoT is Phase 5) |

### Phase 3 — Quality & Finishing

| | |
|---|---|
| **Scope** | QC, Winding, Packing, Finished Goods, Batch Traceability |
| **Entry criteria** | Phase 1 exit criteria met; Phase 2 substantially stable; QC sampling rule from F9 configured in `qc_plan_rules` (item 16 resolved or a safe interim rule agreed); lot capture is happening at GRN (item 15 resolved) |
| **Exit criteria** | A finished-goods batch can be traced back to its source material lot end-to-end through the digital record alone, without consulting paper |
| **Forms affected** | F9 (QC sampling authorisation clause), no direct legacy QC form exists — this is a `NEW per §19` capability |
| **Roles trained** | Quality, Store, Supervisor |
| **Risks** | Traceability has a hard dependency on Phase 1 lot capture at GRN; if that did not happen consistently, batch traceability has gaps that cannot be back-filled (see item 15) |

### Phase 4 — QuickBooks

| | |
|---|---|
| **Scope** | Customer mapping, Vendor mapping, Items, Estimate references, PO references, Invoice references, Sync monitoring |
| **Entry criteria** | Phases 1–3 stable in production; QuickBooks edition, Sales Order support, currency and tax treatment confirmed (see `07-quickbooks-mapping.md` §6) |
| **Exit criteria** | Reference columns populate correctly for new records; sync status is visible and accurate; a finance user can reconcile Factory Live operational stock against QuickBooks inventory valuation using the process in `07-quickbooks-mapping.md` §2.3 |
| **Forms affected** | None directly — this phase formalises what was previously manual re-keying into QuickBooks by Accounts |
| **Roles trained** | Accounts, Admin |
| **Risks** | Undefined until the QuickBooks edition question is answered — no further Phase 4 risk assessment is meaningful before then |

### Phase 5 — IoT

| | |
|---|---|
| **Scope** | Machine run signal, Stop signal, Meter pulse, Speed, Alarm, Power state |
| **Entry criteria** | Phases 1–2 stable; a specific machine identified and confirmed as the pilot (this depends on the machine-master mapping being resolved — item 2/3 — since IoT wiring must target a physical, uniquely identified machine, not an ambiguous legacy number) |
| **Exit criteria** | Pilot machine's run/stop/meter data matches manually-entered production entries for a trial period, at which point manual entry for that machine is deprecated |
| **Forms affected** | None — this phase replaces manual data entry for machines it covers, not a paper form |
| **Roles trained** | Maintenance, Admin |
| **Risks** | Hardware/network reliability on a factory floor; false alarms; this phase is explicitly `FUTURE` scope and is not scheduled against Phases 1–4 |

---

## 2. The first vertical slice — the single gate before any breadth is added

Before Order Booking, Machine Assignment, GRN and Stock Ledger are each built out as full modules, **one
single order must be walked end-to-end through the system**, exactly as it will run in production. No
other Phase 1 work should start in parallel with proving this slice — breadth is only added after this
narrow path works reliably on the actual factory floor, not just in a demo.

```mermaid
flowchart LR
    A[CONFIRMED ORDER] --> B[PRODUCTION ORDER]
    B --> C[MACHINE ASSIGNMENT]
    C --> D[START PRODUCTION]
    D --> E[PRODUCTION ENTRY]
    E --> F[METER OUTPUT]
    F --> G[STOP / COMPLETE]
    G --> H[STOCK LEDGER UPDATE]

    classDef step fill:var(--slice-fill,#eef2ff),stroke:var(--slice-stroke,#4f46e5),color:var(--slice-text,#1e1b4b);
    class A,B,C,D,E,F,G,H step;
```

### Minimum tables this slice touches

`orders`, `order_items`, `production_orders`, `machines`, `production_batches`, `production_entries`,
`stock_ledger`, `operators`, `shifts`.

Explicitly **not** touched by this slice: `grns`, `material_lots`, `purchase_requests`, `qc_inspections`,
`packing_records`, `finished_goods`, `dispatches`, `gate_passes`, any `quickbooks_*` reference column.
Those belong to later phases or the breadth that follows the slice, not the slice itself.

### Minimum screens

- `/factory/orders` — create and confirm one order
- `/factory/production/entry` — assign a machine, start production, key the meter reading, stop/complete
- `/factory/stock` — confirm the stock ledger moved by the correct quantity

No dashboard, no KPI cards, no downtime capture, no QC and no QuickBooks reference field are required
to prove this slice. Those are added once the slice is proven.

### Definition of done

- One confirmed order produces exactly one production order.
- That production order can be assigned to one machine (from the machine master, however it is finally
  defined once the machine-master question is resolved).
- Production can be started, one or more production entries can be keyed against it (mirroring one row
  of IC-FM-01: machine, shift, meter output), and the order can be stopped/completed.
- On completion, the `stock_ledger` receives exactly one new entry reflecting the metre/kg/roll output,
  with the correct `ownership` and `stock_category` tags.
- The same order, run twice with the same inputs, produces the same stock ledger result (no
  double-counting, no silent drops).
- A Supervisor and an Operator have each run this slice unassisted, on the factory floor, using a real
  order — not a synthetic test order — and confirm the numbers match what they would have written on
  paper.

### Explicit statement

> **No other module — GRN, Purchase Request, QC, Packing, Dispatch, Factory Live dashboards, or
> QuickBooks references — is built out further until this slice has run reliably in the factory for a
> representative period (recommended: one full week across all shifts).** Adding breadth before the
> spine is proven risks building further modules on top of a stock-ledger mechanic that does not yet
> hold up under real conditions.

---

## 3. Opening balance strategy

At cutover, Factory Live's `stock_ledger` starts at zero. Every balance it will ever show is
`opening + movements since`. The opening figure itself must be captured once, deliberately, not derived.

### Using F4's structure (per item, in rolls)

F4 (Daily Stock Report) already lists, per item, an `OPENING STOCK` figure alongside
`PRODUCTION`, `DISPATCH` and `BALANCE`, verified to reconcile as `BALANCE = OPENING + PRODUCTION − DISPATCH`
(see `SOURCE-EVIDENCE.md` F4). On the cutover date, F4's `BALANCE` column for every item **is** the
opening stock for Factory Live's `stock_ledger`: one opening-balance transaction per item, dated the
cutover date, quantity = that item's last paper `BALANCE`, in whatever unit F4 uses (rolls — see item 17
in `11-needs-confirmation.md`, still `NEEDS CONFIRMATION`).

### Using F8's per-product cards

Where a product has an F8 (Stock Register / IC-FM-05) card in use, its own running `Balance` column is
the second source for the same figure and should be cross-checked against F4 for that product before
the opening balance is keyed — F4 and F8 are "the same ledger viewed differently" (per
`SOURCE-EVIDENCE.md` F8 note), so for any item present on both, the two balances must agree before
cutover. A mismatch found here is exactly the kind of discrepancy the parallel run in §5 is designed to
catch before it does — it must be resolved manually and the reason recorded, not silently averaged.

### Cutover-day checklist

1. Freeze paper entry for the cutover item(s)/location(s) at a fixed cut-off time.
2. Record final F4 `BALANCE` for every item as of that cut-off.
3. Where an F8 card exists for that item, record its final `Balance` and confirm it matches step 2.
4. Physically count a sample of items (recommended: every item with non-zero balance) against the
   recorded balance; log any variance and its cause before keying.
5. Key one opening-balance transaction per item into `stock_ledger`, tagged with the correct `ownership`
   (`INTERCONVERTERS_OWNED` / `CUSTOMER_OWNED` / `TOLL_MANUFACTURING` / etc. — this cannot be completed
   for Z&Z/Gatron-related material until item 13 is resolved) and `stock_category`.
6. Resume paper and digital recording in parallel from the cut-off time forward (§5).
7. Do not delete or archive the paper balance sheet used for this — it is the audit trail for the
   opening figure and should be referenced from the `audit_log` entry for the opening transaction.

---

## 4. Parallel run strategy

Paper and digital run **together**, for every form being replaced, until reconciliation succeeds. The
parallel run is not a formality — it is the mechanism that proves the digital system before paper is
allowed to stop.

**Reconciliation is the exit criterion, not a fixed calendar date.** A phase's parallel run ends when
its reconciliation tests pass for a representative run, not on a pre-committed day.

### Reconciliation tests

| Test | What it checks | Passes when |
|---|---|---|
| Daily production totals vs IC-FM-01 | Digital production entries for a shift sum to the same total as the paper IC-FM-01 subtotal row for that shift | Totals match exactly, for every shift, across the parallel-run window |
| Stock balance vs F4 arithmetic | Digital `stock_ledger` running balance for an item equals `OPENING + PRODUCTION − DISPATCH` as F4 defines it | Digital balance matches the paper F4 balance for every item, every day, across the window |
| Monthly GR summary regenerates F3's exact figures | A digital monthly goods-receiving summary, **generated** (never keyed) from GRN/`stock_ledger` records, reproduces F3's figures exactly | The generated summary matches F3 line for line — cited proof this reconciliation is achievable: F3 reconciles to F2 exactly (43 + 24 + 100 = 167 for Fintex(32); 2,900 + 1,440 = 4,340 for Empty Carton), so the same roll-up logic applied to digital GRN records must produce the same totals |

A parallel run that fails a test is a signal to fix the digital process or the master data behind it —
not a signal to stop testing or to retire the paper form anyway.

---

## 5. Training plan by role

| Role | Trained on | Phase |
|---|---|---|
| Operator | Production Entry screen only (`/factory/production/entry`) — the digital equivalent of one IC-FM-01 row | Phase 1 |
| Supervisor | Production Entry oversight, Machine Assignment, Downtime capture, Shift Dashboard | Phase 1–2 |
| Production Manager | Order Booking, Production Order lifecycle, Factory Live dashboards, KPI cards | Phase 1–2 |
| Store | GRN entry, Stock Ledger, Stock Register per-product view | Phase 1, 3 |
| Purchase | Purchase Request (all four approval levels), GRN cross-reference | Phase 1 |
| Quality | QC inspection entry, sampling-rule configuration awareness, defect recording | Phase 3 |
| Maintenance | Downtime categories/reasons, Individual Machine View, IoT pilot device handling | Phase 2, 5 |
| Accounts | QuickBooks reference review, sync-error queue, reconciliation process | Phase 4 |
| Admin | Master data management, role assignment, audit log, QuickBooks admin screen | All phases |
| Viewer | Read-only dashboards | Phase 2 onward |

Training happens **before** a role's phase goes live, using the parallel-run window itself as practice —
not as a one-off session weeks in advance.

---

## 6. Rollback plan per phase

| Phase | Rollback trigger | Rollback action |
|---|---|---|
| Phase 1 | Vertical slice reconciliation tests fail repeatedly, or stock-ledger figures diverge from paper without an identifiable cause | Revert to paper-only for the affected form(s); keep the digital record for audit but stop treating it as authoritative; re-open the relevant `11-needs-confirmation.md` items rather than patching the schema under pressure |
| Phase 2 | Machine status/downtime shown on Factory Live is materially wrong against floor spot checks | Disable the live dashboard views; keep Phase 1 transactional screens running; downtime reverts to the REMARKS-column paper practice until the data source is fixed |
| Phase 3 | Traceability chain has gaps that make a batch un-traceable | Do not claim traceability is live; keep QC/Packing/Finished Goods screens for data entry only, without asserting a false chain of custody |
| Phase 4 | QuickBooks sync produces incorrect financial references, or reconciliation in `07-quickbooks-mapping.md` §2.3 does not close | Set affected records to `MANUAL_OVERRIDE`; suspend automated sync; Accounts reverts to manual re-keying into QuickBooks for the affected period |
| Phase 5 | IoT signal disagrees with manual readings beyond an agreed tolerance | Disable IoT ingestion for the affected machine; revert that machine to manual Production Entry; keep IoT data for diagnostics only |

Every rollback keeps the digital records already captured (nothing is deleted) but removes the
authoritative/live status from the affected screen until the underlying problem is fixed.

---

## 7. Cross-references

- The BLOCKING items that gate Phase 1 are listed in full, with evidence, in
  [`11-needs-confirmation.md`](11-needs-confirmation.md).
- Master data required before Phase 1 entry criteria are met: [`13-master-data-migration.md`](13-master-data-migration.md).
- Form-by-form retirement (which is a separate decision from "a digital screen exists" — see the
  governing principle there): [`15-form-retirement-matrix.md`](15-form-retirement-matrix.md).
- KPI definitions referenced in Phase 2 exit criteria: [`14-kpi-dictionary.md`](14-kpi-dictionary.md).
