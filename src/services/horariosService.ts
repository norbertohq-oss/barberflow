import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type HorarioInsert = Database['public']['Tables']['horarios_barberia']['Insert'];
type HorarioUpdate = Database['public']['Tables']['horarios_barberia']['Update'];

const defaults = (barberiaId: string): HorarioInsert[] =>
  Array.from({ length: 7 }, (_, index) => ({
    barberia_id: barberiaId,
    dia_semana: index,
    abre: index !== 0,
    hora_apertura: index === 0 ? null : '09:00',
    hora_cierre: index === 0 ? null : '18:00',
    descanso_inicio: null,
    descanso_fin: null,
  }));

export async function listHorarios(barberiaId: string) {
  const { data, error } = await supabase.from('horarios_barberia').select('*').eq('barberia_id', barberiaId).order('dia_semana');
  if (error) throw error;
  if (data.length) return data;
  const { data: created, error: createError } = await supabase.from('horarios_barberia').insert(defaults(barberiaId)).select('*').order('dia_semana');
  if (createError) throw createError;
  return created;
}

export async function updateHorario(id: string, payload: HorarioUpdate) {
  const { data, error } = await supabase.from('horarios_barberia').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
