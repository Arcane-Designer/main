#!/usr/bin/env python3
"""Writes the site's HTML pages. Shared head, header and footer live here so every page matches.
Run from the repo root:  python3 tools/pages.py
Edit copy here, then re-run. The generated .html files are what GitHub Pages serves."""
import json, math, os, re

V = '29'                      # bump after CSS/JS changes so browsers refetch
BASE = 'https://arcanedesigner.com'
EMAIL = 'nathan@arcanedesigner.com'
LINKEDIN_BIZ = 'https://www.linkedin.com/company/arcane-designer/'
LINKEDIN_PERSON = 'https://www.linkedin.com/in/nathan-gellatly/'         # Nathan's profile URL (About block on Process). Empty = hidden.
FONTS = ('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@600'
         '&family=Figtree:wght@400;500;600;700&family=Archivo:wdth,wght@62..125,400..900&display=swap')

LOGO = '''<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
<polygon points="20,3 29.5,8.5 29.5,19.5 20,25 10.5,19.5 10.5,8.5" fill="#238DBB"/>
<polygon points="14.5,14 24,19.5 24,30.5 14.5,36 5,30.5 5,19.5" fill="#FF6B93"/>
<polygon points="25.5,14 35,19.5 35,30.5 25.5,36 16,30.5 16,19.5" fill="#08D8A0"/></g></svg>'''
BRAND = ('<span class="mark3d" aria-hidden="true">'
         '<img class="hx" data-h="b" src="assets/brand/hex-blue.webp" alt="" width="64" height="64">'
         '<img class="hx" data-h="p" src="assets/brand/hex-pink.webp" alt="" width="64" height="64">'
         '<img class="hx" data-h="t" src="assets/brand/hex-teal.webp" alt="" width="64" height="64">'
         '</span><span class="word">Arcane Designer</span>')
NAV = [('work.html', 'Work'), ('process.html', 'Process'), ('pricing.html', 'Pricing')]
AC = ' aria-current="page"'


def btn(href, text, cls=''):
    return f'<a class="btn {cls}" href="{href}"><span>{text}</span></a>'


def head(title, desc, path, extra='', noindex=False, schema=None):
    stem = path[:-5]
    canon = BASE + '/' + ('' if path == 'index.html' else (stem + '/' if stem in FOLDER_PAGES else stem))
    s = f'''<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{'<meta name="robots" content="noindex, nofollow">' if noindex else f'<link rel="canonical" href="{canon}">'}
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{BASE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#100b28" media="(prefers-color-scheme: dark)">
<link rel="icon" href="favicon-32x32.png" sizes="32x32" type="image/png">
<link rel="icon" href="favicon-48x48.png" sizes="48x48" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/site.css?v={V}">
<script>document.documentElement.className='js'</script>
{extra}'''
    if schema:
        s += '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>\n'
    return s + '</head>\n'


def header(cur):
    links = ''.join(f'<a href="{h}"{AC if h == cur else ""}>{t}</a>' for h, t in NAV)
    return f'''<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="brand" href="./" aria-label="Arcane Designer home">{BRAND}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
    <nav class="nav" id="nav" aria-label="Main">{links}{btn("contact.html", "Start a project")}</nav>
  </div>
</header>
<main id="main">
'''


def closer(title='Got an old website?', body='Send the link. You&rsquo;ll get back a short list of what&rsquo;s worth changing and what it would cost.'):
    return f'''<section class="closer navy-sec">
  <div class="wrap closer-grid">
    <div data-anim="left">
      <h2>{title}</h2>
      <p>{body}</p>
      {btn("contact.html", "Start a project")}
    </div>
    <img class="arc" src="assets/arc/hands-up.webp" alt="" width="459" height="900" loading="lazy" data-anim="right">
  </div>
</section>
'''


def footer():
    links = ''.join(f'<a href="{h}">{t}</a>' for h, t in NAV + [('contact.html', 'Contact')])
    if LINKEDIN_BIZ:
        links += f'<a href="{LINKEDIN_BIZ}" target="_blank" rel="noopener">LinkedIn</a>'
    return f'''</main>
<footer class="site-foot">
  <div class="wrap">
    <div class="foot-row">
      <div style="display:grid;gap:12px">
        <a class="brand" href="./">{BRAND}</a>
        <span>Website and logo redesigns.<br>Arcane Designer LLC, Spokane, Washington.</span>
      </div>
      <div style="display:grid;gap:12px;align-content:start">
        <nav aria-label="Footer">{links}</nav>
        <a href="mailto:{EMAIL}">{EMAIL}</a>
        <span>&copy; <span id="year">2026</span> Arcane Designer LLC</span>
      </div>
    </div>
  </div>
</footer>
<script src="js/site.js?v={V}" defer></script>
</body>
</html>
'''


def compare(slug, label, pos=16, eager=False, wipe=False):
    ld = '' if eager else ' loading="lazy"'
    w = ' data-scroll-wipe' if wipe else ''
    auto = ' auto' if wipe else ''
    ctrl = '' if wipe else f'<input type="range" min="0" max="100" step="0.1" value="{pos}" aria-label="Drag to compare the old and new {label} website">'
    return f'''<div class="compare{auto}" style="--pos:{pos}%"{w}>
  <img src="assets/samples/{slug}-before.webp" alt="{label} website before the redesign" width="1440" height="900"{ld}>
  <img class="after" src="assets/samples/{slug}-after.webp" alt="{label} website after the redesign" width="1440" height="900"{ld}>
  <span class="tag l"><i></i>Before</span><span class="tag r"><i></i>After</span>
  <span class="handle" aria-hidden="true"></span>
  {ctrl}
</div>'''


LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="7" width="10" height="7.5" rx="2" fill="currentColor"/></svg>'


def browser(url, inner):
    return f'<div class="browser"><div class="bar"><span class="dots"><i></i><i></i><i></i></span><b>{LOCK}{url}</b><span class="dots ghost"></span></div>{inner}</div>'


def hexsvg(label='Six steps'):
    """A 3D hexagon made of six thick triangular pieces. Each piece flies in when its step turns on (js/site.js).
    Each piece is a slab: a top face plus the side walls you'd see from slightly above (walls facing down)."""
    C, R, D = 200, 170, 22           # center, radius, slab thickness
    pts = [(C + R * math.cos(math.radians(-90 + 60 * k)), C + R * math.sin(math.radians(-90 + 60 * k))) for k in range(6)]
    tops = ['url(#hg-teal)', 'url(#hg-blue)', 'url(#hg-pink)'] * 2
    walls = ['url(#hw-teal)', 'url(#hw-blue)', 'url(#hw-pink)'] * 2
    groups = []
    for k in range(6):
        a, b = pts[k], pts[(k + 1) % 6]
        tri = [(C, C), a, b]
        cx, cy = sum(x for x, _ in tri) / 3, sum(y for _, y in tri) / 3
        side = []
        for i in range(3):
            p1, p2 = tri[i], tri[(i + 1) % 3]
            ex, ey = p2[0] - p1[0], p2[1] - p1[1]
            nx, ny = ey, -ex                              # a normal of the edge
            mx, my = (p1[0] + p2[0]) / 2 - cx, (p1[1] + p2[1]) / 2 - cy
            if nx * mx + ny * my < 0: nx, ny = -nx, -ny   # make it point outward
            if ny > 1e-6:                                 # wall faces down, so it is visible
                q = f'{p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} {p2[0]:.1f},{p2[1] + D:.1f} {p1[0]:.1f},{p1[1] + D:.1f}'
                side.append(f'<polygon class="wall" points="{q}" fill="{walls[k]}"/>')
        dx, dy = cx - C, cy - C
        dd = math.hypot(dx, dy)
        tx, ty = dx / dd * 170, dy / dd * 170 - 60
        rot = 28 if k % 2 else -28
        top = ' '.join(f'{x:.1f},{y:.1f}' for x, y in tri)
        bev = ' '.join(f'{cx + (x - cx) * .82:.1f},{cy + (y - cy) * .82:.1f}' for x, y in tri)
        groups.append((cy, f'<g class="tri" data-i="{k}" style="--tx:{tx:.0f}px;--ty:{ty:.0f}px;--rot:{rot}deg">{"".join(side)}<polygon class="top" points="{top}" fill="{tops[k]}"/><polygon class="gloss" points="{top}" fill="url(#hg-gloss)"/><polygon class="bevel" points="{bev}"/><text x="{cx:.1f}" y="{cy:.1f}">{k + 1}</text></g>'))
    groups.sort(key=lambda g: g[0])   # back to front, so lower pieces cover the walls of upper ones
    outline = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return f'''<svg class="hexbuild" viewBox="0 0 400 420" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="hg-teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ff8d3"/><stop offset="1" stop-color="#08cf99"/></linearGradient>
    <linearGradient id="hg-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78cdf2"/><stop offset="1" stop-color="#2385b4"/></linearGradient>
    <linearGradient id="hg-pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3c8"/><stop offset="1" stop-color="#f0547f"/></linearGradient>
    <linearGradient id="hg-gloss" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".38" stop-color="#fff" stop-opacity=".18"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <linearGradient id="hw-teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05a77b"/><stop offset="1" stop-color="#026448"/></linearGradient>
    <linearGradient id="hw-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b6d95"/><stop offset="1" stop-color="#0f4560"/></linearGradient>
    <linearGradient id="hw-pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cc3a63"/><stop offset="1" stop-color="#8a1e3e"/></linearGradient>
  </defs>
  <polygon class="ghost" points="{outline}"/>
  {''.join(g for _, g in groups)}
</svg>'''


FOLDER_PAGES = ('work', 'process', 'pricing', 'questionnaire')   # new pages: served as /name/ with no .html version


def write(name, html):
    # Clean addresses. New pages live in folders (/pricing/), contact keeps contact.html because the old site used it.
    # Everything else is linked from the site root so it works from inside a folder.
    html = re.sub(r'href="(work|process|pricing|questionnaire)\.html', r'href="/\1/', html)
    html = re.sub(r'href="(work|process|pricing|questionnaire)(?=[#?"])', r'href="/\1/', html)
    html = re.sub(r'href="contact\.html', 'href="/contact', html)
    html = re.sub(r'href="contact(?=[#?"])', 'href="/contact', html)
    html = re.sub(r'(src|href)="(css|js|assets)/', r'\1="/\2/', html)
    html = re.sub(r'href="(favicon-[^"]+|apple-touch-icon\.png)"', r'href="/\1"', html)
    html = html.replace('href="./"', 'href="/"')
    stem = name[:-5]
    if stem in FOLDER_PAGES:
        os.makedirs(stem, exist_ok=True)
        if os.path.exists(name):
            os.remove(name)
        name = f'{stem}/index.html'
    with open(name, 'w') as f:
        f.write(html)
    print('wrote', name)


# ---------------------------------------------------------------- shared content
PRICES = [
    dict(key='website', name='Website redesign', amt='1,500', blurb='For most small business websites.',
         items=['Up to 10 pages', 'Three design options to click through', 'One round of changes', 'Built on the platform you already use',
                'Works on phones, tablets and computers', 'Search basics on every page', 'A week of fine-tuning after launch'], main=True),
    dict(key='larger', name='Larger website', amt='3,500', blurb='For sites with more than 10 pages, or extras like online booking, ordering or a small store.',
         items=['11 to 25 pages', 'Everything in the website redesign', 'Booking, ordering or store features set up on your platform',
                'Existing content moved over and tidied', 'A written quote before work starts']),
    dict(key='logo', name='Logo redesign', amt='500', blurb='A cleaner version of your logo, or a new one.',
         items=['Three directions to choose from', 'One round of changes', 'Files for web, print and social media', 'Color and font notes for consistency']),
]

FAQ = [
    ('Is there a monthly fee?', 'No. You pay for the project once. Your platform and hosting bills stay the same and keep going to the same companies.'),
    ('Do you host my website?', 'No. The new design is built on the platform you already use, so nothing moves, and nothing depends on Arcane Designer afterward.'),
    ('Which platforms do you work with?', 'Squarespace, Wix, WordPress, Shopify, Webflow and GoDaddy cover most sites. On something else? Send the link and you&rsquo;ll get a straight answer.'),
    ('Do I have to share my password?', 'No. Most platforms let you add a helper account with its own login. When the project ends, you delete it.'),
    ('How long does it take?', 'It depends on the size of the site and how quickly feedback comes back. You&rsquo;ll get a rough timeline with your quote.'),
    ('How does payment work?', 'Half at the start and half at launch, through Stripe invoices. Card or bank transfer both work.'),
    ('What if my site needs more than the starting price covers?', 'You&rsquo;ll get a written quote before anything starts, and it won&rsquo;t change without your OK.'),
    ('Do you change the words on my site?', 'Only if you want us to. We can keep your current wording exactly as it is, lightly tidy it, or write new sections where a page needs them. Rewriting every page from scratch can be added to the quote.'),
    ('Do you use AI?', 'Yes, for research, sketching ideas, building faster and catching mistakes. Every design and page is still reviewed by a person before you see it.'),
    ('Where are you based?', 'Spokane, Washington. The work is done remotely, so it doesn&rsquo;t matter where your business is.'),
]

ORG = {
    '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': BASE + '/#business',
    'name': 'Arcane Designer', 'legalName': 'Arcane Designer LLC', 'url': BASE + '/',
    'logo': BASE + '/android-chrome-512x512.png', 'image': BASE + '/assets/og.png', 'email': EMAIL,
    'description': 'One-time website and logo redesigns for small businesses, based in Spokane, Washington.',
    'founder': {'@type': 'Person', 'name': 'Nathan Gellatly'},
    'address': {'@type': 'PostalAddress', 'addressLocality': 'Spokane', 'addressRegion': 'WA', 'addressCountry': 'US'},
    'areaServed': [{'@type': 'City', 'name': 'Spokane'}, {'@type': 'Country', 'name': 'United States'}],
    'priceRange': '$500 to $3,500+',
    'makesOffer': [{'@type': 'Offer', 'name': p['name'], 'description': p['blurb'],
                    'priceSpecification': {'@type': 'PriceSpecification', 'minPrice': int(p['amt'].replace(',', '')), 'priceCurrency': 'USD'}} for p in PRICES],
}
if LINKEDIN_BIZ:
    ORG['sameAs'] = [LINKEDIN_BIZ]

# Work samples. Only ones with both images on disk are shown.
SAMPLES_ALL = [
    dict(slug='northbank-plumbing', name='Northbank Plumbing &amp; Heat', kind='Plumbing and furnace repair', url='northbankplumbing.com',
         notes=[('Call in one tap', 'When the basement is flooding, the phone number should be the biggest thing on the page.'),
                ('Less to read', 'The old site said everything at once. The new one says the important part, big.'),
                ('Built for phones', 'Most emergency calls start on a phone, so the layout started there too.')]),
    dict(slug='hillyard-hounds', name='Hillyard Hounds', kind='Dog grooming and daycare', url='hillyardhounds.com',
         notes=[('Warm and human', 'Real dogs, real people, soft shapes. It feels like a place you&rsquo;d leave your dog.'),
                ('Booking up front', 'Booking a groom used to be buried. Now it&rsquo;s one tap away.')]),
    dict(slug='sunny-side-cafe', name='Sunny Side Caf&eacute;', kind='Breakfast caf&eacute;', url='sunnysidecafe.com',
         notes=[('All sunshine', 'Bright colors, wavy shapes and a lot of pancakes.'),
                ('Menu in reach', 'Today&rsquo;s menu and hours, without downloading a PDF.')]),
    dict(slug='lilac-row-bakery', name='Lilac Row Bakery', kind='Neighborhood bakery', url='lilacrowbakery.com',
         notes=[('Hours up top', 'They used to be buried in a sidebar. Now they sit above everything else.'),
                ('Food first', 'A warm, editorial look built around what they actually bake.'),
                ('One clear next step', 'Order ahead, or come by. Everything else gets out of the way.')]),
]
# ferrous-coffee is parked (source files kept in tools/samples-src) until it is redone.
SAMPLES = [s for s in SAMPLES_ALL if os.path.exists(f'assets/samples/{s["slug"]}-after.webp') and os.path.exists(f'assets/samples/{s["slug"]}-before.webp')]
def _logo(slug, which):
    for ext in ('svg', 'png'):
        if os.path.exists(f'assets/logos/{slug}-{which}.{ext}'):
            return f'assets/logos/{slug}-{which}.{ext}'
SHOW_LOGOS = False   # hidden until the logo redesigns are redone with Nathan
LOGOS = [] if not SHOW_LOGOS else [(s, _logo(s['slug'], 'old'), _logo(s['slug'], 'new')) for s in SAMPLES_ALL if _logo(s['slug'], 'old') and _logo(s['slug'], 'new')]

STEPS = [
    ('Send your site', 'Use the contact form or email a link. You&rsquo;ll get back what&rsquo;s worth changing, and a price.'),
    ('Deposit and questionnaire', 'Half the price up front, by card or bank transfer. Then a short questionnaire about your customers, your taste and what has to stay.'),
    ('Three designs to choose from', 'Three different directions, built as real web pages you can click through on your phone. Pick one, or mix parts of each.'),
    ('One round of changes', 'Send one list of changes. They get made, and you sign off before anything is built.'),
    ('Build and launch', 'The new design goes onto the platform you already use. You add a helper login, so your password stays yours. The second half is due at launch.'),
    ('A week of fine-tuning', 'For a week after launch, anything you want adjusted gets fine-tuned. Then you delete the helper login, and the site is entirely yours.'),
]
STEP_COLORS = ['var(--teal-ink)', 'var(--blue-ink)', 'var(--pink-ink)'] * 2

# ---------------------------------------------------------------- home
s0 = next(x for x in SAMPLES_ALL if x['slug'] == 'hillyard-hounds')
home = head('Arcane Designer | Website Redesigns for Small Businesses',
            'One-time website redesigns for small businesses, from $1,500. Pick from three designs, built on the platform you already use, no monthly fees. Logo redesigns from $500.',
            'index.html', extra=f'<link rel="preload" as="image" href="assets/samples/{s0["slug"]}-before.webp">\n', schema=ORG)
home += header('')
home += f'''<section class="hero-x dark-stage">
  <div class="floaters" aria-hidden="true"><img class="fl" src="assets/brand/hex-teal.webp" alt="" style="--x:7%;--y:18%;--s:120px;--k:0.7;--r:-14deg;--i:0"><img class="fl" src="assets/brand/hex-pink.webp" alt="" style="--x:86%;--y:14%;--s:92px;--k:0.5;--r:10deg;--i:1"><img class="fl" src="assets/brand/hex-blue.webp" alt="" style="--x:14%;--y:70%;--s:70px;--k:0.9;--r:8deg;--i:2"><img class="fl" src="assets/brand/hex-teal.webp" alt="" style="--x:80%;--y:64%;--s:140px;--k:0.35;--r:-6deg;--i:3"><img class="fl" src="assets/brand/hex-pink.webp" alt="" style="--x:27%;--y:8%;--s:46px;--k:1.1;--r:20deg;--i:4"><img class="fl" src="assets/brand/hex-blue.webp" alt="" style="--x:66%;--y:6%;--s:58px;--k:0.8;--r:-18deg;--i:5"><img class="fl" src="assets/brand/hex-pink.webp" alt="" style="--x:93%;--y:48%;--s:44px;--k:1.2;--r:4deg;--i:6"><img class="fl" src="assets/brand/hex-teal.webp" alt="" style="--x:3%;--y:48%;--s:40px;--k:1.3;--r:30deg;--i:7"></div>
  <div class="wrap hero-x-inner">
    <h1 class="tag"><span class="w">Look</span> <span class="w">the</span> <span class="w">part.</span></h1>
    <p class="big">Website and logo redesigns for small businesses that have outgrown their old look. One project, built on the platform you already have, and then it&rsquo;s all yours.</p>
    <div class="row">{btn("contact.html", "Start a project")}<a class="tlink light" href="work.html">See the work</a></div>
    <p class="price-note">Websites from $1,500 <i></i> Logos from $500</p>
  </div>
</section>

<section class="pin-reveal dark-stage" aria-label="Example redesign: scroll to see the new version">
  <div class="pin-sticky">
    <div class="wrap">
      <div class="hero-stage">
        <div class="perch"><img src="assets/arc/relaxed.webp" alt="Arc, the Arcane Designer mascot, lounging on top of the browser window" width="900" height="452"></div>
        <div class="bubble" aria-hidden="true"><span data-a="Scroll down. Watch this." data-b="Much better.">Scroll down. Watch this.</span></div>
        {browser(s0['url'], compare(s0['slug'], s0['name'], 100, eager=True, wipe=True))}
      </div>
    </div>
  </div>
</section>

<section class="sec" style="padding-top:clamp(40px,5vw,70px)">
  <div class="wrap split-head">
    <h2 data-anim="left">No two businesses should look alike.</h2>
    <div data-anim="right" style="display:grid;gap:18px">
      <p class="big">A plumber, a dog groomer and a breakfast caf&eacute; need very different things from a website.</p>
      <a class="tlink" href="work.html" style="justify-self:start">See them up close</a>
    </div>
  </div>
  <div class="marquee" data-anim="up"><div class="track">
'''
thumbs = ''.join(f'<a class="thumb" href="work.html#{s["slug"]}"><div class="img"><img src="assets/samples/{s["slug"]}-after.webp" alt="" width="1440" height="900" loading="lazy"></div><span>{s["name"]} <em>{s["kind"]}</em></span></a>' for s in SAMPLES)
home += thumbs + thumbs.replace('<a class="thumb"', '<a class="thumb" aria-hidden="true" tabindex="-1"')
pins = [(85, 8.6), (85, 26), (8, 52), (14.6, 70), (34, 82.5)]
notes = ['The phone number is in tiny print. On a phone, you&rsquo;d have to zoom in just to tap it.',
         'Coupons that expired in 2013. Not a great look.',
         'A narrow box built for 2009 screens. Huge empty edges on a monitor, squished on a phone.',
         'A paragraph stuffed with &ldquo;Spokane plumber&rdquo; for Google. People skip right over it.',
         '&ldquo;Best viewed in Internet Explorer 8.&rdquo; That browser retired years ago.']
pin_html = ''.join(f'<span class="pin" data-n="{i}" style="left:{x}%;top:{y}%;--i:{i}">{i + 1}</span>' for i, (x, y) in enumerate(pins))
note_html = ''.join(f'<li data-n="{i}" style="--i:{i}"><b>{i + 1}</b><span>{t}</span></li>' for i, t in enumerate(notes))
home += f'''  </div></div>
</section>

<section class="sec redpen-sec">
  <div class="wrap">
    <div class="split-head">
      <h2 data-anim="left">Sound familiar?</h2>
      <p class="big" data-anim="right">The kinds of problems we run into on old sites all the time.</p>
    </div>
    <div class="redpen">
      {browser('northbankplumbing.com', f'<div class="shot"><img src="assets/samples/redpen-plumbing.webp" alt="An outdated plumbing company website from around 2013" width="1440" height="900" loading="lazy">{pin_html}</div>')}
      <ol class="redpen-notes">{note_html}</ol>
    </div>
  </div>
</section>

<section class="pin-steps" aria-label="How it works">
  <div class="pin-sticky">
    <div class="wrap mini-steps">
      {hexsvg(label='The six steps')}
      <div>
        <h2>Six steps, start to finish.</h2>
        <ol>{''.join(f'<li data-step="{i}">{t}</li>' for i, (t, _) in enumerate(STEPS))}</ol>
        <a class="tlink" href="process.html">How each step works</a>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="reviews" hidden>
  <div class="wrap">
    <h2 style="margin-bottom:40px">What clients say.</h2>
    <div class="reviews" data-reviews aria-roledescription="carousel" aria-label="Client reviews">
      <div class="review-stage" aria-live="polite"></div>
      <div class="review-ctrls">
        <button class="arrow prev" type="button" aria-label="Previous review"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 5v14L6 12z"/></svg></button>
        <button class="arrow next" type="button" aria-label="Next review"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 5v14l9-7z"/></svg></button>
        <div class="dots"></div>
      </div>
    </div>
  </div>
</section>

<section class="sec gray-sec">
  <div class="wrap">
    <div class="split-head">
      <h2 data-anim="left">Prices, up front.</h2>
      <p class="big" data-anim="right">Most small business sites fit the first one. If yours needs more, you&rsquo;ll get a quote before anything starts.</p>
    </div>
    <div class="prices">
'''
for i, p in enumerate(PRICES):
    home += f'''      <a class="price link-card{" main" if p.get("main") else ""}" href="pricing.html#plan-{p["key"]}" data-anim="up" style="--d:{i * .12:.2f}s"><h3>{p["name"]}</h3><span class="from">Starting at</span><span class="amt">${p["amt"]}</span><p>{p["blurb"]}</p><span class="see">See what&rsquo;s included</span></a>
'''
home += '''    </div>
  </div>
</section>
'''
home += """<section class="pin-laptop navy-sec" aria-label="Where to next">
  <div class="pin-sticky">
    <div class="wrap laptop-scene">
      <div class="arc-desk"><img src="assets/arc/laptop.webp" alt="Arc working on a laptop" width="849" height="1012" loading="lazy"><span class="emit" aria-hidden="true"></span></div>
      <div class="launch">
        <h2>Where to next?</h2>
        <div class="cards">
          <a class="lcard" href="work.html"><b>Work</b><span>Every before and after, up close.</span></a>
          <a class="lcard" href="process.html"><b>Process</b><span>How a project runs, step by step.</span></a>
          <a class="lcard" href="pricing.html"><b>Pricing</b><span>What it costs and what&rsquo;s included.</span></a>
          <a class="lcard go" href="contact.html"><b>Start a project</b><span>Send your site and we&rsquo;ll take a look.</span></a>
        </div>
      </div>
    </div>
  </div>
</section>
"""
home += footer()
write('index.html', home)

# ---------------------------------------------------------------- work
work = head('Work | Arcane Designer Website Redesigns',
            'Before and after website redesigns by Arcane Designer, each in a different style. Drag the slider to compare old and new.',
            'work.html')
work += header('work.html')
work += '''<section class="intro glow">
  <div class="wrap work-intro">
    <div data-anim="up">
      <h1>Before and after.</h1>
      <p class="big">Drag the slider on any of them. A few examples, each in a different style. Client projects and their reviews will join them here.</p>
    </div>
    <img src="assets/arc/presents.webp" alt="" width="499" height="900" data-anim="right">
  </div>
</section>
<section class="sec" style="padding-top:30px">
  <div class="wrap work-list">
'''
for s in SAMPLES:
    notes = ''.join(f'<div><b>{t}</b>{d}</div>' for t, d in s['notes'])
    work += f'''    <article class="work-item" id="{s["slug"]}">
      <div class="meta" data-anim="up"><h3>{s["name"]}</h3><span class="kind">{s["kind"]} &middot; <i>example</i></span></div>
      <div data-anim="tilt">{browser(s["url"], compare(s["slug"], s["name"]))}</div>
      <div class="work-notes" data-anim="up">{notes}</div>
    </article>
'''
work += '''  </div>
</section>
'''
if LOGOS:
    work += '''<section class="sec gray-sec">
  <div class="wrap">
    <div class="split-head"><h2 data-anim="left">Logo redesigns.</h2><p class="big" data-anim="right">The same made-up businesses, old logo and new.</p></div>
    <div class="logos">
'''
    for i, (s, lo, ln) in enumerate(LOGOS):
        work += f'''      <figure class="logo-card" data-anim="up" style="--d:{(i % 3) * .1:.1f}s"><div><small>Old</small><img src="{lo}" alt="Old {s["name"]} logo" loading="lazy"></div><div><small>New</small><img src="{ln}" alt="New {s["name"]} logo" loading="lazy"></div><figcaption>{s["name"]}</figcaption></figure>
'''
    work += '''    </div>
  </div>
</section>
'''
work += closer('Want yours on this page?', 'Send your website and see what it could look like.') + footer()
write('work.html', work)

# ---------------------------------------------------------------- process
proc = head('How It Works | Arcane Designer',
            'How an Arcane Designer website redesign works, in six steps: send your site, questionnaire, three clickable designs, one round of changes, build and launch, a week of fine-tuning.',
            'process.html')
proc += header('process.html')
proc += '''<section class="intro glow">
  <div class="wrap proc-intro">
    <div data-anim="up">
      <h1>From old site to new one, in six steps.</h1>
      <p class="big">What happens, and what you&rsquo;ll need to do along the way.</p>
    </div>
    <img class="arc" src="assets/arc/stands.webp" alt="" width="336" height="900" data-anim="right">
  </div>
</section>
<section class="sec" style="padding-top:10px">
  <div class="wrap proc">
    <div class="proc-art">''' + hexsvg(label='Progress through the six steps') + '''<div class="count">6 steps</div></div>
    <div class="proc-steps">
'''
for i, (t, d) in enumerate(STEPS):
    proc += f'''      <div class="proc-step" style="--c:{STEP_COLORS[i]}"><span class="n">{i + 1:02d}</span><h3>{t}</h3><p>{d}</p></div>
'''
who = f'<a class="tlink" href="{LINKEDIN_PERSON}" target="_blank" rel="noopener">Nathan Gellatly</a>' if LINKEDIN_PERSON else '<span class="tlink">Nathan Gellatly</span>'
proc += f'''    </div>
  </div>
</section>
<section class="sec navy-sec">
  <div class="wrap ai-block">
    <img src="assets/arc/presents-floor.webp" alt="" width="499" height="900" loading="lazy" data-anim="left">
    <div class="copy" data-anim="right">
      <h2>Yes, we use AI.</h2>
      <p>It&rsquo;s how we keep projects quick and prices low without cutting corners on quality. We just didn&rsquo;t want it to be a surprise.</p>
    </div>
  </div>
</section>
<section class="sec">
  <div class="wrap faq-wrap">
    <h2 data-anim="left">Questions.</h2>
    <div class="faq" data-anim="up">
'''
for q, a in FAQ[:6]:
    proc += f'      <details><summary>{q}</summary><div><p>{a}</p></div></details>\n'
proc += f'''    </div>
  </div>
</section>
<section class="sec gray-sec" style="padding-block:clamp(70px,8vw,110px)">
  <div class="wrap about">
    <h2 data-anim="left">Who&rsquo;s behind it.</h2>
    <div class="copy" data-anim="right">
      <p>Arcane Designer is a one-person design studio in Spokane, Washington, run by {who}.</p>
    </div>
  </div>
</section>
'''
proc += closer() + footer()
write('process.html', proc)

# ---------------------------------------------------------------- pricing
faq_schema = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
    {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a.replace('&rsquo;', '’').replace('&ldquo;', '“').replace('&rdquo;', '”')}} for q, a in FAQ]}
pr = head('Pricing | Website Redesigns from $1,500 | Arcane Designer',
          'Website redesigns from $1,500 for up to 10 pages. Larger sites from $3,500, logo redesigns from $500. Paid half up front and half at launch, no monthly fees.',
          'pricing.html', schema=[ORG, faq_schema])
pr += header('pricing.html')
pr += '''<section class="intro glow">
  <div class="wrap split-head" style="margin-bottom:0">
    <h1 data-anim="left">What it costs.</h1>
    <p class="big" data-anim="right" style="margin:0">One project, paid half at the start and half at launch. Bigger jobs get a written quote first.</p>
  </div>
</section>
<section class="sec" style="padding-top:20px">
  <div class="wrap">
    <div class="prices">
'''
for i, p in enumerate(PRICES):
    items = ''.join(f'<li>{x}</li>' for x in p['items'])
    flag = '<span class="flag">Most common</span>' if p.get('main') else ''
    pr += f'''      <div class="price{" main" if p.get("main") else ""}" id="plan-{p["key"]}" data-anim="up" style="--d:{i * .12:.2f}s">{flag}<h3>{p["name"]}</h3><span class="from">Starting at</span><span class="amt">${p["amt"]}</span><p>{p["blurb"]}</p><ul>{items}</ul>{btn("contact.html?plan=" + p["key"], "Get started", "" if p.get("main") else "dark")}</div>
'''
pr += '''    </div>
    <p class="muted small" style="margin-top:30px">These are early prices and will go up as the portfolio grows. Doing a website and a logo together lowers the total.</p>
  </div>
</section>
<section class="sec gray-sec" style="padding-block:clamp(56px,6vw,84px)">
  <div class="wrap extra">
    <div class="copy" data-anim="left">
      <h2 style="color:var(--ink)">What stays with you.</h2>
      <p>Your platform, hosting and domain stay with you, billed by the same companies as now. Nothing gets marked up or taken over.</p>
      <p>There&rsquo;s no maintenance plan. After the week of fine-tuning the project is done, and later changes can be quoted as a small new project.</p>
    </div>
    <ul class="checks" data-anim="right" style="align-self:center">
      <li>Your site keeps its address and its accounts</li>
      <li>You own the designs and the words</li>
      <li>Layouts tested on real phones</li>
      <li>Search basics on every page</li>
    </ul>
  </div>
</section>
<section class="sec" id="faq">
  <div class="wrap faq-wrap">
    <h2 data-anim="left">Questions.</h2>
    <div class="faq" data-anim="up">
'''
for q, a in FAQ:
    pr += f'      <details><summary>{q}</summary><div><p>{a}</p></div></details>\n'
pr += '''    </div>
  </div>
</section>
'''
pr += closer() + footer()
write('pricing.html', pr)

# ---------------------------------------------------------------- contact
ct = head('Start a Project | Arcane Designer',
          'Send Arcane Designer a link to your current website. You will get back ideas for what to change and a price.',
          'contact.html')
ct += header('contact.html')
ct += f'''<section class="intro glow contact-intro">
  <div class="wrap">
    <img src="assets/arc/presents-floor.webp" alt="" width="499" height="900" data-anim="left">
    <div data-anim="up">
      <h1>Start a project.</h1>
      <p class="big">Send a link to your current site and a little about what you want. You&rsquo;ll get a reply by email with ideas and a price.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:0">
  <div class="wrap contact-grid">
    <form class="form form-card" data-form="contact" novalidate data-anim="up">
      <div class="row">
        <div class="field"><label for="c-name">Your name</label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-biz">Business name</label><input id="c-biz" name="business" autocomplete="organization" required></div>
      </div>
      <div class="row">
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="c-site">Current website</label><input id="c-site" name="website" type="text" inputmode="url" placeholder="yourbusiness.com" required></div>
      </div>
      <fieldset class="field">
        <legend>Which package fits? <span class="opt">(optional, pick any)</span></legend>
        <div class="choices">
          <label><input type="checkbox" name="package" value="Website redesign (from $1,500)" data-plan="website"> Website redesign <small>$1,500+</small></label>
          <label><input type="checkbox" name="package" value="Larger website (from $3,500)" data-plan="larger"> Larger website <small>$3,500+</small></label>
          <label><input type="checkbox" name="package" value="Logo redesign (from $500)" data-plan="logo"> Logo redesign <small>$500+</small></label>
          <label><input type="checkbox" name="package" value="Something else"> Something else</label>
          <label><input type="checkbox" name="package" value="Not sure yet"> Not sure yet</label>
        </div>
        <a class="hint tlink" href="pricing.html" style="justify-self:start">Compare packages</a>
      </fieldset>
      <div class="field"><label for="c-msg">Anything else? <span class="opt">(optional)</span></label><span class="hint">Something else you need, a deadline, a budget. Whatever&rsquo;s useful.</span><textarea id="c-msg" name="message"></textarea></div>
      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-foot"><button class="btn" type="submit"><span>Send it over</span></button></div>
      <div class="form-status" role="status" tabindex="-1" hidden></div>
    </form>
    <aside class="contact-side" data-anim="right">
      <div class="card"><h3>Prefer email?</h3><a class="mail" href="mailto:{EMAIL}">{EMAIL}</a></div>
      <div class="card"><h3>Or find us on LinkedIn</h3><a class="tlink" href="{LINKEDIN_BIZ}" target="_blank" rel="noopener" style="justify-self:start">Arcane Designer on LinkedIn</a></div>
      <div class="card"><h3>What happens next</h3>
        <ol class="next-steps">
          <li><b>1</b><span>You get a short list of what&rsquo;s worth changing, and a price.</span></li>
          <li><b>2</b><span>If you want to go ahead, a questionnaire and a deposit invoice come next.</span></li>
          <li><b>3</b><span>Then the three designs. <a class="tlink" href="process.html">The full process</a></span></li>
        </ol>
      </div>
    </aside>
  </div>
</section>
'''
ct += footer()
write('contact.html', ct)

# ---------------------------------------------------------------- questionnaire
def fld(id_, label, hint='', kind='textarea', req=False, ph=''):
    r = ' required' if req else ''
    h = f'<span class="hint">{hint}</span>' if hint else ''
    p = f' placeholder="{ph}"' if ph else ''
    ctrl = f'<textarea id="q-{id_}" name="{id_}"{r}{p}></textarea>' if kind == 'textarea' else f'<input id="q-{id_}" name="{id_}" type="{kind}"{r}{p}>'
    return f'<div class="field"><label for="q-{id_}">{label}</label>{h}{ctrl}</div>'


def choices(name, legend, opts, typ='checkbox', hint=''):
    h = f'<span class="hint">{hint}</span>' if hint else ''
    o = ''.join(f'<label><input type="{typ}" name="{name}" value="{x}"> {x}</label>' for x in opts)
    return f'<fieldset class="field"><legend>{legend}</legend>{h}<div class="choices">{o}</div></fieldset>'


QS = [
    ('About you', [
        '<div class="row">' + fld('name', 'Your name', kind='text', req=True) + fld('business', 'Business name', kind='text', req=True) + '</div>',
        '<div class="row">' + fld('email', 'Email', kind='email', req=True) + fld('website', 'Current website', kind='text', ph='yourbusiness.com') + '</div>',
        fld('about', 'In a few sentences, what does your business do?', 'Say it the way you would to a new customer.'),
        fld('different', 'What makes you different from others who do the same thing?'),
    ]),
    ('Your customers', [
        fld('customers', 'Who are your best customers?', 'Age, where they live, what they need, how they usually find you.'),
        fld('action', 'What&rsquo;s the one thing you most want people to do on your website?', 'Call, book, order, visit, request a quote, something else.'),
        fld('questions', 'What do customers ask you about most often?', 'These usually belong on the site.'),
    ]),
    ('Your current website', [
        fld('keep', 'What do you like about your current site and want to keep?'),
        fld('fix', 'What frustrates you about it, or what do customers complain about?'),
        choices('platform', 'Which platform is it built on?', ['Squarespace', 'Wix', 'WordPress', 'Shopify', 'GoDaddy', 'Webflow', 'Not sure', 'Other'], 'radio', 'Not sure is fine. It&rsquo;s easy to tell from the site.'),
        fld('pages', 'Which pages should the new site have?', 'A rough list is great: Home, Services, About, Contact, and so on.'),
    ]),
    ('Look and feel', [
        fld('likes', 'Share a few websites you like, and what you like about them', 'They don&rsquo;t need to be in your industry.'),
        fld('dislikes', 'Any websites or styles you really don&rsquo;t like?'),
        choices('feel', 'Which words fit how you want to come across?', ['Warm', 'Professional', 'Playful', 'Calm', 'Bold', 'Classic', 'Modern', 'Rugged', 'Elegant', 'Down to earth', 'Premium', 'Quirky'], hint='Pick as many as you like.'),
        fld('colors', 'Colors and fonts', 'Brand colors you have, colors you love, colors you never want to see.'),
        choices('logo', 'Your logo', ['Keep it as is', 'Open to a refresh', 'I need a new one', 'I don&rsquo;t have one'], 'radio'),
    ]),
    ('Must do, must not do', [
        fld('dos', 'Things the new site must do or include'),
        fld('donts', 'Things it must never do or include'),
    ]),
    ('Practical bits', [
        fld('photos', 'Do you have photos you&rsquo;d like to use?', 'Of your work, your space, your team. Phone photos are often great.'),
        fld('deadline', 'Any deadline or busy season to plan around?', kind='text'),
        fld('access', 'Who manages your website account today?', 'You, someone on your team, a past designer, nobody sure.', kind='text'),
        fld('notes', 'Anything else on your mind?'),
    ]),
]
qn = head('Project Questionnaire | Arcane Designer', 'Questionnaire for Arcane Designer redesign clients.', 'questionnaire.html', noindex=True)
qn += header('')
qn += '''<section class="intro glow">
  <div class="wrap q-wrap">
    <h1 data-anim="up">About your business.</h1>
    <p class="big" data-anim="up" style="--d:.1s">Takes about 20 minutes. Short answers are fine, and you can skip anything. Your answers save in this browser, so you can finish later.</p>
  </div>
</section>
<section class="sec" style="padding-top:0">
  <div class="wrap q-wrap">
    <form class="form" data-form="questionnaire" data-draft data-thanks="Got it, thank you. Next up: your three designs." novalidate>
      <div class="q-progress" aria-hidden="true"><div class="track"><div class="fill"></div></div><div class="lbl"><span class="count"></span><span>Saved in this browser</span></div></div>
'''
for i, (title, fields) in enumerate(QS, 1):
    qn += f'      <div class="q-section"><h2><span class="n">{i}</span>{title}</h2>{"".join(fields)}</div>\n'
qn += '''      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div><button class="btn" type="submit"><span>Send my answers</span></button></div>
      <div class="form-status" role="status" tabindex="-1" hidden></div>
    </form>
  </div>
</section>
'''
qn += footer()
write('questionnaire.html', qn)

# ---------------------------------------------------------------- 404
nf = head('Page Not Found | Arcane Designer', 'This page does not exist.', '404.html', extra='<base href="/">\n', noindex=True)
nf += header('')
nf += f'''<section class="sec glow">
  <div class="wrap" style="display:grid;grid-template-columns:auto 1fr;gap:clamp(24px,5vw,60px);align-items:center;max-width:960px">
    <img src="assets/arc/flabbergasted.webp" alt="" width="395" height="900" style="width:clamp(110px,14vw,170px)">
    <div style="display:grid;gap:22px;justify-items:start">
      <h1 style="font-size:clamp(2.4rem,1.6rem + 3vw,4rem)">That page isn&rsquo;t here.</h1>
      <p class="big">It probably moved when the site was redesigned. A little ironic.</p>
      {btn("/", "Go to the home page")}
    </div>
  </div>
</section>
'''
nf += footer()
write('404.html', nf)
