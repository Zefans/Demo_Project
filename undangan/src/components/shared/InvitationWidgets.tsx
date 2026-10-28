import React from 'react';
import type { InvitationData } from '../../types/invitation';

interface CountdownProps {
  targetDate: string; // ISO date string
  targetTime: string; // "HH:MM"
  timezone: string;
  theme?: {
    primary: string;
    surface: string;
    text: string;
    border: string;
  };
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function getTimeLeft(dateStr: string, timeStr: string, _timezone: string): TimeLeft {
  const target = new Date(`${dateStr}T${timeStr}:00`);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

export function Countdown({ targetDate, targetTime, timezone, theme, className = '' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState<TimeLeft>(() =>
    getTimeLeft(targetDate, targetTime, timezone)
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate, targetTime, timezone));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, targetTime, timezone]);

  if (timeLeft.isPast) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-lg font-semibold opacity-70">Acara telah berlangsung ✨</p>
      </div>
    );
  }

  const units = [
    { label: 'Hari', value: timeLeft.days },
    { label: 'Jam', value: timeLeft.hours },
    { label: 'Menit', value: timeLeft.minutes },
    { label: 'Detik', value: timeLeft.seconds },
  ];

  return (
    <div className={`flex justify-center gap-3 sm:gap-4 ${className}`} aria-label="Countdown timer">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold tabular-nums shadow-sm"
            style={{
              background: theme?.surface ?? '#fff',
              color: theme?.primary ?? '#ec4899',
              border: `2px solid ${theme?.border ?? '#f9a8d4'}`,
            }}
          >
            {String(value).padStart(2, '0')}
          </div>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider opacity-70">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Format event date nicely ────────────────────────────────────────────────
export function formatEventDate(dateStr: string, locale = 'id-ID'): string {
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── RSVP Form ───────────────────────────────────────────────────────────────

interface RSVPFormProps {
  invitationId: string;
  onSubmit: (entry: {
    guestName: string;
    attendance: 'hadir' | 'tidak-hadir' | 'belum-pasti';
    guestCount: number;
    message: string;
  }) => void;
  theme?: { primary: string; surface: string; border: string };
}

export function RSVPForm({ invitationId: _invitationId, onSubmit, theme }: RSVPFormProps) {
  const [name, setName] = React.useState('');
  const [attendance, setAttendance] = React.useState<'hadir' | 'tidak-hadir' | 'belum-pasti'>('hadir');
  const [count, setCount] = React.useState(1);
  const [message, setMessage] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nama wajib diisi.';
    if (name.trim().length > 100) errs.name = 'Nama terlalu panjang.';
    if (count < 1 || count > 10) errs.count = 'Jumlah tamu 1–10 orang.';
    if (message.length > 500) errs.message = 'Pesan maksimal 500 karakter.';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({ guestName: name.trim(), attendance, guestCount: count, message: message.trim() });
    setSubmitted(true);
  }

  const inputClass =
    'w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition';

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-2">
        <div className="text-4xl">🎉</div>
        <p className="font-semibold text-lg">Terima kasih, {name}!</p>
        <p className="text-sm opacity-70">
          {attendance === 'hadir'
            ? 'Kami sangat senang bisa bertemu denganmu di hari istimewa kami.'
            : attendance === 'tidak-hadir'
            ? 'Kami mengerti. Doamu sangat berarti untuk kami.'
            : 'Kami tunggu kabar baikmu ya!'}
        </p>
        <p className="text-xs opacity-50 mt-2">
          ⚠️ RSVP disimpan di perangkat ini (demo). Belum terhubung ke server.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="rsvp-name">
          Nama Tamu <span aria-hidden>*</span>
        </label>
        <input
          id="rsvp-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap kamu"
          className={inputClass}
          style={{ borderColor: theme?.border }}
          maxLength={100}
          autoComplete="name"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <fieldset>
          <legend className="block text-sm font-medium mb-2">Kehadiran</legend>
          <div className="flex flex-wrap gap-2">
            {(['hadir', 'tidak-hadir', 'belum-pasti'] as const).map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="attendance"
                  value={opt}
                  checked={attendance === opt}
                  onChange={() => setAttendance(opt)}
                  className="sr-only"
                />
                <span
                  className="px-3 py-1.5 rounded-full text-sm border transition"
                  style={{
                    background: attendance === opt ? theme?.primary : 'transparent',
                    color: attendance === opt ? '#fff' : 'inherit',
                    borderColor: theme?.border,
                  }}
                >
                  {opt === 'hadir' ? '✅ Hadir' : opt === 'tidak-hadir' ? '❌ Tidak Hadir' : '🤔 Belum Pasti'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {attendance === 'hadir' && (
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rsvp-count">
            Jumlah Tamu
          </label>
          <input
            id="rsvp-count"
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className={inputClass}
            style={{ borderColor: theme?.border }}
          />
          {errors.count && <p className="text-red-500 text-xs mt-1">{errors.count}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="rsvp-message">
          Ucapan & Doa
        </label>
        <textarea
          id="rsvp-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis ucapan dan doa terbaikmu..."
          rows={3}
          className={inputClass}
          style={{ borderColor: theme?.border }}
          maxLength={500}
        />
        <p className="text-xs opacity-50 text-right">{message.length}/500</p>
        {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition active:scale-95"
        style={{ background: theme?.primary ?? '#ec4899' }}
      >
        Kirim RSVP
      </button>
    </form>
  );
}

// ─── Guestbook List ───────────────────────────────────────────────────────────

interface GuestbookListProps {
  entries: Array<{
    guestName: string;
    attendance: string;
    message: string;
    submittedAt: string;
  }>;
  theme?: { primary: string; surface: string; border: string };
}

export function GuestbookList({ entries, theme }: GuestbookListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center opacity-50 py-8 text-sm">
        Belum ada ucapan. Jadilah yang pertama! 💌
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
      {[...entries].reverse().map((entry, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 text-sm"
          style={{ background: theme?.surface ?? '#fce7f3', border: `1px solid ${theme?.border ?? '#f9a8d4'}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">{entry.guestName}</span>
            <span className="text-xs opacity-50">
              {new Date(entry.submittedAt).toLocaleDateString('id-ID')}
            </span>
          </div>
          {entry.message && <p className="opacity-80">{entry.message}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────────────

interface ShareButtonsProps {
  invitation: InvitationData;
  guestName?: string;
  theme?: { primary: string };
}

export function ShareButtons({ invitation, guestName, theme }: ShareButtonsProps) {
  const url = `${window.location.origin}/invitation/${invitation.id}${guestName ? `?tamu=${encodeURIComponent(guestName)}` : ''}`;
  const { groomNickname, brideNickname } = invitation.couple;
  const eventDate = invitation.events[0]
    ? formatEventDate(invitation.events[0].date)
    : '';

  const waMessage = encodeURIComponent(
    `${guestName ? `Hai ${guestName}! ` : ''}Kami mengundangmu ke pernikahan ${groomNickname ?? invitation.couple.groomName} & ${brideNickname ?? invitation.couple.brideName} pada ${eventDate}.\n\nLihat undangan lengkap: ${url}`
  );

  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <a
        href={`https://wa.me/?text=${waMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition active:scale-95"
        style={{ background: '#25D366' }}
      >
        <WhatsAppIcon />
        Bagikan via WhatsApp
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition active:scale-95"
        style={{ borderColor: theme?.primary ?? '#ec4899', color: theme?.primary ?? '#ec4899' }}
      >
        {copied ? '✅ Tersalin!' : '🔗 Salin Tautan'}
      </button>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

