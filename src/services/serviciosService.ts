import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type ServicioInsert = Database['public']['Tables']['servicios']['Insert'];
type ServicioUpdate = Database['public']['Tables']['servicios']['Update'];

export async function listServicios(barberiaId: string, onlyActive = false) {
  let query = supabase.from('servicios').select('*').eq('barberia_id', barberiaId).order('nombre');
  if (onlyActive) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createServicio(payload: ServicioInsert) {
  const { data, error } = await supabase.from('servicios').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateServicio(id: string, payload: ServicioUpdate) {
  const { data, error } = await supabase.from('servicios').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function toggleServicio(id: string, activo: boolean) {
  return updateServicio(id, { activo });
}
