# Stokpedia Backend

Backend API untuk Stokpedia, Sistem Informasi Koperasi Sekolah. Backend ini menyediakan layanan REST API untuk autentikasi, pengelolaan data koperasi, proses transaksi, pengaturan keamanan, dan komunikasi dengan frontend.

## Deskripsi Proyek

Stokpedia membantu pengelolaan operasional koperasi sekolah melalui data siswa, kelas, jurusan, barang, tagihan, dan pembayaran. Backend bertanggung jawab untuk:

- Menyediakan REST API untuk frontend.
- Menjalankan validasi request dan proses bisnis.
- Mengelola autentikasi dan session pengguna.
- Mengatur role dan akses endpoint.
- Menyimpan data menggunakan PostgreSQL.
- Mengelola relasi data melalui Sequelize ORM.
- Menyediakan pengaturan profil koperasi, keamanan, dan sesi aktif.

Backend dan frontend dikembangkan dalam project terpisah. Frontend mengakses backend melalui HTTP menggunakan base URL API, sedangkan backend mengembalikan response JSON untuk data maupun pesan error.

## Teknologi yang Digunakan

| Teknologi | Fungsi |
| --- | --- |
| Node.js | Runtime untuk menjalankan server JavaScript |
| Express.js | Framework HTTP dan routing REST API |
| PostgreSQL | Database relasional aplikasi |
| Sequelize | ORM untuk model, query, relasi, dan transaksi database |
| `pg` | Driver PostgreSQL untuk Sequelize |
| `pg-hstore` | Dukungan serialisasi data PostgreSQL |
| JSON Web Token | Pembuatan dan verifikasi token autentikasi |
| bcrypt | Hashing dan verifikasi password |
| dotenv | Memuat konfigurasi dari file environment |
| cors | Middleware Cross-Origin Resource Sharing |
| `ua-parser-js` | Mengidentifikasi perangkat, browser, dan sistem operasi dari user agent |
| `sequelize-cli` | Menjalankan migration dan seeder Sequelize |
| Nodemon | Menjalankan ulang server otomatis saat development |

## Fitur Backend

### 1. Autentikasi dan Pengguna

- Login menggunakan email dan password.
- Normalisasi email sebelum pencarian akun.
- Verifikasi password menggunakan bcrypt.
- Pembuatan JWT dengan identitas user, role, status aktif, dan `jti` session.
- Pembuatan session server-side saat login berhasil.
- Verifikasi token melalui middleware autentikasi.
- Pemeriksaan session aktif, waktu kedaluwarsa, dan timeout aktivitas.
- Role yang tersedia adalah `admin` dan `staff`.
- Pembatasan endpoint tertentu menggunakan role middleware.
- Pengelolaan akun pengguna oleh admin, termasuk membuat, mengubah, dan mengubah status akun.
- Validasi email dan username unik.
- Validasi kebijakan password saat membuat atau mengubah password.
- Perlindungan agar admin terakhir yang aktif tidak dapat dinonaktifkan atau dihapus.
- Endpoint profil pengguna, perubahan password, dan penghapusan akun dengan autentikasi ulang.
- Password dan atribut sensitif tidak dikembalikan dalam payload publik pengguna.

Backend juga memiliki dukungan autentikasi dua faktor:

- Pembuatan secret TOTP.
- Verifikasi kode TOTP untuk mengaktifkan 2FA.
- Recovery code yang disimpan dalam bentuk hash.
- Menonaktifkan 2FA dan membuat ulang recovery code.
- Token sementara dengan scope `2fa_pending` sebelum verifikasi login selesai.

### 2. Dashboard

Endpoint dashboard menghitung:

- Total siswa.
- Total barang.
- Total tagihan.
- Total tagihan lunas.
- Total tagihan belum lunas.
- Total pemasukan dari pembayaran.

### 3. Manajemen Jurusan

- CRUD data jurusan.
- Pengelolaan kode jurusan dan nama jurusan.
- Validasi kode dan nama unik melalui model/database.
- Pengelolaan status `Aktif`, `Nonaktif`, dan `Akan Datang`.
- Endpoint hanya dapat diakses role `admin`.

### 4. Manajemen Kelas

- CRUD data kelas.
- Pengelolaan nama kelas, tingkat, dan tahun ajaran.
- Relasi kelas dengan jurusan.
- Validasi jurusan dan format tahun ajaran.
- Pengelolaan status kelas.
- Endpoint hanya dapat diakses role `admin`.

### 5. Manajemen Siswa

- CRUD data siswa.
- Pengelolaan NIS, nama, angkatan, dan status siswa.
- Relasi siswa dengan kelas dan jurusan.
- Validasi kelas dan jurusan harus sesuai.
- Validasi NIS unik.
- Endpoint detail siswa berdasarkan ID.
- Endpoint hanya dapat diakses role `admin`.

### 6. Manajemen Barang

- CRUD data barang.
- Pengelolaan nama dan harga barang.
- Pengelolaan status `Aktif`, `Nonaktif`, dan `Akan Datang`.
- Validasi harga dan status.
- Model barang tidak memiliki field stok pada implementasi saat ini.
- Endpoint hanya dapat diakses role `admin`.

### 7. Manajemen Tagihan

- Menampilkan tagihan dengan relasi siswa, kelas, jurusan, dan barang.
- Membuat tagihan untuk satu siswa.
- Membuat tagihan secara bulk untuk beberapa siswa.
- Mengubah siswa, barang, nominal, tanggal tagihan, dan tanggal jatuh tempo.
- Menghapus tagihan dengan akses admin.
- Validasi nominal harus bilangan bulat lebih dari nol.
- Validasi tanggal tagihan dan jatuh tempo.
- Tanggal jatuh tempo tidak boleh lebih awal dari tanggal tagihan.
- Tagihan hanya dapat dibuat untuk siswa aktif.
- Status awal tagihan adalah `Belum Bayar`.
- Status `Lunas` diperbarui ketika pembayaran berhasil dibuat.

### 8. Manajemen Pembayaran

- Menampilkan seluruh riwayat pembayaran.
- Memuat relasi pembayaran dengan tagihan, siswa, kelas, jurusan, barang, dan user pencatat.
- Mencatat nominal, metode pembayaran, tanggal pembayaran, dan catatan.
- Memastikan tagihan tersedia dan belum lunas.
- Memastikan nominal pembayaran sama dengan nominal tagihan.
- Menghubungkan pembayaran dengan user yang sedang login.
- Mengubah status tagihan menjadi `Lunas` setelah pembayaran tersimpan.

### 9. Pengaturan Koperasi dan Sistem

#### Profil koperasi

- Menampilkan nama, subtitle, dan URL logo profil koperasi.
- Membuat profil default jika belum tersedia.
- Memperbarui nama, subtitle, dan logo.
- Menyimpan logo pada `uploads/cooperative`.

#### Pencarian dan notifikasi

- Pencarian lintas siswa, jurusan, kelas, barang, tagihan, dan pembayaran.
- Notifikasi tagihan belum lunas dan pembayaran terbaru.
- Response notifikasi menunjukkan bahwa tracking status terbaca belum didukung (`readTrackingSupported: false`).

#### Keamanan dan sesi

- Pengaturan timeout sesi per user dengan pilihan yang divalidasi backend.
- Kebijakan password dan lockout login pada level sistem.
- Riwayat login dengan pagination.
- Daftar sesi aktif dan riwayat sesi.
- Logout current session, revoke satu sesi, dan revoke seluruh sesi perangkat lain.
- Metadata perangkat, browser, sistem operasi, IP, waktu login, dan aktivitas terakhir.

## Endpoint API

Semua endpoint berada di bawah prefix `/api`. Endpoint yang diberi keterangan autentikasi memerlukan header:

```http
Authorization: Bearer <JWT>
```

### Endpoint Utama

| Modul | Base Route | Fungsi |
| --- | --- | --- |
| Health | `GET /api/health` | Memeriksa apakah API sedang berjalan |
| Authentication | `POST /api/auth/login` | Login dan pembuatan JWT/session |
| Authentication | `POST /api/auth/logout` | Mengakhiri session saat ini |
| Authentication | `POST /api/auth/2fa/verify` | Menyelesaikan login dengan kode TOTP atau recovery code |
| Authentication | `POST /api/auth/session/keep-alive` | Memperbarui aktivitas session |
| Dashboard | `GET /api/dashboard` | Mengambil statistik dashboard |
| Search | `GET /api/search?q=...` | Mencari data lintas modul |
| Notifications | `GET /api/notifications` | Mengambil notifikasi tagihan dan pembayaran |
| Jurusan | `GET /api/jurusan` | Mengambil daftar jurusan |
| Jurusan | `POST /api/jurusan` | Membuat jurusan |
| Jurusan | `PUT /api/jurusan/:id` | Mengubah jurusan |
| Jurusan | `DELETE /api/jurusan/:id` | Menghapus jurusan |
| Kelas | `GET /api/classes` | Mengambil daftar kelas |
| Kelas | `POST /api/classes` | Membuat kelas |
| Kelas | `PUT /api/classes/:id` | Mengubah kelas |
| Kelas | `DELETE /api/classes/:id` | Menghapus kelas |
| Siswa | `GET /api/students` | Mengambil daftar siswa |
| Siswa | `GET /api/students/:id` | Mengambil detail siswa |
| Siswa | `POST /api/students` | Membuat siswa |
| Siswa | `PUT /api/students/:id` | Mengubah siswa |
| Siswa | `DELETE /api/students/:id` | Menghapus siswa |
| Barang | `GET /api/items` | Mengambil daftar barang |
| Barang | `POST /api/items` | Membuat barang |
| Barang | `PUT /api/items/:id` | Mengubah barang |
| Barang | `DELETE /api/items/:id` | Menghapus barang |
| Tagihan | `GET /api/bills` | Mengambil tagihan beserta relasi siswa dan barang |
| Tagihan | `POST /api/bills` | Membuat satu tagihan |
| Tagihan | `POST /api/bills/bulk` | Membuat tagihan untuk beberapa siswa |
| Tagihan | `PUT /api/bills/:id` | Mengubah tagihan |
| Tagihan | `DELETE /api/bills/:id` | Menghapus tagihan |
| Pembayaran | `GET /api/payments` | Mengambil riwayat pembayaran beserta relasinya |
| Pembayaran | `POST /api/payments` | Mencatat pembayaran dan melunasi tagihan |
| Pengguna | `GET /api/users` | Mengambil daftar pengguna |
| Pengguna | `POST /api/users` | Membuat pengguna |
| Pengguna | `PUT /api/users/:id` | Mengubah pengguna |
| Pengguna | `PATCH /api/users/:id/status` | Mengubah status aktif pengguna |
| Pengguna | `GET /api/users/profile` | Mengambil profil melalui route user |
| Pengguna | `PATCH /api/users/profile` | Mengubah profil melalui route user |
| Profil pengguna | `GET /api/profile` | Mengambil profil user yang sedang login |
| Profil pengguna | `PATCH /api/profile` | Mengubah profil user |
| Profil pengguna | `GET /api/profile/check-username` | Memeriksa ketersediaan username |
| Profil pengguna | `PATCH /api/profile/password` | Mengubah password |
| Profil pengguna | `DELETE /api/profile` | Menghapus akun dengan autentikasi ulang |
| Sesi | `GET /api/profile/sessions` | Mengambil sesi aktif |
| Sesi | `GET /api/profile/sessions/history` | Mengambil riwayat sesi |
| Sesi | `DELETE /api/profile/sessions/:id` | Mencabut satu sesi |
| Sesi | `DELETE /api/profile/sessions` | Mencabut sesi perangkat lain |
| Profil koperasi | `GET /api/cooperative-profile` | Mengambil profil koperasi |
| Profil koperasi | `PATCH /api/cooperative-profile` | Mengubah profil koperasi |
| Keamanan | `GET /api/security/settings` | Mengambil timeout sesi dan status 2FA |
| Keamanan | `PUT /api/security/settings` | Mengubah timeout sesi |
| Keamanan | `GET /api/security/policy` | Mengambil kebijakan password dan lockout |
| Keamanan | `PUT /api/security/policy` | Mengubah kebijakan keamanan, khusus admin |
| Keamanan | `POST /api/security/2fa/setup` | Membuat secret dan URI TOTP |
| Keamanan | `POST /api/security/2fa/verify-enable` | Memverifikasi dan mengaktifkan 2FA |
| Keamanan | `POST /api/security/2fa/disable` | Menonaktifkan 2FA |
| Keamanan | `POST /api/security/2fa/recovery-codes/regenerate` | Membuat ulang recovery code |
| Keamanan | `GET /api/security/login-history` | Mengambil riwayat login dengan pagination |

Route `/api/users` dilindungi autentikasi dan role `admin`. Route jurusan, kelas, siswa, dan barang juga membutuhkan role `admin`. Route tagihan dan pembayaran membutuhkan autentikasi, sedangkan beberapa route profil dan keamanan dapat digunakan oleh user terautentikasi sesuai validasi endpoint masing-masing.

## Database dan Relasi Data

Backend menggunakan PostgreSQL sebagai database dan Sequelize sebagai ORM. Struktur database dikelola melalui migration Sequelize yang tersedia pada folder `migrations`. Model berada pada folder `models`, sedangkan konfigurasi koneksi berada pada `src/config/database.js`.

### Entitas Utama

| Entitas/ tabel | Fungsi |
| --- | --- |
| `users` | Akun, role, status aktif, profil, password hash, dan field keamanan user |
| `students` | Data siswa, NIS, angkatan, status, serta relasi kelas dan jurusan |
| `classes` | Data kelas, tingkat, tahun ajaran, status, dan relasi jurusan |
| `jurusan` | Kode, nama, status aktif, dan status tampilan jurusan |
| `items` | Data barang, harga, dan status barang |
| `bills` | Tagihan siswa untuk barang, nominal, tanggal, jatuh tempo, dan status |
| `payments` | Pembayaran tagihan, nominal, metode, tanggal, catatan, dan user pencatat |
| `sessions` | Session login server-side, JTI, status, expiry, perangkat, dan aktivitas |
| `cooperative_profiles` | Nama, subtitle, dan URL logo profil koperasi |
| `user_security_settings` | Timeout session per user |
| `system_security_settings` | Kebijakan password, jumlah percobaan gagal, dan durasi lockout |
| `recovery_codes` | Hash recovery code 2FA dan waktu penggunaan |
| `login_histories` | Percobaan login, IP, user agent, perangkat, status, dan waktu |

### Relasi Model

- `Class` memiliki banyak `Student`.
- `Jurusan` memiliki banyak `Class` dan `Student`.
- `Student` termasuk ke satu `Class` dan satu `Jurusan`.
- `Student` memiliki banyak `Bill`.
- `Item` memiliki banyak `Bill`.
- `Bill` termasuk ke satu `Student` dan satu `Item`.
- `Bill` memiliki banyak `Payment`.
- `Payment` termasuk ke satu `Bill` dan satu `User`.
- `User` memiliki banyak `Payment` dan `Session`.
- `User` memiliki satu `UserSecuritySettings`.
- `User` memiliki banyak `RecoveryCode` dan `LoginHistory`.

Relasi Sequelize diinisialisasi pada `models/index.js` sebelum controller menjalankan query dengan `include`.

## Pengelolaan File Upload

Backend tidak menggunakan library multipart khusus seperti Multer. Upload logo profil koperasi dan foto profil user dikirim melalui JSON sebagai data URL.

### Logo profil koperasi

- Endpoint: `PATCH /api/cooperative-profile`.
- Format yang diterima: PNG, JPEG/JPG, dan WebP.
- Validasi controller: ukuran binary maksimal 2MB.
- File disimpan pada `backend/uploads/cooperative`.
- Nama file dibuat menggunakan UUID.
- File disajikan melalui static route `/uploads`.
- URL file dapat diakses frontend melalui base URL backend.

### Foto profil user

- Endpoint: `PATCH /api/profile`.
- Format data URL: JPEG, PNG, atau WebP.
- Controller memvalidasi ukuran data URL maksimal 5MB.
- Nilai foto disimpan pada field `avatarUrl` sebagai data URL.
- Parser JSON global Express memiliki limit request `4mb`, sehingga ukuran request efektif tetap dipengaruhi limit tersebut.

## Keamanan Aplikasi

- Password di-hash menggunakan bcrypt dan tidak dikembalikan pada payload publik.
- JWT ditandatangani dengan `JWT_SECRET` dari environment.
- Token memuat `jti` yang dikaitkan dengan session database.
- Middleware autentikasi memverifikasi JWT, status session, expiry, timeout aktivitas, dan status aktif user.
- Role middleware membatasi endpoint berdasarkan role `admin` atau `staff`.
- Password baru divalidasi berdasarkan kebijakan panjang, huruf/angka, dan karakter khusus.
- Login gagal dihitung dan dapat menyebabkan account lockout berdasarkan kebijakan sistem.
- Secret TOTP dienkripsi menggunakan AES-256-GCM.
- Recovery code disimpan sebagai hash SHA-256 dan dapat ditandai sudah digunakan.
- Endpoint perubahan dan penghapusan akun memerlukan autentikasi session.
- Admin terakhir yang aktif dilindungi dari penonaktifan dan penghapusan.
- CORS diaktifkan melalui middleware `cors`.
- Request JSON dibatasi hingga 4MB.
- Error internal dicatat di server dan response publik menggunakan pesan umum.
- Nilai rahasia seperti password database, JWT secret, dan encryption key dibaca dari environment, bukan ditulis di source code.

## Pengembangan

### Konfigurasi environment

Salin `.env.example` menjadi `.env`, lalu isi nilainya sesuai environment lokal. Jangan memasukkan credential nyata ke repository.

Variabel yang dibaca backend:

| Variabel | Fungsi |
| --- | --- |
| `PORT` | Port server, default `5001` |
| `DB_HOST` | Host PostgreSQL |
| `DB_PORT` | Port PostgreSQL |
| `DB_NAME` | Nama database |
| `DB_USER` | User PostgreSQL |
| `DB_PASSWORD` | Password PostgreSQL |
| `JWT_SECRET` | Secret untuk signing dan verifikasi JWT |
| `JWT_EXPIRES_IN` | Durasi JWT, default `1d` jika tidak diisi |
| `APP_ENCRYPTION_KEY` | Bahan kunci enkripsi secret TOTP |

Contoh `.env.example` hanya berisi placeholder dan bukan credential produksi:

```env
PORT=5001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=koperasi_sekolah_dev
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=change_this_secret
APP_ENCRYPTION_KEY=change_this_32_byte_or_longer_key
```

### Instalasi dan menjalankan server

```bash
npm install
npm run dev
```

Script yang tersedia pada `package.json`:

```bash
npm run dev    # nodemon src/server.js
npm start      # node src/server.js
```

Server melakukan autentikasi koneksi database sebelum mulai listen pada port yang dikonfigurasi.

### Migration dan seeder

Migration tersedia pada folder `migrations` dan mencakup pembuatan tabel utama, field profil user, session lifecycle, profil koperasi, serta pengaturan keamanan. Seeder admin tersedia pada `seeders/001-create-admin.js`.

Jalankan migration atau seeder menggunakan Sequelize CLI setelah konfigurasi database siap. Backend tidak menjalankan sinkronisasi schema destruktif saat startup; `src/server.js` hanya melakukan `sequelize.authenticate()`.

## Struktur Folder

```text
backend/
├── config/
│   └── config.js
├── migrations/
│   ├── 001-create-users.js
│   ├── 002-create-classes.js
│   ├── 003-create-jurusan.js
│   ├── 004-create-students.js
│   ├── 005-create-items.js
│   ├── 006-create-bills.js
│   ├── 007-create-payments.js
│   ├── 008-add-user-active-status.js
│   ├── 009-add-class-jurusan.js
│   ├── 010-add-bill-dates.js
│   ├── 011-add-jurusan-status.js
│   ├── 012-add-user-profile-fields.js
│   ├── 013-create-sessions.js
│   ├── 014-create-cooperative-profiles.js
│   ├── 015-add-security-fields.js
│   └── 016-add-session-lifecycle.js
├── models/
│   ├── index.js
│   ├── User.js
│   ├── Student.js
│   ├── Class.js
│   ├── Jurusan.js
│   ├── Item.js
│   ├── Bill.js
│   ├── Payment.js
│   ├── Session.js
│   ├── CooperativeProfile.js
│   ├── UserSecuritySettings.js
│   ├── SystemSecuritySettings.js
│   ├── RecoveryCode.js
│   └── LoginHistory.js
├── seeders/
│   └── 001-create-admin.js
├── src/
│   ├── config/database.js
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

Folder `docs/` tidak tersedia pada backend saat ini. Dokumentasi endpoint dan perilaku API pada project ini dirangkum dalam README ini berdasarkan source code aktual.

## Penutup

Stokpedia Backend merupakan backend API untuk Sistem Informasi Koperasi Sekolah. Layanan ini menyediakan autentikasi, pengelolaan data master, transaksi tagihan dan pembayaran, manajemen session, pengaturan keamanan, serta integrasi REST API untuk frontend Stokpedia.