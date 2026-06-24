import { AlertTriangle, CheckCircle2, Clock, Home, ReceiptText } from 'lucide-react';
import { Button } from '../components/Button';

type PaymentState = 'success' | 'failure' | 'pending';

const content: Record<PaymentState, {
  title: string;
  description: string;
  helper: string;
  icon: typeof CheckCircle2;
  color: string;
}> = {
  success: {
    title: 'Pago recibido',
    description: 'Estamos confirmando tu plan con Mercado Pago.',
    helper: 'Cuando el webhook confirme el pago aprobado, tu barberia quedara activa con el plan contratado.',
    icon: CheckCircle2,
    color: 'text-emerald-300',
  },
  failure: {
    title: 'Pago no completado',
    description: 'Mercado Pago no pudo completar la operacion.',
    helper: 'Puedes volver a BarberFlow e intentar contratar el plan nuevamente.',
    icon: AlertTriangle,
    color: 'text-rose-300',
  },
  pending: {
    title: 'Pago pendiente',
    description: 'Tu pago quedo pendiente de acreditacion.',
    helper: 'BarberFlow actualizara tu plan cuando Mercado Pago confirme el estado aprobado.',
    icon: Clock,
    color: 'text-amber-300',
  },
};

export function PaymentResult({ state }: { state: PaymentState }) {
  const params = new URLSearchParams(window.location.search);
  const data = content[state];
  const Icon = data.icon;

  return (
    <main className="grid min-h-screen place-items-center bg-obsidian-950 px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-[32px] border border-white/10 bg-obsidian-900 p-8 shadow-glow">
        <div className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] ${data.color}`}>
          <Icon size={28} />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-gold-300">Mercado Pago</p>
        <h1 className="font-display text-4xl font-bold">{data.title}</h1>
        <p className="mt-3 text-zinc-300">{data.description}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{data.helper}</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
          <div className="mb-3 flex items-center gap-2 font-bold text-white">
            <ReceiptText size={16} /> Referencia de pago
          </div>
          <p>Payment ID: {params.get('payment_id') ?? params.get('collection_id') ?? 'Pendiente'}</p>
          <p>Preference ID: {params.get('preference_id') ?? 'No disponible'}</p>
          <p>Status: {params.get('status') ?? params.get('collection_status') ?? state}</p>
        </div>

        <Button className="mt-7 w-full" onClick={() => { window.location.href = '/planes'; }}>
          <Home size={18} /> Volver a planes
        </Button>
      </section>
    </main>
  );
}
