import { createContext, useContext } from 'react';
import type { AuthState } from '../services/authService';

interface AuthContextValue extends AuthState {
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthContext.Provider');
  return context;
}
