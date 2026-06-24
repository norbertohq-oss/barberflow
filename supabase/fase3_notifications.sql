-- BarberFlow Fase 3 - Sistema de notificaciones + stock POS
-- Ejecuta este archivo en Supabase SQL Editor.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  leida boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  desktop_enabled boolean not null default false,
  sound_enabled boolean not null default true,
  volume numeric(3,2) not null default 0.7 check (volume >= 0 and volume <= 1),
  notify_new_appointments boolean not null default true,
  notify_cancellations boolean not null default true,
  notify_sales boolean not null default false,
  notify_support boolean not null default true,
  notify_inactive_clients boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_settings
  add column if not exists notify_inactive_clients boolean not null default true;

create table if not exists public.soporte_tickets (
  id uuid primary key default gen_random_uuid(),
  barberia_id uuid not null references public.barberias(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  categoria text not null default 'duda_uso',
  asunto text not null,
  mensaje text not null,
  estado text not null default 'abierto',
  prioridad text not null default 'media',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_tenant_read on public.notifications(barberia_id, leida, created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, leida, created_at desc);
create index if not exists idx_soporte_tickets_barberia on public.soporte_tickets(barberia_id, created_at desc);

drop trigger if exists set_user_notification_settings_updated_at on public.user_notification_settings;
create trigger set_user_notification_settings_updated_at before update on public.user_notification_settings for each row execute function public.set_updated_at();

drop trigger if exists set_soporte_tickets_updated_at on public.soporte_tickets;
create trigger set_soporte_tickets_updated_at before update on public.soporte_tickets for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
alter table public.user_notification_settings enable row level security;
alter table public.soporte_tickets enable row level security;

drop policy if exists "notifications tenant read" on public.notifications;
create policy "notifications tenant read" on public.notifications for select using (
  public.bf_is_super_admin()
  or (barberia_id = public.bf_current_barberia_id() and (user_id is null or user_id = auth.uid()))
);

drop policy if exists "notifications tenant update own" on public.notifications;
create policy "notifications tenant update own" on public.notifications for update using (
  barberia_id = public.bf_current_barberia_id() and (user_id is null or user_id = auth.uid())
) with check (
  barberia_id = public.bf_current_barberia_id() and (user_id is null or user_id = auth.uid())
);

drop policy if exists "notifications service insert" on public.notifications;
create policy "notifications service insert" on public.notifications for insert with check (
  public.bf_is_super_admin()
  or barberia_id = public.bf_current_barberia_id()
);

drop policy if exists "notification settings read own" on public.user_notification_settings;
create policy "notification settings read own" on public.user_notification_settings for select using (user_id = auth.uid());

drop policy if exists "notification settings insert own" on public.user_notification_settings;
create policy "notification settings insert own" on public.user_notification_settings for insert with check (user_id = auth.uid());

drop policy if exists "notification settings update own" on public.user_notification_settings;
create policy "notification settings update own" on public.user_notification_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "support tickets tenant read" on public.soporte_tickets;
create policy "support tickets tenant read" on public.soporte_tickets for select using (
  public.bf_is_super_admin() or barberia_id = public.bf_current_barberia_id()
);

drop policy if exists "support tickets tenant insert" on public.soporte_tickets;
create policy "support tickets tenant insert" on public.soporte_tickets for insert with check (
  barberia_id = public.bf_current_barberia_id()
);

drop policy if exists "support tickets tenant update" on public.soporte_tickets;
create policy "support tickets tenant update" on public.soporte_tickets for update using (
  barberia_id = public.bf_current_barberia_id() and public.bf_current_role() in ('admin','cajero')
) with check (
  barberia_id = public.bf_current_barberia_id() and public.bf_current_role() in ('admin','cajero')
);

create or replace function public.create_tenant_notification(
  p_barberia_id uuid,
  p_tipo text,
  p_titulo text,
  p_mensaje text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (barberia_id, tipo, titulo, mensaje, metadata)
  values (p_barberia_id, p_tipo, p_titulo, p_mensaje, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.notify_cita_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.create_tenant_notification(
      new.barberia_id,
      'nueva_cita',
      'Nueva cita registrada',
      'Se creo una cita para ' || new.fecha || ' a las ' || left(new.hora_inicio::text, 5),
      jsonb_build_object('cita_id', new.id, 'cliente_id', new.cliente_id, 'origen', 'citas')
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.estado is distinct from new.estado and new.estado = 'cancelada' then
      perform public.create_tenant_notification(
        new.barberia_id,
        'cita_cancelada',
        'Cita cancelada',
        'Una cita del ' || new.fecha || ' a las ' || left(new.hora_inicio::text, 5) || ' fue cancelada.',
        jsonb_build_object('cita_id', new.id, 'cliente_id', new.cliente_id)
      );
    elsif old.fecha is distinct from new.fecha or old.hora_inicio is distinct from new.hora_inicio or old.barbero_id is distinct from new.barbero_id then
      perform public.create_tenant_notification(
        new.barberia_id,
        'cita_modificada',
        'Cita modificada',
        'Una cita fue modificada para ' || new.fecha || ' a las ' || left(new.hora_inicio::text, 5),
        jsonb_build_object('cita_id', new.id, 'cliente_id', new.cliente_id)
      );
    end if;
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.notify_venta_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_tenant_notification(
    new.barberia_id,
    'nueva_venta',
    'Nueva venta registrada',
    'Venta registrada por $' || coalesce(new.total, 0)::text || ' MXN.',
    jsonb_build_object('venta_id', new.id, 'cliente_id', new.cliente_id, 'total', new.total)
  );
  return new;
end;
$$;

create or replace function public.notify_support_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_tenant_notification(
    new.barberia_id,
    'ticket_soporte',
    'Nuevo ticket de soporte',
    new.asunto,
    jsonb_build_object('ticket_id', new.id, 'categoria', new.categoria, 'prioridad', new.prioridad)
  );
  return new;
end;
$$;

create or replace function public.notify_inactive_client(
  p_barberia_id uuid,
  p_cliente_id uuid,
  p_cliente_nombre text,
  p_dias_inactivo integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.bf_is_super_admin()
    or (p_barberia_id = public.bf_current_barberia_id() and public.bf_current_role() in ('admin','cajero'))
  ) then
    raise exception 'No autorizado para crear notificaciones de clientes inactivos';
  end if;

  perform public.create_tenant_notification(
    p_barberia_id,
    'cliente_inactivo',
    'Cliente inactivo detectado',
    coalesce(p_cliente_nombre, 'Un cliente') || ' lleva ' || p_dias_inactivo::text || ' dias sin visita.',
    jsonb_build_object('cliente_id', p_cliente_id, 'dias_inactivo', p_dias_inactivo)
  );
end;
$$;

drop trigger if exists notify_cita_changes_trigger on public.citas;
create trigger notify_cita_changes_trigger after insert or update on public.citas for each row execute function public.notify_cita_changes();

drop trigger if exists notify_venta_insert_trigger on public.ventas;
create trigger notify_venta_insert_trigger after insert on public.ventas for each row execute function public.notify_venta_insert();

drop trigger if exists notify_support_insert_trigger on public.soporte_tickets;
create trigger notify_support_insert_trigger after insert on public.soporte_tickets for each row execute function public.notify_support_insert();

-- Atomic helper for POS product inventory.
create or replace function public.decrement_product_stock(
  p_barberia_id uuid,
  p_producto_id uuid,
  p_quantity integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stock integer;
begin
  if not (
    public.bf_is_super_admin()
    or (p_barberia_id = public.bf_current_barberia_id() and public.bf_current_role() in ('admin','cajero'))
  ) then
    raise exception 'No autorizado para descontar inventario';
  end if;

  select stock into current_stock
  from public.productos
  where id = p_producto_id
    and barberia_id = p_barberia_id
  for update;

  if current_stock is null then
    raise exception 'Producto no encontrado';
  end if;

  if current_stock < p_quantity then
    raise exception 'Stock insuficiente para producto %. Disponible: %, solicitado: %', p_producto_id, current_stock, p_quantity;
  end if;

  update public.productos
  set stock = stock - p_quantity
  where id = p_producto_id
    and barberia_id = p_barberia_id;
end;
$$;

revoke execute on function public.create_tenant_notification(uuid, text, text, text, jsonb) from anon, authenticated;

notify pgrst, 'reload schema';
