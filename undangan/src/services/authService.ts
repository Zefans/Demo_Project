// ─── Auth Service (localStorage demo) ────────────────────────────────────────
// NOTE: This is a CLIENT-SIDE demo only.
// Passwords are NOT stored securely — this is for UI/UX prototyping only.
// To connect real auth: replace these functions with Supabase Auth calls.
// e.g. supabase.auth.signUp(), supabase.auth.signInWithPassword(), etc.
//
// NEVER put Supabase service-role keys in this file.
// Only use the public anon key from environment variables.

import type { User, LoginCredentials, RegisterCredentials } from '../types/auth';

const USERS_KEY = 'undangan_users';
const SESSION_KEY = 'undangan_session';

type StoredUser = User & { passwordHash: string };

// Very simple hash for demo — NOT cryptographically secure
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function loadUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, StoredUser>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Validate session user still exists
    const users = loadUsers();
    if (!users[session.id]) return null;
    return session as User;
  } catch {
    return null;
  }
}

export async function register(creds: RegisterCredentials): Promise<{ user: User | null; error: string | null }> {
  // Simulate async network call
  await new Promise(r => setTimeout(r, 400));

  const email = creds.email.trim().toLowerCase();
  if (!email.includes('@')) return { user: null, error: 'Email tidak valid.' };
  if (creds.password.length < 6) return { user: null, error: 'Password minimal 6 karakter.' };
  if (!creds.name.trim()) return { user: null, error: 'Nama wajib diisi.' };

  const users = loadUsers();
  const existing = Object.values(users).find(u => u.email === email);
  if (existing) return { user: null, error: 'Email sudah terdaftar.' };

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    email,
    name: creds.name.trim(),
    plan: 'free',
    createdAt: new Date().toISOString(),
    passwordHash: simpleHash(creds.password),
  };

  users[newUser.id] = newUser;
  saveUsers(users);

  const { passwordHash: _, ...user } = newUser;
  void _;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { user, error: null };
}

export async function login(creds: LoginCredentials): Promise<{ user: User | null; error: string | null }> {
  await new Promise(r => setTimeout(r, 400));

  const email = creds.email.trim().toLowerCase();
  const users = loadUsers();
  const stored = Object.values(users).find(u => u.email === email);

  if (!stored || stored.passwordHash !== simpleHash(creds.password)) {
    return { user: null, error: 'Email atau password salah.' };
  }

  const { passwordHash: _, ...user } = stored;
  void _;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { user, error: null };
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

// Demo accounts are not seeded.
export function seedDemoAccount(): void {
  // Register an account through the app instead.
}
