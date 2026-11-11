/* Arcane Designer site script. Small and dependency-free. */

/* ---- Settings Nathan fills in once accounts exist ---- */
const SITE = {
  email: 'hello@arcanedesigner.com',        // set in tools/pages.py too (EMAIL); Google Workspace address
  forms: {
    contact: '',        // Formspree endpoint, e.g. https://formspree.io/f/xxxxxxx
    questionnaire: '',  // Formspree endpoint for the client questionnaire
  },
};

/* Reviews. Add real ones here; the section on the home page appears once there is at least one.
   { quote, name, role, initials, stars (1-5), work: 'slug of a Work page item, optional' } */
const REVIEWS = [];

document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

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

/* ---- before/after sliders ---- */
const STATIC = /[?&]static\b/.test(location.search);
if (STATIC) document.documentElement.classList.add('static');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.compare').forEach((box) => {
  const input = box.querySelector('input');
  if (!input) return;
  const set = (v) => box.style.setProperty('--pos', v + '%');
  set(input.value);
  input.addEventListener('input', () => { box.dataset.touched = '1'; set(input.value); });
  if (box.hasAttribute('data-scroll-wipe')) return; // hero handles its own
  if ('IntersectionObserver' in window && !REDUCE && !STATIC) {
    const end = +input.value, from = 88;
    set(from);
    const io = new IntersectionObserver((ents) => {
      if (!ents[0].isIntersecting) return;
      io.disconnect();
      setTimeout(() => {
        const start = performance.now();
        const tick = (t) => {
          if (box.dataset.touched) return;
          const k = Math.min(1, (t - start) / 1600), e = 1 - Math.pow(1 - k, 3);
          set(from + (end - from) * e); if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 450);
    }, { threshold: .55 });
    io.observe(box);
  }
});

/* ---- hero: scrolling redesigns the old site ---- */
(() => {
  const box = document.querySelector('.compare[data-scroll-wipe]');
  if (!box) return;
  const stage = box.closest('.hero-stage'), bubble = stage && stage.querySelector('.bubble span');
  const input = box.querySelector('input');
  const lines = bubble ? [bubble.dataset.a, bubble.dataset.b] : [];
  let said = 0;
  const say = (i) => {
    if (!bubble || said === i) return; said = i;
    bubble.classList.add('swap');
    setTimeout(() => { bubble.textContent = lines[i]; bubble.classList.remove('swap'); }, 220);
  };
  const end = 8;
  if (STATIC || REDUCE) { box.style.setProperty('--pos', end + '%'); input.value = end; if (bubble) bubble.textContent = lines[1]; return; }
  let ticking = false;
  const update = () => {
    ticking = false;
    if (box.dataset.touched) return;
    const r = box.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * .92 - r.top) / (r.height * .95)));
    const e = p * p * (3 - 2 * p);
    const v = 97 - (97 - end) * e;
    box.style.setProperty('--pos', v + '%'); input.value = v;
    say(p > .9 ? 1 : 0);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();

/* ---- hexagon of six triangles ---- */
(() => {
  // Process page: each step adds a triangle as it reaches the middle of the screen
  const hex = document.querySelector('.proc-art .hexbuild');
  const steps = [...document.querySelectorAll('.proc-step')];
  const count = document.querySelector('.proc-art .count');
  if (hex && steps.length) {
    const tris = [...hex.querySelectorAll('.tri')];
    const show = (n) => {
      tris.forEach((t, i) => t.classList.toggle('on', i < n));
      steps.forEach((s, i) => s.classList.toggle('on', i === n - 1));
      hex.classList.toggle('complete', n >= tris.length);
      if (count) count.textContent = n ? `Step ${n} of ${tris.length}` : `${tris.length} steps`;
    };
    if (STATIC || REDUCE || !('IntersectionObserver' in window)) { show(tris.length); steps.forEach((s) => s.classList.add('on')); }
    else {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((e) => { if (e.isIntersecting) show(steps.indexOf(e.target) + 1); });
      }, { rootMargin: '-48% 0px -48% 0px' });
      steps.forEach((s) => io.observe(s));
      addEventListener('scroll', () => { if (steps[0].getBoundingClientRect().top > innerHeight * .52) show(0); }, { passive: true });
      show(0);
    }
  }
  // Elsewhere: the hexagon assembles itself once it scrolls into view
  document.querySelectorAll('.hexbuild[data-auto]').forEach((h) => {
    const tris = [...h.querySelectorAll('.tri')];
    const go = () => tris.forEach((t, i) => setTimeout(() => { t.classList.add('on'); if (i === tris.length - 1) setTimeout(() => h.classList.add('complete'), 500); }, i * 260));
    if (STATIC || REDUCE || !('IntersectionObserver' in window)) { tris.forEach((t) => t.classList.add('on')); h.classList.add('complete'); return; }
    const io = new IntersectionObserver((ents) => { if (ents[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: .45 });
    io.observe(h);
  });
})();

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

/* ---- things slide and build in as you scroll ---- */
(() => {
  // the hero animates on load, not on scroll
  requestAnimationFrame(() => setTimeout(() => document.querySelectorAll('.hero [data-anim]').forEach((e) => e.classList.add('in')), 60));
  const els = document.querySelectorAll('[data-anim]:not(.hero [data-anim]), .redpen');
  if (STATIC || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  els.forEach((e) => io.observe(e));
})();

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
      show('ok', form.dataset.thanks || 'Thanks, it came through. You\'ll hear back by email.');
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
