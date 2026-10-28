import type { InvitationData, RSVPEntry } from '../types/invitation';

const INVITATION_KEY = 'undangan_draft';
const RSVP_KEY = 'undangan_rsvp';

// ─── Draft / Invitation Storage ──────────────────────────────────────────────
// NOTE: This is localStorage-based for demo purposes only.
// In production, replace with API calls to a backend (e.g. Supabase).

export function saveDraft(data: InvitationData): void {
  try {
    const drafts = loadAllDrafts();
    drafts[data.id] = { ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(INVITATION_KEY, JSON.stringify(drafts));
  } catch {
    console.warn('[storage] Failed to save draft — localStorage may be full or unavailable.');
  }
}

export function loadDraft(id: string): InvitationData | null {
  try {
    const drafts = loadAllDrafts();
    return drafts[id] ?? null;
  } catch {
    return null;
  }
}

export function loadAllDrafts(): Record<string, InvitationData> {
  try {
    const raw = localStorage.getItem(INVITATION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function deleteDraft(id: string): void {
  try {
    const drafts = loadAllDrafts();
    delete drafts[id];
    localStorage.setItem(INVITATION_KEY, JSON.stringify(drafts));
  } catch {
    // noop
  }
}

// ─── RSVP Storage ────────────────────────────────────────────────────────────
// NOTE: localStorage-only demo. A real app needs a server endpoint.

export function saveRSVP(entry: RSVPEntry): void {
  try {
    const all = loadAllRSVPs();
    if (!all[entry.invitationId]) all[entry.invitationId] = [];
    // Prevent duplicate submission by same name (case-insensitive)
    const idx = all[entry.invitationId].findIndex(
      (r) => r.guestName.toLowerCase() === entry.guestName.toLowerCase()
    );
    if (idx >= 0) {
      all[entry.invitationId][idx] = entry;
    } else {
      all[entry.invitationId].push(entry);
    }
    localStorage.setItem(RSVP_KEY, JSON.stringify(all));
  } catch {
    console.warn('[storage] Failed to save RSVP.');
  }
}

export function loadRSVPs(invitationId: string): RSVPEntry[] {
  try {
    const all = loadAllRSVPs();
    return all[invitationId] ?? [];
  } catch {
    return [];
  }
}

function loadAllRSVPs(): Record<string, RSVPEntry[]> {
  try {
    const raw = localStorage.getItem(RSVP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

