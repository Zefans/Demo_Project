// ─── Core Invitation Data Model ──────────────────────────────────────────────
// All templates consume this shape. Editor mutates this. Templates only display.

export type TemplateId = 'playful-garden' | 'retro-love' | 'modern-editorial' | 'olive-linen';

export interface CoupleInfo {
  groomName: string;
  brideName: string;
  groomNickname?: string;
  brideNickname?: string;
  groomParents?: string;
  brideParents?: string;
  hashtag?: string;
}

export interface EventInfo {
  title: string; // e.g. "Pernikahan", "Ulang Tahun"
  date: string; // ISO 8601 date string e.g. "2025-09-20"
  time: string; // e.g. "09:00"
  endTime?: string;
  timezone: string; // e.g. "Asia/Jakarta"
  venue: string;
  address: string;
  mapsUrl?: string;
  dresscode?: string;
}

export interface StoryEntry {
  year: string;
  title: string;
  description: string;
}

export interface ScheduleEntry {
  time: string;
  title: string;
  description: string;
}

export interface GalleryPhoto {
  id: string;
  url: string; // data URL or remote URL
  alt: string;
}

export interface BankAccount {
  bank: string;
  accountNumber: string;
  accountName: string;
}

export interface InvitationData {
  id: string;
  templateId: TemplateId;
  couple: CoupleInfo;
  openingText: string;
  closingText: string;
  quoteText?: string;
  videoUrl?: string;
  musicUrl?: string;
  events: EventInfo[];
  story: StoryEntry[];
  schedule?: ScheduleEntry[];
  gallery: GalleryPhoto[];
  bankAccounts: BankAccount[];
  coverPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
}

// ─── Template Theme Config ────────────────────────────────────────────────────

export interface TemplateTheme {
  id: TemplateId;
  name: string;
  description: string;
  previewBg: string; // CSS color / gradient for card preview
  fonts: {
    heading: string;
    body: string;
    accent?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
  };
  decorations: string[]; // Emoji / SVG decorative elements used in this template
  layout: 'centered' | 'asymmetric' | 'scrapbook';
  animationStyle: 'gentle' | 'bold' | 'minimal';
}

// ─── RSVP / Guestbook ────────────────────────────────────────────────────────

export interface RSVPEntry {
  id: string;
  invitationId: string;
  guestName: string;
  attendance: 'hadir' | 'tidak-hadir' | 'belum-pasti';
  guestCount: number;
  message: string;
  submittedAt: string;
}

// ─── Default / Sample Data ───────────────────────────────────────────────────

export const DEFAULT_INVITATION: InvitationData = {
  id: 'demo-invitation',
  templateId: 'modern-editorial',
  couple: {
    groomName: 'Nama Mempelai Pria',
    brideName: 'Nama Mempelai Wanita',
    groomNickname: 'Mempelai Pria',
    brideNickname: 'Mempelai Wanita',
    groomParents: 'Nama Orang Tua',
    brideParents: 'Nama Orang Tua',
    hashtag: '#UndanganDemo',
  },
  openingText: 'Dengan penuh sukacita, kami mengundang Anda untuk menghadiri acara istimewa kami.',
  closingText: 'Terima kasih atas doa dan kehadiran Anda.',
  quoteText: 'Semoga langkah baru ini selalu dipenuhi kasih, ketulusan, dan kebahagiaan.',
  videoUrl: '',
  musicUrl: '',
  events: [
    {
      title: 'Akad Nikah',
      date: '2026-12-31',
      time: '08:00',
      endTime: '10:00',
      timezone: 'Asia/Makassar',
      venue: 'Nama Tempat Acara',
      address: 'Alamat acara ditambahkan oleh pengguna',
      mapsUrl: '',
      dresscode: 'Busana rapi',
    },
    {
      title: 'Resepsi',
      date: '2026-12-31',
      time: '11:00',
      endTime: '14:00',
      timezone: 'Asia/Makassar',
      venue: 'Nama Tempat Acara',
      address: 'Alamat acara ditambahkan oleh pengguna',
      mapsUrl: '',
      dresscode: 'Busana rapi',
    },
  ],
  story: [
    { year: '2020', title: 'Awal Cerita', description: 'Tuliskan cerita awal di sini.' },
    { year: '2022', title: 'Momen Berkesan', description: 'Tambahkan momen berkesan di sini.' },
    { year: '2024', title: 'Hari Bahagia', description: 'Ceritakan rencana hari bahagia di sini.' },
    { year: '2026', title: 'Bab Baru', description: 'Tulis harapan untuk bab baru di sini.' },
  ],
  schedule: [
    { time: '08.00', title: 'Kedatangan Tamu', description: 'Menyambut keluarga dan para tamu undangan.' },
    { time: '09.00', title: 'Akad Nikah', description: 'Prosesi akad dan doa bersama.' },
    { time: '11.00', title: 'Resepsi', description: 'Ucapan selamat dan ramah tamah.' },
    { time: '13.00', title: 'Penutup', description: 'Terima kasih atas kehadiran dan doa.' },
  ],
  gallery: [],
  bankAccounts: [
    {
      bank: 'Nama Bank',
      accountNumber: 'ISI_NOMOR_REKENING',
      accountName: 'Nama Pemilik Rekening',
    },
  ],
  coverPhotoUrl: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft',
};


export const TEMPLATE_THEMES: Record<TemplateId, TemplateTheme> = {
  'playful-garden': {
    id: 'playful-garden',
    name: 'Playful Garden',
    description: 'Ilustrasi bunga, warna pastel ceria, dan nuansa taman yang menyenangkan.',
    previewBg: 'linear-gradient(135deg, #fdf4f5 0%, #fce7f3 50%, #f0fdf4 100%)',
    fonts: { heading: 'Dancing Script', body: 'Inter', accent: 'Playfair Display' },
    colors: {
      primary: '#ec4899',
      secondary: '#a3e635',
      background: '#fdf4f5',
      surface: '#fce7f3',
      text: '#4a1942',
      muted: '#9d4e8a',
      border: '#f9a8d4',
    },
    decorations: ['🌸', '🌿', '🦋', '🌷', '✨', '🌼'],
    layout: 'centered',
    animationStyle: 'gentle',
  },
  'retro-love': {
    id: 'retro-love',
    name: 'Retro Love Story',
    description: 'Tipografi ekspresif, gaya scrapbook, bentuk geometris, dan warna retro.',
    previewBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fca5a1 100%)',
    fonts: { heading: 'Abril Fatface', body: 'Inter', accent: 'Dancing Script' },
    colors: {
      primary: '#dc2626',
      secondary: '#d97706',
      background: '#fef9f0',
      surface: '#fef3c7',
      text: '#1c1917',
      muted: '#78350f',
      border: '#fde68a',
    },
    decorations: ['♡', '★', '✦', '▲', '◆', '☆'],
    layout: 'scrapbook',
    animationStyle: 'bold',
  },
  'modern-editorial': {
    id: 'modern-editorial',
    name: 'Modern Editorial',
    description: 'Layout asimetris, tipografi berani, foto besar, dan animasi minimalis.',
    previewBg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #1e293b 100%)',
    fonts: { heading: 'Playfair Display', body: 'Inter', accent: 'JetBrains Mono' },
    colors: {
      primary: '#0f172a',
      secondary: '#6366f1',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
    },
    decorations: ['—', '·', '/', '×'],
    layout: 'asymmetric',
    animationStyle: 'minimal',
  },
  'olive-linen': {
    id: 'olive-linen',
    name: 'Olive & Linen',
    description: 'Palet zaitun dan krem, bingkai tipis, serta tipografi serif yang tenang dan elegan.',
    previewBg: 'linear-gradient(135deg, #f7f4ec 0%, #e6e5d8 52%, #39483b 100%)',
    fonts: { heading: 'Playfair Display', body: 'Inter', accent: 'Dancing Script' },
    colors: {
      primary: '#39483b',
      secondary: '#a77b51',
      background: '#f7f4ec',
      surface: '#fffdf8',
      text: '#30352e',
      muted: '#77796e',
      border: '#d9d7c8',
    },
    decorations: ['✦', '❧', '—'],
    layout: 'centered',
    animationStyle: 'gentle',
  },
};


