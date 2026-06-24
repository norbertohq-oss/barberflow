import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type BarberiaUpdate = Database['public']['Tables']['barberias']['Update'];

export async function getBarberia(id: string) {
  const { data, error } = await supabase.from('barberias').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateConfiguracionBarberia(id: string, payload: BarberiaUpdate) {
  const { data, error } = await supabase.from('barberias').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
