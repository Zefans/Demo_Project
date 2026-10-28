// ─── Plan Configuration ────────────────────────────────────────────────────────
// Separates plan definitions from display logic.
// In production: plan validation MUST happen server-side.
// Never trust plan values sent from the frontend.

export type PlanId = 'free' | 'premium' | 'business';

export interface PlanLimit {
  maxInvitations: number;    // -1 = unlimited
  maxGalleryPhotos: number;
  maxRSVPs: number;          // -1 = unlimited
  maxBankAccounts: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: {
    monthly: number;  // IDR
    yearly: number;   // IDR (annual discount)
  };
  features: string[];
  limits: PlanLimit;
  availableTemplates: ('playful-garden' | 'retro-love' | 'modern-editorial' | 'all')[];
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Untuk mencoba',
    price: { monthly: 0, yearly: 0 },
    limits: {
      maxInvitations: 1,
      maxGalleryPhotos: 3,
      maxRSVPs: 50,
      maxBankAccounts: 1,
    },
    availableTemplates: ['playful-garden'],
    features: [
      '1 undangan aktif',
      'Template Playful Garden',
      'RSVP hingga 50 tamu',
      '3 foto galeri',
      'Link berbagi via WhatsApp',
      'Countdown otomatis',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: 'Untuk momen spesial',
    price: { monthly: 99_000, yearly: 890_000 },
    limits: {
      maxInvitations: 5,
      maxGalleryPhotos: 20,
      maxRSVPs: -1,
      maxBankAccounts: 3,
    },
    availableTemplates: ['all'],
    highlight: true,
    features: [
      '5 undangan aktif',
      'Semua template (3 template)',
      'RSVP tidak terbatas',
      '20 foto galeri',
      '3 rekening hadiah',
      'Personalisasi sapaan tamu',
      'Prioritas dukungan',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Untuk penyedia jasa',
    price: { monthly: 299_000, yearly: 2_690_000 },
    limits: {
      maxInvitations: -1,
      maxGalleryPhotos: -1,
      maxRSVPs: -1,
      maxBankAccounts: -1,
    },
    availableTemplates: ['all'],
    features: [
      'Undangan tidak terbatas',
      'Semua template + template eksklusif',
      'RSVP & galeri tidak terbatas',
      'Manajemen multi-klien',
      'Laporan RSVP per undangan',
      'White-label (coming soon)',
      'Dukungan prioritas tertinggi',
    ],
  },
};

export function formatIDR(amount: number): string {
  if (amount === 0) return 'Gratis';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

/** Check if a user's plan allows creating another invitation */
export function canCreateInvitation(plan: PlanId, currentCount: number): boolean {
  const limit = PLANS[plan].limits.maxInvitations;
  if (limit === -1) return true;
  return currentCount < limit;
}

/** Check if a template is available for a plan */
export function isTemplateAvailable(plan: PlanId, templateId: string): boolean {
  const allowed = PLANS[plan].availableTemplates;
  return allowed.includes('all') || allowed.includes(templateId as never);
}

