import { Check, Crown, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { currency } from '../lib/format';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { listPlanes } from '../services/planesService';
import { createMercadoPagoPreference } from '../services/paymentsService';
import type { PlanRow } from '../types/database';

export function Planes() {
  const { barberia, profile } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listPlanes(true)
      .then(setPlans)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los planes.'))
      .finally(() => setLoading(false));
  }, []);

  const contractPlan = async (planId: string) => {
    setError('');
    if (profile.rol !== 'admin') {
      setError('Solo el admin de la barberia puede contratar o cambiar el plan.');
      return;
    }
    setPayingPlanId(planId);
    try {
      const preference = await createMercadoPagoPreference(planId);
      window.location.assign(preference.init_point);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : 'No se pudo iniciar el pago.');
      setPayingPlanId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Planes BarberFlow</h1>
        <p className="text-zinc-400">Contrata o cambia el plan mensual de tu barberia con Mercado Pago Checkout Pro.</p>
      </div>

      {barberia?.plan_id && (
        <div className="flex flex-col gap-2 rounded-[24px] border border-gold-400/20 bg-gold-400/10 p-4 text-sm text-gold-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck size={17} /> Plan actual activo</span>
          <span className="text-gold-200/80">Vigencia: {barberia.fecha_fin_plan ? new Date(barberia.fecha_fin_plan).toLocaleDateString('es-MX') : 'pendiente de confirmar'}</span>
        </div>
      )}

      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      {loading && <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">Cargando planes...</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={barberia?.plan_id === plan.id || plan.nombre.toLowerCase().includes('profesional') ? 'border-gold-400/60' : ''}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{plan.nombre}</h2>
              {barberia?.plan_id === plan.id ? <ShieldCheck className="text-emerald-300" /> : plan.nombre.toLowerCase().includes('profesional') ? <Crown className="text-gold-400" /> : <Sparkles className="text-zinc-600" />}
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{plan.descripcion ?? 'Plan mensual BarberFlow para operar tu barberia.'}</p>
            <p className="mt-6 text-4xl font-bold text-white">
              {currency(Number(plan.precio_mensual))} <span className="text-sm font-medium text-zinc-500">/ mes</span>
            </p>
            <div className="mt-6 space-y-3">
              {featuresForPlan(plan).map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check size={16} className="text-gold-400" /> {feature}
                </div>
              ))}
            </div>
            <Button
              variant={barberia?.plan_id === plan.id ? 'dark' : 'primary'}
              className="mt-7 w-full"
              disabled={payingPlanId === plan.id || profile.rol !== 'admin'}
              onClick={() => contractPlan(plan.id)}
            >
              {payingPlanId === plan.id && <Loader2 className="animate-spin" size={17} />}
              {barberia?.plan_id === plan.id ? 'Renovar plan' : 'Contratar plan'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function featuresForPlan(plan: PlanRow) {
  return [
    plan.limite_usuarios ? `${plan.limite_usuarios} usuarios` : 'Usuarios ilimitados',
    plan.limite_barberos ? `${plan.limite_barberos} barberos` : 'Barberos ilimitados',
    plan.limite_citas_mes ? `${plan.limite_citas_mes} citas al mes` : 'Citas ilimitadas',
    plan.incluye_reportes ? 'Reportes incluidos' : 'Reportes basicos',
    plan.incluye_lealtad ? 'Programa de lealtad incluido' : 'Lealtad no incluida',
    plan.incluye_whatsapp ? 'Preparado para WhatsApp' : 'WhatsApp no incluido',
  ];
}
