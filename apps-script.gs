// Google Apps Script — backend para Laventrix (guardar en Google Sheets)
// 1) Crea una Google Sheet nueva.
// 2) Extensiones → Apps Script → pega este código → Guardar.
// 3) Implementar → Nueva implementación → Tipo: Aplicación web
//    - Ejecutar como: Yo
//    - Quién tiene acceso: Cualquiera
//    - Copia la URL (termina en /exec) y pégala en la página (sección "Base de datos").

const SHEET_ID = ''; // opcional: ID de la hoja; si vacío usa la activa

function getSS() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name, headers) {
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'track' && p.code) {
    const sh = getSheet('Prendas', ['Codigo','Estado','Casillero','Trabajador','Fecha']);
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === String(p.code).toUpperCase()) {
        return json({ found: true, state: rows[i][1], locker: rows[i][2], worker: rows[i][3], updated: rows[i][4] });
      }
    }
    return json({ found: false });
  }
  return json({ ok: true, msg: 'Laventrix API' });
}

function doPost(e) {
  let data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }
  if (data.type === 'contact') {
    const sh = getSheet('Mensajes', ['Fecha','Nombre','Empresa','Email','Mensaje']);
    sh.appendRow([data.date || new Date(), data.name, data.company, data.email, data.msg]);
    return json({ ok: true });
  }
  if (data.type === 'garment') {
    const sh = getSheet('Prendas', ['Codigo','Estado','Casillero','Trabajador','Fecha']);
    sh.appendRow([data.code, data.state, data.locker, data.worker, data.date || new Date()]);
    return json({ ok: true });
  }
  return json({ ok: false, error: 'tipo desconocido' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}