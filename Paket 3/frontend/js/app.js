/* ── API Client ───────────────────────────────────────────────────────── */
const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('/api' + path, opts);
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.error || 'Unknown error', data };
    return data;
  },
  get: (path) => API.request('GET', path),
  post: (path, body) => API.request('POST', path, body),
  put: (path, body) => API.request('PUT', path, body),
  delete: (path) => API.request('DELETE', path)
};

/* ── Formatters ───────────────────────────────────────────────────────── */
const FMT = {
  money(n) {
    if (n === null || n === undefined) return '-';
    return 'Rp ' + Number(n).toLocaleString('id-ID');
  },
  date(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateInput(d) {
    if (!d) return '';
    return d.split('T')[0];
  },
  percent(n, total) {
    if (!total) return 0;
    return Math.min(100, Math.round((n / total) * 100));
  },
  monthName(m) {
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    return months[parseInt(m) - 1] || m;
  }
};

/* ── Toast ────────────────────────────────────────────────────────────── */
const Toast = {
  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    t.innerHTML = `<span style="font-size:16px">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error: (m) => Toast.show(m, 'error'),
  warning: (m) => Toast.show(m, 'warning'),
  info: (m) => Toast.show(m, 'info')
};

/* ── Modal Helper ─────────────────────────────────────────────────────── */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
};

/* ── Status Badge Helper ──────────────────────────────────────────────── */
const Badges = {
  project(status) {
    const map = {
      pending: ['badge-gray', 'Pending'],
      dp_paid: ['badge-info', 'DP Terbayar'],
      in_progress: ['badge-warning', 'Berjalan'],
      done: ['badge-primary', 'Selesai'],
      paid_off: ['badge-success', 'Lunas'],
      cancelled: ['badge-danger', 'Dibatal']
    };
    const [cls, label] = map[status] || ['badge-gray', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },
  transaction(type) {
    return type === 'income'
      ? '<span class="badge badge-success">Pemasukan</span>'
      : '<span class="badge badge-danger">Pengeluaran</span>';
  },
  source(source) {
    return source === 'online'
      ? '<span class="badge badge-primary">Online</span>'
      : '<span class="badge badge-gray">Manual</span>';
  },
  invoice(status) {
    const map = {
      pending: ['badge-warning', 'Menunggu'],
      paid: ['badge-success', 'Terbayar'],
      expired: ['badge-gray', 'Kedaluwarsa'],
      cancelled: ['badge-gray', 'Dibatal'],
      failed: ['badge-danger', 'Gagal'],
      challenge: ['badge-warning', 'Perlu Verifikasi']
    };
    const [cls, label] = map[status] || ['badge-gray', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },
  projectType(type) {
    const map = {
      photography: ['badge-primary', '📷 Foto'],
      videography: ['badge-purple', '🎥 Video'],
      hybrid: ['badge-info', '📷🎥 Hybrid']
    };
    const [cls, label] = map[type] || ['badge-gray', type];
    return `<span class="badge ${cls}">${label}</span>`;
  }
};

/* ── App State ────────────────────────────────────────────────────────── */
const State = {
  user: null,
  currentPage: null
};

/* ── Page Router ──────────────────────────────────────────────────────── */
const Router = {
  pages: {},
  register(name, fn) { this.pages[name] = fn; },
  async navigate(page, params = {}) {
    State.currentPage = page;
    const content = document.getElementById('page-content');
    if (!content) return;
    content.innerHTML = '<div style="padding:40px;text-align:center"><div class="spinner"></div></div>';

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    try {
      if (this.pages[page]) {
        await this.pages[page](content, params);
      } else {
        content.innerHTML = '<div class="page-content"><p>Halaman tidak ditemukan</p></div>';
      }
    } catch (err) {
      console.error(err);
      content.innerHTML = `<div class="page-content"><div class="alert alert-danger">Gagal memuat halaman: ${err.message}</div></div>`;
    }
  }
};

/* ── Auth Guard ───────────────────────────────────────────────────────── */
async function checkAuth() {
  try {
    const data = await API.get('/auth/me');
    if (!data.authenticated) showLogin();
    else {
      State.user = data.user;
      showApp();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
}

function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  // Set user info in sidebar
  if (State.user) {
    document.getElementById('sidebar-user-name').textContent = State.user.fullName || State.user.username;
    document.getElementById('sidebar-user-avatar').textContent = (State.user.fullName || State.user.username).charAt(0).toUpperCase();
  }
  Router.navigate('dashboard');
}

/* ── Config loader — loads Midtrans Snap.js dynamically ──────────────── */
let _appConfig = null;
async function initConfig() {
  try {
    _appConfig = await API.get('/config');
    // Dynamically load Snap.js with the correct client key
    if (_appConfig.midtransClientKey) {
      const snapUrl = _appConfig.midtransIsProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = snapUrl;
        s.setAttribute('data-client-key', _appConfig.midtransClientKey);
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  } catch (e) {
    console.warn('Config load failed (Midtrans Snap not loaded):', e.message);
  }
}

function getAppConfig() { return _appConfig; }

/* ── Initialize ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await initConfig();
  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Masuk...';
    try {
      const data = await API.post('/auth/login', {
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value
      });
      State.user = data.user;
      showApp();
    } catch (err) {
      errEl.textContent = err.message || 'Login gagal';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Masuk';
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await API.post('/auth/logout');
    State.user = null;
    showLogin();
    Toast.success('Berhasil keluar');
  });

  // Sidebar nav
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      Router.navigate(el.dataset.page);
      // Close mobile sidebar
      document.querySelector('.sidebar').classList.remove('open');
      document.querySelector('.sidebar-overlay').classList.remove('open');
    });
  });

  // Mobile sidebar toggle
  document.getElementById('btn-menu-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.sidebar-overlay').classList.toggle('open');
  });
  document.querySelector('.sidebar-overlay').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay').classList.remove('open');
  });

  // Modal close on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
    if (e.target.classList.contains('modal-close')) {
      const overlay = e.target.closest('.modal-overlay');
      if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
    }
  });

  // Register all pages
  Pages.registerAll();

  // Check auth & navigate
  await checkAuth();
});

