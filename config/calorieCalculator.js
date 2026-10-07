/**
 * Semua kalori DIHITUNG OTOMATIS di sini, tidak ada input kalori manual dari pengguna.
 * Rumus umum:  Kalori (kkal) = MET x 3.5 x berat(kg) / 200 x durasi(menit)
 */

// Untuk lari, MET berubah sesuai kecepatan (km/jam) — makin cepat, makin besar MET-nya
function getMetLari(kecepatanKmJam) {
  if (kecepatanKmJam < 8) return 8.0;    // jogging santai
  if (kecepatanKmJam < 9.7) return 9.8;
  if (kecepatanKmJam < 10.8) return 10.5;
  if (kecepatanKmJam < 12) return 11.5;
  if (kecepatanKmJam < 13.9) return 12.8;
  return 14.5;                            // lari cepat
}

/**
 * @param {object} exercise - baris dari tabel exercises (tipe, met_value, detik_per_rep)
 * @param {number} beratKg - berat badan pengguna
 * @param {object} input - { reps } untuk tipe 'reps', atau { jarakKm, durasiMenit } untuk tipe 'kardio'
 * @returns {object} { durasiMenit, kalori }
 */
function hitungKalori(exercise, beratKg, input) {
  if (exercise.tipe === 'reps') {
    const reps = Number(input.reps) || 0;
    const durasiMenit = (reps * Number(exercise.detik_per_rep)) / 60;
    const kalori = (Number(exercise.met_value) * 3.5 * beratKg / 200) * durasiMenit;
    return {
      durasiMenit: round2(durasiMenit),
      kalori: round2(kalori)
    };
  }

  if (exercise.tipe === 'kardio') {
    const jarakKm = Number(input.jarakKm) || 0;
    const durasiMenit = Number(input.durasiMenit) || 0;
    if (durasiMenit <= 0) {
      return { durasiMenit: 0, kalori: 0 };
    }
    const kecepatan = jarakKm / (durasiMenit / 60); // km/jam
    const met = getMetLari(kecepatan);
    const kalori = (met * 3.5 * beratKg / 200) * durasiMenit;
    return {
      durasiMenit: round2(durasiMenit),
      kalori: round2(kalori)
    };
  }

  return { durasiMenit: 0, kalori: 0 };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { hitungKalori };
