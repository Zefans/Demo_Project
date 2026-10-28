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

const theme = TEMPLATE_THEMES['retro-love'];
const t = theme.colors;

function GeometricBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute top-10 right-10 w-32 h-32 border-4 rotate-12 opacity-10" style={{ borderColor: t.primary }} />
      <div className="absolute top-24 right-20 w-20 h-20 border-4 rotate-45 opacity-10" style={{ borderColor: t.secondary }} />
      <div className="absolute bottom-20 left-10 w-24 h-24 border-4 -rotate-12 opacity-10" style={{ borderColor: t.primary }} />
      <div className="absolute top-1/2 left-4 text-6xl opacity-5 font-retro" style={{ color: t.primary }}>♡</div>
      <div className="absolute bottom-40 right-8 text-8xl opacity-5 font-retro rotate-12" style={{ color: t.secondary }}>★</div>
    </div>
  );
}

function StampBorder({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative p-6 ${className}`}
      style={{
        background: t.surface,
        border: `3px dashed ${t.border}`,
        boxShadow: `4px 4px 0 ${t.primary}22`,
      }}
    >
      {children}
    </div>
  );
}

function ScrapbookTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest transform -rotate-2"
      style={{ background: t.primary, color: '#fff' }}
    >
      {children}
    </span>
  );
}

export default function RetroLoveTemplate({ data, guestName, isPreview = false }: Props) {
  const [rsvpList, setRsvpList] = React.useState<RSVPEntry[]>(() => loadRSVPs(data.id));
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
    <div className="min-h-screen font-body" style={{ background: t.background, color: t.text }}>
      {!isPreview && <GeometricBg />}

      {/* ── Cover ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden"
        style={{ background: `linear-gradient(160deg, #fef9f0 0%, #fef3c7 50%, #fff7ed 100%)` }}
      >
        {/* Top tape strips */}
        <div className="absolute top-0 left-1/4 w-12 h-6 opacity-60 rotate-3" style={{ background: t.secondary }} />
        <div className="absolute top-0 right-1/3 w-10 h-6 opacity-50 -rotate-2" style={{ background: t.primary }} />

        {guestName && !isPreview && (
          <div className="mb-8 transform rotate-1">
            <ScrapbookTag>💌 Untuk: {guestName}</ScrapbookTag>
          </div>
        )}

        {/* Year stamp */}
        <div
          className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-2xl font-retro font-bold mb-6 transform rotate-3"
          style={{ borderColor: t.primary, color: t.primary, background: t.surface }}
        >
          {mainEvent ? new Date(mainEvent.date).getFullYear() : '2025'}
        </div>

        <ScrapbookTag>The Wedding of</ScrapbookTag>

        <h1
          className="font-retro text-5xl sm:text-8xl mt-4 leading-none"
          style={{ color: t.primary }}
        >
          {data.couple.groomNickname ?? data.couple.groomName}
        </h1>
        <div
          className="font-handwrite text-4xl my-2"
          style={{ color: t.secondary }}
        >
          &amp;
        </div>
        <h1
          className="font-retro text-5xl sm:text-8xl leading-none"
          style={{ color: t.primary }}
        >
          {data.couple.brideNickname ?? data.couple.brideName}
        </h1>

        {mainEvent && (
          <div
            className="mt-8 px-6 py-3 inline-block transform -rotate-1 font-medium"
            style={{ background: t.primary, color: '#fff' }}
          >
            {formatEventDate(mainEvent.date)}
          </div>
        )}

        {data.couple.hashtag && (
          <p className="mt-4 font-handwrite text-2xl transform rotate-1" style={{ color: t.secondary }}>
            {data.couple.hashtag}
          </p>
        )}

        {!isPreview && (
          <a
            href="#detail"
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 font-bold uppercase tracking-widest text-sm text-white transition active:scale-95"
            style={{ background: t.primary }}
          >
            ★ Buka Undangan ★
          </a>
        )}
      </section>

      {isPreview ? null : (
        <>
          {/* ── Opening ── */}
          <section className="py-16 px-6 max-w-2xl mx-auto">
            <StampBorder className="text-center transform rotate-1">
              <div className="text-2xl mb-3">♡ ♡ ♡</div>
              <p className="leading-relaxed text-sm" style={{ color: t.muted }}>
                {data.openingText}
              </p>
            </StampBorder>
          </section>

          {/* ── Couple ── */}
          <section id="detail" className="py-12 px-6 max-w-2xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { name: data.couple.groomName, nick: data.couple.groomNickname, parents: data.couple.groomParents, label: 'Mempelai Pria' },
                { name: data.couple.brideName, nick: data.couple.brideNickname, parents: data.couple.brideParents, label: 'Mempelai Wanita' },
              ].map((p, i) => (
                <StampBorder key={p.name} className={`text-center ${i === 1 ? '-rotate-1' : 'rotate-1'}`}>
                  <ScrapbookTag>{p.label}</ScrapbookTag>
                  <h2 className="font-retro text-4xl mt-3 mb-1" style={{ color: t.primary }}>{p.nick ?? p.name}</h2>
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.parents && (
                    <p className="text-xs mt-2" style={{ color: t.muted }}>
                      {p.parents}
                    </p>
                  )}
                </StampBorder>
              ))}
            </div>
          </section>

          {/* ── Cover Photo ── */}
          {data.coverPhotoUrl && (
            <section className="px-6 max-w-2xl mx-auto">
              <div
                className="overflow-hidden transform rotate-1"
                style={{ border: `6px solid ${t.primary}`, boxShadow: `6px 6px 0 ${t.secondary}` }}
              >
                <img
                  src={data.coverPhotoUrl}
                  alt={`Foto ${data.couple.groomName} dan ${data.couple.brideName}`}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
              </div>
            </section>
          )}

          {/* ── Events ── */}
          <section className="py-16 px-6 max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <ScrapbookTag>Detail Acara</ScrapbookTag>
            </div>
            {data.events.map((event, i) => (
              <StampBorder key={i} className={i % 2 === 0 ? 'rotate-1' : '-rotate-1'}>
                <h3 className="font-retro text-2xl mb-2" style={{ color: t.primary }}>{event.title}</h3>
                <p className="text-sm mb-1">
                  📅 {formatEventDate(event.date)} · {event.time}
                  {event.endTime ? ` – ${event.endTime}` : ''} WIB
                </p>
                <p className="text-sm mb-1">📍 {event.venue}</p>
                <p className="text-xs mb-3" style={{ color: t.muted }}>{event.address}</p>
                {event.dresscode && (
                  <p className="text-xs mb-3" style={{ color: t.muted }}>
                    Dresscode: <strong>{event.dresscode}</strong>
                  </p>
                )}
                {event.mapsUrl && (
                  <a
                    href={event.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold uppercase text-white transition"
                    style={{ background: t.primary }}
                  >
                    ★ Buka Peta
                  </a>
                )}
              </StampBorder>
            ))}
          </section>

          {/* ── Countdown ── */}
          {mainEvent && (
            <section className="py-12 px-6 text-center max-w-xl mx-auto">
              <ScrapbookTag>Hitung Mundur</ScrapbookTag>
              <div className="mt-8">
                <Countdown
                  targetDate={mainEvent.date}
                  targetTime={mainEvent.time}
                  timezone={mainEvent.timezone}
                  theme={themeColors}
                />
              </div>
            </section>
          )}

          {/* ── Story ── */}
          {data.story.length > 0 && (
            <section className="py-16 px-6 max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <ScrapbookTag>Kisah Cinta Kami</ScrapbookTag>
              </div>
              <div className="space-y-6">
                {data.story.map((entry, i) => (
                  <StampBorder key={i} className={`${i % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}>
                    <div
                      className="inline-block px-3 py-0.5 font-retro text-lg mb-2"
                      style={{ background: t.secondary, color: '#fff' }}
                    >
                      {entry.year}
                    </div>
                    <h3 className="font-bold text-base mb-1">{entry.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: t.muted }}>{entry.description}</p>
                  </StampBorder>
                ))}
              </div>
            </section>
          )}

          {/* ── Gallery ── */}
          {data.gallery.length > 0 && (
            <section className="py-12 px-6 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <ScrapbookTag>Foto Kenangan</ScrapbookTag>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data.gallery.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden aspect-square"
                    style={{
                      border: `4px solid ${i % 2 === 0 ? t.primary : t.secondary}`,
                      transform: `rotate(${i % 2 === 0 ? 1.5 : -1.5}deg)`,
                      boxShadow: `3px 3px 0 ${t.border}`,
                    }}
                  >
                    <img src={photo.url} alt={photo.alt} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── RSVP ── */}
          <section className="py-16 px-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <ScrapbookTag>RSVP & Ucapan</ScrapbookTag>
            </div>
            <div className="flex mb-4">
              {(['rsvp', 'guestbook'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-sm font-bold uppercase tracking-wide transition"
                  style={{
                    background: activeTab === tab ? t.primary : t.surface,
                    color: activeTab === tab ? '#fff' : t.text,
                    border: `2px solid ${t.primary}`,
                  }}
                >
                  {tab === 'rsvp' ? '✉️ RSVP' : `💬 Ucapan (${rsvpList.filter(r => r.message).length})`}
                </button>
              ))}
            </div>
            <StampBorder>
              {activeTab === 'rsvp' ? (
                <RSVPForm invitationId={data.id} onSubmit={handleRSVP} theme={themeColors} />
              ) : (
                <GuestbookList entries={rsvpList} theme={themeColors} />
              )}
            </StampBorder>
          </section>

          {/* ── Bank ── */}
          {data.bankAccounts.length > 0 && (
            <section className="py-12 px-6 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <ScrapbookTag>Hadiah</ScrapbookTag>
              </div>
              <div className="space-y-4">
                {data.bankAccounts.map((acc, i) => (
                  <StampBorder key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-retro text-xl" style={{ color: t.primary }}>{acc.bank}</p>
                      <p className="font-mono tracking-wider text-lg">{acc.accountNumber}</p>
                      <p className="text-xs" style={{ color: t.muted }}>{acc.accountName}</p>
                    </div>
                    <button
                      onClick={() => copyBankNumber(acc.accountNumber)}
                      className="px-3 py-1.5 text-sm font-bold transition"
                      style={{ background: t.secondary, color: '#fff' }}
                    >
                      {copiedBank === acc.accountNumber ? '✅' : '📋 Salin'}
                    </button>
                  </StampBorder>
                ))}
              </div>
            </section>
          )}

          {/* ── Closing ── */}
          <section className="py-16 px-6 text-center max-w-xl mx-auto">
            <StampBorder className="transform -rotate-1">
              <div className="text-3xl mb-4">♡ ★ ♡</div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: t.muted }}>
                {data.closingText}
              </p>
              <p className="font-retro text-2xl" style={{ color: t.primary }}>
                {data.couple.groomName} & {data.couple.brideName}
              </p>
            </StampBorder>
          </section>

          {/* ── Share ── */}
          <section className="py-12 px-6 text-center max-w-xl mx-auto">
            <div className="mb-6">
              <ScrapbookTag>Bagikan</ScrapbookTag>
            </div>
            <ShareButtons invitation={data} guestName={guestName} theme={{ primary: t.primary }} />
          </section>

          <footer className="py-8 text-center text-xs" style={{ color: t.muted }}>
            Dibuat dengan ♡ · Playful Invitation Platform
          </footer>
        </>
      )}
    </div>
  );
}

