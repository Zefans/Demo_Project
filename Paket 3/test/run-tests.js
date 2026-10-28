/**
 * Integration test — semua endpoint utama
 * Jalankan: node test/run-tests.js
 */
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 3001;
let passed = 0, failed = 0;

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: PORT,
      path: '/api' + path, method,
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    };
    const r = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on('error', reject);
    r.setTimeout(10000, () => { r.destroy(); reject(new Error('timeout')); });
    if (data) r.write(data);
    r.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} ${detail}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🧪 Testing FinancePhoto API on port ${PORT}\n`);

  // ── 1. AUTH ────────────────────────────────────────────────────────
  console.log('── AUTH ──');
  const me0 = await req('GET', '/auth/me');
  assert('GET /auth/me unauthenticated → 200', me0.status === 200);
  assert('authenticated=false', JSON.parse(me0.body).authenticated === false);

  const loginFail = await req('POST', '/auth/login', { username: 'admin', password: 'wrong' });
  assert('Login wrong password → 401', loginFail.status === 401);

  const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminUsername || !adminPassword) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD to run authenticated tests.');
const loginOk = await req('POST', '/auth/login', { username: adminUsername, password: adminPassword });
  assert('Login correct → 200', loginOk.status === 200);
  const cookie = loginOk.headers['set-cookie']?.[0]?.split(';')[0];
  assert('Session cookie received', !!cookie);

  const me1 = await req('GET', '/auth/me', null, cookie);
  const meData = JSON.parse(me1.body);
  assert('GET /auth/me authenticated → true', meData.authenticated === true);

  // ── 2. CLIENTS ─────────────────────────────────────────────────────
  console.log('\n── CLIENTS ──');
  const c1 = await req('POST', '/clients', { name: 'Klien Demo', phone: 'PHONE_PLACEHOLDER', email: 'demo@example.invalid' }, cookie);
  const cd = JSON.parse(c1.body);
  assert('POST /clients → 201', c1.status === 201);
  assert('Client has id', !!cd.id);

  const cList = await req('GET', '/clients', null, cookie);
  assert('GET /clients → 200', cList.status === 200);
  assert('At least 1 client', JSON.parse(cList.body).pagination.total >= 1);

  const noName = await req('POST', '/clients', { phone: 'PHONE_PLACEHOLDER' }, cookie);
  assert('POST /clients no name → 400', noName.status === 400);

  // ── 3. PROJECTS ────────────────────────────────────────────────────
  console.log('\n── PROJECTS ──');
  const p1 = await req('POST', '/projects', {
    client_id: cd.id, title: 'Wedding Rina & Doni',
    project_type: 'hybrid', total_value: 5000000, dp_amount: 2000000,
    event_date: '2025-03-15', location: 'Lokasi Simulasi'
  }, cookie);
  const pd = JSON.parse(p1.body);
  assert('POST /projects → 201', p1.status === 201);
  assert('Project code generated', pd.project_code?.startsWith('PRJ-'));
  assert('Status = pending', pd.status === 'pending');

  const pDetail = await req('GET', '/projects/' + pd.id, null, cookie);
  assert('GET /projects/:id → 200', pDetail.status === 200);

  const pList = await req('GET', '/projects?status=pending', null, cookie);
  assert('GET /projects?status=pending → 200', pList.status === 200);

  // ── 4. TRANSACTIONS ────────────────────────────────────────────────
  console.log('\n── TRANSACTIONS ──');
  const t1 = await req('POST', '/transactions', {
    type: 'expense', category: 'Transportasi', amount: 150000,
    transaction_date: '2025-01-10', description: 'Survei lokasi', payment_method: 'cash'
  }, cookie);
  const t1d = JSON.parse(t1.body);
  assert('POST /transactions (expense) → 201', t1.status === 201);
  assert('Transaction code generated', t1d.transaction_code?.startsWith('TRX-'));
  assert('Source = manual', t1d.source === 'manual');

  const t2 = await req('POST', '/transactions', {
    type: 'income', category: 'Pemasukan Lain', amount: 500000,
    transaction_date: '2025-01-12', description: 'Jual preset', payment_method: 'transfer'
  }, cookie);
  assert('POST /transactions (income) → 201', t2.status === 201);

  const noType = await req('POST', '/transactions', { amount: 100, transaction_date: '2025-01-01' }, cookie);
  assert('POST /transactions missing fields → 400', noType.status === 400);

  const tList = await req('GET', '/transactions?type=income', null, cookie);
  const tld = JSON.parse(tList.body);
  assert('GET /transactions?type=income → 200', tList.status === 200);
  assert('Income total > 0', tld.totals.income > 0);

  // ── 5. RECORD PROJECT PAYMENT ──────────────────────────────────────
  console.log('\n── PROJECT PAYMENT ──');
  const pay1 = await req('POST', '/projects/' + pd.id + '/record-payment', {
    payment_type: 'dp', amount: 2000000,
    transaction_date: '2025-01-11', payment_method: 'transfer'
  }, cookie);
  const pay1d = JSON.parse(pay1.body);
  assert('POST record-payment (dp) → 200', pay1.status === 200);
  assert('dp_paid updated', pay1d.project?.dp_paid === 2000000);
  assert('Status → dp_paid', pay1d.project?.status === 'dp_paid');
  assert('Income transaction created', !!pay1d.transaction?.id);

  // Record pelunasan
  const pay2 = await req('POST', '/projects/' + pd.id + '/record-payment', {
    payment_type: 'remaining', amount: 3000000,
    transaction_date: '2025-02-01', payment_method: 'transfer'
  }, cookie);
  const pay2d = JSON.parse(pay2.body);
  assert('POST record-payment (remaining) → 200', pay2.status === 200);
  assert('Status → paid_off', pay2d.project?.status === 'paid_off');

  // ── 6. DASHBOARD ───────────────────────────────────────────────────
  console.log('\n── DASHBOARD ──');
  const dash = await req('GET', '/dashboard', null, cookie);
  const dd = JSON.parse(dash.body);
  assert('GET /dashboard → 200', dash.status === 200);
  assert('Balance = income - expense', dd.balance === (dd.totalIncome - dd.totalExpense));
  assert('totalIncome > 0', dd.totalIncome > 0);
  assert('Projects total >= 1', dd.projectStats?.total >= 1);
  assert('Monthly data is array', Array.isArray(dd.monthlyData));

  // ── 7. REPORTS ─────────────────────────────────────────────────────
  console.log('\n── REPORTS ──');
  const rMonth = await req('GET', '/reports/monthly?year=2025&month=1', null, cookie);
  const rmd = JSON.parse(rMonth.body);
  assert('GET /reports/monthly → 200', rMonth.status === 200);
  assert('income > 0', rmd.summary?.total_income > 0);
  assert('expense > 0', rmd.summary?.total_expense > 0);
  assert('incomeByCategory is array', Array.isArray(rmd.incomeByCategory));

  const rAnnual = await req('GET', '/reports/annual?year=2025', null, cookie);
  const rad = JSON.parse(rAnnual.body);
  assert('GET /reports/annual → 200', rAnnual.status === 200);
  assert('Annual income > 0', rad.summary?.total_income > 0);

  const rProj = await req('GET', '/reports/projects', null, cookie);
  const rpd = JSON.parse(rProj.body);
  assert('GET /reports/projects → 200', rProj.status === 200);
  assert('Project count >= 1', rpd.summary?.total_projects >= 1);
  assert('Paid off = 1', rpd.summary?.fully_paid >= 1);

  // ── 8. INVOICES ────────────────────────────────────────────────────
  console.log('\n── INVOICES ──');
  // Buat proyek ke-2 untuk invoice test
  const p2 = await req('POST', '/projects', {
    client_id: cd.id, title: 'Prewedding Rina', project_type: 'photography',
    total_value: 2000000, dp_amount: 1000000
  }, cookie);
  const p2d = JSON.parse(p2.body);
  assert('2nd project created', p2.status === 201);

  const inv1 = await req('POST', '/invoices', {
    project_id: p2d.id, payment_type: 'dp', amount: 1000000,
    description: 'DP Prewedding'
  }, cookie);
  const inv1d = JSON.parse(inv1.body);
  assert('POST /invoices → 201', inv1.status === 201);
  assert('Invoice code generated', inv1d.invoice_code?.startsWith('INV-'));
  assert('Invoice status = pending', inv1d.status === 'pending');
  assert('midtrans_order_id set', !!inv1d.midtrans_order_id);

  // Duplicate invoice same type should fail
  const inv1dup = await req('POST', '/invoices', {
    project_id: p2d.id, payment_type: 'dp', amount: 1000000
  }, cookie);
  assert('Duplicate pending invoice → 400', inv1dup.status === 400);

  // Cancel invoice
  const cancel = await req('POST', '/invoices/' + inv1d.id + '/cancel', {}, cookie);
  assert('Cancel invoice → 200', cancel.status === 200);

  // After cancel, can create new one
  const inv2 = await req('POST', '/invoices', {
    project_id: p2d.id, payment_type: 'dp', amount: 1000000,
    description: 'DP Prewedding (baru)'
  }, cookie);
  assert('New invoice after cancel → 201', inv2.status === 201);

  const invList = await req('GET', '/invoices', null, cookie);
  assert('GET /invoices → 200', invList.status === 200);

  // ── 9. RECONCILIATION ──────────────────────────────────────────────
  console.log('\n── RECONCILIATION ──');
  const rec = await req('GET', '/reports/reconciliation', null, cookie);
  const recd = JSON.parse(rec.body);
  assert('GET /reports/reconciliation → 200', rec.status === 200);
  assert('stats.reconciled_count is number', typeof recd.stats?.reconciled_count === 'number');
  assert('unreconciled array exists', Array.isArray(recd.unreconciled));
  assert('reconciled array exists', Array.isArray(recd.reconciled));

  // ── 10. CATEGORIES ─────────────────────────────────────────────────
  console.log('\n── CATEGORIES ──');
  const cats = await req('GET', '/categories', null, cookie);
  const catsd = JSON.parse(cats.body);
  assert('GET /categories → 200', cats.status === 200);
  assert('Default categories exist (12)', catsd.length >= 12);

  const newCat = await req('POST', '/categories', { name: 'Tes Kategori', type: 'expense' }, cookie);
  const newCatd = JSON.parse(newCat.body);
  assert('POST /categories → 201', newCat.status === 201);

  const delCat = await req('DELETE', '/categories/' + newCatd.id, null, cookie);
  assert('DELETE /categories (custom) → 200', delCat.status === 200);

  // ── 11. AUTH CLEANUP ───────────────────────────────────────────────
  console.log('\n── LOGOUT ──');
  const logout = await req('POST', '/auth/logout', {}, cookie);
  assert('POST /auth/logout → 200', logout.status === 200);

  const meAfter = await req('GET', '/auth/me', null, cookie);
  assert('Session destroyed after logout', JSON.parse(meAfter.body).authenticated === false);

  // ── SUMMARY ────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(45)}`);
  console.log(`📊 Hasil: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 Semua test PASSED!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Ada test yang GAGAL!\n');
    process.exit(1);
  }
}

run().catch(e => {
  console.error('💥 Test runner error:', e.message);
  process.exit(1);
});

