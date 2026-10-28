/* ── Dashboard Page ───────────────────────────────────────────────────── */
const Pages = {
  registerAll() {
    Router.register('dashboard', Pages.dashboard);
    Router.register('transactions', Pages.transactions);
    Router.register('projects', Pages.projects);
    Router.register('clients', Pages.clients);
    Router.register('invoices', Pages.invoices);
    Router.register('reports', Pages.reports);
    Router.register('reconciliation', Pages.reconciliation);
    Router.register('settings', Pages.settings);
  },

  /* ── DASHBOARD ──────────────────────────────────────────────────────── */
  async dashboard(el) {
    document.getElementById('page-title').textContent = 'Dashboard';
    const d = await API.get('/dashboard');

    el.innerHTML = `
      <div class="page-content">
        <div class="page-header">
          <h1>Dashboard Keuangan</h1>
          <div class="page-header-actions">
            <span style="font-size:12px;color:var(--text-muted)">${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card primary">
            <div class="stat-icon">💰</div>
            <div class="stat-label">Saldo Total</div>
            <div class="stat-value">${FMT.money(d.balance)}</div>
            <div class="stat-sub">Pemasukan − Pengeluaran</div>
          </div>
          <div class="stat-card success">
            <div class="stat-icon">📈</div>
            <div class="stat-label">Pemasukan Bulan Ini</div>
            <div class="stat-value">${FMT.money(d.monthIncome)}</div>
            <div class="stat-sub">Total: ${FMT.money(d.totalIncome)}</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon">📉</div>
            <div class="stat-label">Pengeluaran Bulan Ini</div>
            <div class="stat-value">${FMT.money(d.monthExpense)}</div>
            <div class="stat-sub">Total: ${FMT.money(d.totalExpense)}</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon">🎯</div>
            <div class="stat-label">Piutang Proyek</div>
            <div class="stat-value">${FMT.money(d.projectStats.total_outstanding)}</div>
            <div class="stat-sub">${d.projectStats.active} proyek berjalan</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" class="chart-grid">
          <div class="card">
            <div class="card-header"><h2>📊 Pemasukan vs Pengeluaran (6 Bulan)</h2></div>
            <div class="card-body"><canvas id="chart-monthly" height="200"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header"><h2>📋 Status Proyek</h2></div>
            <div class="card-body">
              <canvas id="chart-projects" height="200"></canvas>
              <div style="margin-top:16px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  <div style="padding:10px;background:var(--bg);border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:700">${d.projectStats.total}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Total Proyek</div>
                  </div>
                  <div style="padding:10px;background:var(--success-light);border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:700;color:var(--success)">${d.projectStats.completed}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Lunas</div>
                  </div>
                  <div style="padding:10px;background:var(--warning-light);border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:700;color:var(--warning)">${d.projectStats.active}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Aktif</div>
                  </div>
                  <div style="padding:10px;background:var(--primary-light);border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:700;color:var(--primary)">${FMT.money(d.projectStats.total_value)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Total Nilai</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="recent-grid">
          <div class="card">
            <div class="card-header">
              <h2>🔄 Transaksi Terbaru</h2>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('transactions')">Lihat Semua</button>
            </div>
            <div class="table-wrap">
              <table>
                <tbody>
                  ${d.recentTransactions.length === 0
                    ? '<tr><td class="table-empty" colspan="3">Belum ada transaksi</td></tr>'
                    : d.recentTransactions.map(t => `
                      <tr>
                        <td>
                          ${Badges.transaction(t.type)}
                          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${FMT.date(t.transaction_date)}</div>
                        </td>
                        <td>
                          <div style="font-size:13px">${t.description || t.category}</div>
                          ${t.project_title ? `<div style="font-size:11px;color:var(--text-muted)">${t.project_code}</div>` : ''}
                        </td>
                        <td class="text-right">
                          <span class="money ${t.type === 'income' ? 'money-positive' : 'money-negative'}">
                            ${t.type === 'income' ? '+' : '-'}${FMT.money(t.amount)}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h2>📁 Proyek Terbaru</h2>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('projects')">Lihat Semua</button>
            </div>
            <div class="table-wrap">
              <table>
                <tbody>
                  ${d.recentProjects.length === 0
                    ? '<tr><td class="table-empty" colspan="2">Belum ada proyek</td></tr>'
                    : d.recentProjects.map(p => `
                      <tr style="cursor:pointer" onclick="Router.navigate('projects',{detail:${p.id}})">
                        <td>
                          <div style="font-weight:600;font-size:13px">${p.title}</div>
                          <div style="font-size:11px;color:var(--text-muted)">${p.client_name} · ${p.project_code}</div>
                        </td>
                        <td class="text-right">
                          ${Badges.project(p.status)}
                          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${FMT.money(p.total_value)}</div>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render charts
    Pages._renderMonthlyChart(d.monthlyData);
    Pages._renderProjectsChart(d.projectStats);

    // Responsive chart grid
    if (window.innerWidth < 768) {
      document.querySelector('.chart-grid').style.gridTemplateColumns = '1fr';
      document.querySelector('.recent-grid').style.gridTemplateColumns = '1fr';
    }
  },

  _renderMonthlyChart(data) {
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fill missing months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }

    const dataMap = {};
    data.forEach(d => { dataMap[d.month] = d; });

    const labels = months.map(m => {
      const [y, mo] = m.split('-');
      return `${FMT.monthName(mo)} ${y.slice(-2)}`;
    });
    const incomes = months.map(m => dataMap[m]?.income || 0);
    const expenses = months.map(m => dataMap[m]?.expense || 0);

    Pages._drawBarChart(ctx, canvas, labels, [
      { label: 'Pemasukan', data: incomes, color: '#16a34a' },
      { label: 'Pengeluaran', data: expenses, color: '#dc2626' }
    ]);
  },

  _renderProjectsChart(stats) {
    const canvas = document.getElementById('chart-projects');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const total = stats.total || 1;
    const data = [
      { label: 'Lunas', value: stats.completed || 0, color: '#16a34a' },
      { label: 'Aktif', value: stats.active || 0, color: '#d97706' },
      { label: 'Pending', value: stats.pending || 0, color: '#2563eb' },
      { label: 'Dibatal', value: stats.cancelled || 0, color: '#dc2626' }
    ].filter(d => d.value > 0);

    if (data.length === 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Belum ada data', canvas.width / 2, canvas.height / 2);
      return;
    }

    Pages._drawDoughnutChart(ctx, canvas, data);
  },

  _drawBarChart(ctx, canvas, labels, datasets) {
    const W = canvas.width = canvas.parentElement.clientWidth - 40;
    const H = canvas.height = 200;
    ctx.clearRect(0, 0, W, H);

    const padL = 60, padR = 20, padT = 20, padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // Find max
    const allVals = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allVals, 1);

    // Gridlines
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(FMT.money(maxVal * (4 - i) / 4).replace('Rp ', ''), padL - 4, y + 4);
    }

    // Bars
    const n = labels.length;
    const groupW = chartW / n;
    const barW = (groupW - 10) / datasets.length;

    datasets.forEach((ds, di) => {
      ds.data.forEach((val, i) => {
        const x = padL + i * groupW + di * barW + 5;
        const barH = (val / maxVal) * chartH;
        const y = padT + chartH - barH;
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW - 2, barH, [3,3,0,0]) : ctx.rect(x, y, barW - 2, barH);
        ctx.fill();
      });
    });

    // Labels
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      ctx.fillText(l, padL + i * groupW + groupW / 2, H - padB + 16);
    });

    // Legend
    let lx = padL;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(lx, H - 12, 10, 8);
      ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
      ctx.fillText(ds.label, lx + 13, H - 6);
      lx += ctx.measureText(ds.label).width + 30;
    });
  },

  _drawDoughnutChart(ctx, canvas, data) {
    const size = Math.min(canvas.parentElement.clientWidth - 40, 160);
    canvas.width = size; canvas.height = size;
    const cx = size / 2, cy = size / 2, r = size / 2 - 8, innerR = r * 0.6;
    let startAngle = -Math.PI / 2;
    const total = data.reduce((s, d) => s + d.value, 0);

    data.forEach(d => {
      const slice = (d.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      startAngle += slice;
    });

    // Hole
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#1f2328'; ctx.font = `bold ${Math.round(size/8)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy);
  },

  /* ── TRANSACTIONS ───────────────────────────────────────────────────── */
  async transactions(el, params = {}) {
    document.getElementById('page-title').textContent = 'Transaksi';

    let currentPage = 1;
    let currentFilters = {};
    let categories = [];

    const cats = await API.get('/categories');
    categories = cats;

    const render = async () => {
      const q = new URLSearchParams({ page: currentPage, limit: 20, ...currentFilters });
      const d = await API.get('/transactions?' + q);

      el.innerHTML = `
        <div class="page-content">
          <div class="page-header">
            <h1>Transaksi</h1>
            <div class="page-header-actions">
              <button class="btn btn-primary" id="btn-add-trx">+ Tambah Transaksi</button>
            </div>
          </div>

          <div class="card mb-2">
            <div class="card-body" style="padding:12px 16px">
              <div class="filter-bar">
                <input type="text" class="form-control search-input" id="trx-search" placeholder="Cari deskripsi, kode..." value="${currentFilters.search || ''}">
                <select class="form-control" id="trx-type" style="max-width:140px">
                  <option value="">Semua Tipe</option>
                  <option value="income" ${currentFilters.type==='income'?'selected':''}>Pemasukan</option>
                  <option value="expense" ${currentFilters.type==='expense'?'selected':''}>Pengeluaran</option>
                </select>
                <select class="form-control" id="trx-source" style="max-width:130px">
                  <option value="">Semua Sumber</option>
                  <option value="manual" ${currentFilters.source==='manual'?'selected':''}>Manual</option>
                  <option value="online" ${currentFilters.source==='online'?'selected':''}>Online</option>
                </select>
                <input type="date" class="form-control" id="trx-from" value="${currentFilters.date_from||''}" style="max-width:150px" placeholder="Dari">
                <input type="date" class="form-control" id="trx-to" value="${currentFilters.date_to||''}" style="max-width:150px" placeholder="Sampai">
                <button class="btn btn-outline" id="btn-filter">Filter</button>
                <button class="btn btn-ghost" id="btn-clear-filter">Reset</button>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:8px">
            <div style="display:flex;gap:16px;padding:12px 20px;background:var(--bg);border-bottom:1px solid var(--border);border-radius:12px 12px 0 0">
              <div><span style="font-size:11px;color:var(--text-muted)">PEMASUKAN</span><div class="money money-positive fw-bold">${FMT.money(d.totals.income)}</div></div>
              <div style="width:1px;background:var(--border)"></div>
              <div><span style="font-size:11px;color:var(--text-muted)">PENGELUARAN</span><div class="money money-negative fw-bold">${FMT.money(d.totals.expense)}</div></div>
              <div style="width:1px;background:var(--border)"></div>
              <div><span style="font-size:11px;color:var(--text-muted)">SELISIH</span><div class="money fw-bold ${d.totals.income - d.totals.expense >= 0 ? 'money-positive' : 'money-negative'}">${FMT.money(d.totals.income - d.totals.expense)}</div></div>
              <div style="margin-left:auto;font-size:12px;color:var(--text-muted);align-self:center">${d.pagination.total} transaksi</div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kode</th>
                    <th>Tipe</th>
                    <th>Kategori</th>
                    <th>Deskripsi</th>
                    <th>Sumber</th>
                    <th class="text-right">Jumlah</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="trx-tbody">
                  ${d.data.length === 0
                    ? '<tr><td class="table-empty" colspan="8">Belum ada transaksi</td></tr>'
                    : d.data.map(t => `
                      <tr>
                        <td style="white-space:nowrap">${FMT.date(t.transaction_date)}</td>
                        <td><code style="font-size:11px;color:var(--text-muted)">${t.transaction_code}</code></td>
                        <td>${Badges.transaction(t.type)}</td>
                        <td style="font-size:12px">${t.category}</td>
                        <td>
                          <div>${t.description || '-'}</div>
                          ${t.project_title ? `<div style="font-size:11px;color:var(--text-muted)">${t.project_code}</div>` : ''}
                        </td>
                        <td>${Badges.source(t.source)}</td>
                        <td class="text-right">
                          <span class="money ${t.type === 'income' ? 'money-positive' : 'money-negative'}">
                            ${t.type === 'income' ? '+' : '-'}${FMT.money(t.amount)}
                          </span>
                        </td>
                        <td>
                          ${t.source === 'manual' ? `
                            <button class="btn btn-ghost btn-sm btn-edit-trx" data-id="${t.id}" title="Edit">✏️</button>
                            <button class="btn btn-ghost btn-sm btn-del-trx" data-id="${t.id}" title="Hapus">🗑️</button>
                          ` : '<span style="font-size:11px;color:var(--text-muted)">Auto</span>'}
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
            ${d.pagination.pages > 1 ? `
              <div class="pagination">
                <button class="page-btn" id="prev-page" ${d.pagination.page <= 1 ? 'disabled' : ''}>‹</button>
                <span style="padding:0 12px;font-size:13px;color:var(--text-muted)">Hal ${d.pagination.page} / ${d.pagination.pages}</span>
                <button class="page-btn" id="next-page" ${d.pagination.page >= d.pagination.pages ? 'disabled' : ''}>›</button>
              </div>` : ''}
          </div>
        </div>
        ${Pages._trxModal(categories)}
      `;

      // Events
      el.querySelector('#btn-add-trx').onclick = () => {
        Pages._openTrxModal(null, categories);
      };

      el.querySelectorAll('.btn-edit-trx').forEach(btn => {
        btn.onclick = async () => {
          const t = await API.get('/transactions/' + btn.dataset.id);
          Pages._openTrxModal(t, categories);
        };
      });

      el.querySelectorAll('.btn-del-trx').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Hapus transaksi ini?')) return;
          try {
            await API.delete('/transactions/' + btn.dataset.id);
            Toast.success('Transaksi dihapus');
            render();
          } catch (err) { Toast.error(err.message); }
        };
      });

      el.querySelector('#btn-filter').onclick = () => {
        currentFilters = {
          search: el.querySelector('#trx-search').value,
          type: el.querySelector('#trx-type').value,
          source: el.querySelector('#trx-source').value,
          date_from: el.querySelector('#trx-from').value,
          date_to: el.querySelector('#trx-to').value
        };
        currentPage = 1; render();
      };

      el.querySelector('#btn-clear-filter').onclick = () => {
        currentFilters = {}; currentPage = 1; render();
      };

      const prevBtn = el.querySelector('#prev-page');
      const nextBtn = el.querySelector('#next-page');
      if (prevBtn) prevBtn.onclick = () => { currentPage--; render(); };
      if (nextBtn) nextBtn.onclick = () => { currentPage++; render(); };
    };

    await render();

    // Handle form save from modal
    window._trxSaveCallback = async () => { await render(); };
  },

  _trxModal(categories) {
    const incCats = categories.filter(c => c.type === 'income');
    const expCats = categories.filter(c => c.type === 'expense');
    return `
      <div class="modal-overlay" id="modal-trx">
        <div class="modal">
          <div class="modal-header">
            <h3 id="trx-modal-title">Tambah Transaksi</h3>
            <button class="modal-close">×</button>
          </div>
          <form id="form-trx">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tipe <span class="required">*</span></label>
                  <select class="form-control" name="type" id="trx-type-sel" required>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Kategori <span class="required">*</span></label>
                  <select class="form-control" name="category" id="trx-cat-sel" required>
                    ${incCats.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Jumlah (Rp) <span class="required">*</span></label>
                  <div class="input-group">
                    <span class="input-prefix">Rp</span>
                    <input type="number" class="form-control" name="amount" min="1" step="1000" required>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal <span class="required">*</span></label>
                  <input type="date" class="form-control" name="transaction_date" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Deskripsi</label>
                <input type="text" class="form-control" name="description" placeholder="Keterangan transaksi">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Metode Pembayaran</label>
                  <select class="form-control" name="payment_method">
                    <option value="cash">Tunai</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Proyek Terkait</label>
                  <input type="number" class="form-control" name="reference_project_id" placeholder="ID Proyek (opsional)">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Catatan</label>
                <textarea class="form-control" name="notes" rows="2"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline modal-close">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  _openTrxModal(data, categories) {
    const incCats = categories.filter(c => c.type === 'income');
    const expCats = categories.filter(c => c.type === 'expense');

    const overlay = document.getElementById('modal-trx');
    document.getElementById('trx-modal-title').textContent = data ? 'Edit Transaksi' : 'Tambah Transaksi';

    const form = document.getElementById('form-trx');
    form.reset();
    form.removeAttribute('data-id');

    if (data) {
      form.setAttribute('data-id', data.id);
      form.type.value = data.type;
      form.transaction_date.value = FMT.dateInput(data.transaction_date);
      form.amount.value = data.amount;
      form.description.value = data.description || '';
      form.payment_method.value = data.payment_method || 'cash';
      form.reference_project_id.value = data.reference_project_id || '';
      form.notes.value = data.notes || '';
    } else {
      form.transaction_date.value = new Date().toISOString().split('T')[0];
    }

    // Update categories on type change
    const typeSel = document.getElementById('trx-type-sel');
    const catSel = document.getElementById('trx-cat-sel');

    const updateCats = (type) => {
      const cats = type === 'income' ? incCats : expCats;
      catSel.innerHTML = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
      if (data && data.type === type) catSel.value = data.category;
    };

    typeSel.onchange = () => updateCats(typeSel.value);
    updateCats(data ? data.type : 'income');

    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const fd = new FormData(form);
        const body = Object.fromEntries(fd);
        const id = form.getAttribute('data-id');
        if (id) await API.put('/transactions/' + id, body);
        else await API.post('/transactions', body);
        Toast.success('Transaksi disimpan');
        Modal.close('modal-trx');
        if (window._trxSaveCallback) window._trxSaveCallback();
      } catch (err) {
        Toast.error(err.message);
      } finally {
        btn.disabled = false;
      }
    };

    Modal.open('modal-trx');
  },

  /* ── PROJECTS ───────────────────────────────────────────────────────── */
  async projects(el, params = {}) {
    document.getElementById('page-title').textContent = 'Proyek';

    let currentPage = 1;
    let currentFilters = {};

    if (params.detail) {
      return Pages._projectDetail(el, params.detail);
    }

    const render = async () => {
      const q = new URLSearchParams({ page: currentPage, limit: 15, ...currentFilters });
      const d = await API.get('/projects?' + q);

      el.innerHTML = `
        <div class="page-content">
          <div class="page-header">
            <h1>Manajemen Proyek</h1>
            <div class="page-header-actions">
              <button class="btn btn-primary" id="btn-add-proj">+ Proyek Baru</button>
            </div>
          </div>

          <div class="card mb-2">
            <div class="card-body" style="padding:12px 16px">
              <div class="filter-bar">
                <input type="text" class="form-control search-input" id="proj-search" placeholder="Cari proyek, klien..." value="${currentFilters.search||''}">
                <select class="form-control" id="proj-status" style="max-width:160px">
                  <option value="">Semua Status</option>
                  <option value="pending" ${currentFilters.status==='pending'?'selected':''}>Pending</option>
                  <option value="dp_paid" ${currentFilters.status==='dp_paid'?'selected':''}>DP Terbayar</option>
                  <option value="in_progress" ${currentFilters.status==='in_progress'?'selected':''}>Berjalan</option>
                  <option value="done" ${currentFilters.status==='done'?'selected':''}>Selesai</option>
                  <option value="paid_off" ${currentFilters.status==='paid_off'?'selected':''}>Lunas</option>
                  <option value="cancelled" ${currentFilters.status==='cancelled'?'selected':''}>Dibatal</option>
                </select>
                <select class="form-control" id="proj-type" style="max-width:140px">
                  <option value="">Semua Tipe</option>
                  <option value="photography">Fotografi</option>
                  <option value="videography">Videografi</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <button class="btn btn-outline" id="btn-proj-filter">Filter</button>
                <button class="btn btn-ghost" id="btn-proj-clear">Reset</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Proyek</th>
                    <th>Klien</th>
                    <th>Tipe</th>
                    <th>Tanggal</th>
                    <th>Total</th>
                    <th>Terbayar</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${d.data.length === 0
                    ? '<tr><td class="table-empty" colspan="10">Belum ada proyek</td></tr>'
                    : d.data.map(p => {
                      const pct = FMT.percent(p.dp_paid + p.remaining_paid, p.total_value);
                      const fillClass = pct >= 100 ? 'success' : pct >= 50 ? 'warning' : '';
                      return `
                        <tr style="cursor:pointer" onclick="Pages._projectDetail(document.getElementById('page-content'), ${p.id})">
                          <td><code style="font-size:11px">${p.project_code}</code></td>
                          <td>
                            <div style="font-weight:600">${p.title}</div>
                            ${p.location ? `<div style="font-size:11px;color:var(--text-muted)">📍 ${p.location}</div>` : ''}
                          </td>
                          <td>${p.client_name}</td>
                          <td>${Badges.projectType(p.project_type)}</td>
                          <td style="white-space:nowrap">${FMT.date(p.event_date)}</td>
                          <td class="money">${FMT.money(p.total_value)}</td>
                          <td class="money money-positive">${FMT.money(p.dp_paid + p.remaining_paid)}</td>
                          <td style="min-width:100px">
                            <div class="progress-bar">
                              <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
                            </div>
                            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${pct}%</div>
                          </td>
                          <td>${Badges.project(p.status)}</td>
                          <td onclick="event.stopPropagation()">
                            <button class="btn btn-ghost btn-sm" onclick="Pages._projectDetail(document.getElementById('page-content'), ${p.id})">Detail</button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
            ${d.pagination.pages > 1 ? `
              <div class="pagination">
                <button class="page-btn" id="prev-page" ${d.pagination.page<=1?'disabled':''}>‹</button>
                <span style="padding:0 12px;font-size:13px;color:var(--text-muted)">Hal ${d.pagination.page} / ${d.pagination.pages}</span>
                <button class="page-btn" id="next-page" ${d.pagination.page>=d.pagination.pages?'disabled':''}>›</button>
              </div>` : ''}
          </div>
        </div>
        ${Pages._projectModal()}
      `;

      el.querySelector('#btn-add-proj').onclick = () => Pages._openProjectModal(null);
      el.querySelector('#btn-proj-filter').onclick = () => {
        currentFilters = {
          search: el.querySelector('#proj-search').value,
          status: el.querySelector('#proj-status').value,
          type: el.querySelector('#proj-type').value
        };
        currentPage = 1; render();
      };
      el.querySelector('#btn-proj-clear').onclick = () => { currentFilters = {}; currentPage = 1; render(); };

      const prev = el.querySelector('#prev-page'); const next = el.querySelector('#next-page');
      if (prev) prev.onclick = () => { currentPage--; render(); };
      if (next) next.onclick = () => { currentPage++; render(); };

      window._projectSaveCallback = render;
    };

    await render();
  },

  async _projectDetail(el, id) {
    document.getElementById('page-title').textContent = 'Detail Proyek';
    const p = await API.get('/projects/' + id);
    const pct = FMT.percent(p.dp_paid + p.remaining_paid, p.total_value);
    const fillClass = pct >= 100 ? 'success' : pct >= 50 ? 'warning' : '';

    el.innerHTML = `
      <div class="page-content">
        <div class="page-header">
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('projects')">← Kembali</button>
          <h1 style="margin:0">${p.title}</h1>
          <div class="page-header-actions">
            <button class="btn btn-outline btn-sm" id="btn-edit-proj">Edit Proyek</button>
            <button class="btn btn-primary btn-sm" id="btn-pay-proj">+ Catat Pembayaran</button>
            <button class="btn btn-success btn-sm" id="btn-inv-proj">🧾 Buat Invoice Online</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:16px">
          <div>
            <div class="card mb-2">
              <div class="card-header"><h2>📋 Info Proyek</h2></div>
              <div class="card-body">
                <table style="width:100%">
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Kode</td><td><code>${p.project_code}</code></td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Klien</td><td><strong>${p.client_name}</strong></td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Phone</td><td>${p.client_phone || '-'}</td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Email</td><td>${p.client_email || '-'}</td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Tipe</td><td>${Badges.projectType(p.project_type)}</td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Lokasi</td><td>${p.location || '-'}</td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Tanggal</td><td>${FMT.date(p.event_date)}</td></tr>
                  <tr><td style="color:var(--text-muted);font-size:12px;padding:4px 0">Status</td><td>${Badges.project(p.status)}</td></tr>
                </table>
                ${p.description ? `<hr><p style="font-size:13px;color:var(--text-muted)">${p.description}</p>` : ''}
                ${p.notes ? `<p style="font-size:12px;color:var(--text-muted);margin-top:4px">📝 ${p.notes}</p>` : ''}
              </div>
            </div>
            <div class="card">
              <div class="card-header"><h2>💰 Ringkasan Keuangan</h2></div>
              <div class="card-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
                  <div style="padding:12px;background:var(--bg);border-radius:8px">
                    <div style="font-size:11px;color:var(--text-muted)">Total Proyek</div>
                    <div class="money fw-bold">${FMT.money(p.total_value)}</div>
                  </div>
                  <div style="padding:12px;background:var(--bg);border-radius:8px">
                    <div style="font-size:11px;color:var(--text-muted)">DP Ditetapkan</div>
                    <div class="money fw-bold">${FMT.money(p.dp_amount)}</div>
                  </div>
                  <div style="padding:12px;background:var(--success-light);border-radius:8px">
                    <div style="font-size:11px;color:var(--text-muted)">DP Diterima</div>
                    <div class="money fw-bold money-positive">${FMT.money(p.dp_paid)}</div>
                  </div>
                  <div style="padding:12px;background:var(--success-light);border-radius:8px">
                    <div style="font-size:11px;color:var(--text-muted)">Pelunasan</div>
                    <div class="money fw-bold money-positive">${FMT.money(p.remaining_paid)}</div>
                  </div>
                  <div style="padding:12px;background:var(--warning-light);border-radius:8px;grid-column:span 2">
                    <div style="font-size:11px;color:var(--text-muted)">Sisa Tagihan</div>
                    <div class="money fw-bold" style="color:var(--warning)">${FMT.money(p.outstanding)}</div>
                  </div>
                </div>
                <div class="progress-bar" style="height:12px">
                  <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
                </div>
                <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:4px">${pct}% terbayar</div>
              </div>
            </div>
          </div>

          <div>
            <div class="card mb-2">
              <div class="card-header"><h2>💳 Invoice & Pembayaran Online</h2></div>
              <div class="table-wrap">
                ${p.invoices.length === 0
                  ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">Belum ada invoice online</div>'
                  : `<table>
                    <thead><tr><th>Kode</th><th>Tipe</th><th>Jumlah</th><th>Status</th><th>Dibayar</th><th>Aksi</th></tr></thead>
                    <tbody>
                      ${p.invoices.map(inv => `
                        <tr>
                          <td><code style="font-size:11px">${inv.invoice_code}</code></td>
                          <td>${inv.payment_type}</td>
                          <td class="money">${FMT.money(inv.amount)}</td>
                          <td>${Badges.invoice(inv.status)}</td>
                          <td style="font-size:12px">${inv.paid_at ? FMT.date(inv.paid_at) : '-'}</td>
                          <td>
                            ${inv.status === 'pending' && inv.midtrans_payment_url
                              ? `<a href="${inv.midtrans_payment_url}" target="_blank" class="btn btn-primary btn-sm">Bayar</a>
                                 <button class="btn btn-ghost btn-sm btn-cancel-inv" data-id="${inv.id}">Batalkan</button>`
                              : inv.midtrans_snap_token && inv.status === 'pending'
                              ? `<button class="btn btn-primary btn-sm btn-pay-snap" data-token="${inv.midtrans_snap_token}" data-id="${inv.id}">Bayar Sekarang</button>
                                 <button class="btn btn-ghost btn-sm btn-cancel-inv" data-id="${inv.id}">Batalkan</button>`
                              : ''}
                            ${inv.reconciled ? '<span class="badge badge-success" style="font-size:10px">✓ Rekonsil</span>' : ''}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>`}
              </div>
            </div>
            <div class="card">
              <div class="card-header"><h2>🔄 Riwayat Transaksi</h2></div>
              <div class="table-wrap">
                ${p.transactions.length === 0
                  ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">Belum ada transaksi</div>'
                  : `<table>
                    <thead><tr><th>Tanggal</th><th>Kategori</th><th>Jumlah</th><th>Metode</th><th>Sumber</th></tr></thead>
                    <tbody>
                      ${p.transactions.map(t => `
                        <tr>
                          <td>${FMT.date(t.transaction_date)}</td>
                          <td>${t.category}</td>
                          <td class="money money-positive">${FMT.money(t.amount)}</td>
                          <td style="font-size:12px">${t.payment_method || '-'}</td>
                          <td>${Badges.source(t.source)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>`}
              </div>
            </div>
          </div>
        </div>
      </div>
      ${Pages._projectModal()}
      ${Pages._paymentModal()}
      ${Pages._invoiceModal()}
    `;

    // Events
    el.querySelector('#btn-edit-proj').onclick = () => Pages._openProjectModal(p);
    el.querySelector('#btn-pay-proj').onclick = () => Pages._openPaymentModal(p);
    el.querySelector('#btn-inv-proj').onclick = () => Pages._openInvoiceModal(p);

    el.querySelectorAll('.btn-cancel-inv').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Batalkan invoice ini?')) return;
        try {
          await API.post('/invoices/' + btn.dataset.id + '/cancel');
          Toast.success('Invoice dibatalkan');
          Pages._projectDetail(el, id);
        } catch (err) { Toast.error(err.message); }
      };
    });

    // Midtrans Snap payment
    el.querySelectorAll('.btn-pay-snap').forEach(btn => {
      btn.onclick = () => {
        if (window.snap) {
          window.snap.pay(btn.dataset.token, {
            onSuccess: () => { Toast.success('Pembayaran berhasil!'); setTimeout(() => Pages._projectDetail(el, id), 1500); },
            onPending: () => { Toast.info('Pembayaran pending'); setTimeout(() => Pages._projectDetail(el, id), 1500); },
            onError: () => Toast.error('Pembayaran gagal'),
            onClose: () => Toast.info('Popup ditutup')
          });
        } else {
          window.open(`https://app.sandbox.midtrans.com/snap/v2/vtweb/${btn.dataset.token}`, '_blank');
        }
      };
    });

    window._projectSaveCallback = () => Pages._projectDetail(el, id);
    window._paymentSaveCallback = () => Pages._projectDetail(el, id);
    window._invoiceSaveCallback = () => Pages._projectDetail(el, id);
  },

  _projectModal() {
    return `
      <div class="modal-overlay" id="modal-project">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3 id="proj-modal-title">Proyek Baru</h3>
            <button class="modal-close">×</button>
          </div>
          <form id="form-project">
            <div class="modal-body">
              <div id="proj-client-wrap" class="form-group">
                <label class="form-label">Klien <span class="required">*</span></label>
                <select class="form-control" name="client_id" id="proj-client-sel" required>
                  <option value="">— Pilih Klien —</option>
                </select>
                <div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" id="btn-new-client-inline">+ Klien Baru</button></div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Judul Proyek <span class="required">*</span></label>
                  <input type="text" class="form-control" name="title" required placeholder="Misal: Wedding Rizky & Ayu">
                </div>
                <div class="form-group">
                  <label class="form-label">Tipe <span class="required">*</span></label>
                  <select class="form-control" name="project_type" required>
                    <option value="photography">📷 Fotografi</option>
                    <option value="videography">🎥 Videografi</option>
                    <option value="hybrid">📷🎥 Hybrid (Foto + Video)</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tanggal Acara</label>
                  <input type="date" class="form-control" name="event_date">
                </div>
                <div class="form-group">
                  <label class="form-label">Lokasi</label>
                  <input type="text" class="form-control" name="location">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Total Nilai Proyek (Rp) <span class="required">*</span></label>
                  <div class="input-group">
                    <span class="input-prefix">Rp</span>
                    <input type="number" class="form-control" name="total_value" min="0" step="50000" required>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Jumlah DP (Rp)</label>
                  <div class="input-group">
                    <span class="input-prefix">Rp</span>
                    <input type="number" class="form-control" name="dp_amount" min="0" step="50000">
                  </div>
                </div>
              </div>
              <div class="form-group" id="proj-status-field" style="display:none">
                <label class="form-label">Status</label>
                <select class="form-control" name="status">
                  <option value="pending">Pending</option>
                  <option value="dp_paid">DP Terbayar</option>
                  <option value="in_progress">Berjalan</option>
                  <option value="done">Selesai</option>
                  <option value="paid_off">Lunas</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Deskripsi</label>
                <textarea class="form-control" name="description" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Catatan Internal</label>
                <textarea class="form-control" name="notes" rows="2"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline modal-close">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async _openProjectModal(data) {
    // Load clients for select
    const clientsRes = await API.get('/clients?limit=200');
    const clientSel = document.getElementById('proj-client-sel');
    clientSel.innerHTML = '<option value="">— Pilih Klien —</option>' +
      clientsRes.data.map(c => `<option value="${c.id}">${c.name} ${c.phone ? '· ' + c.phone : ''}</option>`).join('');

    document.getElementById('proj-modal-title').textContent = data ? 'Edit Proyek' : 'Proyek Baru';
    document.getElementById('proj-status-field').style.display = data ? 'block' : 'none';

    const form = document.getElementById('form-project');
    form.reset(); form.removeAttribute('data-id');

    if (data) {
      form.setAttribute('data-id', data.id);
      form.client_id.value = data.client_id;
      form.title.value = data.title;
      form.project_type.value = data.project_type;
      form.event_date.value = FMT.dateInput(data.event_date);
      form.location.value = data.location || '';
      form.total_value.value = data.total_value;
      form.dp_amount.value = data.dp_amount;
      form.status.value = data.status;
      form.description.value = data.description || '';
      form.notes.value = data.notes || '';
    }

    // New client inline
    document.getElementById('btn-new-client-inline').onclick = async () => {
      const name = prompt('Nama klien baru:');
      if (!name) return;
      const phone = prompt('Nomor HP (opsional):') || '';
      try {
        const c = await API.post('/clients', { name, phone });
        const opt = new Option(`${c.name} ${c.phone ? '· ' + c.phone : ''}`, c.id, true, true);
        clientSel.appendChild(opt);
        Toast.success('Klien ditambahkan');
      } catch (err) { Toast.error(err.message); }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const fd = new FormData(form);
        const body = Object.fromEntries(fd);
        const id = form.getAttribute('data-id');
        if (id) await API.put('/projects/' + id, body);
        else await API.post('/projects', body);
        Toast.success('Proyek disimpan');
        Modal.close('modal-project');
        if (window._projectSaveCallback) window._projectSaveCallback();
      } catch (err) {
        Toast.error(err.message);
        btn.disabled = false;
      }
    };

    Modal.open('modal-project');
  },

  _paymentModal() {
    return `
      <div class="modal-overlay" id="modal-payment">
        <div class="modal">
          <div class="modal-header">
            <h3>Catat Pembayaran Manual</h3>
            <button class="modal-close">×</button>
          </div>
          <form id="form-payment">
            <div class="modal-body">
              <div class="alert alert-info" style="font-size:12px">Pencatatan pembayaran manual untuk proyek ini. Berbeda dari pembayaran online via invoice.</div>
              <div class="form-group">
                <label class="form-label">Tipe Pembayaran <span class="required">*</span></label>
                <select class="form-control" name="payment_type" required>
                  <option value="dp">DP / Uang Muka</option>
                  <option value="remaining">Pelunasan</option>
                  <option value="custom">Pembayaran Lainnya</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Jumlah (Rp) <span class="required">*</span></label>
                  <div class="input-group">
                    <span class="input-prefix">Rp</span>
                    <input type="number" class="form-control" name="amount" min="1" step="1000" required>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal <span class="required">*</span></label>
                  <input type="date" class="form-control" name="transaction_date" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Metode Pembayaran</label>
                <select class="form-control" name="payment_method">
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Catatan</label>
                <textarea class="form-control" name="notes" rows="2"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline modal-close">Batal</button>
              <button type="submit" class="btn btn-success">Catat Pembayaran</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  _openPaymentModal(project) {
    const form = document.getElementById('form-payment');
    form.reset(); form.removeAttribute('data-project-id');
    form.setAttribute('data-project-id', project.id);
    form.transaction_date.value = new Date().toISOString().split('T')[0];

    // Suggest DP amount if not yet paid
    if (project.dp_paid < project.dp_amount) {
      form.amount.value = project.dp_amount - project.dp_paid;
    } else {
      form.amount.value = project.total_value - project.dp_paid - project.remaining_paid;
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const fd = new FormData(form);
        await API.post('/projects/' + form.getAttribute('data-project-id') + '/record-payment', Object.fromEntries(fd));
        Toast.success('Pembayaran tercatat');
        Modal.close('modal-payment');
        if (window._paymentSaveCallback) window._paymentSaveCallback();
      } catch (err) {
        Toast.error(err.message);
        btn.disabled = false;
      }
    };

    Modal.open('modal-payment');
  },

  _invoiceModal() {
    return `
      <div class="modal-overlay" id="modal-invoice">
        <div class="modal">
          <div class="modal-header">
            <h3>Buat Invoice Online</h3>
            <button class="modal-close">×</button>
          </div>
          <form id="form-invoice">
            <div class="modal-body">
              <div class="alert alert-info" style="font-size:12px">Invoice akan dikirim via Midtrans Payment Gateway. Pastikan konfigurasi Midtrans sudah benar.</div>
              <div class="form-group">
                <label class="form-label">Tipe Tagihan <span class="required">*</span></label>
                <select class="form-control" name="payment_type" required>
                  <option value="dp">DP / Uang Muka</option>
                  <option value="remaining">Pelunasan</option>
                  <option value="full">Pembayaran Penuh</option>
                  <option value="custom">Nominal Lainnya</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Jumlah (Rp) <span class="required">*</span></label>
                <div class="input-group">
                  <span class="input-prefix">Rp</span>
                  <input type="number" class="form-control" name="amount" min="1" step="1000" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Keterangan</label>
                <input type="text" class="form-control" name="description" placeholder="Keterangan yang muncul di halaman pembayaran">
              </div>
              <div class="alert alert-warning" style="font-size:12px">
                ⚠️ Jika sudah ada invoice pending untuk tipe yang sama, batalkan dulu sebelum membuat yang baru.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline modal-close">Batal</button>
              <button type="submit" class="btn btn-primary" id="btn-create-inv">Buat Invoice</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  _openInvoiceModal(project) {
    const form = document.getElementById('form-invoice');
    form.reset(); form.removeAttribute('data-project-id');
    form.setAttribute('data-project-id', project.id);

    // Auto-fill amount
    form.querySelector('[name=amount]').value =
      project.dp_paid < project.dp_amount ? project.dp_amount - project.dp_paid
      : Math.max(0, project.total_value - project.dp_paid - project.remaining_paid);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-create-inv');
      btn.disabled = true; btn.textContent = 'Membuat...';
      try {
        const fd = new FormData(form);
        const inv = await API.post('/invoices', {
          project_id: parseInt(form.getAttribute('data-project-id')),
          ...Object.fromEntries(fd)
        });
        Toast.success('Invoice berhasil dibuat');
        Modal.close('modal-invoice');
        if (window._invoiceSaveCallback) window._invoiceSaveCallback();

        // Auto-open Snap if token available
        if (inv.midtrans_snap_token && window.snap) {
          setTimeout(() => {
            window.snap.pay(inv.midtrans_snap_token, {
              onSuccess: () => Toast.success('Pembayaran berhasil!'),
              onPending: () => Toast.info('Pembayaran pending'),
              onError: () => Toast.error('Pembayaran gagal'),
              onClose: () => {}
            });
          }, 500);
        } else if (inv.midtrans_payment_url) {
          if (confirm('Invoice berhasil dibuat. Buka halaman pembayaran sekarang?')) {
            window.open(inv.midtrans_payment_url, '_blank');
          }
        } else {
          Toast.warning('Invoice dibuat tapi Midtrans belum dikonfigurasi. Atur MIDTRANS_SERVER_KEY di .env');
        }
      } catch (err) {
        Toast.error(err.message);
        btn.disabled = false; btn.textContent = 'Buat Invoice';
      }
    };

    Modal.open('modal-invoice');
  },

  /* ── CLIENTS ────────────────────────────────────────────────────────── */
  async clients(el) {
    document.getElementById('page-title').textContent = 'Klien';
    let currentPage = 1;
    let search = '';

    const render = async () => {
      const q = new URLSearchParams({ page: currentPage, limit: 20, ...(search ? { search } : {}) });
      const d = await API.get('/clients?' + q);

      el.innerHTML = `
        <div class="page-content">
          <div class="page-header">
            <h1>Data Klien</h1>
            <div class="page-header-actions">
              <button class="btn btn-primary" id="btn-add-client">+ Klien Baru</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="filter-bar" style="margin:0">
                <input type="text" class="form-control search-input" id="client-search" placeholder="Cari nama, HP, email..." value="${search}">
                <button class="btn btn-outline" id="btn-client-search">Cari</button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Nama</th><th>No. HP</th><th>Email</th><th>Alamat</th><th>Bergabung</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  ${d.data.length === 0
                    ? '<tr><td class="table-empty" colspan="6">Belum ada data klien</td></tr>'
                    : d.data.map(c => `
                      <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.phone || '-'}</td>
                        <td>${c.email || '-'}</td>
                        <td style="max-width:200px;font-size:12px">${c.address || '-'}</td>
                        <td style="font-size:12px">${FMT.date(c.created_at)}</td>
                        <td>
                          <button class="btn btn-ghost btn-sm btn-edit-client" data-id="${c.id}">✏️</button>
                          <button class="btn btn-ghost btn-sm btn-del-client" data-id="${c.id}">🗑️</button>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
            ${d.pagination.pages > 1 ? `
              <div class="pagination">
                <button class="page-btn" id="prev-page" ${currentPage<=1?'disabled':''}>‹</button>
                <span style="padding:0 12px;font-size:13px">${currentPage}/${d.pagination.pages}</span>
                <button class="page-btn" id="next-page" ${currentPage>=d.pagination.pages?'disabled':''}>›</button>
              </div>` : ''}
          </div>
        </div>
        <div class="modal-overlay" id="modal-client">
          <div class="modal">
            <div class="modal-header"><h3 id="client-modal-title">Klien Baru</h3><button class="modal-close">×</button></div>
            <form id="form-client">
              <div class="modal-body">
                <div class="form-group"><label class="form-label">Nama <span class="required">*</span></label><input type="text" class="form-control" name="name" required></div>
                <div class="form-row">
                  <div class="form-group"><label class="form-label">No. HP</label><input type="text" class="form-control" name="phone"></div>
                  <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" name="email"></div>
                </div>
                <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-control" name="address" rows="2"></textarea></div>
                <div class="form-group"><label class="form-label">Catatan</label><textarea class="form-control" name="notes" rows="2"></textarea></div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline modal-close">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const openModal = (data) => {
        const form = document.getElementById('form-client');
        form.reset(); form.removeAttribute('data-id');
        document.getElementById('client-modal-title').textContent = data ? 'Edit Klien' : 'Klien Baru';
        if (data) {
          form.setAttribute('data-id', data.id);
          form.name.value = data.name;
          form.phone.value = data.phone || '';
          form.email.value = data.email || '';
          form.address.value = data.address || '';
          form.notes.value = data.notes || '';
        }
        form.onsubmit = async (e) => {
          e.preventDefault();
          const btn = form.querySelector('[type=submit]');
          btn.disabled = true;
          try {
            const fd = new FormData(form); const body = Object.fromEntries(fd);
            const id = form.getAttribute('data-id');
            if (id) await API.put('/clients/' + id, body);
            else await API.post('/clients', body);
            Toast.success('Data klien disimpan'); Modal.close('modal-client'); render();
          } catch (err) { Toast.error(err.message); btn.disabled = false; }
        };
        Modal.open('modal-client');
      };

      el.querySelector('#btn-add-client').onclick = () => openModal(null);
      el.querySelector('#btn-client-search').onclick = () => { search = el.querySelector('#client-search').value; currentPage = 1; render(); };
      el.querySelector('#client-search').onkeydown = (e) => { if (e.key === 'Enter') { search = e.target.value; currentPage = 1; render(); } };

      el.querySelectorAll('.btn-edit-client').forEach(btn => {
        btn.onclick = async () => { const c = await API.get('/clients/' + btn.dataset.id); openModal(c); };
      });
      el.querySelectorAll('.btn-del-client').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Hapus klien ini?')) return;
          try { await API.delete('/clients/' + btn.dataset.id); Toast.success('Klien dihapus'); render(); }
          catch (err) { Toast.error(err.message); }
        };
      });

      const prev = el.querySelector('#prev-page'); const next = el.querySelector('#next-page');
      if (prev) prev.onclick = () => { currentPage--; render(); };
      if (next) next.onclick = () => { currentPage++; render(); };
    };

    await render();
  },

  /* ── INVOICES ───────────────────────────────────────────────────────── */
  async invoices(el) {
    document.getElementById('page-title').textContent = 'Invoice Online';
    let currentPage = 1;
    let statusFilter = '';

    const render = async () => {
      const q = new URLSearchParams({ page: currentPage, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) });
      const d = await API.get('/invoices?' + q);

      el.innerHTML = `
        <div class="page-content">
          <div class="page-header">
            <h1>Invoice Pembayaran Online</h1>
          </div>
          <div class="alert alert-info mb-2">
            💡 Invoice online dibuat dari halaman detail proyek. Pembayaran diverifikasi otomatis oleh Midtrans via webhook.
            Status akan diperbarui otomatis setelah pembayaran dikonfirmasi.
          </div>
          <div class="card">
            <div class="card-header">
              <div class="filter-bar" style="margin:0">
                <select class="form-control" id="inv-status" style="max-width:170px">
                  <option value="">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="paid">Terbayar</option>
                  <option value="expired">Kedaluwarsa</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
                <button class="btn btn-outline" id="btn-inv-filter">Filter</button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Kode Invoice</th><th>Proyek</th><th>Klien</th><th>Tipe</th><th>Jumlah</th><th>Status</th><th>Rekonsil.</th><th>Dibayar</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  ${d.data.length === 0
                    ? '<tr><td class="table-empty" colspan="9">Belum ada invoice</td></tr>'
                    : d.data.map(inv => `
                      <tr>
                        <td><code style="font-size:11px">${inv.invoice_code}</code></td>
                        <td style="font-size:12px">${inv.project_title}<br><code style="font-size:10px">${inv.project_code}</code></td>
                        <td>${inv.client_name}</td>
                        <td><span class="badge badge-gray">${inv.payment_type}</span></td>
                        <td class="money">${FMT.money(inv.amount)}</td>
                        <td>${Badges.invoice(inv.status)}</td>
                        <td>${inv.reconciled ? '<span class="badge badge-success">✓ Ya</span>' : '<span class="badge badge-gray">Belum</span>'}</td>
                        <td style="font-size:12px">${inv.paid_at ? FMT.date(inv.paid_at) : '-'}</td>
                        <td>
                          ${inv.status === 'pending' && inv.midtrans_payment_url
                            ? `<a href="${inv.midtrans_payment_url}" target="_blank" class="btn btn-primary btn-sm">Bayar</a>
                               <button class="btn btn-ghost btn-sm btn-cancel-inv" data-id="${inv.id}">✕</button>`
                            : ''}
                          ${inv.status === 'paid' && !inv.reconciled
                            ? `<button class="btn btn-warning btn-sm btn-manual-rec" data-id="${inv.id}" style="background:var(--warning-light);color:var(--warning);border-color:var(--warning)">Rekonsil Manual</button>`
                            : ''}
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
            ${d.pagination.pages > 1 ? `
              <div class="pagination">
                <button class="page-btn" id="prev-page" ${currentPage<=1?'disabled':''}>‹</button>
                <span style="padding:0 12px;font-size:13px">${currentPage}/${d.pagination.pages}</span>
                <button class="page-btn" id="next-page" ${currentPage>=d.pagination.pages?'disabled':''}>›</button>
              </div>` : ''}
          </div>
        </div>
      `;

      el.querySelector('#btn-inv-filter').onclick = () => { statusFilter = el.querySelector('#inv-status').value; currentPage = 1; render(); };
      el.querySelectorAll('.btn-cancel-inv').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Batalkan invoice ini?')) return;
          try { await API.post('/invoices/' + btn.dataset.id + '/cancel'); Toast.success('Dibatalkan'); render(); }
          catch (err) { Toast.error(err.message); }
        };
      });
      el.querySelectorAll('.btn-manual-rec').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Rekonsiliasi manual invoice ini?')) return;
          try {
            await API.post('/reports/reconciliation/' + btn.dataset.id + '/manual', { transaction_date: new Date().toISOString().split('T')[0] });
            Toast.success('Rekonsiliasi berhasil'); render();
          } catch (err) { Toast.error(err.message); }
        };
      });
      const prev = el.querySelector('#prev-page'); const next = el.querySelector('#next-page');
      if (prev) prev.onclick = () => { currentPage--; render(); };
      if (next) next.onclick = () => { currentPage++; render(); };
    };

    await render();
  },

  /* ── REPORTS ────────────────────────────────────────────────────────── */
  async reports(el) {
    document.getElementById('page-title').textContent = 'Laporan';
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let activeTab = 'monthly';

    const render = async () => {
      const mData = await API.get(`/reports/monthly?year=${year}&month=${month}`);
      const aData = await API.get(`/reports/annual?year=${year}`);

      el.innerHTML = `
        <div class="page-content">
          <div class="page-header">
            <h1>Laporan Keuangan</h1>
            <div class="page-header-actions">
              <select class="form-control" id="rpt-year" style="max-width:100px">
                ${[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y =>
                  `<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}
              </select>
              <select class="form-control" id="rpt-month" style="max-width:120px">
                ${Array.from({length:12},(_,i) => `<option value="${i+1}" ${i+1===month?'selected':''}>${FMT.monthName(String(i+1).padStart(2,'0'))}</option>`).join('')}
              </select>
              <button class="btn btn-primary" id="btn-rpt-filter">Tampilkan</button>
            </div>
          </div>

          <div class="tabs">
            <button class="tab-btn ${activeTab==='monthly'?'active':''}" data-tab="monthly">Laporan Bulanan</button>
            <button class="tab-btn ${activeTab==='annual'?'active':''}" data-tab="annual">Laporan Tahunan</button>
            <button class="tab-btn ${activeTab==='projects'?'active':''}" data-tab="projects">Ringkasan Proyek</button>
          </div>

          <div id="rpt-content">
            ${activeTab === 'monthly' ? Pages._renderMonthlyReport(mData)
            : activeTab === 'annual' ? Pages._renderAnnualReport(aData)
            : '<div id="rpt-projects-placeholder"></div>'}
          </div>
        </div>
      `;

      el.querySelector('#btn-rpt-filter').onclick = () => {
        year = parseInt(el.querySelector('#rpt-year').value);
        month = parseInt(el.querySelector('#rpt-month').value);
        render();
      };

      el.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.tab; render(); };
      });

      if (activeTab === 'projects') {
        Pages._loadProjectReport(el.querySelector('#rpt-projects-placeholder'), year);
      }

      // Draw charts after render
      if (activeTab === 'monthly' && mData.dailyData.length > 0) {
        const canvas = document.getElementById('rpt-daily-chart');
        if (canvas) {
          Pages._drawBarChart(canvas.getContext('2d'), canvas,
            mData.dailyData.map(d => d.transaction_date.slice(5)),
            [
              { label: 'Pemasukan', data: mData.dailyData.map(d => d.income), color: '#16a34a' },
              { label: 'Pengeluaran', data: mData.dailyData.map(d => d.expense), color: '#dc2626' }
            ]
          );
        }
      }
      if (activeTab === 'annual') {
        const canvas = document.getElementById('rpt-annual-chart');
        if (canvas) {
          const months = Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
          const dataMap = {}; aData.monthlyBreakdown.forEach(d => { dataMap[d.month] = d; });
          Pages._drawBarChart(canvas.getContext('2d'), canvas,
            months.map(m => FMT.monthName(m)),
            [
              { label: 'Pemasukan', data: months.map(m => dataMap[m]?.income || 0), color: '#16a34a' },
              { label: 'Pengeluaran', data: months.map(m => dataMap[m]?.expense || 0), color: '#dc2626' }
            ]
          );
        }
      }
    };

    await render();
  },

  _renderMonthlyReport(d) {
    const months = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-icon">📈</div><div class="stat-label">Total Pemasukan</div><div class="stat-value">${FMT.money(d.summary.total_income)}</div><div class="stat-sub">${d.summary.income_count} transaksi</div></div>
        <div class="stat-card danger"><div class="stat-icon">📉</div><div class="stat-label">Total Pengeluaran</div><div class="stat-value">${FMT.money(d.summary.total_expense)}</div><div class="stat-sub">${d.summary.expense_count} transaksi</div></div>
        <div class="stat-card ${d.summary.net >= 0 ? 'primary' : 'warning'}"><div class="stat-icon">💰</div><div class="stat-label">Laba Bersih</div><div class="stat-value">${FMT.money(d.summary.net)}</div><div class="stat-sub">${months[d.period.month]} ${d.period.year}</div></div>
      </div>
      <div class="card mb-2">
        <div class="card-header"><h2>📊 Grafik Harian</h2></div>
        <div class="card-body"><canvas id="rpt-daily-chart" height="200"></canvas></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header"><h2>💚 Rincian Pemasukan</h2></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Kategori</th><th class="text-right">Jumlah</th><th>Transaksi</th></tr></thead>
              <tbody>
                ${d.incomeByCategory.length === 0
                  ? '<tr><td class="table-empty" colspan="3">Tidak ada data</td></tr>'
                  : d.incomeByCategory.map(c => `<tr><td>${c.category}</td><td class="money money-positive text-right">${FMT.money(c.total)}</td><td>${c.count}x</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>❤️ Rincian Pengeluaran</h2></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Kategori</th><th class="text-right">Jumlah</th><th>Transaksi</th></tr></thead>
              <tbody>
                ${d.expenseByCategory.length === 0
                  ? '<tr><td class="table-empty" colspan="3">Tidak ada data</td></tr>'
                  : d.expenseByCategory.map(c => `<tr><td>${c.category}</td><td class="money money-negative text-right">${FMT.money(c.total)}</td><td>${c.count}x</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  _renderAnnualReport(d) {
    return `
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-icon">📈</div><div class="stat-label">Total Pemasukan ${d.year}</div><div class="stat-value">${FMT.money(d.summary.total_income)}</div></div>
        <div class="stat-card danger"><div class="stat-icon">📉</div><div class="stat-label">Total Pengeluaran ${d.year}</div><div class="stat-value">${FMT.money(d.summary.total_expense)}</div></div>
        <div class="stat-card ${d.summary.net >= 0 ? 'primary' : 'warning'}"><div class="stat-icon">💰</div><div class="stat-label">Laba Bersih ${d.year}</div><div class="stat-value">${FMT.money(d.summary.net)}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>📊 Grafik Bulanan ${d.year}</h2></div>
        <div class="card-body"><canvas id="rpt-annual-chart" height="220"></canvas></div>
      </div>
    `;
  },

  async _loadProjectReport(el, year) {
    const d = await API.get('/reports/projects?year=' + year);
    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card primary"><div class="stat-icon">📁</div><div class="stat-label">Total Proyek</div><div class="stat-value">${d.summary.total_projects}</div></div>
        <div class="stat-card success"><div class="stat-icon">✅</div><div class="stat-label">Sudah Lunas</div><div class="stat-value">${d.summary.fully_paid}</div></div>
        <div class="stat-card warning"><div class="stat-icon">💰</div><div class="stat-label">Nilai Terkumpul</div><div class="stat-value">${FMT.money(d.summary.total_collected)}</div></div>
        <div class="stat-card danger"><div class="stat-icon">⏳</div><div class="stat-label">Sisa Tagihan</div><div class="stat-value">${FMT.money(d.summary.total_outstanding)}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Kode</th><th>Proyek</th><th>Klien</th><th>Total</th><th>Terbayar</th><th>Sisa</th><th>%</th><th>Status</th></tr></thead>
            <tbody>
              ${d.projects.length === 0
                ? '<tr><td class="table-empty" colspan="8">Tidak ada proyek</td></tr>'
                : d.projects.map(p => `
                  <tr>
                    <td><code style="font-size:11px">${p.project_code}</code></td>
                    <td>${p.title}</td>
                    <td>${p.client_name}</td>
                    <td class="money">${FMT.money(p.total_value)}</td>
                    <td class="money money-positive">${FMT.money(p.total_paid)}</td>
                    <td class="money money-negative">${FMT.money(p.outstanding)}</td>
                    <td>
                      <div class="progress-bar" style="width:80px">
                        <div class="progress-fill ${p.payment_pct>=100?'success':p.payment_pct>=50?'warning':''}" style="width:${p.payment_pct}%"></div>
                      </div>
                      <div style="font-size:10px;color:var(--text-muted)">${p.payment_pct}%</div>
                    </td>
                    <td>${Badges.project(p.status)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ── RECONCILIATION ─────────────────────────────────────────────────── */
  async reconciliation(el) {
    document.getElementById('page-title').textContent = 'Rekonsiliasi';
    const d = await API.get('/reports/reconciliation');

    el.innerHTML = `
      <div class="page-content">
        <div class="page-header"><h1>Rekonsiliasi Pembayaran</h1></div>

        <div class="alert alert-info mb-2">
          <div>
            <strong>Cara Kerja Rekonsiliasi:</strong><br>
            • Pembayaran online via Midtrans diverifikasi menggunakan webhook resmi (SHA-512 signature).<br>
            • Setelah terkonfirmasi, sistem otomatis mencatat transaksi pemasukan dan menandai invoice sebagai terekonsiliasi.<br>
            • Transaksi online (<code>source='online'</code>) tidak bisa diedit/dihapus manual untuk menjaga integritas data.<br>
            • Jika webhook gagal, gunakan tombol "Rekonsil Manual" di bawah.
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card success"><div class="stat-icon">✅</div><div class="stat-label">Sudah Terekonsil</div><div class="stat-value">${d.stats.reconciled_count}</div><div class="stat-sub">${FMT.money(d.stats.reconciled_amount)}</div></div>
          <div class="stat-card warning"><div class="stat-icon">⏳</div><div class="stat-label">Belum Terekonsil</div><div class="stat-value">${d.stats.unreconciled_count}</div><div class="stat-sub">${FMT.money(d.stats.unreconciled_amount)}</div></div>
        </div>

        ${d.unreconciled.length > 0 ? `
          <div class="card mb-2">
            <div class="card-header"><h2>⚠️ Invoice Terbayar Belum Direkonsiliasi</h2></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Proyek</th><th>Klien</th><th>Tipe</th><th>Jumlah</th><th>Dibayar</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${d.unreconciled.map(inv => `
                    <tr>
                      <td><code style="font-size:11px">${inv.invoice_code}</code></td>
                      <td>${inv.project_title}</td>
                      <td>${inv.client_name}</td>
                      <td>${inv.payment_type}</td>
                      <td class="money">${FMT.money(inv.amount)}</td>
                      <td>${FMT.date(inv.paid_at)}</td>
                      <td>
                        <button class="btn btn-primary btn-sm btn-rec" data-id="${inv.id}">Rekonsiliasi</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}

        <div class="card">
          <div class="card-header"><h2>✅ Riwayat Rekonsiliasi (30 Terakhir)</h2></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Proyek</th><th>Klien</th><th>Jumlah</th><th>Kode Transaksi</th><th>Terekonsil</th></tr></thead>
              <tbody>
                ${d.reconciled.length === 0
                  ? '<tr><td class="table-empty" colspan="6">Belum ada data rekonsiliasi</td></tr>'
                  : d.reconciled.map(inv => `
                    <tr>
                      <td><code style="font-size:11px">${inv.invoice_code}</code></td>
                      <td>${inv.project_title}</td>
                      <td>${inv.client_name}</td>
                      <td class="money">${FMT.money(inv.amount)}</td>
                      <td><code style="font-size:11px">${inv.transaction_code || '-'}</code></td>
                      <td style="font-size:12px">${FMT.date(inv.reconciled_at)}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    el.querySelectorAll('.btn-rec').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Rekonsiliasi manual invoice ini? Transaksi pemasukan akan dibuat secara manual.')) return;
        try {
          await API.post('/reports/reconciliation/' + btn.dataset.id + '/manual', {
            transaction_date: new Date().toISOString().split('T')[0]
          });
          Toast.success('Rekonsiliasi berhasil');
          Pages.reconciliation(el);
        } catch (err) { Toast.error(err.message); }
      };
    });
  },

  /* ── SETTINGS ───────────────────────────────────────────────────────── */
  async settings(el) {
    document.getElementById('page-title').textContent = 'Pengaturan';

    el.innerHTML = `
      <div class="page-content">
        <div class="page-header"><h1>Pengaturan</h1></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card">
            <div class="card-header"><h2>🔒 Ubah Password</h2></div>
            <form id="form-change-pwd" class="card-body">
              <div class="form-group">
                <label class="form-label">Password Lama <span class="required">*</span></label>
                <input type="password" class="form-control" name="currentPassword" required>
              </div>
              <div class="form-group">
                <label class="form-label">Password Baru <span class="required">*</span></label>
                <input type="password" class="form-control" name="newPassword" required minlength="6">
              </div>
              <div class="form-group">
                <label class="form-label">Konfirmasi Password Baru <span class="required">*</span></label>
                <input type="password" class="form-control" name="confirmPassword" required>
              </div>
              <button type="submit" class="btn btn-primary">Ubah Password</button>
            </form>
          </div>

          <div class="card">
            <div class="card-header"><h2>💳 Konfigurasi Midtrans</h2></div>
            <div class="card-body">
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
                Konfigurasi payment gateway diatur melalui file <code>.env</code> di server.
              </p>
              <div class="alert alert-info" style="font-size:12px">
                <strong>Langkah Konfigurasi:</strong><br>
                1. Daftar di <a href="https://dashboard.midtrans.com" target="_blank">dashboard.midtrans.com</a><br>
                2. Salin Server Key dan Client Key dari Sandbox<br>
                3. Update nilai di file <code>.env</code>:<br>
                <code>MIDTRANS_SERVER_KEY=SB-Mid-server-...</code><br>
                <code>MIDTRANS_CLIENT_KEY=SB-Mid-client-...</code><br>
                4. Restart server<br>
                5. Set notification URL di Midtrans Dashboard:<br>
                <code>http://your-domain.com/api/payment/notification</code>
              </div>
              <div class="alert alert-warning" style="font-size:12px">
                ⚠️ Jangan pernah ekspos Server Key di sisi klien/frontend.
              </div>
            </div>
          </div>
        </div>

        <div class="card mt-2">
          <div class="card-header"><h2>🏷️ Kategori Transaksi</h2></div>
          <div id="cats-container" class="card-body">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    // Change password
    el.querySelector('#form-change-pwd').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { currentPassword, newPassword, confirmPassword } = Object.fromEntries(fd);
      if (newPassword !== confirmPassword) { Toast.error('Konfirmasi password tidak cocok'); return; }
      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        await API.post('/auth/change-password', { currentPassword, newPassword });
        Toast.success('Password berhasil diubah');
        e.target.reset();
      } catch (err) { Toast.error(err.message); }
      finally { btn.disabled = false; }
    };

    // Load categories
    const cats = await API.get('/categories');
    const catsEl = el.querySelector('#cats-container');
    catsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="font-weight:600;margin-bottom:8px;color:var(--success)">💚 Pemasukan</div>
          ${cats.filter(c=>c.type==='income').map(c => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light)">
              <span style="flex:1;font-size:13px">${c.name}</span>
              ${!c.is_default ? `<button class="btn btn-ghost btn-sm btn-del-cat" data-id="${c.id}">🗑️</button>` : '<span style="font-size:11px;color:var(--text-muted)">Default</span>'}
            </div>
          `).join('')}
        </div>
        <div>
          <div style="font-weight:600;margin-bottom:8px;color:var(--danger)">❤️ Pengeluaran</div>
          ${cats.filter(c=>c.type==='expense').map(c => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light)">
              <span style="flex:1;font-size:13px">${c.name}</span>
              ${!c.is_default ? `<button class="btn btn-ghost btn-sm btn-del-cat" data-id="${c.id}">🗑️</button>` : '<span style="font-size:11px;color:var(--text-muted)">Default</span>'}
            </div>
          `).join('')}
        </div>
      </div>
      <hr>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div class="form-group" style="margin:0;flex:1">
          <label class="form-label">Nama Kategori Baru</label>
          <input type="text" class="form-control" id="new-cat-name" placeholder="Nama kategori">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Tipe</label>
          <select class="form-control" id="new-cat-type">
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-add-cat">Tambah</button>
      </div>
    `;

    catsEl.querySelector('#btn-add-cat').onclick = async () => {
      const name = catsEl.querySelector('#new-cat-name').value.trim();
      const type = catsEl.querySelector('#new-cat-type').value;
      if (!name) { Toast.error('Nama kategori wajib diisi'); return; }
      try {
        await API.post('/categories', { name, type });
        Toast.success('Kategori ditambahkan');
        Pages.settings(el);
      } catch (err) { Toast.error(err.message); }
    };

    catsEl.querySelectorAll('.btn-del-cat').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Hapus kategori ini?')) return;
        try { await API.delete('/categories/' + btn.dataset.id); Toast.success('Dihapus'); Pages.settings(el); }
        catch (err) { Toast.error(err.message); }
      };
    });
  }
};

