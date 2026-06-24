import { supabase } from '../lib/supabaseClient';
import type { BillingSettingsRow, NotificationSettingsRow, SaaSSettingsRow } from '../types/database';

type SaasSettingsUpdate = Partial<Omit<SaaSSettingsRow, 'id' | 'created_at' | 'updated_at'>>;
type BillingSettingsUpdate = Partial<Omit<BillingSettingsRow, 'id' | 'created_at' | 'updated_at'>>;
type NotificationSettingsUpdate = Partial<Omit<NotificationSettingsRow, 'id' | 'created_at' | 'updated_at'>>;

export const defaultSaasSettings: SaaSSettingsRow = {
  id: 'default',
  nombre_saas: 'BarberFlow',
  logo_url: null,
  favicon_url: null,
  email_soporte: 'soporte@barberflow.com',
  whatsapp_soporte: null,
  sitio_web: null,
  documentacion_url: null,
  facebook: null,
  instagram: null,
  tiktok: null,
  login_logo_url: null,
  login_background_url: '/login-reference.png',
  login_title: 'Administra cortes, citas y ventas con precision.',
  login_subtitle: 'BarberFlow centraliza la operacion diaria de barberias modernas con una experiencia premium y multi-sucursal.',
  login_slogan: 'Gestiona. Crece. Automatiza.',
  login_badge_1: 'Multi-tenant',
  login_badge_2: 'Supabase ready',
  login_badge_3: 'POS incluido',
  support_button_text: 'Contactar soporte',
  support_whatsapp: null,
  support_email: 'soporte@barberflow.com',
  created_at: '',
  updated_at: '',
};

export async function getPublicSaaSSettings() {
  const { data, error } = await supabase.from('saas_settings').select('*').order('created_at').limit(1).maybeSingle();
  if (error) {
    console.warn('No se pudo cargar saas_settings.', error);
    return defaultSaasSettings;
  }
  return data ? { ...defaultSaasSettings, ...data } : defaultSaasSettings;
}

export async function getSaaSSettings() {
  const { data, error } = await supabase.from('saas_settings').select('*').order('created_at').limit(1).maybeSingle();
  if (error) throw error;
  if (data) return { ...defaultSaasSettings, ...data };
  const { data: created, error: createError } = await supabase.from('saas_settings').insert({ nombre_saas: 'BarberFlow' }).select('*').single();
  if (createError) throw createError;
  return { ...defaultSaasSettings, ...created };
}

export async function updateSaaSSettings(id: string, payload: SaasSettingsUpdate) {
  const { data, error } = await supabase.from('saas_settings').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return { ...defaultSaasSettings, ...data };
}

export async function getBillingSettings() {
  const { data, error } = await supabase.from('billing_settings').select('*').order('created_at').limit(1).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: createError } = await supabase.from('billing_settings').insert({}).select('*').single();
  if (createError) throw createError;
  return created;
}

export async function updateBillingSettings(id: string, payload: BillingSettingsUpdate) {
  const { data, error } = await supabase.from('billing_settings').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function getGlobalNotificationSettings() {
  const { data, error } = await supabase.from('notification_settings').select('*').order('created_at').limit(1).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: createError } = await supabase.from('notification_settings').insert({}).select('*').single();
  if (createError) throw createError;
  return created;
}

export async function updateGlobalNotificationSettings(id: string, payload: NotificationSettingsUpdate) {
  const { data, error } = await supabase.from('notification_settings').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function uploadSaaSAsset(bucket: 'branding' | 'login-assets', folder: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'asset';
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
