import { Eye, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { signIn, type AuthState } from '../services/authService';
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

  return (
    <main className="grid min-h-screen bg-obsidian-950 text-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-left opacity-60" style={{ backgroundImage: 'url("/login-reference.png")' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/65 to-obsidian-950" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <Logo />
          <h1 className="mt-12 max-w-md font-display text-5xl font-bold leading-tight">Administra cortes, citas y ventas con precision.</h1>
          <p className="mt-6 max-w-sm text-lg leading-8 text-zinc-300">
            BarberFlow centraliza la operacion diaria de barberias modernas con una experiencia premium y multi-sucursal.
          </p>
          <div className="mt-10 flex gap-3 text-sm text-zinc-300">
            <span className="rounded-full border border-white/10 px-4 py-2">Multi-tenant</span>
            <span className="rounded-full border border-white/10 px-4 py-2">Supabase ready</span>
            <span className="rounded-full border border-white/10 px-4 py-2">POS incluido</span>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[480px]">
          <div className="mb-10 lg:hidden">
            <Logo />
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
            Problemas para ingresar? <button className="font-semibold text-gold-400">Contactar soporte</button>
          </div>
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-zinc-500">
            Acceso protegido con Supabase Auth. La sesion se mantiene activa y los datos se filtran por barberia con RLS.
          </p>
        </div>
      </section>
    </main>
  );
}
