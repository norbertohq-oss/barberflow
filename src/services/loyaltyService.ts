import { supabase } from '../lib/supabaseClient';
import type { Database, LoyaltySettingsRow, LoyaltyTierRow } from '../types/database';

type LoyaltySettingsInsert = Database['public']['Tables']['loyalty_settings']['Insert'];
type LoyaltySettingsUpdate = Database['public']['Tables']['loyalty_settings']['Update'];
type LoyaltyTierInsert = Database['public']['Tables']['loyalty_tiers']['Insert'];
type LoyaltyTierUpdate = Database['public']['Tables']['loyalty_tiers']['Update'];

export async function getOrCreateLoyaltySettings(barberiaId: string) {
  const { data, error } = await supabase.from('loyalty_settings').select('*').eq('barberia_id', barberiaId).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const payload: LoyaltySettingsInsert = { barberia_id: barberiaId };
  const { data: created, error: createError } = await supabase.from('loyalty_settings').insert(payload).select('*').single();
  if (createError) throw createError;
  return created;
}

export async function updateLoyaltySettings(id: string, payload: LoyaltySettingsUpdate) {
  const { data, error } = await supabase.from('loyalty_settings').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function listLoyaltyTiers(barberiaId: string, onlyActive = false) {
  let query = supabase.from('loyalty_tiers').select('*').eq('barberia_id', barberiaId).order('orden').order('puntos_min');
  if (onlyActive) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createLoyaltyTier(payload: LoyaltyTierInsert) {
  const { data, error } = await supabase.from('loyalty_tiers').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateLoyaltyTier(id: string, payload: LoyaltyTierUpdate) {
  const { data, error } = await supabase.from('loyalty_tiers').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function toggleLoyaltyTier(id: string, activo: boolean) {
  return updateLoyaltyTier(id, { activo });
}

export async function listLoyaltyTransactions(barberiaId: string, clienteId?: string) {
  let query = supabase.from('loyalty_transactions').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: false });
  if (clienteId) query = query.eq('cliente_id', clienteId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function applyLoyaltyForSale(payload: {
  barberiaId: string;
  clienteId: string;
  ventaId: string;
  total: number;
}) {
  const [settings, tiers] = await Promise.all([
    getOrCreateLoyaltySettings(payload.barberiaId),
    listLoyaltyTiers(payload.barberiaId, true),
  ]);

  if (!settings.activo) {
    await syncClienteMetrics(payload.barberiaId, payload.clienteId, payload.total, 0, tiers);
    return { points: 0, settings, tier: null };
  }

  const points = Math.max(0, Math.floor(payload.total * Number(settings.puntos_por_peso)));
  if (points > 0) {
    const { error } = await supabase.from('loyalty_transactions').insert({
      barberia_id: payload.barberiaId,
      cliente_id: payload.clienteId,
      venta_id: payload.ventaId,
      tipo: 'ganado',
      puntos: points,
      descripcion: `Venta ${payload.ventaId.slice(0, 8)} - ${points} puntos generados`,
    });
    if (error) throw error;
  }

  const tier = await syncClienteMetrics(payload.barberiaId, payload.clienteId, payload.total, points, tiers);
  return { points, settings, tier };
}

async function syncClienteMetrics(barberiaId: string, clienteId: string, total: number, points: number, tiers: LoyaltyTierRow[]) {
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('total_gastado,puntos_disponibles,puntos_totales,visitas')
    .eq('barberia_id', barberiaId)
    .eq('id', clienteId)
    .single();
  if (error) throw error;

  const nextTotal = Number(cliente.total_gastado ?? 0) + total;
  const nextPointsTotal = Number(cliente.puntos_totales ?? 0) + points;
  const nextTier = findTier(tiers, nextPointsTotal);

  const { error: updateError } = await supabase
    .from('clientes')
    .update({
      total_gastado: nextTotal,
      puntos_disponibles: Number(cliente.puntos_disponibles ?? 0) + points,
      puntos_totales: nextPointsTotal,
      visitas: Number(cliente.visitas ?? 0) + 1,
      ultima_visita: new Date().toISOString().slice(0, 10),
      nivel_lealtad: nextTier?.nombre ?? fallbackTierName(nextPointsTotal),
    })
    .eq('barberia_id', barberiaId)
    .eq('id', clienteId);
  if (updateError) throw updateError;

  return nextTier;
}

export function findTier(tiers: LoyaltyTierRow[], points: number) {
  return tiers
    .filter((tier) => tier.activo)
    .sort((a, b) => b.puntos_min - a.puntos_min)
    .find((tier) => points >= tier.puntos_min && (tier.puntos_max === null || points <= tier.puntos_max)) ?? null;
}

export function previewPoints(settings: LoyaltySettingsRow | null, total: number) {
  if (!settings?.activo) return 0;
  return Math.max(0, Math.floor(total * Number(settings.puntos_por_peso)));
}

function fallbackTierName(points: number) {
  if (points >= 2000) return 'Platino';
  if (points >= 1000) return 'Oro';
  if (points >= 500) return 'Plata';
  if (points > 0) return 'Bronce';
  return 'Sin nivel';
}
