/**
 * BOSQUEE – Toko top up diamond Mobile Legends di dalam Google Spreadsheet
 *
 * File di proyek Apps Script ini ada 2:
 *   Code.gs     (file ini)
 *   index.html  (tampilan + JavaScript, sudah menyatu)
 * app.js hanya salinan JavaScript untuk dibaca, tidak perlu dimasukkan.
 */
const SHEET_NAME = 'Orders';
const NOTIFY_EMAIL = ''; // isi email untuk notifikasi pesanan baru, kosongkan jika tidak perlu

// Daftar harga resmi (harga dari browser tidak dipercaya)
const PRICES = {
  'Weekly Diamond Pass': 33500,
  '2X Weekly Diamond Pass': 64000,
  '5 Diamonds': 2000,
  '10 Diamonds': 4000,
  '14 Diamonds': 5000,
  '22 Diamonds': 7000,
  '59 Diamonds': 19000,
  '70 Diamonds': 22000,
  '112 Diamonds': 33000,
  '170 Diamonds': 52599,
  '277 Diamonds': 86789,
  '355 Diamonds': 109000
};
const METHODS = ['DANA', 'GOPAY', 'BCA', 'QRIS'];

// Menampilkan website saat link Web App dibuka
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BOSQUEE – Top Up Diamond Mobile Legends')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Dipanggil dari website lewat google.script.run
function saveOrder(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!d || !(d.item in PRICES) || METHODS.indexOf(d.method) < 0)
      return { ok: false, error: 'Item atau metode tidak valid' };
    if (!/^\d{5,}$/.test(String(d.id)) || !/^\d{3,5}$/.test(String(d.server)) || !d.nick || !d.hp)
      return { ok: false, error: 'Data akun tidak lengkap' };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Waktu', 'Order ID', 'ID', 'Server', 'Nick', 'No HP', 'Item', 'Harga', 'Metode', 'Status']);
      sh.setFrozenRows(1);
    }

    const price = PRICES[d.item];
    const orderId = safe(d.orderId) || 'BQ' + Date.now().toString(36).toUpperCase();
    sh.appendRow([
      new Date(), orderId, safe(d.id), safe(d.server),
      safe(d.nick), safe(d.hp), d.item, price, d.method, 'Menunggu cek bayar'
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(
        NOTIFY_EMAIL,
        'Order baru BOSQUEE ' + orderId,
        'Item: ' + d.item + '\nHarga: Rp ' + price + '\nMetode: ' + d.method +
        '\nID: ' + d.id + ' (' + d.server + ')\nNick: ' + d.nick + '\nHP: ' + d.hp
      );
    }
    return { ok: true, orderId: orderId };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

// Menu "BOSQUEE" di Spreadsheet untuk melihat link toko
function onOpen() {
  SpreadsheetApp.getUi().createMenu('BOSQUEE')
    .addItem('Lihat link toko', 'showLink')
    .addToUi();
}
function showLink() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Link toko:\n\n' + url : 'Belum di-deploy. Klik Deploy > New deployment > Web app.');
}

// Cegah formula injection di Sheet (=, +, -, @ di awal teks)
function safe(v) {
  v = String(v == null ? '' : v).slice(0, 100);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
