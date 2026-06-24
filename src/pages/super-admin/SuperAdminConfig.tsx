import { Bell, CreditCard, Globe, Image, Mail, Save, ShieldCheck, Upload, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { Card, StatCard } from '../../components/Card';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { currency } from '../../lib/format';
import { getErrorMessage } from '../../lib/errors';
import { getSaaSAnalytics, getSaaSMetrics } from '../../services/superAdminService';
import {
  getBillingSettings,
  getGlobalNotificationSettings,
  getSaaSSettings,
  updateBillingSettings,
  updateGlobalNotificationSettings,
  updateSaaSSettings,
  uploadSaaSAsset,
} from '../../services/saasSettingsService';
import type { BillingSettingsRow, NotificationSettingsRow, SaaSSettingsRow } from '../../types/database';

type Tab = 'General' | 'Login' | 'Facturacion' | 'Notificaciones' | 'Metricas';
type Metrics = Awaited<ReturnType<typeof getSaaSMetrics>>;
type Analytics = Awaited<ReturnType<typeof getSaaSAnalytics>>;

const tabs: Tab[] = ['General', 'Login', 'Facturacion', 'Notificaciones', 'Metricas'];

export function SuperAdminConfig() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('General');
  const [settings, setSettings] = useState<SaaSSettingsRow | null>(null);
  const [billing, setBilling] = useState<BillingSettingsRow | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettingsRow | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canEdit = profile.rol === 'super_admin';

  const load = async () => {
    setError('');
    const [settingsData, billingData, notificationsData, metricsData, analyticsData] = await Promise.all([
      getSaaSSettings(),
      getBillingSettings(),
      getGlobalNotificationSettings(),
      getSaaSMetrics(),
      getSaaSAnalytics(),
    ]);
    setSettings(settingsData);
    setBilling(billingData);
    setNotifications(notificationsData);
    setMetrics(metricsData);
    setAnalytics(analyticsData);
  };

  useEffect(() => {
    if (!canEdit) return;
    load()
      .catch((loadError) => setError(getErrorMessage(loadError, 'No se pudo cargar Configuracion SaaS.')))
      .finally(() => setLoading(false));
  }, [canEdit]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!settings.nombre_saas.trim()) throw new Error('El nombre del SaaS es obligatorio.');
      const saved = await updateSaaSSettings(settings.id, settings);
      setSettings(saved);
      setMessage('Configuracion general guardada.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar la configuracion.'));
    } finally {
      setSaving(false);
    }
  };

  const saveBilling = async () => {
    if (!billing) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (billing.trial_days < 0 || billing.grace_days < 0) throw new Error('Los dias no pueden ser negativos.');
      const saved = await updateBillingSettings(billing.id, billing);
      setBilling(saved);
      setMessage('Facturacion guardada.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar facturacion.'));
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!notifications) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await updateGlobalNotificationSettings(notifications.id, notifications);
      setNotifications(saved);
      setMessage('Notificaciones globales guardadas.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar notificaciones.'));
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (
    file: File | null,
    configKey: keyof SaaSSettingsRow,
    bucket: 'branding' | 'login-assets',
    folder: string,
    allowed: string[],
  ) => {
    if (!file || !settings) return;
    setError('');
    setMessage('');
    if (!allowed.includes(file.type)) {
      setError('Formato no permitido para este archivo.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('El archivo supera 2MB.');
      return;
    }
    setUploading(String(configKey));
    try {
      const url = await uploadSaaSAsset(bucket, folder, file);
      setSettings({ ...settings, [configKey]: url });
      setMessage('Archivo subido. Guarda la configuracion para persistir el cambio.');
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'No se pudo subir el archivo.'));
    } finally {
      setUploading('');
    }
  };

  if (!canEdit) {
    return (
      <Card>
        <h1 className="text-xl font-bold text-white">Acceso restringido</h1>
        <p className="mt-2 text-sm text-zinc-400">Solo super_admin puede acceder a Configuracion SaaS.</p>
      </Card>
    );
  }

  if (loading) {
    return <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">Cargando Configuracion SaaS...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Configuracion SaaS</h1>
        <p className="text-zinc-400">Centro global de marca, facturacion, notificaciones y metricas de BarberFlow.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => { setTab(item); setError(''); setMessage(''); }}
            className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${tab === item ? 'bg-gold-400 text-black' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      {tab === 'General' && settings && (
        <Card>
          <SectionTitle icon={<Globe size={19} />} title="Configuracion general" description="Datos globales visibles en el SaaS y canales oficiales." />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Input label="Nombre del SaaS" value={settings.nombre_saas} onChange={(e) => setSettings({ ...settings, nombre_saas: e.target.value })} />
            <Input label="Correo de soporte" value={settings.email_soporte ?? ''} onChange={(e) => setSettings({ ...settings, email_soporte: e.target.value, support_email: e.target.value })} />
            <Input label="WhatsApp de soporte" value={settings.whatsapp_soporte ?? ''} onChange={(e) => setSettings({ ...settings, whatsapp_soporte: e.target.value, support_whatsapp: e.target.value })} />
            <Input label="URL sitio web" value={settings.sitio_web ?? ''} onChange={(e) => setSettings({ ...settings, sitio_web: e.target.value })} />
            <Input label="URL documentacion" value={settings.documentacion_url ?? ''} onChange={(e) => setSettings({ ...settings, documentacion_url: e.target.value })} />
            <Input label="Facebook" value={settings.facebook ?? ''} onChange={(e) => setSettings({ ...settings, facebook: e.target.value })} />
            <Input label="Instagram" value={settings.instagram ?? ''} onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} />
            <Input label="TikTok" value={settings.tiktok ?? ''} onChange={(e) => setSettings({ ...settings, tiktok: e.target.value })} />
            <UploadField label="Logo principal" accept="image/png,image/jpeg,image/webp,image/svg+xml" busy={uploading === 'logo_url'} onFile={(file) => uploadAsset(file, 'logo_url', 'branding', 'logos', ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])} />
            <UploadField label="Favicon" accept="image/png,image/jpeg,image/webp,image/svg+xml" busy={uploading === 'favicon_url'} onFile={(file) => uploadAsset(file, 'favicon_url', 'branding', 'favicons', ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])} />
          </div>
          <Button className="mt-6" disabled={saving} onClick={saveSettings}><Save size={17} /> {saving ? 'Guardando...' : 'Guardar general'}</Button>
        </Card>
      )}

      {tab === 'Login' && settings && (
        <Card>
          <SectionTitle icon={<Image size={19} />} title="Login global" description="Personaliza la primera pantalla del sistema para todas las barberias." />
          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div className="grid gap-4 lg:grid-cols-2">
              <Input label="Titulo principal" value={settings.login_title} onChange={(e) => setSettings({ ...settings, login_title: e.target.value })} />
              <Input label="Slogan corto" value={settings.login_slogan} onChange={(e) => setSettings({ ...settings, login_slogan: e.target.value })} />
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm text-zinc-400">Subtitulo</span>
                <textarea className="min-h-28 w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none focus:border-gold-400/60" value={settings.login_subtitle} onChange={(e) => setSettings({ ...settings, login_subtitle: e.target.value })} />
              </label>
              <Input label="Badge 1" value={settings.login_badge_1} onChange={(e) => setSettings({ ...settings, login_badge_1: e.target.value })} />
              <Input label="Badge 2" value={settings.login_badge_2} onChange={(e) => setSettings({ ...settings, login_badge_2: e.target.value })} />
              <Input label="Badge 3" value={settings.login_badge_3} onChange={(e) => setSettings({ ...settings, login_badge_3: e.target.value })} />
              <Input label="Texto boton soporte" value={settings.support_button_text} onChange={(e) => setSettings({ ...settings, support_button_text: e.target.value })} />
              <Input label="WhatsApp soporte login" value={settings.support_whatsapp ?? ''} onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })} />
              <Input label="Email soporte login" value={settings.support_email ?? ''} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} />
              <UploadField label="Logo del login" accept="image/png,image/jpeg,image/webp,image/svg+xml" busy={uploading === 'login_logo_url'} onFile={(file) => uploadAsset(file, 'login_logo_url', 'branding', 'login-logos', ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])} />
              <UploadField label="Imagen lateral del login" accept="image/png,image/jpeg,image/webp" busy={uploading === 'login_background_url'} onFile={(file) => uploadAsset(file, 'login_background_url', 'login-assets', 'backgrounds', ['image/png', 'image/jpeg', 'image/webp'])} />
            </div>
            <LoginPreview settings={settings} />
          </div>
          <Button className="mt-6" disabled={saving} onClick={saveSettings}><Save size={17} /> {saving ? 'Guardando...' : 'Guardar login'}</Button>
        </Card>
      )}

      {tab === 'Facturacion' && billing && (
        <Card>
          <SectionTitle icon={<CreditCard size={19} />} title="Facturacion" description="Control global para pruebas, gracia y Mercado Pago." />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Input label="Dias de prueba gratuitos" type="number" value={billing.trial_days} onChange={(e) => setBilling({ ...billing, trial_days: Number(e.target.value) })} />
            <Input label="Dias de gracia" type="number" value={billing.grace_days} onChange={(e) => setBilling({ ...billing, grace_days: Number(e.target.value) })} />
            <SelectBox label="Modo Mercado Pago" value={billing.mercadopago_mode} options={[['sandbox', 'Sandbox'], ['produccion', 'Produccion']]} onChange={(value) => setBilling({ ...billing, mercadopago_mode: value as BillingSettingsRow['mercadopago_mode'] })} />
            <ToggleBox label="Mercado Pago conectado" description="Muestra la integracion como disponible." checked={billing.mercadopago_enabled} onChange={(value) => setBilling({ ...billing, mercadopago_enabled: value })} />
            <ToggleBox label="Suspender por falta de pago" description="Suspende automaticamente al superar dias de gracia." checked={billing.auto_suspend} onChange={(value) => setBilling({ ...billing, auto_suspend: value })} />
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-zinc-400">Estado de integracion</p>
              <p className={`mt-3 text-2xl font-bold ${billing.mercadopago_enabled ? 'text-emerald-300' : 'text-amber-300'}`}>{billing.mercadopago_enabled ? 'Conectado' : 'Pendiente'}</p>
            </div>
          </div>
          <Button className="mt-6" disabled={saving} onClick={saveBilling}><Save size={17} /> {saving ? 'Guardando...' : 'Guardar facturacion'}</Button>
        </Card>
      )}

      {tab === 'Notificaciones' && notifications && (
        <Card>
          <SectionTitle icon={<Bell size={19} />} title="Notificaciones globales" description="Preferencias base para eventos globales del SaaS." />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleBox icon={<Bell size={18} />} label="Notificaciones de escritorio" description="Permite avisos del navegador." checked={notifications.desktop_enabled} onChange={(value) => setNotifications({ ...notifications, desktop_enabled: value })} />
            <ToggleBox icon={<Volume2 size={18} />} label="Sonidos" description="Activa sonidos por eventos." checked={notifications.sound_enabled} onChange={(value) => setNotifications({ ...notifications, sound_enabled: value })} />
            <ToggleBox label="Nuevas citas" description="Avisar citas creadas." checked={notifications.notify_new_appointments} onChange={(value) => setNotifications({ ...notifications, notify_new_appointments: value })} />
            <ToggleBox label="Cancelaciones" description="Avisar citas canceladas." checked={notifications.notify_cancellations} onChange={(value) => setNotifications({ ...notifications, notify_cancellations: value })} />
            <ToggleBox label="Nuevos registros" description="Avisar nuevas barberias o usuarios." checked={notifications.notify_new_users} onChange={(value) => setNotifications({ ...notifications, notify_new_users: value })} />
            <ToggleBox label="Tickets de soporte" description="Avisar tickets creados." checked={notifications.notify_support} onChange={(value) => setNotifications({ ...notifications, notify_support: value })} />
          </div>
          <Button className="mt-6" disabled={saving} onClick={saveNotifications}><Save size={17} /> {saving ? 'Guardando...' : 'Guardar notificaciones'}</Button>
        </Card>
      )}

      {tab === 'Metricas' && metrics && analytics && <MetricsPanel metrics={metrics} analytics={analytics} />}
    </div>
  );
}

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-400/10 text-gold-300">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function UploadField({ label, accept, busy, onFile }: { label: string; accept: string; busy: boolean; onFile: (file: File | null) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <span className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400 hover:border-gold-400/50">
        <Upload size={17} className="text-gold-300" />
        {busy ? 'Subiendo...' : 'Subir archivo'}
        <input className="hidden" type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
      </span>
    </label>
  );
}

function ToggleBox({ label, description, checked, onChange, icon }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; icon?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`rounded-2xl border p-4 text-left transition ${checked ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-white">{icon}<span>{label}</span></div>
        <span className={`h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-gold-400' : 'bg-zinc-700'}`}>
          <span className={`block h-4 w-4 rounded-full bg-black transition ${checked ? 'translate-x-5' : ''}`} />
        </span>
      </div>
      <p className="mt-2 text-sm leading-5 text-zinc-500">{description}</p>
    </button>
  );
}

function SelectBox({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select className="w-full rounded-[18px] border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-gold-400/60" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function LoginPreview({ settings }: { settings: SaaSSettingsRow }) {
  const badges = [settings.login_badge_1, settings.login_badge_2, settings.login_badge_3].filter(Boolean);
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-white/10 bg-black">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${settings.login_background_url || '/login-reference.png'}")` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/45" />
      <div className="relative z-10 flex h-full min-h-[520px] flex-col justify-between p-7">
        <div className="flex items-center gap-3">
          {settings.login_logo_url ? <img src={settings.login_logo_url} className="h-11 w-11 rounded-full object-cover" alt={settings.nombre_saas} /> : <ShieldCheck className="text-gold-300" />}
          <div>
            <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">{settings.nombre_saas}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-300">{settings.login_slogan}</p>
          </div>
        </div>
        <div>
          <h3 className="font-display text-4xl font-bold leading-tight text-white">{settings.login_title}</h3>
          <p className="mt-4 text-sm leading-6 text-zinc-300">{settings.login_subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {badges.map((badge) => <span key={badge} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-zinc-200">{badge}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsPanel({ metrics, analytics }: { metrics: Metrics; analytics: Analytics }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard active label="Barberias activas" value={String(metrics.activas)} hint={`${metrics.totalBarberias} totales`} icon={<Globe size={20} />} />
        <StatCard label="Suspendidas" value={String(metrics.suspendidas)} hint={`${metrics.prueba} en prueba`} icon={<ShieldCheck size={20} />} />
        <StatCard active label="Usuarios totales" value={String(metrics.usuariosTotales)} hint="Todos los perfiles" icon={<Mail size={20} />} />
        <StatCard label="Plan mas vendido" value={metrics.planMasVendido} hint="Por barberias asignadas" icon={<CreditCard size={20} />} />
        <StatCard active label="MRR estimado" value={currency(metrics.ingresoMensual)} hint="Suma mensual por plan" icon={<CreditCard size={20} />} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <MiniChart title="Nuevas barberias por mes" data={analytics.newBarberiasByMonth} />
        <MiniChart title="Suscripciones activas" data={analytics.activeSubscriptions} />
        <MiniChart title="Distribucion de planes" data={analytics.planDistribution} />
      </div>
    </div>
  );
}

function MiniChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = useMemo(() => Math.max(1, ...data.map((item) => item.value)), [data]);
  return (
    <Card>
      <h3 className="font-bold text-white">{title}</h3>
      <div className="mt-5 space-y-3">
        {data.length === 0 && <p className="text-sm text-zinc-500">Sin datos suficientes.</p>}
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>{item.label}</span><span>{item.value}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold-400" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
