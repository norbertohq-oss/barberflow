-- Final cleanup for legacy enum role policies/functions.
-- This removes the old policies that still call public."current_role"()
-- and still compare against public.user_role enum values.

-- 1) Drop legacy policies found in diagnostics.
drop policy if exists "citas admin cajero write tenant" on public.citas;
drop policy if exists "citas read tenant role" on public.citas;
drop policy if exists "clientes admin cajero write tenant" on public.clientes;
drop policy if exists "clientes read staff tenant" on public.clientes;
drop policy if exists "productos admin cajero read tenant" on public.productos;
drop policy if exists "productos admin cajero write tenant" on public.productos;
drop policy if exists "profiles select tenant" on public.profiles;

-- 2) Drop legacy helper functions after their policies are gone.
drop function if exists public."current_role"();
drop function if exists public.current_barberia_id();

-- 3) Recreate handle_new_user without casting rol to public.user_role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, barberia_id, nombre, email, rol)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'barberia_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'cliente')::text
  )
  on conflict (id) do update set
    barberia_id = excluded.barberia_id,
    nombre = excluded.nombre,
    email = excluded.email,
    rol = excluded.rol;

  return new;
end;
$$;

-- 4) Reload PostgREST schema cache.
notify pgrst, 'reload schema';

-- 5) Diagnostics: these should return zero rows.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ilike '%current_role%'
    or coalesce(with_check, '') ilike '%current_role%'
    or coalesce(qual, '') ilike '%user_role%'
    or coalesce(with_check, '') ilike '%user_role%'
  )
order by tablename, policyname;
