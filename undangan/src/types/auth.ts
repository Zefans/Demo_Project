// ─── Auth Types ───────────────────────────────────────────────────────────────
// This service layer abstracts auth operations.
// Swap implementations in authService.ts to use Supabase when credentials are ready.

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium' | 'business';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

