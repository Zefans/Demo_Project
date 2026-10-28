/**
 * storage.js — localStorage wrapper dengan JSON serialization
 * Mendukung isolasi data per user via Auth.nsKey()
 */
const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  // ── Tenant-scoped helpers ─────────────────────────────────
  // Gunakan ini untuk semua data bisnis (transaksi, proyek, dsb.)
  // Data tiap user tersimpan di key terpisah, tidak bisa diakses user lain.
  tGet(baseKey, fallback = null) {
    // Auth.nsKey() menambahkan suffix userId jika sudah login
    const key = (typeof Auth !== 'undefined') ? Auth.nsKey(baseKey) : baseKey;
    return this.get(key, fallback);
  },
  tSet(baseKey, value) {
    const key = (typeof Auth !== 'undefined') ? Auth.nsKey(baseKey) : baseKey;
    this.set(key, value);
  },
  tRemove(baseKey) {
    const key = (typeof Auth !== 'undefined') ? Auth.nsKey(baseKey) : baseKey;
    this.remove(key);
  }
};

