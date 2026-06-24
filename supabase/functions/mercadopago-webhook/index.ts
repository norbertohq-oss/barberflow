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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!supabaseUrl || !serviceRoleKey || !mercadoPagoToken) {
      throw new Error('Missing required Edge Function secrets.');
    }

    const url = new URL(req.url);
    const body = await readJson(req);
    const topic = url.searchParams.get('topic') ?? url.searchParams.get('type') ?? body?.type ?? body?.topic;
    const paymentId =
      url.searchParams.get('data.id')
      ?? url.searchParams.get('id')
      ?? body?.data?.id
      ?? body?.id;

    if (topic && topic !== 'payment') return jsonResponse({ received: true, ignored: topic });
    if (!paymentId) return jsonResponse({ received: true, ignored: 'missing_payment_id' });

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error(payment?.message ?? 'No se pudo consultar el pago en Mercado Pago.');

    const metadata = payment.metadata ?? {};
    const externalReference = String(payment.external_reference ?? '');
    const [fallbackBarberiaId, fallbackPlanId] = externalReference.includes(':') ? externalReference.split(':') : [null, null];
    const barberiaId = metadata.barberia_id ?? fallbackBarberiaId;
    const planId = metadata.plan_id ?? fallbackPlanId;
    if (!barberiaId || !planId) throw new Error('El pago no contiene barberia_id o plan_id.');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: plan, error: planError } = await adminClient
      .from('planes')
      .select('id, precio_mensual')
      .eq('id', planId)
      .single();
    if (planError || !plan) throw new Error('Plan no encontrado para el pago.');

    const paymentRecord = {
      barberia_id: barberiaId,
      plan_id: planId,
      mercado_pago_payment_id: String(payment.id),
      mercado_pago_preference_id: payment.preference_id ?? null,
      status: payment.status ?? 'unknown',
      status_detail: payment.status_detail ?? null,
      amount: Number(payment.transaction_amount ?? plan.precio_mensual ?? 0),
      currency: payment.currency_id ?? 'MXN',
      payer_email: payment.payer?.email ?? null,
      raw_response: payment,
    };

    const { error: pagoError } = await adminClient
      .from('pagos')
      .upsert(paymentRecord, { onConflict: 'mercado_pago_payment_id' });
    if (pagoError) throw pagoError;

    if (payment.status === 'approved') {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);

      const { error: barberiaError } = await adminClient
        .from('barberias')
        .update({
          plan_id: planId,
          estado: 'activa',
          fecha_inicio_plan: now.toISOString(),
          fecha_fin_plan: end.toISOString(),
        })
        .eq('id', barberiaId);
      if (barberiaError) throw barberiaError;
    }

    return jsonResponse({ received: true, status: payment.status });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
