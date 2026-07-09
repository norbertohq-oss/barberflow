import { useCallback, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { PlanFeatureAccess, View } from './types';
import { isViewEnabledForPlan, roleHome } from './lib/permissions';
import { getAuthState, signOut, type AuthState } from './services/authService';
import { getPlanById } from './services/planesService';
import { AuthContext } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Agenda } from './pages/Agenda';
import { Clientes } from './pages/Clientes';
import { POS } from './pages/POS';
import { Servicios } from './pages/Servicios';
import { Productos } from './pages/Productos';
import { Lealtad } from './pages/Lealtad';
import { Configuracion } from './pages/Configuracion';
import { UsuariosRoles } from './pages/UsuariosRoles';
import { Planes } from './pages/Planes';
import { Soporte } from './pages/Soporte';
import { PublicBooking } from './pages/PublicBooking';
import { PaymentResult } from './pages/PaymentResult';
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';
import { SuperAdminBarberias } from './pages/super-admin/SuperAdminBarberias';
import { SuperAdminPlanes } from './pages/super-admin/SuperAdminPlanes';
import { SuperAdminUsuarios } from './pages/super-admin/SuperAdminUsuarios';
import { SuperAdminConfig } from './pages/super-admin/SuperAdminConfig';

const pageMap: Record<View, ComponentType> = {
  super_admin_dashboard: SuperAdminDashboard,
  super_admin_barberias: SuperAdminBarberias,
  super_admin_planes: SuperAdminPlanes,
  super_admin_usuarios: SuperAdminUsuarios,
  super_admin_config: SuperAdminConfig,
  dashboard: Dashboard,
  agenda: Agenda,
  pos: POS,
  clientes: Clientes,
  servicios: Servicios,
  productos: Productos,
  lealtad: Lealtad,
  configuracion: Configuracion,
  usuarios: UsuariosRoles,
  planes: Planes,
  soporte: Soporte,
};

export default function App() {
  const publicBookingMatch = window.location.pathname.match(/^\/reservar\/([^/]+)/);
  const paymentMatch = window.location.pathname.match(/^\/payment\/(success|failure|pending)$/);
  const superAdminConfigMatch = window.location.pathname === '/super-admin/configuracion';
  const registerMatch = window.location.pathname === '/registro';
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [showRegister, setShowRegister] = useState(registerMatch);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const refreshAuth = useCallback(async () => {
    const state = await getAuthState();
    setAuth(state);
    if (state) setActiveView(roleHome[state.profile.rol]);
  }, []);

  useEffect(() => {
    refreshAuth()
      .catch((error) => setAuthError(error instanceof Error ? error.message : 'No se pudo restaurar la sesion.'))
      .finally(() => setLoading(false));
  }, [refreshAuth]);

  useEffect(() => {
    if (auth && window.location.pathname === '/planes') {
      setActiveView('planes');
    }
    if (auth && superAdminConfigMatch) {
      setActiveView(auth.profile.rol === 'super_admin' ? 'super_admin_config' : roleHome[auth.profile.rol]);
      if (auth.profile.rol !== 'super_admin') window.history.replaceState(null, '', '/');
    }
  }, [auth, superAdminConfigMatch]);

  useEffect(() => {
    let ignore = false;

    async function loadPlanFeatures() {
      if (!auth?.barberia?.plan_id || auth.profile.rol === 'super_admin') {
        setPlanFeatures(null);
        return;
      }

      const plan = await getPlanById(auth.barberia.plan_id);
      if (ignore) return;

      setPlanFeatures(
        plan
          ? {
              incluye_whatsapp: Boolean(plan.incluye_whatsapp),
              incluye_reportes: Boolean(plan.incluye_reportes),
              incluye_lealtad: Boolean(plan.incluye_lealtad),
              incluye_membresias: Boolean(plan.incluye_membresias),
            }
          : null,
      );
    }

    loadPlanFeatures().catch(() => {
      if (!ignore) setPlanFeatures(null);
    });

    return () => {
      ignore = true;
    };
  }, [auth?.barberia?.plan_id, auth?.profile.rol]);

  if (publicBookingMatch) {
    return <PublicBooking slug={decodeURIComponent(publicBookingMatch[1])} />;
  }

  if (paymentMatch) {
    return <PaymentResult state={paymentMatch[1] as 'success' | 'failure' | 'pending'} />;
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-obsidian-950 text-zinc-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
          <p>Cargando BarberFlow...</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    if (showRegister) {
      return (
        <Register
          onBack={() => {
            window.history.pushState(null, '', '/');
            setShowRegister(false);
          }}
          onRegistered={(state) => {
            window.history.pushState(null, '', '/');
            setShowRegister(false);
            setAuth(state);
          }}
        />
      );
    }
    return (
      <Login
        initialError={authError}
        onLogin={(state) => setAuth(state)}
        onShowRegister={() => {
          window.history.pushState(null, '', '/registro');
          setShowRegister(true);
        }}
      />
    );
  }

  const billingLocked = isBillingLocked(auth);
  const planLockedView = auth.profile.rol !== 'super_admin' && !isViewEnabledForPlan(activeView, planFeatures);
  const effectiveView = billingLocked && auth.profile.rol === 'admin' ? 'planes' : planLockedView ? roleHome[auth.profile.rol] : activeView;
  const ActivePage = pageMap[effectiveView];
  const user = {
    id: auth.profile.id,
    name: auth.profile.nombre,
    email: auth.profile.email,
    role: auth.profile.rol,
    barberiaId: auth.profile.barberia_id,
  };

  return (
    <AuthContext.Provider value={{ ...auth, refreshAuth }}>
      <NotificationsProvider>
        <AppShell
          activeView={effectiveView}
          onNavigate={(view) => {
            if (billingLocked && auth.profile.rol === 'admin' && !['planes', 'soporte'].includes(view)) {
              view = 'planes';
            }
            if (auth.profile.rol !== 'super_admin' && !isViewEnabledForPlan(view, planFeatures)) {
              view = roleHome[auth.profile.rol];
            }
            const path = view === 'planes' ? '/planes' : view === 'super_admin_config' ? '/super-admin/configuracion' : '/';
            window.history.pushState(null, '', path);
            setActiveView(view);
          }}
          user={user}
          barberiaName={auth.barberia?.nombre_comercial ?? 'BarberFlow SaaS'}
          barberiaLogoUrl={auth.barberia?.logo_url ?? null}
          billingLocked={billingLocked && auth.profile.rol === 'admin'}
          planFeatures={auth.profile.rol === 'super_admin' ? null : planFeatures}
          onLogout={async () => {
            await signOut();
            setAuth(null);
          }}
        >
          <ActivePage />
        </AppShell>
      </NotificationsProvider>
    </AuthContext.Provider>
  );
}

function isBillingLocked(auth: AuthState) {
  if (auth.profile.rol === 'super_admin' || !auth.barberia) return false;
  if (auth.barberia.estado === 'suspendida' || auth.barberia.estado === 'cancelada') return true;
  if (auth.barberia.estado !== 'prueba') return false;
  if (!auth.barberia.fecha_fin_plan) return false;
  const trialEnd = new Date(`${auth.barberia.fecha_fin_plan}T23:59:59`);
  return trialEnd.getTime() < Date.now();
}
