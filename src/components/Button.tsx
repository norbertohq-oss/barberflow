import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'dark';
  children: ReactNode;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[22px] px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-gold-400 text-black hover:bg-gold-300',
        variant === 'ghost' && 'bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white',
        variant === 'dark' && 'border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-gold-400/40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
