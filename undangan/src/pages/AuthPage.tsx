import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { login, register, loading, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<Mode>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    let err: string | null;
    if (mode === 'login') {
      err = await login({ email, password });
    } else {
      err = await register({ email, password, name });
    }

    if (err) {
      setError(err);
    } else {
      navigate('/dashboard');
    }
  }

  const input =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-body"
      style={{ background: 'linear-gradient(160deg, #fdf4f5 0%, #fce7f3 40%, #f0fdf4 100%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-800 hover:opacity-70 transition">
            <span className="text-3xl">💌</span>
            <span className="font-semibold text-lg">Undangan Digital</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          {/* Mode tabs */}
          <div className="flex rounded-2xl overflow-hidden border border-gray-200 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2.5 text-sm font-medium transition"
                style={{
                  background: mode === m ? '#7c3aed' : 'transparent',
                  color: mode === m ? '#fff' : '#6b7280',
                }}
              >
                {m === 'login' ? '🔑 Masuk' : '✨ Daftar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="auth-name">
                  Nama Lengkap
                </label>
                <input
                  id="auth-name"
                  type="text"
                  className={input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nama kamu"
                  autoComplete="name"
                  maxLength={80}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className={input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="demo@example.invalid"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className={input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? '⏳ Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>
          {/* Demo disclaimer */}
          <p className="text-center text-xs text-gray-400 mt-4">
            ⚠️ Demo: akun disimpan di browser Anda (localStorage). Bukan server sungguhan.
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-gray-500 hover:underline">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
