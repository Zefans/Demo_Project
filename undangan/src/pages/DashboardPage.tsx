import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { InvitationData } from '../types/invitation';
import { TEMPLATE_THEMES } from '../types/invitation';
import {
  getUserInvitations,
  deleteInvitation,
  createNewInvitation,
  setInvitationStatus,
} from '../services/invitationService';
import { canCreateInvitation, PLANS } from '../config/plans';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [invitations, setInvitations] = React.useState<InvitationData[]>([]);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    setInvitations(getUserInvitations(user.id));
  }, [user, navigate]);

  function handleCreate() {
    if (!user) return;
    const limit = PLANS[user.plan].limits.maxInvitations;
    if (!canCreateInvitation(user.plan, invitations.length)) {
      alert(`Paket ${PLANS[user.plan].name} hanya mendukung ${limit} undangan. Upgrade ke paket lebih tinggi untuk membuat lebih banyak.`);
      navigate('/pricing');
      return;
    }
    const inv = createNewInvitation(user.id);
    navigate(`/dashboard/editor/${inv.id}`);
  }

  function handleDelete(id: string) {
    if (!user) return;
    deleteInvitation(user.id, id);
    setInvitations(getUserInvitations(user.id));
    setDeleteConfirm(null);
  }

  function handleTogglePublish(inv: InvitationData) {
    if (!user) return;
    const newStatus = inv.status === 'published' ? 'draft' : 'published';
    setInvitationStatus(user.id, inv.id, newStatus);
    setInvitations(getUserInvitations(user.id));
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/invitation/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  if (!user) return null;

  const planBadge: Record<string, { label: string; color: string }> = {
    free: { label: 'Free', color: '#6b7280' },
    premium: { label: 'Premium ⭐', color: '#7c3aed' },
    business: { label: 'Business 🚀', color: '#0ea5e9' },
  };
  const badge = planBadge[user.plan] ?? planBadge.free;

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">💌</span>
            <span className="font-semibold text-gray-800">Undangan Digital</span>
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium text-white"
              style={{ background: badge.color }}
            >
              {badge.label}
            </span>
            <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
            <button
              type="button"
              onClick={() => { logout(); navigate('/'); }}
              className="text-sm text-gray-500 hover:text-gray-800 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Welcome ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Hai, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 text-sm">
            Kelola semua undangan digitalmu di sini.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Undangan', value: invitations.length },
            { label: 'Dipublikasi', value: invitations.filter(i => i.status === 'published').length },
            { label: 'Draft', value: invitations.filter(i => i.status === 'draft').length },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-800">Undanganku</h2>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition active:scale-95"
          >
            + Buat Undangan Baru
          </button>
        </div>

        {/* ── Invitation list ── */}
        {invitations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="text-5xl mb-4">💌</div>
            <h3 className="font-semibold text-gray-700 mb-2">Belum ada undangan</h3>
            <p className="text-sm text-gray-400 mb-6">Buat undangan pertamamu sekarang!</p>
            <button
              type="button"
              onClick={handleCreate}
              className="px-6 py-3 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition"
            >
              Buat Sekarang
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => {
              const tmpl = TEMPLATE_THEMES[inv.templateId] ?? TEMPLATE_THEMES['playful-garden'];
              const isPublished = inv.status === 'published';
              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-md transition"
                >
                  {/* Preview strip */}
                  <div
                    className="h-28 flex items-center justify-center text-3xl"
                    style={{ background: tmpl.previewBg }}
                  >
                    {tmpl.decorations[0]}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm leading-snug">
                        {inv.couple.groomNickname ?? inv.couple.groomName} &amp;{' '}
                        {inv.couple.brideNickname ?? inv.couple.brideName}
                      </h3>
                      <span
                        className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: isPublished ? '#dcfce7' : '#f3f4f6',
                          color: isPublished ? '#16a34a' : '#6b7280',
                        }}
                      >
                        {isPublished ? '● Live' : '○ Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{tmpl.name}</p>
                    {inv.events[0] && (
                      <p className="text-xs text-gray-500 mb-3">
                        📅 {new Date(`${inv.events[0].date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        to={`/dashboard/editor/${inv.id}`}
                        className="flex-1 text-center text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(inv)}
                        className="flex-1 text-xs py-1.5 rounded-lg border transition"
                        style={{
                          borderColor: isPublished ? '#fca5a5' : '#86efac',
                          color: isPublished ? '#dc2626' : '#16a34a',
                          background: 'transparent',
                        }}
                      >
                        {isPublished ? 'Tarik' : '🚀 Publish'}
                      </button>
                      {isPublished && (
                        <button
                          type="button"
                          onClick={() => copyLink(inv.id)}
                          className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          🔗 Salin
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(inv.id)}
                        className="text-xs py-1.5 px-3 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Supabase Integration Notice ── */}
        <div className="mt-10 p-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50">
          <p className="text-sm font-semibold text-violet-800 mb-1">🔗 Integrasi Backend</p>
          <p className="text-xs text-violet-700 leading-relaxed">
            Data saat ini tersimpan di localStorage perangkat Anda (demo). Untuk produksi,
            hubungkan ke <strong>Supabase</strong> dengan mengisi{' '}
            <code className="font-mono bg-violet-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> dan{' '}
            <code className="font-mono bg-violet-100 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>{' '}
            di file <code className="font-mono bg-violet-100 px-1 py-0.5 rounded">.env</code>.
            Lihat <code className="font-mono bg-violet-100 px-1 py-0.5 rounded">SUPABASE_SCHEMA.sql</code> untuk skema database.
          </p>
        </div>
      </main>

      {/* ── Delete Confirm Dialog ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi hapus undangan"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-4xl mb-3 text-center">🗑️</div>
            <h2 className="font-bold text-center text-lg mb-2">Hapus Undangan?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

