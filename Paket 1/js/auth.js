/**
 * auth.js — Multi-user authentication dengan isolasi data per akun
 * Setiap user memiliki namespace data tersendiri di localStorage.
 * Password disimpan sebagai btoa (obfuscation ringan, cukup untuk data browser-only).
 */
const Auth = (() => {
  const KEY_SESSION = 'pf_session';
  const KEY_USERS   = 'pf_users';

  // ── Helpers ──────────────────────────────────────────────
  function _getUsers() {
    return Storage.get(KEY_USERS, []);
  }

  function _saveUsers(users) {
    Storage.set(KEY_USERS, users);
  }

  function _initDefaultUser() {
    if (_getUsers().length === 0) {
      _saveUsers([{
        id: 'u1',
        username: 'admin',
        passwordHash: btoa('admin123'),
        displayName: 'Administrator',
        businessName: 'Studio Foto Admin',
        createdAt: Date.now()
      }]);
    }
  }

  // ── Namespace key untuk isolasi data per user ─────────────
  // Semua data (transaksi, proyek) disimpan dengan prefix userId
  function nsKey(key) {
    const session = Storage.get(KEY_SESSION, null);
    if (!session) return key;
    return `${key}_${session.userId}`;
  }

  // ── Auth API ─────────────────────────────────────────────
  function login(username, password) {
    _initDefaultUser();
    const users = _getUsers();
    const user  = users.find(u => u.username === username.trim().toLowerCase());
    if (!user) return { ok: false, error: 'Username tidak ditemukan.' };
    if (user.passwordHash !== btoa(password)) return { ok: false, error: 'Password salah.' };
    const session = {
      userId:       user.id,
      username:     user.username,
      displayName:  user.displayName,
      businessName: user.businessName || '',
      loginAt:      Date.now()
    };
    Storage.set(KEY_SESSION, session);
    return { ok: true, session };
  }

  function register(username, password, displayName, businessName) {
    _initDefaultUser();
    // Validation
    if (!username || username.trim().length < 3)
      return { ok: false, error: 'Username minimal 3 karakter.' };
    if (!password || password.length < 6)
      return { ok: false, error: 'Password minimal 6 karakter.' };
    if (!displayName || displayName.trim().length < 2)
      return { ok: false, error: 'Nama lengkap minimal 2 karakter.' };

    const users = _getUsers();
    const uname = username.trim().toLowerCase();
    if (users.find(u => u.username === uname))
      return { ok: false, error: 'Username sudah digunakan.' };

    const newUser = {
      id:           'u' + Date.now().toString(36),
      username:     uname,
      passwordHash: btoa(password),
      displayName:  displayName.trim(),
      businessName: (businessName || '').trim(),
      createdAt:    Date.now()
    };
    users.push(newUser);
    _saveUsers(users);
    return { ok: true };
  }

  function changePassword(currentPassword, newPassword) {
    const session = getSession();
    if (!session) return { ok: false, error: 'Belum login.' };
    if (!newPassword || newPassword.length < 6)
      return { ok: false, error: 'Password baru minimal 6 karakter.' };

    const users = _getUsers();
    const idx   = users.findIndex(u => u.id === session.userId);
    if (idx === -1) return { ok: false, error: 'User tidak ditemukan.' };
    if (users[idx].passwordHash !== btoa(currentPassword))
      return { ok: false, error: 'Password lama salah.' };

    users[idx].passwordHash = btoa(newPassword);
    _saveUsers(users);
    return { ok: true };
  }

  function logout() {
    Storage.remove(KEY_SESSION);
  }

  function getSession() {
    return Storage.get(KEY_SESSION, null);
  }

  function isLoggedIn() {
    return !!getSession();
  }

  return { login, register, changePassword, logout, getSession, isLoggedIn, nsKey };
})();

