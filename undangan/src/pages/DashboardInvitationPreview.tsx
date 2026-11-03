import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserInvitations } from '../services/invitationService';
import TemplateRenderer from '../components/templates/TemplateRenderer';

/** Preview an owned invitation directly from the dashboard, including drafts. */
export default function DashboardInvitationPreview() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) navigate('/auth', { replace: true });
  }, [user, navigate]);

  const invitation = React.useMemo(() => {
    if (!user || !id) return null;
    return getUserInvitations(user.id).find(item => item.id === id) ?? null;
  }, [user, id]);

  if (!user) return null;

  if (!invitation) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center bg-gray-50 font-body">
        <h1 className="text-xl font-semibold text-gray-800">Undangan tidak ditemukan</h1>
        <p className="max-w-md text-sm text-gray-500">Undangan ini tidak ada di daftar akun yang sedang digunakan.</p>
        <Link to="/dashboard" className="mt-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white">Kembali ke Dashboard</Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800">
              {invitation.couple.groomNickname || invitation.couple.groomName} &amp; {invitation.couple.brideNickname || invitation.couple.brideName}
            </p>
            <p className="text-xs text-gray-500">Pratinjau dashboard · {invitation.status === 'published' ? 'Sudah dipublikasikan' : 'Draft, belum dipublikasikan'}</p>
          </div>
          <nav className="flex shrink-0 gap-2">
            <Link to={`/dashboard/editor/${invitation.id}`} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">✏️ Edit</Link>
            <Link to="/dashboard" className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700">Kembali</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-0 sm:px-4 sm:py-6">
        <div className="overflow-hidden bg-white shadow-sm sm:rounded-2xl">
          <TemplateRenderer data={invitation} isPreview={false} />
        </div>
      </main>
    </div>
  );
}
