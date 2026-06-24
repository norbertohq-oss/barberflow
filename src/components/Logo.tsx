import { Scissors } from 'lucide-react';

export function Logo({
  compact = false,
  name = 'BarberFlow',
  subtitle = 'Barbershop SaaS',
  logoUrl,
}: {
  compact?: boolean;
  name?: string;
  subtitle?: string;
  logoUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-gold-700/60 bg-gold-400/10 text-gold-400">
        {logoUrl ? <img src={logoUrl} alt={name} className="h-full w-full rounded-full object-cover" /> : <Scissors size={19} />}
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="max-w-[185px] truncate font-display text-lg font-bold uppercase tracking-[0.18em] text-white">{name}</div>
          <div className="max-w-[185px] truncate text-[10px] uppercase tracking-[0.22em] text-zinc-500">{subtitle}</div>
        </div>
      )}
    </div>
  );
}
