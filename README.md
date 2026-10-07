# Fitness Tracker (Squat, Push Up, Sit Up, Pull Up, Lari)

Aplikasi web pelacak latihan dengan kalkulasi kalori **otomatis** (bukan input manual). Kamu cukup masukkan jumlah repetisi (squat/push up/sit up/pull up) atau jarak+durasi (lari), server yang menghitung kalorinya sendiri.

## Isi folder
```
fitness-tracker/
├── config/
│   ├── db.js                  # koneksi MySQL
│   └── calorieCalculator.js   # rumus perhitungan kalori otomatis
├── database/
│   ├── schema.sql             # struktur tabel + data awal 5 latihan
│   └── init-db.js             # script untuk membuat database otomatis
├── routes/
│   └── api.js                 # semua endpoint API
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js                  # entry point Express
├── package.json
└── .env.example
```

## Cara menjalankan di VS Code

### 1. Buka folder di VS Code
Buka folder `fitness-tracker` ini di VS Code (File → Open Folder), lalu buka Terminal bawaan VS Code (`Ctrl + ~`).

### 2. Install Node.js dependencies
```bash
npm install
```

### 3. Siapkan MySQL
Pastikan MySQL Server sudah terinstall & berjalan di komputer kamu (bisa lewat MySQL Installer, XAMPP, Laragon, dll).

Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka `.env` dan sesuaikan `DB_USER`, `DB_PASSWORD` dengan akun MySQL kamu.

### 4. Buat database otomatis
```bash
npm run init-db
```
Perintah ini akan membuat database `fitness_tracker`, tabel-tabelnya, dan mengisi 5 jenis latihan (Squat, Push Up, Sit Up, Pull Up, Lari).

Alternatif manual: buka file `database/schema.sql` di MySQL Workbench / phpMyAdmin lalu jalankan (Run) isinya.

### 5. Jalankan servernya
```bash
npm start
```
Lalu buka browser ke **http://localhost:3000**

Untuk mode development (auto-restart saat file berubah):
```bash
npm run dev
```

## Deploy gratis ke Render + Railway

Project ini sudah siap untuk hosting Node.js. Gunakan cara berikut:

### 1. Siapkan database MySQL
Buat database baru di Railway atau layanan MySQL gratis lain.

Setelah database dibuat, ambil detail koneksi berikut:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### 2. Siapkan variabel environment di Render
Buat web service baru di Render dan isi environment variables:

```env
PORT=10000
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=fitness_tracker
NODE_ENV=production
```

### 3. Deploy aplikasi
- Connect GitHub repo ke Render
- Pilih folder project
- Build command: `npm install`
- Start command: `npm start`

Render akan menjalankan server pada port yang diberikan environment variable `PORT`.

### 4. Jalankan `init-db`
Setelah app online, jalankan perintah database init di terminal Render atau terminal local dengan env yang sama:

```bash
npm run init-db
```

Setelah database sukses dibuat, app siap dipakai.

## Cara kerja perhitungan kalori (otomatis)

Rumus yang dipakai (standar MET — Metabolic Equivalent of Task):

```
Kalori (kkal) = MET × 3.5 × berat badan (kg) / 200 × durasi (menit)
```

- **Squat, Push Up, Sit Up, Pull Up**: durasi dihitung dari jumlah repetisi × estimasi 3 detik/repetisi, lalu kalori dihitung dari durasi tsb. Kamu hanya perlu input jumlah repetisi — kalori TIDAK bisa diinput manual, selalu hasil hitungan.
- **Lari**: kamu input jarak (km) dan durasi (menit). Kecepatan dihitung otomatis (jarak/durasi), lalu dipetakan ke nilai MET yang sesuai (makin cepat larinya, makin besar kalori per menitnya).
- Berat badan diambil dari menu **⚙️ Pengaturan** di pojok kanan atas (default 65 kg, bisa diubah sendiri).

Semua perhitungan dilakukan di server (`config/calorieCalculator.js`), tabel `workout_logs` hanya menyimpan **hasil** perhitungan (kolom `kalori`), jadi tidak ada input kalori manual sama sekali.

## Menghapus data
Setiap item di "Riwayat Hari Ini" punya tombol ✕ untuk menghapus catatan latihan tersebut (dan otomatis mengurangi ringkasan kalori/reps/waktu).
