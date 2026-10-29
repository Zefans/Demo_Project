import { currentUser, json, requireDb, sameOrigin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Silakan masuk kembali.' }, 401);
    const db = requireDb(env);
    const row = await db.prepare('SELECT name,invite_code AS inviteCode FROM workspaces WHERE id=?').bind(user.workspaceId).first();
    if (!row) return json({ error: 'Workspace tidak ditemukan.' }, 404);
    return json({ name: row.name, role: user.role, inviteCode: user.role === 'admin' ? row.inviteCode : null });
  } catch (error) { return json({ error: error.message || 'Gagal memuat workspace.' }, 503); }
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Permintaan ditolak.' }, 403);
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Silakan masuk kembali.' }, 401);
    if (user.role !== 'admin') return json({ error: 'Hanya admin yang dapat mengganti kode undangan.' }, 403);
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const inviteCode = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    await requireDb(env).prepare('UPDATE workspaces SET invite_code=? WHERE id=?').bind(inviteCode, user.workspaceId).run();
    return json({ ok: true, inviteCode });
  } catch (error) { return json({ error: error.message || 'Gagal mengganti kode undangan.' }, 503); }
}
