#!/usr/bin/env python3
"""Writes the site's HTML pages. Shared header, footer and head live here so every page matches.
Run from the repo root:  python3 tools/pages.py
Edit the copy in this file, then re-run. The generated .html files are what GitHub Pages serves."""
import json, os

V = '2'  # bump to bust caches on css/js changes
BASE = 'https://arcanedesigner.com'
FONTS = ('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@600'
         '&family=Figtree:wght@400;500;600;700&family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..700,0..100;1,9..144,400..600,0..100&display=swap')

LOGO = '''<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
<polygon points="20,3 29.5,8.5 29.5,19.5 20,25 10.5,19.5 10.5,8.5" fill="#238DBB"/>
<polygon points="14.5,14 24,19.5 24,30.5 14.5,36 5,30.5 5,19.5" fill="#FF6B93"/>
<polygon points="25.5,14 35,19.5 35,30.5 25.5,36 16,30.5 16,19.5" fill="#08D8A0"/></g></svg>'''

NAV = [('work.html', 'Work'), ('process.html', 'Process'), ('pricing.html', 'Pricing')]
ARROW = '<span class="arr" aria-hidden="true">→</span>'


def head(title, desc, path, extra='', noindex=False, schema=None):
    canon = BASE + '/' + ('' if path == 'index.html' else path)
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
<meta name="theme-color" content="#f7f2ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#130d2c" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32x32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/site.css?v={V}">
{extra}'''
    if schema:
        s += '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>\n'
    return s + '</head>\n'


AC = ' aria-current="page"'


def header(cur):
    links = ''.join(f'<a href="{h}"{AC if h == cur else ""}>{t}</a>' for h, t in NAV)
    cc = AC if cur == 'contact.html' else ''
    return f'''<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="brand" href="./" aria-label="Arcane Designer home">{LOGO}<span>Arcane Designer</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    <nav class="nav" id="nav" aria-label="Main">{links}<a class="btn" href="contact.html"{cc}>Start a project</a></nav>
  </div>
</header>
<main id="main">
'''


def closer(title='Send me your website. <em>I&rsquo;ll tell you what I&rsquo;d change.</em>',
           body='No pitch deck and no pressure. If your site is already in good shape, I&rsquo;ll tell you that too.'):
    return f'''<section class="closer">
  <div class="wrap" style="position:relative">
    <div class="hexes" data-set="b"></div>
    <div class="closer-grid">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
        <div class="actions"><a class="btn teal" href="contact.html">Start a project {ARROW}</a><a class="btn ghost" href="pricing.html">See pricing</a></div>
      </div>
      <img class="arc" src="assets/arc/hands-up.webp" alt="" width="328" height="640" loading="lazy">
    </div>
  </div>
</section>
'''


def footer():
    links = ''.join(f'<a href="{h}">{t}</a>' for h, t in NAV + [('contact.html', 'Contact')])
    return f'''</main>
<footer class="site-foot">
  <div class="zig" aria-hidden="true" style="margin-top:-34px;margin-bottom:28px"></div>
  <div class="wrap">
    <div class="foot-row">
      <div style="display:grid;gap:10px">
        <a class="brand" href="./">{LOGO}<span>Arcane Designer</span></a>
        <span>Website and logo redesigns for small businesses.<br>Arcane Designer LLC, Spokane, Washington.</span>
      </div>
      <div style="display:grid;gap:12px;align-content:start">
        <nav aria-label="Footer">{links}</nav>
        <span>&copy; <span id="year">2026</span> Arcane Designer LLC</span>
      </div>
    </div>
  </div>
</footer>
<script src="js/site.js?v={V}" defer></script>
</body>
</html>
'''


def compare(slug, label, pos=16, eager=False):
    ld = '' if eager else ' loading="lazy"'
    return f'''<div class="compare" style="--pos:{pos}%">
  <img src="assets/samples/{slug}-before.webp" alt="{label} website before the redesign" width="1440" height="900"{ld}>
  <img class="after" src="assets/samples/{slug}-after.webp" alt="{label} website after the redesign" width="1440" height="900"{ld}>
  <span class="tag l">Before</span><span class="tag r">After</span>
  <span class="handle" aria-hidden="true"></span>
  <input type="range" min="0" max="100" value="{pos}" aria-label="Drag to compare the old and new {label} website">
</div>'''


def browser(url, inner):
    return f'<div class="browser"><div class="bar"><i></i><i></i><i></i><b>{url}</b></div>{inner}</div>'


def write(name, html):
    with open(name, 'w') as f:
        f.write(html)
    print('wrote', name)


# ---------------------------------------------------------------- data
PRICES = [
    dict(name='Website redesign', amt='1,500', blurb='For most small business websites. A fresh design for the site you already have.',
         items=['Up to 10 pages', 'Three clickable design options to choose from', 'One round of changes on the design you pick',
                'Built on the platform you already use', 'Looks right on phones, tablets and desktops',
                'Search basics: page titles, descriptions, headings, image text', 'A week of fixes after launch'], main=True),
    dict(name='Larger website', amt='3,500', blurb='For bigger sites, or ones with moving parts like booking, menus, or a small shop.',
         items=['11 to 25 pages', 'Everything in the website redesign', 'Booking, menu, store or form setup on your platform',
                'Moving or tidying existing content', 'A quote before any work starts']),
    dict(name='Logo redesign', amt='500', blurb='A cleaner, more modern take on your logo, or a new one if you&rsquo;re starting over.',
         items=['Three directions to choose from', 'One round of changes', 'Files for web, print and social media',
                'Color and font notes so it stays consistent']),
]

FAQ = [
    ('Is there a monthly fee?', 'No. You pay for the project and that&rsquo;s it. Your hosting and platform bills (Squarespace, Wix, WordPress hosting and so on) stay exactly as they are, paid by you to them.'),
    ('Do you host my website?', 'No, and that&rsquo;s on purpose. I build on the platform you already use, so you never have to move your site or depend on me to keep it running.'),
    ('Which platforms do you work with?', 'Squarespace, Wix, WordPress, Shopify, Webflow, GoDaddy and Showit cover most of what I see. If you&rsquo;re on something else, send me the link and I&rsquo;ll tell you whether it works.'),
    ('Do I have to give you my password?', 'No. Almost every platform lets you add me as a collaborator with my own login. When the project is done, you remove me with one click, and I send you a short checklist to confirm nothing of mine is left behind.'),
    ('How long does it take?', 'Most projects take two to three weeks from questionnaire to launch. The biggest factor is how quickly feedback comes back.'),
    ('How does payment work?', 'Half when we start, half when your new site goes live. I send invoices through Stripe, and you can pay by card or bank transfer.'),
    ('What if my site needs more than the starting price covers?', 'Then I tell you before anything starts. You get a written quote, and nothing changes from it without your OK.'),
    ('Do you write the words on my site?', 'I tidy and tighten the words you already have, and I&rsquo;ll write short new sections when a page needs them. If you want every page rewritten from scratch, we&rsquo;ll include that in the quote.'),
    ('Do you use AI?', 'Yes. I use AI tools to move faster, try more design ideas and catch mistakes. Every design decision and every page is checked by me before you see it.'),
    ('Do you only work with Spokane businesses?', 'Spokane and the surrounding area is my focus, since I can meet you in person. I&rsquo;m happy to work with businesses elsewhere too.'),
]

ORG = {
    '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': BASE + '/#business',
    'name': 'Arcane Designer', 'legalName': 'Arcane Designer LLC', 'url': BASE + '/',
    'logo': BASE + '/android-chrome-512x512.png', 'image': BASE + '/assets/og.png',
    'description': 'One-time website and logo redesigns for small businesses in Spokane, Washington.',
    'founder': {'@type': 'Person', 'name': 'Nathan Gellatly'},
    'address': {'@type': 'PostalAddress', 'addressLocality': 'Spokane', 'addressRegion': 'WA', 'addressCountry': 'US'},
    'areaServed': [{'@type': 'City', 'name': 'Spokane'}, {'@type': 'City', 'name': 'Spokane Valley'}, {'@type': 'AdministrativeArea', 'name': 'Inland Northwest'}],
    'priceRange': '$500 to $3,500+',
    'makesOffer': [{'@type': 'Offer', 'name': p['name'], 'description': p['blurb'].replace('&rsquo;', '’'),
                    'priceSpecification': {'@type': 'PriceSpecification', 'minPrice': int(p['amt'].replace(',', '')), 'priceCurrency': 'USD'}} for p in PRICES],
}

SAMPLES = [
    dict(slug='lilac-row-bakery', name='Lilac Row Bakery', kind='Neighborhood bakery', url='lilacrowbakery.com',
         notes=[('Hours up top', 'The old site hid opening hours in a sidebar. Now they&rsquo;re the first thing you see, next to the address.'),
                ('Food first', 'Big, warm imagery of what they actually bake, instead of clip art and a welcome paragraph.'),
                ('One clear next step', 'Order a cake or come by. Everything else gets out of the way.')]),
    dict(slug='northbank-plumbing', name='Northbank Plumbing &amp; Heat', kind='Plumbing and furnace repair', url='northbankplumbing.com',
         notes=[('Call in one tap', 'When your basement is flooding you want a phone number, not a slideshow. It&rsquo;s now the biggest button on the page.'),
                ('Trust, quickly', 'The next open slot, who&rsquo;s coming, and a two-year warranty, all before you scroll.'),
                ('Built for phones', 'Most emergency calls start on a phone, so the layout was planned for that first.'),
                ('Services you can scan', 'A cluttered list became a short, readable set of what they fix.')]),
    dict(slug='hillyard-hounds', name='Hillyard Hounds', kind='Dog grooming and daycare', url='hillyardhounds.com',
         notes=[('Personality that fits', 'Playful, but still tidy enough that you&rsquo;d trust them with your dog.'),
                ('Booking up front', 'Booking a groom was buried. Now it&rsquo;s one tap away.')]),
]

# ---------------------------------------------------------------- home
s0 = SAMPLES[0]
home = head('Arcane Designer | Website Redesigns for Spokane Small Businesses',
            'Nathan Gellatly redesigns websites and logos for small businesses in Spokane. One project, one clear price from $1,500, no monthly fees. See three designs before anything changes.',
            'index.html', extra=f'<link rel="preload" as="image" href="assets/samples/{s0["slug"]}-after.webp">\n', schema=ORG)
home += header('')
home += f'''<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="eyebrow">Website and logo redesigns</span>
      <h1 class="hero-h">Your business has grown&nbsp;up. <em>Has your website?</em></h1>
      <p class="lede">I&rsquo;m Nathan. I redesign websites for small businesses around Spokane as one project with one clear price. You see three designs before anything changes, and everything stays yours when we&rsquo;re done.</p>
      <div class="actions"><a class="btn" href="contact.html">Start a project {ARROW}</a><a class="btn ghost" href="work.html">See the work</a></div>
      <ul class="facts"><li>From $1,500</li><li>No monthly fees</li><li>Two to three weeks, start to finish</li><li>Built on the platform you already use</li></ul>
    </div>
    <div class="hero-art">
      <div class="hexes" data-set="a"></div>
      {browser(s0['url'], compare(s0['slug'], s0['name'], 16, eager=True))}
      <img class="arc" src="assets/arc/crouch-point.webp" alt="Arc, the Arcane Designer mascot, pointing at the example website" width="364" height="623">
      <div class="note" aria-hidden="true"><svg viewBox="0 0 60 44" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 38c14-2 30-12 40-30"/><path d="M34 9l10-2 1 10"/></svg><span class="hand">drag to compare</span></div>
    </div>
  </div>
</section>

'''
home += f'''<section class="sec redpen-sec">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">What I look for</span>
      <h2>Most old websites have <em>the same problems.</em></h2>
      <p>This is the kind of thing I notice in the first minute on a site. The business is made up, but every problem on it is real, and common.</p>
    </div>
    <div class="redpen reveal">
      <figure class="redpen-img">
        {browser('northbankplumbing.com', '<div class="shot"><img src="assets/samples/northbank-plumbing-before.webp" alt="An outdated plumbing company website from around 2013" width="1440" height="900" loading="lazy"><span class="pin" style="left:85%;top:8.6%">1</span><span class="pin" style="left:85%;top:26%">2</span><span class="pin" style="left:8%;top:52%">3</span><span class="pin" style="left:14.6%;top:70%">4</span><span class="pin" style="left:34%;top:82.5%">5</span></div>')}
      </figure>
      <div class="redpen-notes">
        <span class="hand">my notes:</span>
        <ol><li>The phone number is tiny. On a phone you&rsquo;d have to pinch and zoom just to tap it, and for a plumber, that call is the whole point of the site.</li><li>The coupons expired in 2013. Visitors notice, and they start wondering what else is out of date.</li><li>Built for 2009 screens. A third of a modern monitor is empty, and on a phone everything shrinks to fit.</li><li>This paragraph was written for search engines, not people. &ldquo;Spokane plumber, Spokane Valley plumber&rdquo; reassures nobody.</li><li>&ldquo;Best viewed in Internet Explorer 8.&rdquo; Microsoft retired it years ago.</li></ol>
        <a class="link" href="work.html#northbank-plumbing">See how I&rsquo;d fix it</a>
      </div>
    </div>
  </div>
</section>
'''
home += f'''<section class="sec band">
  <div class="zig navy" aria-hidden="true" style="position:absolute;top:-1px;left:0;right:0;transform:scaleY(-1);margin:0;background:var(--paper)"></div>
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">How it works</span>
      <h2>One project, start to finish. <em>Then I&rsquo;m out of your hair.</em></h2>
      <p>No retainer, no contract that renews itself. You get a better website and the keys to it.</p>
    </div>
    <ol class="steps reveal">
      <li><h3>Send me your site</h3><p>I&rsquo;ll look it over and tell you honestly whether a redesign is worth it.</p></li>
      <li><h3>Answer a few questions</h3><p>Your customers, what you like, your hard no&rsquo;s. About 20 minutes.</p></li>
      <li><h3>Pick from three designs</h3><p>Clickable versions of your actual site, so you can try them like the real thing.</p></li>
      <li><h3>I build it</h3><p>Right on the platform you already use. Your hosting and logins stay yours.</p></li>
      <li><h3>A week of fixes</h3><p>Spot something after launch? I fix it. Then you remove my access.</p></li>
    </ol>
    <p style="margin-top:34px" class="reveal"><a class="link" href="process.html">The whole process, step by step</a></p>
  </div>
</section>

<section class="sec">
  <div class="wrap letter">
    <div class="portrait reveal">
      <div class="hexes" data-set="c"></div>
      <img src="assets/arc/presents.webp" alt="Arc, the Arcane Designer mascot" width="400" height="628" loading="lazy">
    </div>
    <div class="body reveal">
      <span class="eyebrow">Who you&rsquo;d work with</span>
      <h2>Hi, I&rsquo;m Nathan.</h2>
      <p>Arcane Designer is me, one designer in Spokane. Most of my week goes to design and web work for two local companies, a healthcare compliance software company and an IT services firm. I redesign their websites, build their tools, and make a lot of what their customers see.</p>
      <p>I started this because I kept running into great local businesses with websites that undersell them. Hours buried three clicks deep. Menus as blurry PDFs. Pages that fall apart on a phone.</p>
      <p>The fix usually isn&rsquo;t a big agency contract. It&rsquo;s one focused project, done well, by someone who answers their own email.</p>
      <div class="sign"><span class="hand">Nathan</span><span class="muted small">Nathan Gellatly, Arcane Designer LLC</span></div>
    </div>
  </div>
</section>

<section class="sec band" id="reviews" hidden>
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">Reviews</span><h2>From people I&rsquo;ve worked with.</h2></div>
    <div class="reviews" data-reviews aria-roledescription="carousel" aria-label="Client reviews">
      <div class="review-stage" aria-live="polite"><span class="q" aria-hidden="true">&ldquo;</span></div>
      <div class="review-ctrls">
        <button class="arrow prev" type="button" aria-label="Previous review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
        <button class="arrow next" type="button" aria-label="Next review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
        <div class="dots"></div>
      </div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Pricing</span>
      <h2>The price is on the page.</h2>
      <p>Most small business websites fit the first one. Bigger or unusual projects get a written quote before any work starts.</p>
    </div>
    <div class="prices reveal">
'''
for p in (PRICES[0], PRICES[2]):
    home += f'''      <div class="price{" main" if p.get("main") else ""}"><h3>{p["name"]}</h3><span class="from">Starting at</span><span class="amt">${p["amt"]}</span><p>{p["blurb"]}</p></div>
'''
home += f'''    </div>
    <p style="margin-top:30px" class="reveal"><a class="link" href="pricing.html">What&rsquo;s included, and the larger-site price</a></p>
  </div>
</section>
'''
home += closer() + footer()
write('index.html', home)

# ---------------------------------------------------------------- work
work = head('Work and Reviews | Arcane Designer',
            'Before and after website redesigns by Arcane Designer in Spokane, with reviews from clients. Drag the slider to compare old and new.',
            'work.html')
work += header('work.html')
work += f'''<section class="page-head">
  <div class="wrap">
    <div class="hexes" data-set="c"></div>
    <div class="inner">
      <span class="eyebrow">Work and reviews</span>
      <h1>Before and after.</h1>
      <p class="lede">Drag the slider on each one. These first three are samples I designed for made-up businesses, so you can see the kind of change I make. Real client projects, with their reviews, go here as they launch.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:20px">
  <div class="wrap work-list">
'''
for s in SAMPLES:
    notes = ''.join(f'<div><b>{t}</b>{d}</div>' for t, d in s['notes'])
    work += f'''    <article class="work-item reveal" id="{s["slug"]}">
      <div class="meta"><h3>{s["name"]}</h3><span style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill">{s["kind"]}</span><span class="pill sample">Sample, made-up business</span></span></div>
      {browser(s["url"], compare(s["slug"], s["name"]))}
      <div class="work-notes">{notes}</div>
    </article>
'''
work += '''  </div>
</section>
'''
work += closer('Want yours on this page? <em>Let&rsquo;s talk.</em>',
               'Send me your current website and I&rsquo;ll tell you what I&rsquo;d change, in plain words.') + footer()
write('work.html', work)

# ---------------------------------------------------------------- process
STEPS = [
    ('Send me your website', 'Day one', '''<p>Use the <a class="link" href="contact.html">contact form</a> or email me a link to your current site. I&rsquo;ll look it over and reply with what I&rsquo;d change and what it would cost, usually within two business days.</p>
<p>If your site is in decent shape and a redesign wouldn&rsquo;t be worth your money, I&rsquo;ll say that.</p>'''),
    ('Deposit and questionnaire', 'Day two or three', '''<p>Once you&rsquo;re in, I send an invoice for half the price. Card or bank transfer, through Stripe.</p>
<p>Then a short questionnaire: who your customers are, what you want them to do on your site, sites you like, colors you can&rsquo;t stand, and anything that must stay. It takes about 20 minutes and it&rsquo;s the most useful 20 minutes of the project.</p>'''),
    ('Three designs to click through', 'About a week in', '''<p>I design three different directions for your site and send them as working web pages. Not flat pictures. You can open them on your phone, click between pages and get a real feel for each one.</p>
<p>Pick the one you like best. Mix and match is fine too (&ldquo;the colors from the second one, the layout from the first&rdquo;).</p>'''),
    ('One round of changes', 'A few days', '''<p>Tell me what to adjust, all in one list. I make the changes and send it back for a final look before anything is built.</p>''',
     'Need another round after that? It happens. Small tweaks are fine. A big change of direction gets a quick quote first, so there are no surprises.'),
    ('I build it on your platform', 'About a week', '''<p>I rebuild your site on the platform you already use: Squarespace, Wix, WordPress, Shopify or similar. Your domain, hosting and accounts stay exactly where they are.</p>
<p>You add me as a collaborator with my own login. You never share your password with me.</p>'''),
    ('Launch', 'Two to three weeks from the start', '''<p>We pick a quiet time, I switch the new design on and check every page on a phone and a computer. The second half of the invoice is due at launch.</p>'''),
    ('A week of fixes, then I hand back the keys', 'The week after launch', '''<p>For a week after launch, anything you notice that isn&rsquo;t right, I fix. A typo, a photo that crops oddly, a button that should say something else.</p>
<p>Then you remove my access with one click. I send you a short checklist so you can confirm nothing of mine is left on your account. That&rsquo;s the end of the project, and the website is all yours.</p>'''),
    ('A review, if you&rsquo;re happy', 'Whenever you have a minute', '''<p>If you liked working with me, I&rsquo;ll ask for a short Google review. It&rsquo;s the main way a one-person business like this gets found.</p>'''),
]
proc = head('How It Works | Arcane Designer Website Redesigns',
            'The Arcane Designer redesign process, step by step: questionnaire, three clickable designs, a build on your existing platform, launch, and a week of fixes. About two to three weeks.',
            'process.html')
proc += header('process.html')
proc += '''<section class="page-head">
  <div class="wrap">
    <div class="hexes" data-set="a"></div>
    <img class="arc" src="assets/arc/stands.webp" alt="" width="273" height="640">
    <div class="inner">
      <span class="eyebrow">Process</span>
      <h1>How a redesign works, <em>from hello to handoff.</em></h1>
      <p class="lede">About two to three weeks in all. Here&rsquo;s every step, what I&rsquo;ll need from you, and when you pay.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:24px">
  <div class="wrap">
    <ol class="timeline">
'''
for st in STEPS:
    t, when, body = st[:3]
    aside = f'<div class="aside">{st[3]}</div>' if len(st) > 3 else ''
    proc += f'''      <li class="reveal"><h3>{t}</h3><div class="when">{when}</div><div class="prose">{body}</div>{aside}</li>
'''
proc += '''    </ol>
  </div>
</section>
<section class="sec band">
  <div class="wrap">
    <div class="callout reveal">
      <img src="assets/arc/presents-floor.webp" alt="" width="375" height="640" loading="lazy">
      <div>
        <h2>Yes, I use AI. Here&rsquo;s how.</h2>
        <p>AI tools are part of how I work. They help me research your industry, try more layout ideas than I could sketch by hand, build the clickable designs faster and catch mistakes before you do.</p>
        <p>What they don&rsquo;t do is make the decisions. I choose the direction, write and edit the words with you, and check every page myself before you see it. You get the speed of the tools and the judgment of a person who&rsquo;s accountable for the result.</p>
      </div>
    </div>
  </div>
</section>
<section class="sec">
  <div class="wrap">
    <div class="sec-head reveal"><span class="eyebrow">Good to know</span><h2>Questions people ask.</h2></div>
    <div class="faq reveal">
'''
for q, a in FAQ[:5]:
    proc += f'      <details><summary>{q}</summary><div><p>{a}</p></div></details>\n'
proc += '''    </div>
    <p style="margin-top:26px"><a class="link" href="pricing.html#faq">More questions on the pricing page</a></p>
  </div>
</section>
'''
proc += closer() + footer()
write('process.html', proc)

# ---------------------------------------------------------------- pricing
faq_schema = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
    {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a.replace('&rsquo;', '’').replace('&amp;', '&')}} for q, a in FAQ]}
pr = head('Pricing | Website Redesign from $1,500 | Arcane Designer',
          'Website redesigns for Spokane small businesses start at $1,500 for up to 10 pages. Larger sites from $3,500, logo redesigns from $500. No monthly fees.',
          'pricing.html', schema=[ORG, faq_schema])
pr += header('pricing.html')
pr += '''<section class="page-head">
  <div class="wrap">
    <div class="hexes" data-set="b"></div>
    <img class="arc" src="assets/arc/presents.webp" alt="" width="400" height="628">
    <div class="inner">
      <span class="eyebrow">Pricing</span>
      <h1>Clear prices. <em>No monthly fees.</em></h1>
      <p class="lede">One project, paid half at the start and half at launch. If your site needs more than the starting price covers, you get a written quote before any work begins.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:28px">
  <div class="wrap">
    <div class="prices">
'''
for p in PRICES:
    items = ''.join(f'<li>{i}</li>' for i in p['items'])
    flag = '<span class="flag">Most common</span>' if p.get('main') else ''
    pr += f'''      <div class="price{" main" if p.get("main") else ""} reveal">{flag}<h3>{p["name"]}</h3><span class="from">Starting at</span><span class="amt">${p["amt"]}</span><p>{p["blurb"]}</p><ul>{items}</ul><a class="btn{" teal" if p.get("main") else " ghost"}" href="contact.html">Get started {ARROW}</a></div>
'''
pr += '''    </div>
    <p class="muted small" style="margin-top:22px;max-width:70ch">These are early-client prices while I build up my portfolio, and they&rsquo;ll go up as it grows. Website and logo together? Ask, and I&rsquo;ll take some off the total.</p>
  </div>
</section>
<section class="sec band">
  <div class="wrap feature">
    <div class="reveal">
      <span class="eyebrow">Not included</span>
      <h2 style="margin:14px 0 18px">What you keep paying for, <em>and to whom.</em></h2>
      <div class="prose">
        <p>Your platform subscription, hosting and domain stay with you and the companies you already pay. I don&rsquo;t mark them up and I don&rsquo;t take them over.</p>
        <p>Ongoing maintenance isn&rsquo;t part of the deal either. After the week of fixes the project is finished. If you want changes later, you&rsquo;re welcome to come back for a new, small quote.</p>
      </div>
    </div>
    <div class="side reveal">
      <h3>Always part of the project</h3>
      <ul>
        <li>Your site keeps its address and its existing accounts</li>
        <li>You own every design file and every word</li>
        <li>Mobile layouts checked on real phones</li>
        <li>Search basics set up on every page</li>
        <li>A plain-language guide to editing your new site</li>
      </ul>
    </div>
  </div>
</section>
<section class="sec" id="faq">
  <div class="wrap">
    <div class="sec-head reveal"><span class="eyebrow">Questions</span><h2>The fine print, in plain words.</h2></div>
    <div class="faq">
'''
for q, a in FAQ:
    pr += f'      <details class="reveal"><summary>{q}</summary><div><p>{a}</p></div></details>\n'
pr += '''    </div>
  </div>
</section>
'''
pr += closer() + footer()
write('pricing.html', pr)

# ---------------------------------------------------------------- contact
ct = head('Start a Project | Arcane Designer',
          'Send Arcane Designer your current website. Nathan will reply within two business days with what he would change and what it would cost.',
          'contact.html')
ct += header('contact.html')
ct += f'''<section class="page-head">
  <div class="wrap">
    <div class="hexes" data-set="c"></div>
    <div class="inner">
      <span class="eyebrow">Start a project</span>
      <h1>Tell me about <em>your website.</em></h1>
      <p class="lede">A link and a sentence is plenty. I read every message myself and reply within two business days.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:20px">
  <div class="wrap contact-grid">
    <form class="form" data-form="contact" novalidate>
      <div class="row">
        <div class="field"><label for="c-name">Your name</label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-biz">Business name</label><input id="c-biz" name="business" autocomplete="organization"></div>
      </div>
      <div class="row">
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="c-site">Current website</label><input id="c-site" name="website" type="text" inputmode="url" placeholder="yourbusiness.com"></div>
      </div>
      <fieldset class="field">
        <legend>What are you thinking about?</legend>
        <div class="choices">
          <label><input type="checkbox" name="interest" value="Website redesign" checked> Website redesign</label>
          <label><input type="checkbox" name="interest" value="Logo redesign"> Logo redesign</label>
          <label><input type="checkbox" name="interest" value="Not sure yet"> Not sure yet</label>
        </div>
      </fieldset>
      <div class="field"><label for="c-msg">Anything else?</label><span class="hint">What bugs you about your current site, a deadline, a budget. Whatever&rsquo;s useful.</span><textarea id="c-msg" name="message"></textarea></div>
      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div><button class="btn teal" type="submit">Send it {ARROW}</button></div>
      <div class="form-status" role="status" tabindex="-1" hidden></div>
    </form>
    <aside class="contact-side">
      <div class="card">
        <h3>Rather email?</h3>
        <div class="copyline"><code data-email>hello@arcanedesigner.com</code><button type="button" data-copy>Copy</button></div>
        <p class="muted small">Send your website link and I&rsquo;ll take it from there.</p>
      </div>
      <div class="card">
        <h3>What happens next</h3>
        <p class="muted small">I look at your current site and reply with what I&rsquo;d change and a price. If it&rsquo;s a fit, you get a short questionnaire and a deposit invoice. That&rsquo;s it. No sales calls unless you want one.</p>
        <a class="link small" href="process.html">See the full process</a>
      </div>
      <img src="assets/arc/relaxed.webp" alt="" width="640" height="312" loading="lazy" style="width:78%;justify-self:center">
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
        fld('about', 'In a few sentences, what does your business do?', 'Say it the way you would to a new customer at the counter.'),
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
        choices('platform', 'Which platform is it built on?', ['Squarespace', 'Wix', 'WordPress', 'Shopify', 'GoDaddy', 'Webflow', 'Not sure', 'Other'], 'radio', 'If you&rsquo;re not sure, that&rsquo;s fine. I can tell from the site.'),
        fld('pages', 'Which pages should the new site have?', 'A rough list is great: Home, Services, About, Menu, Contact, and so on.'),
    ]),
    ('Look and feel', [
        fld('likes', 'Send a few websites you like, and what you like about them', 'They don&rsquo;t need to be in your industry.'),
        fld('dislikes', 'Any websites or styles you really don&rsquo;t like?'),
        choices('feel', 'Which words fit how you want to come across?', ['Warm', 'Professional', 'Playful', 'Calm', 'Bold', 'Classic', 'Modern', 'Rugged', 'Elegant', 'Down to earth', 'Premium', 'Quirky'], hint='Pick as many as you like.'),
        fld('colors', 'Colors and fonts', 'Brand colors you have, colors you love, colors you never want to see.'),
        choices('logo', 'Your logo', ['Keep it as is', 'Open to a refresh', 'I need a new one', 'I don&rsquo;t have one'], 'radio'),
    ]),
    ('Do this, definitely don&rsquo;t do that', [
        fld('dos', 'Things the new site must do or include'),
        fld('donts', 'Things it must never do or include'),
    ]),
    ('Practical bits', [
        fld('photos', 'Do you have photos you&rsquo;d like to use?', 'Of your work, your space, your team. Phone photos are often great.'),
        fld('deadline', 'Any deadline or season I should know about?', kind='text'),
        fld('access', 'Who manages your website account today?', 'You, someone on your team, a past designer, nobody sure.', kind='text'),
        fld('notes', 'Anything else on your mind?'),
    ]),
]
qn = head('Project Questionnaire | Arcane Designer',
          'Questionnaire for Arcane Designer redesign clients.', 'questionnaire.html', noindex=True)
qn += header('')
qn += '''<section class="page-head">
  <div class="wrap">
    <div class="hexes" data-set="b"></div>
    <div class="inner">
      <span class="eyebrow">Client questionnaire</span>
      <h1>Let&rsquo;s get to know <em>your business.</em></h1>
      <p class="lede">About 20 minutes. Short answers are fine, and anything you skip we can cover later. Your answers save in this browser as you go, so you can come back to it.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:8px">
  <div class="wrap q-wrap">
    <form class="form" data-form="questionnaire" data-draft data-thanks="Got it, thank you. I&rsquo;ll start on your three designs and send them over within about a week." novalidate>
      <div class="q-progress" aria-hidden="true"><div class="track"><div class="fill"></div></div><div class="lbl"><span class="count"></span><span>Saved in this browser</span></div></div>
'''
for i, (title, fields) in enumerate(QS, 1):
    qn += f'      <div class="q-section"><h2><span class="n">{i}</span>{title}</h2>{"".join(fields)}</div>\n'
qn += f'''      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div><button class="btn teal" type="submit">Send my answers {ARROW}</button></div>
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
nf += f'''<section class="sec">
  <div class="wrap" style="display:grid;grid-template-columns:auto 1fr;gap:40px;align-items:center;max-width:860px">
    <img src="assets/arc/flabbergasted.webp" alt="" width="302" height="640" style="width:150px">
    <div style="display:grid;gap:18px">
      <span class="eyebrow">404</span>
      <h1 style="font-size:clamp(2.2rem,1.6rem + 2.4vw,3.4rem)">That page isn&rsquo;t here.</h1>
      <p class="lede">It may have moved when the site was redesigned. Ironic, I know.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="/">Go home {ARROW}</a><a class="btn ghost" href="/work.html">See the work</a></div>
    </div>
  </div>
</section>
'''
nf += footer()
write('404.html', nf)
