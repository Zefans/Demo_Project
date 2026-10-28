# PhotoFinance — Sistem Pengelolaan Keuangan Fotografi & Videografi

Aplikasi web pengelolaan keuangan khusus untuk bisnis fotografi dan videografi. Berjalan langsung di browser tanpa instalasi server.

---

## Cara Menjalankan

### Metode 1 — Buka Langsung (Termudah)
1. Buka folder project di File Explorer
2. Double-click file **`index.html`**
3. Browser akan membuka aplikasi secara otomatis

> **Catatan:** Beberapa browser (Chrome) memblokir pemuatan script lokal dengan `file://`. Gunakan Metode 2 jika ada masalah.

### Metode 2 — VS Code Live Server (Direkomendasikan)
1. Install ekstensi **Live Server** di VS Code
2. Buka folder project di VS Code
3. Klik kanan `index.html` → **"Open with Live Server"**
4. Browser akan membuka `http://127.0.0.1:5500`

### Metode 3 — Python HTTP Server
```bash
# Python 3
python -m http.server 8080

# Buka browser: http://localhost:8080
```

### Metode 4 — Node.js `serve`
```bash
npx serve .
# Buka URL yang ditampilkan di terminal
```

---

## Login Default

| Field    | Value       |
|----------|-------------|
| Username | `admin`     |
| Password | `admin123`  |

---

## Fitur Aplikasi

| Modul              | Fitur                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Dashboard**      | Ringkasan pemasukan, pengeluaran, saldo, proyek aktif; grafik 6 bulan |
| **Transaksi**      | Tambah/edit/hapus pemasukan & pengeluaran; filter jenis & bulan       |
| **Proyek**         | Manajemen proyek foto/video; DP, sisa tagihan, riwayat pembayaran     |
| **Laporan**        | Grafik tren bulanan, rekap per tahun, breakdown kategori              |

---

## Struktur File

```
Paket 1/
├── index.html          # Entry point
├── css/
│   ├── style.css       # Global styles, layout, utilities
│   ├── login.css       # Halaman login
│   ├── dashboard.css   # Dashboard
│   ├── transactions.css
│   ├── projects.css
│   └── reports.css
└── js/
    ├── storage.js      # localStorage wrapper
    ├── auth.js         # Autentikasi admin
    ├── utils.js        # Format, toast, modal helpers
    ├── dashboard.js    # Dashboard renderer
    ├── transactions.js # Manajemen transaksi
    ├── projects.js     # Manajemen proyek
    ├── reports.js      # Laporan & grafik
    └── app.js          # Controller utama, routing, seed data
```

---

## Penyimpanan Data

Semua data tersimpan di **localStorage** browser. Data tetap tersedia setelah browser ditutup atau halaman di-reload.

> Data hanya tersimpan di browser yang digunakan. Untuk backup, gunakan fitur Export (dapat ditambahkan di versi berikutnya).

---

## Reset Data Demo

Untuk menghapus data demo dan mulai dari awal:
1. Buka DevTools browser (F12)
2. Masuk ke tab **Application → Local Storage**
3. Klik kanan → **Clear** atau hapus semua key yang diawali `pf_`
4. Reload halaman

---

## Spesifikasi Teknis

- **Frontend:** HTML5, CSS3 (CSS Variables, Grid, Flexbox), Vanilla JavaScript (ES6+)
- **Chart:** Chart.js 4.4 (CDN)
- **Storage:** Browser localStorage
- **Autentikasi:** Session-based (localStorage)
- **Kompatibilitas:** Chrome 80+, Firefox 75+, Edge 80+, Safari 13+
- **Responsif:** Desktop, tablet, mobile

---

## Paket A — Rp 1.500.000

Estimasi pengerjaan: **7–10 hari kerja**

Termasuk:
- ✅ Semua fitur di atas
- ✅ Data demo untuk testing
- ✅ Desain responsif
- ✅ Dokumentasi penggunaan

Tidak termasuk:
- ❌ Hosting & domain
- ❌ Payment gateway / pembayaran online
- ❌ Backend/database server
- ❌ Multi-user / multi-device sync

