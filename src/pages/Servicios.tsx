import { Edit3, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { createServicio, listServicios, toggleServicio, updateServicio } from '../services/serviciosService';
import type { ServicioRow } from '../types/database';
import { currency } from '../lib/format';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

const emptyForm = { nombre: '', categoria: '', duracion_minutos: 30, precio: 0, descripcion: '' };

export function Servicios() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [servicios, setServicios] = useState<ServicioRow[]>([]);
  const [editing, setEditing] = useState<ServicioRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setServicios(await listServicios(barberiaId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar servicios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [barberiaId]);

  const startEdit = (servicio: ServicioRow) => {
    setEditing(servicio);
    setForm({
      nombre: servicio.nombre,
      categoria: servicio.categoria,
      duracion_minutos: servicio.duracion_minutos,
      precio: Number(servicio.precio),
      descripcion: servicio.descripcion ?? '',
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.nombre.trim() || !form.categoria.trim() || form.duracion_minutos <= 0 || form.precio < 0) {
      setError('Completa nombre, categoria, duracion y precio valido.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, barberia_id: barberiaId, descripcion: form.descripcion.trim() || null };
      if (editing) await updateServicio(editing.id, payload);
      else await createServicio(payload);
      setMessage(editing ? 'Servicio actualizado.' : 'Servicio creado.');
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Servicios</h1>
          <p className="text-zinc-400">CRUD real con disponibilidad por barberia.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); }}>
          <Plus size={18} /> Nuevo servicio
        </Button>
      </div>

      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      <Card>
        <form className="grid gap-4 lg:grid-cols-6" onSubmit={submit}>
          <Input label="Nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
          <Input label="Categoria" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} />
          <Input label="Duracion" type="number" value={form.duracion_minutos} onChange={(event) => setForm({ ...form, duracion_minutos: Number(event.target.value) })} />
          <Input label="Precio" type="number" value={form.precio} onChange={(event) => setForm({ ...form, precio: Number(event.target.value) })} />
          <Input label="Descripcion" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} />
          <div className="flex items-end">
            <Button className="w-full" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {servicios.map((service) => (
          <Card key={service.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-gold-400/10 px-3 py-1 text-xs font-bold text-gold-300">{service.categoria}</span>
                <h2 className="mt-4 text-xl font-bold text-white">{service.nombre}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{service.descripcion ?? 'Sin descripcion'}</p>
              </div>
              <button onClick={() => toggleServicio(service.id, !service.activo).then(load)} title={service.activo ? 'Desactivar' : 'Activar'}>
                {service.activo ? <ToggleRight className="text-emerald-400" /> : <ToggleLeft className="text-zinc-600" />}
              </button>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-sm text-zinc-500">{service.duracion_minutos} minutos</p>
                <p className="text-2xl font-bold text-gold-400">{currency(Number(service.precio))}</p>
              </div>
              <Button variant="dark" onClick={() => startEdit(service)}>
                <Edit3 size={16} /> Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {loading && <p className="text-sm text-zinc-500">Cargando servicios...</p>}
    </div>
  );
}
