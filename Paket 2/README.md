# 📷 Photography & Videography Finance Manager

**Paket B** — Aplikasi manajemen keuangan berbasis web untuk studio fotografi dan videografi, dilengkapi invoice, payment gateway Midtrans (sandbox), dan laporan keuangan bulanan.

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🔐 Login Admin | Autentikasi dengan session aman (HTTPOnly cookie) |
| 📊 Dashboard | Ringkasan saldo, pemasukan, pengeluaran, proyek aktif |
| 🎬 Manajemen Proyek | Fotografi / videografi / keduanya, DP, sisa, pelunasan |
| 👥 Data Klien | CRUD klien + riwayat proyek per klien |
| 🧾 Invoice | Buat invoice, tautan bayar Midtrans, status otomatis |
| 💳 Transaksi | Catat pemasukan & pengeluaran manual, filter bulan/tahun |
| 📈 Laporan Bulanan | Grafik pemasukan vs pengeluaran, kategori pengeluaran |
| 🔔 Webhook | Verifikasi pembayaran resmi dari Midtrans (bukan redirect) |
| 📱 Responsif | Desktop, tablet, dan smartphone |

---

## 🏗️ Teknologi

- **Backend:** Node.js + Express.js
- **Database:** SQLite (via Knex.js) — data persisten, tanpa server terpisah
- **Session:** `express-session` + `connect-sqlite3`
- **Payment Gateway:** Midtrans Snap (mode sandbox/production)
- **Frontend:** Vanilla JS SPA — tidak perlu build tool
- **Chart:** Chart.js v4 (CDN)

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js **v18+** (sudah termasuk npm)
- Koneksi internet (untuk Chart.js CDN & Midtrans API)

### 1. Clone / Ekstrak Project

```bash
cd "Paket 2"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Salin file contoh lalu edit:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Edit file `.env`:

```env
PORT=3000
DATA_DIR=./data
SESSION_SECRET=isi_dengan_string_acak_min_32_karakter

# Midtrans Sandbox (lihat petunjuk di bawah)
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_IS_PRODUCTION=false

# Akun admin pertama (hanya dipakai saat database pertama kali dibuat)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-before-deploying
ADMIN_EMAIL=demo@example.invalid
```

> ⚠️ Ganti `SESSION_SECRET` dengan string acak yang kuat (min. 32 karakter).  
> Contoh generator: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx

### 4. Jalankan Server

```bash
# Mode produksi
npm start

# Mode development (auto-restart saat file berubah)
npm run dev
```

Buka browser: **http://localhost:3000**

---

## 🔑 Login Default

| Field | Nilai |
|---|---|
| Username | `admin` |
| Password | `gunakan nilai ADMIN_PASSWORD lokal` |

> ⚠️ **Segera ganti password** setelah login pertama melalui menu **Pengaturan → Ubah Password**.

---

## 💳 Konfigurasi Midtrans (Payment Gateway)

### Langkah-langkah:

1. **Daftar akun** di https://dashboard.sandbox.midtrans.com
2. Login → **Settings → Access Keys**
3. Salin **Server Key** dan **Client Key** (awalan `SB-Mid-...` untuk sandbox)
4. Isi di file `.env`:
   ```env
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
   ```
5. Daftarkan **Webhook URL** di Midtrans:
   - Dashboard Midtrans → **Settings → Configuration**
   - **Payment Notification URL:** `http://YOUR-DOMAIN/api/invoices/webhook`
   - Untuk pengujian lokal gunakan [ngrok](https://ngrok.com): `ngrok http 3000`
6. Restart server

### ⚠️ Penting — Verifikasi Pembayaran

Sistem **tidak** menganggap pembayaran berhasil hanya berdasarkan halaman redirect.  
Status invoice diperbarui **hanya** melalui notifikasi webhook yang divalidasi langsung ke Midtrans API.

### Beralih ke Production

Setelah akun Midtrans production disetujui:

```env
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_IS_PRODUCTION=true
```

---

## 📂 Struktur Project

```
Paket 2/
├── server/
│   ├── index.js          ← Entry point Express
│   ├── db.js             ← Koneksi SQLite + inisialisasi skema
│   └── routes/
│       ├── auth.js       ← Login, logout, ganti password
│       ├── clients.js    ← CRUD klien
│       ├── projects.js   ← CRUD proyek fotografi/videografi
│       ├── invoices.js   ← Invoice, Midtrans Snap, webhook
│       └── transactions.js ← Pemasukan, pengeluaran, laporan
├── public/
│   ├── index.html        ← SPA frontend (semua halaman)
│   └── payment-result.html ← Halaman redirect setelah bayar
├── data/
│   ├── finance.db        ← Database SQLite (auto-created)
│   └── sessions.db       ← Session store (auto-created)
├── .env                  ← Konfigurasi (JANGAN di-commit ke Git)
├── .env.example          ← Template konfigurasi
└── package.json
```

---

## 🗄️ Skema Database

| Tabel | Isi |
|---|---|
| `users` | Admin login |
| `clients` | Data klien |
| `projects` | Proyek foto/video, nilai, DP, sisa |
| `invoices` | Invoice, token Midtrans, status pembayaran |
| `transactions` | Seluruh riwayat pemasukan & pengeluaran |
| `expense_categories` | Kategori pengeluaran |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/login` | Login admin |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Cek session aktif |
| POST | `/api/auth/change-password` | Ganti password |

### Klien
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/clients` | List semua klien |
| POST | `/api/clients` | Tambah klien |
| PUT | `/api/clients/:id` | Edit klien |
| DELETE | `/api/clients/:id` | Hapus klien |

### Proyek
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/projects` | List proyek (filter: status, type) |
| POST | `/api/projects` | Tambah proyek |
| PUT | `/api/projects/:id` | Edit proyek |
| DELETE | `/api/projects/:id` | Hapus proyek |

### Invoice
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/invoices` | List invoice |
| POST | `/api/invoices` | Buat invoice + request Midtrans token |
| POST | `/api/invoices/:id/manual-paid` | Tandai lunas manual |
| POST | `/api/invoices/webhook` | Notifikasi Midtrans (publik) |
| DELETE | `/api/invoices/:id` | Hapus invoice (bukan yang lunas) |

### Transaksi
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/transactions` | List transaksi (filter: type, month, year) |
| GET | `/api/transactions/summary` | Ringkasan dashboard |
| GET | `/api/transactions/monthly-chart` | Data grafik 12 bulan |
| GET | `/api/transactions/categories` | Kategori pengeluaran |
| POST | `/api/transactions` | Tambah transaksi manual |
| DELETE | `/api/transactions/:id` | Hapus transaksi |

---

## 🔧 Troubleshooting

### Server tidak bisa start
```bash
# Pastikan port 3000 tidak dipakai
netstat -ano | findstr :3000
# Ganti port di .env: PORT=3001
```

### Database error saat pertama start
```bash
# Hapus database lama dan biarkan otomatis dibuat ulang
del data\finance.db
npm start
```

### Webhook tidak menerima notifikasi
- Pastikan URL webhook bisa diakses dari internet (gunakan ngrok untuk lokal)
- Periksa Midtrans Dashboard → Settings → Configuration
- Cek log server untuk pesan error webhook

### Lupa password admin
```bash
# Reset via script Node.js
node -e "
const knex = require('knex')({client:'sqlite3',connection:{filename:'data/finance.db'},useNullAsDefault:true});
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync(process.env.NEW_ADMIN_PASSWORD, 10);
knex('users').where('username','admin').update({password:hash}).then(()=>{console.log('Password direset!');process.exit()});
"
```

---

## 📋 Catatan Penting

- **Biaya tidak termasuk:** hosting, domain, dan biaya transaksi payment gateway (±0.7–3% per transaksi Midtrans)
- **Backup database:** salin folder `data/` secara berkala
- **Keamanan:** selalu ganti `SESSION_SECRET` dan password admin default sebelum digunakan di production
- Sistem **tidak** mengklaim bisa mendeteksi semua transaksi rekening bank secara otomatis — hanya transaksi melalui invoice Midtrans yang terverifikasi otomatis

---

## Deploy ke Render

Repository ini memiliki file `render.yaml` di root repo untuk menyiapkan Paket 2 sebagai web service.

1. Buat Blueprint baru di Render dan hubungkan repository `Zefans/Demo_Project`.
2. Periksa konfigurasi service: root directory `Paket 2`, build command `npm ci`, start command `npm start`.
3. Blueprint memakai persistent disk 1 GB di `/var/data` untuk database SQLite dan sesi login. Layanan dengan persistent disk memerlukan paket berbayar; cek harga Render sebelum membuat service.
4. Isi `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `MIDTRANS_SERVER_KEY`, dan `MIDTRANS_CLIENT_KEY` melalui dashboard Render. `SESSION_SECRET` dibuat oleh Render. Jangan simpan nilai rahasia di GitHub.
5. Setelah service live, atur URL notifikasi Midtrans ke `https://<alamat-service>.onrender.com/api/invoices/webhook`.

Untuk pengujian, `MIDTRANS_IS_PRODUCTION` disetel ke `false` agar memakai mode sandbox.

## 📞 Support & Informasi Paket

**Paket B — Photography & Videography Finance Manager**
- Harga jasa pengembangan: **Rp 3.500.000**
- Estimasi pengerjaan: **14–21 hari kerja**
- Teknologi: Node.js + SQLite + Midtrans
