// Service worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

// Nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// Header shadow on scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) header.classList.add('scrolled'); else header.classList.remove('scrolled');
});

// Toast
const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add('hidden'), 3200);
}

// Cotizador
const quoteForm = document.getElementById('quoteForm');
quoteForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const workers = +document.getElementById('qWorkers').value;
  const pieces = +document.getElementById('qPieces').value;
  const weeks = +document.getElementById('qWeeks').value;
  const plan = document.getElementById('qPlan').value;
  if (!workers || !pieces || !weeks) { showToast('Completa todos los campos'); return; }
  const perPiece = plan === 'flex' ? 1800 : 1500; // CLP estimado por prenda
  const weeklyPieces = workers * pieces;
  const monthlyPieces = weeklyPieces * weeks;
  const price = monthlyPieces * perPiece;
  document.getElementById('rWeekly').textContent = weeklyPieces.toLocaleString('es-CL') + ' prendas';
  document.getElementById('rPieces').textContent = monthlyPieces.toLocaleString('es-CL') + ' prendas';
  document.getElementById('rUnit').textContent = '$' + perPiece.toLocaleString('es-CL') + ' CLP';
  document.getElementById('rPrice').textContent = '$' + price.toLocaleString('es-CL') + ' CLP';
  document.getElementById('quoteResult').classList.remove('hidden');
});

// --- Integración con Google Sheets (Excel online) ---
const API_KEY = 'laventrix_api_url';
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxoyPH11LeBietRfV_0Qy4TUK6FbSXvPKDYPqMSKrGyQ3kMhxgVVHIxbT-GadKUpxzD/exec';
const OLD_API_URLS = [
  'https://script.google.com/macros/s/AKfycbyQMz_NY0eUEpTvnBeXgyJivZSE9PyW3XXWpL00WiDsnjf_YJn7pwS6L9HA7s0wokB-xg/exec',
  'https://script.google.com/macros/s/AKfycbx1AM_U30E2Svq9QxJEi3x7yT1ZTwFbO70MXbexqSX9SU48hP4wfJqIFrXjBjzi0wnSrw/exec'
];
let stored = localStorage.getItem(API_KEY);
if (stored && OLD_API_URLS.includes(stored)) { stored = DEFAULT_API_URL; localStorage.setItem(API_KEY, DEFAULT_API_URL); }
let API_URL = stored || DEFAULT_API_URL;
if (!localStorage.getItem(API_KEY)) localStorage.setItem(API_KEY, DEFAULT_API_URL);

function apiUrl() { return API_URL; }
function setApiStatus() {
  const el = document.getElementById('apiStatus');
  if (!el) return;
  if (API_URL) {
    el.textContent = 'Conectado: ' + API_URL;
    el.style.color = '#22c55e';
  } else {
    el.textContent = 'Sin conexión configurada — se usa almacenamiento local del navegador.';
    el.style.color = '';
  }
}
setApiStatus();
const apiUrlInput = document.getElementById('apiUrl');
if (apiUrlInput && API_URL) apiUrlInput.value = API_URL;

const apiForm = document.getElementById('apiForm');
apiForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = document.getElementById('apiUrl').value.trim();
  if (!v) { showToast('Ingresa una URL válida'); return; }
  API_URL = v;
  localStorage.setItem(API_KEY, v);
  setApiStatus();
  showToast('Conexión guardada ✓');
});

// Contact form
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('cName').value.trim();
  const company = document.getElementById('cCompany').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const msg = document.getElementById('cMsg').value.trim();
  if (!name || !company || !email) { showToast('Completa los campos obligatorios'); return; }
  const payload = { type: 'contact', name, company, email, msg, date: new Date().toISOString() };
  if (API_URL) {
    try {
      await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('contactStatus').textContent = 'Mensaje enviado a la hoja de cálculo.';
      contactForm.reset();
      showToast('Mensaje enviado ✓');
      return;
    } catch (err) {
      console.error(err);
    }
  }
  const messages = JSON.parse(localStorage.getItem('laventrix_msgs') || '[]');
  messages.push(payload);
  localStorage.setItem('laventrix_msgs', JSON.stringify(messages));
  document.getElementById('contactStatus').textContent = 'Mensaje guardado localmente (sin conexión).';
  contactForm.reset();
  showToast('Mensaje guardado localmente');
});

// --- Admin / login (multi-usuario) ---
const SESSION_KEY = 'laventrix_session';
const USERS_KEY = 'laventrix_users';
const DEFAULT_USERS = [{ user: 'admin', pass: 'laventrix123' }];

function getUsers() {
  try {
    const u = JSON.parse(localStorage.getItem(USERS_KEY));
    if (Array.isArray(u) && u.length) return u;
  } catch (e) {}
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return [...DEFAULT_USERS];
}
function saveUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1'; }
function currentUser() { return sessionStorage.getItem('laventrix_user') || ''; }

async function validateLogin(user, pass) {
  if (API_URL) {
    try {
      const r = await fetch(API_URL + '?action=login&user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass));
      const d = await r.json();
      if (d && d.ok) return true;
    } catch (e) { console.error(e); }
  }
  return getUsers().some(u => u.user === user && u.pass === pass);
}

function updateAdminUI() {
  const loginPanel = document.getElementById('loginPanel');
  const adminPanel = document.getElementById('adminPanel');
  const sessionUser = document.getElementById('sessionUser');
  if (isLoggedIn()) {
    loginPanel?.classList.add('hidden');
    adminPanel?.classList.remove('hidden');
    if (sessionUser) sessionUser.textContent = 'Sesión: ' + currentUser();
    renderGarments();
    renderAdminUsers();
  } else {
    loginPanel?.classList.remove('hidden');
    adminPanel?.classList.add('hidden');
  }
}
updateAdminUI();

const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = document.getElementById('lUser').value.trim();
  const p = document.getElementById('lPass').value;
  const ok = await validateLogin(u, p);
  if (ok) {
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.setItem('laventrix_user', u);
    showToast('Sesión iniciada ✓');
    updateAdminUI();
  } else {
    showToast('Credenciales incorrectas');
  }
});

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('laventrix_user');
  showToast('Sesión cerrada');
  updateAdminUI();
});

// Gestión de administradores
function renderAdminUsers() {
  const el = document.getElementById('adminUserList');
  if (!el) return;
  const list = getUsers();
  const me = currentUser();
  el.innerHTML = list.map((u, i) => `
    <div class="card-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <span><strong>${u.user}</strong>${u.user === me ? ' (tú)' : ''}</span>
      <button class="btn btn-ghost btn-sm" data-deluser="${i}" ${list.length <= 1 ? 'disabled' : ''}>Eliminar</button>
    </div>
  `).join('');
  el.querySelectorAll('[data-deluser]').forEach(b => b.addEventListener('click', async () => {
    const idx = +b.getAttribute('data-deluser');
    const list = getUsers();
    const target = list[idx];
    if (list.length <= 1) { showToast('Debe quedar al menos un administrador'); return; }
    if (target.user === currentUser()) { showToast('No puedes eliminarte a ti mismo'); return; }
    if (API_URL) {
      try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'deleteUser', user: target.user }) }); } catch (e) { console.error(e); }
    }
    list.splice(idx, 1);
    saveUsers(list);
    renderAdminUsers();
    showToast('Administrador eliminado');
  }));
}

const adminUserForm = document.getElementById('adminUserForm');
adminUserForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isLoggedIn()) { showToast('Debes iniciar sesión'); return; }
  const u = document.getElementById('auUser').value.trim();
  const p = document.getElementById('auPass').value;
  if (!u || !p) { showToast('Completa los campos'); return; }
  const list = getUsers();
  if (list.some(x => x.user === u)) { showToast('Ese usuario ya existe'); return; }
  list.push({ user: u, pass: p });
  saveUsers(list);
  if (API_URL) {
    try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'user', user: u, pass: p }) }); } catch (e) { console.error(e); }
  }
  renderAdminUsers();
  adminUserForm.reset();
  showToast('Administrador añadido ✓');
});

// Garments storage
function getGarments() {
  return JSON.parse(localStorage.getItem('laventrix_garments') || '[]');
}
function saveGarments(list) {
  localStorage.setItem('laventrix_garments', JSON.stringify(list));
}
function renderGarments() {
  const el = document.getElementById('garmentList');
  if (!el) return;
  const list = getGarments();
  if (!list.length) { el.innerHTML = '<p class="muted">No hay prendas registradas aún.</p>'; return; }
  el.innerHTML = list.map((g, i) => `
    <div class="card-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <span><strong>${g.code}</strong> — ${g.state} · Casillero ${g.locker || '-'} · ${g.worker || '-'}</span>
      <button class="btn btn-ghost btn-sm" data-del="${i}">Eliminar</button>
    </div>
  `).join('');
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const idx = +b.getAttribute('data-del');
    const l = getGarments(); l.splice(idx, 1); saveGarments(l); renderGarments();
    showToast('Prenda eliminada');
  }));
}

const garmentForm = document.getElementById('garmentForm');
garmentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isLoggedIn()) { showToast('Debes iniciar sesión'); return; }
  const code = document.getElementById('gCode').value.trim().toUpperCase();
  const state = document.getElementById('gState').value;
  const locker = document.getElementById('gLocker').value.trim();
  const worker = document.getElementById('gWorker').value.trim();
  if (!code) { showToast('Ingresa un código'); return; }
  const g = { code, state, locker, worker, date: new Date().toISOString() };
  const list = getGarments();
  list.unshift(g);
  saveGarments(list);
  if (API_URL) {
    try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'garment', code, state, locker, worker, date: g.date }) }); }
    catch (err) { console.error(err); }
  }
  renderGarments();
  garmentForm.reset();
  showToast('Prenda guardada ✓');
});

// --- Generador de QR para trabajadores ---
const WORKERS_KEY = 'laventrix_workers';
function getWorkers() { return JSON.parse(localStorage.getItem(WORKERS_KEY) || '[]'); }
function saveWorkers(list) { localStorage.setItem(WORKERS_KEY, JSON.stringify(list)); }

let currentWorker = null;
let currentQrCanvas = null;

function encodeWorker(w) { return btoa(unescape(encodeURIComponent(JSON.stringify(w)))); }
function decodeWorker(str) { return JSON.parse(decodeURIComponent(escape(atob(str)))); }

function workerCardUrl(w) {
  return location.origin + location.pathname + '#worker=' + encodeWorker(w);
}

function generateQR(w) {
  const box = document.getElementById('qrBox');
  const empty = document.getElementById('qrEmpty');
  const qrcodeEl = document.getElementById('qrcode');
  qrcodeEl.innerHTML = '';
  currentWorker = w;
  const url = workerCardUrl(w);
  new QRCode(qrcodeEl, { text: url, width: 200, height: 200, colorDark: '#1e1b4b', colorLight: '#ffffff' });
  setTimeout(() => {
    currentQrCanvas = qrcodeEl.querySelector('canvas');
    if (!currentQrCanvas) {
      const img = qrcodeEl.querySelector('img');
      if (img) {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        currentQrCanvas = c;
      }
    }
  }, 100);
  document.getElementById('qrData').textContent = w.name + ' · ' + w.company + ' · ' + w.date;
  empty.classList.add('hidden');
  box.classList.remove('hidden');
}

function renderWorkers() {
  const el = document.getElementById('workerList');
  if (!el) return;
  const list = getWorkers();
  if (!list.length) { el.innerHTML = '<p class="muted">No hay trabajadores con QR aún.</p>'; return; }
  el.innerHTML = list.map((w, i) => `
    <div class="card-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <span><strong>${w.name}</strong> — ${w.company} · ${w.date}${w.code ? ' · ' + w.code : ''}</span>
      <span style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" data-view="${i}">Ver QR</button>
        <button class="btn btn-ghost btn-sm" data-delw="${i}">Eliminar</button>
      </span>
    </div>
  `).join('');
  el.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    const idx = +b.getAttribute('data-view');
    generateQR(getWorkers()[idx]);
    document.getElementById('qr').scrollIntoView({ behavior: 'smooth' });
  }));
  el.querySelectorAll('[data-delw]').forEach(b => b.addEventListener('click', () => {
    const idx = +b.getAttribute('data-delw');
    const l = getWorkers(); l.splice(idx, 1); saveWorkers(l); renderWorkers();
    showToast('Trabajador eliminado');
  }));
}

const workerForm = document.getElementById('workerForm');
workerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const w = {
    id: Date.now(),
    name: document.getElementById('wName').value.trim(),
    date: document.getElementById('wDate').value,
    company: document.getElementById('wCompany').value.trim(),
    code: document.getElementById('wCode').value.trim().toUpperCase(),
    locker: document.getElementById('wLocker').value.trim(),
    createdAt: new Date().toISOString()
  };
  if (!w.name || !w.date || !w.company) { showToast('Completa los campos obligatorios'); return; }
  const list = getWorkers();
  list.unshift(w);
  saveWorkers(list);
  if (API_URL) {
    try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'worker', name: w.name, date: w.date, company: w.company, code: w.code, locker: w.locker, createdAt: w.createdAt }) }); }
    catch (err) { console.error(err); }
  }
  renderWorkers();
  generateQR(w);
  workerForm.reset();
  showToast('QR generado ✓');
});

document.getElementById('qrDownload')?.addEventListener('click', () => {
  if (!currentQrCanvas) { showToast('Genera un QR primero'); return; }
  const a = document.createElement('a');
  a.href = currentQrCanvas.toDataURL('image/png');
  a.download = 'qr-' + (currentWorker ? currentWorker.name.replace(/\s+/g,'-') : 'trabajador') + '.png';
  a.click();
});

document.getElementById('qrPrint')?.addEventListener('click', () => {
  if (!currentWorker || !currentQrCanvas) { showToast('Genera un QR primero'); return; }
  const img = currentQrCanvas.toDataURL('image/png');
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>QR Trabajador</title>
    <style>body{font-family:Inter,Arial,sans-serif;text-align:center;padding:40px;color:#111}h1{margin:0 0 4px}p{margin:2px 0;color:#555}.card{border:1px solid #ddd;border-radius:16px;padding:24px;display:inline-block}img{margin:16px 0}</style>
    </head><body>
    <div class="card">
      <h1>${currentWorker.name}</h1>
      <p>${currentWorker.company}</p>
      <img src="${img}" width="220" height="220" />
      <p><strong>Fecha de ingreso:</strong> ${currentWorker.date}</p>
      ${currentWorker.code ? `<p><strong>Código de prenda:</strong> ${currentWorker.code}</p>` : ''}
      ${currentWorker.locker ? `<p><strong>Casillero:</strong> ${currentWorker.locker}</p>` : ''}
      <p style="margin-top:12px;font-size:12px;color:#999;">Laventrix · Servicio de Lavandería Industrial B2B</p>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>
  `);
  w.document.close();
});

document.getElementById('qrNew')?.addEventListener('click', () => {
  document.getElementById('qrBox').classList.add('hidden');
  document.getElementById('qrEmpty').classList.remove('hidden');
  currentWorker = null;
  currentQrCanvas = null;
});

// Vista de tarjeta al abrir un QR
function showWorkerCard(w) {
  document.getElementById('cardName').textContent = w.name || '—';
  document.getElementById('cardCompany').textContent = w.company || '';
  document.getElementById('cardDate').textContent = w.date || '—';
  document.getElementById('cardCode').textContent = w.code || '—';
  document.getElementById('cardLocker').textContent = w.locker || '—';
  document.getElementById('workerCardModal').classList.remove('hidden');
}
document.getElementById('closeCardModal')?.addEventListener('click', () => {
  document.getElementById('workerCardModal').classList.add('hidden');
  if (location.hash.startsWith('#worker=')) history.replaceState(null, '', location.pathname);
});
document.getElementById('workerCardModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'workerCardModal') {
    document.getElementById('workerCardModal').classList.add('hidden');
    if (location.hash.startsWith('#worker=')) history.replaceState(null, '', location.pathname);
  }
});

function checkWorkerHash() {
  const hash = location.hash;
  if (hash.startsWith('#worker=')) {
    try { showWorkerCard(decodeWorker(hash.slice(8))); } catch (e) { console.error(e); }
  }
}
window.addEventListener('hashchange', checkWorkerHash);
checkWorkerHash();

renderWorkers();

// Scroll reveal (simple)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('reveal');
      observer.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });
// Tracker
const demoGarments = {
  'A-0421': { state: 'Limpia', locker: '12', worker: 'Juan P.', date: 'Hoy 09:14' },
  'B-1180': { state: 'En lavado', locker: '07', worker: 'María R.', date: 'Ayer 18:22' },
  'C-0903': { state: 'Retirada', locker: '03', worker: 'Pedro S.', date: 'Hoy 07:05' }
};
const trackForm = document.getElementById('trackForm');
trackForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('tCode').value.trim().toUpperCase();
  const res = document.getElementById('trackResult');
  let g = null;
  if (API_URL) {
    try {
      const r = await fetch(API_URL + '?action=track&code=' + encodeURIComponent(code));
      const data = await r.json();
      if (data && data.found) g = data;
    } catch (err) { console.error(err); }
  }
  if (!g) g = demoGarments[code];
  if (!g) {
    const local = getGarments().find(x => x.code === code);
    if (local) g = { state: local.state, locker: local.locker, worker: local.worker, date: local.date };
  }
  if (!g) {
    res.innerHTML = '<p class="muted">Código no encontrado. Prueba A-0421, B-1180 o C-0903.</p>';
    res.classList.remove('hidden');
    return;
  }
  res.innerHTML = `
    <div class="card-row"><span class="dot green"></span> Estado: <strong>${g.state}</strong></div>
    <div class="card-row">Casillero: ${g.locker}</div>
    <div class="card-row">Trabajador: ${g.worker}</div>
    <div class="card-row muted">Última actualización: ${g.date || g.updated}</div>
  `;
  res.classList.remove('hidden');
});

document.querySelectorAll('.card, .step, .section-head').forEach(el => observer.observe(el));
