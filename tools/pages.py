#!/usr/bin/env python3
"""Writes every page of arcanedesigner.com. Shared head, header and footer live here so pages match.
Run from the repo root:  python3 tools/pages.py
Edit copy and prices here, then re-run. The generated index.html files are what GitHub Pages serves.
Pages live in folders (/kits/, /free-guide/ ...) so addresses stay clean. contact.html keeps its old name."""
import json, math, os, re, shutil

V = '73'                      # bump after CSS/JS changes so browsers refetch
BASE = 'https://arcanedesigner.com'
EMAIL = 'nathan@arcanedesigner.com'
LINKEDIN_BIZ = 'https://www.linkedin.com/company/arcane-designer/'
LINKEDIN_NATHAN = 'https://www.linkedin.com/in/nathan-gellatly/'
LINKEDIN_JORDAN = 'https://www.linkedin.com/in/jordangellatly/'
FONTS = ('https://fonts.googleapis.com/css2?family=Bebas+Neue'
         '&family=Figtree:wght@400;500;600;700&family=Archivo:wdth,wght@62..125,400..900&display=swap')

# Fill these in as things go live. Empty means the button or section falls back or stays hidden.
CHECKOUT = {}        # kit slug -> checkout link (Lemon Squeezy, Gumroad, Stripe...). Until set, "Get the kit" opens the free guide signup.
VIDEOS = {}          # kit slug -> embeddable video page link, shown on that kit's page
PODCAST_LINKS = [('YouTube', 'https://www.youtube.com/@AIMonday'), ('Spotify', 'https://open.spotify.com/show/3YuS205Pz6owg1eH1KXLul'), ('Apple Podcasts', 'https://podcasts.apple.com/us/podcast/ai-monday-ai-news-tools-and-leaders/id6834921078'), ('Instagram', 'https://www.instagram.com/aimondaypod/')]
EPISODES = []        # [(title, one-line summary, url)]

ICONS = {
    'YouTube': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0033"/><path d="M10 8.6v6.8l5.8-3.4z" fill="#fff"/></svg>',
    'Spotify': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1ED760"/><path d="M6.4 9.3c3.9-1.1 8.2-.8 11.5 1M7 12.4c3.2-.9 6.6-.6 9.4.9M7.6 15.4c2.6-.7 5.2-.5 7.4.7" fill="none" stroke="#0a0a0a" stroke-width="1.6" stroke-linecap="round"/></svg>',
    'Apple Podcasts': '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ap-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F452FF"/><stop offset="1" stop-color="#832BC1"/></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6" fill="url(#ap-g)"/><circle cx="12" cy="10" r="2.2" fill="#fff"/><path d="M10.8 13.6h2.4l-.5 5.4h-1.4z" fill="#fff"/><path d="M8 14.6a5.2 5.2 0 1 1 8 0M6 16.2a7.6 7.6 0 1 1 12 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>',
}


def pbtn(label, url):
    verb = 'Watch on ' if label == 'YouTube' else 'Listen on '
    return f'<a class="pbtn" href="{url}" target="_blank" rel="noopener">{ICONS[label]}<span><small>{verb.strip()}</small>{label}</span></a>'


def listen_row():
    return '<div class="pbtns">' + ''.join(pbtn(l, u) for l, u in PODCAST_LINKS if l in ICONS) + '</div>'


BRAND = ('<span class="mark3d" aria-hidden="true">'
         '<img class="hx" data-h="b" src="/assets/brand/hex-blue.webp" alt="" width="64" height="64">'
         '<img class="hx" data-h="p" src="/assets/brand/hex-pink.webp" alt="" width="64" height="64">'
         '<img class="hx" data-h="t" src="/assets/brand/hex-teal.webp" alt="" width="64" height="64">'
         '</span><span class="word">Arcane Designer</span>')
NAV = [('/kits/', 'Kits'), ('/podcast/', 'Podcast'), ('/questions/', 'Questions'), ('/about/', 'About')]
AC = ' aria-current="page"'
NB = '&nbsp;'


def btn(href, text, cls=''):
    return f'<a class="btn {cls}" href="{href}"><span>{text}</span></a>'


def head(title, desc, route, noindex=False, schema=None, extra=''):
    canon = BASE + route
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
<meta name="theme-color" content="#0c0b11">
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-48x48.png" sizes="48x48" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/css/site.css?v={V}">
<script>document.documentElement.className='js'</script>
{extra}'''
    for sc in (schema if isinstance(schema, list) else [schema] if schema else []):
        s += '<script type="application/ld+json">' + json.dumps(sc, ensure_ascii=False) + '</script>\n'
    return s + '</head>\n'


def header(cur):
    links = ''.join(f'<a href="{h}"{AC if cur.startswith(h) else ""}>{t}</a>' for h, t in NAV)
    return f'''<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="brand" href="/" aria-label="Arcane Designer home">{BRAND}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
    <nav class="nav" id="nav" aria-label="Main">{links}{btn("/free-guide/", "Free guide")}</nav>
  </div>
</header>
<main id="main">
'''


def footer():
    links = ''.join(f'<a href="{h}">{t}</a>' for h, t in [('/kits/', 'Kits'), ('/podcast/', 'Podcast'), ('/questions/', 'Questions'), ('/about/', 'About')])
    pod = ''.join(f'<a href="{u}" target="_blank" rel="noopener">{l}</a>' for l, u in PODCAST_LINKS)
    return f'''</main>
<footer class="site-foot">
  <div class="wrap">
    <div class="foot-row">
      <div class="foot-brand">
        <a class="brand" href="/">{BRAND}</a>
        <span>Practical AI training &amp; tools for business owners, marketers, and everyday people.</span>
        {btn("/free-guide/", "Get the free guide")}
      </div>
      <div class="foot-cols">
        <div class="foot-col"><b>Explore</b><nav aria-label="Footer">{links}</nav></div>
        <div class="foot-col"><b>AI Monday podcast</b><nav aria-label="Podcast">{pod}</nav></div>
        <div class="foot-col"><b>Get in touch</b><a href="/contact">Contact</a><a href="{LINKEDIN_BIZ}" target="_blank" rel="noopener">LinkedIn</a></div>
      </div>
    </div>
    <div class="foot-base"><span>&copy; <span id="year">2026</span> Arcane Designer LLC</span></div>
  </div>
</footer>
<script src="/js/site.js?v={V}" defer></script>
</body>
</html>
'''


def closer(title='Ready when you are.', body='Start with the free guide. Seven days, one small task a day, and you&rsquo;ll be using AI for real by the end of the week.', label='Get the free guide', href='/free-guide/', arc='hands-up'):
    sizes = {'hands-up': (459, 900), 'presents': (499, 900), 'stands': (336, 900)}
    w, h = sizes.get(arc, (459, 900))
    return f'''<section class="closer navy-sec">
  <div class="wrap closer-grid">
    <div data-anim="left">
      <h2>{title}</h2>
      <p>{body}</p>
      {btn(href, label)}
    </div>
    <img class="arc" src="/assets/arc/{arc}.webp" alt="" width="{w}" height="{h}" loading="lazy" data-anim="right">
  </div>
</section>
'''


def tip(text, pose='crouch-point'):
    return f'''<aside class="arc-tip" data-anim="up"><img src="/assets/arc/{pose}.webp" alt="" width="120" height="120" loading="lazy"><p><b>Arc&rsquo;s tip</b>{text}</p></aside>'''


def faq_html(items):
    return ''.join(f'<details><summary>{q}</summary><div><p>{a}</p></div></details>' for q, a in items)


def plain(s):
    return re.sub(r'<[^>]+>', '', s).replace('&rsquo;', '’').replace('&ldquo;', '“').replace('&rdquo;', '”').replace('&amp;', '&').replace(NB, ' ')


def hexsvg(label='Six pieces'):
    """A 3D hexagon made of six thick triangular pieces. Each piece flies in when its step turns on (js/site.js)."""
    C, R, D = 200, 170, 22
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
            nx, ny = ey, -ex
            mx, my = (p1[0] + p2[0]) / 2 - cx, (p1[1] + p2[1]) / 2 - cy
            if nx * mx + ny * my < 0: nx, ny = -nx, -ny
            if ny > 1e-6:
                q = f'{p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} {p2[0]:.1f},{p2[1] + D:.1f} {p1[0]:.1f},{p1[1] + D:.1f}'
                side.append(f'<polygon class="wall" points="{q}" fill="{walls[k]}"/>')
        dx, dy = cx - C, cy - C
        dd = math.hypot(dx, dy)
        tx, ty = dx / dd * 170, dy / dd * 170 - 60
        rot = 28 if k % 2 else -28
        top = ' '.join(f'{x:.1f},{y:.1f}' for x, y in tri)
        bev = ' '.join(f'{cx + (x - cx) * .82:.1f},{cy + (y - cy) * .82:.1f}' for x, y in tri)
        groups.append((cy, f'<g class="tri" data-i="{k}" style="--tx:{tx:.0f}px;--ty:{ty:.0f}px;--rot:{rot}deg">{"".join(side)}<polygon class="top" points="{top}" fill="{tops[k]}"/><polygon class="gloss" points="{top}" fill="url(#hg-gloss)"/><polygon class="bevel" points="{bev}"/><text x="{cx:.1f}" y="{cy:.1f}">{k + 1}</text></g>'))
    groups.sort(key=lambda g: g[0])
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


WRITTEN = []


def write(route, html):
    """route '/' -> index.html, '/kits/' -> kits/index.html, '/contact' -> contact.html, '/404' -> 404.html"""
    if route == '/':
        path = 'index.html'
    elif route.endswith('/'):
        path = route.strip('/') + '/index.html'
    else:
        path = route.strip('/') + '.html'
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(html)
    WRITTEN.append(route)
    print('wrote', path)


# ================================================================ content
FREE = dict(slug='free-guide', name='Your First 7 Days with AI', price='Free',
            line='One small task a day. By day seven you&rsquo;ll be using AI for real work.')

KITS = [
    dict(slug='ai-for-marketing', name='AI for Marketing', price=97, pose='presents', lead=True,
         line='Have AI write your posts, emails and ads in your brand, on a schedule.',
         who='You do the marketing for a business, or you want to. You&rsquo;re tired of staring at a blank caption box, and you&rsquo;ve heard AI can help but every answer it gives you sounds generic.',
         inside=[('Social posts', 'Prompts that turn one idea into a week of posts, written the way your brand talks.'),
                 ('Email campaigns', 'Welcome emails, newsletters and promos, plus how to get AI to remember your offers.'),
                 ('Ad copy', 'Headlines and variations to test, for the platforms small businesses actually use.'),
                 ('Website content', 'Page copy, product descriptions and FAQs that read like a person wrote them.')],
         levels=True,
         tip='Before you ask for a single post, tell the AI who your customer is and what they care about. Every answer after that gets better.',
         faq=[('Do I need to know how to code for the Build level?', 'No. You&rsquo;ll use Codex, which writes the code for you. You describe what you want in plain English and we show you every click.'),
              ('Which AI tools does it use?', 'Mostly ChatGPT and Claude for writing, Claude for recurring tasks and Codex for the Build level. The prompts work in other tools too.')]),
    dict(slug='ai-beginner', name='AI Beginner Kit', price=47, pose='stands',
         line='A plain-English tour of ChatGPT, Claude, Gemini, Grok, Copilot, Perplexity and Meta&rsquo;s Muse.',
         who='You keep hearing about AI and you haven&rsquo;t really used it yet. Or you&rsquo;ve tried ChatGPT a few times and it didn&rsquo;t stick.',
         inside=[('The big seven', 'What ChatGPT, Claude, Gemini, Grok, Microsoft Copilot, Perplexity and Meta&rsquo;s Muse are each good at, in plain words.'),
                 ('Watch us use them', 'Short screen-share videos of us doing everyday tasks in each one.'),
                 ('Your first prompts', 'Copy-and-paste prompts for your first sessions, so you never start from a blank box.'),
                 ('A one-page cheat sheet', 'Which tool to open for which job. Print it, stick it by your desk.')],
         tip='Pick one tool and use it every day for a week before you try the others. Habit beats variety at the start.',
         faq=[('Do I have to pay for these AI tools?', 'No. Every tool in the kit has a free way to start, and the core lessons work on free plans.')]),
    dict(slug='start-a-business', name='Start a Business with AI', price=97, pose='presents-floor',
         line='Use AI to test an idea, name it, price it and find your first customers.',
         who='You have a business idea, or a side hustle you want to make real, and you want help thinking it through without paying a consultant.',
         inside=[('Test the idea', 'Prompts that poke holes in your idea before you spend money on it.'),
                 ('Name and brand', 'Find a name, a voice and a simple look you can actually use.'),
                 ('A one-page plan', 'Who it&rsquo;s for, what it costs and how it makes money, all on one page.'),
                 ('Your first customers', 'Outreach messages and launch posts written with AI, in your voice.')],
         tip='Ask the AI to argue against your idea first. If it survives that, you&rsquo;re onto something.',
         faq=[('Is this legal or tax advice?', 'No. It helps you plan and get moving. For legal setup and taxes, talk to a professional in your state.')]),
    dict(slug='build-your-website', name='Build Your Website with AI', price=97, pose='crouch-point',
         line='Plan, write and build a website with AI, then keep making it better.',
         who='You need a website, or yours is old and you want to fix it yourself. You&rsquo;re comfortable clicking around, and you&rsquo;d like AI to do the heavy lifting.',
         inside=[('Pick your platform', 'Squarespace, Wix, WordPress or a simple custom site, and how to choose.'),
                 ('Plan the pages', 'Have AI map out exactly which pages you need and what goes on each one.'),
                 ('Write every page', 'Copy that sounds like you, from the home page to the FAQs.'),
                 ('Get found', 'How to set up your site so Google and AI tools can find it and recommend it.')],
         tip='Write your FAQs as the real questions customers ask you. AI tools love quoting a clear answer.',
         faq=[('Will this work with the website I already have?', 'Yes. Most of the kit is about planning and writing, and that works on any platform.')]),
    dict(slug='top-100-prompts', name='Top 100 Prompts for Starting a Business', price=47, pose='flabbergasted',
         line='The 100 prompts we&rsquo;d hand a friend who was starting a business tomorrow.',
         who='You want to start something and you&rsquo;d rather not figure out what to ask AI from scratch.',
         inside=[('Idea and research', 'Size up your market, your competition and your customers.'),
                 ('Brand and voice', 'Names, taglines, tone and a short brand guide.'),
                 ('Money', 'Pricing, simple budgets and a basic forecast.'),
                 ('Marketing and sales', 'Posts, emails, outreach and follow-ups.')],
         tip='Save the prompts that work for you in one document. That document becomes your own playbook.',
         faq=[('Do the prompts work in any AI tool?', 'Yes. They&rsquo;re written to work in ChatGPT, Claude, Gemini, Grok and Copilot.')]),
]
BUNDLE = dict(slug='complete-bundle', name='The Complete Bundle', price=297, pose='hands-up',
              line='Every kit, plus updates as the AI tools change.',
              who='You want the whole set, or you&rsquo;re buying for a marketing person or a small team.',
              tip='Start with the Beginner Kit even if you&rsquo;ve used AI before. It fills in the gaps fast.',
              faq=[('What happens when the tools change?', 'We update the kits, and bundle owners get the new versions.')])
ALL = KITS + [BUNDLE]
ALL_SEPARATE = sum(k['price'] for k in KITS)
BY = {k['slug']: k for k in ALL}
LADDER = [('Your First 7 Days with AI', '/free-guide/', 'Free'), ('AI Beginner Kit', '/kits/ai-beginner/', '$47'), ('AI for Marketing', '/kits/ai-for-marketing/', '$97'),
          ('Start a Business with AI', '/kits/start-a-business/', '$97'), ('Build Your Website with AI', '/kits/build-your-website/', '$97'), ('Top 100 Prompts', '/kits/top-100-prompts/', '$47')]

LEVELS = [('Ask', 'Real prompts for posts, emails, ads and web pages. Copy, paste, tweak, done.'),
          ('Automate', 'Set up recurring Claude tasks, so new content shows up on a schedule without you asking.'),
          ('Build', 'Use Codex to build a small program that knows when to post and writes it in your brand. Even if you&rsquo;ve never written code.')]

# Questions library, grouped. Written for people first, and plain enough for AI tools to quote.
QUESTIONS = [
    ('Getting started', [
        ('How do I start using AI?', 'Pick one free tool, like ChatGPT or Claude, and use it for something you actually need this week. Ask it to draft an email, plan a meal or explain a bill. Real tasks teach you faster than tutorials. Our free 7-day guide gives you one small task a day to build the habit.'),
        ('What is a prompt?', 'A prompt is just what you type to the AI. Good prompts give context: who you are, what you want, who it&rsquo;s for and what a good answer looks like. Think of it like briefing a smart new coworker on their first day.'),
        ('How long does it take to learn AI?', 'You can do something useful in your first hour. Getting comfortable takes a couple of weeks of everyday use. Building automations takes longer, but it&rsquo;s closer to a weekend project than a semester.'),
        ('Do I need to pay for AI tools?', 'Not to start. ChatGPT, Claude, Gemini, Grok, Copilot and Perplexity all have free versions. Paid plans add more use and better models, and most people only upgrade once they&rsquo;re using a tool every day.'),
    ]),
    ('Choosing tools', [
        ('What&rsquo;s the difference between ChatGPT, Claude, Gemini, Grok, Copilot, Perplexity and Muse?', 'They overlap a lot. ChatGPT is the all-rounder most people try first. Claude is great for writing and long documents. Gemini fits right into Google&rsquo;s apps. Grok is built into X and is quick on current events. Copilot lives inside Microsoft Word, Excel and Outlook. Perplexity is built for research, with sources linked in its answers. Muse is Meta&rsquo;s agent that can carry out tasks for you, like booking and buying.'),
        ('What&rsquo;s the best AI for a small business?', 'The one your team will actually use every day. If you live in Google Workspace, try Gemini. If you live in Microsoft 365, try Copilot. For marketing writing, ChatGPT and Claude are both strong. Most small businesses end up using two.'),
        ('Is it safe to put business information into AI?', 'Treat it like email. Don&rsquo;t paste passwords, card numbers or private customer data. Check each tool&rsquo;s settings for whether your chats are used for training, and use business plans when you&rsquo;re handling sensitive work.'),
    ]),
    ('Marketing with AI', [
        ('Can AI write my social media posts?', 'Yes, and it does a good job once it knows your brand. Give it examples of posts you like, describe your customer and tell it your voice. Then have it draft a week at a time and edit before you post.'),
        ('How do I get AI to sound like my brand?', 'Write a short brand guide: who you serve, how you talk, words you use and words you never use. Paste a few of your best posts. Save that as a reusable instruction, and every draft starts closer to your voice.'),
        ('What does automating marketing with AI mean?', 'It means the AI makes content on a schedule without you typing a prompt each time. For example, a recurring task that drafts next week&rsquo;s posts every Friday. Our AI for Marketing kit walks you through setting one up.'),
        ('Will AI replace marketers?', 'It&rsquo;s changing the job. Marketers who use AI get through more work and spend more time on ideas and strategy. That&rsquo;s why business owners are buying AI training for their marketing people now.'),
    ]),
    ('Learning AI', [
        ('Is an AI course or certificate worth it?', 'It depends on your goal. University certificates in AI marketing often cost $2,000 to $5,000 and take months. If you want to use AI in your work, hands-on practice gets you there faster and for far less. That&rsquo;s the idea behind our kits.'),
        ('Can a beginner build an app or tool with AI?', 'Yes. Tools like Codex write the code from plain-English instructions. You won&rsquo;t become a programmer overnight, but you can build a small, useful tool, like one that drafts and schedules your posts.'),
    ]),
    ('Our kits', [
        ('What&rsquo;s inside a kit?', 'Each kit is a download with copy-and-paste prompts, short screen-share videos of us doing the work and a first project to finish. You can start the day you buy it.'),
        ('Do the kits get updated?', 'Yes. AI tools change fast, so we update the kits as they do. Complete Bundle owners get the new versions.'),
        ('Can I buy a kit for my team?', 'Yes. A lot of business owners buy the AI for Marketing kit for their marketing person or team. For a whole team, the Complete Bundle covers everything.'),
        ('What&rsquo;s in the free guide?', 'Seven days of small, real tasks with AI, each with a prompt you can copy. It&rsquo;s the easiest way to find out if the kits are for you.'),
    ]),
]
ALL_Q = [qa for _, qs in QUESTIONS for qa in qs]

ORG = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': BASE + '/#org',
    'name': 'Arcane Designer', 'legalName': 'Arcane Designer LLC', 'url': BASE + '/',
    'logo': BASE + '/android-chrome-512x512.png', 'image': BASE + '/assets/og.png',
    'slogan': 'Don’t go to school for AI. Download this and get started.',
    'description': 'Practical AI training & tools for business owners, marketers, and everyday people. Starter kits with real prompts and short videos covering ChatGPT, Claude, Gemini, Grok, Copilot, Perplexity and Muse.',
    'founder': [{'@type': 'Person', 'name': 'Nathan Gellatly', 'sameAs': LINKEDIN_NATHAN}, {'@type': 'Person', 'name': 'Jordan Gellatly', 'sameAs': LINKEDIN_JORDAN}],
    'address': {'@type': 'PostalAddress', 'addressLocality': 'Spokane', 'addressRegion': 'WA', 'addressCountry': 'US'},
    'sameAs': [LINKEDIN_BIZ],
}
ORG['sameAs'] += [u for _, u in PODCAST_LINKS]


def product_schema(k):
    return {'@context': 'https://schema.org', '@type': 'Product', 'name': plain(k['name']), 'description': plain(k['line']),
            'brand': {'@type': 'Brand', 'name': 'Arcane Designer'}, 'image': BASE + f'/assets/arc/{k["pose"]}.webp',
            'offers': {'@type': 'Offer', 'price': str(k['price']), 'priceCurrency': 'USD', 'url': BASE + f'/kits/{k["slug"]}/'}}


def faq_schema(items):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': plain(q), 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}} for q, a in items]}


def buy_href(slug):
    return CHECKOUT.get(slug) or f'/free-guide/?kit={slug}'


def kit_card(k, cls=''):
    return f'''<a class="price link-card kit-card {cls}" href="/kits/{k["slug"]}/" data-anim="up"><h3>{k["name"]}</h3><span class="amt">${k["price"]}</span><p>{k["line"]}</p><span class="see">See what&rsquo;s inside</span></a>'''


# ================================================================ home
FLOATERS = [('teal', 7, 18, 120, .7, -14), ('pink', 86, 14, 92, .5, 10), ('blue', 14, 70, 70, .9, 8), ('teal', 80, 64, 140, .35, -6),
            ('pink', 27, 8, 46, 1.1, 20), ('blue', 66, 6, 58, .8, -18), ('pink', 93, 48, 44, 1.2, 4), ('teal', 3, 48, 40, 1.3, 30)]
fl_html = ''.join(f'<img class="fl" src="/assets/brand/hex-{c}.webp" alt="" style="--x:{x}%;--y:{y}%;--s:{sz}px;--k:{k};--r:{r}deg;--i:{i}">' for i, (c, x, y, sz, k, r) in enumerate(FLOATERS))

# The price drop: what learning AI usually costs, counting down to ours as you scroll (figures from the plan's Nov 2026 research)
STAGES = [(22000, 'An Ivy League executive AI program', 'Months of classes'),
          (5000, 'A university AI marketing certificate', 'Often $2,000 to $5,000'),
          (500, 'A professional marketing qualification', 'Usually $500 to $700'),
          (297, 'Every Arcane Designer kit, all of it', 'Start tonight')]

HOME_Q = [ALL_Q[0], ALL_Q[3], QUESTIONS[4][1][0], QUESTIONS[4][1][2], QUESTIONS[3][1][0]]

home = head('Arcane Designer | AI Starter Kits: Don’t Go to School for AI',
            'Practical AI training & tools for business owners, marketers, and everyday people. Learn ChatGPT, Claude, Gemini and more by using them. Start with the free 7-day guide.',
            '/', schema=[ORG, faq_schema(HOME_Q)])
home += header('/')
stage_data = json.dumps([[n, plain(l), plain(s)] for n, l, s in STAGES]).replace('"', '&quot;')
home += f'''<section class="hero-x dark-stage">
  <div class="floaters" aria-hidden="true">{fl_html}</div>
  <div class="wrap hero-x-inner">
    <h1 class="tag tag-soft"><span class="w">Don&rsquo;t go to school</span> <span class="w">for{NB}AI.</span></h1>
    <p class="big">Download a kit, follow along with short videos of us doing the work, and make something real with AI tonight.</p>
    <div class="row">{btn("/free-guide/", "Get the free 7-day guide")}<a class="tlink light" href="/kits/">Browse the kits</a></div>
  </div>
</section>

<section class="pin-price dark-stage" aria-label="What learning AI usually costs, compared with our kits">
  <div class="pin-sticky">
    <div class="wrap price-scene">
      <div class="point-arc"><img src="/assets/arc/crouch-point.webp" alt="Arc, the Arcane Designer mascot, crouching and pointing at the price" width="513" height="900"><div class="bubble scene-bubble" aria-hidden="true"><span data-a="Watch the price." data-b="Way better.">Watch the price.</span></div></div>
      <p class="scene-kicker">What it costs to learn AI</p>
      <div class="ticker" data-stages="{stage_data}"><span class="cur">$</span><span class="num">22,000</span></div>
      <p class="scene-label">{STAGES[0][1]}</p>
      <p class="scene-sub">{STAGES[0][2]}</p>
      <ol class="scene-steps">{''.join(f'<li data-s="{i}"><b>${n:,}</b>{plain(l)}</li>' for i, (n, l, s) in enumerate(STAGES))}</ol>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap split-head">
    <h2 data-anim="left">You learn AI by using it.</h2>
    <div data-anim="right" style="display:grid;gap:18px">
      <p class="big">Courses spend weeks on theory. Every kit hands you real prompts and a first project, so the learning happens while you work.</p>
    </div>
  </div>
  <div class="wrap kit-grid">
    {''.join(kit_card(k) for k in KITS[:3])}
  </div>
  <p class="wrap" style="margin-top:34px"><a class="tlink" href="/kits/">See all the kits</a></p>
</section>

<section class="pin-steps" aria-label="The kits, piece by piece">
  <div class="pin-sticky">
    <div class="wrap mini-steps">
      {hexsvg('Six pieces: the free guide and five kits')}
      <div>
        <h2>Start free. Add pieces as you go.</h2>
        <ol>{''.join(f'<li data-step="{i}"><a href="{u}">{n}</a><em>{p}</em></li>' for i, (n, u, p) in enumerate(LADDER))}</ol>
        <a class="tlink" href="/kits/complete-bundle/">Or get the whole hexagon for $297</a>
      </div>
    </div>
  </div>
</section>

<section class="sec spotlight">
  <div class="wrap spot-grid">
    <div data-anim="left">
      <h2>Stop typing a prompt every time you need a post.</h2>
      <p class="big" style="margin-top:20px">The AI for Marketing kit takes you from asking good questions to having AI make your content on its own, in your brand.</p>
      <div class="row" style="margin-top:28px">{btn("/kits/ai-for-marketing/", "See the marketing kit")}<span class="muted">$97</span></div>
    </div>
    <ol class="levels" data-anim="right">{''.join(f'<li><span class="n">0{i + 1}</span><b>{t}</b><p>{d}</p></li>' for i, (t, d) in enumerate(LEVELS))}</ol>
  </div>
  <div class="wrap">{tip(BY["ai-for-marketing"]["tip"])}</div>
</section>

<section class="sec team-sec navy-sec">
  <div class="wrap team">
    <div data-anim="left">
      <h2>Got a marketing person? Hand them this.</h2>
      <p class="big">Sending one employee to a university AI certificate can cost $2,000 to $5,000. The marketing kit is $97, and they can start this afternoon.</p>
      <div class="row" style="margin-top:26px">{btn("/kits/ai-for-marketing/", "Get it for your team")}<a class="tlink light" href="/kits/complete-bundle/">Or the full bundle</a></div>
    </div>
    <div class="team-compare" data-anim="right">
      <div><span>University certificate</span><b>$2,000+</b><i>Months of classes</i></div>
      <div class="ours"><span>AI for Marketing kit</span><b>$97</b><i>Start today</i></div>
    </div>
  </div>
</section>

<section class="sec podcast-teaser">
  <div class="wrap pod">
    <div class="pod-art" data-anim="left"><img src="/assets/arc/presents-floor.webp" alt="" width="499" height="900" loading="lazy"><span class="mic">AI<br>Monday</span></div>
    <div data-anim="right">
      <h2>AI Monday</h2>
      <p class="big" style="margin-top:18px">Our podcast. AI news, the tools worth trying and real examples of us doing the same kind of work that&rsquo;s in the kits.</p>
      <div style="margin-top:26px">{listen_row()}</div>
      <p style="margin-top:22px"><a class="tlink" href="/podcast/">About the podcast</a></p>
    </div>
  </div>
</section>

<section class="sec gray-sec">
  <div class="wrap faq-wrap">
    <h2 data-anim="left">Questions.</h2>
    <div>
      <div class="faq" data-anim="up">{faq_html(HOME_Q)}</div>
      <p style="margin-top:26px"><a class="tlink" href="/questions/">More questions about AI</a></p>
    </div>
  </div>
</section>

<section class="pin-laptop navy-sec" aria-label="Where to next">
  <div class="pin-sticky">
    <div class="wrap laptop-scene">
      <div class="arc-desk"><img src="/assets/arc/laptop.webp" alt="Arc working on a laptop" width="849" height="1012" loading="lazy"><span class="emit" aria-hidden="true"></span></div>
      <div class="launch">
        <h2>Where to next?</h2>
        <div class="cards">
          <a class="lcard go" href="/free-guide/"><b>Free guide</b><span>Seven days, one small task a day.</span></a>
          <a class="lcard" href="/kits/"><b>The kits</b><span>Pick one and start today.</span></a>
          <a class="lcard" href="/podcast/"><b>AI Monday</b><span>Watch how we use AI for real.</span></a>
          <a class="lcard" href="/questions/"><b>Questions</b><span>Plain answers about using AI.</span></a>
        </div>
      </div>
    </div>
  </div>
</section>
'''
home += footer()
write('/', home)

# ================================================================ kits index
kp = head('AI Starter Kits | Arcane Designer', 'Downloadable AI kits for beginners, marketers, new business owners and DIY website builders. Real prompts and short videos. From $47.', '/kits/',
          schema=[ORG] + [product_schema(k) for k in ALL])
kp += header('/kits/')
kp += f'''<section class="intro glow">
  <div class="wrap work-intro">
    <div data-anim="up">
      <h1>Pick a kit. Start{NB}today.</h1>
      <p class="big">Each kit is a download with real prompts, short videos of us doing the work and a first project to finish.</p>
    </div>
    <img src="/assets/arc/presents.webp" alt="" width="499" height="900" data-anim="right">
  </div>
</section>
<section class="sec" style="padding-top:10px">
  <div class="wrap kit-grid">
    {''.join(kit_card(k, "main" if k.get("lead") else "") for k in KITS)}
    <a class="price link-card kit-card bundle-card" href="/kits/complete-bundle/" data-anim="up"><span class="flag">Best value</span><h3>{BUNDLE["name"]}</h3><span class="amt"><s class="was">${ALL_SEPARATE}</s>${BUNDLE["price"]}</span><p>Every kit, plus updates as the AI tools change. You save ${ALL_SEPARATE - BUNDLE["price"]} over buying them one by one.</p><span class="see">See what&rsquo;s inside</span></a>
  </div>
  <div class="wrap"><div class="free-strip" data-anim="up">
    <div><h3>Not sure yet?</h3><p>Start with {FREE["name"]}. It&rsquo;s free, and it&rsquo;s the easiest way to find out if the kits are for you.</p></div>
    {btn("/free-guide/", "Get the free guide")}
  </div></div>
</section>
<section class="sec gray-sec">
  <div class="wrap faq-wrap">
    <h2 data-anim="left">About the kits.</h2>
    <div class="faq" data-anim="up">{faq_html(QUESTIONS[4][1])}</div>
  </div>
</section>
'''
kp += footer()
write('/kits/', kp)

# ================================================================ kit pages
for k in ALL:
    others = [o for o in KITS if o['slug'] != k['slug']][:3]
    is_bundle = k['slug'] == 'complete-bundle'
    inside = KITS if is_bundle else None
    p = head(f'{plain(k["name"])} | Arcane Designer', plain(k['line']) + ' A downloadable AI kit with real prompts and short videos.', f'/kits/{k["slug"]}/',
             schema=[product_schema(k), faq_schema(k['faq'])])
    p += header('/kits/')
    sizes = {'presents': (499, 900), 'stands': (336, 900), 'presents-floor': (499, 900), 'crouch-point': (513, 900), 'flabbergasted': (395, 900), 'hands-up': (459, 900)}
    w, h = sizes[k['pose']]
    p += f'''<section class="intro glow kit-hero">
  <div class="wrap kit-hero-grid">
    <div data-anim="up">
      <a class="back" href="/kits/">All kits</a>
      <h1>{k["name"]}</h1>
      <p class="big">{k["line"]}</p>
      <div class="buy">
        <span class="amt">{f'<s class="was">${ALL_SEPARATE}</s>' if is_bundle else ''}${k["price"]}</span>
        {btn(buy_href(k["slug"]), "Get the kit")}
      </div>
      <p class="muted small">One-time price. Yours to keep.</p>
    </div>
    <img src="/assets/arc/{k["pose"]}.webp" alt="" width="{w}" height="{h}" data-anim="right">
  </div>
</section>
'''
    if VIDEOS.get(k['slug']):
        p += f'''<section class="sec" style="padding-top:0"><div class="wrap"><div class="video" data-anim="tilt"><iframe src="{VIDEOS[k["slug"]]}" title="{plain(k["name"])} walkthrough" allow="fullscreen" loading="lazy"></iframe></div></div></section>
'''
    p += f'''<section class="sec" style="padding-top:20px">
  <div class="wrap who" data-anim="up">
    <h2>Who it&rsquo;s for</h2>
    <p class="big">{k["who"]}</p>
  </div>
</section>
'''
    if is_bundle:
        p += f'''<section class="sec gray-sec">
  <div class="wrap">
    <h2 data-anim="left" style="margin-bottom:36px">Everything that&rsquo;s included</h2>
    <div class="kit-grid">{''.join(kit_card(o) for o in KITS)}</div>
    <p class="muted" style="margin-top:28px">Bought separately, that&rsquo;s ${sum(o["price"] for o in KITS)}. The bundle is ${k["price"]}, and it includes updates as the tools change.</p>
  </div>
</section>
'''
    else:
        p += f'''<section class="sec gray-sec">
  <div class="wrap">
    <h2 data-anim="left" style="margin-bottom:36px">What&rsquo;s inside</h2>
    <div class="inside">{''.join(f'<div class="inside-card" data-anim="up" style="--d:{i * .08:.2f}s"><span class="n">0{i + 1}</span><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(k["inside"]))}</div>
  </div>
</section>
'''
    if k.get('levels'):
        p += f'''<section class="sec">
  <div class="wrap spot-grid">
    <div data-anim="left">
      <h2>Three levels, one engine.</h2>
      <p class="big" style="margin-top:20px">Start by asking. Then set it to run on a schedule. Then build something that runs your marketing for you.</p>
    </div>
    <ol class="levels" data-anim="right">{''.join(f'<li><span class="n">0{i + 1}</span><b>{t}</b><p>{d}</p></li>' for i, (t, d) in enumerate(LEVELS))}</ol>
  </div>
</section>
'''
    p += f'''<section class="sec" style="padding-block:20px 60px"><div class="wrap">{tip(k["tip"], "crouch-point")}</div></section>
<section class="sec gray-sec">
  <div class="wrap faq-wrap">
    <h2 data-anim="left">Questions.</h2>
    <div class="faq" data-anim="up">{faq_html(k["faq"] + QUESTIONS[4][1][:2])}</div>
  </div>
</section>
'''
    if not is_bundle:
        p += f'''<section class="sec">
  <div class="wrap">
    <h2 data-anim="left" style="margin-bottom:36px">Pairs well with</h2>
    <div class="kit-grid">{''.join(kit_card(o) for o in others)}</div>
    <div class="free-strip" data-anim="up" style="margin-top:34px">
      <div><h3>Want all of them?</h3><p>The Complete Bundle has every kit for ${BUNDLE["price"]}, plus updates as the tools change.</p></div>
      {btn("/kits/complete-bundle/", "See the bundle")}
    </div>
  </div>
</section>
'''
    p += footer()
    write(f'/kits/{k["slug"]}/', p)

# ================================================================ free guide
DAYS = [('Pick one tool', 'Set up a free AI account and get comfortable with the chat box.'),
        ('Ask for real help', 'Hand it something on your actual to-do list.'),
        ('Tell it about you', 'Give it context about your work, so its answers fit you.'),
        ('Write something', 'Draft an email, a post or a bio with it, then make it yours.'),
        ('Plan your week', 'Use it to sort your week and break a big task into steps.'),
        ('Try a second tool', 'Run the same task in another tool and compare.'),
        ('Finish a project', 'Take one small project from start to done with AI&rsquo;s help.')]
fg = head('Free Guide: Your First 7 Days with AI | Arcane Designer', 'A free 7-day guide to start using AI for real, one small task a day, with a ready-to-use prompt for every day.', '/free-guide/')
fg += header('/free-guide/')
fg += f'''<section class="intro glow">
  <div class="wrap guide-grid">
    <div data-anim="up">
      <h1>Your first 7 days with{NB}AI.</h1>
      <p class="big">A free guide that gets you using AI for real, one small task a day. Every day comes with a prompt to copy and a small win to show for it.</p>
      <form class="form form-card guide-form" data-form="guide" novalidate>
        <div class="row">
          <div class="field"><label for="g-name">First name</label><input id="g-name" name="first_name" autocomplete="given-name" required></div>
          <div class="field"><label for="g-email">Email</label><input id="g-email" name="email" type="email" autocomplete="email" required></div>
        </div>
        <input type="hidden" name="kit" value="">
        <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="form-foot"><button class="btn" type="submit"><span>Send me the guide</span></button></div>
        <div class="form-status" role="status" tabindex="-1" hidden></div>
      </form>
    </div>
    <div class="guide-art" data-anim="right" aria-hidden="true">
      <div class="book-stage"><div class="book3d">
        <div class="face front"><img class="b-hex b1" src="/assets/brand/hex-teal.webp" alt=""><img class="b-hex b2" src="/assets/brand/hex-pink.webp" alt=""><img class="b-hex b3" src="/assets/brand/hex-blue.webp" alt=""><span class="b-kicker">Free guide</span><b>Your First 7&nbsp;Days with&nbsp;AI</b><span class="b-brand">Arcane Designer</span></div>
        <div class="face back"><span>7 days</span><span>7 small wins</span><span class="b-brand">Arcane Designer</span></div>
        <div class="face spine"><span>Your First 7 Days with AI</span></div>
        <div class="face pages"></div>
        <div class="face top"></div>
      </div><div class="book-glow"></div></div>
      <img class="guide-arc" src="/assets/arc/hands-up.webp" alt="" width="459" height="900">
    </div>
  </div>
</section>
'''
fg += closer('Want to go further?', 'Every kit picks up where the guide leaves off, with real prompts and a first project.', 'Browse the kits', '/kits/', 'presents')
fg += footer()
write('/free-guide/', fg)

# ================================================================ podcast
pc = head('AI Monday Podcast | Arcane Designer', 'AI Monday is a podcast about AI news, tools and using AI for real work, with live examples of the same work covered in the Arcane Designer kits.', '/podcast/')
pc += header('/podcast/')
def _verb(l):
    return ('Watch on ' if l == 'YouTube' else 'Listen on ' if l in ('Spotify', 'Apple Podcasts') else 'Follow on ') + l
LISTEN = [(l, u) for l, u in PODCAST_LINKS if l != 'Instagram']
INSTA = next((u for l, u in PODCAST_LINKS if l == 'Instagram'), '')
listen = ''.join(f'<a class="btn {"" if i == 0 else "dark"}" href="{u}" target="_blank" rel="noopener"><span>{_verb(l)}</span></a>' for i, (l, u) in enumerate(LISTEN))
pc += f'''<section class="intro glow">
  <div class="wrap work-intro">
    <div data-anim="up">
      <h1>AI Monday.</h1>
      <p class="big">A podcast about AI news, the tools worth trying and how we actually use them. Watch the kits come to life.</p>
      <div style="margin-top:28px">{listen_row()}</div>
    </div>
    <img src="/assets/arc/presents-floor.webp" alt="" width="499" height="900" data-anim="right">
  </div>
</section>
<section class="sec" style="padding-top:20px">
  <div class="wrap inside">
    <div class="inside-card" data-anim="up"><span class="n">01</span><h3>See how we work</h3><p>Real examples of us using AI live, the same kind of work you&rsquo;ll find in the kits.</p></div>
    <div class="inside-card" data-anim="up" style="--d:.08s"><span class="n">02</span><h3>AI news and tools</h3><p>What&rsquo;s new in AI, which tools are worth your time and what we&rsquo;re using right now.</p></div>
    <div class="inside-card" data-anim="up" style="--d:.16s"><span class="n">03</span><h3>Take it further</h3><p>Like what you see? The kits give you the prompts and steps to do it yourself.</p></div>
  </div>
''' + (f'''  <div class="wrap insta-row" data-anim="up"><span>Clips, behind the scenes and episode news</span><a class="insta" href="{INSTA}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>Follow @aimondaypod</a></div>
''' if INSTA else '') + '''</section>
'''
if EPISODES:
    pc += '<section class="sec gray-sec"><div class="wrap"><h2 style="margin-bottom:30px">Episodes</h2><div class="episodes">' + ''.join(
        f'<a class="episode" href="{u}" target="_blank" rel="noopener"><b>{t}</b><span>{s}</span></a>' for t, s, u in EPISODES) + '</div></div></section>\n'
pc += closer('Start before Monday.', 'Grab the free 7-day guide and you&rsquo;ll have something to show by the next episode.')
pc += footer()
write('/podcast/', pc)

# ================================================================ questions library
qa = head('AI Questions, Answered Plainly | Arcane Designer', 'Plain answers to common questions about getting started with AI: which tool to use, what a prompt is, AI for small business marketing and more.', '/questions/',
          schema=faq_schema(ALL_Q))
qa += header('/questions/')
qa += f'''<section class="intro glow">
  <div class="wrap work-intro">
    <div data-anim="up">
      <h1>Questions about AI, answered plainly.</h1>
      <p class="big">The things people ask us most. If yours isn&rsquo;t here, send it to us on LinkedIn and we&rsquo;ll add it.</p>
    </div>
    <img src="/assets/arc/flabbergasted.webp" alt="" width="395" height="900" data-anim="right">
  </div>
</section>
'''
for i, (group, items) in enumerate(QUESTIONS):
    qa += f'''<section class="sec {'gray-sec' if i % 2 else ''}" style="padding-block:clamp(50px,6vw,80px)">
  <div class="wrap faq-wrap">
    <h2 data-anim="left">{group}</h2>
    <div class="faq" data-anim="up">{faq_html(items)}</div>
  </div>
</section>
'''
qa += closer()
qa += footer()
write('/questions/', qa)

# ================================================================ about
ab = head('About Arcane Designer | Jordan and Nathan', 'Arcane Designer is a sister and brother team from Spokane making downloadable AI starter kits, plus Arc, the bird in the mask.', '/about/', schema=ORG)
ab += header('/about/')
ab += f'''<section class="intro glow">
  <div class="wrap work-intro">
    <div data-anim="up">
      <h1>We&rsquo;re Jordan and{NB}Nathan.</h1>
      <p class="big">Practical AI training &amp; tools for business owners, marketers, and everyday people. We think the best way to learn AI is to use it.</p>
    </div>
    <img src="/assets/arc/stands.webp" alt="" width="336" height="900" data-anim="right">
  </div>
</section>
<section class="sec" style="padding-top:20px">
  <div class="wrap about-cards">
    <div class="inside-card" data-anim="up"><h3>Jordan</h3><p>Jordan leads the videos. When a kit says &ldquo;watch me do it,&rdquo; that&rsquo;s Jordan, solving a real task with AI on screen. <a class="tlink" href="{LINKEDIN_JORDAN}" target="_blank" rel="noopener">Jordan on LinkedIn</a></p></div>
    <div class="inside-card" data-anim="up" style="--d:.08s"><h3>Nathan</h3><p>Nathan designs and builds websites, apps and brands, most of it with AI. He builds the kits and this site. <a class="tlink" href="{LINKEDIN_NATHAN}" target="_blank" rel="noopener">Nathan on LinkedIn</a></p></div>
    <div class="inside-card" data-anim="up" style="--d:.16s"><h3>Arc</h3><p>The bird in the mask. Arc shows up with tips throughout the kits, and he&rsquo;s much better at lounging than we are.</p></div>
  </div>
</section>
<section class="sec gray-sec">
  <div class="wrap split-head" style="margin-bottom:0">
    <h2 data-anim="left">Why kits, and not a course?</h2>
    <div data-anim="right" style="display:grid;gap:16px">
      <p class="big">AI changes every few months. A semester-long course is out of date before it ends.</p>
      <p class="big">A kit gets you working the same day, and we update it when the tools change.</p>
    </div>
  </div>
</section>
'''
ab += closer()
ab += footer()
write('/about/', ab)

# ================================================================ contact (old address kept)
ct = head('Contact | Arcane Designer', 'Send Arcane Designer a message about a kit, the AI Monday podcast or anything else.', '/contact')
ct += header('/contact')
ct += f'''<section class="intro glow contact-intro">
  <div class="wrap">
    <img src="/assets/arc/presents-floor.webp" alt="" width="499" height="900" data-anim="left">
    <div data-anim="up">
      <h1>Say hello.</h1>
      <p class="big">Questions about a kit, an idea for the podcast or something you want us to cover? We read everything.</p>
    </div>
  </div>
</section>
<section class="sec" style="padding-top:0">
  <div class="wrap">
    <form class="form form-card contact-form" data-form="contact" data-thanks="Thanks, it came through. We&rsquo;ll get back to you soon." novalidate data-anim="up">
      <div class="row">
        <div class="field"><label for="c-name">Your name</label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
      </div>
      <fieldset class="field">
        <legend>What&rsquo;s it about? <span class="opt">(optional)</span></legend>
        <div class="choices">
          <label><input type="radio" name="topic" value="A kit"> A kit</label>
          <label><input type="radio" name="topic" value="The podcast"> The podcast</label>
          <label><input type="radio" name="topic" value="Something else"> Something else</label>
        </div>
      </fieldset>
      <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="message" required></textarea></div>
      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-foot"><button class="btn" type="submit"><span>Send message</span></button></div>
      <div class="form-status" role="status" tabindex="-1" hidden></div>
    </form>
  </div>
</section>
'''
ct += footer()
write('/contact', ct)

# ================================================================ 404
nf = head('Page Not Found | Arcane Designer', 'This page does not exist.', '/404', noindex=True)
nf += header('/404')
nf += f'''<section class="sec glow">
  <div class="wrap" style="display:grid;grid-template-columns:auto 1fr;gap:clamp(24px,5vw,60px);align-items:center;max-width:960px">
    <img src="/assets/arc/flabbergasted.webp" alt="" width="395" height="900" style="width:clamp(110px,14vw,170px)">
    <div style="display:grid;gap:22px;justify-items:start">
      <h1 style="font-size:clamp(2.4rem,1.6rem + 3vw,4rem)">That page isn&rsquo;t here.</h1>
      <p class="big">We moved things around. The kits and the free guide are a click away.</p>
      <div class="row" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">{btn("/", "Go to the home page")}<a class="tlink" href="/kits/">See the kits</a></div>
    </div>
  </div>
</section>
'''
nf += footer()
write('/404', nf)

# ================================================================ sitemap
with open('sitemap.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for r in WRITTEN:
        if r == '/404':
            continue
        f.write(f'  <url><loc>{BASE}{r}</loc></url>\n')
    f.write('</urlset>\n')
print('wrote sitemap.xml')
