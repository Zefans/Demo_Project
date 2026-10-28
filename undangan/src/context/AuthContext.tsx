import React from 'react';
import type { User, AuthState } from '../types/auth';
import { loadSession, login, logout, register, seedDemoAccount } from '../services/authService';
import type { LoginCredentials, RegisterCredentials } from '../types/auth';

interface AuthContextValue extends AuthState {
  login: (creds: LoginCredentials) => Promise<string | null>;
  register: (creds: RegisterCredentials) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(() => ({
    user: loadSession(),
    loading: false,
    error: null,
  }));

  React.useEffect(() => {
    seedDemoAccount();
  }, []);

  async function handleLogin(creds: LoginCredentials): Promise<string | null> {
    setState(s => ({ ...s, loading: true, error: null }));
    const result = await login(creds);
    setState(s => ({ ...s, loading: false, user: result.user, error: result.error }));
    return result.error;
  }

  async function handleRegister(creds: RegisterCredentials): Promise<string | null> {
    setState(s => ({ ...s, loading: true, error: null }));
    const result = await register(creds);
    setState(s => ({ ...s, loading: false, user: result.user, error: result.error }));
    return result.error;
  }

  function handleLogout() {
    logout();
    setState({ user: null, loading: false, error: null });
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// Type export for consumers that need just the User type
export type { User };

