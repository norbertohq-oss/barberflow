-- BarberFlow - Mercado Pago Checkout Pro para planes SaaS
-- Ejecuta este archivo en Supabase SQL Editor antes de desplegar las Edge Functions.

alter table public.barberias add column if not exists plan_id uuid references public.planes(id) on delete set null;
alter table public.barberias add column if not exists fecha_inicio_plan timestamptz;
alter table public.barberias add column if not exists fecha_fin_plan timestamptz;

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  plan_id uuid not null references public.planes(id) on delete restrict,
  mercado_pago_payment_id text,
  mercado_pago_preference_id text,
  status text not null,
  status_detail text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'MXN',
  payer_email text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists pagos_mercado_pago_payment_id_unique
  on public.pagos(mercado_pago_payment_id)
  where mercado_pago_payment_id is not null;

create index if not exists idx_pagos_barberia_created_at on public.pagos(barberia_id, created_at desc);
create index if not exists idx_pagos_plan on public.pagos(plan_id);

alter table public.pagos enable row level security;

drop policy if exists "pagos tenant read" on public.pagos;
create policy "pagos tenant read" on public.pagos for select using (
  public.bf_is_super_admin()
  or barberia_id = public.bf_current_barberia_id()
);

drop policy if exists "pagos tenant insert admin" on public.pagos;
create policy "pagos tenant insert admin" on public.pagos for insert with check (
  public.bf_is_super_admin()
  or (barberia_id = public.bf_current_barberia_id() and public.bf_current_role() = 'admin')
);

notify pgrst, 'reload schema';
