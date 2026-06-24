import { createContext } from 'react';
import type { NotificationRow, UserNotificationSettingsRow } from '../types/database';

export interface NotificationsContextValue {
  notifications: NotificationRow[];
  unreadCount: number;
  settings: UserNotificationSettingsRow | null;
  permission: NotificationPermission | 'unsupported';
  toast: NotificationRow | null;
  dismissToast: () => void;
  requestDesktopPermission: () => Promise<void>;
  updateSettings: (payload: Partial<UserNotificationSettingsRow>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
