import { supabase } from '../lib/supabaseClient';
import type { CitaRow, ClienteRow, Database, LoyaltyTransactionRow, ProductoRow, ProfileRow, ServicioRow, VentaRow } from '../types/database';

type ClienteInsert = Database['public']['Tables']['clientes']['Insert'];
type ClienteUpdate = Database['public']['Tables']['clientes']['Update'];

export async function listClientes(barberiaId: string, search = '') {
  let query = supabase.from('clientes').select('*').eq('barberia_id', barberiaId).eq('activo', true).order('created_at', { ascending: false });
  if (search.trim()) {
    const value = `%${search.trim()}%`;
    query = query.or(`nombre.ilike.${value},telefono.ilike.${value}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCliente(payload: ClienteInsert) {
  const { data, error } = await supabase.from('clientes').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, payload: ClienteUpdate) {
  const { data, error } = await supabase.from('clientes').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deactivateCliente(id: string) {
  return updateCliente(id, { activo: false });
}

export async function getCliente(id: string): Promise<ClienteRow> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

type VentaDetalleRow = Database['public']['Tables']['venta_detalle']['Row'];

export interface ClienteProfileData {
  cliente: ClienteRow;
  ventas: VentaRow[];
  ventaDetalles: VentaDetalleRow[];
  citas: CitaRow[];
  servicios: ServicioRow[];
  productos: ProductoRow[];
  barberos: ProfileRow[];
  loyaltyTransactions: LoyaltyTransactionRow[];
  metrics: {
    totalGastado: number;
    puntosDisponibles: number;
    puntosTotales: number;
    nivelLealtad: string;
    visitas: number;
    ultimaVisita: string | null;
    ticketPromedio: number;
    servicioMasFrecuente: string;
    barberoFavorito: string;
  };
}

export async function getClienteProfile(barberiaId: string, clienteId: string): Promise<ClienteProfileData> {
  const [clienteRes, ventasRes, citasRes, serviciosRes, productosRes, barberosRes, loyaltyRes] = await Promise.all([
    supabase.from('clientes').select('*').eq('barberia_id', barberiaId).eq('id', clienteId).single(),
    supabase.from('ventas').select('*').eq('barberia_id', barberiaId).eq('cliente_id', clienteId).order('created_at', { ascending: false }),
    supabase.from('citas').select('*').eq('barberia_id', barberiaId).eq('cliente_id', clienteId).order('fecha', { ascending: false }).order('hora_inicio', { ascending: false }),
    supabase.from('servicios').select('*').eq('barberia_id', barberiaId),
    supabase.from('productos').select('*').eq('barberia_id', barberiaId),
    supabase.from('profiles').select('*').eq('barberia_id', barberiaId).eq('rol', 'barbero'),
    supabase.from('loyalty_transactions').select('*').eq('barberia_id', barberiaId).eq('cliente_id', clienteId).order('created_at', { ascending: false }),
  ]);

  for (const response of [clienteRes, ventasRes, citasRes, serviciosRes, productosRes, barberosRes]) {
    if (response.error) throw response.error;
  }

  const ventas = ventasRes.data ?? [];
  const ventaIds = ventas.map((venta) => venta.id);
  const detallesRes = ventaIds.length > 0
    ? await supabase.from('venta_detalle').select('*').eq('barberia_id', barberiaId).in('venta_id', ventaIds).order('created_at', { ascending: false })
    : { data: [], error: null };
  if (detallesRes.error) throw detallesRes.error;

  const cliente = clienteRes.data;
  const citas = citasRes.data ?? [];
  const servicios = serviciosRes.data ?? [];
  const productos = productosRes.data ?? [];
  const barberos = barberosRes.data ?? [];
  const ventaDetalles = detallesRes.data ?? [];
  const completedCitas = citas.filter((cita) => cita.estado === 'completada');
  const totalGastado = ventas.reduce((sum, venta) => sum + Number(venta.total), 0);
  const visitas = Math.max(cliente.visitas ?? 0, completedCitas.length, ventas.length);
  const ultimaVisita = cliente.ultima_visita ?? completedCitas[0]?.fecha ?? ventas[0]?.created_at?.slice(0, 10) ?? null;
  const ticketPromedio = ventas.length > 0 ? totalGastado / ventas.length : 0;
  const servicioMasFrecuente = getMostFrequentName(
    [
      ...citas.map((cita) => cita.servicio_id),
      ...ventaDetalles.map((detalle) => detalle.servicio_id),
    ],
    servicios.map((servicio) => [servicio.id, servicio.nombre]),
  );
  const barberoFavorito = getMostFrequentName(
    citas.map((cita) => cita.barbero_id),
    barberos.map((barbero) => [barbero.id, barbero.nombre]),
  );

  return {
    cliente,
    ventas,
    ventaDetalles,
    citas,
    servicios,
    productos,
    barberos,
    loyaltyTransactions: loyaltyRes.error ? [] : loyaltyRes.data ?? [],
    metrics: {
      totalGastado: Math.max(Number(cliente.total_gastado ?? 0), totalGastado),
      puntosDisponibles: Number(cliente.puntos_disponibles ?? 0),
      puntosTotales: Number(cliente.puntos_totales ?? 0),
      nivelLealtad: cliente.nivel_lealtad ?? 'Sin nivel',
      visitas,
      ultimaVisita,
      ticketPromedio,
      servicioMasFrecuente,
      barberoFavorito,
    },
  };
}

function getMostFrequentName(ids: Array<string | null | undefined>, names: Array<[string, string]>) {
  const totals = new Map<string, number>();
  ids.filter(Boolean).forEach((id) => totals.set(id as string, (totals.get(id as string) ?? 0) + 1));
  const [topId] = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  return names.find(([id]) => id === topId)?.[1] ?? 'Sin datos';
}
