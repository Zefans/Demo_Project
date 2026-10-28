import { Link } from 'react-router-dom';
import { PLANS, formatIDR } from '../config/plans';
import type { PlanId } from '../config/plans';
import { useAuth } from '../context/AuthContext';

const PLAN_ICONS: Record<PlanId, string> = {
  free: '🌱',
  premium: '⭐',
  business: '🚀',
};

export default function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">💌</span>
          <span className="font-semibold text-gray-800">Undangan Digital</span>
        </Link>
        {user ? (
          <Link to="/dashboard" className="text-sm text-violet-600 font-medium hover:underline">
            Dashboard →
          </Link>
        ) : (
          <Link to="/auth" className="text-sm text-gray-600 hover:text-gray-800">
            Masuk
          </Link>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Pilih Paket</h1>
          <p className="text-gray-500 text-lg">Mulai gratis, upgrade kapan saja.</p>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 inline-block mt-4">
            ⚠️ Pembayaran belum aktif — integrasi payment gateway akan ditambahkan saat konfigurasi tersedia.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {(Object.values(PLANS)).map(plan => (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 flex flex-col ${
                plan.highlight
                  ? 'bg-violet-600 text-white shadow-xl shadow-violet-200 scale-[1.02]'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="text-3xl mb-3">{PLAN_ICONS[plan.id]}</div>
              <h2 className={`text-xl font-bold mb-0.5 ${plan.highlight ? 'text-white' : 'text-gray-800'}`}>
                {plan.name}
              </h2>
              <p className={`text-sm mb-4 ${plan.highlight ? 'text-violet-200' : 'text-gray-500'}`}>
                {plan.tagline}
              </p>

              <div className="mb-6">
                <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-800'}`}>
                  {formatIDR(plan.price.monthly)}
                </span>
                {plan.price.monthly > 0 && (
                  <span className={`text-sm ml-1 ${plan.highlight ? 'text-violet-200' : 'text-gray-400'}`}>
                    /bulan
                  </span>
                )}
                {plan.price.yearly > 0 && (
                  <p className={`text-xs mt-1 ${plan.highlight ? 'text-violet-200' : 'text-gray-400'}`}>
                    {formatIDR(plan.price.yearly)}/tahun (hemat 25%)
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map(f => (
                  <li
                    key={f}
                    className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-violet-100' : 'text-gray-600'}`}
                  >
                    <span className={plan.highlight ? 'text-violet-200' : 'text-green-500'}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div>
                {plan.id === 'free' ? (
                  <Link
                    to={user ? '/dashboard' : '/builder'}
                    className="block text-center w-full py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    {user ? 'Buka Dashboard' : 'Mulai Gratis'}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={`w-full py-3 rounded-2xl text-sm font-medium transition cursor-not-allowed ${
                      plan.highlight
                        ? 'bg-white text-violet-600 opacity-80'
                        : 'bg-violet-600 text-white opacity-50'
                    }`}
                    title="Pembayaran belum aktif"
                  >
                    Segera Hadir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Harga dalam IDR. Validasi paket dilakukan di sisi server — tidak dapat dimanipulasi dari browser.
        </p>
      </div>
    </div>
  );
}

