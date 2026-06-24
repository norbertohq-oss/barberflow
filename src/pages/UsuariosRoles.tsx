import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listProfiles } from '../services/profilesService';
import type { ProfileRow } from '../types/database';
import { Card } from '../components/Card';

const roleDescriptions = {
  super_admin: 'Administra la plataforma completa BarberFlow.',
  admin: 'Puede ver y administrar todos los modulos de su barberia.',
  cajero: 'Puede usar POS, ventas, productos y clientes.',
  barbero: 'Puede consultar agenda y clientes asignados.',
  cliente: 'Preparado para portal de reservas en fase futura.',
};

export function UsuariosRoles() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listProfiles(barberiaId)
      .then(setProfiles)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar usuarios.'));
  }, [barberiaId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Usuarios y roles</h1>
        <p className="text-zinc-400">Perfiles reales relacionados con Supabase Auth.</p>
      </div>
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {profiles.map((user) => (
          <Card key={user.id}>
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-400/10 text-gold-300">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-bold text-white">{user.nombre}</p>
                <p className="text-sm text-zinc-500">{user.email}</p>
                <span className="mt-3 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold capitalize text-zinc-300">{user.rol}</span>
                <p className="mt-4 text-sm leading-6 text-zinc-400">{roleDescriptions[user.rol]}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
