/**
 * transactions.js — Income & Expense management
 */
const Transactions = (() => {
  const KEY = 'pf_transactions';

  const CATEGORIES_INCOME = [
    'Jasa Foto Wedding','Jasa Foto Prewedding','Jasa Foto Produk',
    'Jasa Foto Portrait','Jasa Video Wedding','Jasa Video Korporat',
    'Jasa Video Pendek','Jasa Aerial/Drone','DP Proyek','Pelunasan Proyek',
    'Sewa Peralatan','Penjualan Foto','Lainnya'
  ];
  const CATEGORIES_EXPENSE = [
    'Pembelian Kamera','Pembelian Lensa','Pembelian Aksesori','Penyewaan Lokasi',
    'Biaya Transport','Biaya Makan','Gaji Karyawan/Tim','Software & Editing',
    'Penyimpanan Cloud','Marketing & Promosi','Cetak Foto','Perawatan Alat',
    'Listrik & Internet','Operasional Kantor','Lainnya'
  ];

  function getAll()    { return Storage.tGet(KEY, []); }
  function save(list)  { Storage.tSet(KEY, list); }

  function add(tx) {
    const list = getAll();
    list.unshift({ ...tx, id: Utils.uid(), createdAt: Date.now() });
    save(list);
  }

  function update(id, data) {
    const list = getAll();
    const idx  = list.findIndex(t => t.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...data };
    save(list);
    return true;
  }

  function remove(id) {
    save(getAll().filter(t => t.id !== id));
  }

  function getById(id) {
    return getAll().find(t => t.id === id) || null;
  }

  // ─── Render ──────────────────────────────────────────────
  let _filterType = 'all';
  let _filterSearch = '';
  let _filterMonth  = '';

  function render() {
    const now = new Date().toISOString().slice(0, 7);
    if (!_filterMonth) _filterMonth = now;

    document.getElementById('main-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2>Transaksi</h2>
        <p>Catat pemasukan dan pengeluaran secara manual</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-outline btn-sm" id="btn-export-csv">⬇ Ekspor CSV</button>
        <button class="btn-accent" id="btn-add-tx">+ Tambah Transaksi</button>
      </div>
    </div>

    <div class="type-tabs">
      <button class="type-tab ${_filterType === 'all' ? 'active-all' : ''}" data-tab="all">Semua</button>
      <button class="type-tab ${_filterType === 'income' ? 'active-income' : ''}" data-tab="income">Pemasukan</button>
      <button class="type-tab ${_filterType === 'expense' ? 'active-expense' : ''}" data-tab="expense">Pengeluaran</button>
    </div>

    <div class="tx-filter-bar">
      <input type="text" id="tx-search" placeholder="Cari deskripsi / kategori…" value="${Utils.esc(_filterSearch)}" />
      <select id="tx-month">
        <option value="">Semua Bulan</option>
        ${Utils.monthOptions(_filterMonth)}
      </select>
    </div>

    <div id="tx-summary-row" class="tx-summary-row"></div>

    <div class="card">
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
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="tx-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

    _attachEvents();
    _renderTable();
  }

  function _exportCSV() {
    const list = _getFiltered();
    if (list.length === 0) { Utils.toast('Tidak ada data untuk diekspor.', 'info'); return; }
    const rows = [
      ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah (Rp)', 'Catatan'],
      ...list.map(t => [
        t.date,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.category,
        t.description,
        t.amount,
        t.note || ''
      ])
    ];
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const label = _filterMonth ? `_${_filterMonth}` : '';
    a.href = url; a.download = `transaksi${label}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Utils.toast(`Ekspor berhasil (${list.length} transaksi).`, 'success');
  }

  function _attachEvents() {
    document.getElementById('btn-add-tx').addEventListener('click', () => _openForm());
    document.getElementById('btn-export-csv').addEventListener('click', _exportCSV);
    document.getElementById('tx-search').addEventListener('input', e => { _filterSearch = e.target.value; _renderTable(); });
    document.getElementById('tx-month').addEventListener('change', e => { _filterMonth = e.target.value; _renderTable(); });
    document.querySelectorAll('.type-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _filterType = btn.dataset.tab;
        document.querySelectorAll('.type-tab').forEach(b => b.className = 'type-tab');
        btn.classList.add(_filterType === 'all' ? 'active-all' : _filterType === 'income' ? 'active-income' : 'active-expense');
        _renderTable();
      });
    });
  }

  function _getFiltered() {
    let list = getAll();
    if (_filterType !== 'all') list = list.filter(t => t.type === _filterType);
    if (_filterMonth)  list = list.filter(t => Utils.toYearMonth(t.date) === _filterMonth);
    if (_filterSearch) {
      const q = _filterSearch.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function _renderTable() {
    const list = _getFiltered();
    const tbody = document.getElementById('tx-tbody');
    if (!tbody) return;

    // Summary
    const totalIncome  = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const summaryEl = document.getElementById('tx-summary-row');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="tx-summary-pill"><span>Pemasukan:</span><span class="text-income">${Utils.formatRp(totalIncome)}</span></div>
        <div class="tx-summary-pill"><span>Pengeluaran:</span><span class="text-expense">${Utils.formatRp(totalExpense)}</span></div>
        <div class="tx-summary-pill"><span>Selisih:</span><span class="${totalIncome - totalExpense < 0 ? 'text-expense' : 'text-income'}">${Utils.formatRp(totalIncome - totalExpense)}</span></div>
        <div class="tx-summary-pill"><span>Total Data:</span><span>${list.length}</span></div>`;
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>Belum ada transaksi ditemukan.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(t => `
      <tr>
        <td style="white-space:nowrap">${Utils.formatDate(t.date)}</td>
        <td>
          <div style="font-weight:600;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(t.description)}</div>
          ${t.note ? `<div style="font-size:12px;color:var(--clr-muted);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(t.note)}</div>` : ''}
        </td>
        <td><span class="cat-pill">${Utils.esc(t.category)}</span></td>
        <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
        <td style="text-align:right" class="amount-${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatRp(t.amount)}</td>
        <td>
          <div class="td-actions">
            <button class="btn-icon btn-edit" title="Edit" data-id="${t.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-del" title="Hapus" data-id="${t.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => _openForm(b.dataset.id)));
    tbody.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => {
      Utils.confirmModal('Hapus transaksi ini?', () => {
        remove(b.dataset.id);
        _renderTable();
        Utils.toast('Transaksi dihapus.');
      });
    }));
  }

  function _openForm(id = null) {
    const tx = id ? getById(id) : null;
    const isEdit = !!tx;
    const type = tx ? tx.type : 'income';

    const formHTML = `
      <form id="tx-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label>Jenis Transaksi</label>
            <select id="f-type" required>
              <option value="income"  ${type === 'income'  ? 'selected' : ''}>Pemasukan</option>
              <option value="expense" ${type === 'expense' ? 'selected' : ''}>Pengeluaran</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tanggal <span style="color:red">*</span></label>
            <input type="date" id="f-date" value="${tx ? Utils.toInputDate(tx.date) : new Date().toISOString().slice(0,10)}" required />
            <span class="field-error" id="e-date"></span>
          </div>
        </div>
        <div class="form-group">
          <label>Deskripsi <span style="color:red">*</span></label>
          <input type="text" id="f-desc" placeholder="Contoh: Pembayaran DP Wedding Adi &amp; Rina" value="${Utils.esc(tx ? tx.description : '')}" required />
          <span class="field-error" id="e-desc"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kategori <span style="color:red">*</span></label>
            <select id="f-cat" required>
              <option value="">-- Pilih Kategori --</option>
            </select>
            <span class="field-error" id="e-cat"></span>
          </div>
          <div class="form-group">
            <label>Jumlah (Rp) <span style="color:red">*</span></label>
            <input type="number" id="f-amount" min="0" step="1000" placeholder="Contoh: 2500000" value="${tx ? tx.amount : ''}" required />
            <span class="field-error" id="e-amount"></span>
          </div>
        </div>
        <div class="form-group">
          <label>Catatan</label>
          <textarea id="f-note" placeholder="Catatan tambahan (opsional)">${Utils.esc(tx ? tx.note || '' : '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-outline" id="btn-tx-cancel">Batal</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}</button>
        </div>
      </form>`;

    Utils.openModal(isEdit ? 'Edit Transaksi' : 'Tambah Transaksi', formHTML);

    // Populate categories based on type
    function populateCats(t) {
      const cats = t === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
      const sel  = document.getElementById('f-cat');
      sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
        cats.map(c => `<option value="${c}" ${tx && tx.category === c ? 'selected' : ''}>${c}</option>`).join('');
    }
    populateCats(type);
    document.getElementById('f-type').addEventListener('change', e => populateCats(e.target.value));

    document.getElementById('btn-tx-cancel').addEventListener('click', Utils.closeModal);
    document.getElementById('tx-form').addEventListener('submit', e => {
      e.preventDefault();
      const fType   = document.getElementById('f-type').value;
      const fDate   = document.getElementById('f-date').value;
      const fDesc   = document.getElementById('f-desc').value.trim();
      const fCat    = document.getElementById('f-cat').value;
      const fAmount = parseFloat(document.getElementById('f-amount').value);
      const fNote   = document.getElementById('f-note').value.trim();

      let valid = true;
      [['e-date', fDate, 'Tanggal'], ['e-desc', fDesc, 'Deskripsi'], ['e-cat', fCat, 'Kategori']].forEach(([eid, val, lbl]) => {
        const el = document.getElementById(eid);
        if (!val) { el.textContent = lbl + ' wajib diisi.'; valid = false; } else el.textContent = '';
      });
      const amtEl = document.getElementById('e-amount');
      if (!fAmount || fAmount <= 0) { amtEl.textContent = 'Jumlah harus lebih dari 0.'; valid = false; } else amtEl.textContent = '';
      if (!valid) return;

      const data = { type: fType, date: fDate, description: fDesc, category: fCat, amount: fAmount, note: fNote };
      if (isEdit) { update(id, data); Utils.toast('Transaksi diperbarui.'); }
      else        { add(data);        Utils.toast('Transaksi ditambahkan.'); }
      Utils.closeModal();
      _renderTable();
    });
  }

  return { render, getAll, add, update, remove };
})();

