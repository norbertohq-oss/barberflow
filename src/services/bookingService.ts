import { supabase } from '../lib/supabaseClient';
import type { BarberiaRow, CitaRow, ClienteRow, HorarioBarberiaRow, ProfileRow, ServicioRow } from '../types/database';

export interface PublicBookingData {
  barberia: BarberiaRow;
  servicios: ServicioRow[];
  barberos: ProfileRow[];
  horarios: HorarioBarberiaRow[];
}

export async function getPublicBookingData(slug: string): Promise<PublicBookingData> {
  const { data: barberia, error: barberiaError } = await supabase
    .from('barberias')
    .select('*')
    .eq('slug', slug)
    .eq('reservas_publicas', true)
    .in('estado', ['activa', 'prueba'])
    .single();
  if (barberiaError) throw barberiaError;

  const [servicios, barberos, horarios] = await Promise.all([
    supabase.from('servicios').select('*').eq('barberia_id', barberia.id).eq('activo', true).order('nombre'),
    supabase.from('profiles').select('*').eq('barberia_id', barberia.id).eq('rol', 'barbero').eq('activo', true).order('nombre'),
    supabase.from('horarios_barberia').select('*').eq('barberia_id', barberia.id).order('dia_semana'),
  ]);

  for (const response of [servicios, barberos, horarios]) {
    if (response.error) throw response.error;
  }

  return {
    barberia,
    servicios: servicios.data ?? [],
    barberos: barberos.data ?? [],
    horarios: horarios.data ?? [],
  };
}

export async function listBookedSlots(barberiaId: string, fecha: string, barberoId?: string | null) {
  let query = supabase
    .from('citas')
    .select('*')
    .eq('barberia_id', barberiaId)
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');
  if (barberoId) query = query.eq('barbero_id', barberoId);
  const { data, error } = await query;
  if (error) throw error;
  return data.filter((cita) => cita.estado !== 'no_show');
}

export function buildAvailableSlots(params: {
  fecha: string;
  serviceDuration: number;
  horarios: HorarioBarberiaRow[];
  bookedSlots: CitaRow[];
}) {
  const date = new Date(`${params.fecha}T12:00:00`);
  const day = date.getDay();
  const schedule = params.horarios.find((item) => item.dia_semana === day) ?? getDefaultSchedule(day);
  if (!schedule?.abre || !schedule.hora_apertura || !schedule.hora_cierre) return [];

  const open = toMinutes(schedule.hora_apertura);
  const close = toMinutes(schedule.hora_cierre);
  const breakStart = schedule.descanso_inicio ? toMinutes(schedule.descanso_inicio) : null;
  const breakEnd = schedule.descanso_fin ? toMinutes(schedule.descanso_fin) : null;
  const slots: string[] = [];

  for (let current = open; current + params.serviceDuration <= close; current += 30) {
    const end = current + params.serviceDuration;
    const overlapsBreak = breakStart !== null && breakEnd !== null && current < breakEnd && end > breakStart;
    const overlapsAppointment = params.bookedSlots.some((slot) => {
      const slotStart = toMinutes(slot.hora_inicio);
      const slotEnd = slot.hora_fin ? toMinutes(slot.hora_fin) : slotStart + params.serviceDuration;
      return current < slotEnd && end > slotStart;
    });
    if (!overlapsBreak && !overlapsAppointment) slots.push(fromMinutes(current));
  }

  return slots;
}

function getDefaultSchedule(day: number): HorarioBarberiaRow {
  return {
    id: `default-${day}`,
    barberia_id: '',
    dia_semana: day,
    abre: day !== 0,
    hora_apertura: day === 0 ? null : '09:00',
    hora_cierre: day === 0 ? null : '18:00',
    descanso_inicio: null,
    descanso_fin: null,
    created_at: '',
    updated_at: '',
  };
}

export async function createPublicBooking(payload: {
  barberia: BarberiaRow;
  servicio: ServicioRow;
  barberoId: string | null;
  fecha: string;
  horaInicio: string;
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
  };
}) {
  const phone = payload.cliente.telefono.trim();
  const existing = await findClienteByPhone(payload.barberia.id, phone);
  const cliente = existing
    ? await updatePublicCliente(existing.id, {
      nombre: payload.cliente.nombre.trim(),
      telefono: phone,
      whatsapp: phone,
      email: payload.cliente.email?.trim() || existing.email,
    })
    : await insertPublicCliente({
      barberia_id: payload.barberia.id,
      nombre: payload.cliente.nombre.trim(),
      telefono: phone,
      whatsapp: phone,
      email: payload.cliente.email?.trim() || null,
    });

  const startMinutes = toMinutes(payload.horaInicio);
  const end = fromMinutes(startMinutes + payload.servicio.duracion_minutos);
  const { data: cita, error } = await supabase
    .from('citas')
    .insert({
      barberia_id: payload.barberia.id,
      cliente_id: cliente.id,
      servicio_id: payload.servicio.id,
      barbero_id: payload.barberoId,
      fecha: payload.fecha,
      hora_inicio: payload.horaInicio,
      hora_fin: end,
      estado: payload.barberia.reserva_estado_default ?? 'pendiente',
      precio_total: Number(payload.servicio.precio),
      notas: 'Reserva creada desde portal publico. TODO: integrar confirmacion WhatsApp Business API.',
    })
    .select('*')
    .single();
  if (error) throw error;
  return { cliente, cita };
}

async function findClienteByPhone(barberiaId: string, phone: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('barberia_id', barberiaId)
    .or(`telefono.eq.${phone},whatsapp.eq.${phone}`)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function insertPublicCliente(payload: {
  barberia_id: string;
  nombre: string;
  telefono: string;
  whatsapp: string;
  email: string | null;
}) {
  const { data, error } = await supabase.from('clientes').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function updatePublicCliente(id: string, payload: Partial<ClienteRow>) {
  const { data, error } = await supabase.from('clientes').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

function toMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function fromMinutes(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
