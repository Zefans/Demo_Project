import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen font-body" style={{ background: 'linear-gradient(160deg, #fdf4f5 0%, #fce7f3 40%, #f0fdf4 100%)' }}>

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💌</span>
          <span className="font-semibold text-gray-800">Undangan Digital</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition active:scale-95"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-gray-600 hover:text-gray-900 transition px-3 py-2">
                Masuk
              </Link>
              <Link
                to="/builder"
                className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition active:scale-95"
              >
                Buat Undangan
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="text-center px-6 py-16 max-w-4xl mx-auto">
        <div className="text-5xl mb-6 animate-float">💌</div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold text-gray-800 leading-tight mb-6 text-balance">
          Undangan Digital yang{' '}
          <span className="text-pink-500">Memukau</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 text-balance">
          Buat undangan pernikahan dan acara spesialmu dengan template yang indah, editor
          yang mudah, dan pengalaman tamu yang tak terlupakan.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/builder"
            className="px-8 py-4 rounded-2xl bg-pink-500 text-white font-semibold text-lg shadow-lg hover:bg-pink-600 active:scale-95 transition"
          >
            Mulai Buat Gratis 🌸
          </Link>
          <Link
            to="/invitation/demo-001"
            className="px-8 py-4 rounded-2xl border-2 border-pink-200 text-pink-600 font-semibold text-lg hover:bg-pink-50 active:scale-95 transition"
          >
            Lihat Demo
          </Link>
        </div>
      </section>

      {/* ── Template Showcase ── */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-center font-display text-3xl font-bold text-gray-800 mb-3">
          3 Template Unik
        </h2>
        <p className="text-center text-gray-500 mb-10">
          Pilih karakter visual yang sesuai dengan kepribadianmu.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              id: 'playful-garden',
              name: 'Playful Garden',
              icon: '🌸',
              desc: 'Bunga, doodle, dan warna pastel yang ceria',
              bg: 'linear-gradient(135deg, #fdf4f5, #fce7f3, #f0fdf4)',
              accent: '#ec4899',
            },
            {
              id: 'retro-love',
              name: 'Retro Love Story',
              icon: '♡',
              desc: 'Scrapbook, geometris, dan tipografi retro',
              bg: 'linear-gradient(135deg, #fef9f0, #fef3c7, #fff7ed)',
              accent: '#dc2626',
            },
            {
              id: 'modern-editorial',
              name: 'Modern Editorial',
              icon: '—',
              desc: 'Asimetris, tipografi berani, dan minimalis',
              bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #1e293b)',
              accent: '#6366f1',
            },
          ].map((tmpl) => (
            <div
              key={tmpl.id}
              className="rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div className="h-48 flex items-center justify-center text-5xl" style={{ background: tmpl.bg }}>
                {tmpl.icon}
              </div>
              <div className="bg-white p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{tmpl.name}</h3>
                <p className="text-xs text-gray-500">{tmpl.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-center font-display text-3xl font-bold text-gray-800 mb-10">
          Semua yang Kamu Butuhkan
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '✏️', title: 'Editor Mudah', desc: 'Sesuaikan semua detail tanpa coding.' },
            { icon: '👁️', title: 'Preview Langsung', desc: 'Lihat perubahan secara real-time.' },
            { icon: '📱', title: 'Mobile Friendly', desc: 'Tampil sempurna di semua perangkat.' },
            { icon: '💌', title: 'Bagikan ke Tamu', desc: 'Link unik dengan sapaan personal.' },
            { icon: '✅', title: 'RSVP & Guestbook', desc: 'Konfirmasi tamu dan ucapan digital.' },
            { icon: '⏱️', title: 'Countdown', desc: 'Hitung mundur otomatis ke hari H.' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 text-center">
        <h2 className="font-display text-4xl font-bold text-gray-800 mb-4">
          Siap membuat undangan impianmu? 🌸
        </h2>
        <p className="text-gray-500 mb-8">Gratis untuk memulai. Tidak perlu akun.</p>
        <Link
          to="/builder"
          className="px-10 py-4 rounded-2xl bg-pink-500 text-white font-bold text-lg shadow-xl hover:bg-pink-600 active:scale-95 transition"
        >
          Buat Undangan Sekarang
        </Link>
      </section>

      <footer className="py-8 text-center text-xs text-gray-400 border-t border-gray-100 space-y-2">
        <div className="flex justify-center gap-4 mb-2">
          <Link to="/pricing" className="hover:text-gray-600 transition">Harga</Link>
          <Link to="/auth" className="hover:text-gray-600 transition">Masuk</Link>
          <Link to="/builder" className="hover:text-gray-600 transition">Demo Gratis</Link>
        </div>
        💌 Undangan Digital · Demo — Data tersimpan di perangkat Anda (localStorage)
      </footer>
    </div>
  );
}

