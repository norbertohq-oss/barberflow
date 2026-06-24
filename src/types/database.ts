export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'super_admin' | 'admin' | 'cajero' | 'barbero' | 'cliente';
export type AppointmentStatus = 'pendiente' | 'confirmada' | 'en_proceso' | 'completada' | 'cancelada' | 'no_show';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

type Table<Row, Insert = Row, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      barberias: Table<
        {
          id: string;
          nombre_comercial: string;
          logo_url: string | null;
          slogan: string | null;
          telefono: string | null;
          whatsapp: string | null;
          direccion: string | null;
          estado: 'activa' | 'suspendida' | 'cancelada' | 'prueba';
          slug: string | null;
          reservas_publicas: boolean;
          reserva_estado_default: AppointmentStatus;
          plan_id: string | null;
          fecha_inicio_plan: string | null;
          fecha_fin_plan: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          nombre_comercial: string;
          logo_url?: string | null;
          slogan?: string | null;
          telefono?: string | null;
          whatsapp?: string | null;
          direccion?: string | null;
          estado?: 'activa' | 'suspendida' | 'cancelada' | 'prueba';
          slug?: string | null;
          reservas_publicas?: boolean;
          reserva_estado_default?: AppointmentStatus;
          plan_id?: string | null;
          fecha_inicio_plan?: string | null;
          fecha_fin_plan?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      profiles: Table<
        {
          id: string;
          barberia_id: string | null;
          nombre: string;
          email: string;
          rol: UserRole;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          barberia_id?: string | null;
          nombre: string;
          email: string;
          rol?: UserRole;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      clientes: Table<
        {
          id: string;
          barberia_id: string;
          nombre: string;
          telefono: string | null;
          whatsapp: string | null;
          email: string | null;
          fecha_nacimiento: string | null;
          notas: string | null;
          total_gastado: number;
          puntos_disponibles: number;
          puntos_totales: number;
          nivel_lealtad: string;
          ultima_visita: string | null;
          visitas: number;
          barbero_favorito_id: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          nombre: string;
          telefono?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          fecha_nacimiento?: string | null;
          notas?: string | null;
          total_gastado?: number;
          puntos_disponibles?: number;
          puntos_totales?: number;
          nivel_lealtad?: string;
          ultima_visita?: string | null;
          visitas?: number;
          barbero_favorito_id?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      servicios: Table<
        {
          id: string;
          barberia_id: string;
          nombre: string;
          categoria: string;
          duracion_minutos: number;
          precio: number;
          descripcion: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          nombre: string;
          categoria: string;
          duracion_minutos: number;
          precio: number;
          descripcion?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      productos: Table<
        {
          id: string;
          barberia_id: string;
          nombre: string;
          categoria: string | null;
          precio: number;
          stock: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          nombre: string;
          categoria?: string | null;
          precio: number;
          stock?: number;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      citas: Table<
        {
          id: string;
          barberia_id: string;
          cliente_id: string | null;
          servicio_id: string | null;
          barbero_id: string | null;
          fecha: string;
          hora_inicio: string;
          hora_fin: string | null;
          estado: AppointmentStatus;
          notas: string | null;
          precio_total: number | null;
          created_at: string;
          updated_at: string;
          clientes?: { nombre: string; telefono: string | null } | null;
          servicios?: { nombre: string; duracion_minutos: number; precio: number } | null;
          profiles?: { nombre: string } | null;
        },
        {
          id?: string;
          barberia_id: string;
          cliente_id?: string | null;
          servicio_id?: string | null;
          barbero_id?: string | null;
          fecha: string;
          hora_inicio: string;
          hora_fin?: string | null;
          estado?: AppointmentStatus;
          notas?: string | null;
          precio_total?: number | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      ventas: Table<
        {
          id: string;
          barberia_id: string;
          cliente_id: string | null;
          cajero_id: string | null;
          barbero_id: string | null;
          subtotal: number;
          descuento: number;
          total: number;
          metodo_pago: PaymentMethod;
          estado: string;
          fecha: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          cliente_id?: string | null;
          cajero_id?: string | null;
          barbero_id?: string | null;
          subtotal: number;
          descuento?: number;
          total: number;
          metodo_pago: PaymentMethod;
          estado?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      venta_detalle: Table<
        {
          id: string;
          barberia_id: string;
          venta_id: string;
          servicio_id: string | null;
          producto_id: string | null;
          descripcion: string;
          cantidad: number;
          precio_unitario: number;
          total: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          venta_id: string;
          servicio_id?: string | null;
          producto_id?: string | null;
          descripcion: string;
          cantidad: number;
          precio_unitario: number;
          total: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      planes: Table<
        {
          id: string;
          nombre: string;
          descripcion: string | null;
          precio_mensual: number;
          precio_anual: number;
          limite_usuarios: number | null;
          limite_barberos: number | null;
          limite_citas_mes: number | null;
          incluye_whatsapp: boolean;
          incluye_reportes: boolean;
          incluye_lealtad: boolean;
          incluye_membresias: boolean;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          precio_mensual?: number;
          precio_anual?: number;
          limite_usuarios?: number | null;
          limite_barberos?: number | null;
          limite_citas_mes?: number | null;
          incluye_whatsapp?: boolean;
          incluye_reportes?: boolean;
          incluye_lealtad?: boolean;
          incluye_membresias?: boolean;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      plan_features: Table<
        {
          id: string;
          plan_id: string;
          nombre: string;
          descripcion: string | null;
          incluido: boolean;
          created_at: string;
        },
        {
          id?: string;
          plan_id: string;
          nombre: string;
          descripcion?: string | null;
          incluido?: boolean;
          created_at?: string;
        }
      >;
      pagos: Table<
        {
          id: string;
          barberia_id: string;
          plan_id: string;
          mercado_pago_payment_id: string | null;
          mercado_pago_preference_id: string | null;
          status: string;
          status_detail: string | null;
          amount: number;
          currency: string;
          payer_email: string | null;
          raw_response: Json;
          created_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          plan_id: string;
          mercado_pago_payment_id?: string | null;
          mercado_pago_preference_id?: string | null;
          status: string;
          status_detail?: string | null;
          amount?: number;
          currency?: string;
          payer_email?: string | null;
          raw_response?: Json;
          created_at?: string;
        }
      >;
      horarios_barberia: Table<
        {
          id: string;
          barberia_id: string;
          dia_semana: number;
          abre: boolean;
          hora_apertura: string | null;
          hora_cierre: string | null;
          descanso_inicio: string | null;
          descanso_fin: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          dia_semana: number;
          abre?: boolean;
          hora_apertura?: string | null;
          hora_cierre?: string | null;
          descanso_inicio?: string | null;
          descanso_fin?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      redes_barberia: Table<
        {
          id: string;
          barberia_id: string;
          instagram: string | null;
          facebook: string | null;
          tiktok: string | null;
          sitio_web: string | null;
          google_maps: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          instagram?: string | null;
          facebook?: string | null;
          tiktok?: string | null;
          sitio_web?: string | null;
          google_maps?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      empleados: Table<
        {
          id: string;
          barberia_id: string;
          profile_id: string | null;
          nombre: string;
          telefono: string | null;
          email: string | null;
          rol: string | null;
          especialidad: string | null;
          comision_porcentaje: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          profile_id?: string | null;
          nombre: string;
          telefono?: string | null;
          email?: string | null;
          rol?: string | null;
          especialidad?: string | null;
          comision_porcentaje?: number;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      loyalty_settings: Table<
        {
          id: string;
          barberia_id: string;
          activo: boolean;
          puntos_por_peso: number;
          nombre_programa: string;
          descripcion: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          activo?: boolean;
          puntos_por_peso?: number;
          nombre_programa?: string;
          descripcion?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      loyalty_tiers: Table<
        {
          id: string;
          barberia_id: string;
          nombre: string;
          puntos_min: number;
          puntos_max: number | null;
          beneficios: string | null;
          descuento_porcentaje: number;
          color: string;
          activo: boolean;
          orden: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          nombre: string;
          puntos_min?: number;
          puntos_max?: number | null;
          beneficios?: string | null;
          descuento_porcentaje?: number;
          color?: string;
          activo?: boolean;
          orden?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      loyalty_transactions: Table<
        {
          id: string;
          barberia_id: string;
          cliente_id: string;
          venta_id: string | null;
          tipo: 'ganado' | 'canjeado' | 'ajuste';
          puntos: number;
          descripcion: string | null;
          created_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          cliente_id: string;
          venta_id?: string | null;
          tipo: 'ganado' | 'canjeado' | 'ajuste';
          puntos: number;
          descripcion?: string | null;
          created_at?: string;
        }
      >;
      notifications: Table<
        {
          id: string;
          barberia_id: string;
          user_id: string | null;
          tipo: string;
          titulo: string;
          mensaje: string;
          leida: boolean;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          user_id?: string | null;
          tipo: string;
          titulo: string;
          mensaje: string;
          leida?: boolean;
          metadata?: Json;
          created_at?: string;
        }
      >;
      user_notification_settings: Table<
        {
          id: string;
          user_id: string;
          desktop_enabled: boolean;
          sound_enabled: boolean;
          volume: number;
          notify_new_appointments: boolean;
          notify_cancellations: boolean;
          notify_sales: boolean;
          notify_support: boolean;
          notify_inactive_clients: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          desktop_enabled?: boolean;
          sound_enabled?: boolean;
          volume?: number;
          notify_new_appointments?: boolean;
          notify_cancellations?: boolean;
          notify_sales?: boolean;
          notify_support?: boolean;
          notify_inactive_clients?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      soporte_tickets: Table<
        {
          id: string;
          barberia_id: string;
          user_id: string | null;
          categoria: string;
          asunto: string;
          mensaje: string;
          estado: string;
          prioridad: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          barberia_id: string;
          user_id?: string | null;
          categoria?: string;
          asunto: string;
          mensaje: string;
          estado?: string;
          prioridad?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
  };
}

export type BarberiaRow = Database['public']['Tables']['barberias']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ClienteRow = Database['public']['Tables']['clientes']['Row'];
export type ServicioRow = Database['public']['Tables']['servicios']['Row'];
export type ProductoRow = Database['public']['Tables']['productos']['Row'];
export type CitaRow = Database['public']['Tables']['citas']['Row'];
export type VentaRow = Database['public']['Tables']['ventas']['Row'];
export type VentaDetalleInsert = Database['public']['Tables']['venta_detalle']['Insert'];
export type PlanRow = Database['public']['Tables']['planes']['Row'];
export type PagoRow = Database['public']['Tables']['pagos']['Row'];
export type HorarioBarberiaRow = Database['public']['Tables']['horarios_barberia']['Row'];
export type RedesBarberiaRow = Database['public']['Tables']['redes_barberia']['Row'];
export type EmpleadoRow = Database['public']['Tables']['empleados']['Row'];
export type LoyaltySettingsRow = Database['public']['Tables']['loyalty_settings']['Row'];
export type LoyaltyTierRow = Database['public']['Tables']['loyalty_tiers']['Row'];
export type LoyaltyTransactionRow = Database['public']['Tables']['loyalty_transactions']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type UserNotificationSettingsRow = Database['public']['Tables']['user_notification_settings']['Row'];
export type SoporteTicketRow = Database['public']['Tables']['soporte_tickets']['Row'];
