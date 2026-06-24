import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error('Missing Supabase function secrets.');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Invalid user.');

    const { data: requester, error: requesterError } = await adminClient
      .from('profiles')
      .select('rol, barberia_id')
      .eq('id', user.id)
      .single();
    if (requesterError) throw requesterError;
    if (requester.rol !== 'admin' || !requester.barberia_id) {
      throw new Error('Solo el admin de la barberia puede administrar empleados.');
    }

    const body = await req.json();
    const action = body.action as string | undefined;
    const empleadoId = body.empleado_id as string | undefined;
    const profileId = body.profile_id as string | undefined;
    if (!action || !empleadoId) throw new Error('Missing required fields.');

    const { data: empleado, error: empleadoError } = await adminClient
      .from('empleados')
      .select('id, barberia_id, profile_id, nombre')
      .eq('id', empleadoId)
      .single();
    if (empleadoError || !empleado) throw new Error('Empleado no encontrado.');
    if (empleado.barberia_id !== requester.barberia_id) {
      throw new Error('No tienes permisos para administrar este empleado.');
    }

    if (action === 'update_password') {
      const password = body.password as string | undefined;
      const targetProfileId = profileId ?? empleado.profile_id;
      if (!targetProfileId) throw new Error('Este empleado no tiene usuario de acceso.');
      if (!password || password.length < 6) throw new Error('La contrasena debe tener al menos 6 caracteres.');

      await assertTenantProfile(adminClient, targetProfileId, requester.barberia_id);
      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetProfileId, { password });
      if (updateError) throw updateError;
      return jsonResponse({ ok: true });
    }

    if (action === 'delete_employee') {
      const targetProfileId = profileId ?? empleado.profile_id;
      const deleteAuthUser = body.delete_auth_user !== false;

      if (targetProfileId) {
        await assertTenantProfile(adminClient, targetProfileId, requester.barberia_id);
      }

      const { error: deleteEmpleadoError } = await adminClient.from('empleados').delete().eq('id', empleadoId);
      if (deleteEmpleadoError) throw deleteEmpleadoError;

      if (targetProfileId) {
        const { error: deleteProfileError } = await adminClient.from('profiles').delete().eq('id', targetProfileId);
        if (deleteProfileError) throw deleteProfileError;

        if (deleteAuthUser) {
          const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(targetProfileId);
          if (deleteUserError) throw deleteUserError;
        }
      }

      return jsonResponse({ ok: true });
    }

    throw new Error('Accion no soportada.');
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

async function assertTenantProfile(adminClient: ReturnType<typeof createClient>, profileId: string, barberiaId: string) {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('id, barberia_id, rol')
    .eq('id', profileId)
    .single();
  if (error || !profile) throw new Error('Usuario del empleado no encontrado.');
  if (profile.barberia_id !== barberiaId) throw new Error('El usuario no pertenece a esta barberia.');
  if (!['barbero', 'cajero', 'cliente'].includes(profile.rol)) {
    throw new Error('No se puede modificar un usuario administrador desde empleados.');
  }
}
