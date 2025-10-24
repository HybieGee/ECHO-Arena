/**
 * Authentication Context
 * Global auth state management
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: { id: string; address: string } | null;
  error: string | null;
  authenticate: () => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
