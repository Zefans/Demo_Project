/**
 * dashboard.js — Dashboard page renderer
 */
const Dashboard = (() => {
  let _chartBar = null;
  let _chartPie = null;

  function getTransactions() { return Storage.tGet('pf_transactions', []); }
  function getProjects()     { return Storage.tGet('pf_projects', []); }

  function calcStats() {
    const txs = getTransactions();
    const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance      = totalIncome - totalExpense;
    const projects     = getProjects();
    const activeProj   = projects.filter(p => p.status !== 'cancelled').length;
    const pendingPay   = projects.filter(p => p.status !== 'cancelled' && p.paidAmount < p.totalValue)
                                 .reduce((s, p) => s + (p.totalValue - p.paidAmount), 0);
    return { totalIncome, totalExpense, balance, activeProj, pendingPay };
  }

  // Last 6 months bar chart data
  function getMonthlyChartData() {
    const txs = getTransactions();
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    const income  = months.map(ym => txs.filter(t => t.type === 'income'  && Utils.toYearMonth(t.date) === ym).reduce((s, t) => s + t.amount, 0));
    const expense = months.map(ym => txs.filter(t => t.type === 'expense' && Utils.toYearMonth(t.date) === ym).reduce((s, t) => s + t.amount, 0));
    const labels  = months.map(ym => {
      const [y, m] = ym.split('-');
      return new Date(Number(y), Number(m) - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    });
    return { labels, income, expense };
  }

  function getRecentTx(n = 6) {
    return getTransactions().slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, n);
  }

  function getActiveProjects(n = 5) {
    return getProjects().filter(p => p.status !== 'cancelled').slice(-n).reverse();
  }

  function render() {
    const s   = calcStats();
    const rec = getRecentTx();
    const projs = getActiveProjects();

    const html = `
    <div class="section-header">
      <div>
        <h2>Dashboard</h2>
        <p>Ringkasan keuangan bisnis fotografi &amp; videografi Anda</p>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon income">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Total Pemasukan</div>
          <div class="stat-value" id="stat-income">${Utils.formatRp(s.totalIncome)}</div>
          <div class="stat-sub">Semua waktu</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon expense">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Total Pengeluaran</div>
          <div class="stat-value" id="stat-expense">${Utils.formatRp(s.totalExpense)}</div>
          <div class="stat-sub">Semua waktu</div>
        </div>
      </div>
      <div class="stat-card balance-card">
        <div class="stat-icon balance">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Saldo</div>
          <div class="stat-value ${s.balance < 0 ? 'text-expense' : ''}" id="stat-balance">${Utils.formatRp(s.balance)}</div>
          <div class="stat-sub">Pemasukan - Pengeluaran</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon project">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Proyek Aktif</div>
          <div class="stat-value" id="stat-proj">${s.activeProj}</div>
          <div class="stat-sub">Sisa tagihan: ${Utils.formatRp(s.pendingPay)}</div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header">
          <h3>Pemasukan vs Pengeluaran (6 Bulan)</h3>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="chart-bar"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Proyek Terkini</h3>
          <a href="#" class="btn-outline btn-sm" data-nav="projects">Lihat Semua</a>
        </div>
        <div class="card-body" style="padding-top:12px;">
          ${projs.length === 0
            ? '<div class="empty-state"><p>Belum ada proyek.</p></div>'
            : projs.map(p => `
              <div class="project-dash-item">
                <div style="flex:1;min-width:0">
                  <div class="project-dash-name">${Utils.esc(p.clientName)}</div>
                  <div class="project-dash-meta">${Utils.esc(p.projectName)}</div>
                </div>
                <span class="badge badge-${_pStatus(p)}">${_payLabel(_pStatus(p))}</span>
              </div>`).join('')
          }
        </div>
      </div>
    </div>

    <div style="margin-top:20px;" class="card">
      <div class="card-header">
        <h3>Transaksi Terbaru</h3>
        <a href="#" class="btn-outline btn-sm" data-nav="transactions">Lihat Semua</a>
      </div>
      <div class="card-body" style="padding-top:10px;">
        ${rec.length === 0
          ? '<div class="empty-state"><p>Belum ada transaksi.</p></div>'
          : rec.map(t => `
            <div class="recent-tx-item">
              <div class="tx-dot ${t.type}"></div>
              <div class="tx-info">
                <div class="tx-desc">${Utils.esc(t.description)}</div>
                <div class="tx-date">${Utils.formatDate(t.date)} &bull; ${Utils.esc(t.category)}</div>
              </div>
              <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatRp(t.amount)}</div>
            </div>`).join('')
        }
      </div>
    </div>`;

    document.getElementById('main-content').innerHTML = html;

    // Chart.js bar
    const { labels, income, expense } = getMonthlyChartData();
    const ctxBar = document.getElementById('chart-bar');
    if (ctxBar) {
      if (_chartBar) _chartBar.destroy();
      _chartBar = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Pemasukan', data: income,  backgroundColor: '#16a34a', borderRadius: 5 },
            { label: 'Pengeluaran', data: expense, backgroundColor: '#dc2626', borderRadius: 5 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
          scales: {
            y: {
              ticks: { callback: v => 'Rp ' + (v >= 1e6 ? (v/1e6).toFixed(1)+'jt' : v >= 1e3 ? (v/1e3).toFixed(0)+'rb' : v), font: { size: 11 } },
              grid: { color: '#f0f1f3' }
            },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }

    // wire "Lihat Semua" nav links inside dashboard
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); App.navigate(el.dataset.nav); });
    });
  }

  function _payLabel(s) {
    return { pending: 'Belum Bayar', partial: 'DP', paid: 'Lunas' }[s] || (s || '-');
  }

  function _pStatus(p) {
    if (!p) return 'pending';
    if (p.paymentStatus) return p.paymentStatus;
    if (p.paidAmount <= 0)            return 'pending';
    if (p.paidAmount >= p.totalValue) return 'paid';
    return 'partial';
  }

  return { render };
})();

