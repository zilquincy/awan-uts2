// ═══════════════════════════════════════════════════════════
//  TRANSKOTA — app.js
// ═══════════════════════════════════════════════════════════

// ── Toast Notification ──────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icon = type === 'success' ? '✅' : '❌';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Skeleton Loader ─────────────────────────────────────────
function renderSkeleton(containerId, count = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-line" style="width:60%;height:14px"></div>
      <div class="skeleton skeleton-line" style="width:90%;height:10px"></div>
      <div class="skeleton skeleton-line" style="width:40%;height:10px"></div>
    </div>
  `).join('');
}

// ── Update Status Bar ───────────────────────────────────────
function updateStatusBar(ruteCount, laporanCount) {
  const ruteEl = document.getElementById('status-rute');
  const laporanEl = document.getElementById('status-laporan');
  const timeEl = document.getElementById('status-time');

  if (ruteEl) ruteEl.textContent = `${ruteCount} rute aktif`;
  if (laporanEl) laporanEl.textContent = `${laporanCount} laporan masuk`;
  if (timeEl) timeEl.textContent = `Update: ${new Date().toLocaleTimeString('id-ID')}`;
}

// ══════════════════════════════════════════════════════════
//  FITUR 1 — Load Rute & Jadwal
// ══════════════════════════════════════════════════════════
async function loadRute() {
  renderSkeleton('daftar-rute', 3);

  try {
    const res = await fetch('/api/rute');
    if (!res.ok) throw new Error('Gagal memuat data rute');
    const data = await res.json();

    const el = document.getElementById('daftar-rute');
    if (!el) return;

    if (data.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🚌</div>
          <p>Belum ada data rute tersedia</p>
        </div>`;
      return;
    }

    el.innerHTML = data.map(r => `
      <div class="rute-card">
        <div class="rute-nama">🚌 ${r.nama}</div>
        <div class="rute-route">
          <span>${r.asal}</span>
          <span class="arrow">→</span>
          <span>${r.tujuan}</span>
        </div>
        <div class="rute-jadwal">${r.jadwal}</div>
      </div>
    `).join('');

    // Update counter di hero
    const heroRute = document.getElementById('hero-rute-count');
    if (heroRute) heroRute.textContent = data.length;

    updateStatusBar(data.length, null);

  } catch (err) {
    console.error(err);
    document.getElementById('daftar-rute').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠️</div>
        <p>Gagal memuat data rute</p>
      </div>`;
  }
}

// ══════════════════════════════════════════════════════════
//  FITUR 2 — Kirim Laporan + Upload Foto ke S3
// ══════════════════════════════════════════════════════════
async function kirimLaporan() {
  const btn = document.getElementById('btn-kirim');
  const jenis    = document.getElementById('jenis')?.value;
  const lokasi   = document.getElementById('lokasi')?.value?.trim();
  const deskripsi = document.getElementById('deskripsi')?.value?.trim();
  const foto     = document.getElementById('foto')?.files[0];

  // Validasi
  if (!lokasi || !deskripsi) {
    showToast('Lokasi dan deskripsi wajib diisi!', 'error');
    return;
  }

  // Loading state
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
  }

  try {
    const form = new FormData();
    form.append('jenis', jenis);
    form.append('lokasi', lokasi);
    form.append('deskripsi', deskripsi);
    if (foto) form.append('foto', foto);

    const res = await fetch('/api/laporan', { method: 'POST', body: form });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Gagal mengirim laporan');

    showToast('Laporan berhasil dikirim!', 'success');

    // Reset form
    document.getElementById('lokasi').value = '';
    document.getElementById('deskripsi').value = '';
    document.getElementById('foto').value = '';
    document.querySelector('.file-preview')?.classList.remove('visible');
    document.querySelector('.file-upload-text').textContent = 'Klik atau drag foto ke sini';

    // Reload laporan list
    loadLaporan();

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Terjadi kesalahan', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }
}

// ── Load Daftar Laporan ─────────────────────────────────────
async function loadLaporan() {
  try {
    const res = await fetch('/api/laporan');
    if (!res.ok) throw new Error();
    const data = await res.json();

    const el = document.getElementById('hasil-laporan-list');
    if (!el) return;

    if (data.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>Belum ada laporan masuk</p>
        </div>`;
      return;
    }

    el.innerHTML = data.map(d => {
      const isKemacetan = d.jenis === 'kemacetan';
      const icon = isKemacetan ? '🚦' : '🚨';
      const fotoHTML = d.foto_url
        ? `<img src="${d.foto_url}" alt="Foto laporan" class="laporan-foto">`
        : '';
      const waktu = d.waktu
        ? new Date(d.waktu).toLocaleString('id-ID')
        : '-';

      return `
        <div class="laporan-item">
          <div class="laporan-icon ${d.jenis}">${icon}</div>
          <div class="laporan-info">
            <h4>${d.jenis.charAt(0).toUpperCase() + d.jenis.slice(1)}</h4>
            <p>${d.deskripsi}</p>
            <div class="lokasi">📍 ${d.lokasi} · ${waktu}</div>
          </div>
          ${fotoHTML}
        </div>`;
    }).join('');

    updateStatusBar(null, data.length);

  } catch (err) {
    console.error('Gagal load laporan:', err);
  }
}

// ══════════════════════════════════════════════════════════
//  FITUR 3 — Monitoring Kendaraan Semi Real-time
// ══════════════════════════════════════════════════════════
async function loadMonitoring() {
  try {
    const res = await fetch('/api/monitoring');
    if (!res.ok) throw new Error();
    const data = await res.json();

    const el = document.getElementById('data-monitoring');
    if (!el) return;

    if (data.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">📡</div>
          <p>Tidak ada data kendaraan</p>
        </div>`;
      return;
    }

    el.innerHTML = data.map(d => {
      const aktif = d.status === 'Beroperasi';
      const badgeClass = aktif ? 'badge-aktif' : 'badge-nonaktif';
      const now = new Date().toLocaleTimeString('id-ID');

      return `
        <div class="monitoring-card">
          <div class="monitoring-header">
            <div class="monitoring-rute">${d.rute}</div>
            <span class="badge ${badgeClass}">${d.status}</span>
          </div>
          <div class="monitoring-posisi">${d.posisi !== '-' ? d.posisi : 'Tidak beroperasi'}</div>
          <div class="monitoring-time">Diperbarui: ${now}</div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Gagal load monitoring:', err);
  }
}

// ══════════════════════════════════════════════════════════
//  FILE UPLOAD — Preview filename
// ══════════════════════════════════════════════════════════
function initFileUpload() {
  const input = document.getElementById('foto');
  const preview = document.querySelector('.file-preview');
  const uploadText = document.querySelector('.file-upload-text');
  const area = document.querySelector('.file-upload-area');

  if (!input) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) {
      if (uploadText) uploadText.textContent = file.name;
      if (preview) preview.classList.add('visible');
    }
  });

  // Drag & drop visual
  if (area) {
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', () => area.classList.remove('drag-over'));
  }
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Load semua data
  loadRute();
  loadLaporan();
  loadMonitoring();

  // Init file upload
  initFileUpload();

  // Auto-refresh monitoring tiap 30 detik
  setInterval(loadMonitoring, 30000);

  // Auto-refresh laporan tiap 60 detik
  setInterval(loadLaporan, 60000);
});