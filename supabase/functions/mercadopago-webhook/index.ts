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

    // The order ID is created by our server and points to the original quoted price.
    const externalReference = String(payment.external_reference ?? '');
    const match = /^order:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(externalReference);
    if (!match) throw new Error('El pago no tiene una orden verificable; requiere revision manual.');
    if (payment.transaction_amount == null || !payment.currency_id) throw new Error('El pago no contiene importe o moneda.');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const paymentRecord = {
      order_id: match[1],
      mercado_pago_payment_id: String(payment.id),
      mercado_pago_preference_id: payment.preference_id ?? null,
      status: payment.status ?? 'unknown',
      status_detail: payment.status_detail ?? null,
      amount: Number(payment.transaction_amount),
      currency: payment.currency_id,
      payer_email: payment.payer?.email ?? null,
      raw_response: payment,
    };

    const { error: pagoError } = await adminClient.rpc('bf_process_mercadopago_payment', {
      p_payment: paymentRecord,
    });
    if (pagoError) throw pagoError;

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
