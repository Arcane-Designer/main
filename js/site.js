/* Arcane Designer site script. Small and dependency-free. */

/* ---- Settings Nathan fills in once accounts exist ---- */
const SITE = {
  email: 'nathan@arcanedesigner.com',        // set in tools/pages.py too (EMAIL); Google Workspace address
  forms: {
    contact: '',        // Formspree endpoint, e.g. https://formspree.io/f/xxxxxxx
    guide: '',          // free-guide signup endpoint (Kit form action or Formspree)
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
  const set = (v) => { box.style.setProperty('--pos', v + '%'); if (input) input.value = v; box.classList.toggle('revealed', v < 4); box.classList.toggle('fresh', v > 96); };
  if (STATIC || REDUCE) { document.documentElement.classList.add('no-pin'); set(6); if (bubble) bubble.textContent = lines[1]; return; }
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

// 2c. Home: the price of learning AI counts down to ours as you scroll
(() => {
  const sec = document.querySelector('.pin-price');
  if (!sec) return;
  const tick = sec.querySelector('.ticker'), num = tick.querySelector('.num');
  const stages = JSON.parse(tick.dataset.stages);
  const label = sec.querySelector('.scene-label'), sub = sec.querySelector('.scene-sub');
  const steps = [...sec.querySelectorAll('.scene-steps li')];
  const bubble = sec.querySelector('.bubble span'), lines = bubble ? [bubble.dataset.a, bubble.dataset.b] : [];
  let shown = -1, said = 0;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const render = (t) => {   // t runs 0..stages.length-1; each stage holds, then counts down to the next
    const i = Math.min(stages.length - 1, Math.floor(t)), frac = t - i;
    const f = i >= stages.length - 1 ? 0 : ease(clamp((frac - .35) / .65));
    const val = i >= stages.length - 1 ? stages[i][0] : stages[i][0] + (stages[i + 1][0] - stages[i][0]) * f;
    num.textContent = fmt(val);
    const cur = f > .5 ? i + 1 : i;
    if (cur !== shown) {
      shown = cur; label.textContent = stages[cur][1]; sub.textContent = stages[cur][2];
      steps.forEach((li, k) => { li.classList.toggle('on', k === cur); li.classList.toggle('passed', k < cur); });
    }
    const last = cur === stages.length - 1;
    tick.classList.toggle('final', last);
    if (bubble && said !== +last) { said = +last; bubble.classList.add('swap'); setTimeout(() => { bubble.textContent = lines[said]; bubble.classList.remove('swap'); }, 200); }
  };
  if (STATIC || REDUCE) { document.documentElement.classList.add('no-pin'); render(stages.length - 1); return; }
  scenes.push(() => render(clamp((pinProgress(sec) - .06) / .8) * (stages.length - 1)));
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

/* ---- hero: floating hexagons lean away from the mouse, eased every frame so it never stutters ---- */
(() => {
  const hero = document.querySelector('.hero-x');
  if (!hero || REDUCE || matchMedia('(hover: none)').matches) return;
  const fls = [...hero.querySelectorAll('.fl')].map((el) => ({ el, k: parseFloat(el.style.getPropertyValue('--k')) || .5, x: 0, y: 0 }));
  let tx = 0, ty = 0, running = false;
  const step = () => {
    let moving = false;
    fls.forEach((f) => {
      const gx = -tx * 46 * f.k, gy = -ty * 36 * f.k;
      f.x += (gx - f.x) * .12; f.y += (gy - f.y) * .12;
      if (Math.abs(gx - f.x) > .05 || Math.abs(gy - f.y) > .05) moving = true;
      f.el.style.setProperty('--mx', f.x.toFixed(2) + 'px'); f.el.style.setProperty('--my', f.y.toFixed(2) + 'px');
    });
    running = moving; if (moving) requestAnimationFrame(step);
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(step); } };
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; kick();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
})();

/* ---- free guide: remember which kit someone came from ---- */
(() => {
  const kit = new URLSearchParams(location.search).get('kit');
  const f = document.querySelector('form[data-form="guide"] input[name="kit"]');
  if (kit && f) f.value = kit;
})();

/* ---- Start a project: "Get started" on a pricing card pre-picks that package ---- */
(() => {
  const plan = new URLSearchParams(location.search).get('plan');
  if (!plan) return;
  const box = document.querySelector(`input[data-plan="${CSS.escape(plan)}"]`);
  if (box) box.checked = true;
})();

/* ---- logo: hover makes the three hexagons charge outward, snap together past each other, bounce,
        and settle into swapped spots; leaving plays it back so they return home ---- */
document.querySelectorAll('.brand .mark3d').forEach((mark) => {
  if (REDUCE) return;
  const brand = mark.closest('.brand');
  const home = { b: [10, 0], p: [0, 16], t: [20, 16] };
  const dest = { b: 't', p: 'b', t: 'p' };            // each hexagon takes the next one's spot
  const C = [10, 10.67];
  const unit = ([x, y]) => { const dx = x - C[0], dy = y - C[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  const T = ([x, y], s = 1) => `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s})`;
  const zMid = { p: 5, b: 4, t: 1 }, zEnd = { b: 2, p: 3, t: 1 }, zStart = { b: 1, p: 2, t: 3 };
  const frames = (h) => {
    const A = home[h], B = home[dest[h]], ua = unit(A), ub = unit(B);
    const mid = [C[0] + (B[0] - C[0]) * .22, C[1] + (B[1] - C[1]) * .22];
    return [
      { transform: T(A), zIndex: zStart[h], easing: 'cubic-bezier(.3,0,.5,1)' },
      { transform: T([A[0] + ua[0] * 4, A[1] + ua[1] * 4], .93), zIndex: zStart[h], offset: .24, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: T(mid, 1.1), zIndex: zMid[h], offset: .5, easing: 'cubic-bezier(.1,.5,.3,1)' },
      { transform: T([B[0] + ub[0] * 4, B[1] + ub[1] * 4], 1.03), zIndex: zEnd[h], offset: .72, easing: 'ease-in-out' },
      { transform: T([B[0] - ub[0] * 1.2, B[1] - ub[1] * 1.2], .99), zIndex: zEnd[h], offset: .88, easing: 'ease-out' },
      { transform: T(B), zIndex: zEnd[h] },
    ];
  };
  let anims = null;
  const play = (dir) => {
    if (!anims) anims = [...mark.querySelectorAll('.hx')].map((h) => { const a = h.animate(frames(h.dataset.h), { duration: 1300, fill: 'both' }); a.pause(); return a; });
    anims.forEach((a) => { a.playbackRate = dir; a.play(); });
  };
  brand.addEventListener('mouseenter', () => play(1));
  brand.addEventListener('mouseleave', () => play(-1));
  brand.addEventListener('focus', () => play(1));
  brand.addEventListener('blur', () => play(-1));
});

/* ---- price cards: a soft light follows the mouse ---- */
document.querySelectorAll('.price').forEach((c) => c.addEventListener('pointermove', (e) => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}));

/* ---- "Sound familiar?": hovering a note highlights its marker on the old site, and the other way round ---- */
document.querySelectorAll('.redpen').forEach((rp) => {
  const pair = (n, on) => rp.querySelectorAll(`[data-n="${n}"]`).forEach((el) => el.classList.toggle('hot', on));
  rp.querySelectorAll('[data-n]').forEach((el) => {
    el.addEventListener('mouseenter', () => pair(el.dataset.n, true));
    el.addEventListener('mouseleave', () => pair(el.dataset.n, false));
  });
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
