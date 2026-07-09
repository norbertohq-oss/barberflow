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
      .select('rol, activo')
      .eq('id', user.id)
      .single();
    if (requesterError) throw requesterError;
    if (requester.rol !== 'super_admin' || requester.activo === false) {
      throw new Error('Solo un super_admin activo puede eliminar barberias.');
    }

    const body = await req.json();
    const action = body.action as string | undefined;
    const barberiaId = body.barberia_id as string | undefined;
    const confirmation = body.confirmation as string | undefined;
    if (action !== 'delete_barberia' || !barberiaId) throw new Error('Missing required fields.');

    const { data: barberia, error: barberiaError } = await adminClient
      .from('barberias')
      .select('id, nombre_comercial')
      .eq('id', barberiaId)
      .single();
    if (barberiaError || !barberia) throw new Error('Barberia no encontrada.');

    if (confirmation !== barberia.nombre_comercial) {
      throw new Error('La confirmacion no coincide con el nombre de la barberia.');
    }

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, rol')
      .eq('barberia_id', barberiaId);
    if (profilesError) throw profilesError;

    const tenantProfiles = (profiles ?? []).filter((profile) => profile.rol !== 'super_admin');
    for (const profile of tenantProfiles) {
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(profile.id);
      if (deleteUserError) throw deleteUserError;
    }

    const { error: deleteBarberiaError } = await adminClient.from('barberias').delete().eq('id', barberiaId);
    if (deleteBarberiaError) throw deleteBarberiaError;

    return jsonResponse({
      ok: true,
      deleted_barberia_id: barberiaId,
      deleted_users: tenantProfiles.length,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});
