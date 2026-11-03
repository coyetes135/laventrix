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
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbx1AM_U30E2Svq9QxJEi3x7yT1ZTwFbO70MXbexqSX9SU48hP4wfJqIFrXjBjzi0wnSrw/exec';
const OLD_API_URL = 'https://script.google.com/macros/s/AKfycbyQMz_NY0eUEpTvnBeXgyJivZSE9PyW3XXWpL00WiDsnjf_YJn7pwS6L9HA7s0wokB-xg/exec';
let stored = localStorage.getItem(API_KEY);
if (stored === OLD_API_URL) { stored = DEFAULT_API_URL; localStorage.setItem(API_KEY, DEFAULT_API_URL); }
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
