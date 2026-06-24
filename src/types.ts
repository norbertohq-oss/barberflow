import type { LucideIcon } from 'lucide-react';

export type Role = 'super_admin' | 'admin' | 'cajero' | 'barbero' | 'cliente';
export type View =
  | 'super_admin_dashboard'
  | 'super_admin_barberias'
  | 'super_admin_planes'
  | 'super_admin_usuarios'
  | 'super_admin_config'
  | 'dashboard'
  | 'agenda'
  | 'pos'
  | 'clientes'
  | 'servicios'
  | 'productos'
  | 'lealtad'
  | 'configuracion'
  | 'usuarios'
  | 'planes'
  | 'soporte';

export type AppointmentStatus = 'pendiente' | 'confirmada' | 'en_proceso' | 'completada' | 'cancelada' | 'no_show';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type TicketStatus = 'abierto' | 'en_revision' | 'resuelto';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  barberiaId: string | null;
}

export interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface Barberia {
  id: string;
  name: string;
  slogan: string;
  phone: string;
  address: string;
  accentColor: string;
}

export interface Appointment {
  id: string;
  barberiaId: string;
  time: string;
  client: string;
  service: string;
  barber: string;
  duration: number;
  price: number;
  status: AppointmentStatus;
  color: 'gold' | 'blue' | 'pink' | 'green';
}

export interface Client {
  id: string;
  barberiaId: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  favoriteService: string;
  notes: string;
  visits: number;
  totalSpent: number;
}

export interface Service {
  id: string;
  barberiaId: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
  active: boolean;
}

export interface Product {
  id: string;
  barberiaId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface SupportTicket {
  id: string;
  barberiaId: string;
  subject: string;
  priority: 'baja' | 'media' | 'alta';
  status: TicketStatus;
  createdAt: string;
}
