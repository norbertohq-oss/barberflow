import { ArrowLeft, Building2, Mail, Phone, Scissors, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { registerAndSignIn } from '../services/signupService';
import type { AuthState } from '../services/authService';

const initialForm = {
  barberia_nombre: '',
  admin_nombre: '',
  email: '',
  password: '',
  telefono: '',
  whatsapp: '',
};

export function Register({
  onBack,
  onRegistered,
}: {
  onBack: () => void;
  onRegistered: (state: AuthState) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.barberia_nombre.trim() || !form.admin_nombre.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Completa barberia, nombre, correo y contrasena.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const state = await registerAndSignIn(form);
      onRegistered(state);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'No se pudo crear la prueba.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-obsidian-950 text-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden min-h-screen flex-col justify-between border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_34%),#0b0b0b] p-12 lg:flex">
        <div className="inline-flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gold-400/30 bg-gold-400/10 text-gold-300">
            <Scissors size={24} />
          </div>
          <div>
            <p className="font-display text-xl font-bold">BarberFlow</p>
            <p className="text-xs uppercase tracking-[0.28em] text-gold-300">SaaS para barberias</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-5 inline-flex rounded-full border border-gold-400/25 bg-gold-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-gold-200">
            Prueba gratis 14 dias
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight">Activa tu barberia y empieza a operar hoy.</h1>
          <p className="mt-5 text-lg leading-8 text-zinc-300">
            Agenda, clientes, servicios, punto de venta y control operativo en una plataforma lista para crecer contigo.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-zinc-300">
          {['Sin tarjeta para iniciar', 'Alta automatica de tu barberia', 'Planes disponibles al terminar la prueba'].map((item) => (
            <span key={item} className="inline-flex items-center gap-3">
              <ShieldCheck size={17} className="text-gold-400" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[560px]">
          <button className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white" onClick={onBack}>
            <ArrowLeft size={17} />
            Volver al login
          </button>

          <div className="mb-7">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-200">
              <Sparkles size={14} />
              Empieza gratis
            </p>
            <h1 className="font-display text-4xl font-bold">Crea tu cuenta BarberFlow</h1>
            <p className="mt-3 text-zinc-400">Tu barberia quedara activa en periodo de prueba por 14 dias.</p>
          </div>

          {error && <p className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

          <form className="grid gap-4" onSubmit={submit}>
            <Input
              label="Nombre de la barberia"
              icon={<Building2 size={18} />}
              value={form.barberia_nombre}
              onChange={(event) => setForm({ ...form, barberia_nombre: event.target.value })}
            />
            <Input
              label="Tu nombre"
              icon={<User size={18} />}
              value={form.admin_nombre}
              onChange={(event) => setForm({ ...form, admin_nombre: event.target.value })}
            />
            <Input
              label="Correo"
              type="email"
              icon={<Mail size={18} />}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Input
              label="Contrasena"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Telefono"
                icon={<Phone size={18} />}
                value={form.telefono}
                onChange={(event) => setForm({ ...form, telefono: event.target.value })}
              />
              <Input
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
              />
            </div>
            <Button className="mt-2 w-full" disabled={loading}>
              {loading ? 'Creando prueba...' : 'Crear prueba gratis'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
