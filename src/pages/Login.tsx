import { Eye, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { signIn, type AuthState } from '../services/authService';
import { defaultSaasSettings, getPublicSaaSSettings } from '../services/saasSettingsService';
import type { SaaSSettingsRow } from '../types/database';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';

export function Login({
  initialError = '',
  onLogin,
}: {
  initialError?: string;
  onLogin: (state: AuthState) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [settings, setSettings] = useState<SaaSSettingsRow>(defaultSaasSettings);

  useEffect(() => {
    getPublicSaaSSettings().then(setSettings).catch(() => setSettings(defaultSaasSettings));
  }, []);

  const badges = useMemo(
    () => [settings.login_badge_1, settings.login_badge_2, settings.login_badge_3].filter(Boolean),
    [settings.login_badge_1, settings.login_badge_2, settings.login_badge_3],
  );

  const supportHref = useMemo(() => {
    const whatsapp = cleanPhone(settings.support_whatsapp || settings.whatsapp_soporte || '');
    if (whatsapp) return `https://wa.me/${whatsapp}?text=Hola,%20necesito%20soporte%20con%20BarberFlow`;
    const emailSupport = settings.support_email || settings.email_soporte || 'soporte@barberflow.com';
    return `mailto:${emailSupport}`;
  }, [settings.email_soporte, settings.support_email, settings.support_whatsapp, settings.whatsapp_soporte]);

  return (
    <main className="grid min-h-screen overflow-hidden bg-obsidian-950 text-white lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${settings.login_background_url || '/login-reference.png'}")` }}
        />
        <div className="absolute inset-0 bg-black/62" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-obsidian-950/80" />
        <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            {settings.login_logo_url ? (
              <img src={settings.login_logo_url} alt={settings.nombre_saas} className="h-12 w-12 rounded-full border border-gold-400/30 object-cover" />
            ) : (
              <Logo name={settings.nombre_saas} subtitle="Barbershop SaaS" logoUrl={settings.logo_url} />
            )}
            {settings.login_logo_url && (
              <div>
                <p className="font-display text-lg font-bold uppercase tracking-[0.22em] text-white">{settings.nombre_saas}</p>
                <p className="text-xs uppercase tracking-[0.26em] text-gold-300">{settings.login_slogan}</p>
              </div>
            )}
          </div>

          <div className="max-w-xl">
            <p className="mb-5 inline-flex rounded-full border border-gold-400/25 bg-gold-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-gold-200">
              {settings.login_slogan}
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] xl:text-6xl">{settings.login_title}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-300">{settings.login_subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-zinc-200">
            {badges.map((badge) => (
              <span key={badge} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[480px]">
          <div className="mb-9 lg:hidden">
            <Logo name={settings.nombre_saas} subtitle="Barbershop SaaS" logoUrl={settings.login_logo_url || settings.logo_url} />
          </div>
          <div className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 lg:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">{settings.login_slogan}</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight">{settings.login_title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{settings.login_subtitle}</p>
          </div>

          <h2 className="text-3xl font-bold text-white">Bienvenido</h2>
          <p className="mt-2 text-zinc-400">Ingresa tus credenciales para continuar</p>

          <form
            className="mt-8 space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              if (!email.trim() || !password.trim()) {
                setError('Ingresa correo y contrasena.');
                return;
              }
              setLoading(true);
              try {
                const state = await signIn(email.trim(), password);
                if (state) onLogin(state);
              } catch (loginError) {
                setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <Input label="Correo electronico" icon={<Mail size={18} />} value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="Contrasena" icon={<Lock size={18} />} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <div className="flex justify-end text-zinc-500">
              <Eye size={17} />
            </div>
            {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading ? 'Iniciando...' : 'Iniciar sesion'}</Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            Problemas para ingresar?{' '}
            <a href={supportHref} target={supportHref.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="font-semibold text-gold-400 hover:text-gold-300">
              {settings.support_button_text || 'Contactar soporte'}
            </a>
          </div>
          <p className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-zinc-500">
            <ShieldCheck className="mt-1 shrink-0 text-gold-400" size={16} />
            <span>Acceso protegido con Supabase Auth. La sesion se mantiene activa y los datos se filtran por barberia con RLS.</span>
          </p>
        </div>
      </section>
    </main>
  );
}

function cleanPhone(value: string) {
  return value.replace(/[^\d]/g, '');
}
