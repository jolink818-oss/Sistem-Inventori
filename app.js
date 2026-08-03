// URL WEB APP APPS SCRIPT ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbxoiW6swt-4rssmCwh7mc_TCZ0gaBP-z8TXNpayMavuU2ywPcbXz-IGPZIzN5MynYrN/exec";

var globalInventoryData = [];
var globalTransactionsData = [];
var currentFilter = 'semua';
var savedUserName = localStorage.getItem("inventoryUserName");
var html5QrCode = null;
var scannerMode = 'carian';

// REGISTRATION SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker terdaftar:', reg.scope))
      .catch(err => console.log('Ralat Service Worker:', err));
  });
}

document.addEventListener("DOMContentLoaded", function() {
  if (savedUserName) {
    document.getElementById("user-greeting").innerText = "Pengguna: " + savedUserName;
    document.getElementById("view-dashboard").style.display = "block";
    muatDataStok();
  } else {
    document.getElementById("user-greeting").innerText = "Sila Masuk";
    document.getElementById("view-profile").style.display = "block";
    muatPengguna();
  }
});

function muatPengguna() {
  fetch(`${API_URL}?action=getUsers`)
    .then(res => res.json())
    .then(res => {
      if(res.success && res.data) {
        paparSenaraiPengguna(res.data);
      } else {
        Swal.fire('Ralat', 'Gagal memuatkan data pengguna', 'error');
      }
    })
    .catch(err => Swal.fire('Ralat Rangkaian', err.toString(), 'error'));
}

function paparSenaraiPengguna(data) {
  var selectObj = document.getElementById("user_select");
  selectObj.innerHTML = '<option value="">-- Pilih Nama Anda --</option>';
  if (data && data.length > 0) {
    data.forEach(function(row) {
      if (String(row[3]).trim() === "Aktif" || row[3] === true) {
        selectObj.innerHTML += '<option value="' + row[1] + '">' + row[1] + '</option>';
      }
    });
  }
}

function simpanProfil() {
  var nama = document.getElementById("user_select").value;
  if (!nama) return Swal.fire('Peringatan', 'Sila pilih nama anda', 'warning');
  
  localStorage.setItem("inventoryUserName", nama);
  savedUserName = nama;
  document.getElementById("view-profile").style.display = "none";
  document.getElementById("user-greeting").innerText = "Pengguna: " + savedUserName;
  document.getElementById("view-dashboard").style.display = "block";
  muatDataStok();
}

function logKeluar() {
  Swal.fire({
    title: 'Tukar Profil?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya',
    cancelButtonText: 'Batal'
  }).then((res) => {
    if (res.isConfirmed) {
      localStorage.removeItem("inventoryUserName");
      location.reload();
    }
  });
}

function muatDataStok() {
  document.getElementById("app-content").innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Memuatkan data stok...</p></div>';
  fetch(`${API_URL}?action=getInventory`)
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        globalInventoryData = res.data || [];
        tapisData();
      } else {
        document.getElementById("app-content").innerHTML = '<p class="text-center text-danger my-4">Gagal memuatkan data stok.</p>';
      }
    })
    .catch(err => {
      document.getElementById("app-content").innerHTML = '<p class="text-center text-danger my-4">Ralat sambungan rangkaian.</p>';
    });
}

function setFilter(jenis) {
  currentFilter = jenis;
  document.querySelectorAll('.btn-group .btn').forEach(b => b.classList.remove('active'));
  document.getElementById('filter-' + jenis).classList.add('active');
  tapisData();
}

function tapisData() {
  var carian = document.getElementById("search-input").value.toLowerCase();
  var dataHasil = globalInventoryData.filter(function(row) {
    var id = String(row[0]).toLowerCase();
    var nama = String(row[1]).toLowerCase();
    var stok = parseInt(row[3]) || 0;
    var murniTeks = id.includes(carian) || nama.includes(carian);
    var murniStok = true;
    if (currentFilter === 'rendah') murniStok = stok < 20;
    else if (currentFilter === 'mencukupi') murniStok = stok >= 20;
    return murniTeks && murniStok;
  });
  renderJadual(dataHasil);
}

function renderJadual(data) {
  var content = document.getElementById("app-content");
  if(!data || data.length === 0) {
    content.innerHTML = "<p class='text-center text-muted my-4'>Tiada item dijumpai.</p>";
    return;
  }
  var html = '<div class="table-responsive"><table class="table table-hover align-middle">';
  html += '<thead class="table-light"><tr><th>Nama Item</th><th class="text-center">Stok</th></tr></thead><tbody>';
  data.forEach(function(row) {
    var stok = parseInt(row[3]) || 0;
    var badgeClass = stok < 20 ? 'bg-danger' : 'bg-success';
    html += '<tr><td><span class="fw-bold">' + row[1] + '</span><br><small class="text-muted">ID: ' + row[0] + '</small></td>';
    html += '<td class="text-center"><span class="badge rounded-pill ' + badgeClass + ' fs-6">' + stok + '</span></td></tr>';
  });
  html += '</tbody></table></div>';
  content.innerHTML = html;
}

function bukaPengimbas(mode) {
  scannerMode = mode;
  var modalElement = new bootstrap.Modal(document.getElementById('scannerModal'));
  modalElement.show();

  if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 180 } }, onScanSuccess)
    .catch(() => {
      tutupPengimbas();
      ambilGambarKamera();
    });
}

function ambilGambarKamera() {
  tutupPengimbas();
  document.getElementById("qr-file-input").click();
}

function prosesGambarQR(e) {
  if (e.target.files.length === 0) return;
  Swal.fire({ title: 'Menganalisis...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.scanFile(e.target.files[0], true)
    .then(decodedText => { Swal.close(); onScanSuccess(decodedText); })
    .catch(() => Swal.fire('Ralat Imbasan', 'Kod tidak dapat dibaca dari imej.', 'error'));
  e.target.value = '';
}

function onScanSuccess(decodedText) {
  tutupPengimbas();
  if (scannerMode === 'carian') {
    document.getElementById("search-input").value = decodedText;
    tapisData();
  } else if (scannerMode === 'borang') {
    document.getElementById("item_id").value = decodedText;
  }
}

function tutupPengimbas() {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      bootstrap.Modal.getInstance(document.getElementById('scannerModal')).hide();
    });
  } else {
    var modalEl = document.getElementById('scannerModal');
    if (modalEl) {
      var instance = bootstrap.Modal.getInstance(modalEl);
      if (instance) instance.hide();
    }
  }
}

function bukaSejarah() {
  document.getElementById("view-dashboard").style.display = "none";
  document.getElementById("view-history").style.display = "block";
  document.getElementById("history-content").innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary"></div></div>';
  
  fetch(`${API_URL}?action=getTransactions`)
    .then(res => res.json())
    .then(res => {
      if(res.success) {
        globalTransactionsData = res.data || [];
        paparSejarah(globalTransactionsData);
      } else {
        document.getElementById("history-content").innerHTML = "<p class='text-center text-danger my-4'>Gagal memuatkan sejarah.</p>";
      }
    })
    .catch(err => {
      document.getElementById("history-content").innerHTML = "<p class='text-center text-danger my-4'>Ralat sambungan.</p>";
    });
}

function tutupSejarah() {
  document.getElementById("view-history").style.display = "none";
  document.getElementById("view-dashboard").style.display = "block";
}

function paparSejarah(data) {
  var content = document.getElementById("history-content");
  if(!data || data.length === 0) {
    content.innerHTML = "<p class='text-center text-muted my-4'>Tiada rekod transaksi.</p>";
    return;
  }
  var html = '<div class="list-group list-group-flush">';
  data.forEach(function(trx) {
    var isMasuk = trx.jenis === "Masuk";
    var badgeClass = isMasuk ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
    html += '<div class="list-group-item px-0 py-3 d-flex justify-content-between">';
    html += '<div><h6 class="mb-1 fw-bold">' + trx.namaItem + '</h6><small class="text-muted d-block">🕒 ' + trx.tarikh + '</small><small class="text-secondary">👤 ' + trx.direkodOleh + '</small></div>';
    html += '<div class="text-end"><span class="badge ' + badgeClass + ' fs-6">' + (isMasuk ? "+" : "-") + trx.kuantiti + '</span></div></div>';
  });
  content.innerHTML = html + '</div>';
}

function muatTurunCSV() {
  if (!globalTransactionsData.length) return Swal.fire('Tiada Data', 'Tiada rekod untuk dimuat turun', 'warning');
  var csvContent = "\uFEFFID Transaksi,Tarikh,ID Item,Nama Item,Jenis,Kuantiti,Oleh\n";
  globalTransactionsData.forEach(trx => {
    csvContent += `"${trx.transId}","${trx.tarikh}","${trx.itemId}","${trx.namaItem}","${trx.jenis}",${trx.kuantiti},"${trx.direkodOleh}"\n`;
  });
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Sejarah_Transaksi.csv";
  a.click();
}

function bukaBorang() {
  document.getElementById("view-dashboard").style.display = "none";
  document.getElementById("view-form").style.display = "block";
  var selectObj = document.getElementById("item_id");
  selectObj.innerHTML = '<option value="">-- Pilih Item --</option>';
  globalInventoryData.forEach(row => {
    selectObj.innerHTML += '<option value="' + row[0] + '">' + row[1] + ' (Stok Semasa: ' + row[3] + ')</option>';
  });
}

function tutupBorang() {
  document.getElementById("view-form").style.display = "none";
  document.getElementById("view-dashboard").style.display = "block";
  document.getElementById("transForm").reset();
}

function hantarData(e) {
  e.preventDefault();
  var btnSubmit = document.getElementById("btn-submit");
  btnSubmit.disabled = true;
  btnSubmit.innerText = "Menyimpan...";

  var payload = {
    item_id: document.getElementById("item_id").value,
    jenis_transaksi: document.querySelector('input[name="jenis_transaksi"]:checked').value,
    kuantiti: document.getElementById("kuantiti").value,
    direkod_oleh: localStorage.getItem("inventoryUserName")
  };

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    btnSubmit.disabled = false;
    btnSubmit.innerText = "Simpan Transaksi";
    if(res.success) {
      Swal.fire('Berjaya!', res.message, 'success');
      tutupBorang();
      muatDataStok();
    } else {
      Swal.fire('Ralat', res.message, 'error');
    }
  })
  .catch(err => {
    btnSubmit.disabled = false;
    btnSubmit.innerText = "Simpan Transaksi";
    Swal.fire('Ralat', 'Gagal membuat sambungan ke pelayan: ' + err.toString(), 'error');
  });
}
