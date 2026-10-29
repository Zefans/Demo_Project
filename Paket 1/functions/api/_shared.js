const SESSION_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
export function requireDb(env) {
  if (!env.DB) throw new Error('Database belum terhubung. Selesaikan pengaturan Cloudflare D1 sesuai README Paket A.');
  return env.DB;
}
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}
export function base64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
export async function digest(value) { return base64(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
export async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return base64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 210000 }, key, 256));
}
export function cookie(token, maxAge = SESSION_SECONDS) {
  return `pf_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
export async function currentUser(request, env) {
  const match = request.headers.get('Cookie')?.match(/(?:^|;\s*)pf_session=([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const db = requireDb(env);
  const tokenHash = await digest(match[1]);
  const row = await db.prepare(`SELECT u.id, u.username, u.display_name AS displayName,
    COALESCE(w.name,u.business_name) AS businessName, m.workspace_id AS workspaceId, m.role
    FROM sessions s JOIN users u ON u.id=s.user_id
    JOIN memberships m ON m.user_id=u.id JOIN workspaces w ON w.id=m.workspace_id
    WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}
export async function issueSession(db, userId) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token), userId, Math.floor(Date.now() / 1000) + SESSION_SECONDS).run();
  return token;
}
export function validText(value, min, max) { return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max; }
