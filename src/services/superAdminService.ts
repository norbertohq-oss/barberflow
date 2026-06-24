import { supabase } from '../lib/supabaseClient';
import { createBarberia } from './barberiasService';
import { createAuthUser } from './usuariosService';

export async function getSaaSMetrics() {
  const [barberias, profiles, planes] = await Promise.all([
    supabase.from('barberias').select('id, estado, plan_id, planes(nombre, precio_mensual)'),
    supabase.from('profiles').select('id'),
    supabase.from('planes').select('*').eq('activo', true),
  ]);
  for (const response of [barberias, profiles, planes]) {
    if (response.error) throw response.error;
  }
  const list = barberias.data ?? [];
  const revenue = list.reduce((sum, item) => {
    const plan = Array.isArray(item.planes) ? item.planes[0] : item.planes;
    return sum + Number(plan?.precio_mensual ?? 0);
  }, 0);
  const planCounts = new Map<string, number>();
  list.forEach((item) => {
    const plan = Array.isArray(item.planes) ? item.planes[0] : item.planes;
    if (plan?.nombre) planCounts.set(plan.nombre, (planCounts.get(plan.nombre) ?? 0) + 1);
  });
  const topPlan = Array.from(planCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin datos';
  return {
    totalBarberias: list.length,
    activas: list.filter((item) => item.estado === 'activa').length,
    prueba: list.filter((item) => item.estado === 'prueba').length,
    suspendidas: list.filter((item) => item.estado === 'suspendida').length,
    ingresoMensual: revenue,
    planMasVendido: topPlan,
    usuariosTotales: profiles.data?.length ?? 0,
    planesActivos: planes.data?.length ?? 0,
  };
}

export async function createBarberiaWithAdmin(payload: {
  barberia: {
    nombre_comercial: string;
    slogan?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    direccion?: string | null;
    plan_id?: string | null;
    estado?: 'activa' | 'suspendida' | 'cancelada' | 'prueba';
  };
  admin: {
    nombre: string;
    email: string;
    password: string;
  };
}) {
  const barberia = await createBarberia(payload.barberia);
  await createAuthUser({
    email: payload.admin.email,
    password: payload.admin.password,
    nombre: payload.admin.nombre,
    rol: 'admin',
    barberia_id: barberia.id,
  });
  return barberia;
}
