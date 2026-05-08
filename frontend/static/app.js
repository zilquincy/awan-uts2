// Load rute saat halaman dibuka
async function loadRute() {
  const res = await fetch('/api/rute');
  const data = await res.json();
  const el = document.getElementById('daftar-rute');
  el.innerHTML = data.map(r =>
    `<div class="card">
      <b>${r.nama}</b> | ${r.asal} → ${r.tujuan}
      <br>Jadwal: ${r.jadwal}
    </div>`
  ).join('');
}

// Kirim laporan dengan foto
async function kirimLaporan() {
  const form = new FormData();
  form.append('jenis', document.getElementById('jenis').value);
  form.append('lokasi', document.getElementById('lokasi').value);
  form.append('deskripsi', document.getElementById('deskripsi').value);
  const foto = document.getElementById('foto').files[0];
  if (foto) form.append('foto', foto);

  const res = await fetch('/api/laporan', { method: 'POST', body: form });
  const data = await res.json();
  document.getElementById('hasil-laporan').innerText = data.message;
}

// Load monitoring
async function loadMonitoring() {
  const res = await fetch('/api/monitoring');
  const data = await res.json();
  document.getElementById('data-monitoring').innerHTML =
    data.map(d =>
      `<div class="card">
        Rute: ${d.rute} | Status: <b>${d.status}</b>
        <br>Posisi: ${d.posisi}
      </div>`
    ).join('');
}

loadRute();
loadMonitoring();
setInterval(loadMonitoring, 30000); // refresh tiap 30 detik