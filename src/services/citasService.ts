import { supabase } from '../lib/supabaseClient';
import type { AppointmentStatus, Database } from '../types/database';

type CitaInsert = Database['public']['Tables']['citas']['Insert'];
type CitaUpdate = Database['public']['Tables']['citas']['Update'];

const citaSelect = '*';

export async function listCitasByDate(barberiaId: string, fecha: string) {
  const { data, error } = await supabase
    .from('citas')
    .select(citaSelect)
    .eq('barberia_id', barberiaId)
    .eq('fecha', fecha)
    .order('hora_inicio');
  if (error) throw error;
  return data;
}

export async function createCita(payload: CitaInsert) {
  const { data, error } = await supabase.from('citas').insert(payload).select(citaSelect).single();
  if (error) throw error;
  return data;
}

export async function updateCita(id: string, payload: CitaUpdate) {
  const { data, error } = await supabase.from('citas').update(payload).eq('id', id).select(citaSelect).single();
  if (error) throw error;
  return data;
}

export async function changeCitaStatus(id: string, estado: AppointmentStatus) {
  return updateCita(id, { estado });
}

export async function cancelCita(id: string) {
  return changeCitaStatus(id, 'cancelada');
}
