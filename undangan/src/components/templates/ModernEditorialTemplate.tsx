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

const theme = TEMPLATE_THEMES['modern-editorial'];
const t = theme.colors;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <span className="font-mono text-xs tracking-widest uppercase" style={{ color: t.muted }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: t.border }} />
    </div>
  );
}

export default function ModernEditorialTemplate({ data, guestName, isPreview = false }: Props) {
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

      {/* ── Cover — asymmetric editorial ── */}
      <section className="relative min-h-screen grid sm:grid-cols-2 overflow-hidden">
        {/* Left: dark editorial block */}
        <div
          className="flex flex-col justify-end p-8 sm:p-14 pb-16 min-h-[50vh] sm:min-h-screen"
          style={{ background: t.primary }}
        >
          {guestName && !isPreview && (
            <p
              className="font-mono text-xs tracking-widest uppercase mb-8 opacity-60"
              style={{ color: '#fff' }}
            >
              — untuk {guestName}
            </p>
          )}
          <p
            className="font-mono text-xs tracking-widest uppercase mb-4 opacity-50"
            style={{ color: '#fff' }}
          >
            The Wedding of
          </p>
          <h1
            className="font-display text-5xl sm:text-7xl leading-none text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            {data.couple.groomNickname ?? data.couple.groomName}
          </h1>
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-white opacity-30" />
            <span className="text-white opacity-50 font-mono text-sm">&amp;</span>
            <div className="flex-1 h-px bg-white opacity-30" />
          </div>
          <h1
            className="font-display text-5xl sm:text-7xl leading-none text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            {data.couple.brideNickname ?? data.couple.brideName}
          </h1>
          {data.couple.hashtag && (
            <p className="font-mono text-xs mt-6 opacity-40 text-white tracking-widest">
              {data.couple.hashtag}
            </p>
          )}
        </div>

        {/* Right: photo / info block */}
        <div
          className="flex flex-col justify-center p-8 sm:p-14 min-h-[40vh] sm:min-h-screen"
          style={{ background: t.surface }}
        >
          {data.coverPhotoUrl ? (
            <div className="aspect-[3/4] mb-8 overflow-hidden">
              <img
                src={data.coverPhotoUrl}
                alt={`Foto ${data.couple.groomName} dan ${data.couple.brideName}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          ) : (
            <div
              className="aspect-[3/4] mb-8 flex items-center justify-center"
              style={{ background: t.border }}
            >
              <span className="font-display text-8xl opacity-10" style={{ color: t.primary }}>
                ♡
              </span>
            </div>
          )}

          {mainEvent && (
            <div>
              <p className="font-mono text-xs tracking-widest uppercase mb-1" style={{ color: t.muted }}>
                {formatEventDate(mainEvent.date)}
              </p>
              <p className="font-mono text-xs" style={{ color: t.muted }}>
                {mainEvent.venue}
              </p>
            </div>
          )}

          {!isPreview && (
            <a
              href="#detail"
              className="mt-8 inline-flex items-center gap-3 text-sm font-medium group"
              style={{ color: t.secondary }}
            >
              Lihat Undangan
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          )}
        </div>
      </section>

      {isPreview ? null : (
        <>
          <div className="max-w-3xl mx-auto px-6">

            {/* ── Opening ── */}
            <section className="py-20">
              <SectionLabel>01 / Undangan</SectionLabel>
              <p className="text-lg leading-relaxed" style={{ color: t.muted }}>
                {data.openingText}
              </p>
            </section>

            {/* ── Couple ── */}
            <section id="detail" className="py-12 border-t" style={{ borderColor: t.border }}>
              <SectionLabel>02 / Mempelai</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-10">
                {[
                  { name: data.couple.groomName, nick: data.couple.groomNickname, parents: data.couple.groomParents },
                  { name: data.couple.brideName, nick: data.couple.brideNickname, parents: data.couple.brideParents },
                ].map((p) => (
                  <div key={p.name}>
                    <h2 className="font-display text-4xl mb-1" style={{ color: t.primary }}>
                      {p.nick ?? p.name}
                    </h2>
                    <p className="font-mono text-xs uppercase tracking-widest" style={{ color: t.muted }}>
                      {p.name}
                    </p>
                    {p.parents && (
                      <p className="text-sm mt-3 leading-relaxed" style={{ color: t.muted }}>
                        {p.parents}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Events ── */}
            <section className="py-16 border-t" style={{ borderColor: t.border }}>
              <SectionLabel>03 / Detail Acara</SectionLabel>
              <div className="space-y-10">
                {data.events.map((event, i) => (
                  <div key={i} className="grid sm:grid-cols-[1fr_2fr] gap-6 pb-10 border-b last:border-0" style={{ borderColor: t.border }}>
                    <div>
                      <p className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: t.muted }}>
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      <h3 className="font-display text-2xl">{event.title}</h3>
                    </div>
                    <div className="space-y-1 text-sm" style={{ color: t.muted }}>
                      <p>{formatEventDate(event.date)}</p>
                      <p>{event.time}{event.endTime ? ` — ${event.endTime}` : ''} WIB</p>
                      <p className="font-medium" style={{ color: t.text }}>{event.venue}</p>
                      <p>{event.address}</p>
                      {event.dresscode && <p>Dresscode / {event.dresscode}</p>}
                      {event.mapsUrl && (
                        <a
                          href={event.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 text-sm font-medium"
                          style={{ color: t.secondary }}
                        >
                          Buka Peta <span>→</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Countdown ── */}
            {mainEvent && (
              <section className="py-16 border-t text-center" style={{ borderColor: t.border }}>
                <SectionLabel>04 / Countdown</SectionLabel>
                <Countdown
                  targetDate={mainEvent.date}
                  targetTime={mainEvent.time}
                  timezone={mainEvent.timezone}
                  theme={{ ...themeColors, primary: t.secondary }}
                />
              </section>
            )}

            {/* ── Story ── */}
            {data.story.length > 0 && (
              <section className="py-16 border-t" style={{ borderColor: t.border }}>
                <SectionLabel>05 / Perjalanan Kami</SectionLabel>
                <div className="space-y-12">
                  {data.story.map((entry, i) => (
                    <div key={i} className="grid sm:grid-cols-[120px_1fr] gap-6 items-start">
                      <div>
                        <p className="font-display text-3xl" style={{ color: t.secondary }}>{entry.year}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{entry.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: t.muted }}>{entry.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Gallery ── */}
            {data.gallery.length > 0 && (
              <section className="py-16 border-t" style={{ borderColor: t.border }}>
                <SectionLabel>06 / Galeri</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.gallery.map((photo, i) => (
                    <div
                      key={photo.id}
                      className={`overflow-hidden ${i === 0 ? 'col-span-2 sm:col-span-1 row-span-2' : ''}`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.alt}
                        className="w-full h-full object-cover aspect-square"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── RSVP ── */}
            <section className="py-16 border-t" style={{ borderColor: t.border }}>
              <SectionLabel>07 / RSVP</SectionLabel>
              <div className="flex border-b mb-8" style={{ borderColor: t.border }}>
                {(['rsvp', 'guestbook'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="pb-3 mr-6 text-sm font-medium transition border-b-2"
                    style={{
                      borderColor: activeTab === tab ? t.primary : 'transparent',
                      color: activeTab === tab ? t.primary : t.muted,
                    }}
                  >
                    {tab === 'rsvp' ? 'Konfirmasi Kehadiran' : `Ucapan & Doa (${rsvpList.filter(r => r.message).length})`}
                  </button>
                ))}
              </div>
              {activeTab === 'rsvp' ? (
                <RSVPForm invitationId={data.id} onSubmit={handleRSVP} theme={themeColors} />
              ) : (
                <GuestbookList entries={rsvpList} theme={themeColors} />
              )}
            </section>

            {/* ── Bank ── */}
            {data.bankAccounts.length > 0 && (
              <section className="py-16 border-t" style={{ borderColor: t.border }}>
                <SectionLabel>08 / Hadiah</SectionLabel>
                <div className="space-y-4">
                  {data.bankAccounts.map((acc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-4 border-b"
                      style={{ borderColor: t.border }}
                    >
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: t.muted }}>
                          {acc.bank}
                        </p>
                        <p className="font-display text-xl">{acc.accountNumber}</p>
                        <p className="text-sm" style={{ color: t.muted }}>{acc.accountName}</p>
                      </div>
                      <button
                        onClick={() => copyBankNumber(acc.accountNumber)}
                        className="text-sm font-medium transition"
                        style={{ color: t.secondary }}
                      >
                        {copiedBank === acc.accountNumber ? '✓ Tersalin' : 'Salin →'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Closing ── */}
            <section className="py-20 border-t" style={{ borderColor: t.border }}>
              <SectionLabel>09 / Penutup</SectionLabel>
              <p className="text-lg leading-relaxed mb-10" style={{ color: t.muted }}>
                {data.closingText}
              </p>
              <p className="font-display text-3xl">{data.couple.groomName} & {data.couple.brideName}</p>
            </section>

            {/* ── Share ── */}
            <section className="py-16 border-t text-center" style={{ borderColor: t.border }}>
              <SectionLabel>10 / Bagikan</SectionLabel>
              <ShareButtons invitation={data} guestName={guestName} theme={{ primary: t.secondary }} />
            </section>
          </div>

          <footer className="py-8 text-center text-xs border-t" style={{ borderColor: t.border, color: t.muted }}>
            Playful Invitation Platform · {new Date().getFullYear()}
          </footer>
        </>
      )}
    </div>
  );
}

