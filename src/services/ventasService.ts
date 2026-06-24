import { supabase } from '../lib/supabaseClient';
import type { Database, PaymentMethod, VentaDetalleInsert } from '../types/database';
import { applyLoyaltyForSale } from './loyaltyService';

type VentaInsert = Database['public']['Tables']['ventas']['Insert'];

export interface CartSaleItem {
  servicio_id?: string | null;
  producto_id?: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export async function createVentaConDetalle(payload: {
  barberia_id: string;
  cliente_id?: string | null;
  cajero_id: string;
  barbero_id?: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: PaymentMethod;
  items: CartSaleItem[];
}) {
  const ventaPayload: VentaInsert = {
    barberia_id: payload.barberia_id,
    cliente_id: payload.cliente_id ?? null,
    cajero_id: payload.cajero_id,
    barbero_id: payload.barbero_id ?? null,
    subtotal: payload.subtotal,
    descuento: payload.descuento,
    total: payload.total,
    metodo_pago: payload.metodo_pago,
  };

  const { data: venta, error: ventaError } = await supabase.from('ventas').insert(ventaPayload).select('*').single();
  if (ventaError) throw ventaError;

  const detalle: VentaDetalleInsert[] = payload.items.map((item) => ({
    barberia_id: payload.barberia_id,
    venta_id: venta.id,
    servicio_id: item.servicio_id ?? null,
    producto_id: item.producto_id ?? null,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    total: item.cantidad * item.precio_unitario,
  }));

  const { error: detalleError } = await supabase.from('venta_detalle').insert(detalle);
  if (detalleError) throw detalleError;

  for (const item of payload.items.filter((saleItem) => saleItem.producto_id)) {
    const { error: stockError } = await supabase.rpc('decrement_product_stock', {
      p_barberia_id: payload.barberia_id,
      p_producto_id: item.producto_id,
      p_quantity: item.cantidad,
    });
    if (stockError) throw stockError;
  }

  if (payload.cliente_id) {
    try {
      await applyLoyaltyForSale({
        barberiaId: payload.barberia_id,
        clienteId: payload.cliente_id,
        ventaId: venta.id,
        total: payload.total,
      });
    } catch (loyaltyError) {
      console.warn('No se pudo aplicar lealtad. Ejecuta supabase/fase3_loyalty.sql.', loyaltyError);
    }
  }

  return venta;
}

export async function getDashboardMetrics(barberiaId: string, today: string) {
  const start = `${today}T00:00:00`;
  const end = `${today}T23:59:59`;

  const [citas, ventas, serviciosVendidos, barberos, clientes, servicios] = await Promise.all([
    supabase.from('citas').select('*').eq('barberia_id', barberiaId).eq('fecha', today).order('hora_inicio'),
    supabase.from('ventas').select('*').eq('barberia_id', barberiaId).gte('created_at', start).lte('created_at', end),
    supabase.from('venta_detalle').select('descripcion, cantidad, servicio_id').eq('barberia_id', barberiaId).not('servicio_id', 'is', null),
    supabase.from('profiles').select('*').eq('barberia_id', barberiaId).eq('rol', 'barbero').eq('activo', true),
    supabase.from('clientes').select('id, nombre').eq('barberia_id', barberiaId),
    supabase.from('servicios').select('id, nombre, precio').eq('barberia_id', barberiaId),
  ]);

  for (const response of [citas, ventas, serviciosVendidos, barberos, clientes, servicios]) {
    if (response.error) throw response.error;
  }

  return {
    citas: citas.data ?? [],
    ventas: ventas.data ?? [],
    serviciosVendidos: serviciosVendidos.data ?? [],
    barberos: barberos.data ?? [],
    clientes: clientes.data ?? [],
    servicios: servicios.data ?? [],
  };
}
