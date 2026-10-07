-- ============================================
-- Skema database Fitness Tracker (MySQL)
-- ============================================

CREATE DATABASE IF NOT EXISTS fitness_tracker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE fitness_tracker;

-- Profil pengguna (dipakai untuk hitung kalori berdasarkan berat badan)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  nama VARCHAR(100) NOT NULL DEFAULT 'Pengguna',
  berat_kg DECIMAL(5,2) NOT NULL DEFAULT 65.00
);

INSERT INTO settings (id, nama, berat_kg)
VALUES (1, 'Pengguna', 65.00)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), berat_kg = VALUES(berat_kg);

-- Master data jenis latihan
-- met_value       = MET (Metabolic Equivalent of Task) latihan tsb
-- detik_per_rep   = estimasi waktu per repetisi (khusus latihan reps)
-- tipe            = 'reps' (dihitung dari jumlah repetisi) atau 'kardio' (dihitung dari jarak & durasi)
CREATE TABLE IF NOT EXISTS exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) DEFAULT '💪',
  tipe ENUM('reps','kardio') NOT NULL,
  met_value DECIMAL(4,2) NOT NULL,
  detik_per_rep DECIMAL(5,2) DEFAULT NULL
);

INSERT INTO exercises (kode, nama, emoji, tipe, met_value, detik_per_rep) VALUES
  ('squat',    'Squat',    '🏋️', 'reps',   5.0, 3.0),
  ('pushup',   'Push Up',  '💪', 'reps',   8.0, 3.0),
  ('situp',    'Sit Up',   '🔥', 'reps',   8.0, 3.0),
  ('pullup',   'Pull Up',  '🧗', 'reps',   8.0, 3.0),
  ('lari',     'Lari',     '🏃', 'kardio', 8.0, NULL)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), emoji = VALUES(emoji), tipe = VALUES(tipe), met_value = VALUES(met_value), detik_per_rep = VALUES(detik_per_rep);

-- Catatan / log latihan harian
-- Kalori TIDAK diinput manual, selalu dihitung otomatis oleh server (lihat routes/log.js)
CREATE TABLE IF NOT EXISTS workout_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exercise_id INT NOT NULL,
  reps INT DEFAULT NULL,              -- jumlah repetisi (squat / push up / sit up / pull up)
  jarak_km DECIMAL(6,2) DEFAULT NULL, -- khusus lari
  durasi_menit DECIMAL(6,2) NOT NULL, -- dipakai untuk hitung "waktu latihan" & kalori
  kalori DECIMAL(7,2) NOT NULL,       -- HASIL PERHITUNGAN OTOMATIS, bukan input pengguna
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
  ,INDEX idx_workout_logs_created_at (created_at)
);

-- Mood disimpan terpisah dari catatan latihan.
CREATE TABLE IF NOT EXISTS mood_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mood VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mood_logs_created_at (created_at)
);

-- Foto dokumentasi disimpan terpisah dari latihan dan mood.
CREATE TABLE IF NOT EXISTS photo_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_photo_logs_created_at (created_at)
);
