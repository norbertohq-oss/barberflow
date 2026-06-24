import {
  CalendarDays,
  CreditCard,
  Headphones,
  Home,
  LogOut,
  Menu,
  Scissors,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  Package,
  Building2,
  Gauge,
  Gift,
} from 'lucide-react';
import clsx from 'clsx';
import type { NavItem, UserSession, View } from '../types';
import { canAccess } from '../lib/permissions';
import { initials } from '../lib/format';
import { Button } from './Button';
import { Logo } from './Logo';
import { NotificationCenter, NotificationToast } from './NotificationCenter';

const navItems: NavItem[] = [
  { id: 'super_admin_dashboard', label: 'Dashboard SaaS', icon: Gauge, roles: ['super_admin'] },
  { id: 'super_admin_barberias', label: 'Barberias', icon: Building2, roles: ['super_admin'] },
  { id: 'super_admin_planes', label: 'Planes SaaS', icon: WalletCards, roles: ['super_admin'] },
  { id: 'super_admin_usuarios', label: 'Usuarios SaaS', icon: Users, roles: ['super_admin'] },
  { id: 'super_admin_config', label: 'Configuracion SaaS', icon: Settings, roles: ['super_admin'] },
  { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin'] },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, roles: ['admin', 'barbero'] },
  { id: 'pos', label: 'Punto de Venta', icon: CreditCard, roles: ['admin', 'cajero'] },
  { id: 'clientes', label: 'Clientes', icon: Users, roles: ['admin', 'cajero', 'barbero'] },
  { id: 'servicios', label: 'Servicios', icon: Scissors, roles: ['admin'] },
  { id: 'productos', label: 'Productos', icon: Package, roles: ['admin', 'cajero'] },
  { id: 'lealtad', label: 'Lealtad', icon: Gift, roles: ['admin'] },
  { id: 'usuarios', label: 'Usuarios y roles', icon: ShieldCheck, roles: ['admin'] },
  { id: 'planes', label: 'Planes', icon: WalletCards, roles: ['admin'] },
  { id: 'soporte', label: 'Soporte', icon: Headphones, roles: ['admin', 'cajero', 'barbero', 'cliente'] },
  { id: 'configuracion', label: 'Configuracion', icon: Settings, roles: ['admin'] },
];

export function AppShell({
  activeView,
  onNavigate,
  user,
  barberiaName,
  barberiaLogoUrl,
  onLogout,
  children,
}: {
  activeView: View;
  onNavigate: (view: View) => void;
  user: UserSession;
  barberiaName: string;
  barberiaLogoUrl?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const visibleNav = navItems.filter((item) => canAccess(user.role, item.roles));
  const activeLabel = navItems.find((item) => item.id === activeView)?.label ?? 'BarberFlow';

  return (
    <div className="min-h-screen bg-obsidian-950 text-zinc-200">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[274px] border-r border-white/10 bg-obsidian-900 lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-5">
          <Logo
            name={user.role === 'super_admin' ? 'BarberFlow' : barberiaName}
            subtitle={user.role === 'super_admin' ? 'Barbershop SaaS' : 'Barbershop'}
            logoUrl={user.role === 'super_admin' ? null : barberiaLogoUrl}
          />
        </div>
        <nav className="flex-1 space-y-2 p-3">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm font-semibold transition',
                  activeView === item.id ? 'bg-gold-400/10 text-gold-300' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gold-400/15 text-xs font-bold text-gold-300">{initials(user.name)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-obsidian-950/90 backdrop-blur lg:ml-[274px]">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Menu className="lg:hidden" size={20} />
            <div>
              <p className="text-base font-bold text-white">{activeLabel}</p>
              <p className="hidden text-xs text-zinc-500 sm:block">
                {barberiaName} · {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="dark" className="hidden px-4 py-2 sm:inline-flex" onClick={onLogout} title="Cerrar sesion">
              <LogOut size={16} />
              Cerrar sesion
            </Button>
            <Button variant="ghost" className="h-10 w-10 rounded-full p-0 sm:hidden" onClick={onLogout} title="Cerrar sesion">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-24 lg:ml-[274px] lg:pb-8">
        <div className="mx-auto max-w-[1220px] px-4 py-6 lg:px-6">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-obsidian-900/95 px-2 py-2 backdrop-blur lg:hidden">
        {visibleNav.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold',
                activeView === item.id ? 'bg-gold-400/10 text-gold-300' : 'text-zinc-500',
              )}
            >
              <Icon size={18} />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
      <NotificationToast />
    </div>
  );
}
