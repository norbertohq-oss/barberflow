import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type ProductoInsert = Database['public']['Tables']['productos']['Insert'];
type ProductoUpdate = Database['public']['Tables']['productos']['Update'];

export async function listProductos(barberiaId: string, onlyActive = false) {
  let query = supabase.from('productos').select('*').eq('barberia_id', barberiaId).order('nombre');
  if (onlyActive) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createProducto(payload: ProductoInsert) {
  const { data, error } = await supabase.from('productos').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateProducto(id: string, payload: ProductoUpdate) {
  const { data, error } = await supabase.from('productos').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function toggleProducto(id: string, activo: boolean) {
  return updateProducto(id, { activo });
}
