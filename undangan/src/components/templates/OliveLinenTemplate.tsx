import React from 'react';
import { TEMPLATE_THEMES } from '../../types/invitation';
import type { InvitationData, RSVPEntry } from '../../types/invitation';
import { Countdown, GuestbookList, RSVPForm, ShareButtons, formatEventDate } from '../shared/InvitationWidgets';
import { loadRSVPs, saveRSVP } from '../../services/storage';
import './olive-linen.css';

interface Props {
  data: InvitationData;
  guestName?: string;
  isPreview?: boolean;
}

const colors = TEMPLATE_THEMES['olive-linen'].colors;

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="olive-section-title">
      <span>{index}</span>
      <h2>{children}</h2>
      <span className="olive-title-rule" />
      <span aria-hidden>❧</span>
    </div>
  );
}

function getYouTubeEmbed(raw?: string) {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) return '';
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/\/embed\/([^/]+)/)?.[1] || '';
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
  } catch { return ''; }
}

function safeWebUrl(raw?: string) {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch { return ''; }
}

function timezoneLabel(timezone: string) {
  if (timezone === 'Asia/Jakarta') return 'WIB';
  if (timezone === 'Asia/Makassar') return 'WITA';
  if (timezone === 'Asia/Jayapura') return 'WIT';
  return timezone.replace('_', ' ');
}

export default function OliveLinenTemplate({ data, guestName, isPreview = false }: Props) {
  const [rsvpList, setRsvpList] = React.useState<RSVPEntry[]>(() => loadRSVPs(data.id));
  const [activeTab, setActiveTab] = React.useState<'rsvp' | 'guestbook'>('rsvp');
  const [copiedAccount, setCopiedAccount] = React.useState<string | null>(null);
  const mainEvent = data.events[0];
  const videoEmbed = getYouTubeEmbed(data.videoUrl);

  function handleRSVP(entry: { guestName: string; attendance: 'hadir' | 'tidak-hadir' | 'belum-pasti'; guestCount: number; message: string }) {
    saveRSVP({ id: `rsvp-${Date.now()}`, invitationId: data.id, ...entry, submittedAt: new Date().toISOString() });
    setRsvpList(loadRSVPs(data.id));
  }

  async function copyAccount(number: string) {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedAccount(number);
      window.setTimeout(() => setCopiedAccount(null), 1800);
    } catch { setCopiedAccount(null); }
  }

  const invitee = guestName && !isPreview ? (
    <p className="olive-invitee">Kepada Yth. <strong>{guestName}</strong></p>
  ) : null;

  return (
    <div className="olive-template" style={{ '--olive': colors.primary, '--olive-gold': colors.secondary, '--olive-paper': colors.background, '--olive-card': colors.surface, '--olive-ink': colors.text, '--olive-muted': colors.muted, '--olive-line': colors.border } as React.CSSProperties}>
      {/* Cover */}
      <section className="olive-cover" aria-label="Sampul undangan">
        <div className="olive-cover-shade" aria-hidden="true" />
        <div className="olive-cover-copy">
          <p className="olive-cover-kicker">The Wedding Of</p>
          <h1>{data.couple.groomNickname || data.couple.groomName || 'Nama Mempelai Pria'} <span>&amp;</span> {data.couple.brideNickname || data.couple.brideName || 'Nama Mempelai Wanita'}</h1>
          <div className="olive-cover-guest">Kepada{invitee ? <>{' '}{guestName && <strong>{guestName}</strong>}</> : <strong>Tamu Undangan</strong>}</div>
          <p className="olive-cover-invitation">Dengan penuh hormat, kami mengundang Anda untuk hadir di hari istimewa kami.</p>
          {!isPreview && <a className="olive-open-link" href="#olive-opening"><span aria-hidden>✉</span> Buka Undangan</a>}
        </div>
        {data.coverPhotoUrl ? <img className="olive-cover-image" src={data.coverPhotoUrl} alt="Foto pasangan untuk sampul undangan" /> : <div className="olive-cover-placeholder" aria-label="Tempat untuk foto sampul pasangan"><span aria-hidden>❧</span><small>Tambahkan foto sampul pasangan di editor</small></div>}
        <span className="olive-corner olive-corner-tl" aria-hidden>✦</span>
        <span className="olive-corner olive-corner-br" aria-hidden>✦</span>
      </section>

      {isPreview ? null : (
        <>
          <main>
            {/* Opening */}
            <section id="olive-opening" className="olive-section olive-opening">
              <span className="olive-leaf-mark" aria-hidden>❧</span>
              <p className="olive-script">Assalamu’alaikum Warahmatullahi Wabarakatuh</p>
              <p className="olive-opening-text">{data.openingText}</p>
              {data.quoteText && <blockquote>“{data.quoteText}”</blockquote>}
              <p className="olive-parents-note">Dengan memohon rahmat dan ridha Tuhan Yang Maha Esa</p>
            </section>

            {/* Couple */}
            <section className="olive-section olive-couple-section">
              <SectionTitle index="01">Kedua Mempelai</SectionTitle>
              <div className="olive-couple-grid">
                {[
                  { name: data.couple.groomName, nickname: data.couple.groomNickname, parents: data.couple.groomParents, role: 'Mempelai Pria' },
                  { name: data.couple.brideName, nickname: data.couple.brideNickname, parents: data.couple.brideParents, role: 'Mempelai Wanita' },
                ].map((person, i) => (
                  <article className="olive-person-card" key={`${person.role}-${i}`}>
                    <span className="olive-person-flower" aria-hidden>{i === 0 ? '❧' : '✦'}</span>
                    <p className="olive-person-role">{person.role}</p>
                    <h3>{person.nickname || person.name || (i === 0 ? 'Nama Mempelai Pria' : 'Nama Mempelai Wanita')}</h3>
                    {person.nickname && <p className="olive-person-fullname">{person.name}</p>}
                    {person.parents && <p className="olive-person-parents">Putra/putri dari<br />{person.parents}</p>}
                  </article>
                ))}
              </div>
              <p className="olive-couple-signature">{data.couple.groomNickname || data.couple.groomName} <span>&amp;</span> {data.couple.brideNickname || data.couple.brideName}</p>
            </section>

            {/* Countdown */}
            {mainEvent && (
              <section className="olive-countdown-section">
                <div className="olive-section olive-countdown-inner">
                  <p className="olive-overline">Save the date</p>
                  <h2>Menuju Hari Bahagia</h2>
                  <p className="olive-countdown-date">{formatEventDate(mainEvent.date)} · {mainEvent.time} {timezoneLabel(mainEvent.timezone)}</p>
                  <Countdown targetDate={mainEvent.date} targetTime={mainEvent.time} timezone={mainEvent.timezone} theme={{ primary: colors.primary, surface: colors.surface, text: colors.text, border: colors.border }} />
                </div>
              </section>
            )}

            {/* Events */}
            {data.events.length > 0 && (
              <section className="olive-section">
                <SectionTitle index="02">Rangkaian Acara</SectionTitle>
                <div className="olive-event-grid">
                  {data.events.map((event, i) => (
                    <article className="olive-event-card" key={`${event.title}-${i}`}>
                      <p className="olive-event-index">{String(i + 1).padStart(2, '0')} · {event.title}</p>
                      <h3>{formatEventDate(event.date)}</h3>
                      <p className="olive-event-time">{event.time}{event.endTime ? ` — ${event.endTime}` : ''} {timezoneLabel(event.timezone)}</p>
                      <div className="olive-event-divider" />
                      <p className="olive-event-venue">{event.venue}</p>
                      <p className="olive-event-address">{event.address}</p>
                      {event.dresscode && <p className="olive-event-dress">Busana: {event.dresscode}</p>}
                      {safeWebUrl(event.mapsUrl) && <a className="olive-map-button" href={safeWebUrl(event.mapsUrl)} target="_blank" rel="noopener noreferrer">Lihat lokasi di peta <span aria-hidden>↗</span></a>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Story */}
            {data.story.length > 0 && (
              <section className="olive-story-band">
                <div className="olive-section">
                  <SectionTitle index="03">Cerita Kami</SectionTitle>
                  <div className="olive-story-list">
                    {data.story.map((entry, i) => (
                      <article className="olive-story-item" key={`${entry.year}-${i}`}>
                        <span className="olive-story-year">{entry.year}</span>
                        <span className="olive-story-dot" aria-hidden />
                        <div><h3>{entry.title}</h3><p>{entry.description}</p></div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {(data.schedule ?? []).length > 0 && (
              <section className="olive-schedule-band">
                <div className="olive-section">
                  <SectionTitle index="04">Susunan Acara</SectionTitle>
                  <div className="olive-schedule-list">
                    {(data.schedule ?? []).map((item, i) => (
                      <article className="olive-schedule-item" key={`${item.time}-${item.title}-${i}`}>
                        <time className="olive-schedule-time">{item.time || 'Waktu'}</time>
                        <span className="olive-schedule-dot" aria-hidden="true" />
                        <div className="olive-schedule-copy">
                          <h3>{item.title || 'Nama Acara'}</h3>
                          {item.description && <p>{item.description}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Gallery */}
            {data.gallery.length > 0 && (
              <section className="olive-section">
                <SectionTitle index="04">Potret Kami</SectionTitle>
                <div className="olive-gallery">
                  {data.gallery.map((photo, i) => (
                    <figure className={i === 0 ? 'olive-gallery-feature' : ''} key={photo.id}>
                      <img src={photo.url} alt={photo.alt || 'Foto pasangan'} loading="lazy" />
                      {photo.alt && <figcaption>{photo.alt}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* Video */}
            {data.videoUrl && (
              <section className="olive-section olive-video-section">
                <SectionTitle index="05">Sebuah Momen</SectionTitle>
                {videoEmbed ? (
                  <div className="olive-video-frame"><iframe src={videoEmbed} title="Video pasangan" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
                ) : (
                  <p className="olive-video-help">Masukkan URL video YouTube yang valid melalui editor untuk menampilkan video.</p>
                )}
              </section>
            )}

            {/* RSVP and Guestbook */}
            <section className="olive-rsvp-band">
              <div className="olive-section">
                <SectionTitle index="06">Kehadiran &amp; Doa</SectionTitle>
                <div className="olive-rsvp-card">
                  <div className="olive-rsvp-tabs" role="tablist" aria-label="RSVP dan ucapan">
                    <button type="button" role="tab" aria-selected={activeTab === 'rsvp'} className={activeTab === 'rsvp' ? 'active' : ''} onClick={() => setActiveTab('rsvp')}>Konfirmasi Kehadiran</button>
                    <button type="button" role="tab" aria-selected={activeTab === 'guestbook'} className={activeTab === 'guestbook' ? 'active' : ''} onClick={() => setActiveTab('guestbook')}>Ucapan &amp; Doa</button>
                  </div>
                  {activeTab === 'rsvp' ? (
                    <RSVPForm invitationId={data.id} onSubmit={handleRSVP} theme={{ primary: colors.primary, surface: colors.surface, border: colors.border }} />
                  ) : (
                    <GuestbookList entries={rsvpList.filter(entry => entry.message)} theme={{ primary: colors.primary, surface: colors.surface, border: colors.border }} />
                  )}
                </div>
              </div>
            </section>

            {/* Gifts */}
            {data.bankAccounts.length > 0 && (
              <section className="olive-section">
                <SectionTitle index="07">Tanda Kasih</SectionTitle>
                <p className="olive-gift-intro">Doa dan kehadiran Anda adalah hadiah terindah bagi kami.</p>
                <div className="olive-gift-grid">
                  {data.bankAccounts.map((account, i) => {
                    const hasRealNumber = /\d{4,}/.test(account.accountNumber);
                    return (
                      <article className="olive-gift-card" key={`${account.bank}-${i}`}>
                        <span className="olive-gift-mark" aria-hidden>✦</span>
                        <p>{account.bank || 'Informasi hadiah'}</p>
                        <strong>{hasRealNumber ? account.accountNumber : 'Nomor rekening dapat ditambahkan di editor'}</strong>
                        <small>{account.accountName || 'Nama pemilik rekening'}</small>
                        {hasRealNumber && <button type="button" onClick={() => copyAccount(account.accountNumber)}>{copiedAccount === account.accountNumber ? 'Tersalin ✓' : 'Salin nomor'}</button>}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Closing and share */}
            <section className="olive-closing">
              <span aria-hidden>❧</span>
              <p>{data.closingText}</p>
              <h2>{data.couple.groomName} <i>&amp;</i> {data.couple.brideName}</h2>
              {data.couple.hashtag && <small>{data.couple.hashtag}</small>}
              <div className="olive-share"><ShareButtons invitation={data} guestName={guestName} theme={{ primary: colors.primary }} /></div>
            </section>
          </main>

          <footer className="olive-footer">Dibuat dengan penuh cinta <span aria-hidden>✦</span></footer>
        </>
      )}
    </div>
  );
}
