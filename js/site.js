/* Arcane Designer site script. Small and dependency-free. */

/* ---- Settings Nathan fills in once accounts exist ---- */
const SITE = {
  email: 'hello@arcanedesigner.com',        // shown on Contact; set up via Google Workspace
  forms: {
    contact: '',        // Formspree endpoint, e.g. https://formspree.io/f/xxxxxxx
    questionnaire: '',  // Formspree endpoint for the client questionnaire
  },
};

/* Reviews. Add real ones here; the section on the home page appears once there is at least one.
   { quote, name, role, initials, stars (1-5), work: 'slug of a Work page item, optional' } */
const REVIEWS = [];

document.documentElement.classList.remove('no-js');

/* ---- header: shadow on scroll, mobile menu ---- */
(() => {
  const head = document.querySelector('.site-head');
  if (head) {
    const on = () => head.classList.toggle('scrolled', window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
  }
  const btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  }
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();

/* ---- hexagon clusters (decoration drawn from the logo's honeycomb) ---- */
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  // one shared set of gradients
  if (!document.getElementById('hex-defs')) {
    const defs = document.createElementNS(ns, 'svg');
    defs.id = 'hex-defs'; defs.setAttribute('aria-hidden', 'true');
    defs.style.cssText = 'position:absolute;width:0;height:0';
    defs.innerHTML = `<defs>
      <linearGradient id="g-teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0be3a9"/><stop offset="1" stop-color="#07c493"/></linearGradient>
      <linearGradient id="g-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7aa0"/><stop offset="1" stop-color="#d9557a"/></linearGradient>
      <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d6f93"/><stop offset="1" stop-color="#2a97c6"/></linearGradient></defs>`;
    document.body.prepend(defs);
  }
  const cells = {
    // [col,row,color] on a pointy-top hex grid; odd rows are offset
    a: [[1,0,'pink'],[2,0,'line'],[0,1,'teal'],[1,1,'blue'],[2,1,'teal'],[1,2,'pink'],[2,2,'blue'],[3,2,'line'],[2,3,'teal']],
    b: [[0,0,'teal'],[1,0,'line'],[0,1,'pink'],[1,1,'teal'],[1,2,'blue'],[0,2,'line'],[1,3,'pink']],
    c: [[1,0,'blue'],[0,1,'line'],[1,1,'pink'],[2,1,'teal'],[1,2,'teal'],[2,2,'line']],
  };
  const R = 50, W = Math.sqrt(3) * R;
  const pts = (cx, cy) => [0,1,2,3,4,5].map(i => { const a = Math.PI / 180 * (60 * i - 90); return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
  document.querySelectorAll('.hexes[data-set]').forEach((el) => {
    const set = cells[el.dataset.set] || cells.a;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    let maxX = 0, maxY = 0;
    set.forEach(([c, r, col]) => {
      const cx = W / 2 + 4 + c * W + (r % 2 ? W / 2 : 0), cy = R + 4 + r * R * 1.5;
      const p = document.createElementNS(ns, 'polygon');
      p.setAttribute('points', pts(cx, cy)); p.setAttribute('class', 'hx-' + col);
      svg.appendChild(p);
      maxX = Math.max(maxX, cx + W / 2 + 4); maxY = Math.max(maxY, cy + R + 4);
    });
    svg.setAttribute('viewBox', `0 0 ${maxX.toFixed(0)} ${maxY.toFixed(0)}`);
    el.appendChild(svg);
  });
})();

/* ---- before/after sliders ---- */
document.querySelectorAll('.compare').forEach((box) => {
  const input = box.querySelector('input');
  if (!input) return;
  const set = (v) => box.style.setProperty('--pos', v + '%');
  set(input.value);
  input.addEventListener('input', () => set(input.value));
  // when it scrolls into view, sweep from the old site to the new one
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]static\b/.test(location.search)) {
    const end = +input.value, from = 88;
    set(from);
    const io = new IntersectionObserver((ents) => {
      if (!ents[0].isIntersecting) return;
      io.disconnect();
      let touched = false;
      input.addEventListener('pointerdown', () => { touched = true; }, { once: true });
      setTimeout(() => {
        const start = performance.now();
        const tick = (t) => {
          if (touched) return;
          const k = Math.min(1, (t - start) / 1600), e = 1 - Math.pow(1 - k, 3);
          set(from + (end - from) * e); if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 500);
    }, { threshold: .55 });
    io.observe(box);
  }
});

/* ---- reviews carousel ---- */
(() => {
  const host = document.querySelector('[data-reviews]');
  if (!host) return;
  let list = REVIEWS;
  // Preview only: ?demo-reviews shows placeholder reviews so the layout can be judged.
  if (!list.length && /[?&]demo-reviews\b/.test(location.search)) {
    list = [
      { quote: 'Placeholder review. A real client quote goes here once someone has worked with Nathan.', name: 'Client name', role: 'Business, Spokane', initials: 'CN', stars: 5 },
      { quote: 'Second placeholder, to show how the carousel moves between reviews.', name: 'Another client', role: 'Business, Spokane Valley', initials: 'AC', stars: 5 },
    ];
  }
  if (!list.length) return;
  const section = host.closest('section'); if (section) section.hidden = false;
  const stage = host.querySelector('.review-stage'), dots = host.querySelector('.dots');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  list.forEach((r, i) => {
    const el = document.createElement('figure');
    el.className = 'review'; el.hidden = i > 0; el.setAttribute('aria-roledescription', 'slide'); el.setAttribute('aria-label', `${i + 1} of ${list.length}`);
    el.innerHTML = `<div class="stars" aria-label="${r.stars || 5} out of 5 stars">${'★'.repeat(r.stars || 5)}</div>
      <blockquote>${esc(r.quote)}</blockquote>
      <figcaption class="who"><span class="av" aria-hidden="true">${esc(r.initials || r.name[0])}</span><span><b>${esc(r.name)}</b><span>${esc(r.role || '')}</span></span></figcaption>`;
    stage.appendChild(el);
    const d = document.createElement('button');
    d.type = 'button'; d.setAttribute('aria-label', `Show review ${i + 1}`);
    d.addEventListener('click', () => { go(i); restart(); });
    dots.appendChild(d);
  });
  const slides = [...stage.querySelectorAll('.review')], dotBtns = [...dots.children];
  let cur = 0, timer = null;
  const go = (i) => {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.hidden = k !== cur; });
    dotBtns.forEach((d, k) => d.setAttribute('aria-current', String(k === cur)));
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restart = () => { clearInterval(timer); if (!reduce && slides.length > 1) timer = setInterval(() => go(cur + 1), 7000); };
  host.querySelector('.prev').addEventListener('click', () => { go(cur - 1); restart(); });
  host.querySelector('.next').addEventListener('click', () => { go(cur + 1); restart(); });
  host.addEventListener('mouseenter', () => clearInterval(timer));
  host.addEventListener('mouseleave', restart);
  host.addEventListener('focusin', () => clearInterval(timer));
  if (slides.length < 2) host.querySelector('.review-ctrls').hidden = true;
  go(0); restart();
})();

/* ---- reveal on scroll ---- */
(() => {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || /[?&]static\b/.test(location.search)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
})();

/* ---- email shown as text with a copy button ---- */
document.querySelectorAll('[data-email]').forEach((el) => {
  el.textContent = SITE.email;
  const btn = el.parentElement.querySelector('button[data-copy]');
  if (btn) btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SITE.email); btn.textContent = 'Copied'; }
    catch { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
});

/* ---- forms ---- */
document.querySelectorAll('form[data-form]').forEach((form) => {
  const kind = form.dataset.form, status = form.querySelector('.form-status');
  const draftKey = 'ad-draft-' + kind;
  // keep an unsent draft in this browser (questionnaire is long)
  if (form.hasAttribute('data-draft')) {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || '{}');
      Object.entries(saved).forEach(([k, v]) => {
        form.querySelectorAll(`[name="${CSS.escape(k)}"]`).forEach((f) => {
          if (f.type === 'checkbox' || f.type === 'radio') f.checked = [].concat(v).includes(f.value); else f.value = v;
        });
      });
    } catch {}
    form.addEventListener('input', () => {
      try {
        const o = {};
        new FormData(form).forEach((v, k) => { if (k === '_gotcha') return; o[k] = k in o ? [].concat(o[k], v) : v; });
        localStorage.setItem(draftKey, JSON.stringify(o));
      } catch {}
    });
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const show = (cls, msg) => { status.hidden = false; status.className = 'form-status ' + cls; status.textContent = msg; status.focus?.(); };
    const endpoint = SITE.forms[kind];
    if (!endpoint) { show('err', `This form isn't connected yet. Please email ${SITE.email} instead.`); return; }
    const btn = form.querySelector('[type="submit"]'); btn.disabled = true;
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      form.reset(); try { localStorage.removeItem(draftKey); } catch {}
      show('ok', form.dataset.thanks || 'Thanks. I read every message myself and will reply within two business days.');
    } catch {
      show('err', `Something went wrong sending that. Please try again, or email ${SITE.email}.`);
    } finally { btn.disabled = false; }
  });
});

/* ---- questionnaire progress ---- */
(() => {
  const form = document.querySelector('form[data-form="questionnaire"]');
  const fill = document.querySelector('.q-progress .fill'), lbl = document.querySelector('.q-progress .count');
  if (!form || !fill) return;
  const update = () => {
    const names = [...new Set([...form.querySelectorAll('[name]')].filter((f) => f.name !== '_gotcha' && f.type !== 'hidden').map((f) => f.name))];
    const fd = new FormData(form);
    const done = names.filter((n) => fd.getAll(n).some((v) => String(v).trim())).length;
    fill.style.width = Math.round((done / names.length) * 100) + '%';
    if (lbl) lbl.textContent = `${done} of ${names.length} answered`;
  };
  form.addEventListener('input', update); form.addEventListener('change', update); update();
})();
