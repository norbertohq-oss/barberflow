import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { NotificationsContext } from './notificationsContextValue';
import {
  getOrCreateNotificationSettings,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationSettings,
} from '../services/notificationsService';
import type { NotificationRow, UserNotificationSettingsRow } from '../types/database';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [settings, setSettings] = useState<UserNotificationSettingsRow | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  const [toast, setToast] = useState<NotificationRow | null>(null);
  const interactedRef = useRef(false);
  const upcomingNotifiedRef = useRef(new Set<string>());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.leida).length, [notifications]);

  const load = useCallback(async () => {
    if (!barberiaId) return;
    const [notificationsData, settingsData] = await Promise.all([
      listNotifications(barberiaId),
      getOrCreateNotificationSettings(profile.id),
    ]);
    setNotifications(notificationsData);
    setSettings(settingsData);
  }, [barberiaId, profile.id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    const markInteraction = () => {
      interactedRef.current = true;
    };
    window.addEventListener('pointerdown', markInteraction, { once: true });
    window.addEventListener('keydown', markInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, []);

  const shouldNotify = useCallback((notification: NotificationRow) => {
    if (!settings) return true;
    if (notification.tipo === 'nueva_cita') return settings.notify_new_appointments;
    if (notification.tipo === 'cita_cancelada' || notification.tipo === 'cita_modificada') return settings.notify_cancellations;
    if (notification.tipo === 'nueva_venta') return settings.notify_sales;
    if (notification.tipo === 'ticket_soporte') return settings.notify_support;
    if (notification.tipo === 'cliente_inactivo') return settings.notify_inactive_clients;
    return true;
  }, [settings]);

  const playSound = useCallback(async () => {
    if (!settings?.sound_enabled || !interactedRef.current) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = Number(settings.volume ?? 0.7);
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = 880;
        gain.gain.value = Number(settings.volume ?? 0.7) * 0.08;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.12);
      } catch {
        // Sound is non-critical.
      }
    }
  }, [settings]);

  const showDesktopNotification = useCallback((notification: NotificationRow) => {
    if (!settings?.desktop_enabled || permission !== 'granted' || !('Notification' in window)) return;
    try {
      new Notification(notification.titulo, {
        body: notification.mensaje,
        icon: '/branding/favicon-180x180.png',
        tag: notification.id,
      });
    } catch {
      // Desktop notification is non-critical.
    }
  }, [permission, settings]);

  const handleIncoming = useCallback((notification: NotificationRow) => {
    setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 30));
    if (!shouldNotify(notification)) return;
    setToast(notification);
    window.setTimeout(() => setToast((current) => (current?.id === notification.id ? null : current)), 6000);
    void playSound();
    showDesktopNotification(notification);
  }, [playSound, shouldNotify, showDesktopNotification]);

  useEffect(() => {
    if (!barberiaId) return;
    const channel = supabase
      .channel(`barberflow-notifications-${barberiaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `barberia_id=eq.${barberiaId}` }, (payload) => {
        handleIncoming(payload.new as NotificationRow);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `barberia_id=eq.${barberiaId}` }, (payload) => {
        const updated = payload.new as NotificationRow;
        setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barberia_id=eq.${barberiaId}` }, () => {
        void load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas', filter: `barberia_id=eq.${barberiaId}` }, () => {
        void load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'soporte_tickets', filter: `barberia_id=eq.${barberiaId}` }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [barberiaId, handleIncoming, load]);

  useEffect(() => {
    if (!barberiaId || !settings?.notify_new_appointments) return;
    const checkUpcoming = async () => {
      const now = new Date();
      const target = new Date(now.getTime() + 15 * 60000);
      const date = localIsoDate(target);
      const hhmm = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
      const { data } = await supabase
        .from('citas')
        .select('*')
        .eq('barberia_id', barberiaId)
        .eq('fecha', date)
        .gte('hora_inicio', hhmm)
        .lte('hora_inicio', addMinutes(hhmm, 5))
        .in('estado', ['pendiente', 'confirmada']);
      (data ?? []).forEach((cita) => {
        if (upcomingNotifiedRef.current.has(cita.id)) return;
        upcomingNotifiedRef.current.add(cita.id);
        handleIncoming({
          id: `upcoming-${cita.id}`,
          barberia_id: barberiaId,
          user_id: profile.id,
          tipo: 'cita_proxima',
          titulo: 'Cita próxima en 15 minutos',
          mensaje: `Tienes una cita a las ${cita.hora_inicio.slice(0, 5)}.`,
          leida: false,
          metadata: { cita_id: cita.id },
          created_at: new Date().toISOString(),
        });
      });
    };
    checkUpcoming().catch(console.error);
    const interval = window.setInterval(() => checkUpcoming().catch(console.error), 60000);
    return () => window.clearInterval(interval);
  }, [barberiaId, handleIncoming, profile.id, settings?.notify_new_appointments]);

  const requestDesktopPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted' && settings) {
      const saved = await updateNotificationSettings(settings.id, { desktop_enabled: true });
      setSettings(saved);
    }
  }, [settings]);

  const updateSettings = useCallback(async (payload: Partial<UserNotificationSettingsRow>) => {
    if (!settings) return;
    const saved = await updateNotificationSettings(settings.id, payload);
    setSettings(saved);
  }, [settings]);

  const markRead = useCallback(async (id: string) => {
    if (id.startsWith('upcoming-')) {
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, leida: true } : item)));
      return;
    }
    const updated = await markNotificationRead(id);
    setNotifications((current) => current.map((item) => (item.id === id ? updated : item)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!barberiaId) return;
    await markAllNotificationsRead(barberiaId);
    setNotifications((current) => current.map((item) => ({ ...item, leida: true })));
  }, [barberiaId]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        settings,
        permission,
        toast,
        dismissToast: () => setToast(null),
        requestDesktopPermission,
        updateSettings,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function localIsoDate(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function addMinutes(value: string, minutes: number) {
  const [hour, minute] = value.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
