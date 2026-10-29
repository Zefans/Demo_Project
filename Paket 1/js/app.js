/**
 * app.js — Main application controller
 * Handles routing, login/logout, register, sidebar, and page navigation.
 */
const App = (() => {
  const PAGES = {
    dashboard:    { title: 'Dashboard',         render: () => Dashboard.render() },
    transactions: { title: 'Transaksi',          render: () => Transactions.render() },
    projects:     { title: 'Manajemen Proyek',   render: () => Projects.render() },
    reports:      { title: 'Laporan Keuangan',   render: () => Reports.render() },
    settings:     { title: 'Pengaturan',         render: () => _renderSettings() }
  };

  let _currentPage = 'dashboard';
  const oldSession = Storage.get('pf_session', null);
  const legacyData = oldSession ? {
    transactions: Storage.get(`pf_transactions_${oldSession.userId}`, []),
    projects: Storage.get(`pf_projects_${oldSession.userId}`, [])
  } : { transactions: [], projects: [] };

  // ─── Boot ─────────────────────────────────────────────────
  async function init() {
    _showLogin();
    try {
      if (await Auth.restore()) await _showApp();
    } catch (error) {
      const err = document.getElementById('login-error');
      err.textContent = error.message;
      err.classList.add('show');
    }

    // Login form
    document.getElementById('login-form').addEventListener('submit', _handleLogin);
    document.getElementById('btn-toggle-pw').addEventListener('click', _togglePw);
    document.getElementById('btn-show-register').addEventListener('click', _showRegister);
    document.getElementById('btn-show-login').addEventListener('click', _showLogin);
    document.getElementById('register-form').addEventListener('submit', _handleRegister);

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await Auth.logout();
      _showLogin();
      Utils.toast('Berhasil keluar.', 'info');
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        navigate(item.dataset.page);
        _closeSidebar();
      });
    });

    // Hamburger / sidebar
    document.getElementById('btn-hamburger').addEventListener('click', _openSidebar);
    document.getElementById('btn-sidebar-close').addEventListener('click', _closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', _closeSidebar);

    // Modal close
    document.getElementById('btn-modal-close').addEventListener('click', Utils.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) Utils.closeModal();
    });

    window.addEventListener('pf:data-updated', () => {
      if (Auth.isLoggedIn() && document.getElementById('modal-overlay').classList.contains('hidden')) navigate(_currentPage);
    });
    setInterval(() => {
      const modalOpen = !document.getElementById('modal-overlay').classList.contains('hidden');
      if (Auth.isLoggedIn() && !modalOpen) Storage.refreshRemote().catch(console.error);
    }, 5000);
  }

  // ─── Login / Logout ───────────────────────────────────────
  async function _handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');

    document.getElementById('err-username').textContent = '';
    document.getElementById('err-password').textContent = '';
    errEl.classList.remove('show');

    if (!username) { document.getElementById('err-username').textContent = 'Username wajib diisi.'; return; }
    if (!password) { document.getElementById('err-password').textContent = 'Password wajib diisi.'; return; }

    try {
      const result = await Auth.login(username, password);
      if (await _showApp()) Utils.toast(`Selamat datang, ${result.session.displayName}!`, 'success');
    } catch (error) {
      errEl.textContent = error.message;
      errEl.classList.add('show');
    }
  }

  // ─── Register ─────────────────────────────────────────────
  async function _handleRegister(e) {
    e.preventDefault();
    const username     = document.getElementById('reg-username').value.trim();
    const password     = document.getElementById('reg-password').value;
    const password2    = document.getElementById('reg-password2').value;
    const displayName  = document.getElementById('reg-name').value.trim();
    const businessName = document.getElementById('reg-business').value.trim();
    const inviteCode   = document.getElementById('reg-invite-code').value.trim();
    const errEl        = document.getElementById('register-error');

    errEl.classList.remove('show');
    ['reg-username','reg-password','reg-password2','reg-name'].forEach(id => {
      document.getElementById('err-' + id)?.textContent && (document.getElementById('err-' + id).textContent = '');
    });

    if (password !== password2) {
      document.getElementById('err-reg-password2').textContent = 'Password tidak cocok.';
      return;
    }

    try {
      const result = await Auth.register(username, password, displayName, businessName, inviteCode);
      if (!result.ok) throw new Error(result.error);
      errEl.classList.remove('show');
      Utils.toast(result.role === 'user' ? 'Akun dibuat dan bergabung ke workspace. Silakan login.' : 'Workspace berhasil dibuat. Silakan login sebagai admin.', 'success');
      _showLogin();
      document.getElementById('login-username').value = username;
    } catch (error) {
      errEl.textContent = error.message;
      errEl.classList.add('show');
    }
  }

  function _togglePw() {
    const inp  = document.getElementById('login-password');
    const icon = document.getElementById('eye-icon');
    if (inp.type === 'password') {
      inp.type = 'text';
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      inp.type = 'password';
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }

  // ─── Show/hide pages ──────────────────────────────────────
  function _showLogin() {
    document.getElementById('page-login').classList.add('active');
    document.getElementById('page-register').classList.remove('active');
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.remove('show');
  }

  function _showRegister() {
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-register').classList.add('active');
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('register-error').classList.remove('show');
    document.getElementById('register-form').reset();
  }

  async function _showApp() {
    try {
      const remote = await Storage.loadRemote();
      if (!remote.hasData && (legacyData.transactions.length || legacyData.projects.length) && window.confirm('Data lama yang tersimpan di perangkat ini ditemukan. Impor data tersebut ke akun online?')) {
        await Storage.importLocal(legacyData);
        Utils.toast('Data lama berhasil disimpan ke akun online.', 'success');
      }
    } catch (error) {
      _showLogin();
      const err = document.getElementById('login-error');
      err.textContent = error.message;
      err.classList.add('show');
      return false;
    }
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-register').classList.remove('active');
    document.getElementById('app-shell').classList.remove('hidden');

    const session = Auth.getSession();
    if (session) {
      document.getElementById('topbar-username').textContent = session.displayName;
      document.querySelector('.avatar').textContent = session.displayName.charAt(0).toUpperCase();
      // Update sidebar business name
      const bizEl = document.getElementById('sidebar-business');
      if (bizEl) bizEl.textContent = session.businessName || 'Studio Saya';
    }

    navigate(_currentPage);
    return true;
  }

  // ─── Settings Page ────────────────────────────────────────
  function _renderSettings() {
    const session = Auth.getSession();
    document.getElementById('main-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2>Pengaturan Akun</h2>
        <p>Kelola akun dan keamanan bisnis Anda</p>
      </div>
    </div>

    <div class="card" style="max-width:520px;margin-bottom:20px">
      <div class="card-header"><h3>Informasi Akun</h3></div>
      <div class="card-body" style="padding-top:16px">
        <div style="display:grid;grid-template-columns:140px 1fr;gap:10px 16px;font-size:14px">
          <div style="color:var(--clr-muted);font-weight:600">Username</div>
          <div>${Utils.esc(session?.username || '-')}</div>
          <div style="color:var(--clr-muted);font-weight:600">Nama</div>
          <div>${Utils.esc(session?.displayName || '-')}</div>
          <div style="color:var(--clr-muted);font-weight:600">Bisnis</div>
          <div>${Utils.esc(session?.businessName || '-')}</div>
          <div style="color:var(--clr-muted);font-weight:600">Paket</div>
          <div><span class="badge badge-partial" style="font-size:12px">Paket A — Basic Finance</span></div>
        </div>
      </div>
    </div>

    <div class="card" style="max-width:520px;margin-bottom:20px">
      <div class="card-header"><h3>Workspace Bersama</h3></div>
      <div class="card-body" style="padding-top:16px">
        <p style="margin:0 0 8px"><strong>Workspace:</strong> <span id="workspace-name">Memuat…</span></p>
        <p style="margin:0 0 12px"><strong>Peran Anda:</strong> <span id="workspace-role">${session?.role === 'admin' ? 'Admin' : 'User'}</span></p>
        <div id="workspace-invite-panel" class="hidden">
          <p style="margin:0 0 8px">Bagikan kode ini kepada user yang perlu bergabung:</p>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <code id="workspace-invite-code" style="font-size:18px;font-weight:800;letter-spacing:2px"></code>
            <button type="button" class="btn-outline btn-sm" id="btn-copy-invite">Salin kode</button>
            <button type="button" class="btn-outline btn-sm" id="btn-rotate-invite">Ganti kode</button>
          </div>
          <small>Kode lama tidak berlaku setelah diganti.</small>
        </div>
        <p id="workspace-user-help" class="hidden" style="margin:0">Minta kode undangan workspace kepada admin untuk mengajak anggota lain.</p>
        <div id="workspace-error" class="form-error"></div>
      </div>
    </div>

    <div class="card" style="max-width:520px">
      <div class="card-header"><h3>Ubah Password</h3></div>
      <div class="card-body" style="padding-top:16px">
        <form id="change-pw-form" novalidate>
          <div class="form-group">
            <label>Password Lama <span style="color:red">*</span></label>
            <input type="password" id="cpw-old" placeholder="Password saat ini" />
            <span class="field-error" id="cpw-err"></span>
          </div>
          <div class="form-group">
            <label>Password Baru <span style="color:red">*</span></label>
            <input type="password" id="cpw-new" placeholder="Minimal 8 karakter" />
          </div>
          <div class="form-group">
            <label>Konfirmasi Password Baru <span style="color:red">*</span></label>
            <input type="password" id="cpw-new2" placeholder="Ulangi password baru" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Simpan Password</button>
          </div>
        </form>
      </div>
    </div>`;

    const workspaceError = document.getElementById('workspace-error');
    fetch('/api/workspace', { credentials: 'same-origin' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat workspace.');
      document.getElementById('workspace-name').textContent = data.name;
      document.getElementById('workspace-role').textContent = data.role === 'admin' ? 'Admin' : 'User';
      if (data.role === 'admin') {
        document.getElementById('workspace-invite-panel').classList.remove('hidden');
        document.getElementById('workspace-invite-code').textContent = data.inviteCode;
      } else {
        document.getElementById('workspace-user-help').classList.remove('hidden');
      }
    }).catch(error => { workspaceError.textContent = error.message; workspaceError.classList.add('show'); });
    document.getElementById('btn-copy-invite').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(document.getElementById('workspace-invite-code').textContent);
        Utils.toast('Kode undangan disalin.', 'success');
      } catch { Utils.toast('Kode tidak dapat disalin otomatis. Silakan salin kodenya.', 'info'); }
    });
    document.getElementById('btn-rotate-invite').addEventListener('click', async () => {
      if (!window.confirm('Ganti kode undangan? Kode yang lama akan langsung tidak berlaku.')) return;
      try {
        const response = await fetch('/api/workspace', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Gagal mengganti kode.');
        document.getElementById('workspace-invite-code').textContent = result.inviteCode;
        Utils.toast('Kode undangan berhasil diganti.', 'success');
      } catch (error) { workspaceError.textContent = error.message; workspaceError.classList.add('show'); }
    });

    document.getElementById('change-pw-form').addEventListener('submit', async e => {
      e.preventDefault();
      const old  = document.getElementById('cpw-old').value;
      const nw   = document.getElementById('cpw-new').value;
      const nw2  = document.getElementById('cpw-new2').value;
      const errEl = document.getElementById('cpw-err');
      errEl.textContent = '';
      if (nw !== nw2) { errEl.textContent = 'Password baru tidak cocok.'; return; }
      const result = await Auth.changePassword(old, nw);
      if (result.ok) {
        Utils.toast('Password berhasil diubah.', 'success');
        document.getElementById('change-pw-form').reset();
      } else {
        errEl.textContent = result.error;
      }
    });
  }

  // ─── Navigation ───────────────────────────────────────────
  function navigate(page) {
    if (!PAGES[page]) page = 'dashboard';
    _currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update topbar title
    document.getElementById('topbar-title').textContent = PAGES[page].title;

    // Render page
    PAGES[page].render();
  }

  // ─── Sidebar ─────────────────────────────────────────────
  function _openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function _closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
    document.body.style.overflow = '';
  }

  // ─── Demo seed data ───────────────────────────────────────
  // Seed demo data — hanya untuk akun yang baru dibuat (per-user namespace)
  function _seedDemoData() {
    const seedKey = 'pf_seeded';
    if (Storage.tGet(seedKey, false)) return;   // sudah di-seed untuk user ini

    function _d(monthOffset, day) {
      const d = new Date();
      d.setDate(day);
      d.setMonth(d.getMonth() + monthOffset);
      return d.toISOString().slice(0, 10);
    }

    const txs = [
      { type:'income',  date:_d(-1,  5), description:'DP Proyek Foto Pernikahan Demo', category:'DP Proyek',          amount:2500000, note:'Contoh pembayaran muka proyek' },
      { type:'income',  date:_d(-1, 10), description:'Pelunasan Sesi Foto Demo',       category:'Pelunasan Proyek',     amount:3000000, note:'' },
      { type:'income',  date:_d(-1, 14), description:'Jasa Foto Produk Kosmetik',      category:'Jasa Foto Produk',     amount:1500000, note:'10 produk' },
      { type:'expense', date:_d(-1,  8), description:'Pembelian SD Card 128GB x2',     category:'Pembelian Aksesori',   amount:450000,  note:'' },
      { type:'expense', date:_d(-1, 11), description:'Biaya Transport Pemotretan',     category:'Biaya Transport',      amount:280000,  note:'' },
      { type:'income',  date:_d(0,   3), description:'DP Proyek Video Korporat Demo', category:'DP Proyek',           amount:5000000, note:'Contoh pembayaran muka proyek' },
      { type:'income',  date:_d(0,   7), description:'Jasa Foto Portrait',             category:'Jasa Foto Portrait',   amount:800000,  note:'' },
      { type:'expense', date:_d(0,   9), description:'Langganan Adobe Creative Cloud', category:'Software & Editing',   amount:349000,  note:'Bulanan' },
      { type:'expense', date:_d(0,  12), description:'Cetak Album Wedding',            category:'Cetak Foto',           amount:750000,  note:'Ukuran 30x30' },
      { type:'income',  date:_d(0,  15), description:'Sewa Drone DJI Mini 3',         category:'Sewa Peralatan',       amount:600000,  note:'1 hari' },
    ];
    txs.forEach(t => {
      const list = Storage.tGet('pf_transactions', []);
      list.unshift({ ...t, id: Utils.uid(), createdAt: Date.now() - Math.random() * 1e9 });
      Storage.tSet('pf_transactions', list);
    });

    const projs = [
      {
        clientName:'Klien Demo A', phone:'', projectName:'Proyek Foto Pernikahan Demo',
        projectType:'Foto + Video', shootDate:_d(0, 20), totalValue:5000000, dp:2500000,
        paidAmount:2500000, paymentStatus:'partial', status:'active', location:'Lokasi Simulasi',
        notes:'Contoh paket foto dan video untuk data demo.',
        paymentHistory:[{ id:Utils.uid(), date:_d(-1, 5), amount:2500000, note:'DP 50%' }]
      },
      {
        clientName:'Klien Demo B', phone:'', projectName:'Video Profil Demo',
        projectType:'Videografi', shootDate:_d(0, 25), totalValue:12500000, dp:5000000,
        paidAmount:5000000, paymentStatus:'partial', status:'active', location:'Lokasi Simulasi',
        notes:'Contoh proyek videografi untuk data demo.',
        paymentHistory:[{ id:Utils.uid(), date:_d(0, 3), amount:5000000, note:'DP 40%' }]
      },
      {
        clientName:'Klien Demo C', phone:'', projectName:'Sesi Foto Prewedding Demo',
        projectType:'Fotografi', shootDate:_d(-1, 20), totalValue:3000000, dp:1500000,
        paidAmount:3000000, paymentStatus:'paid', status:'completed', location:'Lokasi Simulasi',
        notes:'Contoh sesi foto untuk data demo.',
        paymentHistory:[
          { id:Utils.uid(), date:_d(-1, 1),  amount:1500000, note:'DP 50%' },
          { id:Utils.uid(), date:_d(-1, 10), amount:1500000, note:'Pelunasan' }
        ]
      }
    ];
    projs.forEach(p => {
      const list = Storage.tGet('pf_projects', []);
      list.unshift({ ...p, id: Utils.uid(), createdAt: Date.now() - Math.random() * 1e9 });
      Storage.tSet('pf_projects', list);
    });

    Storage.tSet(seedKey, true);
  }

  return { init, navigate };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', App.init);

