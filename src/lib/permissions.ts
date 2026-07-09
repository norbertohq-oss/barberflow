import type { PlanFeature, PlanFeatureAccess, Role, View } from '../types';

export const roleHome: Record<Role, View> = {
  super_admin: 'super_admin_dashboard',
  admin: 'dashboard',
  cajero: 'pos',
  barbero: 'agenda',
  cliente: 'soporte',
};

export const canAccess = (role: Role, allowedRoles: Role[]) => allowedRoles.includes(role);

export const viewPlanFeatures: Partial<Record<View, PlanFeature>> = {
  lealtad: 'incluye_lealtad',
};

export function isViewEnabledForPlan(view: View, planFeatures?: PlanFeatureAccess | null) {
  const requiredFeature = viewPlanFeatures[view];
  if (!requiredFeature) return true;
  return Boolean(planFeatures?.[requiredFeature]);
}
