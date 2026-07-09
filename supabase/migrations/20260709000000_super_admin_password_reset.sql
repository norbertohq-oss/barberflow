create or replace function public.bf_super_admin_update_user_password(
  p_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesion requerida.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol = 'super_admin'
      and activo = true
  ) then
    raise exception 'Solo un super_admin activo puede cambiar contrasenas.';
  end if;

  if p_password is null or length(p_password) < 8 then
    raise exception 'La contrasena debe tener al menos 8 caracteres.';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Usuario no encontrado.';
  end if;

  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.bf_super_admin_update_user_password(uuid, text) from public;
grant execute on function public.bf_super_admin_update_user_password(uuid, text) to authenticated;
