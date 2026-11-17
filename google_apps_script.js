/**
 * SatuWarga 04 - Backend Google Apps Script (Versi Revamp)
 * RT 04 / RW 14 Kelurahan Cisaranten Kulon Kecamatan Arcamanik Kota Bandung
 *
 * Petunjuk Instalasi Singkat:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda dengan nama "Database SatuWarga 04".
 * 2. Klik menu "Ekstensi" > "Apps Script".
 * 3. Hapus seluruh isi kode lama di Apps Script, lalu salin dan tempel seluruh kode di bawah ini.
 * 4. Jalankan fungsi `setupAwal()` satu kali dengan memilih `setupAwal` pada dropdown fungsi lalu klik "Jalankan" (Run).
 *    Berikan izin akses akun Google jika diminta.
 * 5. Klik tombol biru "Terapkan" (Deploy) di kanan atas > "Deployment Baru" (New Deployment).
 * 6. Pilih jenis: "Aplikasi Web" (Web App).
 *    - Deskripsi: Versi Revamp SatuWarga 04
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone) -> PENTING!
 * 7. Salin URL Aplikasi Web yang dihasilkan (berakhiran `/exec`), lalu tempelkan ke variabel `APP_URL` di file `app.js`.
 */

function setupAwal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: 'Users', headers: ['Username', 'Password', 'Role', 'NamaWarga'] },
    { name: 'Warga', headers: ['ID', 'Nama', 'NoRumah', 'Jiwa', 'Telp', 'Status', 'Istri', 'Anak', 'Ortu', 'Agama', 'Pekerjaan'] },
    { name: 'Kas', headers: ['ID', 'Tanggal', 'Tipe', 'Nominal', 'Keterangan'] },
    { name: 'Iuran', headers: ['ID', 'WargaID', 'Nama', 'Bulan', 'Nominal', 'Status', 'TglBayar'] },
    { name: 'Agenda', headers: ['ID', 'Judul', 'Tanggal', 'Jam', 'Lokasi', 'Info'] },
    { name: 'Surat', headers: ['ID', 'Nama', 'NIK', 'Alamat', 'Jenis', 'Keperluan', 'Status', 'Tanggal'] },
    { name: 'Aspirasi', headers: ['ID', 'Pelapor', 'Pesan', 'Status', 'Tanggal', 'Respon'] },
    { name: 'Config', headers: ['Key', 'Value'] },
    { name: 'Logs', headers: ['ID', 'Waktu', 'User', 'Role', 'Kategori', 'Pesan', 'Tipe'] },
    { name: 'Pembayaran', headers: ['ID', 'WargaID', 'Nama', 'NoRumah', 'BulanList', 'NominalIuran', 'KodeUnik', 'TotalBayar', 'Metode', 'Status', 'TglTransaksi', 'TglVerifikasi', 'Verifikator', 'NamaPengirim', 'Catatan'] }
  ];

  sheets.forEach(def => {
    let sheet = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    sheet.clear();
    sheet.appendRow(def.headers);
    sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#059669').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });

  // Akun Pengurus Default (Password Bawaan: 123)
  const userSheet = ss.getSheetByName('Users');
  userSheet.appendRow(['admin', '123', 'Administrator', 'Super Admin RT 04']);
  userSheet.appendRow(['ketua', '123', 'Ketua RT', 'Bambang Sudarsono']);
  userSheet.appendRow(['bendahara', '123', 'Bendahara RT', 'H. Ahmad Sobari']);
  userSheet.appendRow(['sekretaris', '123', 'Sekretaris RT', 'Siti Rahmawati']);
  userSheet.appendRow(['pengurus', '123', 'Pengurus RT', 'Dedi Kurniawan']);

  // Rekaman Saldo Awal Kas RT 04
  const kasSheet = ss.getSheetByName('Kas');
  const currentYear = new Date().getFullYear();
  kasSheet.appendRow(['KAS-0001', `${currentYear}-01-01`, 'masuk', 0, `Saldo Awal Kas RT 04 Tahun ${currentYear}`]);

  // Data Awal Konfigurasi RT 04
  const configSheet = ss.getSheetByName('Config');
  configSheet.appendRow(['tarifIuran', 75000]);
  configSheet.appendRow(['namaTtd', 'Bambang Sudarsono']);
  configSheet.appendRow(['jabatanTtd', 'Ketua RT 04 / RW 14']);
  configSheet.appendRow(['namaBendahara', 'H. Ahmad Sobari']);
  configSheet.appendRow(['jabatanBendahara', 'Bendahara RT 04 / RW 14']);
  configSheet.appendRow(['pgAktif', 'true']);
  configSheet.appendRow(['pgNamaBank', 'Bank Mandiri']);
  configSheet.appendRow(['pgNoRekening', '131-00-140414-9']);
  configSheet.appendRow(['pgAtasNama', 'KAS RT 04 CISKUL / H. AHMAD SOBARI']);
  configSheet.appendRow(['pgQrisMerchant', 'RT 04 RW 14 CISARANTEN KULON']);
  configSheet.appendRow(['pgQrisNmid', 'ID102604140001']);

  return "Setup Berhasil! Semua tabel database RT 04 telah terpasang dengan rapi.";
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Authenticate Login
    if (action === 'LOGIN') {
      const sheet = ss.getSheetByName('Users');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        const u = String(rows[i][0]).toLowerCase().trim();
        const p = String(rows[i][1]).trim();
        if (u === String(body.username).toLowerCase().trim() && p === String(body.password).trim()) {
          return createJsonResponse({
            status: 'success',
            user: { username: rows[i][0], role: rows[i][2], namaWarga: rows[i][3] }
          });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Username atau password tidak cocok!' });
    }

    // 2. Ubah Sandi Pengurus
    if (action === 'CHANGE_PASSWORD') {
      const sheet = ss.getSheetByName('Users');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase().trim() === String(body.username).toLowerCase().trim()) {
          if (String(rows[i][1]).trim() === String(body.oldPassword).trim()) {
            sheet.getRange(i + 1, 2).setValue(String(body.newPassword));
            return createJsonResponse({ status: 'success', message: 'Password berhasil diperbarui' });
          } else {
            return createJsonResponse({ status: 'error', message: 'Password lama salah!' });
          }
        }
      }
      return createJsonResponse({ status: 'error', message: 'Akun tidak ditemukan' });
    }

    // 3. Tambah Mutasi Kas
    if (action === 'ADD_KAS') {
      const sheet = ss.getSheetByName('Kas');
      const k = body.data;
      sheet.appendRow([k.id, k.tanggal, k.tipe, Number(k.nominal), k.keterangan]);
      return createJsonResponse({ status: 'success', message: 'Transaksi kas tersimpan' });
    }

    // 4. Tambah Warga (e-Sensus Mandiri / Input Pengurus)
    if (action === 'ADD_WARGA') {
      const sheet = ss.getSheetByName('Warga');
      const rows = sheet.getDataRange().getValues();
      const w = body.data;

      // Validasi nomor rumah: nama sama diperbolehkan (pembeda no rumah), no rumah sama ditolak
      const targetNoRumah = String(w.noRumah || '').toLowerCase().trim();
      for (let i = 1; i < rows.length; i++) {
        const existNoRumah = String(rows[i][2] || '').toLowerCase().trim();
        if (existNoRumah && existNoRumah === targetNoRumah) {
          return createJsonResponse({ status: 'error', message: 'Nomor rumah ' + w.noRumah + ' telah digunakan atas nama KK ' + rows[i][1] });
        }
      }

      sheet.appendRow([w.id, w.nama, w.noRumah, w.jiwa, String(w.telp || ''), w.status, w.istri || '-', w.anak || '-', w.ortu || '-', w.agama || 'Islam', w.pekerjaan || '-']);
      return createJsonResponse({ status: 'success', message: 'Data warga tersimpan' });
    }

    // 5. Update Warga
    if (action === 'UPDATE_WARGA') {
      const sheet = ss.getSheetByName('Warga');
      const rows = sheet.getDataRange().getValues();
      const w = body.data;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(w.id)) {
          sheet.getRange(i + 1, 2, 1, 10).setValues([[
            w.nama, w.noRumah, w.jiwa, String(w.telp || ''), w.status, w.istri || '-', w.anak || '-', w.ortu || '-', w.agama || 'Islam', w.pekerjaan || '-'
          ]]);
          return createJsonResponse({ status: 'success', message: 'Data warga berhasil diperbarui' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Data warga tidak ditemukan' });
    }

    // 6. Catat Iuran
    if (action === 'PAY_IURAN') {
      const sheet = ss.getSheetByName('Iuran');
      const i = body.data;
      // Gunakan petik tunggal di awal agar Google Sheets menyimpannya sebagai teks, bukan objek Date
      sheet.appendRow([i.id, i.wargaId, i.nama, "'" + i.bulan, Number(i.nominal), 'Lunas', i.tglBayar]);
      return createJsonResponse({ status: 'success', message: 'Iuran warga berhasil dicatat' });
    }

    // 7. Toggle Iuran
    if (action === 'TOGGLE_IURAN') {
      const sheet = ss.getSheetByName('Iuran');
      const rows = sheet.getDataRange().getValues();
      const item = body.data;
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      let found = false;

      for (let i = 1; i < rows.length; i++) {
        const rowNama = String(rows[i][2]).toLowerCase().trim();
        let rowBulan = rows[i][3];
        if (rowBulan instanceof Date) {
          rowBulan = months[rowBulan.getMonth()] + ' ' + rowBulan.getFullYear();
        }
        rowBulan = String(rowBulan).toLowerCase().trim();

        if (rowNama === String(item.nama).toLowerCase().trim() && rowBulan === String(item.bulan).toLowerCase().trim()) {
          sheet.getRange(i + 1, 6).setValue(item.status);
          sheet.getRange(i + 1, 7).setValue(item.status === 'Lunas' ? (item.tglBayar || new Date().toISOString().split('T')[0]) : '-');
          found = true;
          break;
        }
      }
      if (!found && item.status === 'Lunas') {
        sheet.appendRow([item.id || ('I' + Date.now().toString().slice(-4)), 'W99', item.nama, "'" + item.bulan, Number(item.nominal || 75000), 'Lunas', item.tglBayar || new Date().toISOString().split('T')[0]]);
      }
      return createJsonResponse({ status: 'success', message: 'Status iuran berhasil diperbarui' });
    }

    // 8. Hapus Data Warga
    if (action === 'DELETE_WARGA') {
      const sheet = ss.getSheetByName('Warga');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(body.data.id)) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'Data warga berhasil dihapus' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Data warga tidak ditemukan' });
    }

    // 9. Hapus Mutasi Kas
    if (action === 'DELETE_KAS') {
      const sheet = ss.getSheetByName('Kas');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(body.data.id)) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'Transaksi kas berhasil dihapus' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Transaksi kas tidak ditemukan' });
    }

    // 10. Reset Kas
    if (action === 'RESET_KAS') {
      const sheet = ss.getSheetByName('Kas');
      sheet.clearContents();
      sheet.appendRow(['ID', 'Tanggal', 'Tipe', 'Nominal', 'Keterangan']);
      const cYear = new Date().getFullYear();
      sheet.appendRow(['KAS-0001', `${cYear}-01-01`, 'masuk', 0, `Saldo Awal Kas RT 04 Tahun ${cYear}`]);
      return createJsonResponse({ status: 'success', message: 'Buku kas berhasil direset' });
    }

    // 11. Reset Iuran
    if (action === 'RESET_IURAN') {
      const sheet = ss.getSheetByName('Iuran');
      sheet.clearContents();
      sheet.appendRow(['ID', 'WargaID', 'Nama', 'Bulan', 'Nominal', 'Status', 'TglBayar']);
      return createJsonResponse({ status: 'success', message: 'Seluruh data iuran berhasil direset' });
    }

    // 12. Agenda CRUD
    if (action === 'ADD_AGENDA') {
      const sheet = ss.getSheetByName('Agenda');
      const a = body.data;
      sheet.appendRow([a.id, a.judul, a.tanggal, a.jam, a.lokasi, a.info]);
      return createJsonResponse({ status: 'success', message: 'Agenda baru berhasil disimpan' });
    }

    if (action === 'DELETE_AGENDA') {
      const sheet = ss.getSheetByName('Agenda');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(body.data.id)) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'Agenda berhasil dihapus' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Agenda tidak ditemukan' });
    }

    // 13. Surat Pengantar CRUD
    if (action === 'ADD_SURAT') {
      const sheet = ss.getSheetByName('Surat');
      const s = body.data;
      sheet.appendRow([s.id, s.nama, String(s.nik || ''), s.alamat, s.jenis, s.keperluan, s.status || 'Diproses', s.tgl]);
      return createJsonResponse({ status: 'success', message: 'Surat permohonan berhasil dicatat' });
    }

    if (action === 'UPDATE_SURAT') {
      const sheet = ss.getSheetByName('Surat');
      const rows = sheet.getDataRange().getValues();
      const s = body.data;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(s.id)) {
          sheet.getRange(i + 1, 2, 1, 6).setValues([[s.nama, String(s.nik || ''), s.alamat, s.jenis, s.keperluan, s.status]]);
          return createJsonResponse({ status: 'success', message: 'Surat berhasil diperbarui' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Surat tidak ditemukan' });
    }

    if (action === 'DELETE_SURAT') {
      const sheet = ss.getSheetByName('Surat');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(body.data.id)) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'Surat berhasil dihapus' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Surat tidak ditemukan' });
    }

    // 14. Aspirasi & Laporan Warga CRUD
    if (action === 'ADD_ASPIRASI') {
      const sheet = ss.getSheetByName('Aspirasi');
      const l = body.data;
      sheet.appendRow([l.id, l.pelapor, l.pesan, l.status || 'Menunggu', l.tgl, l.respon || '']);
      return createJsonResponse({ status: 'success', message: 'Laporan warga berhasil disimpan' });
    }

    if (action === 'UPDATE_ASPIRASI') {
      const sheet = ss.getSheetByName('Aspirasi');
      const rows = sheet.getDataRange().getValues();
      const l = body.data;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(l.id)) {
          sheet.getRange(i + 1, 4, 1, 3).setValues([[l.status, rows[i][4], l.respon || '']]);
          return createJsonResponse({ status: 'success', message: 'Laporan berhasil diperbarui' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Laporan tidak ditemukan' });
    }

    if (action === 'DELETE_ASPIRASI') {
      const sheet = ss.getSheetByName('Aspirasi');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(body.data.id)) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'Laporan berhasil dihapus' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Laporan tidak ditemukan' });
    }

    // 15. User Pengurus CRUD
    if (action === 'ADD_USER') {
      const sheet = ss.getSheetByName('Users');
      const u = body.data;
      sheet.appendRow([u.username, String(u.password), u.role, u.namaWarga]);
      return createJsonResponse({ status: 'success', message: 'Akun pengurus berhasil disimpan' });
    }

    if (action === 'DELETE_USER') {
      const sheet = ss.getSheetByName('Users');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase().trim() === String(body.data.username).toLowerCase().trim()) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'Akun pengurus berhasil dihapus' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Akun tidak ditemukan' });
    }

    // 16. Konfigurasi Sistem
    if (action === 'SAVE_CONFIG') {
      const sheet = ss.getSheetByName('Config');
      sheet.clearContents();
      sheet.appendRow(['Key', 'Value']);
      const conf = body.data;
      Object.keys(conf).forEach(k => {
        sheet.appendRow([k, String(conf[k])]);
      });
      return createJsonResponse({ status: 'success', message: 'Konfigurasi berhasil disimpan' });
    }

    // 17. Transaksi Pembayaran Mandiri (Self-Hosted Payment Gateway)
    if (action === 'SUBMIT_PEMBAYARAN') {
      const sheet = ss.getSheetByName('Pembayaran');
      const p = body.data;
      sheet.appendRow([
        p.id, p.wargaId, p.namaWarga, p.noRumah,
        Array.isArray(p.bulanList) ? p.bulanList.join(', ') : String(p.bulanList || ''),
        Number(p.nominalIuran || 0), Number(p.kodeUnik || 0), Number(p.totalBayar || 0),
        p.metode, p.status || 'Menunggu Verifikasi', p.tglTransaksi,
        p.tglVerifikasi || '-', p.verifikator || '-', p.namaPengirim || '-', p.catatan || '-'
      ]);
      return createJsonResponse({ status: 'success', message: 'Transaksi pembayaran mandiri berhasil dicatat' });
    }

    // 18. Verifikasi Pembayaran Masuk
    if (action === 'VERIFIKASI_PEMBAYARAN') {
      const sheet = ss.getSheetByName('Pembayaran');
      const rows = sheet.getDataRange().getValues();
      const p = body.data;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(p.id)) {
          sheet.getRange(i + 1, 10).setValue('Lunas');
          sheet.getRange(i + 1, 12).setValue(p.tglVerifikasi || new Date().toISOString().split('T')[0]);
          sheet.getRange(i + 1, 13).setValue(p.verifikator || 'Pengurus RT');
          return createJsonResponse({ status: 'success', message: 'Pembayaran berhasil diverifikasi' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Data pembayaran tidak ditemukan' });
    }

    // 19. Tolak Pembayaran
    if (action === 'TOLAK_PEMBAYARAN') {
      const sheet = ss.getSheetByName('Pembayaran');
      const rows = sheet.getDataRange().getValues();
      const p = body.data;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(p.id)) {
          sheet.getRange(i + 1, 10).setValue('Ditolak');
          sheet.getRange(i + 1, 15).setValue(p.catatan || 'Ditolak oleh pengurus');
          return createJsonResponse({ status: 'success', message: 'Pembayaran berhasil ditolak' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Data pembayaran tidak ditemukan' });
    }

    // 20. Hapus Riwayat & Status Tagihan Pembayaran
    if (action === 'DELETE_PEMBAYARAN') {
      const p = body.data;
      const invoiceId = String(p.id);

      // A. Hapus baris dari sheet Pembayaran
      const paySheet = ss.getSheetByName('Pembayaran');
      if (paySheet) {
        const payRows = paySheet.getDataRange().getValues();
        for (let i = 1; i < payRows.length; i++) {
          if (String(payRows[i][0]) === invoiceId) {
            paySheet.deleteRow(i + 1);
            break;
          }
        }
      }

      // B. Jika transaksi berstatus Lunas, reset status tagihan di sheet Iuran & hapus mutasi kas
      if (p.status === 'Lunas') {
        const bulanArr = Array.isArray(p.bulanList) 
          ? p.bulanList 
          : (typeof p.bulanList === 'string' ? p.bulanList.split(',').map(s => s.trim()).filter(Boolean) : []);

        const iuranSheet = ss.getSheetByName('Iuran');
        if (iuranSheet && bulanArr.length > 0) {
          const iuranRows = iuranSheet.getDataRange().getValues();
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

          bulanArr.forEach(bulanTarget => {
            const bTarget = String(bulanTarget).toLowerCase().trim();
            for (let i = 1; i < iuranRows.length; i++) {
              const rowNama = String(iuranRows[i][2]).toLowerCase().trim();
              let rowBulan = iuranRows[i][3];
              if (rowBulan instanceof Date) {
                rowBulan = months[rowBulan.getMonth()] + ' ' + rowBulan.getFullYear();
              }
              rowBulan = String(rowBulan).toLowerCase().trim();

              if (rowNama === String(p.namaWarga).toLowerCase().trim() && rowBulan === bTarget) {
                iuranSheet.getRange(i + 1, 6).setValue('Belum Lunas');
                iuranSheet.getRange(i + 1, 7).setValue('-');
                break;
              }
            }
          });
        }

        const kasSheet = ss.getSheetByName('Kas');
        if (kasSheet) {
          const kasRows = kasSheet.getDataRange().getValues();
          for (let i = 1; i < kasRows.length; i++) {
            const ket = String(kasRows[i][4]);
            if (ket.indexOf(invoiceId) !== -1) {
              kasSheet.deleteRow(i + 1);
              break;
            }
          }
        }
      }

      return createJsonResponse({ status: 'success', message: 'Riwayat pembayaran dan status tagihan berhasil dihapus/direset' });
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenali' });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = {};
    const sheetNames = ['Users', 'Warga', 'Kas', 'Iuran', 'Agenda', 'Surat', 'Aspirasi', 'Config', 'Logs', 'Pembayaran'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    sheetNames.forEach(name => {
      const s = ss.getSheetByName(name);
      if (s) {
        const data = s.getDataRange().getValues();
        const headers = data[0] || [];
        const rows = data.slice(1).map(r => {
          const obj = {};
          headers.forEach((h, idx) => {
            let val = r[idx];
            if (val instanceof Date) {
              if (name === 'Iuran' && h === 'Bulan') {
                val = months[val.getMonth()] + ' ' + val.getFullYear();
              } else {
                val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
              }
            }
            obj[h] = val;
          });
          return obj;
        });
        result[name.toLowerCase()] = rows;
      }
    });

    return createJsonResponse({ status: 'success', data: result });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.message });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
