import { supabase } from '../lib/supabaseClient';

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export async function createMercadoPagoPreference(planId: string) {
  const { data, error } = await supabase.functions.invoke<MercadoPagoPreferenceResponse>('create-mercadopago-preference', {
    body: { plan_id: planId },
  });
  if (error) throw error;
  if (!data?.init_point) throw new Error('Mercado Pago no devolvio un link de pago.');
  return data;
}
