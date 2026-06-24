import { supabase } from '../lib/supabaseClient';

export async function listProfiles(barberiaId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('barberia_id', barberiaId).order('nombre');
  if (error) throw error;
  return data;
}
