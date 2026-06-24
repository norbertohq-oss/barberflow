-- BarberFlow Fase 3 - Bloque 3: Portal publico de reservas step by step
-- Ejecuta este archivo en Supabase SQL Editor.

alter table public.barberias add column if not exists slug text;
alter table public.barberias add column if not exists reservas_publicas boolean not null default true;
alter table public.barberias add column if not exists reserva_estado_default text not null default 'pendiente';

alter type public.appointment_status add value if not exists 'en_proceso';
alter type public.appointment_status add value if not exists 'no_show';

create unique index if not exists idx_barberias_slug_unique on public.barberias(slug) where slug is not null;

-- Backfill slugs for existing barberias.
update public.barberias
set slug = lower(regexp_replace(regexp_replace(nombre_comercial, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null or slug = '';

-- If duplicates happened after normalization, append a short id fragment.
with duplicates as (
  select slug
  from public.barberias
  where slug is not null
  group by slug
  having count(*) > 1
)
update public.barberias b
set slug = b.slug || '-' || left(b.id::text, 6)
from duplicates d
where b.slug = d.slug;

-- Public read policies for booking portal.
drop policy if exists "public booking read active barberias" on public.barberias;
create policy "public booking read active barberias" on public.barberias for select using (
  reservas_publicas = true and estado in ('activa','prueba')
);

drop policy if exists "public booking read active services" on public.servicios;
create policy "public booking read active services" on public.servicios for select using (
  activo = true and exists (
    select 1 from public.barberias b
    where b.id = servicios.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

drop policy if exists "public booking read active barbers" on public.profiles;
create policy "public booking read active barbers" on public.profiles for select using (
  activo = true
  and rol = 'barbero'
  and exists (
    select 1 from public.barberias b
    where b.id = profiles.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

drop policy if exists "public booking read schedules" on public.horarios_barberia;
create policy "public booking read schedules" on public.horarios_barberia for select using (
  exists (
    select 1 from public.barberias b
    where b.id = horarios_barberia.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

drop policy if exists "public booking read appointments" on public.citas;
create policy "public booking read appointments" on public.citas for select using (
  exists (
    select 1 from public.barberias b
    where b.id = citas.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

drop policy if exists "public booking upsert clients" on public.clientes;
create policy "public booking upsert clients" on public.clientes for insert with check (
  exists (
    select 1 from public.barberias b
    where b.id = clientes.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

drop policy if exists "public booking update matching clients" on public.clientes;
create policy "public booking update matching clients" on public.clientes for update using (
  exists (
    select 1 from public.barberias b
    where b.id = clientes.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
) with check (
  exists (
    select 1 from public.barberias b
    where b.id = clientes.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

drop policy if exists "public booking create appointments" on public.citas;
create policy "public booking create appointments" on public.citas for insert with check (
  estado in ('pendiente','confirmada')
  and exists (
    select 1 from public.barberias b
    where b.id = citas.barberia_id
      and b.reservas_publicas = true
      and b.estado in ('activa','prueba')
  )
);

notify pgrst, 'reload schema';
