/**
 * utils.js — shared utility functions
 */
const Utils = (() => {

  // Format currency IDR
  function formatRp(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  }

  // Format date to dd Mon yyyy
  function formatDate(isoOrMs) {
    if (!isoOrMs) return '-';
    const d = new Date(isoOrMs);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Format date to yyyy-MM-dd (for <input type="date">)
  function toInputDate(isoOrMs) {
    if (!isoOrMs) return '';
    const d = new Date(isoOrMs);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
  }

  // Generate simple unique ID
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Get YYYY-MM from date
  function toYearMonth(isoOrMs) {
    if (!isoOrMs) return '';
    const d = new Date(isoOrMs);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 7);
  }

  // Month name from YYYY-MM
  function monthName(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  // Escape HTML
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Toast notification
  function toast(msg, type = 'success') {
    const icons = { success: '✓', error: '✗', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || '✓'}</span><span>${esc(msg)}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // Show/hide modal
  function openModal(title, bodyHTML, extraClass = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    const box = document.getElementById('modal-box');
    box.className = 'modal ' + extraClass;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  }

  // Confirm dialog via modal
  function confirmModal(msg, onConfirm, onCancel) {
    openModal('Konfirmasi', `
      <p style="margin-bottom:22px;font-size:15px;">${esc(msg)}</p>
      <div class="form-actions">
        <button class="btn-outline" id="confirm-cancel">Batal</button>
        <button class="btn-danger" id="confirm-ok">Hapus</button>
      </div>
    `);
    document.getElementById('confirm-ok').addEventListener('click', () => { closeModal(); onConfirm(); });
    document.getElementById('confirm-cancel').addEventListener('click', () => { closeModal(); if (onCancel) onCancel(); });
  }

  // Validate required fields — returns array of error messages
  function validateRequired(fields) {
    return fields.filter(f => !f.value || String(f.value).trim() === '')
                 .map(f => f.label + ' wajib diisi.');
  }

  // Current year-month options for selects
  function monthOptions(selectedYM) {
    let html = '';
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      html += `<option value="${ym}" ${ym === selectedYM ? 'selected' : ''}>${label}</option>`;
    }
    return html;
  }

  return { formatRp, formatDate, toInputDate, uid, toYearMonth, monthName, esc, toast, openModal, closeModal, confirmModal, validateRequired, monthOptions };
})();

