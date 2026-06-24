import { Building2, CreditCard, Users, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, StatCard } from '../../components/Card';
import { currency } from '../../lib/format';
import { getSaaSMetrics } from '../../services/superAdminService';

type Metrics = Awaited<ReturnType<typeof getSaaSMetrics>>;

export function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSaaSMetrics()
      .then(setMetrics)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el dashboard SaaS.'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Dashboard SaaS</h1>
        <p className="text-zinc-400">Vista global para el propietario de BarberFlow.</p>
      </div>
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard active label="Total barberias" value={String(metrics?.totalBarberias ?? '...')} hint={`${metrics?.activas ?? 0} activas`} icon={<Building2 size={20} />} />
        <StatCard label="En prueba" value={String(metrics?.prueba ?? '...')} hint={`${metrics?.suspendidas ?? 0} suspendidas`} icon={<WalletCards size={20} />} />
        <StatCard active label="Ingreso mensual" value={metrics ? currency(metrics.ingresoMensual) : '...'} hint="Estimado por plan" icon={<CreditCard size={20} />} />
        <StatCard label="Usuarios totales" value={String(metrics?.usuariosTotales ?? '...')} hint={`${metrics?.planesActivos ?? 0} planes activos`} icon={<Users size={20} />} />
      </div>
      <Card>
        <h2 className="text-xl font-bold text-white">Plan mas vendido</h2>
        <p className="mt-4 text-4xl font-bold text-gold-400">{metrics?.planMasVendido ?? '...'}</p>
        <p className="mt-2 text-sm text-zinc-500">Calculado desde barberias con plan asignado.</p>
      </Card>
    </div>
  );
}
