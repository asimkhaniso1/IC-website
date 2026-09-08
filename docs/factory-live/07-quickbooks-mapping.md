# 07 — QuickBooks Mapping

**Section G of the pack.** Defines the ownership boundary between Factory Live and QuickBooks, the
entity mapping between the two systems, the reference columns Factory Live carries, and the sync
status model an operator sees. **No QuickBooks API work is designed or built in this phase.**

Related: [`05-database-schema.md`](05-database-schema.md) (where the reference columns live),
[`10-migration-plan.md`](10-migration-plan.md) (Phase 4 — QuickBooks), [`11-needs-confirmation.md`](11-needs-confirmation.md)
(items 19 and the QuickBooks edition question below).

---

## 1. The governing principle

> **QuickBooks remains the financial system of record. Factory Live is the operational system of
> record. Factory Live must NOT become a parallel accounting package.**

Factory Live does not post journal entries, does not calculate tax, does not hold accounts
receivable or accounts payable balances, and does not replace QuickBooks reporting. Where a fact is
financial, QuickBooks owns it and Factory Live stores a **reference** (an ID and a sync status), never
a copy of the financial figure itself.

Where a fact is operational — what is on the factory floor, in what quantity, at what stage — Factory
Live owns it outright, because QuickBooks has no visibility into machines, shifts, production entries
or work-in-progress, and was never designed to.

---

## 2. Ownership split, stated in both directions

### 2.1 QuickBooks owns (Factory Live references, never duplicates)

| Domain | Detail |
|---|---|
| Customers | Where the accounting master is authoritative — billing address, credit terms, tax status, payment history |
| Vendors | Supplier accounting master — payment terms, tax status, banking details |
| Estimates | Quoted price to customer |
| Invoices | Billed amount, tax, due date |
| Vendor Bills | Amount owed to supplier |
| Payments | Money received or paid, by any method |
| Financial reporting | P&L, balance sheet, cash flow |
| General Ledger | The chart of accounts and every journal entry |
| Tax | Sales tax / GST / withholding calculation and filing |
| Accounts Receivable | What customers owe, and ageing |
| Accounts Payable | What Interconverters owes suppliers, and ageing |

### 2.2 Factory Live owns (QuickBooks has no visibility into these, and must not)

| Domain | Detail |
|---|---|
| Design/production relationships | Which design, revision and production spec an order is built from (Studio handoff) |
| Production Orders | The factory's work order — status, priority, target quantity |
| Machines | The machine master, machine groups, machine status |
| Production Entries | Shift-by-shift, machine-by-machine output (the digital Daily Production Report) |
| Operational Stock | Physical quantity on the floor, by location and ownership, right now |
| Material Lots | Lot/batch identity and where each lot currently sits |
| WIP | Work-in-progress quantity and stage |
| QC | Inspection results, defects, sampling records |
| Packing | Packing records and carton/roll counts |
| Finished Goods | Physical finished-goods stock before it is invoiced |
| Downtime | Machine downtime events, category, reason, duration |
| Batch Traceability | The lot-to-lot chain from raw material to dispatched finished goods |

### 2.3 Why operational stock and financial inventory are deliberately distinct

Factory Live's `stock_ledger` quantity and QuickBooks' inventory valuation are **not the same number**,
and reconciling them is not the same as merging them:

- **Different question, same underlying reality.** `stock_ledger` answers *"how many rolls of 6 Taar
  Double 32R are physically at the Warp Knitting store, right now, and who owns them?"* — an
  operational, real-time, physical-count question, updated by every production entry, GRN, dispatch
  and QC hold as it happens on the floor. QuickBooks inventory answers *"what is the accounting value
  of stock on hand, for the balance sheet, as of the last posted transaction?"* — a financial,
  period-end, valuation question, updated when a transaction is entered or synced, not when a roll
  comes off a machine.
- **Different timing.** The factory floor moves faster than the accounting cycle. A roll can be
  produced, moved to the finished-goods store and partially dispatched inside one shift; QuickBooks
  typically only sees a transaction once an invoice or bill is raised, which may be hours or days
  later.
- **Different scope.** `stock_ledger` tracks `ownership` explicitly — `INTERCONVERTERS_OWNED`,
  `CUSTOMER_OWNED`, `TOLL_MANUFACTURING`, `CONSIGNMENT`, `OTHER` (see [`05-database-schema.md`](05-database-schema.md)
  §6–§7). Customer-owned or toll-manufactured material sitting in the Interconverters factory is real
  operational stock that must be tracked, located and reconciled — but it is **not** an Interconverters
  asset and must never appear on the Interconversters balance sheet. A ledger that mixed the two would
  either overstate Interconverters' assets or under-track material the factory is legally responsible
  for. This is exactly the situation raised by item 13 in [`11-needs-confirmation.md`](11-needs-confirmation.md)
  (the Z&Z / Gatron relationship) — until that is answered, the ledger cannot even be populated
  correctly, which is why it is BLOCKING.
- **Different unit granularity.** `stock_ledger` records physical units (rolls, kg, metres, strips) at
  transaction grain; QuickBooks records value in currency at whatever grain the chart of accounts
  defines (often a single "Finished Goods Inventory" account).

Both are legitimate, both are needed, and neither should be forced into the other's shape. **They are
reconciled, not merged**: Phase 4 (see [`10-migration-plan.md`](10-migration-plan.md)) is expected to
define a periodic reconciliation — factory-counted quantity × standard cost compared against
QuickBooks' posted inventory value — with variances investigated, not auto-corrected. The reconciliation
mechanism itself is Phase 4 design work and is out of scope here; this section only establishes that
reconciliation, not merger, is the intended relationship.

---

## 3. Entity mapping table

| Factory Live entity | QuickBooks entity | Direction of truth | Sync trigger | On conflict |
|---|---|---|---|---|
| Factory `customers` | Customer | QuickBooks is authoritative for billing/credit data; Factory Live is authoritative for design/production relationship | Manual link on customer creation, or matched by name/tax ID | Factory Live customer record is flagged `MANUAL_OVERRIDE`; billing fields are never overwritten from the factory side |
| Approved Quotation (Design Studio / M1) | Estimate | QuickBooks is authoritative for the priced estimate once created | On quotation approval, a reference is created (Phase 4) | Factory Live shows the linked estimate as read-only; a price disagreement is resolved in QuickBooks, not in Factory Live |
| Confirmed Order (`orders`) | Sales Order / Estimate conversion | Factory Live is authoritative for what the order means operationally (specs, quantity, delivery schedule); QuickBooks is authoritative for what it means financially | On order confirmation | Order proceeds in Factory Live regardless of QuickBooks sync state; `quickbooks_sync_status` shows the discrepancy for Accounts to resolve |
| Factory `products` | Item | Factory Live is authoritative for the technical/production definition (construction, routing, costing inputs); QuickBooks is authoritative for the sellable item's price and tax code | On product creation/approval | New product is usable in Factory Live immediately; QuickBooks item link can be attached later without blocking production |
| `suppliers` | Vendor | QuickBooks is authoritative for payment terms and banking; Factory Live is authoritative for the supplier's role in GRN/purchase workflow | Manual link, or matched on creation | Factory Live supplier stays usable for GRN even if unlinked; `quickbooks_sync_status = NOT_SYNCED` |
| Approved Purchase Request (`purchase_requests`) | Purchase Order | Factory Live owns the four-level approval workflow (Prepared/Checked/Preapproved/Approved, per F7/IC-FM-04); QuickBooks owns the PO once it is a financial commitment | On final approval | Purchase Request can be fully approved and acted on operationally before a QuickBooks PO exists; reference stays `PENDING` until linked |
| Goods Receipt (`grns`) | PO / Bill reference | Factory Live is authoritative for what physically arrived, when, and into which lot | On GRN posting | GRN posts and updates `stock_ledger` regardless of bill status; `quickbooks_bill_id` is attached when Accounts raises the bill, which may be later |
| Finished Order (production complete, packed) | Invoice Ready | Factory Live is authoritative for "is this order physically ready to ship/invoice"; QuickBooks is authoritative for the invoice itself | On finished-goods confirmation / dispatch | Order shows `READY_TO_INVOICE` in Factory Live independent of whether QuickBooks has actually issued the invoice yet |
| — (no Factory Live equivalent; reference only) | Invoice | QuickBooks is fully authoritative | Manual reference entry or Phase 4 sync | Factory Live never edits invoice data; it only displays `quickbooks_invoice_id` and status |
| — (no Factory Live equivalent; reference only) | Payment | QuickBooks is fully authoritative | Manual reference entry or Phase 4 sync | Factory Live never edits payment data |

---

## 4. Reference columns

Factory Live tables carry **reference columns only** — an ID pointing into QuickBooks, plus sync
metadata. No financial amount, tax figure or ledger balance is stored in Factory Live tables.

| Column | Lives on table | Purpose |
|---|---|---|
| `quickbooks_customer_id` | `customers` | Link to the QuickBooks Customer record |
| `quickbooks_vendor_id` | `suppliers` | Link to the QuickBooks Vendor record |
| `quickbooks_item_id` | `products`, `materials` | Link to the QuickBooks Item record |
| `quickbooks_estimate_id` | `orders` | Link to the QuickBooks Estimate |
| `quickbooks_po_id` | `purchase_requests` | Link to the QuickBooks Purchase Order created from an approved request |
| `quickbooks_bill_id` | `grns` | Link to the QuickBooks Vendor Bill associated with a goods receipt |
| `quickbooks_invoice_id` | `orders` | Link to the QuickBooks Invoice raised for a finished/dispatched order |
| `quickbooks_sync_status` | every table above | Current sync state — see §5 |
| `quickbooks_last_sync_at` | every table above | Timestamp of the last successful or attempted sync |
| `quickbooks_sync_error` | every table above | Last error message, if `quickbooks_sync_status = ERROR` |

All ten columns are **nullable** in every case — a Factory Live record must be fully usable
operationally with every one of these columns empty, because Phase 1–3 run with no QuickBooks
connection at all.

---

## 5. Sync status model

| Status | Meaning | What triggers it |
|---|---|---|
| `NOT_SYNCED` | No attempt has been made to link this record to QuickBooks yet. Default state for every record created in Phase 1–3. | Record creation, before Phase 4 exists |
| `PENDING` | A sync has been queued or requested but not yet confirmed. | Operator or scheduled job requests a sync (Phase 4) |
| `SYNCED` | The Factory Live record and the QuickBooks record are linked and, as of `quickbooks_last_sync_at`, agreed. | Successful sync response from QuickBooks (Phase 4) |
| `ERROR` | The last sync attempt failed. | QuickBooks API error, validation failure, or mismatch detected (Phase 4) |
| `MANUAL_OVERRIDE` | A human has deliberately marked this record as not to be auto-synced (e.g. a one-off customer, a test item, a disputed match). | Explicit operator action |

### What an operator sees when a sync fails

- The affected record (e.g. an order, a GRN, a purchase request) shows a visible status badge —
  `ERROR` in the Down-red colour token defined in [`09-factory-live-drilldown.md`](09-factory-live-drilldown.md) — next to its
  QuickBooks reference field, not buried in a settings screen.
- Hovering or opening the record shows `quickbooks_sync_error` as plain text (the reason the sync
  failed) and `quickbooks_last_sync_at` (when it was last attempted), so the operator knows whether the
  problem is current or stale.
- **A sync error never blocks the operational workflow.** An order with `quickbooks_sync_status = ERROR`
  still proceeds through production, QC, packing and dispatch — the error is a finance/admin concern to
  resolve, not a production stoppage. This mirrors the ownership split in §2: the factory does not wait
  on the accounting system.
- Failed syncs are visible in aggregate on an administration screen (`/factory/admin/quickbooks`) so
  Accounts/Admin can see every record in `ERROR` or stale `PENDING` state and act on them, without every
  operator needing to notice individually.
- `quickbooks_sync_log` (see canonical tables list) records every attempt — success or failure — for
  audit purposes, independent of the current status shown on the parent record.

---

## 6. Explicit scope statement

> **No API calls are designed or built in this phase.** Everything in this document is a data-model
> and workflow specification for Phase 4. Phase 1–3 build and operate entirely without a QuickBooks
> connection; every reference column above stays `NULL` / `NOT_SYNCED` until Phase 4 begins.

### What must be decided before Phase 4 can be designed in detail

All of the following are `NEEDS CONFIRMATION` and are carried into
[`11-needs-confirmation.md`](11-needs-confirmation.md):

| Question | Why it matters |
|---|---|
| **QuickBooks edition** — Online vs Desktop | `NEEDS CONFIRMATION`. The API shape, authentication model, sync frequency and even which entities are addressable (see next row) differ completely between QuickBooks Online and QuickBooks Desktop/POS. This is the single biggest unknown for Phase 4 planning. |
| Whether Sales Orders are supported on the current plan/edition | `NEEDS CONFIRMATION`. Not all QuickBooks editions and subscription tiers expose Sales Orders as a distinct object; this affects the "Confirmed Order ↔ Sales Order / Estimate conversion" mapping in §3. |
| Currency | `NEEDS CONFIRMATION`. See item 19 in [`11-needs-confirmation.md`](11-needs-confirmation.md) — PKR is assumed from context but never printed on any source form. |
| Tax treatment | `NEEDS CONFIRMATION`. Which tax scheme applies (sales tax, GST, withholding), and whether Factory Live needs to be tax-aware at all, or whether tax is purely a QuickBooks-side concern applied at invoicing. |

### A specific flag on the QuickBooks edition question

> The factory machine that this discovery work was carried out from has a **QuickBooks POS SDK runtime
> already present on the PATH.** This is evidence — not proof — that a Desktop or Point-of-Sale
> QuickBooks product may be in use at Interconverters, rather than QuickBooks Online. Given the
> materially different integration approach each product requires, **the QuickBooks edition question
> above is tagged `NEEDS CONFIRMATION` rather than assumed to be QuickBooks Online**, and no Phase 4
> design decision should default to an Online-shaped integration until this is confirmed directly with
> Interconverters' Accounts function.

---

## 7. Cross-references

- Entity and reference-column definitions are reflected in the canonical schema at
  [`05-database-schema.md`](05-database-schema.md) §24–§25.
- Phase 4 scope and sequencing: [`10-migration-plan.md`](10-migration-plan.md).
- All open questions above are consolidated, classified and tracked to closure in
  [`11-needs-confirmation.md`](11-needs-confirmation.md).
