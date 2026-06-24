-- Hard reset for role helper functions and dependent RLS policies.
-- Use this if Supabase still shows:
-- return type mismatch in function declared to return user_role Actual return type is text. 42P13

-- 1) Drop dependent policies first. This avoids PostgreSQL keeping old function dependencies.
drop policy if exists "super admin all planes" on public.planes;
drop policy if exists "super admin all plan_features" on public.plan_features;
drop policy if exists "super admin all barberias" on public.barberias;
drop policy if exists "super admin all profiles" on public.profiles;

drop policy if exists "tenant read own barberia" on public.barberias;
drop policy if exists "tenant admin update own barberia" on public.barberias;
drop policy if exists "tenant can read active plans" on public.planes;
drop policy if exists "tenant can read plan features" on public.plan_features;

drop policy if exists "profiles tenant read" on public.profiles;
drop policy if exists "profiles tenant admin write" on public.profiles;

drop policy if exists "clientes tenant read" on public.clientes;
drop policy if exists "clientes admin cajero write" on public.clientes;

drop policy if exists "servicios tenant read" on public.servicios;
drop policy if exists "servicios admin write" on public.servicios;

drop policy if exists "productos admin cajero read" on public.productos;
drop policy if exists "productos admin cajero write" on public.productos;

drop policy if exists "citas tenant read" on public.citas;
drop policy if exists "citas admin cajero write" on public.citas;
drop policy if exists "citas barbero update own" on public.citas;

drop policy if exists "ventas admin cajero tenant" on public.ventas;
drop policy if exists "venta_detalle admin cajero tenant" on public.venta_detalle;

drop policy if exists "horarios tenant read" on public.horarios_barberia;
drop policy if exists "horarios admin write" on public.horarios_barberia;

drop policy if exists "redes tenant read" on public.redes_barberia;
drop policy if exists "redes admin write" on public.redes_barberia;

drop policy if exists "empleados tenant read" on public.empleados;
drop policy if exists "empleados admin write" on public.empleados;

-- 2) Drop helper functions. Use exact signatures.
drop function if exists public.is_staff();
drop function if exists public.is_admin();
drop function if exists public.is_super_admin();
drop function if exists public.get_user_barberia_id();
drop function if exists public.get_user_role();

-- 3) Recreate helpers with TEXT role return.
create function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.rol::text
  from public.profiles p
  where p.id = auth.uid()
    and p.activo = true
  limit 1
$$;

create function public.get_user_barberia_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.barberia_id
  from public.profiles p
  where p.id = auth.uid()
    and p.activo = true
  limit 1
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role() = 'super_admin', false)
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role() = 'admin', false)
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role() in ('admin','cajero','barbero'), false)
$$;

-- 4) Recreate RLS policies.
create policy "super admin all planes" on public.planes for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super admin all plan_features" on public.plan_features for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super admin all barberias" on public.barberias for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super admin all profiles" on public.profiles for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "tenant read own barberia" on public.barberias for select using (id = public.get_user_barberia_id());
create policy "tenant admin update own barberia" on public.barberias for update using (public.is_admin() and id = public.get_user_barberia_id()) with check (public.is_admin() and id = public.get_user_barberia_id());

create policy "tenant can read active plans" on public.planes for select using (activo = true);
create policy "tenant can read plan features" on public.plan_features for select using (true);

create policy "profiles tenant read" on public.profiles for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
create policy "profiles tenant admin write" on public.profiles for all using (public.is_admin() and barberia_id = public.get_user_barberia_id()) with check (public.is_admin() and barberia_id = public.get_user_barberia_id());

create policy "clientes tenant read" on public.clientes for select using (
  public.is_super_admin()
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'))
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and exists (
    select 1 from public.citas where citas.cliente_id = clientes.id and citas.barbero_id = auth.uid()
  ))
);
create policy "clientes admin cajero write" on public.clientes for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));

create policy "servicios tenant read" on public.servicios for select using (public.is_super_admin() or (barberia_id = public.get_user_barberia_id() and public.is_staff()));
create policy "servicios admin write" on public.servicios for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

create policy "productos admin cajero read" on public.productos for select using (public.is_super_admin() or (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')));
create policy "productos admin cajero write" on public.productos for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));

create policy "citas tenant read" on public.citas for select using (
  public.is_super_admin()
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'))
  or (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and barbero_id = auth.uid())
);
create policy "citas admin cajero write" on public.citas for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));
create policy "citas barbero update own" on public.citas for update using (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and barbero_id = auth.uid()) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() = 'barbero' and barbero_id = auth.uid());

create policy "ventas admin cajero tenant" on public.ventas for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));
create policy "venta_detalle admin cajero tenant" on public.venta_detalle for all using (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero')) with check (barberia_id = public.get_user_barberia_id() and public.get_user_role() in ('admin','cajero'));

create policy "horarios tenant read" on public.horarios_barberia for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
create policy "horarios admin write" on public.horarios_barberia for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

create policy "redes tenant read" on public.redes_barberia for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
create policy "redes admin write" on public.redes_barberia for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

create policy "empleados tenant read" on public.empleados for select using (public.is_super_admin() or barberia_id = public.get_user_barberia_id());
create policy "empleados admin write" on public.empleados for all using (barberia_id = public.get_user_barberia_id() and public.is_admin()) with check (barberia_id = public.get_user_barberia_id() and public.is_admin());

-- 5) Verification. The return_type for get_user_role MUST be text.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_user_role', 'get_user_barberia_id', 'is_super_admin', 'is_admin', 'is_staff')
order by p.proname;
