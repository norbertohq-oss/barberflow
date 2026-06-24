import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type EmpleadoInsert = Database['public']['Tables']['empleados']['Insert'];
type EmpleadoUpdate = Database['public']['Tables']['empleados']['Update'];

export async function listEmpleados(barberiaId: string) {
  const { data, error } = await supabase.from('empleados').select('*, profiles(nombre, email, rol)').eq('barberia_id', barberiaId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createEmpleado(payload: EmpleadoInsert) {
  const { data, error } = await supabase.from('empleados').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateEmpleado(id: string, payload: EmpleadoUpdate) {
  const { data, error } = await supabase.from('empleados').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function toggleEmpleado(id: string, activo: boolean) {
  return updateEmpleado(id, { activo });
}
