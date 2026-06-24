-- BarberFlow Fase 3 - Bloque 2: Programa de lealtad configurable
-- Ejecuta este archivo en Supabase SQL Editor.

create table if not exists public.loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null unique references public.barberias(id) on delete cascade,
  activo boolean not null default true,
  puntos_por_peso numeric(10,4) not null default 1,
  nombre_programa text not null default 'BarberFlow Rewards',
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  nombre text not null,
  puntos_min integer not null default 0,
  puntos_max integer,
  beneficios text,
  descuento_porcentaje numeric(5,2) not null default 0,
  color text not null default '#D4AF37',
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_tiers_points_check check (puntos_max is null or puntos_max >= puntos_min)
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  venta_id uuid references public.ventas(id) on delete set null,
  tipo text not null check (tipo in ('ganado','canjeado','ajuste')),
  puntos integer not null,
  descripcion text,
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_settings_barberia on public.loyalty_settings(barberia_id);
create index if not exists idx_loyalty_tiers_barberia_points on public.loyalty_tiers(barberia_id, puntos_min);
create index if not exists idx_loyalty_transactions_cliente on public.loyalty_transactions(cliente_id, created_at desc);
create index if not exists idx_loyalty_transactions_barberia on public.loyalty_transactions(barberia_id, created_at desc);

drop trigger if exists set_loyalty_settings_updated_at on public.loyalty_settings;
create trigger set_loyalty_settings_updated_at before update on public.loyalty_settings for each row execute function public.set_updated_at();

drop trigger if exists set_loyalty_tiers_updated_at on public.loyalty_tiers;
create trigger set_loyalty_tiers_updated_at before update on public.loyalty_tiers for each row execute function public.set_updated_at();

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_tiers enable row level security;
alter table public.loyalty_transactions enable row level security;

drop policy if exists "loyalty settings tenant read" on public.loyalty_settings;
create policy "loyalty settings tenant read" on public.loyalty_settings for select using (
  public.bf_is_super_admin() or barberia_id = public.bf_current_barberia_id()
);
drop policy if exists "loyalty settings admin write" on public.loyalty_settings;
create policy "loyalty settings admin write" on public.loyalty_settings for all using (
  barberia_id = public.bf_current_barberia_id() and public.bf_is_admin()
) with check (
  barberia_id = public.bf_current_barberia_id() and public.bf_is_admin()
);

drop policy if exists "loyalty tiers tenant read" on public.loyalty_tiers;
create policy "loyalty tiers tenant read" on public.loyalty_tiers for select using (
  public.bf_is_super_admin() or barberia_id = public.bf_current_barberia_id()
);
drop policy if exists "loyalty tiers admin write" on public.loyalty_tiers;
create policy "loyalty tiers admin write" on public.loyalty_tiers for all using (
  barberia_id = public.bf_current_barberia_id() and public.bf_is_admin()
) with check (
  barberia_id = public.bf_current_barberia_id() and public.bf_is_admin()
);

drop policy if exists "loyalty transactions tenant read" on public.loyalty_transactions;
create policy "loyalty transactions tenant read" on public.loyalty_transactions for select using (
  public.bf_is_super_admin() or barberia_id = public.bf_current_barberia_id()
);
drop policy if exists "loyalty transactions admin cajero write" on public.loyalty_transactions;
create policy "loyalty transactions admin cajero write" on public.loyalty_transactions for insert with check (
  barberia_id = public.bf_current_barberia_id() and public.bf_current_role() in ('admin','cajero')
);

-- Crear configuracion y niveles por defecto para barberias existentes.
insert into public.loyalty_settings (barberia_id)
select id from public.barberias
on conflict (barberia_id) do nothing;

insert into public.loyalty_tiers (barberia_id, nombre, puntos_min, puntos_max, beneficios, descuento_porcentaje, color, orden)
select b.id, tier.nombre, tier.puntos_min, tier.puntos_max, tier.beneficios, tier.descuento, tier.color, tier.orden
from public.barberias b
cross join (
  values
    ('Bronce', 0, 499, 'Beneficios iniciales y promociones ocasionales.', 0, '#B87333', 1),
    ('Plata', 500, 999, '5% de descuento sugerido en servicios seleccionados.', 5, '#C0C0C0', 2),
    ('Oro', 1000, 1999, '10% de descuento sugerido y prioridad en agenda.', 10, '#D4AF37', 3),
    ('Platino', 2000, null, '15% de descuento sugerido y beneficios VIP.', 15, '#E5E7EB', 4)
) as tier(nombre, puntos_min, puntos_max, beneficios, descuento, color, orden)
where not exists (
  select 1 from public.loyalty_tiers existing where existing.barberia_id = b.id
);

notify pgrst, 'reload schema';
