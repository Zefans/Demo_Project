# Ringkasan Percakapan dan Status Proyek

Dokumen ini merangkum keputusan dan pekerjaan penting yang dibahas pada percakapan ini. Informasi login, kode autentikasi, dan rahasia lainnya sengaja tidak dicantumkan.

## Proyek dan GitHub

- Repository proyek yang dikerjakan adalah [Zefans/Demo_Project](https://github.com/Zefans/Demo_Project).
- Struktur repo mencakup `Paket 1`, `Paket 2`, `Paket 3`, dan `undangan`.
- Paket 1 adalah aplikasi pencatatan keuangan untuk usaha fotografi/videografi (PhotoFinance/Basic Finance).
- Pernah dibahas pula proyek bernama SignalMap serta cara mengakses situs melalui GitHub. Pembahasan deployment SignalMap terpisah dari perubahan workspace Paket 1 di bawah.

## Penawaran Website Paket A–C

- Pengguna meminta daftar fitur dan harga Paket A, lalu daftar Paket A sampai C dengan bahasa yang mudah dipahami client.
- Harga Paket C diminta menjadi **Rp3.000.000 pas** dan harganya diminta lebih tinggi daripada Paket B.
- Waktu pengerjaan Paket C diubah menjadi **10–14 hari kerja**.
- Pengguna meminta ketentuan maintenance yang mencakup satu revisi ringan gratis per bulan (tidak termasuk desain ulang), maintenance gratis bulanan, dan garansi selamanya sesuai cakupan yang disepakati.
- Domain dan hosting berbayar hanya direncanakan untuk Paket B dan C. Paket A menggunakan hosting gratis tanpa domain sendiri karena digunakan untuk pendataan pemasukan dan tidak terhubung ke rekening bank atau e-wallet.
- Harga hosting dan domain untuk Paket B/C diminta gratis pada tahun pertama, lalu biaya perpanjangan diubah menjadi **Rp1.600.000 per tahun**.
- Pengguna memberikan rincian penawaran perpanjangan Rumahweb.com dengan total **Rp2.013.096** setelah pajak. Rincian tersebut memuat domain .com + ID Protection, hosting Unlimited Medium, backup harian, Titan Mail Pro satu akun, SSL Sectigo Positive DV, dan VAT.
- Pengguna meminta agar harga perpanjangan dalam price list ditampilkan sebagai Rp1.600.000 per tahun. File price list yang sebelumnya diedit berada di `output/pdf/Price_List_Finance_Manager.pdf`.
- Pengguna juga menanyakan email profesional, Midtrans, hosting gratis, Cloudflare Pages, serta kuota build/kredit. Keputusan untuk Paket A adalah menggunakan Cloudflare Pages sebagai hosting statis dan Cloudflare D1 untuk penyimpanan data online.

## Kebutuhan data Paket A

- Awalnya transaksi disimpan hanya di browser, sehingga tidak otomatis tersedia di perangkat lain.
- Kebutuhan yang disepakati: data transaksi dan proyek tersimpan online, bisa direkap per bulan, dan dapat dilihat dari beberapa perangkat.
- Agar data tersimpan online, aplikasi membutuhkan endpoint server dan database; Cloudflare Pages saja tidak menyediakan database untuk data aplikasi.
- Desain implementasi menggunakan Pages Functions + D1. Setiap transaksi tetap memiliki tanggal sehingga dapat dipakai untuk rekap bulanan dan tahunan.

## Workspace admin dan user

- Pengguna menjelaskan skenario dua orang dengan akun terpisah: bos memegang akun admin dan pengguna memegang akun user.
- Sistem Paket A diubah agar akun tidak perlu berbagi kata sandi:
  1. Akun pertama yang mendaftar tanpa kode undangan menjadi admin dan membuat workspace.
  2. Admin membagikan kode undangan dari menu **Pengaturan → Workspace Bersama**.
  3. User mendaftar memakai akun sendiri dengan kode undangan tersebut.
  4. Anggota workspace yang sama membaca dan menyimpan transaksi serta proyek pada data bersama.
- Kode undangan dapat diganti admin; kode sebelumnya tidak berlaku untuk pendaftaran baru setelah diganti.
- Perubahan dari entri yang berbeda digabung saat sinkronisasi. Hindari mengedit entri yang sama secara bersamaan karena perubahan terakhir pada entri yang sama dapat menggantikan perubahan sebelumnya.
- Jika ada data lama di browser, aplikasi menawarkan impor saat login pertama jika workspace online belum memiliki data.

## Perubahan yang sudah diunggah

- Perubahan aplikasi workspace Paket A sudah di-push ke branch `main` pada repo GitHub:
  - Commit `29e4878` — `Add shared workspace sync to Package A`
  - Commit `21cc037` — `Document Package A workspace update`
- Dokumentasi teknis workspace berada di [`Paket 1/PEMBARUAN_WORKSPACE.md`](Paket%201/PEMBARUAN_WORKSPACE.md).
- README Paket A memuat langkah menyiapkan Cloudflare Pages dan binding D1.

## Yang masih diperlukan

- Buat database D1 di akun Cloudflare.
- Jalankan SQL dari `Paket 1/schema.sql` pada database tersebut.
- Atur root directory Pages ke `Paket 1`, build command kosong, dan output directory `.`.
- Tambahkan binding D1 bernama `DB` pada Pages Functions.
- Deploy ulang ke Cloudflare, kemudian daftarkan akun admin dan akun user dengan kode undangan.

**Status:** kode sudah tersedia di GitHub, tetapi database D1 belum dibuat/bind dan aplikasi belum di-deploy ke Cloudflare. Jadi fitur akun dan sinkronisasi online belum aktif pada situs publik sampai pengaturan Cloudflare tersebut selesai.
