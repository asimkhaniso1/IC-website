# Supabase setup — Design Studio and Factory Live

## 1. Create the project

Create a Supabase project (region close to Karachi, e.g. `ap-south-1`), then copy:

- Project URL → `VITE_SUPABASE_URL` in `.env.local` (and Vercel env vars)
- `anon` public key → `VITE_SUPABASE_ANON_KEY`

The app runs fully offline (localStorage drafts) until these are set.

## 2. Apply the migrations

Apply every numbered file in `migrations/` in ascending order. The migrations
are cumulative and later files reference objects created by earlier files.
The current sequence is `0001_init.sql` through
`0036_auto_queue_quickbooks_documents.sql`.

In the Supabase SQL Editor, paste and run one complete file at a time. Existing
projects should start with the first migration they have not already applied.
For this production project, migrations through `0036` have been applied.
Alternatively, with a linked Supabase CLI project:

```bash
supabase db push
```

The first migrations establish the Design Studio. Migration `0004` onward adds
Factory Live, including production, quality, purchasing, the append-only stock
ledger, customer material custody, costing, and QuickBooks synchronization.

`0002_production_specs.sql` adds two tables:

- **`production_specs`** — the INTERNAL production/manufacturing
  specification, one row per project, kept strictly separate from the
  customer's design requirement (`design_revisions.spec`). Staff-only via
  RLS; never exposed to anonymous customers. The technical team's approved
  parameters never overwrite the customer's original submission, and the
  customer's choices never automatically become an approved spec — approval
  is an explicit staff action (`status: 'draft' | 'approved'`).
- **`capability_rules`** — the manufacturing capability library (per-family
  width/color/elongation limits, standard widths/roll lengths, construction
  options). Anon SELECT is allowed since these are non-sensitive
  manufacturing limits intended to drive client-side validation; staff have
  full read/write.

## 3. Create the first admin user

1. Dashboard → Authentication → Users → *Add user* (email + password, auto-confirm).
2. SQL Editor:

```sql
insert into public.profiles (id, role, full_name)
values ('<the-user-uuid>', 'admin', 'Your Name');
```

Log in at `/admin/login`.

## Access model

- Anonymous customers never query tables directly — everything goes through
  `SECURITY DEFINER` RPCs (`create_design`, `save_revision`,
  `get_designs_by_token`, `get_design`, `submit_rfq`) that verify a
  browser-held `owner_token` UUID.
- Staff (any row in `profiles`) get full access via RLS `is_staff()` policies.
- Storage bucket `artwork` is private: anon may only INSERT; staff may read.

## Notes / V1 limitations

- No rate limiting on anon RPCs (acceptable for V1; add captcha or edge rate
  limits before heavy marketing).
- Design IDs are per-family Postgres sequences (`J-DES-000001`, …) minted
  server-side in `create_design` — race-free, never reused.
- Local drafts made before Supabase was configured are labeled `LOCAL-*` and
  stay in the browser; customers can re-save them once online.
