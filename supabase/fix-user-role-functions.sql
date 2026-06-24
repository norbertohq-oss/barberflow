-- Fix for:
-- return type mismatch in function declared to return user_role
--
-- Cause: the project migrated profiles.rol from enum to text, but PostgreSQL
-- keeps the old function return type unless the function is dropped first.

drop function if exists public.is_staff() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_super_admin() cascade;
drop function if exists public.get_user_role() cascade;

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol::text from public.profiles where id = auth.uid() and activo = true limit 1
$$;

create or replace function public.get_user_barberia_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select barberia_id from public.profiles where id = auth.uid() and activo = true limit 1
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role() = 'super_admin'
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role() = 'admin'
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role() in ('admin','cajero','barbero')
$$;

drop policy if exists "super admin all planes" on public.planes;
create policy "super admin all planes" on public.planes for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "super admin all plan_features" on public.plan_features;
create policy "super admin all plan_features" on public.plan_features for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "super admin all barberias" on public.barberias;
create policy "super admin all barberias" on public.barberias for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "super admin all profiles" on public.profiles;
create policy "super admin all profiles" on public.profiles for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "tenant read own barberia" on public.barberias;
create policy "tenant read own barberia" on public.barberias for select using (id = public.get_user_barberia_id());
drop policy if exists "tenant admin update own barberia" on public.barberias;
create policy "tenant admin update own barberia" on public.barberias for update using (public.is_admin() and id = public.get_user_barberia_id()) with check (public.is_admin() and id = public.get_user_barberia_id());

drop policy if exists "tenant can read active plans" on public.planes;
create policy "tenant can read active plans" on public.planes for select using (activo = true);
drop policy if exists "tenant can read plan features" on public.plan_features;
create policy "tenant can read plan features" on public.plan_features for select using (true);

drop policy if exists "profiles tenant read" on public.profiles;
create policy "profiles tenant read" on public.profiles for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
drop policy if exists "profiles tenant admin write" on public.profiles;
create policy "profiles tenant admin write" on public.profiles for all using (public.is_admin() and barberia_id = public.get_user_barberia_id()) with check (public.is_admin() and barberia_id = public.get_user_barberia_id());

drop policy if exists "clientes tenant read" on public.clientes;
create policy "clientes tenant read" on public.clientes for select using (
  public.is_super_admin()
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'))
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and exists (
    select 1 from public.citas where citas.cliente_id = clientes.id and citas.barbero_id = auth.uid()
  ))
);
drop policy if exists "clientes admin cajero write" on public.clientes;
create policy "clientes admin cajero write" on public.clientes for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));

drop policy if exists "servicios tenant read" on public.servicios;
create policy "servicios tenant read" on public.servicios for select using (public.is_super_admin() or (barberia_id = public.get_user_barberia_id() and public.is_staff()));
drop policy if exists "servicios admin write" on public.servicios;
create policy "servicios admin write" on public.servicios for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

drop policy if exists "productos admin cajero read" on public.productos;
create policy "productos admin cajero read" on public.productos for select using (public.is_super_admin() or (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')));
drop policy if exists "productos admin cajero write" on public.productos;
create policy "productos admin cajero write" on public.productos for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));

drop policy if exists "citas tenant read" on public.citas;
create policy "citas tenant read" on public.citas for select using (
  public.is_super_admin()
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'))
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and barbero_id = auth.uid())
);
drop policy if exists "citas admin cajero write" on public.citas;
create policy "citas admin cajero write" on public.citas for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));
drop policy if exists "citas barbero update own" on public.citas;
create policy "citas barbero update own" on public.citas for update using (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and barbero_id = auth.uid()) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and barbero_id = auth.uid());

drop policy if exists "ventas admin cajero tenant" on public.ventas;
create policy "ventas admin cajero tenant" on public.ventas for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));
drop policy if exists "venta_detalle admin cajero tenant" on public.venta_detalle;
create policy "venta_detalle admin cajero tenant" on public.venta_detalle for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));

drop policy if exists "horarios tenant read" on public.horarios_barberia;
create policy "horarios tenant read" on public.horarios_barberia for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
drop policy if exists "horarios admin write" on public.horarios_barberia;
create policy "horarios admin write" on public.horarios_barberia for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

drop policy if exists "redes tenant read" on public.redes_barberia;
create policy "redes tenant read" on public.redes_barberia for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
drop policy if exists "redes admin write" on public.redes_barberia;
create policy "redes admin write" on public.redes_barberia for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

drop policy if exists "empleados tenant read" on public.empleados;
create policy "empleados tenant read" on public.empleados for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
drop policy if exists "empleados admin write" on public.empleados;
create policy "empleados admin write" on public.empleados for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());
