import type { Appointment, Barberia, Client, Plan, Product, Service, SupportTicket, UserSession } from '../types';

export const barberia: Barberia = {
  id: 'bbr_001',
  name: 'BarberFlow Studio',
  slogan: 'La excelencia en cada corte.',
  phone: '+52 664 123 4567',
  address: 'Av. Revolucion 1201, Zona Centro, Tijuana',
  accentColor: '#d7b64f',
};

export const users: Record<string, UserSession> = {
  admin: {
    id: 'usr_admin',
    name: 'Administrador',
    email: 'admin@barberflow.mx',
    role: 'admin',
    barberiaId: barberia.id,
  },
  cajero: {
    id: 'usr_cashier',
    name: 'Cajero',
    email: 'cajero@barberflow.mx',
    role: 'cajero',
    barberiaId: barberia.id,
  },
  barbero: {
    id: 'usr_barber',
    name: 'Carlos Vargas',
    email: 'barbero@barberflow.mx',
    role: 'barbero',
    barberiaId: barberia.id,
  },
  cliente: {
    id: 'usr_client',
    name: 'Cliente Invitado',
    email: 'cliente@barberflow.mx',
    role: 'cliente',
    barberiaId: barberia.id,
  },
};

export const appointments: Appointment[] = [
  { id: 'apt_1', barberiaId: barberia.id, time: '09:00', client: 'Alejandro Ramirez', service: 'Fade & Blend', barber: 'Carlos', duration: 45, price: 320, status: 'confirmada', color: 'gold' },
  { id: 'apt_2', barberiaId: barberia.id, time: '10:00', client: 'Carlos Mendoza', service: 'Ritual Completo', barber: 'Miguel', duration: 90, price: 680, status: 'pendiente', color: 'blue' },
  { id: 'apt_3', barberiaId: barberia.id, time: '11:00', client: 'Fernando Soto', service: 'Corte Clasico', barber: 'Andres', duration: 30, price: 250, status: 'cancelada', color: 'pink' },
  { id: 'apt_4', barberiaId: barberia.id, time: '12:30', client: 'Luis Garcia', service: 'Corte con Barba', barber: 'Carlos', duration: 60, price: 420, status: 'completada', color: 'gold' },
  { id: 'apt_5', barberiaId: barberia.id, time: '13:00', client: 'Roberto Vega', service: 'Barba Completa', barber: 'Miguel', duration: 30, price: 180, status: 'confirmada', color: 'blue' },
];

export const clients: Client[] = [
  { id: 'cli_1', barberiaId: barberia.id, name: 'Alejandro Ramirez', phone: '+52 664 123 4567', email: 'alejandro@mail.com', lastVisit: '15 jun 2026', favoriteService: 'Fade & Blend', notes: 'Prefiere perfilado bajo y cafe americano.', visits: 24, totalSpent: 7200 },
  { id: 'cli_2', barberiaId: barberia.id, name: 'Carlos Mendoza', phone: '+52 664 987 6543', email: 'carlos@mail.com', lastVisit: '18 jun 2026', favoriteService: 'Ritual Completo', notes: 'Compra pomada mate cada dos visitas.', visits: 41, totalSpent: 12300 },
  { id: 'cli_3', barberiaId: barberia.id, name: 'Fernando Soto', phone: '+52 664 555 4444', email: 'fernando@mail.com', lastVisit: '10 jun 2026', favoriteService: 'Corte Clasico', notes: 'Agendar preferentemente por la tarde.', visits: 8, totalSpent: 2400 },
  { id: 'cli_4', barberiaId: barberia.id, name: 'Luis Garcia', phone: '+52 664 333 2222', email: 'luis@mail.com', lastVisit: '5 jun 2026', favoriteService: 'Corte con Barba', notes: 'Cliente frecuente de Carlos.', visits: 3, totalSpent: 900 },
  { id: 'cli_5', barberiaId: barberia.id, name: 'Miguel Angel Torres', phone: '+52 664 222 1111', email: 'miguel@mail.com', lastVisit: '19 jun 2026', favoriteService: 'Diseno de Cejas', notes: 'Sensible a productos con fragancia.', visits: 33, totalSpent: 9900 },
];

export const services: Service[] = [
  { id: 'srv_1', barberiaId: barberia.id, name: 'Corte Clasico', category: 'Cabello', duration: 30, price: 250, description: 'Corte tradicional con acabado premium.', active: true },
  { id: 'srv_2', barberiaId: barberia.id, name: 'Fade & Blend', category: 'Cabello', duration: 45, price: 320, description: 'Degradado moderno con detalle de navaja.', active: true },
  { id: 'srv_3', barberiaId: barberia.id, name: 'Corte con Barba', category: 'Combo', duration: 60, price: 420, description: 'Corte, barba y perfilado completo.', active: true },
  { id: 'srv_4', barberiaId: barberia.id, name: 'Barba Completa', category: 'Barba', duration: 30, price: 180, description: 'Alineado, toalla caliente y aceite.', active: true },
  { id: 'srv_5', barberiaId: barberia.id, name: 'Ritual Completo', category: 'Premium', duration: 90, price: 680, description: 'Experiencia completa con tratamiento capilar.', active: true },
];

export const products: Product[] = [
  { id: 'prd_1', barberiaId: barberia.id, name: 'Pomada Mate', category: 'Styling', price: 220, stock: 18 },
  { id: 'prd_2', barberiaId: barberia.id, name: 'Aceite para Barba', category: 'Barba', price: 260, stock: 11 },
  { id: 'prd_3', barberiaId: barberia.id, name: 'Shampoo Premium', category: 'Cuidado', price: 190, stock: 25 },
];

export const plans: Plan[] = [
  { id: 'plan_start', name: 'Start', price: 599, description: 'Para barberias pequenas que empiezan a digitalizarse.', features: ['1 sucursal', '3 usuarios', 'Agenda y clientes', 'POS basico'] },
  { id: 'plan_pro', name: 'Pro', price: 1199, description: 'Operaciones completas para equipos en crecimiento.', features: ['2 sucursales', '10 usuarios', 'Reportes', 'Soporte prioritario'], highlighted: true },
  { id: 'plan_scale', name: 'Scale', price: 2499, description: 'Multi-sucursal con administracion avanzada.', features: ['Sucursales ilimitadas', 'Usuarios ilimitados', 'API preparada', 'Onboarding dedicado'] },
];

export const supportTickets: SupportTicket[] = [
  { id: 'tck_1024', barberiaId: barberia.id, subject: 'No puedo cerrar caja del sabado', priority: 'alta', status: 'en_revision', createdAt: '23 jun 2026' },
  { id: 'tck_1025', barberiaId: barberia.id, subject: 'Solicitar ayuda para cargar logo', priority: 'media', status: 'abierto', createdAt: '22 jun 2026' },
];
