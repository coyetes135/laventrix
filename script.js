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
  const plan = document.getElementById('qPlan').value;
  if (!workers || !pieces) { showToast('Completa los campos'); return; }
  const perPiece = plan === 'flex' ? 1800 : 1500; // CLP estimado
  const monthlyPieces = workers * pieces * 4;
  const price = monthlyPieces * perPiece;
  document.getElementById('rPieces').textContent = monthlyPieces.toLocaleString('es-CL');
  document.getElementById('rPrice').textContent = '$' + price.toLocaleString('es-CL') + ' CLP';
  document.getElementById('quoteResult').classList.remove('hidden');
});

// Contact form
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cName').value.trim();
  const company = document.getElementById('cCompany').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const msg = document.getElementById('cMsg').value.trim();
  if (!name || !company || !email) { showToast('Completa los campos obligatorios'); return; }
  const messages = JSON.parse(localStorage.getItem('laventrix_msgs') || '[]');
  messages.push({ name, company, email, msg, date: new Date().toISOString() });
  localStorage.setItem('laventrix_msgs', JSON.stringify(messages));
  document.getElementById('contactStatus').textContent = 'Mensaje guardado. Te contactaremos pronto.';
  contactForm.reset();
  showToast('Mensaje enviado ✓');
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
// Tracker demo
const demoGarments = {
  'A-0421': { state: 'Limpia', locker: '12', worker: 'Juan P.', date: 'Hoy 09:14' },
  'B-1180': { state: 'En lavado', locker: '07', worker: 'María R.', date: 'Ayer 18:22' },
  'C-0903': { state: 'Retirada', locker: '03', worker: 'Pedro S.', date: 'Hoy 07:05' }
};
const trackForm = document.getElementById('trackForm');
trackForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('tCode').value.trim().toUpperCase();
  const res = document.getElementById('trackResult');
  const g = demoGarments[code];
  if (!g) {
    res.innerHTML = '<p class="muted">Código no encontrado. Prueba A-0421, B-1180 o C-0903.</p>';
    res.classList.remove('hidden');
    return;
  }
  res.innerHTML = `
    <div class="card-row"><span class="dot green"></span> Estado: <strong>${g.state}</strong></div>
    <div class="card-row">Casillero: ${g.locker}</div>
    <div class="card-row">Trabajador: ${g.worker}</div>
    <div class="card-row muted">Última actualización: ${g.date}</div>
  `;
  res.classList.remove('hidden');
});

document.querySelectorAll('.card, .step, .section-head').forEach(el => observer.observe(el));
