import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { listBarberos } from '../services/authService';
import { listClientes } from '../services/clientesService';
import { listEmpleados } from '../services/empleadosService';
import { cancelCita, changeCitaStatus, createCita, listCitasByDate, updateCita } from '../services/citasService';
import { listServicios } from '../services/serviciosService';
import type { AppointmentStatus, CitaRow, ClienteRow, ProfileRow, ServicioRow } from '../types/database';
import { currency } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Input } from '../components/Input';

const todayIso = () => new Date().toISOString().slice(0, 10);
const emptyCita = { cliente_id: '', servicio_id: '', barbero_id: '', hora_inicio: '09:00', estado: 'pendiente' as AppointmentStatus, notas: '' };

export function Agenda() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [fecha, setFecha] = useState(todayIso());
  const [citas, setCitas] = useState<CitaRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [servicios, setServicios] = useState<ServicioRow[]>([]);
  const [barberos, setBarberos] = useState<ProfileRow[]>([]);
  const [empleadosSinAcceso, setEmpleadosSinAcceso] = useState(0);
  const [editing, setEditing] = useState<CitaRow | null>(null);
  const [form, setForm] = useState(emptyCita);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      listCitasByDate(barberiaId, fecha),
      listClientes(barberiaId),
      listServicios(barberiaId),
      listBarberos(barberiaId),
      listEmpleados(barberiaId),
    ]);
    const [citasResult, clientesResult, serviciosResult, barberosResult, empleadosResult] = results;

    setCitas(citasResult.status === 'fulfilled' ? (citasResult.value as CitaRow[]) : []);
    setClientes(clientesResult.status === 'fulfilled' ? clientesResult.value : []);
    setServicios(serviciosResult.status === 'fulfilled' ? serviciosResult.value : []);
    setBarberos(barberosResult.status === 'fulfilled' ? barberosResult.value : []);
    setEmpleadosSinAcceso(
      empleadosResult.status === 'fulfilled'
        ? empleadosResult.value.filter((empleado) => (empleado.rol ?? '').toLowerCase().includes('barbero') && !empleado.profile_id).length
        : 0,
    );

    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => getErrorMessage(result.reason, 'No se pudo cargar una parte de la agenda.'));
    if (errors.length > 0) setError(errors.join(' '));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [barberiaId, fecha]);

  const getClienteName = (clienteId: string | null) => clientes.find((cliente) => cliente.id === clienteId)?.nombre ?? '-';
  const getServicioName = (servicioId: string | null) => servicios.find((servicio) => servicio.id === servicioId)?.nombre ?? '-';
  const getBarberoName = (barberoId: string | null) => barberos.find((barbero) => barbero.id === barberoId)?.nombre ?? '-';

  const startEdit = (cita: CitaRow) => {
    setEditing(cita);
    setForm({
      cliente_id: cita.cliente_id ?? '',
      servicio_id: cita.servicio_id ?? '',
      barbero_id: cita.barbero_id ?? '',
      hora_inicio: cita.hora_inicio.slice(0, 5),
      estado: cita.estado,
      notas: cita.notas ?? '',
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.cliente_id || !form.servicio_id || !form.barbero_id || !form.hora_inicio) {
      setError('Selecciona cliente, servicio, barbero y hora.');
      return;
    }
    const service = servicios.find((item) => item.id === form.servicio_id);
    const [hour, minute] = form.hora_inicio.split(':').map(Number);
    const end = new Date(2000, 0, 1, hour, minute + (service?.duracion_minutos ?? 30));
    const payload = {
      barberia_id: barberiaId,
      cliente_id: form.cliente_id,
      servicio_id: form.servicio_id,
      barbero_id: form.barbero_id,
      fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      estado: form.estado,
      notas: form.notas.trim() || null,
    };
    try {
      if (editing) await updateCita(editing.id, payload);
      else await createCita(payload);
      setMessage(editing ? 'Cita actualizada.' : 'Cita creada.');
      setEditing(null);
      setForm(emptyCita);
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar la cita.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Agenda</h1>
          <p className="text-zinc-400">CRUD de citas conectado por dia.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyCita); }}>
          <Plus size={18} /> Nueva cita
        </Button>
      </div>

      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      {empleadosSinAcceso > 0 && (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          Hay {empleadosSinAcceso} barbero(s) creados como empleado sin acceso al sistema. Para asignarlos en agenda, crea su acceso desde Configuracion &gt; Empleados.
        </p>
      )}
      {!loading && clientes.length === 0 && (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">No hay clientes activos para esta barberia.</p>
      )}
      {!loading && servicios.length === 0 && (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">No hay servicios registrados para esta barberia.</p>
      )}
      {!loading && barberos.length === 0 && (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">No hay barberos con acceso al sistema. Crea su acceso desde Configuracion &gt; Empleados.</p>
      )}

      <Card>
        <form className="grid gap-4 lg:grid-cols-7" onSubmit={submit}>
          <Input label="Fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          <Select label="Cliente" value={form.cliente_id} onChange={(value) => setForm({ ...form, cliente_id: value })} options={clientes.map((item) => [item.id, item.nombre])} />
          <Select label="Servicio" value={form.servicio_id} onChange={(value) => setForm({ ...form, servicio_id: value })} options={servicios.map((item) => [item.id, `${item.nombre} - ${currency(Number(item.precio))}${item.activo ? '' : ' - inactivo'}`])} />
          <Select label="Barbero" value={form.barbero_id} onChange={(value) => setForm({ ...form, barbero_id: value })} options={barberos.map((item) => [item.id, item.nombre])} />
          <Input label="Hora" type="time" value={form.hora_inicio} onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })} />
          <Select label="Estado" value={form.estado} onChange={(value) => setForm({ ...form, estado: value as AppointmentStatus })} options={['pendiente', 'confirmada', 'completada', 'cancelada'].map((item) => [item, item])} />
          <div className="flex items-end">
            <Button className="w-full">{editing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-bold text-white">Lista de citas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="py-3">Hora</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Barbero</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((cita) => (
                <tr key={cita.id} className="border-t border-white/5">
                  <td className="py-4 font-bold text-white">{cita.hora_inicio.slice(0, 5)}</td>
                  <td>{getClienteName(cita.cliente_id)}</td>
                  <td>{getServicioName(cita.servicio_id)}</td>
                  <td>{getBarberoName(cita.barbero_id)}</td>
                  <td><StatusBadge status={cita.estado} /></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="dark" className="py-2" onClick={() => startEdit(cita)}>Editar</Button>
                      <Button variant="dark" className="py-2" onClick={() => changeCitaStatus(cita.id, 'completada').then(load)}>Completar</Button>
                      <Button variant="ghost" className="py-2 text-rose-300" onClick={() => cancelCita(cita.id).then(load)}>Cancelar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="mt-4 text-sm text-zinc-500">Cargando citas...</p>}
        {!loading && citas.length === 0 && <p className="mt-4 text-sm text-zinc-500">Sin citas para este dia.</p>}
        <p className="mt-5 text-xs text-zinc-500">TODO: conectar confirmaciones de cita con WhatsApp Business y sincronizacion futura con Google Calendar.</p>
      </Card>
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
