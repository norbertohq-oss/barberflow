import { Headphones, Plus } from 'lucide-react';
import { supportTickets } from '../data/mockData';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { StatusBadge } from '../components/StatusBadge';

export function Soporte() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Atencion y soporte</h1>
          <p className="text-zinc-400">Las barberias pueden levantar tickets para recibir ayuda operativa.</p>
        </div>
        <Button>
          <Plus size={18} /> Nuevo ticket
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/10 text-gold-300">
              <Headphones size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Levantar ticket</h2>
              <p className="text-sm text-zinc-500">Respuesta estimada segun prioridad.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input label="Asunto" placeholder="Ej. No puedo cerrar caja" />
            <Input label="Modulo" placeholder="POS, agenda, clientes..." />
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Descripcion</span>
              <textarea className="min-h-32 w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none focus:border-gold-400/60" placeholder="Describe el problema con el mayor detalle posible." />
            </label>
            <Button className="w-full">Enviar ticket</Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-xl font-bold text-white">Tickets recientes</h2>
          <div className="space-y-3">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{ticket.subject}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {ticket.id} · {ticket.createdAt} · prioridad {ticket.priority}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
