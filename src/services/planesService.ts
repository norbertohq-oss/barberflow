import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type PlanInsert = Database['public']['Tables']['planes']['Insert'];
type PlanUpdate = Database['public']['Tables']['planes']['Update'];

export async function listPlanes(onlyActive = false) {
  let query = supabase.from('planes').select('*').order('precio_mensual');
  if (onlyActive) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPlan(payload: PlanInsert) {
  const { data, error } = await supabase.from('planes').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id: string, payload: PlanUpdate) {
  const { data, error } = await supabase.from('planes').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function togglePlan(id: string, activo: boolean) {
  return updatePlan(id, { activo });
}
