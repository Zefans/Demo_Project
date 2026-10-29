# Pembaruan Paket A: Workspace Admin dan User

## Ringkasan

Paket A sekarang mendukung beberapa akun pada satu workspace. Admin dan user memakai username serta password masing-masing, tetapi melihat dan mencatat transaksi, proyek, serta laporan milik workspace yang sama.

## Perubahan yang dibuat

- Akun pertama yang mendaftar tanpa kode undangan otomatis menjadi admin dan membuat workspace.
- Admin dapat melihat, menyalin, dan mengganti kode undangan di **Pengaturan → Workspace Bersama**.
- Akun yang mendaftar dengan kode undangan akan bergabung sebagai user di workspace admin.
- Data transaksi dan proyek disimpan di Cloudflare D1 berdasarkan workspace, bukan akun pribadi.
- Aplikasi mengirim perubahan ke server dan memeriksa perubahan dari perangkat lain secara berkala.
- Perubahan untuk entri berbeda digabung saat sinkronisasi, agar pencatatan dari dua perangkat tidak saling menimpa.
- Kata sandi di-hash di server dan sesi login memakai cookie `HttpOnly`.
- Data lama di browser dapat ditawarkan untuk diimpor ke workspace saat login pertama, jika workspace belum memiliki data.

## Alur penggunaan

1. Siapkan Cloudflare Pages dan database D1.
2. Daftarkan akun admin terlebih dahulu tanpa mengisi kode undangan.
3. Admin membuka **Pengaturan → Workspace Bersama** dan membagikan kode undangan.
4. User membuat akun sendiri dan memasukkan kode undangan tersebut.
5. Admin dan user masuk dengan akun masing-masing. Keduanya akan mengakses data workspace yang sama.

Kode undangan yang diganti tidak dapat digunakan untuk pendaftaran baru. Anggota yang sudah bergabung tetap berada di workspace.

## Pengaturan Cloudflare yang diperlukan

1. Atur root directory proyek Pages ke `Paket 1`.
2. Gunakan build command kosong dan output directory `.`.
3. Buat database D1.
4. Jalankan SQL dari [`schema.sql`](schema.sql) pada SQL Console D1.
5. Tambahkan D1 binding bernama `DB` ke Pages Functions.
6. Deploy ulang Pages setelah database dan binding siap.

Tanpa database D1 dan binding `DB`, login, pendaftaran, dan penyimpanan online belum dapat digunakan. Membuka halaman secara lokal melalui `file://` atau Live Server tidak mengaktifkan API Cloudflare.

## Catatan sinkronisasi

Perangkat perlu terhubung ke internet. Pembaruan dari perangkat lain biasanya terlihat dalam beberapa detik. Jika dua orang mengubah entri yang sama secara bersamaan, perubahan terakhir dapat menggantikan perubahan sebelumnya; hindari mengedit entri yang sama pada waktu bersamaan.
