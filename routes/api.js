const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const { hitungKalori } = require('../config/calorieCalculator');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  }
});

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

const validMoods = new Set(['😊', '😐', '😢', '😠']);

async function ensureSettingsRow() {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');

  if (rows.length) {
    return rows[0];
  }

  await pool.query(
    'INSERT INTO settings (id, nama, berat_kg) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE nama = VALUES(nama), berat_kg = VALUES(berat_kg)',
    ['Pengguna', 65.00]
  );

  const [freshRows] = await pool.query('SELECT * FROM settings WHERE id = 1');
  return freshRows[0];
}

// GET /api/exercises -> daftar jenis latihan dari database
router.get('/exercises', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exercises ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings -> profil (nama, berat badan)
router.get('/settings', async (req, res) => {
  try {
    const settings = await ensureSettingsRow();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings -> update nama / berat badan
router.put('/settings', async (req, res) => {
  try {
    const { nama, berat_kg } = req.body;
    const current = await ensureSettingsRow();
    const nextNama = typeof nama === 'string' && nama.trim() ? nama.trim() : current.nama;
    const nextBerat = berat_kg === undefined ? Number(current.berat_kg) : positiveNumber(berat_kg);

    if (nextBerat === null || nextBerat > 999.99) {
      return res.status(400).json({ error: 'Berat badan harus berupa angka antara 0 dan 999,99 kg' });
    }

    await pool.query(
      'UPDATE settings SET nama = ?, berat_kg = ? WHERE id = 1',
      [nextNama, nextBerat]
    );

    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/log -> catat 1 sesi latihan. Kalori dihitung otomatis di server (bukan input user)
// body untuk latihan reps : { kode: 'squat', reps: 20 }
// body untuk lari         : { kode: 'lari', jarakKm: 2.5, durasiMenit: 15 }
router.post('/log', async (req, res) => {
  try {
    const { kode, reps, jarakKm, durasiMenit } = req.body;

    if (typeof kode !== 'string' || !kode.trim()) {
      return res.status(400).json({ error: 'Jenis latihan wajib dipilih' });
    }

    const [exRows] = await pool.query('SELECT * FROM exercises WHERE kode = ?', [kode]);
    if (exRows.length === 0) {
      return res.status(404).json({ error: 'Jenis latihan tidak ditemukan' });
    }
    const exercise = exRows[0];

    const settings = await ensureSettingsRow();
    const beratKg = Number(settings.berat_kg || 65);

    let validReps = null;
    let validJarakKm = null;
    let validDurasiMenit = null;

    if (exercise.tipe === 'reps') {
      validReps = positiveInteger(reps);
      if (validReps === null || validReps > 1000000) {
        return res.status(400).json({ error: 'Jumlah repetisi harus bilangan bulat lebih dari 0' });
      }
    } else {
      validJarakKm = positiveNumber(jarakKm);
      validDurasiMenit = positiveNumber(durasiMenit);
      if (validJarakKm === null || validJarakKm > 9999.99 || validDurasiMenit === null || validDurasiMenit > 9999.99) {
        return res.status(400).json({ error: 'Jarak dan durasi lari harus lebih dari 0' });
      }
    }

    const hasil = hitungKalori(exercise, beratKg, {
      reps: validReps,
      jarakKm: validJarakKm,
      durasiMenit: validDurasiMenit
    });

    if (hasil.durasiMenit <= 0) {
      return res.status(400).json({ error: 'Data latihan tidak valid' });
    }

    const [result] = await pool.query(
      `INSERT INTO workout_logs (exercise_id, reps, jarak_km, durasi_menit, kalori)
       VALUES (?, ?, ?, ?, ?)`,
      [
        exercise.id,
        validReps,
        validJarakKm,
        hasil.durasiMenit,
        hasil.kalori
      ]
    );

    res.status(201).json({
      id: result.insertId,
      exercise: exercise.nama,
      reps: validReps,
      jarakKm: validJarakKm,
      durasiMenit: hasil.durasiMenit,
      kalori: hasil.kalori
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mood -> simpan mood sebagai catatan terpisah dari latihan
router.post('/mood', async (req, res) => {
  try {
    const { mood } = req.body;
    if (!validMoods.has(mood)) {
      return res.status(400).json({ error: 'Mood tidak valid' });
    }

    const [result] = await pool.query(
      'INSERT INTO mood_logs (mood) VALUES (?)',
      [mood]
    );

    res.status(201).json({ id: result.insertId, mood });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/photos -> simpan foto dokumentasi secara terpisah
router.post('/photos', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File foto wajib dipilih' });
    }

    const [result] = await pool.query(
      'INSERT INTO photo_logs (file_name, original_name) VALUES (?, ?)',
      [req.file.filename, req.file.originalname]
    );

    res.status(201).json({
      id: result.insertId,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
});

// GET /api/photos/today -> daftar foto dokumentasi hari ini
router.get('/photos/today', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, file_name, original_name, created_at
       FROM photo_logs
       WHERE DATE(created_at) = CURDATE()
       ORDER BY created_at DESC`
    );
    res.json(rows.map((row) => ({
      ...row,
      url: `/uploads/${row.file_name}`
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/today -> semua catatan latihan hari ini
router.get('/logs/today', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT wl.*, e.nama AS exercise_nama, e.emoji, e.kode
       FROM workout_logs wl
       JOIN exercises e ON e.id = wl.exercise_id
       WHERE DATE(wl.created_at) = CURDATE()
       ORDER BY wl.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summary/today -> ringkasan hari ini (kalori, reps, waktu latihan, mood terakhir)
router.get('/summary/today', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(kalori), 0) AS total_kalori,
         COALESCE(SUM(CASE WHEN reps IS NOT NULL THEN reps ELSE 0 END), 0) AS total_reps,
        COALESCE(SUM(durasi_menit), 0) AS total_menit,
        COUNT(*) AS total_sesi
       FROM workout_logs
       WHERE DATE(created_at) = CURDATE()`
    );

    const [moodRows] = await pool.query(
      `SELECT mood FROM mood_logs
       WHERE DATE(created_at) = CURDATE()
       ORDER BY created_at DESC LIMIT 1`
    );

    res.json({
      kalori_terbakar: Math.round(rows[0].total_kalori),
      estimasi_turun_kg: Math.round((Number(rows[0].total_kalori) / 7700) * 1000) / 1000,
      reps_hari_ini: Number(rows[0].total_reps),
      waktu_latihan_menit: Math.round(rows[0].total_menit),
      sesi_hari_ini: Number(rows[0].total_sesi),
      mood: moodRows.length ? moodRows[0].mood : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/log/:id -> hapus 1 catatan latihan
router.delete('/log/:id', async (req, res) => {
  try {
    const id = positiveInteger(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'ID latihan tidak valid' });
    }

    const [result] = await pool.query('DELETE FROM workout_logs WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Catatan latihan tidak ditemukan' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
