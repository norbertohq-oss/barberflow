-- BarberFlow Fase 3 - Bloque 1: Perfil completo de cliente
-- Ejecuta este archivo en Supabase SQL Editor antes de probar el nuevo perfil.

alter table public.clientes add column if not exists whatsapp text;
alter table public.clientes add column if not exists total_gastado numeric(12,2) not null default 0;
alter table public.clientes add column if not exists puntos_disponibles integer not null default 0;
alter table public.clientes add column if not exists puntos_totales integer not null default 0;
alter table public.clientes add column if not exists nivel_lealtad text not null default 'Sin nivel';
alter table public.clientes add column if not exists ultima_visita date;
alter table public.clientes add column if not exists visitas integer not null default 0;
alter table public.clientes add column if not exists barbero_favorito_id uuid references public.profiles(id) on delete set null;

alter table public.citas add column if not exists precio_total numeric(12,2);
alter table public.ventas add column if not exists estado text not null default 'completada';
alter table public.ventas add column if not exists fecha date;

update public.ventas
set fecha = created_at::date
where fecha is null;

alter table public.ventas alter column fecha set default current_date;

create index if not exists idx_ventas_cliente_fecha on public.ventas(cliente_id, created_at);
create index if not exists idx_citas_cliente_fecha on public.citas(cliente_id, fecha);
create index if not exists idx_venta_detalle_venta on public.venta_detalle(venta_id);

-- Backfill customer metrics from real sales and appointments.
with ventas_cliente as (
  select
    cliente_id,
    coalesce(sum(total), 0) as total_gastado,
    count(*)::int as compras,
    max(created_at)::date as ultima_compra
  from public.ventas
  where cliente_id is not null
  group by cliente_id
),
citas_cliente as (
  select
    cliente_id,
    count(*) filter (where estado = 'completada')::int as visitas,
    max(fecha) filter (where estado = 'completada') as ultima_cita
  from public.citas
  where cliente_id is not null
  group by cliente_id
),
barbero_favorito as (
  select distinct on (cliente_id)
    cliente_id,
    barbero_id
  from (
    select cliente_id, barbero_id, count(*) as total
    from public.citas
    where cliente_id is not null and barbero_id is not null
    group by cliente_id, barbero_id
  ) ranked
  order by cliente_id, total desc
)
update public.clientes c
set
  total_gastado = coalesce(v.total_gastado, c.total_gastado, 0),
  visitas = greatest(coalesce(cc.visitas, 0), coalesce(v.compras, 0), coalesce(c.visitas, 0)),
  ultima_visita = coalesce(
    greatest(coalesce(cc.ultima_cita, c.ultima_visita), coalesce(v.ultima_compra, c.ultima_visita)),
    cc.ultima_cita,
    v.ultima_compra,
    c.ultima_visita
  ),
  puntos_totales = greatest(coalesce(c.puntos_totales, 0), floor(coalesce(v.total_gastado, 0))::int),
  puntos_disponibles = greatest(coalesce(c.puntos_disponibles, 0), floor(coalesce(v.total_gastado, 0))::int),
  nivel_lealtad = case
    when greatest(coalesce(c.puntos_totales, 0), floor(coalesce(v.total_gastado, 0))::int) >= 2000 then 'Platino'
    when greatest(coalesce(c.puntos_totales, 0), floor(coalesce(v.total_gastado, 0))::int) >= 1000 then 'Oro'
    when greatest(coalesce(c.puntos_totales, 0), floor(coalesce(v.total_gastado, 0))::int) >= 500 then 'Plata'
    when greatest(coalesce(c.puntos_totales, 0), floor(coalesce(v.total_gastado, 0))::int) > 0 then 'Bronce'
    else coalesce(c.nivel_lealtad, 'Sin nivel')
  end,
  barbero_favorito_id = coalesce(b.barbero_id, c.barbero_favorito_id)
from ventas_cliente v
full join citas_cliente cc on cc.cliente_id = v.cliente_id
left join barbero_favorito b on b.cliente_id = coalesce(v.cliente_id, cc.cliente_id)
where c.id = coalesce(v.cliente_id, cc.cliente_id);

notify pgrst, 'reload schema';
