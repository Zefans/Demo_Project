import React from 'react';
import { TEMPLATE_THEMES } from '../../types/invitation';
import type { InvitationData, RSVPEntry } from '../../types/invitation';
import { Countdown, RSVPForm, GuestbookList, ShareButtons, formatEventDate } from '../shared/InvitationWidgets';
import { saveRSVP, loadRSVPs } from '../../services/storage';

interface Props {
  data: InvitationData;
  guestName?: string;
  isPreview?: boolean;
}

const theme = TEMPLATE_THEMES['playful-garden'];
const t = theme.colors;

// Decorative SVG flowers
function Flower({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="none" aria-hidden>
      <circle cx="30" cy="30" r="8" fill={t.primary} opacity="0.9" />
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 30 + 16 * Math.cos(rad);
        const y = 30 + 16 * Math.sin(rad);
        return <ellipse key={angle} cx={x} cy={y} rx="6" ry="10" fill={t.primary} opacity="0.7" transform={`rotate(${angle} ${x} ${y})`} />;
      })}
    </svg>
  );
}

function Leaf({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 60" fill="none" aria-hidden>
      <path d="M20 55 C5 40 5 20 20 5 C35 20 35 40 20 55Z" fill={t.secondary} opacity="0.8" />
      <path d="M20 55 C20 30 20 10 20 5" stroke={t.secondary} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

function PetalBg() {
  const petals = ['🌸', '🌼', '🌷', '✨', '🦋', '🌿'];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden>
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute text-2xl animate-petal-fall opacity-30"
          style={{
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${8 + i * 2}s`,
            top: `-5%`,
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

export default function PlayfulGardenTemplate({ data, guestName, isPreview = false }: Props) {
  const [rsvpList, setRsvpList] = React.useState<RSVPEntry[]>(() =>
    loadRSVPs(data.id)
  );
  const [activeTab, setActiveTab] = React.useState<'rsvp' | 'guestbook'>('rsvp');
  const [copiedBank, setCopiedBank] = React.useState<string | null>(null);

  const mainEvent = data.events[0];

  function handleRSVP(entry: { guestName: string; attendance: 'hadir' | 'tidak-hadir' | 'belum-pasti'; guestCount: number; message: string }) {
    const rsvp: RSVPEntry = {
      id: `rsvp-${Date.now()}`,
      invitationId: data.id,
      ...entry,
      submittedAt: new Date().toISOString(),
    };
    saveRSVP(rsvp);
    setRsvpList(loadRSVPs(data.id));
  }

  async function copyBankNumber(number: string) {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedBank(number);
      setTimeout(() => setCopiedBank(null), 2000);
    } catch {
      setCopiedBank(null);
    }
  }

  const themeColors = { primary: t.primary, surface: t.surface, border: t.border, text: t.text };

  return (
    <div
      className="min-h-screen font-body"
      style={{ background: t.background, color: t.text }}
      id="invitation-root"
    >
      {!isPreview && <PetalBg />}

      {/* ── Cover / Hero ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden"
        style={{ background: `linear-gradient(170deg, #fff0f5 0%, #fce7f3 60%, #f0fdf4 100%)` }}
      >
        {/* Decorative flowers */}
        <Flower className="absolute top-6 left-4 w-16 h-16 opacity-60" />
        <Flower className="absolute top-12 right-6 w-12 h-12 opacity-40" />
        <Leaf className="absolute bottom-20 left-8 w-10 h-14 opacity-50 rotate-12" />
        <Leaf className="absolute bottom-12 right-10 w-8 h-12 opacity-40 -rotate-12" />

        {guestName && !isPreview && (
          <p
            className="text-sm font-handwrite mb-6 px-6 py-2 rounded-full border animate-fade-up"
            style={{ borderColor: t.border, background: t.surface, color: t.muted }}
          >
            Kepada Yth. {guestName} 💌
          </p>
        )}

        <p className="text-sm tracking-widest uppercase mb-4 animate-fade-up" style={{ color: t.muted, animationDelay: '0.1s' }}>
          The Wedding of
        </p>

        <h1
          className="font-handwrite text-5xl sm:text-7xl leading-none mb-2 animate-fade-up"
          style={{ color: t.primary, animationDelay: '0.2s' }}
        >
          {data.couple.groomNickname ?? data.couple.groomName}
        </h1>
        <p className="text-3xl sm:text-4xl animate-fade-up" style={{ color: t.muted, animationDelay: '0.3s' }}>
          &amp;
        </p>
        <h1
          className="font-handwrite text-5xl sm:text-7xl leading-none mt-2 animate-fade-up"
          style={{ color: t.primary, animationDelay: '0.4s' }}
        >
          {data.couple.brideNickname ?? data.couple.brideName}
        </h1>

        {mainEvent && (
          <p
            className="mt-8 text-base font-medium animate-fade-up"
            style={{ color: t.muted, animationDelay: '0.5s' }}
          >
            {formatEventDate(mainEvent.date)}
          </p>
        )}

        {data.couple.hashtag && (
          <p
            className="mt-3 font-handwrite text-xl animate-fade-up"
            style={{ color: t.primary, animationDelay: '0.6s' }}
          >
            {data.couple.hashtag}
          </p>
        )}

        {!isPreview && (
          <a
            href="#detail"
            className="mt-12 inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium shadow-md transition hover:shadow-lg active:scale-95 animate-fade-up"
            style={{ background: t.primary, animationDelay: '0.7s' }}
          >
            Buka Undangan 🌸
          </a>
        )}
      </section>

      {isPreview ? null : (
        <>
          {/* ── Opening Text ── */}
          <section className="py-16 px-6 text-center max-w-2xl mx-auto">
            <div className="text-3xl mb-4">✨</div>
            <p className="leading-relaxed text-base" style={{ color: t.muted }}>
              {data.openingText}
            </p>
          </section>

          {/* ── Couple Info ── */}
          <section id="detail" className="py-12 px-6 max-w-2xl mx-auto text-center">
            <div className="flex flex-col sm:flex-row gap-8 justify-center">
              {[
                { name: data.couple.groomName, nick: data.couple.groomNickname, parents: data.couple.groomParents, emoji: '🤵' },
                { name: data.couple.brideName, nick: data.couple.brideNickname, parents: data.couple.brideParents, emoji: '👰' },
              ].map((person) => (
                <div
                  key={person.name}
                  className="flex-1 rounded-3xl p-6 shadow-sm"
                  style={{ background: t.surface, border: `1px solid ${t.border}` }}
                >
                  <div className="text-5xl mb-3">{person.emoji}</div>
                  <h2 className="font-handwrite text-3xl mb-1" style={{ color: t.primary }}>
                    {person.nick ?? person.name}
                  </h2>
                  <p className="text-sm font-medium">{person.name}</p>
                  {person.parents && (
                    <p className="text-xs mt-2" style={{ color: t.muted }}>
                      Putra/i dari:<br />{person.parents}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Cover Photo ── */}
          {data.coverPhotoUrl && (
            <section className="px-6 max-w-2xl mx-auto">
              <div className="rounded-3xl overflow-hidden shadow-lg">
                <img
                  src={data.coverPhotoUrl}
                  alt={`Foto ${data.couple.groomName} dan ${data.couple.brideName}`}
                  className="w-full h-72 object-cover"
                  loading="lazy"
                />
              </div>
            </section>
          )}

          {/* ── Events ── */}
          <section className="py-16 px-6 max-w-2xl mx-auto">
            <h2 className="font-handwrite text-4xl text-center mb-10" style={{ color: t.primary }}>
              Detail Acara 🗓️
            </h2>
            <div className="space-y-6">
              {data.events.map((event, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 shadow-sm"
                  style={{ background: t.surface, border: `1px solid ${t.border}` }}
                >
                  <h3 className="font-semibold text-xl mb-1">{event.title}</h3>
                  <p className="text-sm mb-0.5" style={{ color: t.muted }}>
                    📅 {formatEventDate(event.date)} · {event.time}
                    {event.endTime ? ` – ${event.endTime}` : ''} WIB
                  </p>
                  <p className="text-sm mb-0.5">📍 {event.venue}</p>
                  <p className="text-xs mb-3" style={{ color: t.muted }}>{event.address}</p>
                  {event.dresscode && (
                    <p className="text-xs mb-3" style={{ color: t.muted }}>
                      👗 Dresscode: {event.dresscode}
                    </p>
                  )}
                  {event.mapsUrl && (
                    <a
                      href={event.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full text-white transition"
                      style={{ background: t.primary }}
                    >
                      🗺️ Buka Peta
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Countdown ── */}
          {mainEvent && (
            <section className="py-12 px-6 text-center max-w-xl mx-auto">
              <p className="text-sm uppercase tracking-widest mb-6" style={{ color: t.muted }}>
                Menuju Hari Bahagia
              </p>
              <Countdown
                targetDate={mainEvent.date}
                targetTime={mainEvent.time}
                timezone={mainEvent.timezone}
                theme={themeColors}
              />
            </section>
          )}

          {/* ── Love Story ── */}
          {data.story.length > 0 && (
            <section className="py-16 px-6 max-w-2xl mx-auto">
              <h2 className="font-handwrite text-4xl text-center mb-10" style={{ color: t.primary }}>
                Cerita Kita 💕
              </h2>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5" style={{ background: t.border }} />
                <div className="space-y-8">
                  {data.story.map((entry, i) => (
                    <div key={i} className="relative pl-16">
                      <div
                        className="absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                        style={{ background: t.surface, borderColor: t.primary, color: t.primary, top: '4px' }}
                      >
                        ♥
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: t.primary }}>
                        {entry.year}
                      </p>
                      <h3 className="font-semibold text-base mb-1">{entry.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: t.muted }}>
                        {entry.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Gallery ── */}
          {data.gallery.length > 0 && (
            <section className="py-12 px-6 max-w-2xl mx-auto">
              <h2 className="font-handwrite text-4xl text-center mb-8" style={{ color: t.primary }}>
                Galeri 📸
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.gallery.map((photo) => (
                  <div key={photo.id} className="rounded-2xl overflow-hidden aspect-square">
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── RSVP & Guestbook ── */}
          <section className="py-16 px-6 max-w-2xl mx-auto">
            <h2 className="font-handwrite text-4xl text-center mb-3" style={{ color: t.primary }}>
              RSVP & Ucapan 💌
            </h2>
            <p className="text-center text-sm mb-8" style={{ color: t.muted }}>
              Mohon konfirmasi kehadiranmu ya!
            </p>
            <div className="flex rounded-2xl overflow-hidden mb-6 border" style={{ borderColor: t.border }}>
              {(['rsvp', 'guestbook'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-sm font-medium transition"
                  style={{
                    background: activeTab === tab ? t.primary : t.surface,
                    color: activeTab === tab ? '#fff' : t.text,
                  }}
                >
                  {tab === 'rsvp' ? '✉️ Konfirmasi' : `💬 Ucapan (${rsvpList.filter(r => r.message).length})`}
                </button>
              ))}
            </div>
            <div
              className="rounded-3xl p-6 shadow-sm"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}
            >
              {activeTab === 'rsvp' ? (
                <RSVPForm invitationId={data.id} onSubmit={handleRSVP} theme={themeColors} />
              ) : (
                <GuestbookList entries={rsvpList} theme={themeColors} />
              )}
            </div>
          </section>

          {/* ── Gift / Bank ── */}
          {data.bankAccounts.length > 0 && (
            <section className="py-12 px-6 max-w-2xl mx-auto">
              <h2 className="font-handwrite text-4xl text-center mb-3" style={{ color: t.primary }}>
                Hadiah 🎁
              </h2>
              <p className="text-center text-sm mb-8" style={{ color: t.muted }}>
                Jika ingin memberikan hadiah, berikut informasinya.
              </p>
              <div className="space-y-3">
                {data.bankAccounts.map((acc, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 flex items-center justify-between"
                    style={{ background: t.surface, border: `1px solid ${t.border}` }}
                  >
                    <div>
                      <p className="font-semibold text-sm">{acc.bank}</p>
                      <p className="font-mono text-base tracking-wider">{acc.accountNumber}</p>
                      <p className="text-xs" style={{ color: t.muted }}>{acc.accountName}</p>
                    </div>
                    <button
                      onClick={() => copyBankNumber(acc.accountNumber)}
                      className="text-sm px-3 py-1.5 rounded-full border transition"
                      style={{ borderColor: t.border, color: t.primary }}
                    >
                      {copiedBank === acc.accountNumber ? '✅' : '📋 Salin'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Closing ── */}
          <section className="py-16 px-6 text-center max-w-xl mx-auto">
            <div className="text-4xl mb-4">🌸</div>
            <p className="leading-relaxed text-base mb-8" style={{ color: t.muted }}>
              {data.closingText}
            </p>
            <p className="font-handwrite text-3xl" style={{ color: t.primary }}>
              {data.couple.groomName} & {data.couple.brideName}
            </p>
          </section>

          {/* ── Share ── */}
          <section className="py-12 px-6 text-center max-w-xl mx-auto">
            <h2 className="font-handwrite text-3xl mb-6" style={{ color: t.primary }}>
              Bagikan 🔗
            </h2>
            <ShareButtons invitation={data} guestName={guestName} theme={{ primary: t.primary }} />
          </section>

          <footer className="py-8 text-center text-xs" style={{ color: t.muted }}>
            Dibuat dengan ❤️ · <span>Playful Invitation Platform</span>
          </footer>
        </>
      )}
    </div>
  );
}

