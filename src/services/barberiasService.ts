import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type BarberiaInsert = Database['public']['Tables']['barberias']['Insert'];
type BarberiaUpdate = Database['public']['Tables']['barberias']['Update'];

export async function listBarberias() {
  const { data, error } = await supabase
    .from('barberias')
    .select('*, planes(nombre, precio_mensual)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createBarberia(payload: BarberiaInsert) {
  const { data, error } = await supabase.from('barberias').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateBarberia(id: string, payload: BarberiaUpdate) {
  const { data, error } = await supabase.from('barberias').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function setBarberiaEstado(id: string, estado: 'activa' | 'suspendida' | 'cancelada' | 'prueba') {
  return updateBarberia(id, { estado });
}

export async function deleteBarberia(payload: { barberia_id: string; confirmation: string }) {
  const { data, error } = await supabase.functions.invoke('manage-barberia', {
    body: { action: 'delete_barberia', ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
