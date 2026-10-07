const API = '/api';
const PROFILE_SETUP_KEY = 'fitness-profile-completed';

let exercises = [];
let activeExercise = null;
let activeMode = 'exercise';
let isOnboarding = false;
let settings = { nama: 'Pengguna', berat_kg: 65 };

const el = (id) => document.getElementById(id);

// Rumus yang SAMA persis dengan server, dipakai hanya untuk preview langsung di layar
// (perhitungan final & yang disimpan tetap dilakukan di server)
function metLari(kmPerJam) {
  if (kmPerJam < 8) return 8.0;
  if (kmPerJam < 9.7) return 9.8;
  if (kmPerJam < 10.8) return 10.5;
  if (kmPerJam < 12) return 11.5;
  if (kmPerJam < 13.9) return 12.8;
  return 14.5;
}

function previewReps(exercise, reps) {
  const durasiMenit = (reps * Number(exercise.detik_per_rep)) / 60;
  const kalori = (Number(exercise.met_value) * 3.5 * settings.berat_kg / 200) * durasiMenit;
  return { durasiMenit, kalori };
}

function previewLari(jarakKm, durasiMenit) {
  if (!durasiMenit) return { kalori: 0 };
  const kecepatan = jarakKm / (durasiMenit / 60);
  const met = metLari(kecepatan);
  const kalori = (met * 3.5 * settings.berat_kg / 200) * durasiMenit;
  return { kalori };
}

function formatPace(jarakKm, durasiMenit) {
  const totalSeconds = Math.round((durasiMenit / jarakKm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}/km`;
}

async function init() {
  el('todayDate').textContent = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  settings = await fetchJSON(`${API}/settings`);
  el('userName').textContent = `Halo, ${settings.nama}`;
  el('sumWeight').textContent = Number(settings.berat_kg).toFixed(1);

  exercises = await fetchJSON(`${API}/exercises`);
  renderTabs();
  selectExercise(exercises[0]);

  await refreshSummary();
  await refreshHistory();

  bindEvents();
  if (localStorage.getItem(PROFILE_SETUP_KEY) !== 'true') {
    openSettings(true);
  }
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Terjadi kesalahan' }));
    throw new Error(err.error || 'Terjadi kesalahan');
  }
  return res.json();
}

function renderTabs() {
  const wrap = el('exerciseTabs');
  wrap.innerHTML = '';
  const orderedExercises = [...exercises].sort((first, second) => {
    return Number(first.kode === 'lari') - Number(second.kode === 'lari');
  });

  orderedExercises.forEach((ex) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.kode = ex.kode;
    btn.innerHTML = `<span>${ex.emoji}</span><span>${ex.nama}</span>`;
    btn.addEventListener('click', () => selectExercise(ex));
    wrap.appendChild(btn);
  });

  const moodBtn = document.createElement('button');
  moodBtn.className = 'tab-btn mood-tab';
  moodBtn.dataset.mode = 'mood';
  moodBtn.innerHTML = '<span>🙂</span><span>Mood</span>';
  moodBtn.addEventListener('click', selectMood);
  wrap.appendChild(moodBtn);

  const photoBtn = document.createElement('button');
  photoBtn.className = 'tab-btn photo-tab';
  photoBtn.dataset.mode = 'photo';
  photoBtn.innerHTML = '<span>📷</span><span>Dokumentasi</span>';
  photoBtn.addEventListener('click', selectDocumentation);
  wrap.appendChild(photoBtn);
}

function selectExercise(ex) {
  activeMode = 'exercise';
  activeExercise = ex;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.kode === ex.kode && !b.dataset.mode);
  });
  el('exerciseEntry').classList.remove('hidden');
  el('moodForm').classList.add('hidden');
  el('photoForm').classList.add('hidden');

  const isKardio = ex.tipe === 'kardio';
  el('repsForm').classList.toggle('hidden', isKardio);
  el('lariForm').classList.toggle('hidden', !isKardio);

  el('repsPreview').textContent = '';
  el('lariPreview').textContent = '';
  el('pacePreview').textContent = '';
  el('repsInput').value = '';
  el('jarakInput').value = '';
  el('durasiInput').value = '';
}

function selectMood() {
  activeMode = 'mood';
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === 'mood');
  });
  el('exerciseEntry').classList.add('hidden');
  el('moodForm').classList.remove('hidden');
  el('photoForm').classList.add('hidden');
}

function selectDocumentation() {
  activeMode = 'photo';
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === 'photo');
  });
  el('exerciseEntry').classList.add('hidden');
  el('moodForm').classList.add('hidden');
  el('photoForm').classList.remove('hidden');
  refreshPhotos();
}

function bindEvents() {
  el('repsInput').addEventListener('input', updateRepsPreview);
  document.querySelectorAll('.quick-add').forEach((wrap) => {
    wrap.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cur = Number(el('repsInput').value) || 0;
        el('repsInput').value = cur + Number(btn.dataset.add);
        updateRepsPreview();
      });
    });
  });

  el('jarakInput').addEventListener('input', updateLariPreview);
  el('durasiInput').addEventListener('input', updateLariPreview);

  el('repsForm').addEventListener('submit', onSubmitReps);
  el('lariForm').addEventListener('submit', onSubmitLari);
  el('moodForm').addEventListener('submit', onSubmitMood);
  el('photoInput').addEventListener('change', previewPhoto);
  el('photoForm').addEventListener('submit', onSubmitPhoto);

  el('openSettings').addEventListener('click', openSettings);
  el('closeSettings').addEventListener('click', closeSettings);
  el('saveSettings').addEventListener('click', saveSettings);
}

function updateRepsPreview() {
  const reps = Number(el('repsInput').value) || 0;
  if (!reps || !activeExercise) { el('repsPreview').textContent = ''; return; }
  const { kalori, durasiMenit } = previewReps(activeExercise, reps);
  el('repsPreview').textContent =
    `≈ ${kalori.toFixed(0)} kkal · ${durasiMenit.toFixed(1)} menit (dihitung otomatis)`;
}

function updateLariPreview() {
  const jarak = Number(el('jarakInput').value) || 0;
  const durasi = Number(el('durasiInput').value) || 0;
  if (!jarak || !durasi) {
    el('lariPreview').textContent = '';
    el('pacePreview').textContent = '';
    return;
  }
  const { kalori } = previewLari(jarak, durasi);
  el('lariPreview').textContent = `≈ ${kalori.toFixed(0)} kkal (dihitung otomatis)`;
  el('pacePreview').textContent = `Pace ${formatPace(jarak, durasi)}`;
}

async function onSubmitReps(e) {
  e.preventDefault();
  const reps = Number(el('repsInput').value);
  if (!reps) return;
  await saveLog({ kode: activeExercise.kode, reps });
  el('repsInput').value = '';
  el('repsPreview').textContent = '';
}

async function onSubmitLari(e) {
  e.preventDefault();
  const jarakKm = Number(el('jarakInput').value);
  const durasiMenit = Number(el('durasiInput').value);
  if (!jarakKm || !durasiMenit) return;
  await saveLog({ kode: activeExercise.kode, jarakKm, durasiMenit });
  el('jarakInput').value = '';
  el('durasiInput').value = '';
  el('lariPreview').textContent = '';
  el('pacePreview').textContent = '';
}

async function onSubmitMood(e) {
  e.preventDefault();
  const mood = el('moodInput').value;
  if (!mood) return;

  try {
    await fetchJSON(`${API}/mood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood })
    });
    el('moodInput').value = '';
    showToast('Mood tersimpan');
    await refreshSummary();
  } catch (err) {
    showToast(err.message);
  }
}

function previewPhoto() {
  const file = el('photoInput').files[0];
  if (!file) {
    el('photoPreview').src = '';
    el('photoPreview').classList.add('hidden');
    return;
  }
  el('photoPreview').src = URL.createObjectURL(file);
  el('photoPreview').classList.remove('hidden');
}

async function onSubmitPhoto(e) {
  e.preventDefault();
  const file = el('photoInput').files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('photo', file);

  try {
    await fetchJSON(`${API}/photos`, { method: 'POST', body: formData });
    el('photoForm').reset();
    el('photoPreview').src = '';
    el('photoPreview').classList.add('hidden');
    showToast('Dokumentasi tersimpan');
    await refreshPhotos();
  } catch (err) {
    showToast(err.message);
  }
}

async function refreshPhotos() {
  const photos = await fetchJSON(`${API}/photos/today`);
  const list = el('photoHistory');
  list.innerHTML = '';
  photos.forEach((photo) => {
    const image = document.createElement('img');
    image.className = 'photo-item';
    image.src = photo.url;
    image.alt = photo.original_name;
    list.appendChild(image);
  });
}

async function saveLog(payload) {
  try {
    const result = await fetchJSON(`${API}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    showToast(`Tersimpan: ${result.exercise} · ${result.kalori.toFixed(0)} kkal`);
    await refreshSummary();
    await refreshHistory();
  } catch (err) {
    showToast(err.message);
  }
}

async function refreshSummary() {
  const s = await fetchJSON(`${API}/summary/today`);
  el('heroKalori').textContent = s.kalori_terbakar;
  el('sumEstimatedLoss').textContent = Number(s.estimasi_turun_kg).toFixed(3);
  el('sumSessions').textContent = s.sesi_hari_ini;
  el('sumReps').textContent = s.reps_hari_ini;
  el('sumWaktu').textContent = s.waktu_latihan_menit;
  el('sumMood').textContent = s.mood || '—';
  el('sumMoodEmoji').textContent = s.mood || '😊';
}

async function refreshHistory() {
  const logs = await fetchJSON(`${API}/logs/today`);
  const list = el('historyList');
  list.innerHTML = '';

  if (logs.length === 0) {
    list.innerHTML = '<li class="history-empty">Belum ada latihan tercatat hari ini.</li>';
    return;
  }

  logs.forEach((log) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const detail = log.kode === 'lari'
      ? `${log.jarak_km} km · ${log.durasi_menit} menit · pace ${formatPace(Number(log.jarak_km), Number(log.durasi_menit))}`
      : `${log.reps} repetisi · ${log.durasi_menit} menit`;
    const time = new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    li.innerHTML = `
      <div class="hi-left">
        <span class="hi-emoji">${log.emoji}</span>
        <div>
          <p class="hi-name">${log.exercise_nama}</p>
          <p class="hi-detail">${detail} · ${time}</p>
        </div>
      </div>
      <div class="hi-right">
        <span class="hi-kalori">${Math.round(log.kalori)} kkal</span>
        <button class="hi-delete" data-id="${log.id}" title="Hapus">✕</button>
      </div>
    `;
    li.querySelector('.hi-delete').addEventListener('click', () => deleteLog(log.id));
    list.appendChild(li);
  });
}

async function deleteLog(id) {
  await fetchJSON(`${API}/log/${id}`, { method: 'DELETE' });
  await refreshSummary();
  await refreshHistory();
}

function openSettings(onboarding = false) {
  isOnboarding = onboarding;
  el('settingsNama').value = settings.nama;
  el('settingsBerat').value = settings.berat_kg;
  el('settingsTitle').textContent = onboarding ? 'Isi Data Awal' : 'Pengaturan';
  el('closeSettings').classList.toggle('hidden', onboarding);
  el('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  if (isOnboarding) return;
  el('settingsModal').classList.add('hidden');
}

async function saveSettings() {
  const nama = el('settingsNama').value.trim();
  const berat_kg = Number(el('settingsBerat').value);
  if (!Number.isFinite(berat_kg) || berat_kg <= 0) {
    showToast('Berat badan wajib diisi dengan benar');
    el('settingsBerat').focus();
    return;
  }

  try {
    settings = await fetchJSON(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, berat_kg })
    });
    el('userName').textContent = `Halo, ${settings.nama}`;
    el('sumWeight').textContent = Number(settings.berat_kg).toFixed(1);
    localStorage.setItem(PROFILE_SETUP_KEY, 'true');
    isOnboarding = false;
    el('closeSettings').classList.remove('hidden');
    closeSettings();
    showToast('Pengaturan disimpan');
  } catch (err) {
    showToast(err.message);
  }
}

let toastTimer;
function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

init().catch((err) => showToast(err.message));
