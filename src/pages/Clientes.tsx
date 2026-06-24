import { CalendarDays, ChevronRight, Edit3, MessageCircle, Plus, Search, ShoppingBag, Star, Trash2, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { createCliente, deactivateCliente, getClienteProfile, listClientes, updateCliente, type ClienteProfileData } from '../services/clientesService';
import type { ClienteRow } from '../types/database';
import { currency, initials } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { StatusBadge } from '../components/StatusBadge';

type DetailTab = 'Info' | 'Historial' | 'Notas' | 'Lealtad' | 'Compras';

const tabs: DetailTab[] = ['Info', 'Historial', 'Notas', 'Lealtad', 'Compras'];
const emptyForm = { nombre: '', telefono: '', whatsapp: '', email: '', fecha_nacimiento: '', notas: '' };

export function Clientes() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [selected, setSelected] = useState<ClienteRow | null>(null);
  const [detail, setDetail] = useState<ClienteProfileData | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('Info');
  const [editing, setEditing] = useState<ClienteRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listClientes(barberiaId, search);
      setClientes(data);
      setSelected((current) => {
        if (current && data.some((cliente) => cliente.id === current.id)) return current;
        return data[0] ?? null;
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'No se pudieron cargar clientes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(load, 250);
    return () => window.clearTimeout(timeout);
  }, [barberiaId, search]);

  useEffect(() => {
    if (!selected?.id || !barberiaId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    getClienteProfile(barberiaId, selected.id)
      .then((data) => {
        setDetail(data);
        setSelected(data.cliente);
      })
      .catch((detailError) => setError(getErrorMessage(detailError, 'No se pudo cargar el perfil del cliente.')))
      .finally(() => setDetailLoading(false));
  }, [barberiaId, selected?.id]);

  const startEdit = (cliente: ClienteRow) => {
    setEditing(cliente);
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono ?? '',
      whatsapp: cliente.whatsapp ?? '',
      email: cliente.email ?? '',
      fecha_nacimiento: cliente.fecha_nacimiento ?? '',
      notas: cliente.notas ?? '',
    });
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.nombre.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!barberiaId) {
      setError('Tu usuario no tiene una barberia asignada. Cierra sesion y vuelve a entrar.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        barberia_id: barberiaId,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        whatsapp: form.whatsapp.trim() || form.telefono.trim() || null,
        email: form.email.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        notas: form.notas.trim() || null,
      };
      const saved = editing ? await updateCliente(editing.id, payload) : await createCliente(payload);
      setMessage(editing ? 'Cliente actualizado.' : 'Cliente creado.');
      resetForm();
      await load();
      setSelected(saved);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar el cliente.'));
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => clientes, [clientes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400">Perfil completo con historial, compras y lealtad.</p>
        </div>
        <Button onClick={resetForm}>
          <Plus size={18} /> Agregar cliente
        </Button>
      </div>

      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input icon={<Search size={18} />} placeholder="Buscar cliente por nombre o telefono..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button className="lg:w-44" onClick={resetForm}>
              <Plus size={18} /> Nuevo
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Cliente</th>
                    <th>Ultima visita</th>
                    <th>Visitas</th>
                    <th>Total gastado</th>
                    <th>Puntos</th>
                    <th>Nivel</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className={`cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.03] ${selected?.id === cliente.id ? 'bg-gold-400/[0.07]' : ''}`}
                      onClick={() => {
                        setSelected(cliente);
                        setDetailTab('Info');
                      }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-200">{initials(cliente.nombre)}</div>
                          <div>
                            <p className="font-bold text-white">{cliente.nombre}</p>
                            <p className="text-zinc-500">{cliente.telefono ?? cliente.whatsapp ?? 'Sin telefono'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-zinc-300">{formatDate(cliente.ultima_visita)}</td>
                      <td className="font-bold text-white">{cliente.visitas ?? 0}</td>
                      <td className="font-bold text-white">{currency(Number(cliente.total_gastado ?? 0))}</td>
                      <td className="font-bold text-gold-300"><Star className="mr-1 inline" size={13} />{cliente.puntos_disponibles ?? 0}</td>
                      <td><TierBadge tier={cliente.nivel_lealtad} /></td>
                      <td className="pr-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" className="h-9 w-9 p-0" title="Editar cliente" onClick={(event) => { event.stopPropagation(); startEdit(cliente); }}>
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" className="h-9 w-9 p-0 text-rose-300" title="Desactivar cliente" onClick={async (event) => {
                            event.stopPropagation();
                            setError('');
                            try {
                              await deactivateCliente(cliente.id);
                              setMessage('Cliente desactivado.');
                              await load();
                            } catch (deleteError) {
                              setError(getErrorMessage(deleteError, 'No se pudo desactivar el cliente.'));
                            }
                          }}>
                            <Trash2 size={16} />
                          </Button>
                          <ChevronRight className="mt-2 text-zinc-600" size={16} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading && <p className="p-5 text-sm text-zinc-500">Cargando clientes...</p>}
            {!loading && rows.length === 0 && <p className="p-5 text-sm text-zinc-500">No hay clientes activos.</p>}
          </Card>

          <Card>
            <h2 className="mb-5 text-xl font-bold text-white">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <form className="grid gap-4 lg:grid-cols-3" onSubmit={submit}>
              <Input label="Nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
              <Input label="Telefono" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
              <Input label="WhatsApp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <Input label="Fecha nacimiento" type="date" value={form.fecha_nacimiento} onChange={(event) => setForm({ ...form, fecha_nacimiento: event.target.value })} />
              <div className="flex items-end gap-2">
                <Button disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</Button>
                {editing && <Button type="button" variant="dark" onClick={resetForm}>Cancelar</Button>}
              </div>
              <label className="block lg:col-span-3">
                <span className="mb-2 block text-sm text-zinc-400">Notas internas</span>
                <textarea className="min-h-24 w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none focus:border-gold-400/60" value={form.notas} onChange={(event) => setForm({ ...form, notas: event.target.value })} />
              </label>
            </form>
          </Card>
        </div>

        <ClienteDetailPanel
          selected={selected}
          detail={detail}
          loading={detailLoading}
          tab={detailTab}
          onTabChange={setDetailTab}
          onEdit={(cliente) => startEdit(cliente)}
        />
      </div>
    </div>
  );
}

function ClienteDetailPanel({
  selected,
  detail,
  loading,
  tab,
  onTabChange,
  onEdit,
}: {
  selected: ClienteRow | null;
  detail: ClienteProfileData | null;
  loading: boolean;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onEdit: (cliente: ClienteRow) => void;
}) {
  if (!selected) {
    return (
      <aside className="rounded-[24px] border border-white/10 bg-obsidian-800 p-6 text-sm text-zinc-500">
        Selecciona un cliente para ver su perfil completo.
      </aside>
    );
  }

  const cliente = detail?.cliente ?? selected;
  const metrics = detail?.metrics;
  const whatsapp = cliente.whatsapp ?? cliente.telefono;
  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : '';

  return (
    <aside className="h-fit rounded-[24px] border border-white/10 bg-obsidian-800 shadow-glow">
      <div className="border-b border-white/10 p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky-500/15 text-lg font-bold text-sky-100">{initials(cliente.nombre)}</div>
        <h2 className="mt-4 text-xl font-bold text-white">{cliente.nombre}</h2>
        <TierBadge tier={metrics?.nivelLealtad ?? cliente.nivel_lealtad} />
        <p className="mt-3 text-lg font-bold text-gold-300"><Star className="mr-1 inline" size={15} />{metrics?.puntosDisponibles ?? cliente.puntos_disponibles ?? 0} pts</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${whatsappUrl ? 'bg-emerald-500/12 text-emerald-300' : 'pointer-events-none bg-white/[0.04] text-zinc-600'}`} href={whatsappUrl || undefined} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
          <Button variant="dark" className="justify-center py-2" onClick={() => onEdit(cliente)}>
            <Edit3 size={16} /> Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 border-b border-white/10 text-xs font-bold text-zinc-500">
        {tabs.map((item) => (
          <button key={item} className={`border-b-2 px-2 py-3 ${tab === item ? 'border-gold-400 text-gold-300' : 'border-transparent'}`} onClick={() => onTabChange(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="min-h-[360px] p-5">
        {loading && <p className="text-sm text-zinc-500">Cargando perfil...</p>}
        {!loading && tab === 'Info' && <InfoTab cliente={cliente} detail={detail} />}
        {!loading && tab === 'Historial' && <HistorialTab detail={detail} />}
        {!loading && tab === 'Notas' && <NotasTab cliente={cliente} onEdit={onEdit} />}
        {!loading && tab === 'Lealtad' && <LealtadTab cliente={cliente} detail={detail} />}
        {!loading && tab === 'Compras' && <ComprasTab detail={detail} />}
      </div>
    </aside>
  );
}

function InfoTab({ cliente, detail }: { cliente: ClienteRow; detail: ClienteProfileData | null }) {
  const metrics = detail?.metrics;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Visitas" value={String(metrics?.visitas ?? cliente.visitas ?? 0)} />
        <MetricCard label="Gasto total" value={currency(metrics?.totalGastado ?? Number(cliente.total_gastado ?? 0))} />
        <MetricCard label="Ultima visita" value={formatDate(metrics?.ultimaVisita ?? cliente.ultima_visita)} />
        <MetricCard label="Ticket promedio" value={currency(metrics?.ticketPromedio ?? 0)} />
      </div>
      <InfoRow label="Telefono" value={cliente.telefono ?? '-'} />
      <InfoRow label="WhatsApp" value={cliente.whatsapp ?? cliente.telefono ?? '-'} />
      <InfoRow label="Email" value={cliente.email ?? '-'} />
      <InfoRow label="Barbero favorito" value={metrics?.barberoFavorito ?? 'Sin datos'} />
      <InfoRow label="Servicio mas frecuente" value={metrics?.servicioMasFrecuente ?? 'Sin datos'} />
    </div>
  );
}

function HistorialTab({ detail }: { detail: ClienteProfileData | null }) {
  const citas = detail?.citas ?? [];
  if (citas.length === 0) return <EmptyState text="Sin historial de citas." />;
  return (
    <div className="space-y-3">
      {citas.slice(0, 10).map((cita) => (
        <div key={cita.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-white">{formatDate(cita.fecha)} - {cita.hora_inicio.slice(0, 5)}</p>
              <p className="text-sm text-zinc-500">{findName(detail?.servicios, cita.servicio_id, 'Servicio sin asignar')}</p>
              <p className="text-xs text-zinc-600">{findName(detail?.barberos, cita.barbero_id, 'Barbero sin asignar')}</p>
            </div>
            <StatusBadge status={cita.estado} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotasTab({ cliente, onEdit }: { cliente: ClienteRow; onEdit: (cliente: ClienteRow) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Notas internas</p>
        <p className="mt-3 min-h-24 text-sm leading-6 text-zinc-300">{cliente.notas || 'Sin notas internas.'}</p>
      </div>
      <Button variant="dark" onClick={() => onEdit(cliente)}>
        <Edit3 size={16} /> Editar notas
      </Button>
    </div>
  );
}

function LealtadTab({ cliente, detail }: { cliente: ClienteRow; detail: ClienteProfileData | null }) {
  const metrics = detail?.metrics;
  const points = metrics?.puntosDisponibles ?? cliente.puntos_disponibles ?? 0;
  const totalPoints = metrics?.puntosTotales ?? cliente.puntos_totales ?? 0;
  const progress = Math.min(100, Math.round((points / nextTierTarget(points)) * 100));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold-400/20 bg-gold-400/10 p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-gold-300">Nivel actual</p>
        <div className="mt-3 flex items-center justify-between">
          <TierBadge tier={metrics?.nivelLealtad ?? cliente.nivel_lealtad} />
          <p className="text-xl font-bold text-white">{points} pts</p>
        </div>
        <div className="mt-4 h-2 rounded-full bg-black/30">
          <div className="h-full rounded-full bg-gold-400" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <MetricCard label="Puntos totales historicos" value={String(totalPoints)} icon={<Star size={16} />} />
      <MetricCard label="Beneficio disponible" value={points >= 500 ? 'Descuento sugerido' : 'Acumular mas puntos'} icon={<WalletCards size={16} />} />
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Historial de puntos</p>
        <div className="mt-3 space-y-2">
          {(detail?.loyaltyTransactions ?? []).slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-zinc-300">{transaction.descripcion ?? transaction.tipo}</span>
              <span className={transaction.puntos >= 0 ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{transaction.puntos > 0 ? '+' : ''}{transaction.puntos}</span>
            </div>
          ))}
          {(detail?.loyaltyTransactions ?? []).length === 0 && <p className="text-sm text-zinc-500">Sin movimientos de puntos todavia.</p>}
        </div>
      </div>
      <p className="text-xs leading-5 text-zinc-500">Los puntos y niveles se calculan desde la configuracion del modulo Lealtad.</p>
    </div>
  );
}

function ComprasTab({ detail }: { detail: ClienteProfileData | null }) {
  const ventas = detail?.ventas ?? [];
  if (ventas.length === 0) return <EmptyState text="Sin compras registradas." />;
  return (
    <div className="space-y-3">
      {ventas.slice(0, 8).map((venta) => {
        const items = detail?.ventaDetalles.filter((detalle) => detalle.venta_id === venta.id) ?? [];
        return (
          <div key={venta.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white">{currency(Number(venta.total))}</p>
                <p className="text-xs capitalize text-zinc-500">{formatDate(venta.created_at)} - {venta.metodo_pago}</p>
              </div>
              <ShoppingBag className="text-gold-300" size={18} />
            </div>
            <div className="mt-3 space-y-1">
              {items.slice(0, 3).map((item) => (
                <p key={item.id} className="text-xs text-zinc-500">{item.cantidad}x {item.descripcion}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-bold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-white/8 bg-white/[0.03] text-center text-sm text-zinc-500">
      <div>
        <CalendarDays className="mx-auto mb-3 text-zinc-600" size={22} />
        {text}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier?: string | null }) {
  const value = tier || 'Sin nivel';
  const styles: Record<string, string> = {
    Bronce: 'bg-orange-500/12 text-orange-300',
    Plata: 'bg-slate-300/12 text-slate-200',
    Oro: 'bg-gold-400/12 text-gold-300',
    Platino: 'bg-sky-400/12 text-sky-200',
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[value] ?? 'bg-white/[0.06] text-zinc-300'}`}>{value}</span>;
}

function findName(items: Array<{ id: string; nombre: string }> | undefined, id: string | null, fallback: string) {
  return items?.find((item) => item.id === id)?.nombre ?? fallback;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function nextTierTarget(points: number) {
  if (points < 500) return 500;
  if (points < 1000) return 1000;
  if (points < 2000) return 2000;
  return Math.max(points, 2500);
}
