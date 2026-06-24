import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
}

export function Input({ label, icon, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm text-zinc-400">{label}</span>}
      <span className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-zinc-200 focus-within:border-gold-400/60">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <input className={clsx('w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600', className)} {...props} />
      </span>
    </label>
  );
}
