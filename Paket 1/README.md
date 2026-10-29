# PhotoFinance — Paket A

Aplikasi pencatatan pemasukan, pengeluaran, proyek, dan laporan keuangan untuk usaha foto/video. Data akun, transaksi, dan proyek disimpan di Cloudflare D1 sehingga dapat dibuka dari perangkat lain dengan akun yang sama.

## Jalankan di Cloudflare Pages

Fitur akun dan sinkronisasi online membutuhkan Cloudflare Pages Functions dan database D1. Membuka `index.html` langsung dari komputer atau memakai Live Server saja tidak menyediakan API online.

1. Buat proyek Cloudflare Pages yang terhubung ke repository GitHub.
2. Atur **Root directory** menjadi `Paket 1`, **Build command** kosong, dan **Build output directory** menjadi `.`.
3. Buat database D1 melalui Cloudflare Dashboard.
4. Jalankan isi file `schema.sql` pada SQL Console database D1 tersebut.
5. Pada pengaturan Pages, buka **Settings → Functions → D1 database bindings**. Tambahkan binding dengan nama `DB` dan pilih database D1 tadi.
6. Deploy ulang proyek Pages.
7. Buka alamat Pages dan daftarkan akun bos terlebih dahulu. Pendaftar pertama yang tidak memakai kode undangan menjadi admin sekaligus membuat workspace.
8. Admin buka **Pengaturan → Workspace Bersama**, lalu bagikan kode undangan kepada Anda.
9. Daftarkan akun Anda dengan memasukkan kode undangan tersebut. Akun Anda akan bergabung sebagai user dan memakai data workspace yang sama.

Jangan mengirim atau menyimpan kata sandi di repository. Data dipisahkan per workspace; anggota pada workspace yang sama berbagi transaksi dan proyek. Kata sandi di-hash di server dan sesi disimpan dalam cookie `HttpOnly`.

## Data lama

Saat login pertama kali dari browser yang sebelumnya memakai versi lokal, aplikasi menawarkan impor transaksi dan proyek lama ke akun online jika akun tersebut belum memiliki data. Pilih **OK** untuk mengimpor. Data lokal lama tidak otomatis tersedia di perangkat lain sebelum berhasil diimpor.

## Sinkronisasi

Perubahan transaksi dan proyek dikirim ke server setelah jeda singkat. Aplikasi memeriksa perubahan dari perangkat lain berkala dan memperbarui tampilan ketika data baru ditemukan. Perangkat harus terhubung ke internet dan akun harus menjadi anggota workspace yang sama. Admin dan user memakai username/password masing-masing; tidak perlu berbagi akun. Hindari mengedit data yang sama secara bersamaan dari dua perangkat.

Admin dapat mengganti kode undangan dari Pengaturan. Kode lama langsung tidak berlaku setelah diganti. Anggota yang sudah bergabung tetap dapat memakai workspace bersama.

## Fitur

- Dashboard pemasukan, pengeluaran, saldo, serta proyek.
- Tambah, edit, hapus, dan filter transaksi.
- Manajemen proyek, DP, tagihan, dan riwayat pembayaran.
- Laporan bulanan dan tahunan, grafik, serta ekspor CSV.
- Workspace dengan peran admin dan user serta kode undangan.

## Struktur

```text
Paket 1/
├── functions/api/auth.js       # Daftar, login, sesi, ganti password
├── functions/api/data.js       # Muat dan sinkronkan data workspace
├── functions/api/workspace.js  # Informasi workspace dan kode undangan
├── functions/api/_shared.js    # Cookie, hash password, helper D1
├── schema.sql                  # Tabel akun, sesi, dan data bisnis
├── index.html
├── css/
└── js/
```

## Batas pengaturan

Source code sudah menyiapkan endpoint Pages Functions dan skema D1. Database D1 dan binding `DB` harus dibuat pada akun Cloudflare pemilik proyek sebelum penyimpanan online aktif. Setelah perubahan aplikasi di-deploy, akun baru perlu didaftarkan; akun demo `admin/admin123` sudah tidak tersedia.
