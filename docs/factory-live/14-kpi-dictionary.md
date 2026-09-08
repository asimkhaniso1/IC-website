# 14 — KPI Dictionary

**New file, high rigour.** Every KPI that may appear anywhere in Factory Live is defined here, and only
here. The rule enforced throughout the pack: **a KPI may not be displayed on any screen until its
formula is formally defined in this document** — see `09-factory-live-drilldown.md` §"Process card
specification" for how this gate is applied to the Level 1 process cards.

For each of the 15 required KPIs, twelve attributes are given: **Name, Purpose, Formula, Numerator,
Denominator, UOM, Data Source, Calculation Frequency, Aggregation Rules, Excluded Time, Owner, Display
Location.**

Two formulas are grounded directly in verified paper-form arithmetic (IC-FM-01 / F5, reconciled across
9 non-zero sample rows, shift length observed as 12 hours on every row):

```
TOTAL METER      = TOTAL METER PER STRIP × STRIP
PER MACHINE KG   = kg_per_strip (Column1) × STRIP
```

`kg_per_strip` is the paper form's unlabelled `Column1` — tagged `INFERRED FROM ARITHMETIC — NEEDS
CONFIRMATION` in `03-field-extraction.md`; it is used here because it reconciles, not because its label
is confirmed.

---

## 1. Production Quantity

| Attribute | Definition |
|---|---|
| **Purpose** | The base physical output measure — every other production KPI is built from it |
| **Formula** | Σ `TOTAL METER` (metres) across included `production_entries`, and separately Σ `PER MACHINE KG` (kilograms) across the same entries |
| **Numerator** | Sum of metre or kg output across the selected entries |
| **Denominator** | None — an absolute quantity, not a ratio |
| **UOM** | Metres **or** Kilograms (product-dependent; both are always derivable via `meters_per_kg = 1000 ÷ g_per_meter`) |
| **Data Source** | **MANUAL** V1 (operator meter/kg reading via Production Entry) → **Future:** `IOT_SENSOR`/`PLC` pulse counter or load cell |
| **Calculation Frequency** | Per `production_entry` (one machine, one shift, one day); rolled up as needed |
| **Aggregation Rules** | **SUM** across entries within scope and time window — never averaged |
| **Excluded Time** | N/A — a quantity metric, not time-based; entries during `ON_HOLD` naturally contribute zero |
| **Owner** | Production Manager |
| **Display Location** | Machine Detail (Level 4), Production Order/Batch Detail (Level 5), Process Card "Actual Output", Daily Production Report |
| **Computable in V1?** | **Yes** |

---

## 2. Target Production

| Attribute | Definition |
|---|---|
| **Purpose** | The planned/expected output a shift, machine, batch or order is measured against |
| **Formula** | `target_quantity` assigned at production-planning time — not derived from any historical arithmetic |
| **Numerator / Denominator** | N/A — an absolute planned quantity |
| **UOM** | Same as Production Quantity |
| **Data Source** | **`NEW per §16`** — **there is no target column on any current form.** IC-FM-01 (F5) has no target field across all 9 verified rows and all 3 sampled operator/shift groups. This would be **MANUAL** entry at planning time once built; no source exists today |
| **Calculation Frequency** | N/A — not currently captured |
| **Aggregation Rules** | Would be **SUM** across scope, consistent with Production Quantity, once captured |
| **Excluded Time** | N/A |
| **Owner** | Production Manager (would own target-setting) |
| **Display Location** | Intended for Process Card "Target Output", Order/Batch Detail — **NOT DISPLAYED IN V1** |
| **Computable in V1?** | **No.** No form captures a target today. Any KPI with Target Production in its formula — Production Achievement %, Production Variance, Machine Efficiency % — inherits this same block and cannot be computed until targets are captured. This is stated plainly, not worked around. |

---

## 3. Production Achievement %

| Attribute | Definition |
|---|---|
| **Purpose** | How actual output compares to plan |
| **Formula** | `(Production Quantity ÷ Target Production) × 100` |
| **Numerator** | Production Quantity (actual, same UOM and scope) |
| **Denominator** | Target Production (same UOM and scope) |
| **UOM** | % |
| **Data Source** | **CALCULATED** — numerator MANUAL V1 (available); denominator not captured (see KPI 2) |
| **Calculation Frequency** | Same cadence as the entries compared |
| **Aggregation Rules** | Recompute at each rollup level from the **summed** numerator and **summed** denominator for that scope — never average per-entry percentages, which distorts unequal batch sizes |
| **Excluded Time** | Inherits Target Production's planned-time basis once defined |
| **Owner** | Production Manager |
| **Display Location** | Intended for Process Card, Order/Batch Detail |
| **Computable in V1?** | **No.** Entirely blocked by Target Production having no data source. |

---

## 4. Machine Utilisation %

| Attribute | Definition |
|---|---|
| **Purpose** | The proportion of planned/available time a machine actually ran — distinguishes productive time from all scheduled time |
| **Formula** | `(Actual Running Time ÷ Planned Production Time) × 100` |
| **Numerator** | Actual Running Time = shift length − Downtime Minutes (excluding *planned* downtime — see §"Excluded time" below) |
| **Denominator** | Planned Production Time = shift length (from the shift master) × shifts scheduled for the machine in the period. Observed shift length = **12 hours** (IC-FM-01 `SHIFT TIME`, consistent on every sampled row) |
| **UOM** | % |
| **Data Source** | **CALCULATED** — numerator from Downtime Minutes (MANUAL V1); denominator from the shift master |
| **Calculation Frequency** | Per shift, rolled up to day/machine/process |
| **Aggregation Rules** | **SUM** Actual Running Time and **SUM** Planned Production Time across scope, then divide — never average per-shift percentages |
| **Excluded Time** | Planned downtime excluded from the denominator once downtime is categorised (see §"Excluded time" below) |
| **Owner** | Production Manager |
| **Display Location** | Machine Detail, Machine Group Detail |
| **Computable in V1?** | **No.** The denominator depends on the shift master, and the Day/Night/A/N/Z shift-token mapping observed on F4/F5 is `NEEDS CONFIRMATION`. Until the shift master is confirmed and seeded, Planned Production Time cannot be reliably derived. |

---

## 5. Machine Efficiency %

| Attribute | Definition |
|---|---|
| **Purpose** | How close actual output rate is to the machine's ideal/standard rate while running — a quality-of-running measure distinct from Utilisation (uptime) |
| **Formula** | `(Actual Output ÷ (Ideal Rate × Actual Running Time)) × 100` |
| **Numerator** | Actual Output (Production Quantity during the running period) |
| **Denominator** | Ideal Rate × Actual Running Time — the output the machine would produce at standard cycle rate for the same running time |
| **UOM** | % |
| **Data Source** | **CALCULATED** — requires an Ideal Rate that does not currently exist. `machine speed = 400` is observed on IC-FM-01 but its **unit is unknown** (RPM? courses/min? m/hr?) — `NEEDS CONFIRMATION` — so no ideal rate can be established |
| **Calculation Frequency** | N/A — not currently calculable |
| **Aggregation Rules** | Would follow the same sum-then-divide rule as Utilisation, once defined |
| **Excluded Time** | Same convention as Utilisation |
| **Owner** | Production Manager |
| **Display Location** | Intended for Process Card "Efficiency" |
| **Computable in V1?** | **No.** Blocked by the unresolved `machine speed` units and the absent standard/ideal rate, and additionally depends on Target Production's planning discipline. |

---

## 6. Downtime Minutes

| Attribute | Definition |
|---|---|
| **Purpose** | Quantifies non-productive machine time within a shift — the basis for Utilisation, Efficiency, and downtime-reason analysis |
| **Formula** | Σ `(stop_time − start_time)` across `downtime_events` logged for the machine/shift |
| **Numerator / Denominator** | N/A — an absolute duration |
| **UOM** | Minutes |
| **Data Source** | **MANUAL** V1 — operator/supervisor logs a stop reason and duration via the new Production Entry screen (`downtime_event_id`, `start_time`, `stop_time` — `NEW per §16` digital fields). The paper form IC-FM-01 records only a **text** `REMARKS` value (`Machine Off`, `Machine Man Absent`, `Machine Fault Baring`, `Article Change`) and never a duration — a zero-output row is the only paper signal that downtime occurred. → **Future:** automatic stop signal from a PLC/machine controller |
| **Calculation Frequency** | Per downtime event, rolled up per shift/machine/day/process |
| **Aggregation Rules** | **SUM** across scope |
| **Excluded Time** | Split into planned vs unplanned once `downtime_category` is populated (see §"Excluded time" below); uncategorised downtime defaults to unplanned |
| **Owner** | Supervisor (logging) / Maintenance (maintenance-caused) / Production Manager (overall) |
| **Display Location** | Process Card "Downtime", Machine Detail, Order/Batch Detail |
| **Computable in V1?** | **Yes, conditionally.** The digital Production Entry screen is designed to capture start/stop and reason from day one — this is a **process-adoption dependency** (operators must log consistently), not a data-model blocker. Flag the adoption risk in `10-migration-plan.md`, but the KPI itself is not blocked the way Utilisation is. |

---

## 7. Downtime %

| Attribute | Definition |
|---|---|
| **Purpose** | Downtime Minutes expressed as a share of total scheduled time, comparable across machines/shifts of different lengths |
| **Formula** | `(Downtime Minutes ÷ Planned Production Time) × 100` |
| **Numerator** | Downtime Minutes (KPI 6) |
| **Denominator** | Planned Production Time — same denominator as Machine Utilisation % |
| **UOM** | % |
| **Data Source** | **CALCULATED** |
| **Calculation Frequency** | Per shift, rolled up |
| **Aggregation Rules** | **SUM** numerator and denominator across scope, then divide |
| **Excluded Time** | Same convention as Utilisation/Downtime Minutes |
| **Owner** | Production Manager |
| **Display Location** | Process Card, Machine Detail |
| **Computable in V1?** | **No, not reliably.** The numerator (Downtime Minutes) is available; the denominator inherits the same shift-master `NEEDS CONFIRMATION` dependency as Machine Utilisation %. Raw Downtime Minutes can be shown as a figure; the **percentage** cannot be trusted until the shift master is confirmed. |

---

## 8. Wastage %

| Attribute | Definition |
|---|---|
| **Purpose** | Material wastage as a proportion of output — one of the paper form's own tracked columns |
| **Formula** | `(Wastage Quantity ÷ (Production Quantity + Wastage Quantity)) × 100` — an output-basis convention, documented pending confirmation of which denominator convention Interconverters actually uses (output-basis vs input-basis) |
| **Numerator** | Wastage Quantity — from IC-FM-01's `WASTAGE` column / `production_entries.wastage_quantity` |
| **Denominator** | Production Quantity + Wastage Quantity |
| **UOM** | % |
| **Data Source** | **MANUAL** V1 — the `WASTAGE` column already exists as a field on IC-FM-01 |
| **Calculation Frequency** | Per production entry, rolled up |
| **Aggregation Rules** | **SUM** numerator and denominator, then divide — never average per-entry percentages |
| **Excluded Time** | N/A |
| **Owner** | Production Manager / Quality |
| **Display Location** | Process Card, Machine Detail, Order/Batch Detail |
| **Computable in V1?** | **KPI is defined; there is no data behind it today.** The `WASTAGE` column is present as a field on every sampled IC-FM-01 row but is **empty on all 9 verified rows**, zero-output and non-zero-output alike. Whether wastage is recorded in practice at all — on this form, elsewhere, or nowhere — is `NEEDS CONFIRMATION`. Until answered, Wastage % will read as 0% or null for every entry; the card must not present that as "no wastage occurred" without this caveat. |

---

## 9. Reject %

| Attribute | Definition |
|---|---|
| **Purpose** | The proportion of output failing quality inspection — a core quality KPI |
| **Formula** | `(Reject Quantity ÷ Inspected Quantity) × 100` |
| **Numerator** | Reject Quantity — **`NEW per §16`** (`reject_quantity`); no paper form captures a reject count. F9's Authorization block describes *how many samples to pull*, not a pass/fail reject quantity |
| **Denominator** | Inspected Quantity (from `qc_inspections`) |
| **UOM** | % |
| **Data Source** | **MANUAL** V1 — Quality logs the inspection result via `/factory/qc` |
| **Calculation Frequency** | Per `qc_inspection`, rolled up per order/batch/product/day |
| **Aggregation Rules** | **SUM** Reject Quantity and **SUM** Inspected Quantity across scope, then divide |
| **Excluded Time** | N/A |
| **Owner** | Quality |
| **Display Location** | Process Card (Quality Control), QC screen, Order/Batch Detail |
| **Computable in V1?** | **Not until the QC module (Phase 3) is built and in use.** This is a build-sequencing gap, not an external `NEEDS CONFIRMATION` — `reject_quantity` has no paper precedent but is achievable in principle from the day the QC Inspections screen goes live. |

---

## 10. First Quality %

| Attribute | Definition |
|---|---|
| **Purpose** | Proportion of output passing inspection on the first attempt without rework — a standard textile-industry quality measure |
| **Formula** | `100% − Reject %`, equivalently `((Inspected Quantity − Reject Quantity) ÷ Inspected Quantity) × 100` |
| **Numerator** | Inspected Quantity − Reject Quantity (Accepted Quantity) |
| **Denominator** | Inspected Quantity |
| **UOM** | % |
| **Data Source** | **CALCULATED** — derived from the same `qc_inspections` data as Reject % |
| **Calculation Frequency** | Same as Reject % |
| **Aggregation Rules** | Same as Reject % |
| **Excluded Time** | N/A |
| **Owner** | Quality |
| **Display Location** | Same locations as Reject % |
| **Computable in V1?** | **Same status as Reject %** — not until the QC module (Phase 3) is live and logging `reject_quantity`. |

---

## 11. Order Completion %

| Attribute | Definition |
|---|---|
| **Purpose** | How far a production order has progressed toward its ordered quantity |
| **Formula** | `(Cumulative Production Quantity for the order ÷ Order Quantity) × 100` |
| **Numerator** | Cumulative Production Quantity — Σ Production Quantity (KPI 1) across all `production_entries` linked to `production_order_id` |
| **Denominator** | Order Quantity — the confirmed quantity from the Studio handoff (`production_specs`/`order_items`; e.g. F9's `Quantity: 55400 Meters`) |
| **UOM** | % |
| **Data Source** | **CALCULATED** — numerator MANUAL V1, denominator **STUDIO** (carried across at the `ORDER_CONFIRMED` handoff) |
| **Calculation Frequency** | Recalculated on every new `production_entry` against the order; live on Order/Batch Detail |
| **Aggregation Rules** | **SUM** numerator to date, divide by the fixed order quantity — this is already an order-level KPI, not rolled up further |
| **Excluded Time** | N/A |
| **Owner** | Production Manager |
| **Display Location** | Production Order Detail (Level 5), Orders list, Process Card "Current Orders" drill-through |
| **Computable in V1?** | **Yes.** Both numerator and denominator exist without any blocking dependency. |

---

## 12. Meters per Machine Hour

| Attribute | Definition |
|---|---|
| **Purpose** | A throughput-rate KPI comparable across machines and shifts, independent of shift length |
| **Formula** | `Production Quantity (Metres) ÷ Actual Running Time (Hours)` |
| **Numerator** | Production Quantity in metres (`TOTAL METER = TOTAL METER PER STRIP × STRIP`, verified) |
| **Denominator** | Actual Running Time in hours (shift length − Downtime Minutes, converted to hours) |
| **UOM** | Metres/hour |
| **Data Source** | **CALCULATED** — numerator MANUAL V1; denominator from Downtime Minutes (MANUAL V1) and the shift's actual worked hours (not the shift master's planned hours) |
| **Calculation Frequency** | Per shift, rolled up per machine/day |
| **Aggregation Rules** | **SUM** numerator, **SUM** denominator (running hours) across scope, then divide — never average per-shift rates directly, which would weight short and long shifts equally |
| **Excluded Time** | Excludes downtime from the denominator — running time only |
| **Owner** | Production Manager |
| **Display Location** | Machine Detail, Machine Group Detail |
| **Computable in V1?** | **Partially.** The numerator is solid V1 data. The denominator needs Downtime Minutes logged consistently (the same operator-adoption dependency as KPI 6) — but, unlike Utilisation, it does **not** need the shift master's *planned* time, only the actual worked/running hours entered for that shift, so it is not blocked by the shift-mapping `NEEDS CONFIRMATION`. |

---

## 13. Kg per Machine Hour

| Attribute | Definition |
|---|---|
| **Purpose** | Same as Meters per Machine Hour, in weight terms |
| **Formula** | `Production Quantity (Kg) ÷ Actual Running Time (Hours)` |
| **Numerator** | Production Quantity in kg (`PER MACHINE KG = kg_per_strip × STRIP`, verified) |
| **Denominator** | Actual Running Time in hours |
| **UOM** | Kilograms/hour |
| **Data Source / Frequency / Aggregation / Excluded Time** | Identical to KPI 12 |
| **Owner** | Production Manager |
| **Display Location** | Same as KPI 12 |
| **Computable in V1?** | **Partially** — same caveat as Meters per Machine Hour. |

---

## 14. Rolls Completed

| Attribute | Definition |
|---|---|
| **Purpose** | Counts finished rolls — the unit Interconverters' own Daily Stock Report (F4) appears to balance in |
| **Formula** | `Production Quantity (Metres) ÷ Roll Length` (standard roll length per product, e.g. 500 or 1000 MTR, per F1/F4 item naming), rounded down to whole rolls — or a direct physical count once Packing (M8) is live |
| **Numerator** | Production Quantity in metres, or a direct roll count from `packing_records` |
| **Denominator** | Roll Length (standard length per product, from the product master) |
| **UOM** | Rolls (count) |
| **Data Source** | **CALCULATED** V1 (derived estimate) → **MANUAL** physical count once Packing (Phase 3, M8) is live |
| **Calculation Frequency** | Per order/batch, or per `packing_record` |
| **Aggregation Rules** | **SUM** roll counts across scope — do not sum-then-divide, rolls are already a count |
| **Excluded Time** | N/A |
| **Owner** | Production Manager / Store |
| **Display Location** | Process Card, Batch Detail, Stock Register |
| **Computable in V1?** | **Yes, as a derived estimate.** A physically-counted version follows once Packing is live. **Carried caveat:** whether the balance unit on F4's Daily Stock Report is in fact "rolls" is itself `NEEDS CONFIRMATION` (per `03-field-extraction.md`) — this KPI's UOM inherits that same open question. |

---

## 15. Production Variance

| Attribute | Definition |
|---|---|
| **Purpose** | The absolute gap between planned and actual output — complements Production Achievement % (a ratio) with an absolute figure useful for capacity/material planning |
| **Formula** | `Production Quantity − Target Production` |
| **Numerator / Denominator** | N/A — a difference, not a ratio |
| **UOM** | Same as Production Quantity |
| **Data Source** | **CALCULATED** — Production Quantity is MANUAL V1 (available); Target Production has no data source (KPI 2) |
| **Calculation Frequency** | Would follow Production Quantity's cadence |
| **Aggregation Rules** | **SUM** both terms across scope, then subtract — never subtract already-aggregated percentages |
| **Excluded Time** | N/A |
| **Owner** | Production Manager |
| **Display Location** | Intended for Order/Batch Detail |
| **Computable in V1?** | **No.** Blocked entirely by Target Production, exactly as Production Achievement % and Machine Efficiency % are. |

---

## Excluded time — the planned vs unplanned downtime convention

Utilisation and Efficiency can only be told apart once every minute of downtime is categorised. This
pack defines the convention now so it is not invented ad hoc per screen:

- **Planned downtime** — scheduled maintenance windows, changeover/article change (matches the observed
  `Article Change` remark on IC-FM-01), and no-order idle time (a machine with nothing assigned to run).
  Planned downtime is **excluded** from the Machine Utilisation % denominator once categorised.
- **Unplanned downtime** — breakdowns (`Machine Fault Baring`, i.e. bearing), operator absence
  (`Machine Man Absent`), material shortage, and quality holds. Unplanned downtime **counts against**
  Utilisation.
- **Until a `downtime_reason` is assigned a `downtime_category` (planned/unplanned) in the
  `downtime_reasons` master, all logged downtime defaults to unplanned** for the purpose of Utilisation
  and Efficiency calculations. This means Utilisation will read *lower* than the true figure until the
  categorisation exercise is done — a known, stated bias, not a silent error.
- Downtime reasons must be categorised **before** Utilisation and Efficiency can be meaningfully
  separated from one another; both remain blocked in V1 for the additional, independent reason given in
  KPIs 4 and 5 above (the shift-master and ideal-rate dependencies).

---

## OEE — FUTURE KPI — NOT IMPLEMENTED

**No OEE formula is defined here for use.** OEE (Overall Equipment Effectiveness) is deliberately left
undefined because none of its three components can be validated from current data. This section lists
only the **preconditions** that would need to be true before an OEE definition could responsibly be
added to this dictionary:

- [ ] **Validated Availability** — requires reliable machine start/stop times. Downtime Minutes (KPI 6)
      is a step toward this, but "reliable" means consistent operator logging over a sustained period,
      not just the field existing.
- [ ] **Validated Performance** — requires a confirmed standard/ideal cycle rate per machine or product.
      Blocked today: `machine speed = 400` on IC-FM-01 has **unknown units**, so no ideal rate exists to
      measure against — `NEEDS CONFIRMATION`.
- [ ] **Validated Quality** — requires reject quantity, which is `NEW per §16` and only becomes available
      once the QC module (Phase 3) is built and consistently used (KPI 9).

Until all three boxes can be checked with real, validated data — not estimates — OEE stays out of the
dictionary and off every screen.

---

## KPI readiness table

| KPI | Computable in V1? | Blocking dependency |
|---|---|---|
| Production Quantity | **Yes** | None |
| Target Production | **No** | No target field exists on any form — `NEW per §16`, not yet captured |
| Production Achievement % | **No** | Depends on Target Production |
| Machine Utilisation % | **No** | Depends on the shift master (Day/Night/A/N/Z mapping) — `NEEDS CONFIRMATION` |
| Machine Efficiency % | **No** | Depends on Target Production **and** an ideal rate (`machine speed` units unknown — `NEEDS CONFIRMATION`) |
| Downtime Minutes | **Yes**, adoption-dependent | Requires consistent operator start/stop logging via the new digital entry screen — a process risk, not a data-model blocker |
| Downtime % | **No**, not reliably | Numerator is fine; denominator depends on the shift master, same as Utilisation |
| Wastage % | **Defined, no data** | `WASTAGE` column empty on every sampled row; whether wastage is recorded at all is `NEEDS CONFIRMATION` |
| Reject % | **No**, build-sequencing only | `reject_quantity` is `NEW per §16`; available once the QC module (Phase 3) is built and used |
| First Quality % | **No**, build-sequencing only | Same as Reject % |
| Order Completion % | **Yes** | None |
| Meters per Machine Hour | **Partially** | Numerator fine; denominator (running hours) needs consistent downtime logging |
| Kg per Machine Hour | **Partially** | Same as Meters per Machine Hour |
| Rolls Completed | **Yes**, as a derived estimate | Derived estimate available V1; physical count needs Packing (Phase 3). Also inherits F4's own `NEEDS CONFIRMATION` on whether "rolls" is really the balance unit |
| Production Variance | **No** | Depends on Target Production |

**Summary: 4 of 15 KPIs are fully computable in V1 without qualification** (Production Quantity, Order
Completion %, Downtime Minutes, Rolls Completed as an estimate) **, 2 more are partially computable**
(Meters and Kg per Machine Hour), **1 is defined but has no data** (Wastage %), and **8 are blocked** —
5 by the Target Production gap, 2 by the shift-master mapping, and 2 by QC module build sequencing (the
QC pair is a scheduling matter, not an open question).

---

## Cross-references

- Where these KPIs are gated onto the Level 1 process cards: [`09-factory-live-drilldown.md`](09-factory-live-drilldown.md) §"Process card specification"
- Every underlying `NEEDS CONFIRMATION` item named above: [`11-needs-confirmation.md`](11-needs-confirmation.md)
- The verified source arithmetic this dictionary is grounded in: [`03-field-extraction.md`](03-field-extraction.md)
- KPI Owner roles and their permissions: [`06-user-roles.md`](06-user-roles.md)
