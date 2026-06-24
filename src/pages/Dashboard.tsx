import { CalendarDays, Clock, DollarSign, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardMetrics } from '../services/ventasService';
import { currency } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { Card, StatCard } from '../components/Card';

type DashboardData = Awaited<ReturnType<typeof getDashboardMetrics>>;

const todayIso = () => new Date().toISOString().slice(0, 10);

export function Dashboard() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getDashboardMetrics(barberiaId, todayIso())
      .then(setData)
      .catch((metricsError) => setError(getErrorMessage(metricsError, 'No se pudo cargar el dashboard.')))
      .finally(() => setLoading(false));
  }, [barberiaId]);

  const ventasTotal = useMemo(() => data?.ventas.reduce((sum, venta) => sum + Number(venta.total), 0) ?? 0, [data]);
  const completed = data?.citas.filter((cita) => cita.estado === 'completada').length ?? 0;
  const nextAppointment = data?.citas.find((cita) => cita.estado !== 'cancelada' && cita.estado !== 'completada');
  const getClienteName = (clienteId: string | null) => data?.clientes.find((cliente) => cliente.id === clienteId)?.nombre ?? 'Cliente sin asignar';
  const getServicioName = (servicioId: string | null) => data?.servicios.find((servicio) => servicio.id === servicioId)?.nombre ?? 'Servicio sin asignar';
  const getBarberoName = (barberoId: string | null) => data?.barberos.find((barbero) => barbero.id === barberoId)?.nombre ?? 'Barbero';
  const topServices = useMemo(() => {
    const totals = new Map<string, number>();
    data?.serviciosVendidos.forEach((item) => totals.set(item.descripcion, (totals.get(item.descripcion) ?? 0) + Number(item.cantidad)));
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Buenos dias, {profile.nombre}</h1>
        <p className="mt-1 text-zinc-400">Operacion del dia - {todayIso()}</p>
      </div>

      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard active label="Citas de hoy" value={loading ? '...' : String(data?.citas.length ?? 0)} hint={`${completed} completadas`} icon={<CalendarDays size={20} />} />
        <StatCard active label="Ventas del dia" value={loading ? '...' : currency(ventasTotal)} hint="Total cobrado hoy" icon={<DollarSign size={20} />} />
        <StatCard label="Clientes atendidos" value={loading ? '...' : String(completed)} hint="Citas completadas" icon={<Users size={20} />} />
        <StatCard label="Proxima cita" value={nextAppointment?.hora_inicio?.slice(0, 5) ?? '--:--'} hint={nextAppointment ? getClienteName(nextAppointment.cliente_id) : 'Sin citas pendientes'} icon={<Clock size={20} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Ingresos del dia</h2>
              <p className="text-zinc-400">Ventas registradas en Supabase</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{currency(ventasTotal)}</p>
              <p className="text-sm text-emerald-400">{data?.ventas.length ?? 0} ventas</p>
            </div>
          </div>
          <div className="mt-8 grid min-h-64 place-items-center rounded-2xl border border-white/8 bg-white/[0.03]">
            <p className="max-w-sm text-center text-sm leading-6 text-zinc-500">
              La grafica por hora quedo preparada para fase de reportes. Las ventas reales ya alimentan el total del dia.
            </p>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Proximas citas</h2>
            <span className="text-sm font-bold text-gold-400">Hoy</span>
          </div>
          <div className="space-y-3">
            {(data?.citas ?? []).slice(0, 5).map((cita) => (
              <div key={cita.id} className="flex items-center gap-4 rounded-[18px] bg-white/[0.04] p-4">
                <p className="w-14 font-bold text-white">{cita.hora_inicio.slice(0, 5)}</p>
                <div className="h-10 w-px bg-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{getClienteName(cita.cliente_id)}</p>
                  <p className="truncate text-sm text-zinc-500">{getServicioName(cita.servicio_id)}</p>
                </div>
                <span className="text-xs font-bold text-gold-400">{getBarberoName(cita.barbero_id)}</span>
              </div>
            ))}
            {!loading && data?.citas.length === 0 && <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-zinc-500">Sin citas para hoy.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-bold text-white">Servicios mas vendidos</h2>
          {topServices.map(([service, total], index) => (
            <div key={service} className="flex items-center justify-between border-t border-white/5 py-4 first:border-t-0">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-400/10 text-sm font-bold text-gold-300">{index + 1}</span>
                <p className="font-bold text-white">{service}</p>
              </div>
              <p className="font-bold text-white">{total} vendidos</p>
            </div>
          ))}
          {!loading && topServices.length === 0 && <p className="text-sm text-zinc-500">Aun no hay ventas de servicios.</p>}
        </Card>
        <Card>
          <h2 className="mb-4 text-xl font-bold text-white">Barberos activos</h2>
          {(data?.barberos ?? []).map((barber) => (
            <div key={barber.id} className="flex items-center justify-between border-t border-white/5 py-4 first:border-t-0">
              <div>
                <p className="font-bold text-white">{barber.nombre}</p>
                <p className="text-sm text-zinc-500">{barber.email}</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">Activo</span>
            </div>
          ))}
          {!loading && data?.barberos.length === 0 && <p className="text-sm text-zinc-500">No hay barberos activos registrados.</p>}
        </Card>
      </div>
    </div>
  );
}
