import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';
import type { PlanRow } from '../types/database';

type PlanInsert = Database['public']['Tables']['planes']['Insert'];
type PlanUpdate = Database['public']['Tables']['planes']['Update'];

export async function listPlanes(onlyActive = false) {
  let query = supabase.from('planes').select('*').order('precio_mensual');
  if (onlyActive) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw error;
  return dedupeOfficialPlans(data);
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

function dedupeOfficialPlans(plans: PlanRow[]) {
  const officialOrder = ['basico', 'profesional', 'premium'];
  const byName = new Map<string, PlanRow>();

  plans.forEach((plan) => {
    const key = normalizePlanName(plan.nombre);
    if (!officialOrder.includes(key)) return;
    const current = byName.get(key);
    if (!current || new Date(plan.updated_at).getTime() > new Date(current.updated_at).getTime()) {
      byName.set(key, plan);
    }
  });

  return officialOrder
    .map((key) => byName.get(key))
    .filter((plan): plan is PlanRow => Boolean(plan));
}

function normalizePlanName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
