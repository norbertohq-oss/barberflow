import { Edit3, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { currency } from '../../lib/format';
import { createPlan, listPlanes, togglePlan, updatePlan } from '../../services/planesService';
import type { PlanRow } from '../../types/database';

const emptyPlan = {
  nombre: '',
  descripcion: '',
  precio_mensual: 0,
  precio_anual: 0,
  limite_usuarios: 3,
  limite_barberos: 2,
  limite_citas_mes: 100,
  incluye_whatsapp: false,
  incluye_reportes: true,
  incluye_lealtad: false,
  incluye_membresias: false,
};

export function SuperAdminPlanes() {
  const [planes, setPlanes] = useState<PlanRow[]>([]);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => setPlanes(await listPlanes());

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar planes.'));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre del plan es obligatorio.');
      return;
    }
    if (editing) await updatePlan(editing.id, form);
    else await createPlan(form);
    setMessage(editing ? 'Plan actualizado.' : 'Plan creado.');
    setEditing(null);
    setForm(emptyPlan);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Planes SaaS</h1>
        <p className="text-zinc-400">Precios, limites y caracteristicas incluidas.</p>
      </div>
      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <Card>
        <form className="grid gap-4 lg:grid-cols-4" onSubmit={submit}>
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Descripcion" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <Input label="Precio mensual" type="number" value={form.precio_mensual} onChange={(e) => setForm({ ...form, precio_mensual: Number(e.target.value) })} />
          <Input label="Precio anual" type="number" value={form.precio_anual} onChange={(e) => setForm({ ...form, precio_anual: Number(e.target.value) })} />
          <Input label="Limite usuarios" type="number" value={form.limite_usuarios} onChange={(e) => setForm({ ...form, limite_usuarios: Number(e.target.value) })} />
          <Input label="Limite barberos" type="number" value={form.limite_barberos} onChange={(e) => setForm({ ...form, limite_barberos: Number(e.target.value) })} />
          <Input label="Citas por mes" type="number" value={form.limite_citas_mes} onChange={(e) => setForm({ ...form, limite_citas_mes: Number(e.target.value) })} />
          <div className="flex items-end"><Button className="w-full"><Plus size={18} /> {editing ? 'Actualizar' : 'Crear plan'}</Button></div>
          <Feature label="WhatsApp" checked={form.incluye_whatsapp} onChange={(value) => setForm({ ...form, incluye_whatsapp: value })} />
          <Feature label="Reportes" checked={form.incluye_reportes} onChange={(value) => setForm({ ...form, incluye_reportes: value })} />
          <Feature label="Lealtad" checked={form.incluye_lealtad} onChange={(value) => setForm({ ...form, incluye_lealtad: value })} />
          <Feature label="Membresias" checked={form.incluye_membresias} onChange={(value) => setForm({ ...form, incluye_membresias: value })} />
        </form>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {planes.map((plan) => (
          <Card key={plan.id} className={plan.activo ? 'border-gold-400/30' : ''}>
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold text-white">{plan.nombre}</h2>
              <button onClick={() => togglePlan(plan.id, !plan.activo).then(load)}>{plan.activo ? <ToggleRight className="text-emerald-400" /> : <ToggleLeft className="text-zinc-600" />}</button>
            </div>
            <p className="mt-3 min-h-12 text-sm text-zinc-400">{plan.descripcion}</p>
            <p className="mt-5 text-3xl font-bold text-gold-400">{currency(Number(plan.precio_mensual))}<span className="text-sm text-zinc-500">/mes</span></p>
            <p className="text-sm text-zinc-500">{currency(Number(plan.precio_anual))}/año</p>
            <div className="mt-5 space-y-2 text-sm text-zinc-300">
              <p>{plan.limite_usuarios ?? '∞'} usuarios · {plan.limite_barberos ?? '∞'} barberos</p>
              <p>{plan.limite_citas_mes ?? '∞'} citas/mes</p>
            </div>
            <Button variant="dark" className="mt-5" onClick={() => { setEditing(plan); setForm({
              nombre: plan.nombre,
              descripcion: plan.descripcion ?? '',
              precio_mensual: Number(plan.precio_mensual),
              precio_anual: Number(plan.precio_anual),
              limite_usuarios: plan.limite_usuarios ?? 0,
              limite_barberos: plan.limite_barberos ?? 0,
              limite_citas_mes: plan.limite_citas_mes ?? 0,
              incluye_whatsapp: plan.incluye_whatsapp,
              incluye_reportes: plan.incluye_reportes,
              incluye_lealtad: plan.incluye_lealtad,
              incluye_membresias: plan.incluye_membresias,
            }); }}><Edit3 size={16} /> Editar</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Feature({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
