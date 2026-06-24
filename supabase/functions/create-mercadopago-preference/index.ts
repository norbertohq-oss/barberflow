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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const appUrl = Deno.env.get('APP_URL');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !mercadoPagoToken || !appUrl) {
      throw new Error('Missing required Edge Function secrets.');
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Invalid user session.');

    const body = await req.json();
    const planId = body.plan_id as string | undefined;
    if (!planId) throw new Error('plan_id is required.');

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, barberia_id, rol, email, nombre')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (profile.rol !== 'admin' || !profile.barberia_id) {
      throw new Error('Solo el admin de barberia puede contratar planes.');
    }

    const { data: barberia, error: barberiaError } = await adminClient
      .from('barberias')
      .select('id, nombre_comercial')
      .eq('id', profile.barberia_id)
      .single();
    if (barberiaError) throw barberiaError;

    const { data: plan, error: planError } = await adminClient
      .from('planes')
      .select('*')
      .eq('id', planId)
      .eq('activo', true)
      .single();
    if (planError || !plan) throw new Error('Plan no disponible.');

    const normalizedAppUrl = appUrl.replace(/\/$/, '');
    const preferencePayload = {
      items: [
        {
          id: plan.id,
          title: `BarberFlow ${plan.nombre}`,
          description: plan.descripcion ?? `Plan mensual ${plan.nombre}`,
          quantity: 1,
          unit_price: Number(plan.precio_mensual),
          currency_id: 'MXN',
        },
      ],
      payer: {
        email: profile.email,
        name: profile.nombre,
      },
      back_urls: {
        success: `${normalizedAppUrl}/payment/success`,
        failure: `${normalizedAppUrl}/payment/failure`,
        pending: `${normalizedAppUrl}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      external_reference: `${barberia.id}:${plan.id}`,
      statement_descriptor: 'BARBERFLOW',
      metadata: {
        barberia_id: barberia.id,
        barberia_nombre: barberia.nombre_comercial,
        plan_id: plan.id,
        plan_nombre: plan.nombre,
        user_id: user.id,
      },
    };

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok) {
      throw new Error(preference?.message ?? 'Mercado Pago no pudo crear la preferencia.');
    }

    return jsonResponse({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});
