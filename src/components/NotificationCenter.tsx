import { Bell, CheckCheck, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '../context/useNotifications';
import { Button } from './Button';

export function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="relative grid h-10 w-10 place-items-center rounded-full bg-transparent text-zinc-300 transition hover:bg-white/5 hover:text-white"
        title="Notificaciones"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-white/10 bg-obsidian-800 shadow-glow">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <p className="font-bold text-white">Notificaciones</p>
              <p className="text-xs text-zinc-500">{unreadCount} sin leer</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" className="h-9 w-9 p-0" title="Marcar todas como leidas" onClick={() => markAllRead()}>
                <CheckCheck size={16} />
              </Button>
              <Button variant="ghost" className="h-9 w-9 p-0" title="Cerrar" onClick={() => setOpen(false)}>
                <X size={16} />
              </Button>
            </div>
          </div>
          <div className="max-h-[460px] overflow-y-auto p-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full rounded-2xl p-3 text-left transition hover:bg-white/[0.05] ${notification.leida ? 'opacity-65' : 'bg-gold-400/[0.06]'}`}
                onClick={() => markRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-400/10 text-gold-300">
                    <Volume2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{notification.titulo}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">{notification.mensaje}</p>
                    <p className="mt-2 text-xs text-zinc-600">{new Date(notification.created_at).toLocaleString('es-MX')}</p>
                  </div>
                </div>
              </button>
            ))}
            {notifications.length === 0 && <p className="p-5 text-sm text-zinc-500">Aun no hay notificaciones.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationToast() {
  const { toast, dismissToast, markRead } = useNotifications();
  if (!toast) return null;
  return (
    <div className="fixed right-4 top-20 z-[80] w-[min(390px,calc(100vw-2rem))] rounded-[22px] border border-gold-400/30 bg-obsidian-800 p-4 shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white">{toast.titulo}</p>
          <p className="mt-1 text-sm leading-5 text-zinc-400">{toast.mensaje}</p>
        </div>
        <button className="text-zinc-500 hover:text-white" onClick={dismissToast}>
          <X size={16} />
        </button>
      </div>
      <button className="mt-3 text-xs font-bold text-gold-300" onClick={() => { void markRead(toast.id); dismissToast(); }}>
        Marcar como leida
      </button>
    </div>
  );
}
