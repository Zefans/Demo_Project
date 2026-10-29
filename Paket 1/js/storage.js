/** In-memory business-data cache backed by the same-origin Cloudflare API. */
const Storage = (() => {
  const cache = new Map();
  let syncTimer;
  let syncQueue = Promise.resolve();
  let ready = false;
  let dirty = false;
  let baseData = { transactions: [], projects: [], revision: 0 };

  function localKey(key) {
    const userId = typeof Auth !== 'undefined' ? Auth.getSession()?.userId : null;
    return userId && (key === 'pf_transactions' || key === 'pf_projects') ? `${key}_${userId}` : key;
  }

  function get(key, fallback = null) {
    if (cache.has(key)) return cache.get(key);
    try {
      const value = localStorage.getItem(localKey(key));
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  }

  function set(key, value) {
    cache.set(key, value);
    // Keep a local recovery copy; the D1 database remains the shared source of truth.
    try { localStorage.setItem(localKey(key), JSON.stringify(value)); } catch {}
    if (ready && (key === 'pf_transactions' || key === 'pf_projects')) { dirty = true; scheduleSync(); }
  }

  function remove(key) { cache.delete(key); try { localStorage.removeItem(key); } catch {} }
  function nsKey(key) { return key; }
  function tGet(key, fallback = null) { return get(key, fallback); }
  function tSet(key, value) { set(key, value); }
  function tRemove(key) { remove(key); }

  async function sync() {
    const snapshot = { transactions: get('pf_transactions', []), projects: get('pf_projects', []) };
    const response = await fetch('/api/data', {
      method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...snapshot, baseTransactions: baseData.transactions, baseProjects: baseData.projects, baseRevision: baseData.revision })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Gagal menyimpan data ke server.');
    baseData = { transactions: result.transactions || [], projects: result.projects || [], revision: result.revision || 0 };
    const unchanged = JSON.stringify(snapshot) === JSON.stringify({ transactions: get('pf_transactions', []), projects: get('pf_projects', []) });
    if (unchanged) {
      const serverMergedChanges = JSON.stringify(snapshot) !== JSON.stringify({ transactions: baseData.transactions, projects: baseData.projects });
      cache.set('pf_transactions', baseData.transactions);
      cache.set('pf_projects', baseData.projects);
      try {
        localStorage.setItem(localKey('pf_transactions'), JSON.stringify(baseData.transactions));
        localStorage.setItem(localKey('pf_projects'), JSON.stringify(baseData.projects));
      } catch {}
      if (serverMergedChanges) window.dispatchEvent(new CustomEvent('pf:data-updated'));
    }
    dirty = !unchanged;
    if (dirty) scheduleSync();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncQueue = syncQueue.then(sync).catch(error => {
        console.error(error);
        if (typeof Utils !== 'undefined') Utils.toast('Data belum tersimpan online. Periksa koneksi lalu muat ulang untuk mencoba lagi.', 'error');
        if (ready && dirty) setTimeout(() => { if (ready && dirty) scheduleSync(); }, 5000);
      });
    }, 350);
  }

  async function loadRemote() {
    const response = await fetch('/api/data', { credentials: 'same-origin' });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Tidak dapat memuat data online.');
    const data = await response.json();
    cache.set('pf_transactions', data.transactions || []);
    cache.set('pf_projects', data.projects || []);
    baseData = { transactions: data.transactions || [], projects: data.projects || [], revision: data.revision || 0 };
    try {
      localStorage.setItem(localKey('pf_transactions'), JSON.stringify(data.transactions || []));
      localStorage.setItem(localKey('pf_projects'), JSON.stringify(data.projects || []));
    } catch {}
    ready = true;
    dirty = false;
    return { hasData: !!data.hasData };
  }

  async function refreshRemote() {
    if (!ready || dirty || syncTimer) return false;
    const response = await fetch('/api/data', { credentials: 'same-origin' });
    if (!response.ok) return false;
    const data = await response.json();
    const nextTx = data.transactions || [];
    const nextProjects = data.projects || [];
    if (JSON.stringify(nextTx) === JSON.stringify(get('pf_transactions', [])) && JSON.stringify(nextProjects) === JSON.stringify(get('pf_projects', []))) return false;
    cache.set('pf_transactions', nextTx);
    cache.set('pf_projects', nextProjects);
    baseData = { transactions: nextTx, projects: nextProjects, revision: data.revision || 0 };
    try {
      localStorage.setItem(localKey('pf_transactions'), JSON.stringify(nextTx));
      localStorage.setItem(localKey('pf_projects'), JSON.stringify(nextProjects));
    } catch {}
    window.dispatchEvent(new CustomEvent('pf:data-updated'));
    return true;
  }

  async function importLocal(data) {
    cache.set('pf_transactions', data.transactions || []);
    cache.set('pf_projects', data.projects || []);
    await sync();
    ready = true;
  }

  function stop() { ready = false; dirty = false; baseData = { transactions: [], projects: [], revision: 0 }; clearTimeout(syncTimer); cache.clear(); }
  return { get, set, remove, nsKey, tGet, tSet, tRemove, loadRemote, refreshRemote, importLocal, stop };
})();
