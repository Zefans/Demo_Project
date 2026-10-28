import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicInvitation } from '../../services/invitationService';
import { DEFAULT_INVITATION } from '../../types/invitation';
import TemplateRenderer from '../templates/TemplateRenderer';

// Sanitize raw URL param text — prevent XSS
function sanitizeText(raw: string): string {
  return raw
    .replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' }[c] ?? c))
    .slice(0, 100);
}

export default function PublicInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const rawGuest = searchParams.get('tamu') ?? '';
  const guestName = rawGuest ? sanitizeText(rawGuest) : undefined;
  const [opening, setOpening] = React.useState(true);

  const invitation = React.useMemo(() => {
    if (!id) return null;
    // getPublicInvitation checks published status + legacy drafts for demo
    const found = getPublicInvitation(id);
    if (found) return found;
    // Allow the hardcoded demo to always be viewable (dev convenience)
    if (id === DEFAULT_INVITATION.id) return DEFAULT_INVITATION;
    return null;
  }, [id]);

  if (!invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center font-body">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Undangan Tidak Ditemukan</h1>
        <p className="text-gray-500 text-sm mb-6">
          URL undangan ini tidak valid, belum dipublikasikan, atau sudah kadaluarsa.
        </p>
        <a href="/" className="text-violet-600 font-medium hover:underline">
          ← Kembali ke Beranda
        </a>
      </div>
    );
  }

  if (opening) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center p-8 font-body"
        style={{ background: 'linear-gradient(135deg, #fdf4f5 0%, #fce7f3 50%, #f0fdf4 100%)' }}
      >
        <div className="animate-float">
          <div className="text-8xl mb-6">💌</div>
        </div>
        {guestName && (
          <p className="text-gray-600 text-base mb-2">
            Kepada Yth. <strong>{guestName}</strong>
          </p>
        )}
        <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
          Kamu Mendapat Undangan
        </h1>
        <p className="text-gray-500 text-sm mb-8 max-w-xs">
          {invitation.couple.groomNickname ?? invitation.couple.groomName} &amp;{' '}
          {invitation.couple.brideNickname ?? invitation.couple.brideName} mengundangmu ke hari istimewa mereka.
        </p>
        <button
          onClick={() => setOpening(false)}
          className="px-8 py-4 rounded-2xl bg-pink-500 text-white font-semibold text-base shadow-lg hover:bg-pink-600 active:scale-95 transition"
        >
          Buka Undangan 🌸
        </button>
      </div>
    );
  }

  return <TemplateRenderer data={invitation} guestName={guestName} isPreview={false} />;
}

