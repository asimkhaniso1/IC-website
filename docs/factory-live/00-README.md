# Interconverters Factory Live — Discovery & Design Pack

**Status:** Revision 2 — for review and sign-off
**Prepared:** 2026-09-08
**Scope:** Analysis and design only. No production code, no database migrations, no QuickBooks API work.

---

## What this pack is

Interconverters (Pvt) Limited runs its narrow-fabric factory on paper forms and Excel sheets. This pack
records **what that system actually is today**, field by field, and specifies the digital system that
replaces it — before any code is written.

The governing principle:

> This is not a generic ERP project. The final system must feel like the existing Interconverters
> factory system, but live, connected, searchable, traceable and management-friendly.

Accordingly, the design starts from the nine existing forms, not from an ERP template. Where the pack
proposes something that does not exist on paper today, it is tagged `NEW per §<n>` against the
requirement that asked for it.

---

## What this pack is NOT

- It does not resolve unclear factory data by guessing. Every uncertain item is tagged
  `NEEDS CONFIRMATION` and listed in [`11-needs-confirmation.md`](11-needs-confirmation.md).
- It does not change the existing Design Studio. The Studio is upstream and stays as it is.
- It does not duplicate accounting. QuickBooks remains the financial system of record.
- It does not commit to an implementation until the blocking questions in §32 are answered.

---

## Reading order

Read in this order for a full understanding. Each file stands alone if you only need one topic.

| # | File | Read this if you want to know… |
|---|---|---|
| 01 | [`01-current-state-process-map.md`](01-current-state-process-map.md) | How the factory runs today, and where paper is re-keyed |
| 02 | [`02-form-inventory.md`](02-form-inventory.md) | Which forms exist, their document numbers and control status |
| 03 | [`03-field-extraction.md`](03-field-extraction.md) | Every field on every form, verbatim, with real sample values |
| 04 | [`04-digital-modules.md`](04-digital-modules.md) | Which digital module replaces which paper form |
| 05 | [`05-database-schema.md`](05-database-schema.md) | The proposed data model, masters, and the stock ledger spine |
| 06 | [`06-user-roles.md`](06-user-roles.md) | The ten roles, what each may do, who may change order status |
| 07 | [`07-quickbooks-mapping.md`](07-quickbooks-mapping.md) | What QuickBooks owns, what Factory Live owns |
| 08 | [`08-screen-list.md`](08-screen-list.md) | Every screen and its route |
| 09 | [`09-factory-live-drilldown.md`](09-factory-live-drilldown.md) | The live dashboard: five levels, KPI cards, colour rules |
| 10 | [`10-migration-plan.md`](10-migration-plan.md) | How we get from paper to digital, phase by phase |
| 11 | [`11-needs-confirmation.md`](11-needs-confirmation.md) | **Open questions — the sign-off checklist** |
| 12 | [`12-field-mapping-matrix.md`](12-field-mapping-matrix.md) | Where each legacy field ends up: table, column, screen |
| 13 | [`13-master-data-migration.md`](13-master-data-migration.md) | The master data to collect before go-live, with templates |
| 14 | [`14-kpi-dictionary.md`](14-kpi-dictionary.md) | Every KPI formula, precisely defined |
| 15 | [`15-form-retirement-matrix.md`](15-form-retirement-matrix.md) | When each paper form may stop being used |

**If you are the factory owner or plant manager and have limited time:** read
[`11-needs-confirmation.md`](11-needs-confirmation.md) first. It is a short list of questions only
Interconverters can answer, and the project cannot safely start coding until the BLOCKING items on it
are settled.

---

## Status legend

These tags appear throughout the pack. They mean specific things.

| Tag | Meaning |
|---|---|
| `CONFIRMED` | Read directly off a scanned form, or verified by arithmetic that reconciles |
| `INFERRED FROM ARITHMETIC — NEEDS CONFIRMATION` | The value reconciles mathematically, but the business meaning has not been confirmed by Interconverters |
| `NEEDS CONFIRMATION` | Unknown. Not guessed. Must be answered before it is built |
| `BLOCKING` | A `NEEDS CONFIRMATION` item whose answer would change the database model |
| `NON-BLOCKING` | A `NEEDS CONFIRMATION` item that can be settled during Phase 1 without schema rework |
| `NEW per §<n>` | Does not exist on paper today; added because requirement §n asked for it |
| `FUTURE` | Deliberately deferred. Design accommodates it; V1 does not build it |
| `DERIVED` | Calculated by the system. Never keyed by a user |

---

## Source evidence

All field extraction in this pack comes from a 10-page scan of the current forms
(`CamScanner 09-08-2026 11.33.pdf`), covering nine distinct forms. Where a figure is quoted, it is a
real value from that scan — for example the costing sheet for `6 TAR SINGLE 38 RUBBER 500/1000 MTR`,
and the Daily Production Report for `21-June-2025`.

Two of those pages (9 and 10) are pages 1 and 2 of a single form, which is why the brief's list of ten
items resolves to nine forms here.

---

## Architecture summary

| Decision | Choice |
|---|---|
| Location | `/factory/*` inside the existing IC-website project |
| Public URL | `factory.interconverters.com` as a domain alias; factory routes in their own lazy-loaded bundle |
| Database | The existing Supabase/Postgres project, new tables from migration `0004` onward |
| Tenancy | Single-tenant. No `org_id`. Row-level security enforces the ten roles |
| Upstream | The existing Design Studio — referenced by foreign key, never duplicated |
| Accounting | QuickBooks. Factory Live stores references only |
| Machine data | Manual entry in V1. IoT/PLC ingestion designed for, not built |

---

## The one-line summary of the design

> A single append-only **stock ledger** is the spine; the **Daily Production Report** is the live feed;
> the **Design Studio** is upstream; **QuickBooks** is downstream; everything else is master data that
> the factory can configure without a developer.
