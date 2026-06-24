import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-[20px] border border-white/10 bg-obsidian-800/80 p-5 shadow-glow', className)}>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  active,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Card className={clsx('relative overflow-hidden', active && 'border-gold-500/60')}>
      {active && <div className="absolute inset-y-0 left-0 w-1 bg-gold-400" />}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="mt-7 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-sm text-zinc-400">{hint}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/7 text-gold-400">{icon}</div>
      </div>
    </Card>
  );
}
