import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function secrets.');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
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

    const body = await req.json();
    const { email, password, nombre, rol, barberia_id } = body;
    if (!email || !password || !nombre || !rol) throw new Error('Missing required fields.');
    if (rol !== 'super_admin' && !barberia_id) throw new Error('barberia_id is required for non-super-admin users.');

    const isSuperAdmin = requester.rol === 'super_admin';
    const isTenantAdmin =
      requester.rol === 'admin'
      && requester.barberia_id
      && requester.barberia_id === barberia_id
      && ['cajero', 'barbero', 'cliente'].includes(rol);

    if (!isSuperAdmin && !isTenantAdmin) {
      throw new Error('No tienes permisos para crear este usuario.');
    }
    if (!isSuperAdmin && rol === 'super_admin') {
      throw new Error('Solo un super_admin puede crear otro super_admin.');
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol, barberia_id },
    });
    if (createError) throw createError;

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: created.user.id,
      barberia_id: rol === 'super_admin' ? null : barberia_id,
      nombre,
      email,
      rol,
      activo: true,
    });
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ user: created.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
