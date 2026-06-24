import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { listBarberias } from '../../services/barberiasService';
import { createAuthUser, listUsuarios, toggleUsuario, updateUsuario } from '../../services/usuariosService';
import type { ProfileRow, UserRole } from '../../types/database';

const roles: UserRole[] = ['super_admin', 'admin', 'cajero', 'barbero', 'cliente'];
type BarberiaOption = { id: string; nombre_comercial: string };
type UsuarioRow = ProfileRow & { barberias?: { nombre_comercial: string } | null };

export function SuperAdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [barberias, setBarberias] = useState<BarberiaOption[]>([]);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'admin' as UserRole, barberia_id: '' });
  const [filters, setFilters] = useState({ barberiaId: '', rol: '' as UserRole | '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [usersData, barberiasData] = await Promise.all([listUsuarios(filters), listBarberias()]);
    setUsuarios(usersData);
    setBarberias(barberiasData);
  };

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar usuarios.'));
  }, [filters.barberiaId, filters.rol]);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.email || !form.password || !form.nombre) {
      setError('Nombre, email y contrasena son obligatorios.');
      return;
    }
    if (form.rol !== 'super_admin' && !form.barberia_id) {
      setError('Los usuarios normales requieren barberia.');
      return;
    }
    await createAuthUser({ ...form, barberia_id: form.rol === 'super_admin' ? null : form.barberia_id });
    setMessage('Usuario creado.');
    setForm({ nombre: '', email: '', password: '', rol: 'admin', barberia_id: '' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Usuarios SaaS</h1>
        <p className="text-zinc-400">Usuarios globales, roles y asignacion a barberias.</p>
      </div>
      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <Card>
        <form className="grid gap-4 lg:grid-cols-6" onSubmit={createUser}>
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Contrasena" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Rol" value={form.rol} onChange={(value) => setForm({ ...form, rol: value as UserRole })} options={roles.map((role) => [role, role])} />
          <Select label="Barberia" value={form.barberia_id} onChange={(value) => setForm({ ...form, barberia_id: value })} options={barberias.map((barberia) => [barberia.id, barberia.nombre_comercial])} />
          <div className="flex items-end"><Button className="w-full"><Plus size={18} /> Crear</Button></div>
        </form>
      </Card>
      <div className="flex flex-col gap-3 md:flex-row">
        <Select label="Filtrar barberia" value={filters.barberiaId} onChange={(value) => setFilters({ ...filters, barberiaId: value })} options={barberias.map((barberia) => [barberia.id, barberia.nombre_comercial])} />
        <Select label="Filtrar rol" value={filters.rol} onChange={(value) => setFilters({ ...filters, rol: value as UserRole | '' })} options={roles.map((role) => [role, role])} />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-zinc-500">
              <tr><th className="px-5 py-4">Usuario</th><th>Rol</th><th>Barberia</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4"><p className="font-bold text-white">{user.nombre}</p><p className="text-zinc-500">{user.email}</p></td>
                  <td className="capitalize">{user.rol}</td>
                  <td>{user.barberias?.nombre_comercial ?? 'SaaS'}</td>
                  <td>{user.activo ? 'Si' : 'No'}</td>
                  <td className="space-x-2">
                    <Button variant="dark" className="py-2" onClick={() => toggleUsuario(user.id, !user.activo).then(load)}>{user.activo ? 'Desactivar' : 'Activar'}</Button>
                    <Button variant="dark" className="py-2" onClick={() => updateUsuario(user.id, { rol: user.rol }).then(load)}>Guardar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="block min-w-52">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select className="w-full rounded-[18px] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-gold-400/60" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos / ninguno</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}
