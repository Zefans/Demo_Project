// ─── Invitation Service (multi-user, user-isolated) ──────────────────────────
// Each user can only access their own invitations.
// In production: replace localStorage calls with Supabase queries.
// Supabase RLS ensures server-side isolation — localStorage is demo only.

import type { InvitationData } from '../types/invitation';
import { DEFAULT_INVITATION } from '../types/invitation';

const KEY = 'undangan_invitations_v2';

function loadAll(): Record<string, InvitationData[]> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, InvitationData[]>): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Get all invitations belonging to a user */
export function getUserInvitations(userId: string): InvitationData[] {
  const all = loadAll();
  return all[userId] ?? [];
}

/** Save (create or update) an invitation — only allowed for the owning user */
export function saveInvitation(userId: string, invitation: InvitationData): void {
  const all = loadAll();
  if (!all[userId]) all[userId] = [];
  const idx = all[userId].findIndex(inv => inv.id === invitation.id);
  const updated = { ...invitation, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[userId][idx] = updated;
  } else {
    all[userId].push(updated);
  }
  saveAll(all);
}

/** Delete invitation — only for owning user */
export function deleteInvitation(userId: string, invitationId: string): void {
  const all = loadAll();
  if (!all[userId]) return;
  all[userId] = all[userId].filter(inv => inv.id !== invitationId);
  saveAll(all);
}

/** Publish / unpublish an invitation */
export function setInvitationStatus(
  userId: string,
  invitationId: string,
  status: 'draft' | 'published'
): void {
  const all = loadAll();
  const inv = all[userId]?.find(i => i.id === invitationId);
  if (!inv) return;
  inv.status = status;
  inv.updatedAt = new Date().toISOString();
  saveAll(all);
}

/** Create a new invitation with a unique id for a user */
export function createNewInvitation(userId: string): InvitationData {
  const inv: InvitationData = {
    ...DEFAULT_INVITATION,
    id: `inv-${userId.slice(0, 6)}-${Date.now()}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveInvitation(userId, inv);
  return inv;
}

/** Get a single public invitation by id (no auth required for published) */
export function getPublicInvitation(invitationId: string): InvitationData | null {
  const all = loadAll();
  for (const invitations of Object.values(all)) {
    const found = invitations.find(inv => inv.id === invitationId);
    if (found && found.status === 'published') return found;
  }
  // Fallback: also check legacy single-draft storage
  try {
    const legacy = localStorage.getItem('undangan_draft');
    if (legacy) {
      const drafts = JSON.parse(legacy) as Record<string, InvitationData>;
      if (drafts[invitationId]) return drafts[invitationId];
    }
  } catch {
    // noop
  }
  return null;
}

