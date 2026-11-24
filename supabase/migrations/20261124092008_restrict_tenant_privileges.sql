-- Tenant administrators can manage ordinary users in their own shop but cannot grant or edit the global super-administrator role.
drop policy if exists "profiles tenant admin write" on public.profiles;
create policy "profiles tenant admin write" on public.profiles
  for all to authenticated
  using (public.bf_is_admin() and barberia_id = public.bf_current_barberia_id() and rol <> 'super_admin')
  with check (public.bf_is_admin() and barberia_id = public.bf_current_barberia_id() and rol <> 'super_admin');

-- Payment records must only be written by the trusted payment integration.
drop policy if exists "pagos tenant insert admin" on public.pagos;
