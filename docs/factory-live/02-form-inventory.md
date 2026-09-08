# 02 — Form Inventory

**Deliverable B.** The master register of all nine forms found in the scanned pack, their document
control status, and how the derived forms relate to their source. See
[00-README.md](00-README.md) for the status legend.

---

## 1. Master form table

| ID | PDF page | Form name | Document number | Issue # | Issue date | Revision | Format | Department¹ | Sample | Purpose |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 1 | Elastic Costing / Construction Sheet | — (none) | — | — | — | Excel | Costing / Estimation | Filled | Computes per-metre cost of an elastic construction from its yarn/rubber/overhead composition |
| F2 | 2 | Goods Receiving Entry Sheet | — (none) | — | — | — | Excel | Stores / Warehouse | Filled | Logs each vehicle arrival and the article lines it delivers |
| F3 | 3 | Monthly Goods Receiving Summary | — (none) | — | — | — | Excel | Stores / Warehouse | Filled | Month-end roll-up of F2 receipts by article and supplier |
| F4 | 4 | Daily Stock Report | — (none) | — | — | — | Excel | Stores / Accounts | Filled | Daily all-item snapshot of opening, production, dispatch and balance |
| F5 | 5 | Daily Production Report | `IC-FM-01` | 01 | 01/03/2024 | 00 | Controlled print | Production | Filled | Per-machine, per-shift, per-day production log |
| F6 | 6 | Gate Pass | `IC-FM-02` | 01 | 01-03-2024 | 00 | Controlled print | Stores / Dispatch / Security | Blank | Authorises goods movement off site, returnable or non-returnable |
| F7 | 7 | Purchase Request | `IC-FM-04` | 01 | 01-03-2024 | 00 | Controlled print | Purchasing / Procurement | Blank | Requests and approves purchase of an item through four sign-off levels |
| F8 | 8 | Stock Register | `IC-FM-05` | 01 | 01-03-2024 | 00 | Controlled print | Stores / Warehouse | Blank | Per-product running ledger card of opening, production, dispatch and balance |
| F9 | 9–10 | Elastic Order Booking / Processing Form | — (none) | — | — | — | Word | Sales / Order Processing | Filled | Captures customer order, product specification, delivery requirement and QC authorisation |

¹ No form in the scanned pack prints a department name. Department is inferred from the form's
evident purpose and is tagged `NEEDS CONFIRMATION` in full, even where not repeated on every row.

## 2. Nine forms, not ten

The originating brief lists ten document items. The scan resolves to **nine distinct forms**
because PDF pages 9 and 10 are `Pg # 1 of 2` and `Pg # 2 of 2` of the single F9 Elastic Order
Booking / Processing Form — page 2 carries the "Additional Requirements" (cutting/packaging) and
"Delivery Information" content, which is what the brief's separate line item referred to. There is
no tenth form in the pack.

## 3. Document control status

| Doc # | Form | Status |
|---|---|---|
| `IC-FM-01` | F5 — Daily Production Report | **CONTROLLED** — document number, issue #, issue date and revision all printed |
| `IC-FM-02` | F6 — Gate Pass | **CONTROLLED** |
| `IC-FM-03` | — | **ABSENT FROM THE SCANNED PACK.** No form in the pack carries this document number. Tagged `NEEDS CONFIRMATION` — see [11-needs-confirmation.md](11-needs-confirmation.md) |
| `IC-FM-04` | F7 — Purchase Request | **CONTROLLED** |
| `IC-FM-05` | F8 — Stock Register | **CONTROLLED** |
| — | F1 — Elastic Costing / Construction Sheet | **UNCONTROLLED** — no document number, Excel |
| — | F2 — Goods Receiving Entry Sheet | **UNCONTROLLED** — no document number, Excel |
| — | F3 — Monthly Goods Receiving Summary | **UNCONTROLLED** — no document number, Excel |
| — | F4 — Daily Stock Report | **UNCONTROLLED** — no document number, Excel |
| — | F9 — Elastic Order Booking / Processing Form | **UNCONTROLLED** — no document number, Word |

**Four of the nine forms are formally controlled** (`IC-FM-01`, `02`, `04`, `05`); **five run as
plain Excel or Word sheets** with no document number, issue tracking, or revision history (F1, F2,
F3, F4, F9). The document numbering sequence has a gap at `IC-FM-03`, which is not represented
anywhere in the scanned pack — it is not possible to state from this evidence whether `IC-FM-03`
was never issued, covers a form not included in this scan, or has been retired. This is a plain
`NEEDS CONFIRMATION` item, not resolved here.

## 4. Legacy form reference preservation

All four `IC-FM-*` document numbers found in the pack (`IC-FM-01`, `IC-FM-02`, `IC-FM-04`,
`IC-FM-05`) are preserved as **legacy document references** on their digital replacements, so that
existing ISO document control (numbering, issue, revision history) is not broken by the move to a
digital system. Concretely, each digital screen or record type that replaces a controlled form
carries the source `IC-FM-*` number, issue number and revision as metadata, rather than starting a
fresh, disconnected numbering scheme. This is expanded per-form in
[15-form-retirement-matrix.md](15-form-retirement-matrix.md), which governs when a paper form may
actually stop being used alongside its digital replacement.

## 5. Derived vs source documents

### F3 is derived from F2 — not a source document

F3 (Monthly Goods Receiving Summary) presents as a standalone Excel sheet, but every row in the
June sample ties back to F2 (Goods Receiving Entry Sheet) detail lines with an exact numeric match:

```
F2 Fintex(32) rows: 43 + 24 + 100 = 167  -> F3 row 1  EXACT MATCH
F2 Rubber(38):                       74  -> F3 row 2  EXACT MATCH
F2 Thread Polyester (China):         53  -> F3 row 3  EXACT MATCH
F2 Gatron 300/96-YDPS-071NA-PO:     200  -> F3 row 4  EXACT MATCH
F2 Empty Carton: 2900 + 1440 =     4340  -> F3 row 5  EXACT MATCH
```

In the current paper process, this roll-up is produced by a person re-tallying F2's detail lines by
hand each month — a re-keying step, not a calculation performed against F2. In the digital system
F3's role must be **generated, never keyed**: a query over the goods-receiving detail (see
`grn_lines` in [05-database-schema.md](05-database-schema.md)), not a data-entry screen of its own.
See [12-field-mapping-matrix.md](12-field-mapping-matrix.md) §F3 for the field-level mapping.

The F3 title, `Summary Report Month Of June Goods Receiving For Z&Z Production`, names Z&Z
specifically even though Gatron also appears as a supplier in the underlying F2 data. The nature of
the Z&Z / Gatron relationship (are both simply suppliers, or is one a tolling/consignment
relationship to the other) is `NEEDS CONFIRMATION` and is not resolved by this pack.

### F4 and F8 are two views of the same ledger

F4 (Daily Stock Report) and F8 (Stock Register) carry an identical column set — `Opening Stock /
Production / Dispatch / Balance` — applied at two different grains:

- **F4** is a **daily, all-item snapshot**: one row per product, refreshed each day, covering the
  whole item catalogue on one sheet.
- **F8** is a **per-product running card**: one register sheet per product (per the form's own
  `Product Name:` / `Supplier Name:` header), accumulating a continuous history for that one item.

Both are reading the same underlying stock movement from two angles. In the digital design, both
become queries over a single append-only `stock_ledger` (see
[05-database-schema.md](05-database-schema.md) §6–7) rather than two independently maintained
sheets that must be reconciled by hand. `NEEDS CONFIRMATION`: whether F8 in practice is used for raw
material, finished goods, or both — its header carries both `Product Name` and `Supplier Name`
(suggesting raw material) while its columns say `Production` (suggesting finished goods or WIP).

---

Next: [03-field-extraction.md](03-field-extraction.md) for every field on every form, or
[12-field-mapping-matrix.md](12-field-mapping-matrix.md) for where each field lands in the digital
schema.
