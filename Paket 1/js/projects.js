/**
 * projects.js — Photography & Videography project management
 */
const Projects = (() => {
  const KEY = 'pf_projects';

  const PROJECT_TYPES = ['Fotografi', 'Videografi', 'Foto + Video'];
  const PROJECT_STATUS = ['active', 'completed', 'cancelled'];
  const STATUS_LABEL = { active: 'Aktif', completed: 'Selesai', cancelled: 'Dibatalkan' };
  const PAY_LABEL    = { pending: 'Belum Bayar', partial: 'DP', paid: 'Lunas' };

  function getAll()   { return Storage.tGet(KEY, []); }
  function save(list) { Storage.tSet(KEY, list); }

  function add(proj) {
    const list    = getAll();
    const id      = Utils.uid();
    const paid    = Number(proj.paidAmount) || 0;
    const total   = Number(proj.totalValue) || 0;
    const payStatus = paid <= 0 ? 'pending' : paid >= total ? 'paid' : 'partial';
    list.unshift({ ...proj, id, paidAmount: paid, paymentStatus: payStatus, paymentHistory: proj.paymentHistory || [], createdAt: Date.now() });
    save(list);
    return id;
  }

  function update(id, data) {
    const list = getAll();
    const idx  = list.findIndex(p => p.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...data };
    save(list);
    return true;
  }

  function remove(id) {
    save(getAll().filter(p => p.id !== id));
  }

  function getById(id) {
    return getAll().find(p => p.id === id) || null;
  }

  function _calcPayStatus(p) {
    if (p.paidAmount <= 0)             return 'pending';
    if (p.paidAmount >= p.totalValue)  return 'paid';
    return 'partial';
  }

  // ─── Render ──────────────────────────────────────────────
  let _filterStatus = 'all';
  let _filterSearch = '';

  function render() {
    const projs = _getFiltered();
    const all   = getAll().filter(p => p.status !== 'cancelled');
    const totalValue    = all.reduce((s, p) => s + p.totalValue, 0);
    const totalPaid     = all.reduce((s, p) => s + p.paidAmount, 0);
    const totalPending  = totalValue - totalPaid;
    const countActive   = all.filter(p => p.status === 'active').length;
    const countDone     = getAll().filter(p => p.status === 'completed').length;

    document.getElementById('main-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2>Manajemen Proyek</h2>
        <p>Kelola proyek foto &amp; video beserta pembayarannya</p>
      </div>
      <button class="btn-accent" id="btn-add-proj">+ Tambah Proyek</button>
    </div>

    <div class="project-stats">
      <div class="proj-stat">
        <div class="proj-stat-label">Proyek Aktif</div>
        <div class="proj-stat-value">${countActive}</div>
      </div>
      <div class="proj-stat">
        <div class="proj-stat-label">Proyek Selesai</div>
        <div class="proj-stat-value">${countDone}</div>
      </div>
      <div class="proj-stat">
        <div class="proj-stat-label">Total Nilai Proyek</div>
        <div class="proj-stat-value" style="font-size:15px">${Utils.formatRp(totalValue)}</div>
      </div>
      <div class="proj-stat">
        <div class="proj-stat-label">Sudah Dibayar</div>
        <div class="proj-stat-value text-income" style="font-size:15px">${Utils.formatRp(totalPaid)}</div>
      </div>
      <div class="proj-stat">
        <div class="proj-stat-label">Sisa Tagihan</div>
        <div class="proj-stat-value text-expense" style="font-size:15px">${Utils.formatRp(totalPending)}</div>
      </div>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;align-items:center">
      <input type="text" id="proj-search" placeholder="Cari nama klien / proyek…"
        style="padding:8px 13px;border:1.5px solid var(--clr-border);border-radius:6px;font-size:13.5px;outline:none;min-width:220px"
        value="${Utils.esc(_filterSearch)}" />
      <select id="proj-status-filter"
        style="padding:8px 13px;border:1.5px solid var(--clr-border);border-radius:6px;font-size:13.5px;outline:none;background:#fff;min-width:150px">
        <option value="all"       ${_filterStatus === 'all'       ? 'selected' : ''}>Semua Status</option>
        <option value="active"    ${_filterStatus === 'active'    ? 'selected' : ''}>Aktif</option>
        <option value="completed" ${_filterStatus === 'completed' ? 'selected' : ''}>Selesai</option>
        <option value="cancelled" ${_filterStatus === 'cancelled' ? 'selected' : ''}>Dibatalkan</option>
      </select>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Klien</th>
                <th>Proyek</th>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th style="text-align:right">Nilai</th>
                <th style="text-align:right">DP</th>
                <th style="text-align:right">Sisa</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="proj-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

    document.getElementById('btn-add-proj').addEventListener('click', () => _openForm());
    document.getElementById('proj-search').addEventListener('input', e => { _filterSearch = e.target.value; _renderTable(); });
    document.getElementById('proj-status-filter').addEventListener('change', e => { _filterStatus = e.target.value; _renderTable(); });
    _renderTable();
  }

  function _getFiltered() {
    let list = getAll();
    if (_filterStatus !== 'all') list = list.filter(p => p.status === _filterStatus);
    if (_filterSearch) {
      const q = _filterSearch.toLowerCase();
      list = list.filter(p => p.clientName.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function _renderTable() {
    const list  = _getFiltered();
    const tbody = document.getElementById('proj-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <p>Belum ada proyek ditemukan.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const remaining = p.totalValue - p.paidAmount;
      const pct = Math.min(100, Math.round((p.paidAmount / p.totalValue) * 100) || 0);
      const payStatus = _calcPayStatus(p);
      const typeClass = p.projectType === 'Fotografi' ? 'proj-type-photo' : p.projectType === 'Videografi' ? 'proj-type-video' : 'proj-type-both';
      return `
        <tr>
          <td>
            <div style="font-weight:700">${Utils.esc(p.clientName)}</div>
            <div style="font-size:12px;color:var(--clr-muted)">${Utils.esc(p.phone || '')}</div>
          </td>
          <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(p.projectName)}</td>
          <td style="white-space:nowrap;font-size:13px">${Utils.formatDate(p.shootDate || p.createdAt)}</td>
          <td><span class="badge ${typeClass}">${Utils.esc(p.projectType)}</span></td>
          <td style="text-align:right;font-weight:700">${Utils.formatRp(p.totalValue)}</td>
          <td style="text-align:right">${Utils.formatRp(p.dp || 0)}</td>
          <td style="text-align:right;font-weight:600;color:var(--clr-expense)">${Utils.formatRp(remaining)}</td>
          <td>
            <div style="min-width:80px">
              <span class="badge badge-${payStatus}">${PAY_LABEL[payStatus]}</span>
              <div class="progress-wrap" style="margin-top:4px">
                <div class="progress-bar ${payStatus}" style="width:${pct}%"></div>
              </div>
              <div style="font-size:11px;color:var(--clr-muted);margin-top:2px">${pct}%</div>
            </div>
          </td>
          <td><span class="badge ${p.status === 'active' ? 'badge-partial' : p.status === 'completed' ? 'badge-paid' : 'badge-cancelled'}">${STATUS_LABEL[p.status]}</span></td>
          <td>
            <div class="td-actions">
              <button class="btn-icon btn-edit" title="Detail / Edit" data-id="${p.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon" title="Tambah Pembayaran" data-pay="${p.id}" style="color:var(--clr-income)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button class="btn-icon btn-del" title="Hapus" data-id="${p.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(b  => b.addEventListener('click', () => _openDetail(b.dataset.id)));
    tbody.querySelectorAll('[data-pay]').forEach(b  => b.addEventListener('click', () => _openPayment(b.dataset.pay)));
    tbody.querySelectorAll('.btn-del').forEach(b   => b.addEventListener('click', () => {
      Utils.confirmModal('Hapus proyek ini? Tindakan tidak dapat diurungkan.', () => {
        remove(b.dataset.id);
        _renderTable();
        Utils.toast('Proyek dihapus.');
      });
    }));
  }

  // ─── Add / Edit Form ─────────────────────────────────────
  function _openForm(id = null) {
    const p = id ? getById(id) : null;
    const isEdit = !!p;

    const html = `
      <form id="proj-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label>Nama Klien <span style="color:red">*</span></label>
            <input type="text" id="pf-client" placeholder="Nama lengkap klien" value="${Utils.esc(p ? p.clientName : '')}" required />
            <span class="field-error" id="pe-client"></span>
          </div>
          <div class="form-group">
            <label>No. Telepon</label>
            <input type="tel" id="pf-phone" placeholder="08xxxxxxxxxx" value="${Utils.esc(p ? p.phone || '' : '')}" />
          </div>
        </div>
        <div class="form-group">
          <label>Nama Proyek <span style="color:red">*</span></label>
          <input type="text" id="pf-name" placeholder="Contoh: Wedding Adi &amp; Rina di Bali" value="${Utils.esc(p ? p.projectName : '')}" required />
          <span class="field-error" id="pe-name"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Jenis Layanan <span style="color:red">*</span></label>
            <select id="pf-type">
              ${PROJECT_TYPES.map(t => `<option value="${t}" ${p && p.projectType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tanggal Pemotretan</label>
            <input type="date" id="pf-shoot" value="${p ? Utils.toInputDate(p.shootDate) : ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nilai Total (Rp) <span style="color:red">*</span></label>
            <input type="number" id="pf-total" min="0" step="1000" placeholder="5000000" value="${p ? p.totalValue : ''}" required />
            <span class="field-error" id="pe-total"></span>
          </div>
          <div class="form-group">
            <label>DP / Uang Muka (Rp)</label>
            <input type="number" id="pf-dp" min="0" step="1000" placeholder="2500000" value="${p ? p.dp || '' : ''}" />
            <span class="field-error" id="pe-dp"></span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Status Proyek</label>
            <select id="pf-status">
              ${PROJECT_STATUS.map(s => `<option value="${s}" ${p && p.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Lokasi / Venue</label>
            <input type="text" id="pf-location" placeholder="Nama lokasi (opsional)" value="${Utils.esc(p ? p.location || '' : '')}" />
          </div>
        </div>
        <div class="form-group">
          <label>Catatan</label>
          <textarea id="pf-note" placeholder="Detail paket, perjanjian, dsb.">${Utils.esc(p ? p.notes || '' : '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-outline" id="btn-proj-cancel">Batal</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Proyek'}</button>
        </div>
      </form>`;

    Utils.openModal(isEdit ? 'Edit Proyek' : 'Tambah Proyek Baru', html, 'modal-lg');
    document.getElementById('btn-proj-cancel').addEventListener('click', Utils.closeModal);

    document.getElementById('proj-form').addEventListener('submit', e => {
      e.preventDefault();
      const client = document.getElementById('pf-client').value.trim();
      const name   = document.getElementById('pf-name').value.trim();
      const total  = parseFloat(document.getElementById('pf-total').value);
      const dp     = parseFloat(document.getElementById('pf-dp').value) || 0;

      let valid = true;
      [['pe-client', client, 'Nama klien'], ['pe-name', name, 'Nama proyek']].forEach(([eid, val, lbl]) => {
        const el = document.getElementById(eid); 
        if (!val) { el.textContent = lbl + ' wajib diisi.'; valid = false; } else el.textContent = '';
      });
      const totalEl = document.getElementById('pe-total');
      if (!total || total <= 0) { totalEl.textContent = 'Nilai total harus lebih dari 0.'; valid = false; } else totalEl.textContent = '';
      const dpEl = document.getElementById('pe-dp');
      if (dp > total) { dpEl.textContent = 'DP tidak boleh melebihi nilai total.'; valid = false; } else dpEl.textContent = '';
      if (!valid) return;

      const data = {
        clientName:  client,
        phone:       document.getElementById('pf-phone').value.trim(),
        projectName: name,
        projectType: document.getElementById('pf-type').value,
        shootDate:   document.getElementById('pf-shoot').value,
        totalValue:  total,
        dp,
        paidAmount:  isEdit ? p.paidAmount : dp,
        paymentHistory: isEdit ? p.paymentHistory : (dp > 0 ? [{ id: Utils.uid(), date: new Date().toISOString().slice(0,10), amount: dp, note: 'DP awal' }] : []),
        status:      document.getElementById('pf-status').value,
        location:    document.getElementById('pf-location').value.trim(),
        notes:       document.getElementById('pf-note').value.trim()
      };

      if (isEdit) { update(id, data); Utils.toast('Proyek diperbarui.'); }
      else        { add(data);        Utils.toast('Proyek ditambahkan.'); }
      Utils.closeModal();
      render();
    });
  }

  // ─── Payment Modal ────────────────────────────────────────
  function _openPayment(id) {
    const p = getById(id);
    if (!p) return;
    const remaining = p.totalValue - p.paidAmount;

    const html = `
      <div style="margin-bottom:18px;padding:14px;background:var(--clr-bg);border-radius:8px;">
        <div style="font-weight:700;font-size:15px;margin-bottom:8px">${Utils.esc(p.clientName)} — ${Utils.esc(p.projectName)}</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13.5px">
          <div><span style="color:var(--clr-muted)">Nilai Proyek: </span><strong>${Utils.formatRp(p.totalValue)}</strong></div>
          <div><span style="color:var(--clr-muted)">Sudah Dibayar: </span><strong class="text-income">${Utils.formatRp(p.paidAmount)}</strong></div>
          <div><span style="color:var(--clr-muted)">Sisa: </span><strong class="text-expense">${Utils.formatRp(remaining)}</strong></div>
        </div>
      </div>

      ${remaining > 0 ? `
      <form id="pay-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label>Jumlah Pembayaran (Rp) <span style="color:red">*</span></label>
            <input type="number" id="pay-amount" min="1" max="${remaining}" step="1000" placeholder="Jumlah yang diterima" />
            <span class="field-error" id="pay-err"></span>
          </div>
          <div class="form-group">
            <label>Tanggal Pembayaran <span style="color:red">*</span></label>
            <input type="date" id="pay-date" value="${new Date().toISOString().slice(0,10)}" />
          </div>
        </div>
        <div class="form-group">
          <label>Keterangan</label>
          <input type="text" id="pay-note" placeholder="Pelunasan / Angsuran / dsb." />
        </div>
        <div class="form-actions">
          <button type="button" class="btn-outline" id="btn-pay-cancel">Batal</button>
          <button type="button" class="btn-primary" id="btn-pay-full">Lunaskan Semua</button>
          <button type="submit" class="btn-accent">Catat Pembayaran</button>
        </div>
      </form>` : `<div style="text-align:center;padding:20px 0;color:var(--clr-income);font-weight:700;font-size:16px">✓ Proyek sudah lunas!</div>`}

      ${p.paymentHistory && p.paymentHistory.length > 0 ? `
      <div style="margin-top:18px;border-top:1px solid var(--clr-border);padding-top:14px">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.5px">Riwayat Pembayaran</div>
        ${p.paymentHistory.map(ph => `
          <div class="payment-history-item">
            <div class="ph-date">${Utils.formatDate(ph.date)}</div>
            <div class="ph-desc">${Utils.esc(ph.note || 'Pembayaran')}</div>
            <div class="ph-amount">${Utils.formatRp(ph.amount)}</div>
          </div>`).join('')}
      </div>` : ''}`;

    Utils.openModal('Pembayaran Proyek', html, 'modal-lg');

    if (remaining <= 0) return;

    document.getElementById('btn-pay-cancel').addEventListener('click', Utils.closeModal);
    document.getElementById('btn-pay-full').addEventListener('click', () => {
      document.getElementById('pay-amount').value = remaining;
      document.getElementById('pay-note').value   = 'Pelunasan penuh';
    });

    document.getElementById('pay-form').addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('pay-amount').value);
      const date   = document.getElementById('pay-date').value;
      const note   = document.getElementById('pay-note').value.trim() || 'Pembayaran';
      const errEl  = document.getElementById('pay-err');

      if (!amount || amount <= 0) { errEl.textContent = 'Jumlah harus lebih dari 0.'; return; }
      if (amount > remaining)     { errEl.textContent = `Melebihi sisa tagihan (${Utils.formatRp(remaining)}).`; return; }
      if (!date)                  { errEl.textContent = 'Tanggal wajib diisi.'; return; }
      errEl.textContent = '';

      const newPaid   = p.paidAmount + amount;
      const newStatus = newPaid >= p.totalValue ? 'paid' : 'partial';
      const history   = [...(p.paymentHistory || []), { id: Utils.uid(), date, amount, note }];

      update(id, { paidAmount: newPaid, paymentStatus: newStatus, paymentHistory: history });

      // Auto-record as income transaction
      Transactions.add({
        type: 'income',
        date,
        description: `Pembayaran Proyek: ${p.projectName} (${p.clientName})`,
        category: newPaid >= p.totalValue ? 'Pelunasan Proyek' : 'DP Proyek',
        amount,
        note
      });

      Utils.closeModal();
      Utils.toast(`Pembayaran ${Utils.formatRp(amount)} berhasil dicatat${newPaid >= p.totalValue ? ' — LUNAS!' : ''}.`, 'success');
      render();
    });
  }

  // ─── Detail View ──────────────────────────────────────────
  function _openDetail(id) {
    const p = getById(id);
    if (!p) return;
    const remaining  = p.totalValue - p.paidAmount;
    const pct        = Math.min(100, Math.round((p.paidAmount / p.totalValue) * 100) || 0);
    const payStatus  = _calcPayStatus(p);
    const typeClass  = p.projectType === 'Fotografi' ? 'proj-type-photo' : p.projectType === 'Videografi' ? 'proj-type-video' : 'proj-type-both';

    const html = `
      <div class="proj-detail-grid">
        <div class="proj-detail-field"><div class="proj-detail-label">Klien</div><div class="proj-detail-value">${Utils.esc(p.clientName)}</div></div>
        <div class="proj-detail-field"><div class="proj-detail-label">Telepon</div><div class="proj-detail-value">${Utils.esc(p.phone || '-')}</div></div>
        <div class="proj-detail-field"><div class="proj-detail-label">Nama Proyek</div><div class="proj-detail-value">${Utils.esc(p.projectName)}</div></div>
        <div class="proj-detail-field"><div class="proj-detail-label">Jenis</div><div class="proj-detail-value"><span class="badge ${typeClass}">${Utils.esc(p.projectType)}</span></div></div>
        <div class="proj-detail-field"><div class="proj-detail-label">Tanggal Pemotretan</div><div class="proj-detail-value">${Utils.formatDate(p.shootDate) || '-'}</div></div>
        <div class="proj-detail-field"><div class="proj-detail-label">Lokasi</div><div class="proj-detail-value">${Utils.esc(p.location || '-')}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">
        <div style="background:var(--clr-bg);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:12px;color:var(--clr-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Nilai Total</div>
          <div style="font-size:18px;font-weight:800">${Utils.formatRp(p.totalValue)}</div>
        </div>
        <div style="background:var(--clr-income-bg);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:12px;color:var(--clr-income);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Dibayar</div>
          <div style="font-size:18px;font-weight:800;color:var(--clr-income)">${Utils.formatRp(p.paidAmount)}</div>
        </div>
        <div style="background:var(--clr-expense-bg);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:12px;color:var(--clr-expense);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Sisa</div>
          <div style="font-size:18px;font-weight:800;color:var(--clr-expense)">${Utils.formatRp(remaining)}</div>
        </div>
      </div>

      <div style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
          <span>Progress Pembayaran</span>
          <span><strong>${pct}%</strong> &bull; <span class="badge badge-${payStatus}">${PAY_LABEL[payStatus]}</span></span>
        </div>
        <div class="progress-wrap" style="height:10px">
          <div class="progress-bar ${payStatus}" style="width:${pct}%"></div>
        </div>
      </div>

      ${p.notes ? `<div style="margin-bottom:16px"><div style="font-size:12px;color:var(--clr-muted);font-weight:600;margin-bottom:5px">CATATAN</div><div style="font-size:13.5px">${Utils.esc(p.notes)}</div></div>` : ''}

      ${p.paymentHistory && p.paymentHistory.length > 0 ? `
      <div style="border-top:1px solid var(--clr-border);padding-top:14px">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.5px">Riwayat Pembayaran</div>
        ${p.paymentHistory.map(ph => `
          <div class="payment-history-item">
            <div class="ph-date">${Utils.formatDate(ph.date)}</div>
            <div class="ph-desc">${Utils.esc(ph.note || 'Pembayaran')}</div>
            <div class="ph-amount">${Utils.formatRp(ph.amount)}</div>
          </div>`).join('')}
      </div>` : ''}

      <div class="form-actions" style="margin-top:18px">
        <button class="btn-outline" id="btn-detail-close">Tutup</button>
        <button class="btn-primary" id="btn-detail-edit">Edit Proyek</button>
        ${remaining > 0 ? `<button class="btn-accent" id="btn-detail-pay">+ Tambah Pembayaran</button>` : ''}
      </div>`;

    Utils.openModal('Detail Proyek', html, 'modal-lg');
    document.getElementById('btn-detail-close').addEventListener('click', Utils.closeModal);
    document.getElementById('btn-detail-edit').addEventListener('click', () => { Utils.closeModal(); _openForm(id); });
    const payBtn = document.getElementById('btn-detail-pay');
    if (payBtn) payBtn.addEventListener('click', () => { Utils.closeModal(); _openPayment(id); });
  }

  return { render, getAll };
})();

