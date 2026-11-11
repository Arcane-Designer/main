/* Arcane Designer site script. Small and dependency-free. */

/* ---- Settings Nathan fills in once accounts exist ---- */
const SITE = {
  email: 'nathan@arcanedesigner.com',        // set in tools/pages.py too (EMAIL); Google Workspace address
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
// preview helper: ?static&y=1200 opens the page scrolled to that point (used for screenshots)
const Y0 = +(new URLSearchParams(location.search).get('y') || 0);
if (Y0) addEventListener('load', () => scrollTo(0, Y0));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.compare').forEach((box) => {
  const input = box.querySelector('input');
  if (!input) return;
  const set = (v) => box.style.setProperty('--pos', v + '%');
  set(input.value);
  input.addEventListener('input', () => { box.dataset.touched = '1'; set(input.value); });
  if (box.closest('.pin-reveal')) return; // the pinned scene drives this one
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

/* ---- pinned scroll scenes ---- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
// progress 0..1 while a tall .pin-* section's sticky content is held on screen
const pinProgress = (sec) => { const r = sec.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
const scenes = [];
const onScroll = () => scenes.forEach((f) => f());
let raf = 0;
addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; onScroll(); }); }, { passive: true });
addEventListener('resize', onScroll);

// 1. Home: the page holds still while scrolling wipes the old site into the new one
(() => {
  const sec = document.querySelector('.pin-reveal');
  const box = sec && sec.querySelector('.compare');
  if (!box) return;
  const input = box.querySelector('input'), bubble = sec.querySelector('.bubble span');
  const lines = bubble ? [bubble.dataset.a, bubble.dataset.b] : [];
  let said = 0;
  const say = (i) => {
    if (!bubble || said === i) return; said = i;
    bubble.classList.add('swap');
    setTimeout(() => { bubble.textContent = lines[i]; bubble.classList.remove('swap'); }, 200);
  };
  const set = (v) => { box.style.setProperty('--pos', v + '%'); input.value = v; box.classList.toggle('revealed', v < 4); box.classList.toggle('fresh', v > 96); };
  if (STATIC || REDUCE) { document.documentElement.classList.add('no-pin'); set(6); if (bubble) bubble.textContent = lines[1]; return; }
  box.addEventListener('pointerdown', () => { box.dataset.touched = '1'; });
  scenes.push(() => {
    const p = pinProgress(sec);
    if (p <= 0 || p >= 1) delete box.dataset.touched;   // hand control back to scrolling outside the pinned part
    if (box.dataset.touched) return;
    const t = ease(clamp((p - .08) / .74));
    set(100 - 100 * t);
    say(t > .97 ? 1 : 0);
  });
})();

// 2. Home: the hexagon gains a triangle for each step as you scroll
(() => {
  const sec = document.querySelector('.pin-steps');
  if (!sec) return;
  const tris = [...sec.querySelectorAll('.tri')].sort((a, b) => a.dataset.i - b.dataset.i);
  const items = [...sec.querySelectorAll('li[data-step]')];
  const show = (n) => {
    tris.forEach((t, i) => t.classList.toggle('on', i < n));
    items.forEach((li, i) => { li.classList.toggle('on', i < n); li.classList.toggle('cur', i === n - 1); });
  };
  if (STATIC || REDUCE) { document.documentElement.classList.add('no-pin'); show(6); return; }
  scenes.push(() => show(Math.round(clamp((pinProgress(sec) - .04) / .8) * 6)));
})();

// 2b. Home: the rest of the site pops out of Arc's laptop as you scroll
(() => {
  const sec = document.querySelector('.pin-laptop');
  if (!sec) return;
  const emit = sec.querySelector('.emit'), desk = sec.querySelector('.arc-desk'), h2 = sec.querySelector('.launch h2');
  const cards = [...sec.querySelectorAll('.lcard')];
  const measure = () => {
    cards.forEach((c) => c.style.setProperty('--p', 1));
    const e = emit.getBoundingClientRect();
    cards.forEach((c) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--fx', (e.left - (r.left + r.width / 2)) + 'px');
      c.style.setProperty('--fy', (e.top - (r.top + r.height / 2)) + 'px');
    });
  };
  if (STATIC || REDUCE) { document.documentElement.classList.add('no-pin'); return; }
  measure(); addEventListener('resize', measure);
  scenes.push(() => {
    const p = pinProgress(sec);
    sec.style.setProperty('--hp', ease(clamp((p - .02) / .15)));
    desk.style.setProperty('--glow', clamp(p * 4) * (1 - clamp((p - .85) / .15)) * .9 + .1 * clamp(p * 4));
    cards.forEach((c, i) => c.style.setProperty('--p', ease(clamp((p - .12 - i * .16) / .26)).toFixed(4)));
  });
})();

// 3. Process page: each step's triangle arrives as that step enters the screen and the step dims as it leaves
(() => {
  const hex = document.querySelector('.proc-art .hexbuild');
  const steps = [...document.querySelectorAll('.proc-step')];
  const count = document.querySelector('.proc-art .count');
  if (!hex || !steps.length) return;
  const tris = [...hex.querySelectorAll('.tri')].sort((a, b) => a.dataset.i - b.dataset.i);
  const update = () => {
    const h = innerHeight;
    let n = 0;
    steps.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const head = s.querySelector('h3').getBoundingClientRect();
      if (head.top < h * .85) n = i + 1;                       // entered
      s.classList.toggle('on', head.top < h * .85 && r.bottom > h * .22);   // lit while on screen
    });
    tris.forEach((t, i) => t.classList.toggle('on', i < n));
    if (count) count.textContent = n ? `Step ${n} of ${tris.length}` : `${tris.length} steps`;
  };
  if (STATIC || REDUCE) { tris.forEach((t) => t.classList.add('on')); steps.forEach((s) => s.classList.add('on')); return; }
  scenes.push(update);
})();
onScroll();

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

/* ---- hero: floating hexagons lean away from the mouse ---- */
(() => {
  const hero = document.querySelector('.hero-x');
  if (!hero || REDUCE || matchMedia('(hover: none)').matches) return;
  const fls = [...hero.querySelectorAll('.fl')];
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
    fls.forEach((f) => { const k = +getComputedStyle(f).getPropertyValue('--k') || .5; f.style.setProperty('--mx', (-dx * 46 * k).toFixed(1) + 'px'); f.style.setProperty('--my', (-dy * 36 * k).toFixed(1) + 'px'); });
  });
  hero.addEventListener('pointerleave', () => fls.forEach((f) => { f.style.setProperty('--mx', '0px'); f.style.setProperty('--my', '0px'); }));
})();

/* ---- logo: the three hexagons juggle into new spots on hover, and swap back on leave ---- */
document.querySelectorAll('.brand .mark3d').forEach((mark) => {
  if (REDUCE) return;
  const brand = mark.closest('.brand');
  const T = (x, y, s = 1) => `translate(${x}px, ${y}px) scale(${s})`;
  // top (blue) -> bottom right, bottom left (pink) -> top passing OVER, bottom right (teal) -> bottom left passing UNDER
  const paths = {
    b: [{ transform: T(10, 0), zIndex: 1 }, { transform: T(14, -9, 1.22), zIndex: 4, offset: .25 }, { transform: T(30, 2, 1.12), zIndex: 4, offset: .6 }, { transform: T(21, 17, .96), zIndex: 2, offset: .85 }, { transform: T(20, 16), zIndex: 2 }],
    p: [{ transform: T(0, 16), zIndex: 2 }, { transform: T(-4, 6, 1.3), zIndex: 5, offset: .3 }, { transform: T(4, -10, 1.32), zIndex: 5, offset: .62 }, { transform: T(10, 1, .97), zIndex: 3, offset: .86 }, { transform: T(10, 0), zIndex: 3 }],
    t: [{ transform: T(20, 16), zIndex: 3 }, { transform: T(24, 22, .86), zIndex: 0, offset: .3 }, { transform: T(10, 25, .7), zIndex: 0, offset: .62 }, { transform: T(-1, 17, .97), zIndex: 1, offset: .86 }, { transform: T(0, 16), zIndex: 1 }],
  };
  const delay = { p: 0, b: 90, t: 160 };
  let anims = null;
  const play = (dir) => {
    if (!anims) anims = [...mark.querySelectorAll('.hx')].map((h) => {
      const a = h.animate(paths[h.dataset.h], { duration: 1500, delay: delay[h.dataset.h], easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'both' });
      a.pause(); return a;
    });
    anims.forEach((a) => { a.playbackRate = dir; a.play(); });
  };
  brand.addEventListener('mouseenter', () => play(1));
  brand.addEventListener('mouseleave', () => play(-1));
  brand.addEventListener('focus', () => play(1));
  brand.addEventListener('blur', () => play(-1));
});

/* ---- FAQ: one open at a time, smooth open and close ---- */
document.querySelectorAll('.faq').forEach((faq) => {
  const items = [...faq.querySelectorAll('details')];
  const animate = (d, open) => {
    const sum = d.querySelector('summary');
    if (d._anim) d._anim.cancel();
    const start = d.offsetHeight;
    if (open) d.open = true;
    const end = open ? d.scrollHeight : sum.offsetHeight;
    if (REDUCE) { if (!open) d.open = false; return; }
    d.style.overflow = 'hidden';
    d._anim = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 320, easing: 'cubic-bezier(.3,.7,.2,1)' });
    d._anim.onfinish = () => { d._anim = null; d.style.overflow = ''; if (!open) d.open = false; };
    d._anim.oncancel = () => { d._anim = null; };
    const body = d.querySelector('summary + *');
    if (body && open) body.animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 320, easing: 'ease-out' });
  };
  items.forEach((d) => d.querySelector('summary').addEventListener('click', (e) => {
    e.preventDefault();
    const opening = !d.open || d._closing;
    items.forEach((o) => { if (o !== d && o.open) animate(o, false); });
    animate(d, opening);
  }));
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
