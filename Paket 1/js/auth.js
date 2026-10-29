/** Authentication uses HttpOnly server sessions; passwords never enter browser storage. */
const Auth = (() => {
  let session = null;
  async function request(action, body) {
    const response = await fetch('/api/auth', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Layanan akun belum tersedia.');
    session = result.session || null;
    return result;
  }
  async function login(username, password) { return request('login', { username, password }); }
  async function register(username, password, displayName, businessName, inviteCode) {
    if (!username || username.trim().length < 3) return { ok: false, error: 'Username minimal 3 karakter.' };
    if (!password || password.length < 8) return { ok: false, error: 'Password minimal 8 karakter.' };
    if (!displayName || displayName.trim().length < 2) return { ok: false, error: 'Nama lengkap minimal 2 karakter.' };
    return request('register', { username, password, displayName, businessName, inviteCode });
  }
  async function changePassword(currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password baru minimal 8 karakter.' };
    try { return await request('change-password', { currentPassword, newPassword }); }
    catch (error) { return { ok: false, error: error.message }; }
  }
  async function logout() { try { await request('logout', {}); } catch {} finally { session = null; Storage.stop(); } }
  async function restore() {
    const response = await fetch('/api/auth', { credentials: 'same-origin' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Layanan akun belum tersedia.');
    session = response.ok ? result.session || null : null;
    return session;
  }
  function getSession() { return session; }
  function isLoggedIn() { return !!session; }
  function nsKey(key) { return key; }
  return { login, register, changePassword, logout, restore, getSession, isLoggedIn, nsKey };
})();
