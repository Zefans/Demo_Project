# FinancePhoto — Photography & Videography Finance Manager
### Paket C · Harga Jasa: Rp 4.500.000 · Estimasi: 18–28 Hari Kerja

Aplikasi web manajemen keuangan hybrid untuk bisnis fotografi dan videografi. Menggabungkan pencatatan transaksi manual dengan pembayaran online melalui Midtrans Payment Gateway.

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🔐 Login Admin | Autentikasi session-based, change password |
| 💰 Dashboard | Saldo real-time, grafik 6 bulan, ringkasan proyek |
| 📝 Transaksi Manual | Catat pemasukan/pengeluaran dengan kategori |
| 📁 Manajemen Proyek | Data klien, DP, sisa bayar, pelunasan, status otomatis |
| 🧾 Invoice Online | Buat link pembayaran via Midtrans Snap |
| 🔄 Rekonsiliasi | Auto-reconcile via webhook + manual fallback |
| 📊 Laporan | Bulanan, tahunan, per-proyek dengan grafik |
| 📱 Responsif | Tampilan mobile & desktop |

---

## Persyaratan Sistem

- **Node.js** v18 atau lebih baru (diuji di v24)
- **npm** v8+
- Koneksi internet (untuk load font Google & Midtrans Snap.js)
- Tidak perlu Visual Studio / build tools native

---

## Instalasi

### 1. Clone / Download project

```bash
# Masuk ke folder project
cd "Paket 3"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file konfigurasi `.env`

Copy dari contoh:
```bash
copy .env.example .env
```

Edit file `.env` sesuai kebutuhan:
```env
PORT=3000
SESSION_SECRET=ganti-dengan-kunci-rahasia-anda

# Kredensial admin pertama kali
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-before-deploying

# Midtrans Payment Gateway (isi setelah daftar)
`MIDTRANS_SERVER_KEY=your-`MIDTRANS_SERVER_KEY
`MIDTRANS_CLIENT_KEY=your-`MIDTRANS_CLIENT_KEY
MIDTRANS_IS_PRODUCTION=false

# URL aplikasi (untuk callback Midtrans)
APP_BASE_URL=http://localhost:3000

# Path database
DB_PATH=./database/finance.db
```

### 4. Jalankan aplikasi

```bash
npm start
```

Buka browser: **http://localhost:3000**

Untuk login admin, buat akun atau atur kredensial lokal melalui konfigurasi server.

Untuk login admin, atur kredensial lokal melalui variabel lingkungan sebelum menjalankan aplikasi.

---

## Konfigurasi Midtrans (Payment Gateway)

### Langkah Setup Sandbox (Testing)

1. Daftar di [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
2. Pilih mode **Sandbox** (ikon di kiri atas dashboard)
3. Masuk ke **Settings → Access Keys**
4. Salin **Server Key** dan **Client Key**
5. Update file `.env`:
   ```env
`MIDTRANS_SERVER_KEY=your-`MIDTRANS_SERVER_KEY
`MIDTRANS_CLIENT_KEY=your-`MIDTRANS_CLIENT_KEY
   MIDTRANS_IS_PRODUCTION=false
   ```
6. Restart server: `npm start`

### Setup Webhook (Notifikasi Otomatis)

Di Midtrans Dashboard → **Settings → Configuration → Payment Notification URL**:
```
https://domain-anda.com/api/payment/notification
```

> Untuk testing lokal gunakan **ngrok**:
> ```bash
> ngrok http 3000
> # Gunakan URL ngrok sebagai Payment Notification URL
> ```

### Pindah ke Production

```env
MIDTRANS_IS_PRODUCTION=true
`MIDTRANS_SERVER_KEY=your-`MIDTRANS_SERVER_KEY
`MIDTRANS_CLIENT_KEY=your-`MIDTRANS_CLIENT_KEY
```

> ⚠️ **JANGAN** taruh Server Key di kode frontend. Server Key hanya ada di `.env` server-side.

---

## Cara Penggunaan

### Alur Kerja Proyek Baru

1. **Tambah Klien** → Menu Klien → Klien Baru
2. **Buat Proyek** → Menu Proyek → Proyek Baru (isi nilai proyek & DP)
3. **Catat Pembayaran DP**:
   - Manual: Klik proyek → **Catat Pembayaran** (metode transfer/tunai)
   - Online: Klik proyek → **Buat Invoice Online** → kirim link ke klien
4. **Monitor Status** di Dashboard dan halaman Proyek
5. **Rekonsiliasi** otomatis setelah pembayaran online terkonfirmasi

### Pembayaran Online vs Manual

| | Manual | Online (Midtrans) |
|---|---|---|
| Input | Form catat pembayaran | Invoice → link bayar |
| Verifikasi | Admin catat langsung | Webhook otomatis |
| Source di DB | `manual` | `online` |
| Bisa diedit | ✅ Ya | ❌ Tidak (audit trail) |
| Rekonsiliasi | Tidak perlu | Otomatis / manual fallback |

### Rekonsiliasi

Sistem melakukan rekonsiliasi otomatis saat menerima konfirmasi dari Midtrans:
- Status invoice diperbarui → `paid`
- Transaksi pemasukan dibuat otomatis (source = `online`)
- Status proyek diperbarui otomatis (DP terbayar / Lunas)

Jika webhook gagal sampai, gunakan **Menu Rekonsiliasi → Rekonsiliasi Manual**.

---

## Struktur Project

```
Paket 3/
├── backend/
│   ├── server.js          # Entry point Express
│   ├── db.js              # Database layer (sql.js wrapper)
│   └── routes/
│       ├── auth.js        # Login, logout, session
│       ├── dashboard.js   # Statistik dashboard
│       ├── transactions.js# CRUD transaksi manual
│       ├── projects.js    # Manajemen proyek & pembayaran
│       ├── clients.js     # Manajemen klien
│       ├── invoices.js    # Invoice online Midtrans
│       ├── reports.js     # Laporan & rekonsiliasi
│       ├── categories.js  # Kategori transaksi
│       └── paymentNotification.js  # Webhook Midtrans
├── frontend/
│   ├── index.html         # SPA shell
│   ├── css/style.css      # Semua styling
│   ├── js/
│   │   ├── app.js         # Router, API client, auth
│   │   └── pages.js       # Semua halaman & komponen
│   └── pages/
│       └── payment-result.html  # Halaman hasil bayar
├── database/
│   └── finance.db         # SQLite database (auto-created)
├── test/
│   └── run-tests.js       # Integration tests (62 test)
├── .env                   # Konfigurasi (buat dari .env.example)
├── .env.example           # Template konfigurasi
└── package.json
```

---

## Menjalankan Tests

Pastikan server sudah berjalan, lalu:

```bash
# Server harus berjalan dulu
npm start

# Di terminal lain
node test/run-tests.js
```

Output yang diharapkan:
```
📊 Hasil: 62 passed, 0 failed
🎉 Semua test PASSED!
```

---

## Mode Development (Hot Reload)

```bash
npm run dev
```

Memerlukan nodemon (sudah termasuk di devDependencies).

---

## Catatan Penting

- **Database** disimpan di `./database/finance.db` — backup file ini secara berkala
- **Session** tersimpan di memory — akan reset saat server restart (semua user perlu login ulang)
- **Transaksi online** tidak dapat diedit/dihapus untuk menjaga integritas audit trail
- **Payment gateway** Midtrans memungut biaya per transaksi (tidak termasuk dalam paket ini)
- Biaya **hosting** dan **domain** tidak termasuk dalam harga pengembangan

---

## Harga & Layanan

| Item | Detail |
|---|---|
| **Paket C** | Photography & Videography Finance Manager Hybrid |
| **Harga Jasa** | Rp 4.500.000 |
| **Estimasi** | 18–28 hari kerja |
| Hosting | Tidak termasuk |
| Domain | Tidak termasuk |
| Biaya transaksi gateway | Tidak termasuk |

---

## Dukungan Teknis

Untuk konfigurasi Midtrans, hosting, atau pengembangan lanjutan, hubungi pengembang.
