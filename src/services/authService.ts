import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { BarberiaRow, ProfileRow } from '../types/database';

export interface AuthState {
  session: Session;
  profile: ProfileRow;
  barberia: BarberiaRow | null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('No se pudo iniciar sesion.');
  return getAuthState();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAuthState(): Promise<AuthState | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user) return null;

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (profileError) throw profileError;
  if (!profile.activo) throw new Error('Tu usuario esta inactivo. Contacta al administrador.');

  if (profile.rol === 'super_admin') {
    return { session, profile, barberia: null };
  }

  if (!profile.barberia_id) throw new Error('Tu usuario no tiene una barberia asignada.');

  const { data: barberia, error: barberiaError } = await supabase.from('barberias').select('*').eq('id', profile.barberia_id).single();
  if (barberiaError) throw barberiaError;

  return { session, profile, barberia };
}

export async function listBarberos(barberiaId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('barberia_id', barberiaId)
    .eq('rol', 'barbero')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data;
}
