-- ===========================================================================
-- 0003 — In-app admin settings
--
-- Enables the /admin/settings page:
--   * Staff management: users with role 'admin' may create/update/remove
--     profiles rows (role 'technical' staff cannot manage staff).
--   * Capability rules editing already works via the staff policy from 0002.
-- ===========================================================================

-- True only for staff with the 'admin' role (not 'technical').
create or replace function public.is_admin_role(uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin_role(uuid) to authenticated;

-- Admin-only write access to profiles (SELECT policy from 0001 already lets
-- staff read all rows and any user read their own).
create policy admin_insert_profiles on public.profiles
  for insert with check (is_admin_role(auth.uid()));

create policy admin_update_profiles on public.profiles
  for update using (is_admin_role(auth.uid())) with check (is_admin_role(auth.uid()));

-- Admins may remove staff, but never their own row (prevents locking
-- everyone out by accident).
create policy admin_delete_profiles on public.profiles
  for delete using (is_admin_role(auth.uid()) and id <> auth.uid());
