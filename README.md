# Stokpedia Backend

Backend dari **Stokpedia**, yaitu Sistem Informasi Koperasi Sekolah yang digunakan untuk mengelola data dan kegiatan operasional koperasi. Backend ini bertanggung jawab untuk mengelola data aplikasi, autentikasi pengguna, transaksi, serta menyediakan layanan yang digunakan oleh frontend.

## Deskripsi Proyek

Stokpedia merupakan aplikasi pengelolaan koperasi sekolah yang memiliki dua jenis pengguna, yaitu `admin` dan `staff`.

Backend Stokpedia dikembangkan menggunakan Node.js dan Express.js dengan database PostgreSQL. Pengelolaan database menggunakan Sequelize ORM.

Sistem ini menyediakan berbagai layanan, mulai dari pengelolaan pengguna, siswa, kelas, jurusan, barang, tagihan, pembayaran, dashboard, hingga pengaturan profil koperasi dan keamanan akun.

## Teknologi yang Digunakan

| **Teknologi** | **Fungsi** |
| --- | --- |
| Node.js | Menjalankan aplikasi backend |
| Express.js | Membangun server dan mengatur endpoint |
| PostgreSQL | Menyimpan data aplikasi |
| Sequelize | Mengelola database menggunakan ORM |
| pg | Menghubungkan aplikasi dengan PostgreSQL |
| JSON Web Token (JWT) | Autentikasi pengguna |
| bcrypt | Melakukan hashing password |
| dotenv | Mengelola environment variables |
| cors | Mengatur akses komunikasi frontend dan backend |
| ua-parser-js | Mengidentifikasi perangkat dan browser pengguna |
| sequelize-cli | Menjalankan migration dan seeder |
| Nodemon | Membantu proses development |

## Fitur Backend

### 1. Autentikasi dan Pengguna

- Login menggunakan email dan password.
- Autentikasi menggunakan JSON Web Token (JWT).
- Verifikasi dua faktor (2FA) menggunakan TOTP.
- Menyediakan recovery code untuk 2FA.
- Pembatasan akses berdasarkan role `admin` dan `staff`.
- Pengelolaan akun dan status pengguna.
- Pengelolaan profil dan perubahan password.
- Pengelolaan sesi aktif pengguna.

### 2. Dashboard

- Menampilkan total siswa dan barang.
- Menampilkan jumlah tagihan.
- Menampilkan tagihan lunas dan belum lunas.
- Menampilkan total pemasukan dari pembayaran.

### 3. Manajemen Jurusan dan Kelas

- Menambahkan, menampilkan, mengubah, dan menghapus data.
- Mengelola kode dan nama jurusan.
- Mengelola nama kelas, tingkat, dan tahun ajaran.
- Menghubungkan kelas dengan jurusan.
- Mengelola status jurusan dan kelas.

### 4. Manajemen Siswa

- Menambahkan, menampilkan, mengubah, dan menghapus data siswa.
- Mengelola NIS, nama, angkatan, dan status siswa.
- Menghubungkan siswa dengan kelas dan jurusan.
- Memvalidasi NIS agar tidak terjadi duplikasi.

### 5. Manajemen Barang

- Menambahkan, menampilkan, mengubah, dan menghapus data barang.
- Mengelola nama dan harga barang.
- Mengatur status barang, seperti Aktif, Nonaktif, dan Akan Datang.

### 6. Manajemen Tagihan

- Membuat tagihan untuk satu atau beberapa siswa.
- Menampilkan dan mengubah data tagihan.
- Mengelola nominal dan tanggal jatuh tempo.
- Menghubungkan tagihan dengan siswa dan barang.
- Mengelola status pembayaran tagihan.

### 7. Manajemen Pembayaran

- Mencatat pembayaran tagihan siswa.
- Menampilkan riwayat pembayaran.
- Mengelola metode dan tanggal pembayaran.
- Memvalidasi nominal pembayaran.
- Memperbarui status tagihan menjadi Lunas setelah pembayaran berhasil.

### 8. Pengaturan Koperasi dan Sistem

**Profil Koperasi**
- Mengelola nama, subtitle, dan logo koperasi.

**Pencarian dan Notifikasi**
- Pencarian data siswa, jurusan, kelas, barang, tagihan, dan pembayaran.
- Menampilkan notifikasi tagihan dan pembayaran terbaru.

**Keamanan dan Sesi**
- Mengatur timeout sesi pengguna.
- Mengelola kebijakan password dan login.
- Menampilkan riwayat login.
- Mengelola sesi aktif dan perangkat pengguna.

## Endpoint API

Berikut kelompok endpoint utama yang tersedia pada backend Stokpedia.

Semua endpoint menggunakan prefix `/api`.

| **Modul** | **Base Route** | **Fungsi** |
| --- | --- | --- |
| Authentication | `/auth` | Login, logout, |
| Dashboard | `/dashboard` | Mengambil statistik koperasi |
| Search | `/search` | Pencarian data aplikasi |
| Notifications | `/notifications` | Mengambil notifikasi |
| Jurusan | `/jurusan` | Pengelolaan data jurusan |
| Kelas | `/classes` | Pengelolaan data kelas |
| Siswa | `/students` | Pengelolaan data siswa |
| Barang | `/items` | Pengelolaan data barang |
| Tagihan | `/bills` | Pengelolaan tagihan siswa |
| Pembayaran | `/payments` | Pengelolaan transaksi pembayaran |
| Pengguna | `/users` | Pengelolaan akun pengguna |
| Profil | `/profile` | Pengelolaan profil dan password |
| Sesi | `/profile/sessions` | Pengelolaan sesi pengguna |
| Profil Koperasi | `/cooperative-profile` | Pengelolaan identitas koperasi |
| Keamanan | `/security` | Pengaturan keamanan dan 2FA |

Endpoint tertentu membutuhkan autentikasi menggunakan JWT melalui header `Authorization` dengan skema `Bearer`.

## Database dan Relasi Data

Backend Stokpedia menggunakan PostgreSQL sebagai database dan Sequelize sebagai ORM.

Beberapa tabel utama yang digunakan:

| **Tabel** | **Fungsi** |
| --- | --- |
| `users` | Menyimpan data akun pengguna |
| `students` | Menyimpan data siswa |
| `classes` | Menyimpan data kelas |
| `jurusan` | Menyimpan data jurusan |
| `items` | Menyimpan data barang |
| `bills` | Menyimpan data tagihan |
| `payments` | Menyimpan data pembayaran |
| `sessions` | Menyimpan sesi login pengguna |
| `cooperative_profiles` | Menyimpan profil koperasi |
| `user_security_settings` | Menyimpan pengaturan keamanan pengguna |
| `system_security_settings` | Menyimpan kebijakan keamanan sistem |
| `recovery_codes` | Menyimpan recovery code 2FA |
| `login_histories` | Menyimpan riwayat login |

Relasi utama antar data meliputi:

- Jurusan memiliki banyak kelas dan siswa.
- Kelas memiliki banyak siswa.
- Siswa memiliki banyak tagihan.
- Barang memiliki banyak tagihan.
- Tagihan memiliki data pembayaran.
- Pengguna memiliki banyak sesi dan riwayat pembayaran.

Struktur database dikelola menggunakan migration Sequelize.

## Pengelolaan File Upload

Backend Stokpedia menyediakan pengelolaan file untuk kebutuhan profil koperasi dan profil pengguna.

- Logo koperasi mendukung format PNG, JPG, JPEG, dan WebP.
- Logo disimpan pada folder `uploads/cooperative`.
- Nama file menggunakan UUID.
- Foto profil pengguna dikirim dan disimpan dalam bentuk data URL.
- File logo dapat diakses melalui static route `/uploads`.

## Keamanan Aplikasi

Beberapa mekanisme keamanan yang diterapkan:

- Password disimpan dalam bentuk hash menggunakan bcrypt.
- Autentikasi menggunakan JWT.
- Pemeriksaan sesi aktif dan masa berlaku token.
- Pembatasan akses berdasarkan role pengguna.
- Verifikasi dua faktor menggunakan TOTP.
- Recovery code disimpan dalam bentuk hash.
- Pengaturan kebijakan password dan pembatasan percobaan login.
- Perlindungan akun admin terakhir agar tidak dapat dinonaktifkan atau dihapus.
- Penggunaan environment variables untuk konfigurasi sensitif.
- Pembatasan ukuran request JSON hingga 4MB.

## Pengembangan

### Konfigurasi Environment

Backend menggunakan file `.env` untuk menyimpan konfigurasi aplikasi.

Salin `.env.example` menjadi `.env`, kemudian sesuaikan nilainya.

| **Variabel** | **Fungsi** |
| --- | --- |
| `PORT` | Port server |
| `DB_HOST` | Host database PostgreSQL |
| `DB_PORT` | Port database |
| `DB_NAME` | Nama database |
| `DB_USER` | Username database |
| `DB_PASSWORD` | Password database |
| `JWT_SECRET` | Secret untuk autentikasi JWT |
| `JWT_EXPIRES_IN` | Durasi berlaku JWT |
| `APP_ENCRYPTION_KEY` | Kunci enkripsi secret TOTP |

### Instalasi dan Menjalankan Server

Jalankan perintah berikut pada terminal:

```bash
npm install
npm run dev
```

Script yang tersedia:

```bash
npm run dev
npm start
```

### Migration dan Seeder

Backend menggunakan Sequelize CLI untuk mengelola struktur database melalui migration dan seeder.

Seeder admin tersedia pada folder `seeders`.

## Struktur Folder

```text
backend/
├── config/
├── migrations/
├── models/
├── seeders/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   └── server.js
├── uploads/
│   └── cooperative/
├── .env.example
├── package.json
├── package-lock.json
└── .sequelizerc
```

## Penutup

Stokpedia Backend merupakan bagian utama dari sistem informasi koperasi sekolah yang menangani pengelolaan data, transaksi, autentikasi, dan keamanan aplikasi.