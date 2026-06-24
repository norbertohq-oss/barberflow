import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type RedesInsert = Database['public']['Tables']['redes_barberia']['Insert'];
type RedesUpdate = Database['public']['Tables']['redes_barberia']['Update'];

export async function getRedes(barberiaId: string) {
  const { data, error } = await supabase.from('redes_barberia').select('*').eq('barberia_id', barberiaId).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const payload: RedesInsert = { barberia_id: barberiaId };
  const { data: created, error: createError } = await supabase.from('redes_barberia').insert(payload).select('*').single();
  if (createError) throw createError;
  return created;
}

export async function updateRedes(id: string, payload: RedesUpdate) {
  const { data, error } = await supabase.from('redes_barberia').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
