import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type SettingsInsert = Database['public']['Tables']['user_notification_settings']['Insert'];
type SettingsUpdate = Database['public']['Tables']['user_notification_settings']['Update'];

export async function listNotifications(barberiaId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('barberia_id', barberiaId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { data, error } = await supabase.from('notifications').update({ leida: true }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead(barberiaId: string) {
  const { error } = await supabase.from('notifications').update({ leida: true }).eq('barberia_id', barberiaId).eq('leida', false);
  if (error) throw error;
}

export async function createNotification(payload: Database['public']['Tables']['notifications']['Insert']) {
  const { data, error } = await supabase.from('notifications').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function getOrCreateNotificationSettings(userId: string) {
  const { data, error } = await supabase.from('user_notification_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const payload: SettingsInsert = { user_id: userId };
  const { data: created, error: createError } = await supabase.from('user_notification_settings').insert(payload).select('*').single();
  if (createError) throw createError;
  return created;
}

export async function updateNotificationSettings(id: string, payload: SettingsUpdate) {
  const { data, error } = await supabase.from('user_notification_settings').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
