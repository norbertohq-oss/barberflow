import { supabase } from '../lib/supabaseClient';
import { signIn } from './authService';

export interface PublicSignupPayload {
  barberia_nombre: string;
  admin_nombre: string;
  email: string;
  password: string;
  telefono?: string;
  whatsapp?: string;
}

export interface PublicSignupResponse {
  barberia_id: string;
  user_id: string;
  trial_ends_at: string;
  email_sent?: boolean;
}

export async function registerTrialBarberia(payload: PublicSignupPayload) {
  const { data, error } = await supabase.functions.invoke<PublicSignupResponse>('public-signup', {
    body: payload,
  });
  if (error) throw error;
  if (!data?.barberia_id) throw new Error('No se pudo crear la barberia.');
  return data;
}

export async function registerAndSignIn(payload: PublicSignupPayload) {
  await registerTrialBarberia(payload);
  const state = await signIn(payload.email.trim().toLowerCase(), payload.password);
  if (!state) throw new Error('La cuenta fue creada, pero no se pudo iniciar sesion.');
  return state;
}
