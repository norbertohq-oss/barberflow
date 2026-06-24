-- BarberFlow Fase 2 - SaaS multi-barberia con Super Admin
-- Ejecuta este archivo en Supabase SQL Editor.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.appointment_status as enum ('pendiente', 'confirmada', 'completada', 'cancelada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('efectivo', 'tarjeta', 'transferencia');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.planes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_mensual numeric(12,2) not null default 0,
  precio_anual numeric(12,2) not null default 0,
  limite_usuarios int,
  limite_barberos int,
  limite_citas_mes int,
  incluye_whatsapp boolean not null default false,
  incluye_reportes boolean not null default false,
  incluye_lealtad boolean not null default false,
  incluye_membresias boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes(id) on delete cascade,
  nombre text not null,
  descripcion text,
  incluido boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.barberias (
  id uuid primary key default gen_random_uuid(),
  nombre_comercial text not null,
  slogan text,
  telefono text,
  whatsapp text,
  direccion text,
  logo_url text,
  estado text not null default 'activa' check (estado in ('activa','suspendida','cancelada','prueba')),
  plan_id uuid references public.planes(id) on delete set null,
  fecha_inicio_plan date,
  fecha_fin_plan date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  barberia_id uuid references public.barberias(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'cliente' check (rol in ('super_admin','admin','cajero','barbero','cliente')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_barberia_required check (rol = 'super_admin' or barberia_id is not null)
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  nombre text not null,
  telefono text,
  email text,
  fecha_nacimiento date,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  nombre text not null,
  categoria text not null,
  duracion_minutos integer not null check (duracion_minutos > 0),
  precio numeric(12,2) not null check (precio >= 0),
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  nombre text not null,
  categoria text,
  precio numeric(12,2) not null check (precio >= 0),
  stock integer not null default 0 check (stock >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  servicio_id uuid references public.servicios(id) on delete set null,
  barbero_id uuid references public.profiles(id) on delete set null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time,
  estado public.appointment_status not null default 'pendiente',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  cajero_id uuid references public.profiles(id) on delete set null,
  barbero_id uuid references public.profiles(id) on delete set null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  descuento numeric(12,2) not null default 0 check (descuento >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  metodo_pago public.payment_method not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venta_detalle (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  venta_id uuid not null references public.ventas(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  producto_id uuid references public.productos(id) on delete set null,
  descripcion text not null,
  cantidad integer not null default 1 check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venta_detalle_item_check check (
    (servicio_id is not null and producto_id is null)
    or (servicio_id is null and producto_id is not null)
  )
);

create table if not exists public.horarios_barberia (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  abre boolean not null default true,
  hora_apertura time,
  hora_cierre time,
  descanso_inicio time,
  descanso_fin time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barberia_id, dia_semana)
);

create table if not exists public.redes_barberia (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null unique references public.barberias(id) on delete cascade,
  instagram text,
  facebook text,
  tiktok text,
  sitio_web text,
  google_maps text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  nombre text not null,
  telefono text,
  email text,
  rol text,
  especialidad text,
  comision_porcentaje numeric(5,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migracion para proyectos que ya ejecutaron Fase 1/Fase 2 inicial.
alter table public.barberias add column if not exists whatsapp text;
alter table public.barberias add column if not exists estado text not null default 'activa';
alter table public.barberias add column if not exists plan_id uuid references public.planes(id) on delete set null;
alter table public.barberias add column if not exists fecha_inicio_plan date;
alter table public.barberias add column if not exists fecha_fin_plan date;
alter table public.profiles alter column barberia_id drop not null;
alter table public.profiles alter column rol type text using rol::text;
alter table public.barberias alter column estado type text using estado::text;
alter table public.ventas add column if not exists barbero_id uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'barberias_estado_check'
  ) then
    alter table public.barberias
      add constraint barberias_estado_check check (estado in ('activa','suspendida','cancelada','prueba'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_rol_check'
  ) then
    alter table public.profiles
      add constraint profiles_rol_check check (rol in ('super_admin','admin','cajero','barbero','cliente'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_barberia_required'
  ) then
    alter table public.profiles
      add constraint profiles_barberia_required check (rol = 'super_admin' or barberia_id is not null);
  end if;
end $$;

create index if not exists idx_barberias_plan on public.barberias(plan_id);
create index if not exists idx_profiles_barberia on public.profiles(barberia_id);
create index if not exists idx_clientes_barberia_nombre on public.clientes(barberia_id, nombre);
create index if not exists idx_servicios_barberia on public.servicios(barberia_id);
create index if not exists idx_productos_barberia on public.productos(barberia_id);
create index if not exists idx_citas_barberia_fecha on public.citas(barberia_id, fecha);
create index if not exists idx_citas_barbero_fecha on public.citas(barbero_id, fecha);
create index if not exists idx_ventas_barberia_created on public.ventas(barberia_id, created_at);
create index if not exists idx_empleados_barberia on public.empleados(barberia_id);

-- Recreate helper functions when migrating from the old enum-based role type.
-- PostgreSQL cannot change a function return type with CREATE OR REPLACE.
drop function if exists public.is_staff() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_super_admin() cascade;
drop function if exists public.get_user_role() cascade;

create or replace function public.get_user_role()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.profiles where id = auth.uid() and activo = true limit 1
$$;

create or replace function public.get_user_barberia_id()
returns uuid language sql stable security definer set search_path = public as $$
  select barberia_id from public.profiles where id = auth.uid() and activo = true limit 1
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.get_user_role() = 'super_admin'
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.get_user_role() = 'admin'
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.get_user_role() in ('admin','cajero','barbero')
$$;

do $$
declare t text;
begin
  foreach t in array array['planes','plan_features','barberias','profiles','clientes','servicios','productos','citas','ventas','venta_detalle','horarios_barberia','redes_barberia','empleados']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Triggers updated_at
do $$
declare t text;
begin
  foreach t in array array['planes','barberias','profiles','clientes','servicios','productos','citas','ventas','venta_detalle','horarios_barberia','redes_barberia','empleados']
  loop
    execute format('drop trigger if exists set_%s_updated_at on public.%I', t, t);
    execute format('create trigger set_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Super admin policies
drop policy if exists "super admin all planes" on public.planes;
create policy "super admin all planes" on public.planes for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "super admin all plan_features" on public.plan_features;
create policy "super admin all plan_features" on public.plan_features for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "super admin all barberias" on public.barberias;
create policy "super admin all barberias" on public.barberias for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "super admin all profiles" on public.profiles;
create policy "super admin all profiles" on public.profiles for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Tenant read/write policies
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

insert into public.planes (nombre, descripcion, precio_mensual, precio_anual, limite_usuarios, limite_barberos, limite_citas_mes, incluye_reportes)
values
  ('Basico', 'Para barberias que inician operaciones digitales.', 599, 5990, 3, 2, 200, true),
  ('Profesional', 'Para equipos con agenda, POS y reportes.', 1199, 11990, 10, 8, 1000, true),
  ('Premium', 'Para barberias en crecimiento con herramientas avanzadas.', 2499, 24990, null, null, null, true)
on conflict do nothing;

-- Crear primer super_admin:
-- 1) Crea usuario en Authentication.
-- 2) Ejecuta:
-- insert into public.profiles (id, barberia_id, nombre, email, rol)
-- values ('AUTH_USER_ID', null, 'Norberto', 'norbertohq@icloud.com', 'super_admin')
-- on conflict (id) do update set rol = 'super_admin', barberia_id = null, activo = true;
