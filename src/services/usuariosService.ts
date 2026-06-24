import { supabase } from '../lib/supabaseClient';
import type { Database, UserRole } from '../types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function listUsuarios(filters?: { barberiaId?: string; rol?: UserRole | '' }) {
  let query = supabase.from('profiles').select('*, barberias(nombre_comercial)').order('created_at', { ascending: false });
  if (filters?.barberiaId) query = query.eq('barberia_id', filters.barberiaId);
  if (filters?.rol) query = query.eq('rol', filters.rol);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateUsuario(id: string, payload: ProfileUpdate) {
  const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function toggleUsuario(id: string, activo: boolean) {
  return updateUsuario(id, { activo });
}

export async function createAuthUser(payload: {
  email: string;
  password: string;
  nombre: string;
  rol: UserRole;
  barberia_id: string | null;
}) {
  const { data, error } = await supabase.functions.invoke('create-user', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function updateEmployeePassword(payload: { empleado_id: string; profile_id: string; password: string }) {
  const { data, error } = await supabase.functions.invoke('manage-employee', {
    body: { action: 'update_password', ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteEmployeeAccess(payload: { empleado_id: string; profile_id?: string | null; delete_auth_user?: boolean }) {
  const { data, error } = await supabase.functions.invoke('manage-employee', {
    body: { action: 'delete_employee', ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
