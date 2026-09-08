# 03 — Field Extraction

**Deliverable C.** Every field on every form (F1–F9), verbatim, with real sample values, a
classification, and a confidence tag. This is the most detailed file in the pack — it is the basis
for [12-field-mapping-matrix.md](12-field-mapping-matrix.md) and the schema in
[05-database-schema.md](05-database-schema.md).

**Legend** (full definitions in [00-README.md](00-README.md)):

| Tag | Meaning |
|---|---|
| `CONFIRMED` | Read directly off a scanned form, or verified by reconciling arithmetic |
| `INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION` | Reconciles mathematically; business meaning not yet confirmed by Interconverters |
| `NEEDS CONFIRMATION` | Unknown. Not guessed |

**Classification** is one of `MASTER`, `TRANSACTION`, `DERIVED`, `APPROVAL`, `METADATA`.

Original spellings are preserved exactly as scanned, including `Vechile #`, `Machine Fault Baring`,
`World Flex Thialand`, `300 Danier`, `Column1`, `Column2`, and the bilingual Urdu labels on F1.

---

## F1 — Elastic Costing / Construction Sheet

Sheet title: `6 TAR SINGLE 38 RUBBER  500/1000 MTR`. Machine reference printed top-left: `MCH 13`.
No document number; Excel; bilingual English/Urdu labels.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| Sheet title | `6 TAR SINGLE 38 RUBBER  500/1000 MTR` | Text | Product/article identifier for this costing sheet | MASTER | CONFIRMED |
| Machine reference (`MCH 13`) | `MCH 13` | Text/code | Legacy machine number this costing sheet is associated with | MASTER | CONFIRMED (value read directly; whether this numbering matches F5's `MACH NO` population is separately `NEEDS CONFIRMATION` — see §"Unknown" under F5) |
| Elastic wt Gr / الاسٹک وزن (composition block) | 5.97 | Numeric (grams) | Total elastic weight per metre — the 100% composition base | MASTER | CONFIRMED |
| — % (composition block) | 100% | Numeric (%) | Composition baseline | DERIVED | CONFIRMED |
| Order Quantity (column heading to the right of the composition block) | *(blank in this sample)* | Numeric | Quantity for the specific order tied to this costing sheet | TRANSACTION | NEEDS CONFIRMATION (field exists on the sheet but is unpopulated in the scanned sample) |
| Rubber Gr / ربڑ کا وزن | 2.91 | Numeric (grams) | Grams of rubber per metre | MASTER | CONFIRMED |
| Rubber Gr % | 49% | Numeric (%) | `2.91 / 5.97 = 48.7% → 49%` | DERIVED | CONFIRMED |
| 150/0 Gr / دھاگہ کا وزن | 1.16 | Numeric (grams) | Grams of 150-denier yarn per metre | MASTER | CONFIRMED |
| 150/0 Gr % | 19% | Numeric (%) | | DERIVED | CONFIRMED |
| 300/0 Gr / دھاگہ کا وزن | 1.89 | Numeric (grams) | Grams of 300-denier yarn per metre | MASTER | CONFIRMED |
| 300/0 Gr % | 32% | Numeric (%) | | DERIVED | CONFIRMED |
| Total Rubber % / ٹوٹل ربڑ کا | 2.91 / 49% | Numeric | Totals-block restatement of rubber weight and share | DERIVED | CONFIRMED |
| Total Yarn % / ٹوٹل دھاگہ کا وزن | 3.05 / 51% | Numeric | Totals-block restatement of combined yarn weight and share | DERIVED | CONFIRMED |
| Elastic wt Gr / الاسٹک وزن (totals block) | 5.96 / 100% | Numeric | Totals-block restatement of total elastic weight — note this is 5.96, not the 5.97 in the composition block, a rounding artefact between the two blocks | DERIVED | CONFIRMED |
| Yarn Price (دھاگہ کا ریٹ) — Per Lbs | 250 | Numeric (currency/lb) | Price of yarn per pound | MASTER | CONFIRMED |
| Yarn Price — Per Kg | 550 | Numeric (currency/kg) | Price of yarn per kilogram | MASTER | CONFIRMED |
| Yarn Price — Per Mtr | 1.68 | Numeric (currency/m) | `3.05 g × 550 / 1000 = 1.6775 → 1.68` | DERIVED | CONFIRMED |
| Rubber (ربڑ کا ریٹ) — Per Lbs | 680 | Numeric (currency/lb) | Price of rubber per pound | MASTER | CONFIRMED |
| Rubber — Per Kg | 1500 | Numeric (currency/kg) | Price of rubber per kilogram | MASTER | CONFIRMED |
| Rubber — Per Mtr | 4.37 | Numeric (currency/m) | `2.91 g × 1500 / 1000 = 4.365 → 4.37` | DERIVED | CONFIRMED |
| Over Head (اوور ہیڈ) — Per Kg | 2500 | Numeric (currency/kg) | Overhead cost rate per kilogram | MASTER | CONFIRMED |
| Over Head — Per Mtr | 14.93 | Numeric (currency/m) | `5.97 g × 2500 / 1000 = 14.925 → 14.93` | DERIVED | CONFIRMED |
| Total (ٹوٹل) — Per Kg | **439** | Numeric | Printed total that does not tie to any other cell on the sheet | DERIVED | **NEEDS CONFIRMATION — does not reconcile, see arithmetic block below** |
| Total — Per Mtr | 20.97 | Numeric (currency/m) | `1.68 + 4.37 + 14.93 = 20.98 → 20.97` (rounding) | DERIVED | CONFIRMED |
| Wastage (ویسٹیج) — Per Lbs | 2% | Numeric (%) | Wastage allowance rate | MASTER | CONFIRMED |
| Wastage — Per Mtr | 0.42 | Numeric (currency/m) | `2% × 20.97 = 0.419 → 0.42` | DERIVED | CONFIRMED |
| Total per Mtr Cost (ٹوٹل) *(highlighted)* | 21.39 | Numeric (currency/m) | `20.97 + 0.42 = 21.39` | DERIVED | CONFIRMED |
| Meter In Per Kg | 168 | Numeric (m/kg) | `1000 / 5.96 = 167.8 → 168` | DERIVED | CONFIRMED |
| Amount In Per Kg *(highlighted)* | 3,582 | Numeric (currency/kg) | `21.39 × 168 ≈ 3,594` vs printed `3,582` — close but not exact, attributable to unrounded intermediate inputs | DERIVED | CONFIRMED |

### F1 — verified arithmetic (verbatim from source evidence)

```
cost_per_mtr(component) = grams_per_mtr × price_per_kg / 1000
    yarn:     3.05 × 550  / 1000 = 1.6775  -> 1.68   OK
    rubber:   2.91 × 1500 / 1000 = 4.365   -> 4.37   OK
    overhead: 5.97 × 2500 / 1000 = 14.925  -> 14.93  OK
total_per_mtr_before_wastage = 1.68 + 4.37 + 14.93 = 20.98 -> 20.97  OK (rounding)
wastage_per_mtr    = 2% × 20.97 = 0.419 -> 0.42   OK
total_per_mtr_cost = 20.97 + 0.42 = 21.39          OK
meter_in_per_kg    = 1000 / 5.96 = 167.8 -> 168    OK
amount_in_per_kg   = 21.39 × 168 ≈ 3,594 vs printed 3,582 (unrounded inputs)  OK
rubber_pct = 2.91 / 5.97 = 48.7% -> 49%   OK
yarn_pct   = 3.05 / 5.96 = 51.2% -> 51%   OK
```

**DOES NOT RECONCILE — NEEDS CONFIRMATION:** the `Total` row `Per Kg` cell = **439**. It does not
tie to 550/1500/2500 nor to 20.97/21.39. Meaning unknown. Not guessed here.

---

## F2 — Goods Receiving Entry Sheet

Header band: `INTER CONVERTER PVT LTD.` / `GOODS RECEIVING ENTRY SHEET`. No document number; Excel.
Structure: one vehicle arrival = one serial number = many article lines (header/line model).
Sample values below are taken from Serial #2 (Z&Z Packages, 03/06/2025) unless noted.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| Serial # | 2 | Numeric (integer) | Sequential entry number per vehicle arrival | TRANSACTION | CONFIRMED |
| DATE | 03/06/2025 | Date | Date goods received | TRANSACTION | CONFIRMED |
| Time | `-` (blank in this row; `1:00` appears on Serial #3) | Time | Time goods received | TRANSACTION | CONFIRMED (field present, inconsistently populated) |
| Supplier | Z&Z Packages | Text | Supplier / vendor name | MASTER | CONFIRMED |
| Driver Name | Ramzan | Text | Driver's name for this delivery | TRANSACTION | CONFIRMED |
| `Vechile #` *(sic — verbatim form spelling)* | JW-2172 | Text/code | Vehicle registration number | TRANSACTION | CONFIRMED |
| Article | Rubber Fintex(32) | Text | Material/article description received | MASTER | CONFIRMED |
| QTY | 43 | Numeric | Quantity of the article (unit implied by article type — pieces, cones, etc.) | TRANSACTION | CONFIRMED |
| Total Weight | 1075 Kg | Numeric (kg) | Total weight of the article received | TRANSACTION | CONFIRMED |
| Per Cone Wt | 25 | Numeric | Weight per cone/unit | TRANSACTION | CONFIRMED |
| Remarks | Rcvd From Z&Z | Text (free) | Free-text note on the receipt | METADATA | CONFIRMED |

**Fields that do not exist on this form today** (all tagged `NEW per §7` — see §"Fields added in
the digital system" below): GRN number, Supplier Lot, Internal Lot, PO Reference, QuickBooks PO
Reference, Received By, Checked By. The absence of lot capture today is the specific reason
traceability cannot be back-dated for goods already received. `NEEDS CONFIRMATION`: whether lot
numbers are recorded anywhere else at all, outside this pack.

---

## F3 — Monthly Goods Receiving Summary

Title: `Summary Report Month Of June Goods Receiving For Z&Z Production`. No document number;
Excel. This is a **derived** report — see [02-form-inventory.md](02-form-inventory.md) §5 for the
full reconciliation proof against F2.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| Serial # | 1 | Numeric (integer) | Row sequence | METADATA | CONFIRMED |
| Article # | Rubber | Text | Material category | MASTER | CONFIRMED |
| Count | 32 (also `38`, `150 Polyester`, `300 Danier`, `Empty Metal Free` on other rows) | Text/numeric (mixed) | Material sub-type or specification — preserve `300 Danier` spelling verbatim | MASTER | CONFIRMED |
| Supplier | Fintex (also `World Flex Thialand` *(sic)*, `China`, `Gatron`, `Z&Z` on other rows) | Text | Supplier name, sometimes abbreviated relative to F2's full name | MASTER | CONFIRMED |
| Rcvd | 167 | Numeric | Total quantity received for the month, for this article | DERIVED | CONFIRMED — verified exact match against summed F2 detail lines (see reconciliation below) |

### F3 — reconciliation against F2 (verbatim from source evidence)

```
F2 Fintex(32) rows: 43 + 24 + 100 = 167  -> F3 row 1  EXACT MATCH
F2 Rubber(38):                       74  -> F3 row 2  EXACT MATCH
F2 Thread Polyester (China):         53  -> F3 row 3  EXACT MATCH
F2 Gatron 300/96-YDPS-071NA-PO:     200  -> F3 row 4  EXACT MATCH
F2 Empty Carton: 2900 + 1440 =     4340  -> F3 row 5  EXACT MATCH
```

`NEEDS CONFIRMATION`: the nature of the Z&Z / Gatron relationship implied by the report title.

---

## F4 — Daily Stock Report

Header: `INTERCONVERTER (PVT) LIMITED` / `DAILY STOCK REPORT` / `Date:- 23/06/2025`. No document
number; Excel. Sample row values below are taken from row 4 (`6 Taar Double 32 R 500 M`).

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| Date:- | 23/06/2025 | Date | Report date | TRANSACTION | CONFIRMED |
| S. # | 4 | Numeric (integer) | Row sequence | METADATA | CONFIRMED |
| ITEM NAME | `6 Taar Double 32 R 500 M` | Text (encoded) | Encodes Taar count + Single/Double construction + rubber count (`32R`) + roll length (`500 M`) in one string | MASTER | CONFIRMED |
| OPENING STOCK | 299 | Numeric | Stock at start of day | TRANSACTION | CONFIRMED |
| PRODUCTION | 68 | Numeric | Quantity produced that day for this item | TRANSACTION | CONFIRMED |
| DISPATCH | 0 | Numeric | Quantity dispatched that day | TRANSACTION | CONFIRMED |
| BALANCE | 367 | Numeric | `OPENING STOCK + PRODUCTION − DISPATCH` — verified `299 + 68 − 0 = 367` | DERIVED | CONFIRMED |
| REMARKS | *(blank on the sampled rows)* | Text (free) | Free note | METADATA | CONFIRMED (column present, blank in this sample) |
| Footer: `Day ( A & N )` | 0 | Numeric | Day-shift production subtotal, keyed by shift-letter codes `A` and `N` | DERIVED | NEEDS CONFIRMATION (arithmetic sums correctly; meaning of the `A`/`N` grouping is unconfirmed — see §"Shift evidence" below) |
| Footer: `Night ( N & Z )` | 68 | Numeric | Night-shift production subtotal, keyed by shift-letter codes `N` and `Z` | DERIVED | NEEDS CONFIRMATION |
| Footer: `Total` | 68 | Numeric | `0 + 68 = 68` | DERIVED | CONFIRMED (the sum itself is correct; the day/night categorisation feeding it is `NEEDS CONFIRMATION`) |
| Signature: Chief Financial officer | *(signed)* | Signature | Approving signatory | APPROVAL | CONFIRMED |
| Signature: Bilal | *(signed)* | Signature | Named signatory | APPROVAL | CONFIRMED |
| Signature: Haroon | *(signed)* | Signature | Named signatory | APPROVAL | CONFIRMED |

`NEEDS CONFIRMATION`: the unit of the BALANCE column is not stated on the form; it strongly appears
to be rolls but this is not confirmed.

---

## F5 — Daily Production Report (`IC-FM-01`, controlled)

`DOCUMENT # IC-FM-01` | `ISSUE # 01` | `ISSUE DATE 01/03/2024` | `Rev : 00`. Header: `INTER
CONVERTERS PVT. LTD.` / `Interlooping quality fabric`. `Date : 21-June-2025`. Sample values below
are taken from the "Awias Day" group, machine 8 row, unless noted.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| DOCUMENT # | IC-FM-01 | Text/code | Controlled-form document number | METADATA | CONFIRMED |
| ISSUE # | 01 | Numeric | Document issue number | METADATA | CONFIRMED |
| ISSUE DATE | 01/03/2024 | Date | Document issue date | METADATA | CONFIRMED |
| Rev | 00 | Numeric/code | Document revision | METADATA | CONFIRMED |
| Date : | 21-June-2025 | Date | Production report date | TRANSACTION | CONFIRMED |
| NAME | `Awias Day` | Text (concatenated) | Operator name concatenated with shift (`operator + shift`) | MASTER/TRANSACTION | CONFIRMED as printed; splits into `operator_id` + `shift_id` digitally |
| Column2 | `6 Taar Double` | Text | Article / product description for this machine row (matches F4 `ITEM NAME` and F9 `Product Description` vocabulary) | MASTER | **INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION** |
| MACH NO | 8 | Numeric/code | Machine number (legacy numbering, range 1–17 observed) | MASTER | CONFIRMED (value); relationship to the 6 × 24-needle machines is separately `NEEDS CONFIRMATION` |
| Taar | 6 | Numeric | Ends/tapes per unit (apparent) | MASTER | NEEDS CONFIRMATION — meaning and relation to `STRIP` unknown |
| SHIFT TIME | `12 hours` | Text/duration | Length of the shift | MASTER | CONFIRMED (value); mapping into a shift master is `NEEDS CONFIRMATION` — see §"Shift evidence" |
| RUBBER | 32 | Numeric | Rubber count/denier code | MASTER | CONFIRMED |
| machine speed | 400 | Numeric | Machine running speed | MASTER | **NEEDS CONFIRMATION — unit unknown (RPM? courses/min? m/hr?)** |
| PLY | 600 | Numeric | Ply parameter | MASTER | **NEEDS CONFIRMATION — 600 is implausibly high for a ply count; meaning/unit unknown** |
| GAUGE | 15 (also 12 on other rows) | Numeric | Gauge parameter | MASTER | **NEEDS CONFIRMATION — meaning/unit unknown (needle gauge? gauge per inch?)** |
| STRIP | 40 (also 34/30/20/10 on other rows) | Numeric | Apparent count of parallel tapes produced per machine | MASTER | **NEEDS CONFIRMATION — whether a machine attribute or an article attribute is unknown** |
| G.WT/MTR | 5.6 | Numeric (grams) | Gross weight per metre | MASTER | CONFIRMED (cross-referenced against the F1/F9 weight-per-metre family — see [01-current-state-process-map.md](01-current-state-process-map.md) §3) |
| Column1 | 1.4 | Numeric | Kilograms per strip (inferred) | DERIVED | **INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION** |
| TOTAL METER PER STRIP | 280 | Numeric (m) | Metres produced per strip | TRANSACTION | CONFIRMED |
| PER MACHINE KG | 56.00 | Numeric (kg) | `Column1 × STRIP` — verified `1.40 × 40 = 56.00` | DERIVED | CONFIRMED |
| TOTAL METER | 11,200 | Numeric (m) | `TOTAL METER PER STRIP × STRIP` — verified `280 × 40 = 11,200` | DERIVED | CONFIRMED |
| WASTAGE | *(empty on every row in this sample)* | Numeric (expected) | Wastage quantity | TRANSACTION | NEEDS CONFIRMATION — whether recorded in practice is unknown |
| REMARKS | `Machine Fault Baring` *(sic — printed spelling; read as "Bearing")* | Text (free), doubling as an informal downtime log | Free note; observed values listed under §"Downtime reason seed list" below | METADATA/TRANSACTION | CONFIRMED (values observed); the column's use as a downtime log is structurally unconfirmed |
| PR STRIP AMOUNT | 406 | Numeric | Possibly a piece-rate wage amount per strip; may have payroll implications if so | TRANSACTION | **NEEDS CONFIRMATION — meaning unknown** |
| TOTAL (subtotal row per NAME group) | e.g. Awias Day group: `TOT M/STRIP=1320`, `PER MACH KG=257.10`, `TOTAL METER=51,420`, `PR STRIP AMT=1,914` | Numeric | Per-operator, per-shift subtotal row | DERIVED | CONFIRMED for `TOT M/STRIP`, `PER MACH KG` and `TOTAL METER` (arithmetic verified against the group's rows below); `PR STRIP AMT` total is printed as-is, not independently re-verified here |
| Prepared By (footer) | *(signed)* | Signature | Preparer of the report | APPROVAL | CONFIRMED |
| Reviewed By (footer) | *(signed)* | Signature | Reviewer of the report | APPROVAL | CONFIRMED |

### F5 — verified arithmetic across 9 non-zero rows (verbatim from source evidence)

```
TOTAL METER = TOTAL METER PER STRIP × STRIP
    230 × 34 = 7,820   OK    280 × 40 = 11,200  OK    270 × 40 = 10,800  OK
    290 × 40 = 11,600  OK    250 × 40 = 10,000  OK
    116 × 40 = 4,640 vs 4,635  OK (rounding)
     98 × 30 = 2,940 vs 2,941  OK (rounding)

PER MACHINE KG = Column1 × STRIP
    1.15 × 34 = 39.10  OK    1.40 × 40 = 56.00  OK    1.35 × 40 = 54.00  OK
    1.45 × 40 = 58.00  OK    1.25 × 40 = 50.00  OK    0.65 × 40 = 26.00  OK
    0.55 × 30 = 16.50  OK
```

Therefore:
- `Column1` = **kilograms per strip** — tag `INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION`
- `Column2` = **article / product description** — tag `INFERRED FROM ARITHMETIC — NEEDS
  CONFIRMATION` (Column2 holds `6 Taar Double`, `7 Taar`, `13 Taar`, `8 Tar`, `26 Tar 5 CM` — these
  match the `ITEM NAME` values on F4 and the `Product Description` on F9)

These two inferences reconcile mathematically across every non-zero row in the sample. They are
presented here precisely so a reviewer at Interconverters can accept or reject the inferred meaning
on the evidence, not so the pack can treat them as settled.

### F5 — plain `NEEDS CONFIRMATION` fields (meaning unknown, not guessed)

`machine speed` (400), `PLY` (600), `GAUGE` (15/12), `STRIP`, `Taar`, `PR STRIP AMOUNT`, the empty
`WASTAGE` column, and the question of whether `MACH NO` 1–17 is the same population as the 6 ×
24-needle warp-knitting machines referenced elsewhere in the brief. None of these are resolved by
this pack — see [11-needs-confirmation.md](11-needs-confirmation.md).

### F5 — observed REMARKS values

`Machine Man Absent` | `Machine Off` | `Machine Fault Baring` | `Article Change` — carried forward
into §"Downtime reason seed list" below.

### F5 — structure note

`NAME` concatenates operator and shift (e.g. "Ahmed Day", "Awias Day", "Bahadue Night", "Hamza
Day"). In the digital model this splits into `operator_id` + `shift_id`. One row represents one
machine, for one shift, for one day.

---

## F6 — Gate Pass (`IC-FM-02`, controlled) — blank form, no sample data

`DOCUMENT # IC-FM-02` | `ISSUE # 01` | `ISSUE DATE 01-03-2024` | `Rev : 00`. Title block: `GATE
PASS`.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| DOCUMENT # | IC-FM-02 | Text/code | Controlled-form document number | METADATA | CONFIRMED |
| ISSUE # | 01 | Numeric | Document issue number | METADATA | CONFIRMED |
| ISSUE DATE | 01-03-2024 | Date | Document issue date | METADATA | CONFIRMED |
| Rev | 00 | Numeric/code | Document revision | METADATA | CONFIRMED |
| Returnable *(checkbox)* | *(blank — no sample data)* | Boolean | Whether the movement is returnable | TRANSACTION | CONFIRMED (field exists; unpopulated in this blank sample) |
| Non Returnable *(checkbox)* | *(blank — no sample data)* | Boolean | Whether the movement is non-returnable | TRANSACTION | CONFIRMED |
| Serial No. | *(blank)* | Text/code | Gate pass serial number | TRANSACTION | CONFIRMED |
| Company Name : | *(blank)* | Text | Receiving/sending company name | MASTER | CONFIRMED |
| Address : | *(blank)* | Text | Company address | MASTER | CONFIRMED |
| Date: | *(blank)* | Date | Gate pass date | TRANSACTION | CONFIRMED |
| Time | *(blank)* | Time | Gate pass time | TRANSACTION | CONFIRMED |
| Person Name: | *(blank)* | Text | Person named on the pass | TRANSACTION | CONFIRMED |
| Vehicle No | *(blank)* | Text/code | Vehicle registration number | TRANSACTION | CONFIRMED |
| Dispatcher : | *(blank)* | Text | Dispatching staff member | TRANSACTION | CONFIRMED |
| Reason : | *(blank)* | Text | Reason for the gate pass | TRANSACTION | CONFIRMED |
| S.NO *(line table)* | *(blank)* | Numeric | Line sequence | TRANSACTION | CONFIRMED |
| DESCRIPTION *(line table)* | *(blank)* | Text | Description of item leaving/entering site | TRANSACTION | CONFIRMED |
| QTY *(line table)* | *(blank)* | Numeric | Quantity | TRANSACTION | CONFIRMED |
| Prepared By: *(footer)* | *(blank)* | Signature | Preparer | APPROVAL | CONFIRMED |
| Receiver: *(footer)* | *(blank)* | Signature | Receiving party | APPROVAL | CONFIRMED |
| Authorized Signature: *(footer)* | *(blank)* | Signature | Authorising signatory | APPROVAL | CONFIRMED |

---

## F7 — Purchase Request (`IC-FM-04`, controlled) — blank form, no sample data

`DOCUMENT # IC-FM-04` | `ISSUE # 01` | `ISSUE DATE 01-03-2024` | `Rev : 00`. Title block: `PURCHASE
REQUEST`. Four approval levels — preserve all four, not three.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| DOCUMENT # | IC-FM-04 | Text/code | Controlled-form document number | METADATA | CONFIRMED |
| ISSUE # | 01 | Numeric | Document issue number | METADATA | CONFIRMED |
| ISSUE DATE | 01-03-2024 | Date | Document issue date | METADATA | CONFIRMED |
| Rev | 00 | Numeric/code | Document revision | METADATA | CONFIRMED |
| Date: | *(blank)* | Date | Request date | TRANSACTION | CONFIRMED |
| Purchase request No: | *(blank)* | Text/code | Purchase request number | TRANSACTION | CONFIRMED |
| S. No. *(line table)* | *(blank)* | Numeric | Line sequence | TRANSACTION | CONFIRMED |
| Item Description *(line table)* | *(blank)* | Text | Item requested | TRANSACTION | CONFIRMED |
| Purpose *(line table)* | *(blank)* | Text | Purpose of the purchase | TRANSACTION | CONFIRMED |
| Quantity *(line table)* | *(blank)* | Numeric | Quantity requested | TRANSACTION | CONFIRMED |
| Rate *(line table)* | *(blank)* | Numeric (currency) | Unit rate | TRANSACTION | CONFIRMED |
| Remarks *(line table)* | *(blank)* | Text (free) | Free note | METADATA | CONFIRMED |
| Prepared By *(footer)* | *(blank)* | Signature | Level 1 sign-off | APPROVAL | CONFIRMED |
| Checked by *(footer)* | *(blank)* | Signature | Level 2 sign-off | APPROVAL | CONFIRMED |
| Preapproved by *(footer)* | *(blank)* | Signature | Level 3 sign-off | APPROVAL | CONFIRMED |
| Approved By *(footer)* | *(blank)* | Signature | Level 4 sign-off | APPROVAL | CONFIRMED |

---

## F8 — Stock Register (`IC-FM-05`, controlled) — blank form, no sample data

`DOCUMENT # IC-FM-05` | `ISSUE # 01` | `ISSUE DATE 01-03-2024` | `Rev : 00`. Title block: `STOCK
REGISTER`. One register sheet per product — a card-style ledger.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| DOCUMENT # | IC-FM-05 | Text/code | Controlled-form document number | METADATA | CONFIRMED |
| ISSUE # | 01 | Numeric | Document issue number | METADATA | CONFIRMED |
| ISSUE DATE | 01-03-2024 | Date | Document issue date | METADATA | CONFIRMED |
| Rev | 00 | Numeric/code | Document revision | METADATA | CONFIRMED |
| Product Name: | *(blank)* | Text | Product this register card tracks | MASTER | CONFIRMED |
| Supplier Name: | *(blank)* | Text | Supplier name (suggests raw-material scope; `NEEDS CONFIRMATION`, see [02-form-inventory.md](02-form-inventory.md) §5) | MASTER | CONFIRMED (field exists) |
| Serial No. | *(blank)* | Text/code | Register serial number | TRANSACTION | CONFIRMED |
| S. No. *(line table)* | *(blank)* | Numeric | Line sequence | TRANSACTION | CONFIRMED |
| Date *(line table)* | *(blank)* | Date | Movement date | TRANSACTION | CONFIRMED |
| Product specification *(line table)* | *(blank)* | Text | Product specification detail | MASTER | CONFIRMED |
| Opening Stock *(line table)* | *(blank)* | Numeric | Stock at start of period | TRANSACTION | CONFIRMED |
| Production *(line table)* | *(blank)* | Numeric | Quantity produced | TRANSACTION | CONFIRMED |
| Dispatch *(line table)* | *(blank)* | Numeric | Quantity dispatched | TRANSACTION | CONFIRMED |
| Balance *(line table)* | *(blank)* | Numeric | `Opening + Production − Dispatch` (same formula as F4) | DERIVED | CONFIRMED |
| Remarks *(line table)* | *(blank)* | Text (free) | Free note | METADATA | CONFIRMED |
| Prepared By: *(footer)* | *(blank)* | Signature | Preparer | APPROVAL | CONFIRMED |
| Checked By: *(footer)* | *(blank)* | Signature | Checker | APPROVAL | CONFIRMED |

---

## F9 — Elastic Order Booking / Processing Form

No document number; Word document, two pages (`Pg # 1 of 2`, `Pg # 2 of 2`). Header: `INTER
CONVERTERS PVT. LTD.` / `Interlooping quality fabric`. Sample: Pakeezah Dyeing & Bleaching order.

| Field (verbatim) | Sample value | Data type | Meaning | Classification | Tag |
|---|---|---|---|---|---|
| Company Name *(Customer Information)* | PAKEEZAH DYEING & BLEACHING | Text | Customer company name | MASTER | CONFIRMED |
| Address *(Customer Information)* | DP 50/B, Sector 12D, North Karachi Industrial Area Karachi | Text | Customer address | MASTER | CONFIRMED |
| Contact Person *(Customer Information)* | Mustafa (Merchandiser) | Text | Named contact and their role | MASTER | CONFIRMED |
| Through-Email-Phone-Verbal | info@pakeezah.net | Text (order channel; filled with an email address in this sample) | Channel through which the order was received | TRANSACTION | CONFIRMED |
| Phone | 0314-5040874 | Text/code | Customer phone number | MASTER | CONFIRMED |
| Order Date *(Order Details)* | 03-Apr-2025 | Date | Date the order was placed | TRANSACTION | CONFIRMED |
| Product Description *(Order Details)* | 13 Tar | Text | Ordered construction description | TRANSACTION | CONFIRMED |
| Quantity *(Order Details)* | 55400 Meters | Numeric (m) | Ordered quantity | TRANSACTION | CONFIRMED |
| Elastic: Needle / Jacquard / Crochet Type *(Product Specifications, circle-one)* | Crochet | Text (enumerated) | Elastic production type selected | MASTER | CONFIRMED |
| Width *(Product Specifications)* | 1 inch | Numeric (inches) | Product width | MASTER | CONFIRMED |
| Wt of 1000 Mtr *(Product Specifications, hand-circled)* | 8.76 Kg | Numeric (kg per 1000 m) | Weight of 1000 metres — same fact as F1 `Elastic wt Gr` and F5 `G.WT/MTR` in a third unit | DERIVED/MASTER | CONFIRMED — verified `8.76 kg / 1000 m = 8.76 g/m` |
| Mtrs in 1 kg *(Product Specifications, hand-circled)* | 114 Meters | Numeric (m/kg) | Metres per kilogram | DERIVED | CONFIRMED — verified `1000 / 8.76 = 114.2 → matches printed 114` |
| Pull Ratio *(Product Specifications)* | 5 to 12 Inches | Text (range, inches) | Elastic pull ratio range | MASTER | CONFIRMED |
| Rubber *(Product Specifications)* | 52 | Numeric | Rubber count/denier code | MASTER | CONFIRMED |
| Colour *(Product Specifications)* | White | Text | Product colour | MASTER | CONFIRMED — note this duplicates the `Color` field below on the same form |
| Color *(Product Specifications)* | White | Text | Product colour — apparent duplicate field of `Colour` on the same paper form | MASTER | CONFIRMED |
| Poly Thread Weft / Warp *(Product Specifications)* | 150 Danier or 300 Danier Poly thread | Text | Weft/warp poly thread specification — preserve `Danier` spelling verbatim | MASTER | CONFIRMED |
| Finish: Starch / Starching / Ironing / Soft Finished *(circle-one)* | Starch | Text (enumerated) | Finishing type selected | MASTER | CONFIRMED |
| Cutting Instructions (if applicable) *(Additional Requirements, page 2)* | N/A | Text | Cutting instructions | TRANSACTION | CONFIRMED |
| Packaging Requirements (if applicable) *(Additional Requirements, page 2)* | N/A | Text | Packaging instructions | TRANSACTION | CONFIRMED |
| Delivery Required *(Delivery Information, page 2)* | 10,000 Meters Per Day | Numeric (m/day) | Required delivery rate | TRANSACTION | CONFIRMED |
| Delivery Committed Date *(Delivery Information, page 2)* | N/A | Date | Committed delivery date | TRANSACTION | CONFIRMED |
| Special Instructions (if applicable) *(Delivery Information, page 2)* | N/A | Text | Special instructions | TRANSACTION | CONFIRMED |
| Authorization text *(page 2)* | *(see verbatim quote below)* | Text (business rule embedded in prose) | Confirms order accuracy and authorises processing; embeds the QC sampling rule | APPROVAL | CONFIRMED (text); decomposed into rule parameters in §"QC sampling rule extraction" below |
| Physical Sample attached (YES or NO) *(circle-one, page 2)* | *(field exists; which option was circled is not stated in the evidence)* | Boolean (enumerated) | Whether a physical sample was attached | TRANSACTION | NEEDS CONFIRMATION — the circled value is not legible/recorded in the source extraction |
| Pg # 1 of 2 / Pg # 2 of 2 *(footers)* | Pg # 1 of 2 / Pg # 2 of 2 | Text | Page identifier | METADATA | CONFIRMED |

---

## Fields added in the digital system

Every field below does not exist on any of the nine paper forms today. Each is added because a
numbered requirement in the approved plan calls for it.

| New field | Digital context | Requirement | Tag |
|---|---|---|---|
| `production_order_id` | Production entry | Links a production entry to the order/batch that requested it | NEW per §16 |
| `batch_id` | Production entry | Identifies the production batch a machine-shift entry belongs to | NEW per §16 |
| `operator_id` | Production entry | Structured replacement for F5's free-text operator name in `NAME` | NEW per §16 |
| `shift_id` | Production entry | Structured replacement for F5's shift suffix in `NAME` and F4's `A`/`N`/`Z` footer codes | NEW per §16 |
| `start_time` | Production entry | Actual start time of the production run — not captured on F5 today | NEW per §16 |
| `stop_time` | Production entry | Actual stop time of the production run — not captured on F5 today | NEW per §16 |
| `downtime_event_id` | Production entry | Structured replacement for F5's free-text `REMARKS` downtime notes | NEW per §16 |
| `target_quantity` | Production entry | Planned/target output — no target field exists on F5 | NEW per §16 |
| `actual_quantity` | Production entry | Structured actual output, replacing F5's `TOTAL METER` in a normalised form | NEW per §16 |
| `reject_quantity` | Production entry | Reject quantity — not captured anywhere on F5 today | NEW per §16 |
| `grn_number` | Goods receiving | Unique receipt reference — F2 has only a per-day `Serial #`, not a unique GRN number | NEW per §7 |
| `supplier_lot` | Goods receiving | Supplier's own lot/batch identifier — not captured on F2 today | NEW per §7 |
| `internal_lot` | Goods receiving | Interconverters' internal lot identifier — not captured on F2 today | NEW per §7 |
| `po_reference` | Goods receiving | Link back to the purchase request/order — not captured on F2 today | NEW per §7 |
| `quickbooks_po_reference` | Goods receiving | Link to the corresponding QuickBooks purchase order | NEW per §7 |
| `received_by` | Goods receiving | Structured identity of the person receiving goods — F2 has no signature block at all | NEW per §7 |
| `checked_by` | Goods receiving | Structured identity of the person checking the receipt — F2 has no signature block at all | NEW per §7 |

---

## Downtime reason seed list

`downtime_category` and `downtime_reason` are **separate configurable levels** — a reason belongs
to exactly one category, and both lists are master data, not hardcoded.

| Reason | Category | Origin |
|---|---|---|
| Machine Man Absent | Labour | OBSERVED |
| Machine Off | Machine | OBSERVED |
| Machine Fault Baring *(sic — read as "Bearing")* | Machine | OBSERVED |
| Article Change | Planning | OBSERVED |
| Yarn Breakage | Material | PROPOSED |
| Rubber Breakage | Material | PROPOSED |
| Material Shortage | Material | PROPOSED |
| Beam Change | Planning | PROPOSED |
| Bobbin Change | Planning | PROPOSED |
| Machine Setting | Machine | PROPOSED |
| Design Change | Planning | PROPOSED |
| Mechanical Breakdown | Machine | PROPOSED |
| Electrical Breakdown | Machine | PROPOSED |
| Quality Hold | Quality | PROPOSED |
| Operator Unavailable | Labour | PROPOSED |
| Power Failure | Utility | PROPOSED |
| Maintenance | Maintenance | PROPOSED |
| Cleaning | Maintenance | PROPOSED |
| Other | Other | PROPOSED |

The four `OBSERVED` reasons are the only downtime values actually seen on the scanned F5 sample.
The 15 `PROPOSED` reasons are not on any form — they are seeded to give the digital system a usable
starting taxonomy and remain fully editable master data.

---

## Shift evidence

| Token | Where observed |
|---|---|
| `Day` | F5 `NAME` suffix (e.g. "Ahmed Day", "Awias Day", "Hamza Day") |
| `Night` | F5 `NAME` suffix (e.g. "Bahadue Night") |
| `A` | F4 footer: `Day ( A & N )` |
| `N` | F4 footer: appears in both `Day ( A & N )` and `Night ( N & Z )` |
| `Z` | F4 footer: `Night ( N & Z )` |
| `12 hours` | F5 `SHIFT TIME` column value |

**`NEEDS CONFIRMATION`**: how the letter codes `A`, `N`, `Z` map to actual shift definitions, and
how they relate to the `Day`/`Night` suffixes on F5's `NAME` column — in particular why `N` appears
in both the day and the night grouping on F4's footer. No shift start/end times may be hardcoded
anywhere in the digital design; the `shifts` master must carry `start_time`/`end_time` as
configurable fields (see [05-database-schema.md](05-database-schema.md) §18).

---

## QC sampling rule extraction

Verbatim from F9, page 2, `Authorization:` block:

> I hereby confirm that the above information is accurate and authorize Elastic to process this
> order accordingly.
> See back for in Process sample Pull ( 3 – 5 Samples attached for qty 1000 mtr – 5000 mtr order /
> Over and above 2 sample per shift, Check width, Pull Ratio, Size). Physical Sample attached
> ( YES or NO ).

Decomposed into candidate rule parameters for `qc_plan_rules`:

| Parameter | Candidate value | Source phrase | Tag |
|---|---|---|---|
| Order quantity — lower bound | 1,000 metres | "for qty 1000 mtr" | CONFIRMED (as a reading of the text) |
| Order quantity — upper bound | 5,000 metres | "5000 mtr order" | CONFIRMED (as a reading of the text) |
| Sample count — minimum | 3 | "3 – 5 Samples" | CONFIRMED (as a reading of the text) |
| Sample count — maximum | 5 | "3 – 5 Samples" | CONFIRMED (as a reading of the text) |
| Per-shift sample count (above the upper bound) | 2 samples per shift | "Over and above 2 sample per shift" | **NEEDS CONFIRMATION — see ambiguity below** |
| Check list | Width, Pull Ratio, Size | "Check width, Pull Ratio, Size" | CONFIRMED (as a reading of the text) |
| Physical sample attached flag | Yes/No | "Physical Sample attached ( YES or NO )" | CONFIRMED (field exists) |

**Ambiguity — `NEEDS CONFIRMATION`**: the phrase "Over and above 2 sample per shift" is read two
ways in the source evidence — either "in addition to" the 3–5 samples already taken, or "for
quantities above" the 5,000 m upper bound. Which reading is correct changes the rule's behaviour
for large orders and is not resolved here.

---

## Unit-of-measure inventory

| Unit | Seen in |
|---|---|
| Meters | F9 order quantity, F5 `TOTAL METER` |
| Kg | F1 costing, F2 `Total Weight`, F5 `PER MACHINE KG` |
| Rolls | F4 balances (apparent; `NEEDS CONFIRMATION`) |
| Strips | F5 `STRIP` (machine parallelism) |
| Cones | F2 `Per Cone Wt` |
| Pieces | F2 `QTY` for cartons / machine parts / "Weight Pcs For Thread" |
| Inches | F9 `Width`, F9 `Pull Ratio` |
| Millimetres | The existing Design Studio stores all dimensions in mm |

The business runs in Meters, Kg, Rolls, Strips, Cones, Pieces and Inches **simultaneously**, across
different forms, while the upstream Design Studio works exclusively in millimetres. This is the
direct justification for a canonical-UOM-plus-conversion-layer design rather than a single fixed
unit — see [05-database-schema.md](05-database-schema.md) §8.

---

Next: [12-field-mapping-matrix.md](12-field-mapping-matrix.md) for where every one of these fields
lands in the digital schema, or [11-needs-confirmation.md](11-needs-confirmation.md) for the
consolidated open-questions register.
