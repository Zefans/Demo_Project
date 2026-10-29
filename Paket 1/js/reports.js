/**
 * reports.js — Financial reports with charts
 */
const Reports = (() => {
  let _chartLine = null;
  let _chartPie  = null;
  let _selectedYear = new Date().getFullYear();

  function getTransactions() { return Storage.tGet('pf_transactions', []); }
  function getProjects()     { return Storage.tGet('pf_projects',     []); }

  // ─── Monthly summary data ─────────────────────────────────
  function _getMonthlySummary(year) {
    const txs = getTransactions();
    const months = Array.from({ length: 12 }, (_, i) => {
      const ym    = `${year}-${String(i + 1).padStart(2, '0')}`;
      const inc   = txs.filter(t => t.type === 'income'  && Utils.toYearMonth(t.date) === ym).reduce((s, t) => s + t.amount, 0);
      const exp   = txs.filter(t => t.type === 'expense' && Utils.toYearMonth(t.date) === ym).reduce((s, t) => s + t.amount, 0);
      return { ym, label: new Date(year, i).toLocaleDateString('id-ID', { month: 'short' }), income: inc, expense: exp, net: inc - exp };
    });
    return months;
  }

  // ─── Category breakdown ───────────────────────────────────
  function _getCategoryBreakdown(year, type) {
    const txs = getTransactions().filter(t => t.type === type && new Date(t.date).getFullYear() === year);
    const map  = {};
    txs.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  const COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#c2410c','#0d9488','#9333ea','#ca8a04','#0284c7','#15803d'];

  // ─── CSV Export ───────────────────────────────────────────
  function _exportCSV(type) {
    const txs = getTransactions();
    const yearTxs = txs.filter(t => new Date(t.date).getFullYear() === _selectedYear);

    let rows, filename;
    if (type === 'transactions') {
      rows = [
        ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah', 'Catatan'],
        ...yearTxs.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => [
          t.date,
          t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
          t.category,
          t.description,
          t.amount,
          t.note || ''
        ])
      ];
      filename = `transaksi_${_selectedYear}.csv`;
    } else {
      // Monthly summary
      const months = _getMonthlySummary(_selectedYear);
      let cum = 0;
      rows = [
        ['Bulan', 'Pemasukan', 'Pengeluaran', 'Laba/Rugi', 'Saldo Kumulatif'],
        ...months.map(m => {
          cum += m.net;
          return [m.label, m.income, m.expense, m.net, cum];
        })
      ];
      filename = `laporan_bulanan_${_selectedYear}.csv`;
    }

    const csv = rows.map(r => r.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Utils.toast(`Ekspor ${filename} berhasil.`, 'success');
  }

  // ─── Render ──────────────────────────────────────────────
  function render() {
    const yearNow = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => yearNow - i)
      .map(y => `<option value="${y}" ${y === _selectedYear ? 'selected' : ''}>${y}</option>`).join('');

    document.getElementById('main-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2>Laporan Keuangan</h2>
        <p>Analisis pemasukan, pengeluaran, dan profitabilitas bisnis Anda</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label style="font-weight:600;font-size:13.5px">Tahun:</label>
        <select id="report-year" class="report-controls" style="padding:7px 13px;border:1.5px solid var(--clr-border);border-radius:6px;font-size:13.5px;outline:none;background:#fff">${yearOptions}</select>
        <button id="btn-export-tx" class="btn-outline btn-sm">⬇ Ekspor Transaksi</button>
        <button id="btn-export-monthly" class="btn-outline btn-sm">⬇ Ekspor Bulanan</button>
      </div>
    </div>

    <div id="report-content"></div>`;

    document.getElementById('report-year').addEventListener('change', e => {
      _selectedYear = Number(e.target.value);
      _renderContent();
    });
    document.getElementById('btn-export-tx').addEventListener('click', () => _exportCSV('transactions'));
    document.getElementById('btn-export-monthly').addEventListener('click', () => _exportCSV('monthly'));
    _renderContent();
  }

  function _renderContent() {
    const months    = _getMonthlySummary(_selectedYear);
    const totalInc  = months.reduce((s, m) => s + m.income, 0);
    const totalExp  = months.reduce((s, m) => s + m.expense, 0);
    const totalNet  = totalInc - totalExp;

    const catInc  = _getCategoryBreakdown(_selectedYear, 'income');
    const catExp  = _getCategoryBreakdown(_selectedYear, 'expense');
    const projs   = getProjects().filter(p => p.status !== 'cancelled');
    const totalProjValue  = projs.reduce((s, p) => s + p.totalValue, 0);
    const totalProjPaid   = projs.reduce((s, p) => s + p.paidAmount, 0);

    const txs     = getTransactions();
    const yearTxs = txs.filter(t => new Date(t.date).getFullYear() === _selectedYear);

    document.getElementById('report-content').innerHTML = `
    <!-- Summary Cards -->
    <div class="report-summary-cards">
      <div class="report-summary-card">
        <div class="rsc-label">Total Pemasukan</div>
        <div class="rsc-value text-income">${Utils.formatRp(totalInc)}</div>
        <div style="font-size:12px;color:var(--clr-muted);margin-top:3px">${_selectedYear}</div>
      </div>
      <div class="report-summary-card">
        <div class="rsc-label">Total Pengeluaran</div>
        <div class="rsc-value text-expense">${Utils.formatRp(totalExp)}</div>
        <div style="font-size:12px;color:var(--clr-muted);margin-top:3px">${_selectedYear}</div>
      </div>
      <div class="report-summary-card" style="border-left:3px solid ${totalNet >= 0 ? 'var(--clr-income)' : 'var(--clr-expense)'}">
        <div class="rsc-label">Laba / Rugi Bersih</div>
        <div class="rsc-value ${totalNet < 0 ? 'text-expense' : 'text-income'}">${Utils.formatRp(totalNet)}</div>
        <div style="font-size:12px;color:var(--clr-muted);margin-top:3px">${_selectedYear}</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="report-grid">
      <div class="card">
        <div class="card-header"><h3>Tren Bulanan ${_selectedYear}</h3></div>
        <div class="card-body">
          <div class="report-chart-wrap">
            <canvas id="chart-line"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Komposisi Pengeluaran</h3></div>
        <div class="card-body">
          <div class="report-chart-wrap" style="height:220px">
            <canvas id="chart-pie"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly Table -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h3>Rekap Bulanan ${_selectedYear}</h3></div>
      <div class="card-body" style="padding:0">
        <div class="monthly-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bulan</th>
                <th style="text-align:right">Pemasukan</th>
                <th style="text-align:right">Pengeluaran</th>
                <th style="text-align:right">Laba/Rugi</th>
                <th style="text-align:right">Saldo Kumulatif</th>
              </tr>
            </thead>
            <tbody id="monthly-tbody">
              ${_buildMonthlyRows(months)}
            </tbody>
            <tfoot>
              <tr style="background:var(--clr-bg);font-weight:800">
                <td style="padding:12px 14px">TOTAL</td>
                <td style="text-align:right;padding:12px 14px;color:var(--clr-income)">${Utils.formatRp(totalInc)}</td>
                <td style="text-align:right;padding:12px 14px;color:var(--clr-expense)">${Utils.formatRp(totalExp)}</td>
                <td style="text-align:right;padding:12px 14px;color:${totalNet < 0 ? 'var(--clr-expense)' : 'var(--clr-income)'}">${Utils.formatRp(totalNet)}</td>
                <td style="text-align:right;padding:12px 14px"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- Category Breakdown Row -->
    <div class="report-grid" style="margin-bottom:20px">
      <div class="card">
        <div class="card-header"><h3>Sumber Pemasukan</h3></div>
        <div class="card-body" style="padding-top:12px">
          ${catInc.length === 0
            ? '<div class="empty-state"><p>Belum ada data.</p></div>'
            : catInc.map((c, i) => `
              <div class="cat-breakdown-item">
                <div class="cat-dot" style="background:${COLORS[i % COLORS.length]}"></div>
                <div class="cat-name">${Utils.esc(c[0])}</div>
                <div class="cat-amount text-income">${Utils.formatRp(c[1])}</div>
              </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Kategori Pengeluaran</h3></div>
        <div class="card-body" style="padding-top:12px">
          ${catExp.length === 0
            ? '<div class="empty-state"><p>Belum ada data.</p></div>'
            : catExp.map((c, i) => `
              <div class="cat-breakdown-item">
                <div class="cat-dot" style="background:${COLORS[i % COLORS.length]}"></div>
                <div class="cat-name">${Utils.esc(c[0])}</div>
                <div class="cat-amount text-expense">${Utils.formatRp(c[1])}</div>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Project Revenue Summary -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h3>Ringkasan Pendapatan Proyek</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">
          <div style="text-align:center;padding:14px;background:var(--clr-bg);border-radius:8px">
            <div style="font-size:12px;color:var(--clr-muted);font-weight:600;margin-bottom:4px">TOTAL NILAI PROYEK</div>
            <div style="font-size:20px;font-weight:800">${Utils.formatRp(totalProjValue)}</div>
          </div>
          <div style="text-align:center;padding:14px;background:var(--clr-income-bg);border-radius:8px">
            <div style="font-size:12px;color:var(--clr-income);font-weight:600;margin-bottom:4px">SUDAH DIBAYAR</div>
            <div style="font-size:20px;font-weight:800;color:var(--clr-income)">${Utils.formatRp(totalProjPaid)}</div>
          </div>
          <div style="text-align:center;padding:14px;background:var(--clr-expense-bg);border-radius:8px">
            <div style="font-size:12px;color:var(--clr-expense);font-weight:600;margin-bottom:4px">BELUM DIBAYAR</div>
            <div style="font-size:20px;font-weight:800;color:var(--clr-expense)">${Utils.formatRp(totalProjValue - totalProjPaid)}</div>
          </div>
          <div style="text-align:center;padding:14px;background:var(--clr-warn-bg);border-radius:8px">
            <div style="font-size:12px;color:var(--clr-warn);font-weight:600;margin-bottom:4px">JUMLAH PROYEK</div>
            <div style="font-size:20px;font-weight:800;color:var(--clr-warn)">${projs.length}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions of selected year -->
    <div class="card">
      <div class="card-header"><h3>Semua Transaksi ${_selectedYear}</h3></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Kategori</th>
                <th>Jenis</th>
                <th style="text-align:right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${yearTxs.length === 0
                ? `<tr><td colspan="5"><div class="empty-state"><p>Tidak ada transaksi pada tahun ${_selectedYear}.</p></div></td></tr>`
                : yearTxs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => `
                  <tr>
                    <td style="white-space:nowrap">${Utils.formatDate(t.date)}</td>
                    <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(t.description)}</td>
                    <td><span class="cat-pill">${Utils.esc(t.category)}</span></td>
                    <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
                    <td style="text-align:right" class="amount-${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatRp(t.amount)}</td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

    // Line Chart
    const ctxLine = document.getElementById('chart-line');
    if (ctxLine) {
      if (_chartLine) _chartLine.destroy();
      _chartLine = new Chart(ctxLine, {
        type: 'line',
        data: {
          labels: months.map(m => m.label),
          datasets: [
            {
              label: 'Pemasukan', data: months.map(m => m.income),
              borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.08)',
              tension: .35, fill: true, pointRadius: 4, pointBackgroundColor: '#16a34a'
            },
            {
              label: 'Pengeluaran', data: months.map(m => m.expense),
              borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.06)',
              tension: .35, fill: true, pointRadius: 4, pointBackgroundColor: '#dc2626'
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
          scales: {
            y: {
              ticks: { callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'jt' : v >= 1e3 ? (v/1e3)+'rb' : v, font: { size: 11 } },
              grid: { color: '#f0f1f3' }
            },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }

    // Pie Chart - expense categories
    const ctxPie = document.getElementById('chart-pie');
    if (ctxPie) {
      if (_chartPie) _chartPie.destroy();
      const labels = catExp.slice(0, 8).map(c => c[0]);
      const data   = catExp.slice(0, 8).map(c => c[1]);
      if (data.length > 0) {
        _chartPie = new Chart(ctxPie, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data, backgroundColor: COLORS.slice(0, data.length), borderWidth: 2, borderColor: '#fff' }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
              tooltip: { callbacks: { label: ctx => ` ${Utils.formatRp(ctx.raw)}` } }
            },
            cutout: '60%'
          }
        });
      } else {
        ctxPie.parentElement.innerHTML = '<div class="empty-state"><p>Belum ada data pengeluaran.</p></div>';
      }
    }
  }

  function _buildMonthlyRows(months) {
    let cum = 0;
    return months.map(m => {
      cum += m.net;
      const hasData = m.income > 0 || m.expense > 0;
      return `
        <tr style="${!hasData ? 'opacity:.5' : ''}">
          <td style="padding:11px 14px;font-weight:${hasData ? '600' : '400'}">${m.label}</td>
          <td style="text-align:right;padding:11px 14px;color:var(--clr-income)">${m.income > 0 ? Utils.formatRp(m.income) : '-'}</td>
          <td style="text-align:right;padding:11px 14px;color:var(--clr-expense)">${m.expense > 0 ? Utils.formatRp(m.expense) : '-'}</td>
          <td style="text-align:right;padding:11px 14px;font-weight:700;color:${m.net < 0 ? 'var(--clr-expense)' : m.net > 0 ? 'var(--clr-income)' : 'var(--clr-muted)'}">${m.net !== 0 ? Utils.formatRp(m.net) : '-'}</td>
          <td style="text-align:right;padding:11px 14px;font-weight:600;color:${cum < 0 ? 'var(--clr-expense)' : 'var(--clr-text)'}">${Utils.formatRp(cum)}</td>
        </tr>`;
    }).join('');
  }

  return { render };
})();

