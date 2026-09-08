# 15 — Form Retirement Matrix

One row per legacy form (F1–F9), tracking exactly what must happen before each piece of paper is
allowed to stop being used. Fill what the evidence supports; dates are left blank for the factory to
complete; `NEEDS CONFIRMATION` marks anything not established by the source evidence.

Related: [`02-form-inventory.md`](02-form-inventory.md) (document control detail per form),
[`10-migration-plan.md`](10-migration-plan.md) §4 (the parallel-run mechanics referenced in the
Validation Criteria column), [`11-needs-confirmation.md`](11-needs-confirmation.md) (every open item
referenced below).

---

## Governing principle

> **A form is not retired merely because a digital screen exists.** It is retired only when the
> parallel run reconciles — the reconciliation tests defined in `10-migration-plan.md` §4 pass for a
> representative run — **and** an authorised person signs it off. A working digital screen is necessary
> but not sufficient.

Until that sign-off happens, the paper form remains the form of record, even if operators are also
using the digital screen day to day.

---

## The matrix

| Legacy Form | Document Number | Revision | Department | Current Owner | Digital Replacement | Digital Route | Parallel Run Required | Parallel Run Start | Parallel Run End | Validation Criteria | Approval Required | Approved By | Retirement Date | Paper Copy Still Required | Reason | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 — Elastic Costing / Construction Sheet | None (uncontrolled) | UNCONTROLLED | NEEDS CONFIRMATION (Costing/Merchandising inferred) | NEEDS CONFIRMATION | Product Costing (M2 Product & Costing) | `/factory/costing` | Yes | | | Digital costing sheet reproduces F1's verified formulas (`cost_per_mtr`, `total_per_mtr_cost`, `meter_in_per_kg`) for identical inputs; the non-reconciling `Per Kg = 439` figure ([`11-needs-confirmation.md`](11-needs-confirmation.md) NC-09) is resolved or explicitly excluded from the digital field set | Yes | | | No | Uncontrolled Excel sheet superseded by a live costing screen fed by canonical UOM conversions | Retiring an uncontrolled form does not trigger an ISO revision bump, but the NC-09 anomaly should be resolved before the digital sheet is treated as authoritative |
| F2 — Goods Receiving Entry Sheet | None (uncontrolled) | UNCONTROLLED | NEEDS CONFIRMATION (Store/Purchase inferred) | NEEDS CONFIRMATION | GRN (M4 Goods Receiving) | `/factory/grn` | Yes | | | Digital GRN captures every field F2 captures today, plus GRN number, lot reference and PO reference (`NEW per §7`); NC-15 (whether lots are recorded anywhere else) is resolved before the digital lot field is treated as complete | Yes | | | No | Digital GRN adds lot/PO/GRN-number capture F2 never had — a functional improvement, not pure digitisation | Preserve the header/line structure: one vehicle arrival = one serial number = many article lines |
| F3 — Monthly Goods Receiving Summary | None (uncontrolled) | UNCONTROLLED | NEEDS CONFIRMATION (Store/Accounts inferred) | NEEDS CONFIRMATION | Generated GRN monthly summary (M5 Stock & Lots, sourced from `grns` / `stock_ledger`) | `/factory/stock/daily-report` (aggregated to month view) | Yes | | | Digital monthly summary **regenerates F3's exact figures** from digital GRN records — cited proof this is achievable: F3 reconciles to F2 exactly (43 + 24 + 100 = 167 for Fintex(32); 2,900 + 1,440 = 4,340 for Empty Carton) | Yes | | | No | F3 is a derived roll-up, not a source document — in the digital system it must be GENERATED, never keyed | Title "For Z&Z Production" ties directly to NC-13, now RESOLVED (dual vendor/customer role, `TOLL_MANUFACTURING`/`CUSTOMER_OWNED` default) — retirement may proceed once the parallel-run reconciliation criterion to the left is also met |
| F4 — Daily Stock Report | None (uncontrolled) | UNCONTROLLED | NEEDS CONFIRMATION (Store/Production inferred) | NEEDS CONFIRMATION (signed by Bilal, Haroon and a Chief Financial Officer per the sample — see NC-21) | Stock Ledger daily report (M5 Stock & Lots) | `/factory/stock/daily-report` | Yes | | | Digital `BALANCE = OPENING + PRODUCTION − DISPATCH` matches F4's balance exactly, per item, per day, across the parallel-run window; the unit (rolls, NC-17) is confirmed | Yes | | | No | Same ledger as F8, viewed differently — becomes a live query rather than a manually reconciled sheet | F4's final `BALANCE` column is the source for opening-balance capture at cutover (see [`10-migration-plan.md`](10-migration-plan.md) §3) |
| F5 — Daily Production Report (**IC-FM-01**) | IC-FM-01 | Rev 00 (Issue 01, Issue Date 01/03/2024) | Production | NEEDS CONFIRMATION (Prepared By / Reviewed By signatories not named in the sampled scan) | Production Entry + Daily Production Report (M6 Production & Factory Live) | `/factory/production/entry` ; `/factory/production/daily-report` | Yes | | | Digital shift totals match IC-FM-01's own subtotal rows exactly, across the parallel-run window | Yes — ISO document-control revision bump, this is a **controlled** form | | | NEEDS CONFIRMATION | Controlled form; retirement is a document-control change, not a silent deletion | Carried six of the seven original BLOCKING items (NC-02, NC-03, NC-07, NC-08, NC-14, plus the shift-naming item NC-10) — **all now RESOLVED**; retirement may proceed once the parallel-run reconciliation criterion to the left is also met, though NC-28 (which legacy numbers are the warp-knitting machines) should be settled before treating the digital machine assignment on this form's replacement as authoritative |
| F6 — Gate Pass (**IC-FM-02**) | IC-FM-02 | Rev 00 (Issue 01, Issue Date 01-03-2024) | NEEDS CONFIRMATION (Security/Dispatch inferred) | NEEDS CONFIRMATION | Gate Pass (M9 Dispatch & Gate Pass) | `/factory/gate-pass` | Yes | | | Digital gate-pass record matches the printed/signed copy for the same vehicle movement; printed output confirmed legible and signable at the gate | Yes — ISO document-control revision bump, this is a **controlled** form | | | **Yes — see "Forms that must not be retired" below** | Digitisation adds searchability and an audit trail, but does not by itself satisfy physical gate-security requirements | Do not treat this form as fully retirable even after parallel-run sign-off — see dedicated section |
| F7 — Purchase Request (**IC-FM-04**) | IC-FM-04 | Rev 00 (Issue 01, Issue Date 01-03-2024) | Purchase | NEEDS CONFIRMATION | Purchase Request (M3 Purchase Request) | `/factory/purchase-requests` | Yes | | | All four approval levels — Prepared By, Checked by, Preapproved by, Approved By — are preserved and enforced in the digital workflow exactly as on the paper form | Yes — ISO document-control revision bump, this is a **controlled** form | | | No | Four-level approval chain must be proven equivalent, not simplified, before paper is retired | Source form sampled blank (no live data) — validation must be proven against a real purchase request during the parallel run |
| F8 — Stock Register (**IC-FM-05**) | IC-FM-05 | Rev 00 (Issue 01, Issue Date 01-03-2024) | NEEDS CONFIRMATION (Store inferred) | NEEDS CONFIRMATION | Stock Register per-product view (M5 Stock & Lots) | `/factory/stock/register/:productId` | Yes | | | Per-product digital card balance matches the paper F8 card balance across the parallel-run window; the scope question (NC-11 — raw material, finished goods, or both) is resolved | Yes — ISO document-control revision bump, this is a **controlled** form | | | No | Same underlying ledger as F4, viewed as a per-product running card — becomes a filtered view of the same stock ledger | Resolve NC-11 before validating retirement, since the digital replacement must be proven for whichever scope is confirmed |
| F9 — Elastic Order Booking / Processing Form | None (uncontrolled) | UNCONTROLLED | NEEDS CONFIRMATION (Sales/Merchandising inferred) | NEEDS CONFIRMATION | Order Booking (M1 Order Booking) | `/factory/orders` | Yes | | | Digital order record captures every field on both pages of F9, including the QC sampling clause modelled as a configured `qc_plan_rules` entry, not free text; NC-16 threshold ambiguity is resolved | Yes | | | No — but see note | Two-page paper form consolidates into a single digital order-booking screen | The Authorization block's signed customer confirmation is a customer-facing acknowledgement; whether a digital acceptance flow is an adequate substitute is a product decision outside this pack, not introduced here as a new open item |

---

## ISO document control

Four of the nine forms are **controlled documents** with a document number, issue number, issue date
and revision (F5/IC-FM-01, F6/IC-FM-02, F7/IC-FM-04, F8/IC-FM-05). The remaining five (F1, F2, F3, F4,
F9) are uncontrolled Excel/Word sheets with no document number at all.

For every controlled form:

- **The IC-FM-* number and its full revision history must be preserved on the digital replacement.**
  The digital screen is not a new, uncontrolled artefact just because it happens to be software — it is
  the next revision of the same controlled document.
- **Retiring a controlled form is a document-control change, requiring a formal revision bump (e.g.
  IC-FM-01 moving from Rev 00 to Rev 01, with the revision noting "superseded by digital Production
  Entry screen"), not a silent deletion.** The paper form's issue history does not disappear from the
  quality system merely because data entry moves to a screen.
- The `Approval Required` and `Approved By` columns above apply in full to these four forms — sign-off
  must come from whoever holds document-control authority under Interconverters' quality system (see
  NC-21 in [`11-needs-confirmation.md`](11-needs-confirmation.md) for the real-person-to-role mapping
  this depends on), not merely from a project stakeholder.
- IC-FM-03 does not appear in this matrix because it is not present in the scanned form pack — see
  NC-01 in [`11-needs-confirmation.md`](11-needs-confirmation.md). If IC-FM-03 turns out to be an active
  controlled form once confirmed, it must be added to this matrix before its digital replacement (if
  any) can be planned.

For the five uncontrolled forms, retirement is a simpler operational sign-off (the parallel run still
applies in full — see the matrix above) but does not require a formal document-control revision, since
no revision history exists to preserve.

---

## Forms that must NOT be retired

### Gate Pass (IC-FM-02)

The Gate Pass is a **physical control at the factory gate**, not only a data-capture form. Even after
its digital replacement (`/factory/gate-pass`) is fully built, validated through a parallel run, and
signed off:

> **A printed, physically signed Gate Pass copy is still required for vehicle gate security.** Security
> personnel at the gate need a document a driver can be handed, a security guard can inspect and retain,
> and that does not depend on a screen, a login, or connectivity being available at the gate at the
> moment a vehicle enters or leaves.

This means the digital Gate Pass module should be designed from the outset to **produce a printable
output**, not to replace the physical copy — digitisation here adds a searchable record and an audit
trail behind the paper, it does not remove the paper.

**Whether this is a strict legal/security requirement (e.g. mandated by a specific security policy or
regulation) or simply current practice that could be changed with proper controls is `NEEDS
CONFIRMATION`.** Do not assume either answer: confirm with whoever is responsible for site security
before deciding whether the printed copy remains permanently mandatory or could eventually be replaced
by a digital-only record under stricter gate controls (e.g. a scanned QR code checked against the
system). Until that confirmation exists, this pack's working assumption is that the printed copy stays.

---

## Cross-references

- Parallel-run mechanics and reconciliation tests cited in the Validation Criteria column:
  [`10-migration-plan.md`](10-migration-plan.md) §4.
- Every `NEEDS CONFIRMATION` and `NC-xx` reference above is tracked to closure in
  [`11-needs-confirmation.md`](11-needs-confirmation.md).
- Full document-control detail per form (issue numbers, dates, bilingual labels where applicable):
  [`02-form-inventory.md`](02-form-inventory.md).
