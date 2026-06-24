import clsx from 'clsx';
import type { AppointmentStatus, TicketStatus } from '../types';

const appointmentStyles: Record<AppointmentStatus, string> = {
  pendiente: 'bg-amber-500/12 text-amber-300',
  confirmada: 'bg-blue-500/12 text-blue-300',
  en_proceso: 'bg-gold-400/12 text-gold-300',
  completada: 'bg-emerald-500/12 text-emerald-300',
  cancelada: 'bg-rose-500/12 text-rose-300',
  no_show: 'bg-zinc-500/12 text-zinc-300',
};

const ticketStyles: Record<TicketStatus, string> = {
  abierto: 'bg-blue-500/12 text-blue-300',
  en_revision: 'bg-amber-500/12 text-amber-300',
  resuelto: 'bg-emerald-500/12 text-emerald-300',
};

export function StatusBadge({ status }: { status: AppointmentStatus | TicketStatus }) {
  const styles = status in appointmentStyles ? appointmentStyles : ticketStyles;
  return (
    <span className={clsx('inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize', styles[status as keyof typeof styles])}>
      {status.replace('_', ' ')}
    </span>
  );
}
