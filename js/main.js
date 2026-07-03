/* ============================================================
   ARCANE DESIGNER - main.js
   Nav · fade-in · product covers · shop filtering ·
   product-detail rendering · Gumroad wiring · forms
   Reads the catalog from window.ARCANE (assets/data/products.js)
   ============================================================ */
(function () {
  'use strict';

  var A = window.ARCANE || null;
  // Pages under /blog/ need a "../" prefix for internal links rendered by JS.
  var PREFIX = /\/blog\//.test(location.pathname) ? '../' : '';

  /* =========================================================
     0. Small SVG icon library (inline, no icon-font CDN)
     ========================================================= */
  var ICON = {
    cart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    bolt:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    lock:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/></svg>',
    mail:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    sparkle:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19 9l-4.2 3 1.6 5.6L12 14.8 7.6 17.6 9.2 12 5 9l5.2-1.4z"/></svg>',
    target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
    linkedin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.4 8.02h4.15V24H.4zM8.34 8.02h3.98v2.18h.06c.55-1.05 1.9-2.16 3.92-2.16 4.2 0 4.98 2.76 4.98 6.35V24h-4.15v-7.08c0-1.69-.03-3.86-2.35-3.86-2.36 0-2.72 1.84-2.72 3.74V24H8.34z"/></svg>'
  };

  /* Product-cover glyphs (larger, centered on the cover) */
  var COVER_GLYPH = {
    grimoire: '<path d="M40 22h32a6 6 0 0 1 6 6v50a4 4 0 0 0-4-4H40z" fill="rgba(255,255,255,.16)"/><path d="M40 22a6 6 0 0 0-6 6v52a4 4 0 0 1 4-4h2z" fill="rgba(255,255,255,.28)"/><path d="M46 38h22M46 48h22M46 58h16" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/><path d="M57 30l2.4 5 5.4.6-4 3.7 1.2 5.3-5-2.8-5 2.8 1.2-5.3-4-3.7 5.4-.6z" fill="rgba(255,255,255,.85)"/>',
    template: '<rect x="30" y="26" width="52" height="50" rx="6" fill="rgba(255,255,255,.16)"/><rect x="36" y="32" width="40" height="12" rx="3" fill="rgba(255,255,255,.5)"/><rect x="36" y="49" width="18" height="21" rx="3" fill="rgba(255,255,255,.32)"/><rect x="58" y="49" width="18" height="21" rx="3" fill="rgba(255,255,255,.32)"/>',
    calendar: '<rect x="28" y="28" width="56" height="48" rx="6" fill="rgba(255,255,255,.16)"/><rect x="28" y="28" width="56" height="14" rx="6" fill="rgba(255,255,255,.4)"/><path d="M40 24v10M72 24v10" stroke="rgba(255,255,255,.7)" stroke-width="4" stroke-linecap="round"/><g fill="rgba(255,255,255,.55)"><circle cx="40" cy="52" r="3"/><circle cx="56" cy="52" r="3"/><circle cx="72" cy="52" r="3"/><circle cx="40" cy="64" r="3"/><circle cx="56" cy="64" r="3"/></g>',
    copy:     '<rect x="34" y="24" width="40" height="52" rx="5" fill="rgba(255,255,255,.16)"/><path d="M42 36h24M42 45h24M42 54h18M42 63h22" stroke="rgba(255,255,255,.6)" stroke-width="3.4" stroke-linecap="round"/>',
    playbook: '<path d="M54 30c-6-5-16-6-22-4v42c6-2 16-1 22 4z" fill="rgba(255,255,255,.28)"/><path d="M54 30c6-5 16-6 22-4v42c-6-2-16-1-22 4z" fill="rgba(255,255,255,.16)"/><path d="M54 30v46" stroke="rgba(255,255,255,.5)" stroke-width="2.5"/>',
    toolkit:  '<path d="M62 30a12 12 0 0 0-15 15L30 62l8 8 17-17a12 12 0 0 0 15-15l-8 8-6-6z" fill="rgba(255,255,255,.22)"/><circle cx="38" cy="62" r="3" fill="rgba(255,255,255,.7)"/>',
    course:   '<circle cx="56" cy="52" r="26" fill="rgba(255,255,255,.16)"/><path d="M50 42l18 10-18 10z" fill="rgba(255,255,255,.85)"/>',
    funnel:   '<path d="M32 30h48l-18 22v20l-12 6V52z" fill="rgba(255,255,255,.2)"/><path d="M40 40h32" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>',
    bundle:   '<rect x="30" y="40" width="52" height="38" rx="5" fill="rgba(255,255,255,.16)"/><path d="M30 40l26-14 26 14-26 12z" fill="rgba(255,255,255,.3)"/><path d="M56 52v26" stroke="rgba(255,255,255,.5)" stroke-width="2.5"/><path d="M30 40v38M82 40v38" stroke="rgba(255,255,255,.4)" stroke-width="2"/>',
    membership:'<path d="M32 66l-4-26 14 10 12-20 12 20 14-10-4 26z" fill="rgba(255,255,255,.22)"/><path d="M32 66h48v6H32z" fill="rgba(255,255,255,.4)"/>'
  };

  var GRAD_STOPS = {
    'teal-blue': ['#08D8A0', '#238DBB'],
    'pink-teal': ['#FF6B93', '#08D8A0'],
    'navy-teal': ['#1A113D', '#08D8A0'],
    'blue-pink': ['#238DBB', '#FF6B93'],
    'navy-pink': ['#1A113D', '#FF6B93'],
    'blue-teal': ['#238DBB', '#08D8A0']
  };

  /* =========================================================
     1. Product cover SVG generator
     ========================================================= */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function wrapLines(text, max) {
    var words = String(text).split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (test.length > max && line) { lines.push(line); line = words[i]; }
      else { line = test; }
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function coverSVG(p) {
    var cov = p.cover || { grad: 'teal-blue', icon: 'grimoire' };
    var stops = GRAD_STOPS[cov.grad] || GRAD_STOPS['teal-blue'];
    var uid = 'g' + p.id;
    var glyph = COVER_GLYPH[cov.icon] || COVER_GLYPH.grimoire;
    var lines = wrapLines(p.name, 15);
    var startY = 205 - (lines.length - 1) * 15;
    var titleSpans = lines.map(function (l, i) {
      return '<text x="34" y="' + (startY + i * 30) + '" font-family="Oswald, sans-serif" font-weight="600" font-size="26" fill="#fff">' + esc(l) + '</text>';
    }).join('');

    // scattered decorative hexes
    var hexes = '';
    var hx = [[330, 60, 26, .10], [300, 150, 16, .10], [355, 210, 20, .08]];
    for (var h = 0; h < hx.length; h++) {
      var x = hx[h][0], y = hx[h][1], s = hx[h][2], o = hx[h][3];
      hexes += '<path transform="translate(' + x + ',' + y + ') scale(' + (s / 50) + ')" d="M25 0 50 14.4 50 43.3 25 57.7 0 43.3 0 14.4z" fill="rgba(255,255,255,' + o + ')"/>';
    }

    return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(p.name) + ' cover">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + stops[0] + '"/><stop offset="1" stop-color="' + stops[1] + '"/></linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#' + uid + ')"/>' +
      hexes +
      '<g transform="translate(210,70) scale(1.15)">' + glyph + '</g>' +
      '<text x="34" y="' + (startY - 34) + '" font-family="Oswald, sans-serif" font-weight="600" font-size="12" letter-spacing="2" fill="rgba(255,255,255,.85)">' + esc((p.kicker || '').toUpperCase()) + '</text>' +
      titleSpans +
      '<g transform="translate(34,250)"><path d="M0 0 8.6 5 8.6 15 0 20 -8.6 15 -8.6 5z" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5" transform="translate(9,-6) scale(.7)"/>' +
      '<text x="18" y="6" font-family="Oswald, sans-serif" font-weight="600" font-size="11" letter-spacing="2" fill="rgba(255,255,255,.8)">ARCANE DESIGNER</text></g>' +
      '</svg>';
  }

  function collectionSVG(icon) {
    var glyph = COVER_GLYPH[icon] || COVER_GLYPH.grimoire;
    return '<svg viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<g transform="translate(0,0) scale(1)">' + glyph + '</g></svg>';
  }

  /* Article / blog cover (wide) */
  function articleCoverSVG(title, grad, kicker) {
    var stops = GRAD_STOPS[grad] || GRAD_STOPS['teal-blue'];
    var uid = 'a' + Math.abs(hashCode(title));
    var lines = wrapLines(title, 26);
    var startY = 150 - (lines.length - 1) * 16;
    var spans = lines.map(function (l, i) {
      return '<text x="40" y="' + (startY + i * 32) + '" font-family="Oswald, sans-serif" font-weight="600" font-size="27" fill="#fff">' + esc(l) + '</text>';
    }).join('');
    var hexes = '';
    var hx = [[560, 40, 40, .10], [500, 190, 26, .08], [610, 150, 30, .07]];
    for (var h = 0; h < hx.length; h++) {
      hexes += '<path transform="translate(' + hx[h][0] + ',' + hx[h][1] + ') scale(' + (hx[h][2] / 50) + ')" d="M25 0 50 14.4 50 43.3 25 57.7 0 43.3 0 14.4z" fill="rgba(255,255,255,' + hx[h][3] + ')"/>';
    }
    return '<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(title) + '">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + stops[0] + '"/><stop offset="1" stop-color="' + stops[1] + '"/></linearGradient></defs>' +
      '<rect width="640" height="300" fill="url(#' + uid + ')"/>' + hexes +
      (kicker ? '<text x="40" y="' + (startY - 30) + '" font-family="Oswald, sans-serif" font-weight="600" font-size="13" letter-spacing="2" fill="rgba(255,255,255,.9)">' + esc(kicker.toUpperCase()) + '</text>' : '') +
      spans + '</svg>';
  }
  function hashCode(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }

  /* =========================================================
     2. Formatting helpers
     ========================================================= */
  function priceHTML(p) {
    if (p.priceCents === 0) return '<span class="price"><span class="price-now">Free</span></span>';
    var now = A.formatPrice(p.priceCents);
    var compare = p.compareAtCents ? '<span class="compare">' + A.formatPrice(p.compareAtCents) + '</span>' : '';
    var suffix = p.priceSuffix ? '<span class="suffix">' + esc(p.priceSuffix) + '</span>' : '';
    return '<span class="price"><span class="price-now">' + now + '</span>' + suffix + compare + '</span>';
  }

  function starsHTML(p) {
    if (!p.rating) return '';
    var full = Math.round(p.rating);
    var icons = '';
    for (var i = 0; i < 5; i++) icons += (i < full ? '★' : '☆');
    return '<span class="stars"><span class="star-icons" aria-hidden="true">' + icons + '</span><span class="count">' + p.rating.toFixed(1) + ' (' + p.reviewCount + ')</span></span>';
  }

  function badgeHTML(p) {
    if (!p.flags || !p.flags.length) return '';
    var map = { bestseller: ['Bestseller', ''], new: ['New', '--new'], free: ['Free', '--free'], value: ['Best value', '--value'] };
    var out = '';
    p.flags.forEach(function (f) { if (map[f]) out += '<span class="badge badge' + map[f][1] + '">' + map[f][0] + '</span>'; });
    return out ? '<div class="badge-row">' + out + '</div>' : '';
  }

  /* =========================================================
     3. Product card
     ========================================================= */
  function productHref(p) {
    if (p.isLeadMagnet) return PREFIX + 'free.html';
    return PREFIX + 'product.html?p=' + encodeURIComponent(p.slug);
  }

  function productCardHTML(p) {
    return '<article class="product-card fade-in">' +
      '<a class="product-cover" href="' + productHref(p) + '" aria-label="' + esc(p.name) + '">' +
      badgeHTML(p) + coverSVG(p) + '</a>' +
      '<div class="product-body">' +
      '<p class="product-kicker">' + esc(p.kicker || A.categoryLabel(p.category)) + '</p>' +
      '<h3 class="product-title"><a href="' + productHref(p) + '">' + esc(p.name) + '</a></h3>' +
      '<p class="tagline-sm">' + esc(p.tagline) + '</p>' +
      '<div class="product-meta">' + priceHTML(p) + starsHTML(p) + '</div>' +
      '<a href="' + productHref(p) + '" class="btn ' + (p.isLeadMagnet ? 'btn-primary' : 'btn-ghost') + ' btn-block btn-sm">' +
      (p.isLeadMagnet ? 'Get it free' : 'View details') + '</a>' +
      '</div></article>';
  }

  function renderInto(sel, html) { var el = document.querySelector(sel); if (el) el.innerHTML = html; }

  /* =========================================================
     4. HOME dynamic sections
     ========================================================= */
  function renderHome() {
    // Featured / bestsellers
    var featured = A.products.filter(function (p) { return (p.flags || []).indexOf('bestseller') > -1 && !p.isLeadMagnet; }).slice(0, 4);
    if (featured.length < 4) {
      A.products.forEach(function (p) { if (!p.isLeadMagnet && featured.indexOf(p) < 0 && featured.length < 4) featured.push(p); });
    }
    renderInto('#featured-grid', featured.map(productCardHTML).join(''));

    // Collections
    var cols = A.collections.map(function (c) {
      return '<a class="collection-tile grad-' + c.grad + ' fade-in" href="shop.html?category=' + c.slug + '">' +
        '<span class="col-icon">' + collectionSVG(c.icon) + '</span>' +
        '<h3>' + esc(c.title) + '</h3><p>' + esc(c.blurb) + '</p>' +
        '<span class="col-go">Browse ' + '&rarr;</span></a>';
    }).join('');
    renderInto('#collection-grid', cols);

    // Testimonials (aggregate a few product reviews) - PLACEHOLDER content
    renderInto('#testimonial-grid', testimonialsHTML());

    injectJSONLD(orgSchema());
    reobserveFadeIns();
  }

  function testimonialsHTML() {
    var picks = [];
    A.products.forEach(function (p) {
      (p.reviews || []).forEach(function (r) { if (picks.length < 3) picks.push({ r: r, product: p.name }); });
    });
    return picks.map(function (o) {
      var initials = o.r.name.split(' ').map(function (s) { return s[0]; }).join('').slice(0, 2);
      var stars = ''; for (var i = 0; i < o.r.stars; i++) stars += '★';
      return '<figure class="testimonial-card fade-in">' +
        '<div class="testimonial-stars" aria-hidden="true">' + stars + '</div>' +
        '<blockquote>&ldquo;' + esc(o.r.text) + '&rdquo;</blockquote>' +
        '<figcaption class="testimonial-author"><span class="testimonial-avatar" aria-hidden="true">' + esc(initials) + '</span>' +
        '<span><span class="testimonial-name">' + esc(o.r.name) + '</span><br><span class="testimonial-role">' + esc(o.r.role) + '</span></span></figcaption></figure>';
    }).join('');
  }

  /* =========================================================
     5. SHOP - render + faceted filtering
     ========================================================= */
  var shopState = { category: 'all', skill: 'all', price: 'all', sort: 'featured' };

  function renderShop() {
    var params = new URLSearchParams(location.search);
    if (params.get('category')) shopState.category = params.get('category');

    buildFilterBar();
    applyShopFilters();
    reobserveFadeIns();
  }

  function buildFilterBar() {
    var bar = document.querySelector('#shop-toolbar .toolbar-inner');
    if (!bar) return;
    function chips(label, items, key) {
      var html = '<div class="filter-group" role="group" aria-label="' + label + '"><span class="filter-label">' + label + '</span>';
      html += '<button class="chip" data-filter="' + key + '" data-value="all">All</button>';
      items.forEach(function (it) { html += '<button class="chip" data-filter="' + key + '" data-value="' + it.slug + '">' + esc(it.label) + '</button>'; });
      return html + '</div>';
    }
    bar.innerHTML =
      chips('Category', A.CATEGORIES, 'category') +
      chips('Level', A.SKILL_LEVELS, 'skill') +
      chips('Price', A.PRICE_BANDS, 'price') +
      '<select class="sort-select" id="shop-sort" aria-label="Sort products">' +
      '<option value="featured">Sort: Featured</option>' +
      '<option value="price-asc">Price: Low to High</option>' +
      '<option value="price-desc">Price: High to Low</option>' +
      '<option value="newest">Newest</option>' +
      '</select>';

    bar.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        shopState[chip.dataset.filter] = chip.dataset.value;
        applyShopFilters();
      });
    });
    bar.querySelector('#shop-sort').addEventListener('change', function () { shopState.sort = this.value; applyShopFilters(); });
  }

  function applyShopFilters() {
    // reflect active chips
    document.querySelectorAll('#shop-toolbar .chip').forEach(function (c) {
      c.classList.toggle('active', shopState[c.dataset.filter] === c.dataset.value);
    });
    var sortSel = document.querySelector('#shop-sort'); if (sortSel) sortSel.value = shopState.sort;

    var list = A.products.filter(function (p) {
      if (shopState.category !== 'all' && p.category !== shopState.category) return false;
      if (shopState.skill !== 'all' && p.skillLevel !== shopState.skill) return false;
      if (shopState.price !== 'all') {
        var band = A.PRICE_BANDS.find(function (b) { return b.slug === shopState.price; });
        if (band && !band.test(p.priceCents)) return false;
      }
      return true;
    });

    list.sort(function (a, b) {
      switch (shopState.sort) {
        case 'price-asc': return a.priceCents - b.priceCents;
        case 'price-desc': return b.priceCents - a.priceCents;
        case 'newest': return b.id - a.id;
        default:
          var af = (a.flags || []).indexOf('bestseller') > -1 ? 0 : 1;
          var bf = (b.flags || []).indexOf('bestseller') > -1 ? 0 : 1;
          return af - bf || a.id - b.id;
      }
    });

    var grid = document.querySelector('#shop-grid');
    var count = document.querySelector('#shop-count');
    if (count) count.textContent = list.length + (list.length === 1 ? ' product' : ' products') + ' in the vault';
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = '<div class="shop-empty"><img src="assets/images/Arc_Is_Relaxed_Laying_Down.png" alt="Arc lounging" loading="lazy"><p>No products match that combination. Try clearing a filter.</p><button class="btn btn-secondary btn-sm" id="clear-filters">Clear filters</button></div>';
      var clr = document.getElementById('clear-filters');
      if (clr) clr.addEventListener('click', function () { shopState = { category: 'all', skill: 'all', price: 'all', sort: 'featured' }; applyShopFilters(); });
      return;
    }
    grid.innerHTML = list.map(productCardHTML).join('');
    reobserveFadeIns(grid);
  }

  /* =========================================================
     6. PRODUCT DETAIL page
     ========================================================= */
  function renderProduct() {
    var params = new URLSearchParams(location.search);
    var slug = params.get('p');
    var p = slug ? A.bySlug(slug) : null;
    var root = document.querySelector('#product-root');
    if (!root) return;

    if (!p) {
      root.innerHTML = '<div class="container center-state"><div class="center-state-inner"><img class="state-arc" src="assets/images/Arc_Is_Flabbergasted.png" alt="Arc looking surprised"><h1>Spell not found</h1><p>We couldn’t find that product. It may have been renamed or moved.</p><a class="btn btn-primary" href="shop.html">Back to the Vault</a></div></div>';
      return;
    }

    document.title = p.name + ' | Arcane Designer';
    setMeta('description', p.tagline);
    var buy = buyBlock(p);

    var galleryImg = coverSVG(p);

    root.innerHTML =
      '<section class="page-hero" style="padding-bottom:40px">' +
        '<div class="hex-bg" aria-hidden="true"><div class="hex"></div><div class="hex"></div><div class="hex"></div><div class="hex"></div></div>' +
        '<div class="container" style="position:relative;z-index:2">' +
          '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">/</span><a href="shop.html">Shop</a><span class="sep">/</span><a href="shop.html?category=' + p.category + '">' + esc(A.categoryLabel(p.category)) + '</a><span class="sep">/</span><span class="current">' + esc(p.name) + '</span></nav>' +
        '</div>' +
      '</section>' +
      '<section class="section-dark2" style="padding-top:48px">' +
        '<div class="product-detail">' +
          '<div class="pd-gallery fade-in"><div class="pd-gallery-main">' + galleryImg + '</div></div>' +
          '<aside class="pd-buy fade-in">' +
            '<p class="pd-kicker">' + esc(p.kicker || A.categoryLabel(p.category)) + '</p>' +
            '<h1 class="pd-title">' + esc(p.name) + '</h1>' +
            '<p class="pd-tagline">' + esc(p.tagline) + '</p>' +
            '<div class="pd-price-row">' + priceHTML(p) + '</div>' +
            (p.rating ? '<div style="margin-bottom:6px">' + starsHTML(p) + '</div>' : '') +
            buy.button +
            '<p class="pd-reassure">' + ICON.bolt + ' Delivered to your inbox the second you pay.</p>' +
            '<ul class="pd-trust">' +
              '<li>' + ICON.download + ' Instant digital download</li>' +
              '<li>' + ICON.shield + ' 30-day money-back guarantee</li>' +
              '<li>' + ICON.lock + ' Secure checkout via Gumroad</li>' +
              '<li>' + ICON.refresh + ' Free lifetime updates</li>' +
            '</ul>' +
            buy.cross +
          '</aside>' +
        '</div>' +
      '</section>' +
      detailBody(p);

    injectJSONLD(productSchema(p));
    injectJSONLD(breadcrumbSchema(p));
    reobserveFadeIns();
    wireGumroad();
  }

  function buyBlock(p) {
    if (p.isLeadMagnet) {
      return { button: '<a class="btn btn-primary btn-block btn-lg" href="free.html">Get it free ' + ICON.arrow + '</a>', cross: '' };
    }
    var url = A.buyUrl(p);
    var label = 'Buy ' + A.formatPrice(p.priceCents) + (p.priceSuffix || '') + ' · Instant download';
    var btn = url
      ? '<a class="btn btn-pink btn-block btn-lg gumroad-button" href="' + url + '" data-gumroad-single-product="true">' + label + '</a>'
      : '<button class="btn btn-block btn-lg is-disabled" disabled title="Checkout link coming soon">Coming soon</button>';
    var cross = '';
    if (p.category !== 'bundles') {
      var arsenal = A.bySlug('arcane-arsenal');
      if (arsenal) cross = '<p class="pd-cross">Want everything? <a href="' + PREFIX + 'product.html?p=arcane-arsenal">Get ' + esc(arsenal.name) + '</a> and save.</p>';
    }
    return { button: btn, cross: cross };
  }

  function detailBody(p) {
    var inside = '<ul class="whats-inside">' + (p.whatsInside || []).map(function (x) { return '<li>' + ICON.check + '<span>' + esc(x) + '</span></li>'; }).join('') + '</ul>';
    var outcomes = (p.outcomes && p.outcomes.length)
      ? '<div class="pd-block"><h2>What changes for you</h2><div class="outcomes">' + p.outcomes.map(function (o) { return '<div class="outcome"><span class="oi">' + ICON.sparkle + '</span><p>' + esc(o) + '</p></div>'; }).join('') + '</div></div>'
      : '';
    var specs = '<div class="pd-block"><h2>The fine print</h2><div class="specs">' +
      spec('Format', p.format) + spec('License', p.license) + spec('Requirements', p.requirements) +
      spec('Delivery', 'Instant download via Gumroad') + '</div></div>';

    var reviews = '';
    if (p.reviews && p.reviews.length) {
      reviews = '<div class="pd-block"><h2>What buyers say</h2><div class="review-list">' +
        p.reviews.map(function (r) {
          var st = ''; for (var i = 0; i < r.stars; i++) st += '★';
          return '<div class="review"><div class="review-head"><span class="review-name">' + esc(r.name) + ' <span class="review-role">· ' + esc(r.role) + '</span></span><span class="testimonial-stars" aria-hidden="true">' + st + '</span></div><p>&ldquo;' + esc(r.text) + '&rdquo;</p></div>';
        }).join('') + '</div></div>';
    }

    var faqItems = (A.GLOBAL_FAQ || []).concat(p.faq || []);
    var faq = '<div class="pd-block"><h2>Questions</h2><div class="faq">' +
      faqItems.map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div>';

    // related
    var related = A.products.filter(function (x) { return x.id !== p.id && !x.isLeadMagnet && (x.category === p.category || (x.flags || []).indexOf('bestseller') > -1); }).slice(0, 4);
    var relatedHTML = related.length ? '<section class="section-dark2"><div class="container"><h2 class="section-title on-dark">You might also like</h2><div class="related-grid">' + related.map(productCardHTML).join('') + '</div></div></section>' : '';

    return '<section class="dark-section"><div class="pd-section">' +
      '<div class="pd-block"><h2>The rundown</h2><p style="color:var(--ink-on-dark);max-width:760px;font-size:1.08rem;line-height:1.8">' + esc(p.blurb) + '</p></div>' +
      '<div class="pd-block"><h2>What’s inside</h2>' + inside + '</div>' +
      outcomes + specs + reviews + faq +
      '</div></section>' + relatedHTML;
  }

  function spec(label, val) { return '<div class="spec"><div class="spec-label">' + esc(label) + '</div><div class="spec-value">' + esc(val || '-') + '</div></div>'; }

  /* =========================================================
     7. JSON-LD structured data
     ========================================================= */
  function injectJSONLD(obj) {
    if (!obj) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
  function orgSchema() {
    return {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'Arcane Designer LLC', slogan: 'Where Strategy Meets Sorcery',
      url: location.origin + location.pathname.replace(/index\.html$/, ''),
      logo: location.origin + '/assets/images/LOGO.png',
      sameAs: ['https://www.linkedin.com/company/arcane-designer/']
    };
  }
  function productSchema(p) {
    var o = {
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.name, description: p.tagline, category: A.categoryLabel(p.category),
      brand: { '@type': 'Brand', name: 'Arcane Designer' }
    };
    if (!p.isLeadMagnet && p.priceCents > 0) {
      o.offers = {
        '@type': 'Offer', price: (p.priceCents / 100).toFixed(2), priceCurrency: A.CURRENCY,
        availability: 'https://schema.org/InStock', url: A.buyUrl(p) || (location.origin + location.pathname + location.search)
      };
    }
    if (p.rating && p.reviewCount) {
      o.aggregateRating = { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviewCount };
    }
    return o;
  }
  function breadcrumbSchema(p) {
    var base = location.origin + location.pathname.replace(/product\.html$/, '');
    return {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base + 'index.html' },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: base + 'shop.html' },
        { '@type': 'ListItem', position: 3, name: p.name }
      ]
    };
  }
  function setMeta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
    m.setAttribute('content', content);
  }

  /* =========================================================
     8. Gumroad overlay
     ========================================================= */
  function wireGumroad() {
    if (document.querySelector('.gumroad-button') && !document.getElementById('gumroad-js')) {
      var s = document.createElement('script');
      s.id = 'gumroad-js'; s.src = 'https://gumroad.com/js/gumroad.js'; s.defer = true;
      document.body.appendChild(s);
    }
  }

  /* =========================================================
     9. Forms (lead magnet + subscribe + contact)
     Works in demo mode now; drop a real endpoint into action=""
     ========================================================= */
  function wireForms() {
    document.querySelectorAll('form[data-arcane-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        var hp = f.querySelector('input[name="_gotcha"]');
        if (hp && hp.value) { e.preventDefault(); return; }               // bot trap
        var action = (f.getAttribute('action') || '').trim();
        var live = action && action !== '#' && action.indexOf('YOUR_') === -1;
        if (live) return;                                                  // real endpoint → native submit
        e.preventDefault();                                                // demo mode
        var status = f.querySelector('.form-status');
        if (status) { status.textContent = '✓ You’re in! Check your inbox for your download. (Demo mode. Connect your email tool to send for real.)'; status.className = 'form-status success'; }
        f.reset();
        var redirect = f.getAttribute('data-redirect');
        if (redirect) { setTimeout(function () { location.href = redirect; }, 900); }
      });
    });
  }

  /* =========================================================
     10. Nav + fade-in + shared behaviors
     ========================================================= */
  function wireNav() {
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function () {
        var open = navLinks.classList.toggle('open');
        hamburger.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open);
      });
      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          navLinks.classList.remove('open'); hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false');
        });
      });
      document.addEventListener('click', function (e) {
        if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
          navLinks.classList.remove('open'); hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { navLinks.classList.remove('open'); hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false'); } });
    }
    var nav = document.querySelector('.site-nav');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 40); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
    // Inject cart href + icons if placeholders present
    document.querySelectorAll('[data-cart-link]').forEach(function (a) { if (A) a.setAttribute('href', A.CART_URL); });
    document.querySelectorAll('[data-icon]').forEach(function (el) { var n = el.getAttribute('data-icon'); if (ICON[n]) el.innerHTML = ICON[n]; });
  }

  var fadeObserver = null;
  function reobserveFadeIns(scope) {
    var els = (scope || document).querySelectorAll('.fade-in:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('visible'); }); return; }
    if (!fadeObserver) {
      fadeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('visible'); fadeObserver.unobserve(entry.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    els.forEach(function (el) { fadeObserver.observe(el); });
  }

  function wireSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = this.getAttribute('href');
        if (id === '#') return;
        var t = document.querySelector(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });
  }

  /* =========================================================
     11. Boot
     ========================================================= */
  function boot() {
    wireNav();
    wireForms();
    wireSmoothScroll();
    reobserveFadeIns();

    if (!A) return; // pages without the catalog still get nav/forms
    var page = (document.body.getAttribute('data-page') || '').trim();
    if (page === 'home') renderHome();
    else if (page === 'shop') renderShop();
    else if (page === 'product') renderProduct();

    // Render any standalone product grids by data attribute (e.g. blog related)
    document.querySelectorAll('[data-product-slugs]').forEach(function (holder) {
      var slugs = holder.getAttribute('data-product-slugs').split(',').map(function (s) { return s.trim(); });
      holder.innerHTML = slugs.map(function (s) { var p = A.bySlug(s); return p ? productCardHTML(p) : ''; }).join('');
    });
    // Render article covers (blog cards + post heroes)
    document.querySelectorAll('[data-article-cover]').forEach(function (holder) {
      holder.innerHTML = articleCoverSVG(holder.getAttribute('data-title') || '', holder.getAttribute('data-grad') || 'teal-blue', holder.getAttribute('data-kicker') || '');
    });
    // Render single product callouts by slug (blog inline)
    document.querySelectorAll('[data-callout-slug]').forEach(function (holder) {
      var p = A.bySlug(holder.getAttribute('data-callout-slug'));
      if (!p) return;
      holder.innerHTML = '<div class="pc-cover">' + coverSVG(p) + '</div><div><h4>' + esc(p.name) + '</h4><p>' + esc(p.tagline) + '</p><a class="btn btn-ghost btn-sm" href="' + productHref(p) + '">View ' + A.formatPrice(p.priceCents) + '</a></div>';
    });
    wireGumroad();
    reobserveFadeIns();
  }

  // Expose a few helpers for inline use / debugging
  window.ARCANE_UI = { coverSVG: coverSVG, productCardHTML: productCardHTML, articleCoverSVG: articleCoverSVG, ICON: ICON };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
