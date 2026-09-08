# Factory Live — Session Handover

**Purpose of this file:** carry full context into a new chat session or hand off to someone else picking
up the work. Read this first; it points to everything else.

**Last updated:** 2026-09-08

---

## Where things stand, in one paragraph

The **Discovery & Design Pack** for Interconverters Factory Live is complete, all seven originally
blocking open questions are answered by Interconverters, and the pack is **merged to `main`** on
`asimkhaniso1/IC-website` (commit `154f09f`). **No application code exists yet** — no `/factory` routes,
no new database tables, no UI. This is why there is no "Factory" link in the live admin dashboard at
`interconverters.com/admin` — only planning documents were produced and merged. The next step is Phase 1
implementation, starting with one vertical slice.

---

## What exists right now

| What | Where |
|---|---|
| The 16-file discovery pack | `IC-website/docs/factory-live/` (this directory), on `main` |
| Source form scans (original) | `C:\Users\Administrator\Downloads\CamScanner 09-08-2026 11.33.pdf` — 10 pages, 9 forms |
| Sign-off artifact (published page) | https://claude.ai/code/artifact/c1ee7fa1-e7d0-44a7-a0c0-a76194ecc3ec |
| Git commit that merged the pack | `154f09f` on `main`, `asimkhaniso1/IC-website` |
| Existing Design Studio (unrelated, unchanged) | `IC-website/src/studio/`, `src/lib/types.ts` (FROZEN), routes `/studio/*`, `/admin/*` |
| Existing Supabase migrations | `supabase/migrations/0001_init.sql` through `0003_admin_settings.sql` — Studio only, nothing factory-related |

**Not yet built:** `supabase/migrations/0004+`, any `src/factory/` or `src/pages/factory/` tree, any
`/factory/*` route in `src/App.tsx`, any factory nav entry.

---

## Read these two files first in a new session

1. **[`00-README.md`](00-README.md)** — index, reading order, status-tag legend. Start here.
2. **[`11-needs-confirmation.md`](11-needs-confirmation.md)** — the sign-off register. All 7 original
   BLOCKING items are `RESOLVED`. One residual, non-blocking item (**NC-28**) should be answered before
   real machine data is entered. 20 other non-blocking items are tracked for Phase 1.

---

## Architecture decisions already made (don't re-litigate these)

- **Location:** Factory Live lives at `/factory/*` **inside** the existing `IC-website` project, not a
  separate repo. `factory.interconverters.com` remains achievable later as a Vercel domain alias.
- **Database:** the **same Supabase project** as the Design Studio. New tables start at migration
  `0004`. No `org_id` — **single-tenant**, role-based RLS (10 roles, not a multi-tenant SaaS model).
- **Studio handoff:** a `production_order` may be created when `design_projects.status = 'Order Confirmed'`
  **and** `production_specs.status = 'approved'`. Referenced by FK (`design_project_id`,
  `design_revision_id`, `production_spec_id`) — Studio data is never copied.
- **QuickBooks:** reference columns only (`quickbooks_*_id` + sync status). No API calls until Phase 4.
- **Stock model:** one append-only `stock_ledger` table is the spine. The old Daily Stock Report, Stock
  Register and Monthly GR Summary all become *queries* over it, not separate tables.
- **Studio's `src/lib/types.ts` is FROZEN.** Factory Live work must be additive only — never edit it.

---

## The seven originally-blocking questions — all resolved

| ID | Resolution (one line) |
|---|---|
| NC-02 | `MACH NO` = a real physical machine, one-to-one |
| NC-03 | 17 machines total; the 6 warp-knitting units are a confirmed **subset** of the 17 |
| NC-07 | `STRIP` = machine `working_width_mm` ÷ product `width_mm`, confirmed per job — new `machines.working_width_mm` field added |
| NC-08 | `PR STRIP AMOUNT` ≈ piece-rate wage (~Rs 7.25–7.26/kg on one group) — **captured, not computed**; a second report group breaks the clean formula (see NC-25) |
| NC-10 | `A`/`N`/`Z` are **team/crew codes**, not shifts. `shifts` = Day/Night only; new `teams` master added |
| NC-13 | Z&Z Packages is **both vendor and customer** (dual role) → defaults to `TOLL_MANUFACTURING`; Gatron is vendor-only → defaults to `INTERCONVERTERS_OWNED` |
| NC-14 | `Column1`/`Column2` on IC-FM-01 confirmed as kg-per-strip and article, exactly as the arithmetic inferred |

**Outstanding, non-blocking:** **NC-28** — which specific 6 of the 17 machines are the warp-knitting
units, and what machine group the other 11 belong to. This doesn't block coding, but the `machines`
table can't hold real rows until it's answered. Ask Production Manager / Maintenance.

---

## Next step: Phase 1, the vertical slice

Per [`10-migration-plan.md`](10-migration-plan.md) §2 — build **one thread end to end** before anything
else:

```
Confirmed Order → Production Order → Machine Assignment → Start Production
  → Production Entry → Meter Output → Stop/Complete → Stock Ledger Update
```

Minimum tables (see [`05-database-schema.md`](05-database-schema.md) for full column lists):
`machines`, `machine_groups`, `teams`, `shifts`, `operators`, `products`, `orders`, `order_items`,
`production_orders`, `production_batches`, `production_entries`, `stock_ledger`, `locations`, `uoms`.

Minimum screens (see [`08-screen-list.md`](08-screen-list.md)): order confirmation, production order
creation, machine assignment, production entry form, a basic stock ledger view.

**Definition of done for the slice:** a supervisor can run one real order through the whole thread on a
real machine, and the resulting stock balance agrees with what the paper system would have shown.

**Before writing migrations:** resolve NC-28 if possible (affects `machines` seed data, not schema), and
skim [`13-master-data-migration.md`](13-master-data-migration.md) for the master-data collection
sequence — some masters (Machines, Shifts, Products) need real data before the slice can be tested
end-to-end, not just schema.

---

## If picking this up as a fresh Claude session

1. Read this file, then `00-README.md`, then `11-needs-confirmation.md`.
2. Confirm current git state: `git log --oneline -5` on `main` should show `154f09f` (or later) as the
   merge commit for this pack.
3. Check whether NC-28 has been answered since this handover was written — if so, update
   `11-needs-confirmation.md` and `05-database-schema.md`'s illustrative machine table accordingly
   before generating real seed data.
4. Do not restart the discovery/analysis work — it's done and signed off. Move straight to Phase 1
   planning/execution unless the user says otherwise.
5. If using the GSD workflow for the build phase, this pack (particularly `04-digital-modules.md`,
   `05-database-schema.md` and `10-migration-plan.md`) is the natural input to `/gsd:new-project` or
   `/gsd:plan-phase` — no `.planning/` directory exists yet in this repo.
