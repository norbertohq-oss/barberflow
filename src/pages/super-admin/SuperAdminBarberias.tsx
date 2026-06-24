import { Building2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { listBarberias, setBarberiaEstado, updateBarberia } from '../../services/barberiasService';
import { listPlanes } from '../../services/planesService';
import { createBarberiaWithAdmin } from '../../services/superAdminService';
import type { PlanRow } from '../../types/database';

type BarberiaAdminRow = {
  id: string;
  nombre_comercial: string;
  slogan: string | null;
  telefono: string | null;
  whatsapp: string | null;
  direccion: string | null;
  plan_id: string | null;
  estado: 'activa' | 'suspendida' | 'cancelada' | 'prueba';
  planes?: { nombre: string; precio_mensual: number } | { nombre: string; precio_mensual: number }[] | null;
};

type BarberiaForm = {
  nombre_comercial: string;
  slogan: string;
  telefono: string;
  whatsapp: string;
  direccion: string;
  plan_id: string;
  estado: 'activa' | 'suspendida' | 'cancelada' | 'prueba';
  admin_nombre: string;
  admin_email: string;
  admin_password: string;
};

const emptyForm: BarberiaForm = {
  nombre_comercial: '',
  slogan: '',
  telefono: '',
  whatsapp: '',
  direccion: '',
  plan_id: '',
  estado: 'prueba' as const,
  admin_nombre: '',
  admin_email: '',
  admin_password: '',
};

export function SuperAdminBarberias() {
  const [barberias, setBarberias] = useState<BarberiaAdminRow[]>([]);
  const [planes, setPlanes] = useState<PlanRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [barberiasData, planesData] = await Promise.all([listBarberias(), listPlanes(true)]);
    setBarberias(barberiasData);
    setPlanes(planesData);
  };

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar barberias.'));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.nombre_comercial.trim()) {
      setError('El nombre comercial es obligatorio.');
      return;
    }
    const barberiaPayload = {
      nombre_comercial: form.nombre_comercial.trim(),
      slogan: form.slogan || null,
      telefono: form.telefono || null,
      whatsapp: form.whatsapp || null,
      direccion: form.direccion || null,
      plan_id: form.plan_id || null,
      estado: form.estado,
    };
    if (editingId) {
      await updateBarberia(editingId, barberiaPayload);
      setMessage('Barberia actualizada.');
    } else {
      if (!form.admin_email || !form.admin_password || !form.admin_nombre) {
        setError('Para crear barberia nueva agrega admin inicial, email y contrasena temporal.');
        return;
      }
      await createBarberiaWithAdmin({
        barberia: barberiaPayload,
        admin: { nombre: form.admin_nombre, email: form.admin_email, password: form.admin_password },
      });
      setMessage('Barberia y admin inicial creados.');
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Barberias</h1>
        <p className="text-zinc-400">Alta, estado, plan y administrador inicial.</p>
      </div>
      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <Card>
        <form className="grid gap-4 lg:grid-cols-4" onSubmit={submit}>
          <Input label="Nombre comercial" value={form.nombre_comercial} onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} />
          <Input label="Slogan" value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} />
          <Input label="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <Input label="Direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <Select label="Plan" value={form.plan_id} onChange={(value) => setForm({ ...form, plan_id: value })} options={planes.map((plan) => [plan.id, plan.nombre])} />
          <Select label="Estado" value={form.estado} onChange={(value) => setForm({ ...form, estado: value as typeof form.estado })} options={['activa', 'prueba', 'suspendida', 'cancelada'].map((item) => [item, item])} />
          <div className="hidden lg:block" />
          {!editingId && (
            <>
              <Input label="Admin nombre" value={form.admin_nombre} onChange={(e) => setForm({ ...form, admin_nombre: e.target.value })} />
              <Input label="Admin email" type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
              <Input label="Contrasena temporal" type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
            </>
          )}
          <div className="flex items-end">
            <Button className="w-full"><Plus size={18} /> {editingId ? 'Actualizar' : 'Crear barberia'}</Button>
          </div>
        </form>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {barberias.map((barberia) => {
          const plan = Array.isArray(barberia.planes) ? barberia.planes[0] : barberia.planes;
          return (
            <Card key={barberia.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/10 text-gold-300"><Building2 size={22} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{barberia.nombre_comercial}</h2>
                    <p className="text-sm text-zinc-500">{barberia.direccion ?? 'Sin direccion'}</p>
                    <p className="mt-2 text-sm text-zinc-400">Plan: {plan?.nombre ?? 'Sin plan'} · Estado: {barberia.estado}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-zinc-300">{barberia.estado}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="dark" onClick={() => {
                  setEditingId(barberia.id);
                  setForm({
                    ...emptyForm,
                    nombre_comercial: barberia.nombre_comercial,
                    slogan: barberia.slogan ?? '',
                    telefono: barberia.telefono ?? '',
                    whatsapp: barberia.whatsapp ?? '',
                    direccion: barberia.direccion ?? '',
                    plan_id: barberia.plan_id ?? '',
                    estado: barberia.estado,
                  });
                }}>Editar</Button>
                <Button variant="dark" onClick={() => setBarberiaEstado(barberia.id, 'suspendida').then(load)}>Suspender</Button>
                <Button variant="dark" onClick={() => setBarberiaEstado(barberia.id, 'activa').then(load)}>Reactivar</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select className="w-full rounded-[18px] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-gold-400/60" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Seleccionar</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}
