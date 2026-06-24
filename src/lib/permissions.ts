import type { Role, View } from '../types';

export const roleHome: Record<Role, View> = {
  super_admin: 'super_admin_dashboard',
  admin: 'dashboard',
  cajero: 'pos',
  barbero: 'agenda',
  cliente: 'soporte',
};

export const canAccess = (role: Role, allowedRoles: Role[]) => allowedRoles.includes(role);
