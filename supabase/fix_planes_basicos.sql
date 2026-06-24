-- BarberFlow - deja solo los planes oficiales: Basico, Profesional y Premium.
-- Conserva el plan mas reciente de cada nombre y desactiva cualquier otro plan.

with ranked as (
  select
    id,
    lower(nombre) as normalized_name,
    row_number() over (
      partition by lower(nombre)
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.planes
  where lower(nombre) in ('basico', 'profesional', 'premium')
),
keepers as (
  select id, normalized_name
  from ranked
  where rn = 1
),
updated_keep as (
  update public.planes p
  set
    nombre = case k.normalized_name
      when 'basico' then 'Basico'
      when 'profesional' then 'Profesional'
      when 'premium' then 'Premium'
      else p.nombre
    end,
    descripcion = case k.normalized_name
      when 'basico' then 'Para barberias que inician operaciones digitales.'
      when 'profesional' then 'Para equipos con agenda, POS y reportes.'
      when 'premium' then 'Para barberias en crecimiento con herramientas avanzadas.'
      else p.descripcion
    end,
    precio_mensual = case k.normalized_name
      when 'basico' then 599
      when 'profesional' then 1199
      when 'premium' then 2499
      else p.precio_mensual
    end,
    precio_anual = case k.normalized_name
      when 'basico' then 5990
      when 'profesional' then 11990
      when 'premium' then 24990
      else p.precio_anual
    end,
    limite_usuarios = case k.normalized_name
      when 'basico' then 3
      when 'profesional' then 10
      when 'premium' then null
      else p.limite_usuarios
    end,
    limite_barberos = case k.normalized_name
      when 'basico' then 2
      when 'profesional' then 8
      when 'premium' then null
      else p.limite_barberos
    end,
    limite_citas_mes = case k.normalized_name
      when 'basico' then 200
      when 'profesional' then 1000
      when 'premium' then null
      else p.limite_citas_mes
    end,
    incluye_reportes = true,
    incluye_lealtad = k.normalized_name in ('profesional', 'premium'),
    incluye_membresias = k.normalized_name = 'premium',
    activo = true
  from keepers k
  where p.id = k.id
  returning p.id
)
update public.planes p
set activo = false
where p.id not in (select id from updated_keep);

insert into public.planes (
  nombre,
  descripcion,
  precio_mensual,
  precio_anual,
  limite_usuarios,
  limite_barberos,
  limite_citas_mes,
  incluye_reportes,
  incluye_lealtad,
  incluye_membresias,
  activo
)
select *
from (
  values
    ('Basico', 'Para barberias que inician operaciones digitales.', 599::numeric, 5990::numeric, 3::int, 2::int, 200::int, true, false, false, true),
    ('Profesional', 'Para equipos con agenda, POS y reportes.', 1199::numeric, 11990::numeric, 10::int, 8::int, 1000::int, true, true, false, true),
    ('Premium', 'Para barberias en crecimiento con herramientas avanzadas.', 2499::numeric, 24990::numeric, null::int, null::int, null::int, true, true, true, true)
) as seed(nombre, descripcion, precio_mensual, precio_anual, limite_usuarios, limite_barberos, limite_citas_mes, incluye_reportes, incluye_lealtad, incluye_membresias, activo)
where not exists (
  select 1
  from public.planes p
  where lower(p.nombre) = lower(seed.nombre)
    and p.activo = true
);

create unique index if not exists planes_nombre_normalizado_unique
  on public.planes (lower(nombre))
  where activo = true;

notify pgrst, 'reload schema';
