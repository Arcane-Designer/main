/* ============================================================
   ARCANE DESIGNER - products.js
   THE SINGLE SOURCE OF TRUTH for the whole store.
   Home, Shop, and Product pages all render from this file.

   TO GO LIVE:
     1. Set GUMROAD_USER below to your real Gumroad username.
     2. For each product, set "permalink" to the product's Gumroad
        permalink (the part after /l/ in its URL). Leave it '' and the
        Buy button shows "Coming soon" instead of a dead link.
     3. Replace the sample "reviews" / "rating" / "reviewCount" and the
        SITE.stats numbers with REAL figures before launch. They are
        clearly marked placeholders so the store looks complete now.
        Do not present them as real until they are.
   ============================================================ */

window.ARCANE = (function () {
  'use strict';

  /* ---- Store-wide config ------------------------------------ */
  const GUMROAD_USER = 'arcanedesigner';          // your Gumroad username
  const CART_URL     = 'https://' + GUMROAD_USER + '.gumroad.com/';
  const CURRENCY     = 'USD';

  /* Site-wide numbers shown in the trust band. PLACEHOLDER: edit these. */
  const SITE = {
    stats: [
      { value: '2,400+', label: 'downloads' },      // replace with real
      { value: '4.9/5',  label: 'average rating' }, // replace with real
      { value: '30-day', label: 'money-back guarantee' },
      { value: 'Instant', label: 'digital delivery' }
    ]
  };

  /* ---- Taxonomy (drives the Shop filters) ------------------- */
  const CATEGORIES = [
    { slug: 'prompts',   label: 'AI Prompts' },
    { slug: 'templates', label: 'Templates' },
    { slug: 'playbooks', label: 'Playbooks' },
    { slug: 'toolkits',  label: 'Toolkits' },
    { slug: 'courses',   label: 'Courses' },
    { slug: 'bundles',   label: 'Bundles' }
  ];

  const SKILL_LEVELS = [
    { slug: 'apprentice', label: 'Beginner',     hint: 'New to marketing' },
    { slug: 'adept',      label: 'Intermediate', hint: 'Some experience' },
    { slug: 'archmage',   label: 'Advanced',     hint: 'Ready to scale' }
  ];

  const PRICE_BANDS = [
    { slug: 'free',    label: 'Free',       test: c => c === 0 },
    { slug: 'under30', label: 'Under $30',  test: c => c > 0 && c < 3000 },
    { slug: 'mid',     label: '$30 to $99', test: c => c >= 3000 && c < 10000 },
    { slug: 'premium', label: 'Premium',    test: c => c >= 10000 }
  ];

  /* A shared FAQ shown on every product page (product.faq can add more). */
  const GLOBAL_FAQ = [
    { q: 'How do I get my files?',
      a: 'The second your payment clears, Gumroad emails you a secure download link and adds the product to your Gumroad library. No waiting, no "ships in 3 to 5 days." It is a digital download.' },
    { q: 'What format is it in?',
      a: 'Most products are a mix of PDF guides plus ready-to-use Notion, Google Docs, or Canva templates. Each product lists its exact formats under "The fine print."' },
    { q: 'Can I use this for client work?',
      a: 'Yes. Every product includes a personal and commercial license for one brand or business, so you can use it for your own marketing or a client\'s. You just cannot resell or redistribute the files themselves.' },
    { q: 'What if it is not for me?',
      a: 'Every purchase is backed by a 30-day, no-questions-asked money-back guarantee. If it does not help, reply to your receipt and you get a full refund.' }
  ];

  /* ---- The catalog ------------------------------------------ */
  /* priceCents / compareAtCents in cents. permalink = Gumroad slug. */
  const products = [

    /* 1 - FREE LEAD MAGNET (delivered via the Free page, not Gumroad) */
    {
      id: 1,
      slug: 'marketers-spellbook',
      name: "The Marketer's Spellbook",
      kicker: 'Free starter pack',
      tagline: '25 ready-to-use AI prompts that turn a blank page into a week of content.',
      priceCents: 0,
      compareAtCents: null,
      category: 'prompts',
      skillLevel: 'apprentice',
      flags: ['free'],
      permalink: '',                 // free: handled by free.html, not Gumroad
      isLeadMagnet: true,
      cover: { grad: 'teal-blue', icon: 'grimoire', pages: true },
      blurb: "Your first one is on the house. Twenty-five copy-and-paste AI prompts for social posts, emails, hooks, and headlines. Go from staring at a blank screen to a full week of content in an afternoon.",
      outcomes: [
        'Never stare at a blank prompt box again',
        'Produce a week of content in one sitting',
        'See exactly how pro marketers prompt AI'
      ],
      whatsInside: [
        '25 categorized, copy-and-paste AI prompts (social, email, blog, ads)',
        'A one-page guide on how to prompt like a marketer',
        'Fill-in-the-blank variables so every prompt fits your brand',
        'Works with ChatGPT, Claude, or Gemini, free tiers included'
      ],
      format: 'PDF and Notion template',
      license: 'Free for personal and commercial use',
      requirements: 'Any free AI chatbot account (ChatGPT, Claude, or Gemini)',
      rating: null, reviewCount: 0, reviews: []
    },

    /* 2 - The Grand Prompt Grimoire */
    {
      id: 2,
      slug: 'grand-prompt-grimoire',
      name: 'The Grand Prompt Grimoire',
      kicker: '300+ marketing prompts',
      tagline: '300+ marketing prompts organized by task, so you never face a blank prompt box again.',
      priceCents: 1900,
      compareAtCents: null,
      category: 'prompts',
      skillLevel: 'apprentice',
      flags: ['bestseller'],
      permalink: '',                 // set to your Gumroad permalink
      cover: { grad: 'pink-teal', icon: 'grimoire', pages: true },
      blurb: "The upgrade to your free starter pack. Over 300 tested marketing prompts, sorted by what you are actually trying to do (launch a product, write a newsletter, fix a stuck funnel), so you get from question to finished draft in minutes.",
      outcomes: [
        'A finished first draft for almost any marketing task in minutes',
        'Stop wasting your best ideas on bad prompts',
        'One reference you will open every week'
      ],
      whatsInside: [
        '300+ prompts across 12 marketing categories',
        'Every prompt tagged by goal, channel, and funnel stage',
        'A prompt-chaining section for multi-step campaigns',
        'Notion database plus printable PDF, so you can search or browse',
        'Free lifetime updates as new prompts are added'
      ],
      format: 'Notion database and PDF',
      license: 'Personal and commercial use for one brand',
      requirements: 'Free Notion account (optional) plus any AI chatbot',
      rating: 4.9, reviewCount: 128,
      reviews: [
        { name: 'Jordan M.', role: 'Freelance marketer', stars: 5, text: 'I keep this open in a second tab all day. The chaining section alone paid for it ten times over.' },
        { name: 'Priya S.', role: 'Etsy shop owner', stars: 5, text: 'I don\'t "do" marketing and this made me feel like I finally could. Found a prompt for every wall I hit.' }
      ]
    },

    /* 3 - Enchanted Feed */
    {
      id: 3,
      slug: 'enchanted-feed',
      name: 'Enchanted Feed',
      kicker: '40 Canva social templates',
      tagline: '40 on-brand Canva templates that make a one-person brand look like it has a design team.',
      priceCents: 2400,
      compareAtCents: null,
      category: 'templates',
      skillLevel: 'apprentice',
      flags: ['bestseller'],
      permalink: '',
      cover: { grad: 'blue-pink', icon: 'template' },
      blurb: "Forty editable Canva templates: carousels, quote posts, promos, and stories, all designed to make a solo brand look like it hired an agency. Swap in your colors and logo once and your whole feed is handled.",
      outcomes: [
        'A consistent, professional feed without a designer',
        'Post in minutes instead of fighting Canva for an hour',
        'Look put-together across every platform'
      ],
      whatsInside: [
        '40 editable Canva templates (carousels, quotes, promos, stories)',
        'Sized for Instagram, LinkedIn, Facebook, and Pinterest',
        'One-click brand kit swap for your colors, fonts, and logo',
        'A 15-minute setup video',
        'Bonus: 30 hook-headline ideas to drop in'
      ],
      format: 'Canva templates and setup video',
      license: 'Personal and commercial use for one brand',
      requirements: 'Free Canva account',
      rating: 4.8, reviewCount: 74,
      reviews: [
        { name: 'Devon R.', role: 'Coach', stars: 5, text: 'My feed finally looks like a real brand. Clients literally asked who does my graphics. It\'s me, in 5 minutes.' }
      ]
    },

    /* 4 - The Content Calendar */
    {
      id: 4,
      slug: 'content-calendar',
      name: 'The Content Calendar',
      kicker: '12-month content calendar',
      tagline: 'A 12-month calendar pre-loaded with 200+ post ideas, so you always know what to post next.',
      priceCents: 2700,
      compareAtCents: null,
      category: 'templates',
      skillLevel: 'adept',
      flags: ['new'],
      permalink: '',
      cover: { grad: 'navy-teal', icon: 'calendar' },
      blurb: "The end of \"what do I post today?\" A full 12-month content calendar pre-loaded with 200+ post ideas and prompts, themed by month and week, so you always know your next move before you open the app.",
      outcomes: [
        'Always know exactly what to post next',
        'Plan a whole month in under an hour',
        'Turn random posting into a real routine'
      ],
      whatsInside: [
        '12-month calendar in Notion and Google Sheets',
        '200+ pre-written post ideas and prompts, themed by month',
        'A content-pillar planner and repurposing tracker',
        'Weekly and monthly views with a simple posting checklist',
        'A campaign planner for launches and promos'
      ],
      format: 'Notion and Google Sheets',
      license: 'Personal and commercial use for one brand',
      requirements: 'Free Notion or Google account',
      rating: 4.9, reviewCount: 51,
      reviews: [
        { name: 'Sam T.', role: 'Small-biz owner', stars: 5, text: 'I went from posting twice a month to a real schedule I actually keep. The prompts remove every excuse.' }
      ]
    },

    /* 5 - Fill-in-the-Blank Copy Pack */
    {
      id: 5,
      slug: 'copy-pack',
      name: 'Fill-in-the-Blank Copy Pack',
      kicker: '30 copy formulas',
      tagline: '30 proven copy formulas as fill-in-the-blank templates. High-converting copy, no blank page.',
      priceCents: 1700,
      compareAtCents: null,
      category: 'templates',
      skillLevel: 'apprentice',
      flags: [],
      permalink: '',
      cover: { grad: 'pink-teal', icon: 'copy' },
      blurb: "Thirty of the highest-converting copy formulas in marketing, rewritten as fill-in-the-blank templates. Drop in your product and audience and out comes a headline, email, or ad that actually sells. No copywriting degree required.",
      outcomes: [
        'Write copy that converts without the blank-page panic',
        'Sound persuasive without sounding pushy',
        'Use frameworks proven across thousands of campaigns'
      ],
      whatsInside: [
        '30 fill-in-the-blank copy formulas (headlines, emails, ads, CTAs)',
        'A voice and tone cheat sheet so it still sounds like you',
        'Before-and-after examples for every formula',
        'A swipe file of 50 high-converting subject lines'
      ],
      format: 'Google Docs and PDF',
      license: 'Personal and commercial use for one brand',
      requirements: 'Free Google account (optional)',
      rating: 4.7, reviewCount: 39,
      reviews: [
        { name: 'Alex P.', role: 'Newsletter writer', stars: 5, text: 'The subject-line swipe file bumped my open rate the first week. Ridiculous value for the price.' }
      ]
    },

    /* 6 - The Solopreneur's Playbook */
    {
      id: 6,
      slug: 'solopreneurs-playbook',
      name: "The Solopreneur's Playbook",
      kicker: 'Beginner-to-launched plan',
      tagline: 'The complete beginner-to-launched marketing plan. 60 pages plus 8 worksheets, zero jargon.',
      priceCents: 4900,
      compareAtCents: null,
      category: 'playbooks',
      skillLevel: 'apprentice',
      flags: ['bestseller'],
      permalink: '',
      cover: { grad: 'teal-blue', icon: 'playbook', pages: true },
      blurb: "If you know you should be marketing but have no idea where to start, this is your map. A 60-page, plain-English playbook that walks you from zero to a running marketing system: positioning, channels, content, email, and a 90-day plan, with worksheets at every step.",
      outcomes: [
        'A clear, written marketing plan you can actually follow',
        'Confidence about where to spend your limited time',
        'A 90-day roadmap instead of random tactics'
      ],
      whatsInside: [
        '60-page step-by-step playbook (no jargon, all action)',
        '8 fill-in worksheets: positioning, offer, channels, funnel',
        'A 90-day launch roadmap with weekly checklists',
        'Templates for your first landing page and email sequence',
        'A "pick your channel" decision guide'
      ],
      format: 'PDF and editable worksheets',
      license: 'Personal and commercial use for one brand',
      requirements: 'None',
      rating: 4.9, reviewCount: 96,
      reviews: [
        { name: 'Maria G.', role: 'Bakery owner', stars: 5, text: 'I finally understand what I\'m doing and why. The 90-day plan took the overwhelm away completely.' },
        { name: 'Chris L.', role: 'Consultant', stars: 5, text: 'Worth ten times the price. This is the marketing course I wish I\'d had two years ago.' }
      ]
    },

    /* 7 - The AI Assistant Toolkit */
    {
      id: 7,
      slug: 'ai-assistant-toolkit',
      name: 'The AI Assistant Toolkit',
      kicker: '12 AI roles + 150 prompts',
      tagline: '12 role-based AI assistants plus 150+ chained prompts that turn any chatbot into your marketing team.',
      priceCents: 5900,
      compareAtCents: null,
      category: 'toolkits',
      skillLevel: 'adept',
      flags: ['new'],
      permalink: '',
      cover: { grad: 'blue-teal', icon: 'toolkit' },
      blurb: "Give your AI a job title. This toolkit turns a plain chatbot into 12 specialists (a strategist, a copywriter, an email pro, a social manager, and more), each with a ready-made persona and prompt chains, so you get expert output instead of generic mush.",
      outcomes: [
        'Expert-level output from any AI, on demand',
        'A whole marketing team for the price of a lunch',
        'Stop getting generic, obviously-AI answers'
      ],
      whatsInside: [
        '12 role-based AI personas (strategist, copywriter, SEO, social, and more)',
        '150+ chained prompts for full campaigns, not one-offs',
        'Copy-and-paste setups for ChatGPT and Claude',
        'A workflow library for launches, newsletters, and funnels',
        'Quick-start guide plus example conversations'
      ],
      format: 'Notion and PDF prompt library',
      license: 'Personal and commercial use for one brand',
      requirements: 'ChatGPT or Claude account (free tier works)',
      rating: 4.8, reviewCount: 42,
      reviews: [
        { name: 'Taylor B.', role: 'Agency of one', stars: 5, text: 'The email assistant writes better sequences than contractors I used to pay. This is almost unfair.' }
      ]
    },

    /* 8 - AI Marketing Mini-Course */
    {
      id: 8,
      slug: 'ai-marketing-mini-course',
      name: 'AI Marketing Mini-Course',
      kicker: 'Weekend mini-course',
      tagline: 'Go from marketing-anxious to a live AI content system in one weekend. 6 lessons plus a workbook.',
      priceCents: 4900,
      compareAtCents: null,
      category: 'courses',
      skillLevel: 'apprentice',
      flags: [],
      permalink: '',
      cover: { grad: 'navy-pink', icon: 'course' },
      blurb: "A focused, do-it-with-me mini-course that takes you from \"I don't get marketing\" to a real, running AI content system by Sunday night. Six short lessons, one workbook, and a system you will actually keep using.",
      outcomes: [
        'A working AI content system by the end of the weekend',
        'The confidence to market without hiring anyone',
        'A repeatable weekly routine, not a one-time push'
      ],
      whatsInside: [
        '6 short video lessons (under 20 minutes each)',
        'A follow-along workbook with every template you need',
        'Your AI content system, built step by step',
        'A weekly checklist to keep it running',
        'Lifetime access plus future lesson updates'
      ],
      format: 'Video lessons and workbook (PDF)',
      license: 'Personal use plus commercial for one brand',
      requirements: 'An AI chatbot account and about 4 hours over a weekend',
      rating: 4.9, reviewCount: 63,
      reviews: [
        { name: 'Nina F.', role: 'Course creator', stars: 5, text: 'Finished Sunday, posted Monday, and haven\'t stopped since. Exactly the kickstart I needed.' }
      ]
    },

    /* 9 - The Lead-Gen & Email Kit */
    {
      id: 9,
      slug: 'lead-gen-email-kit',
      name: 'The Lead-Gen & Email Kit',
      kicker: 'Lead-gen and email system',
      tagline: 'A done-for-you funnel: 5 lead magnets, a 7-email welcome sequence, and the opt-in copy.',
      priceCents: 3900,
      compareAtCents: null,
      category: 'toolkits',
      skillLevel: 'adept',
      flags: [],
      permalink: '',
      cover: { grad: 'teal-blue', icon: 'funnel' },
      blurb: "Everything you need to turn strangers into subscribers into buyers, without building a funnel from scratch. Five ready lead-magnet templates, a proven 7-email welcome sequence, and the opt-in copy that gets people to say yes.",
      outcomes: [
        'A working email funnel without hiring anyone',
        'Grow a list that actually turns into sales',
        'Skip months of trial-and-error funnel building'
      ],
      whatsInside: [
        '5 lead-magnet templates (checklist, guide, quiz, swipe file, mini-kit)',
        'A 7-email welcome sequence, written and ready to paste',
        'High-converting opt-in page and pop-up copy',
        'A simple map of the whole funnel, start to sale',
        'Setup notes for Kit, Mailchimp, and Beehiiv'
      ],
      format: 'Google Docs, PDF, and email templates',
      license: 'Personal and commercial use for one brand',
      requirements: 'Any email platform (Kit, Mailchimp, Beehiiv, and so on)',
      rating: 4.8, reviewCount: 47,
      reviews: [
        { name: 'Omar H.', role: 'SaaS founder', stars: 5, text: 'Plugged the welcome sequence straight into Kit and started converting trial users in a week.' }
      ]
    },

    /* 10 - The Arcane Arsenal (complete bundle) */
    {
      id: 10,
      slug: 'arcane-arsenal',
      name: 'The Arcane Arsenal',
      kicker: 'The complete bundle',
      tagline: 'Every prompt, template, playbook, toolkit, and course. The whole vault at one price.',
      priceCents: 14900,
      compareAtCents: 29100,        // honest anchor = sum of #2 to #9 individually
      category: 'bundles',
      skillLevel: 'archmage',
      flags: ['bestseller', 'value'],
      permalink: '',
      cover: { grad: 'pink-teal', icon: 'bundle', pages: true },
      bundleOf: [2, 3, 4, 5, 6, 7, 8, 9],
      blurb: "The entire vault, unlocked. Every prompt pack, template set, playbook, toolkit, and course in one bundle, plus a 90-day roadmap that ties them together. If you are serious about handling your own marketing, this is the whole set at the lowest price per item.",
      outcomes: [
        'Every Arcane tool, ready the moment you need it',
        'The lowest possible price per product',
        'A complete DIY marketing system, start to finish'
      ],
      whatsInside: [
        'All 8 paid Arcane products (prompts, templates, playbooks, toolkits, course)',
        'A 90-day roadmap that shows you which tool to use when',
        'Every future product added to the vault, free',
        'Priority email support',
        'One checkout, one login, lifetime access'
      ],
      format: 'Everything above: PDF, Notion, Canva, Docs, and video',
      license: 'Personal and commercial use for one brand',
      requirements: 'None beyond each product\'s own',
      rating: 5.0, reviewCount: 34,
      reviews: [
        { name: 'Rae K.', role: 'Solo founder', stars: 5, text: 'I bought two products, loved them, then upgraded to the Arsenal. Just get this one. It\'s all here.' }
      ]
    },

    /* 11 - Inner Circle Membership */
    {
      id: 11,
      slug: 'inner-circle',
      name: 'Inner Circle Membership',
      kicker: 'New tools every month',
      tagline: 'New tools every month: fresh prompts, templates, and a "what\'s working now" marketing brief.',
      priceCents: 1200,               // $12/mo
      compareAtCents: null,
      priceSuffix: '/mo',
      annualNote: 'or $99/year (save 2 months)',
      category: 'bundles',
      skillLevel: 'adept',
      flags: ['new'],
      permalink: '',
      cover: { grad: 'blue-pink', icon: 'membership' },
      blurb: "Marketing changes every month, so your toolkit should too. Inner Circle drops new prompts, templates, and a short \"what's working now\" marketing brief every month, so you are never running last year's playbook.",
      outcomes: [
        'Always have fresh, current marketing tools',
        'Know what is actually working right now',
        'A steady drip of new tools, not a one-time buy'
      ],
      whatsInside: [
        'A new prompt pack or template set every month',
        'A monthly "what\'s working now" marketing brief',
        'A members-only archive of every past drop',
        'First access and discounts on new products',
        'Cancel anytime, keep everything you downloaded'
      ],
      format: 'Monthly digital drops (Notion hub)',
      license: 'Personal and commercial use for one brand',
      requirements: 'Free Notion account',
      rating: 4.9, reviewCount: 28,
      reviews: [
        { name: 'Jesse W.', role: 'Marketer', stars: 5, text: 'The monthly brief alone keeps me current. Cheapest "always up to date" button in marketing.' }
      ]
    },

    /* 12 - The AI Quickstart (50 tips, updated monthly) */
    {
      id: 12,
      slug: 'ai-quickstart',
      name: 'The AI Quickstart',
      kicker: '51 tips to start smart',
      tagline: '51 plain-English tips to get real work out of AI: content, prompting, tools, and agentic work.',
      priceCents: 999,
      compareAtCents: null,
      category: 'prompts',
      skillLevel: 'apprentice',
      flags: ['new'],
      permalink: '',
      cover: { grad: 'blue-teal', icon: 'playbook' },
      blurb: "New to AI, or still getting mediocre results out of it? This is the shortcut. 51 tips across six areas: getting started, prompting, sharper output, picking the right tool, working smart without the risks, and getting real work out of agents and coding. No fluff, no version-chasing. We keep it current, so the advice still holds as the tools change.",
      outcomes: [
        'Get useful output from AI on day one',
        'Stop settling for generic, robotic results',
        'Know which tool to reach for and when'
      ],
      whatsInside: [
        '51 tips across 6 categories',
        'Getting started, prompting, better output, picking the right tool, staying safe, and agentic/coding work',
        'Insider habits most people have not caught onto yet, like handing an agent the goal and letting it pick the route',
        'Plain examples you can copy and use today',
        'Written to stay current: general tool advice, updated regularly'
      ],
      format: 'PDF',
      license: 'Personal and commercial use for one brand',
      requirements: 'Any free AI chatbot account',
      rating: null, reviewCount: 0, reviews: []
    }
  ];

  /* ---- Bundles to merchandise on Shop/Home ------------------ */
  /* These reference existing products; the Arsenal (#10) is the flagship. */
  const bundles = [
    { slug: 'content-coven', name: 'The Content Combo', priceCents: 3900, compareAtCents: 6800,
      includes: [2, 3, 4], blurb: 'The "what do I post" combo: prompts, templates, and a calendar.' },
    { slug: 'launch-ritual', name: 'The Launch Kit', priceCents: 8900, compareAtCents: 10500,
      includes: [6, 9, 5], blurb: 'The "get your first customers" system: playbook, funnel, and copy.' }
  ];

  /* ---- Collection tiles for the Home "Shop by Collection" row */
  const collections = [
    { slug: 'prompts',   title: 'AI Prompts',  blurb: 'Prompt packs, sorted by task',        grad: 'teal-blue',  icon: 'grimoire' },
    { slug: 'templates', title: 'Templates',   blurb: 'Social, copy, and calendar templates', grad: 'pink-teal',  icon: 'template' },
    { slug: 'playbooks', title: 'Playbooks',   blurb: 'Step-by-step marketing plans',         grad: 'navy-teal',  icon: 'playbook' },
    { slug: 'toolkits',  title: 'Toolkits',    blurb: 'Done-for-you systems and kits',         grad: 'blue-teal',  icon: 'toolkit' },
    { slug: 'courses',   title: 'Courses',     blurb: 'Learn-by-doing mini-courses',           grad: 'navy-pink',  icon: 'course' },
    { slug: 'bundles',   title: 'Bundles',     blurb: 'Save with the complete Arsenal',        grad: 'pink-teal',  icon: 'bundle' }
  ];

  /* ---- Helpers ---------------------------------------------- */
  function buyUrl(p) {
    if (!p || !p.permalink) return '';
    return 'https://' + GUMROAD_USER + '.gumroad.com/l/' + p.permalink;
  }
  function formatPrice(cents) {
    if (cents === 0) return 'Free';
    const dollars = cents / 100;
    return '$' + (Number.isInteger(dollars) ? dollars : dollars.toFixed(2));
  }
  function bySlug(slug) { return products.find(p => p.slug === slug) || null; }
  function categoryLabel(slug) {
    const c = CATEGORIES.find(c => c.slug === slug);
    return c ? c.label : slug;
  }

  return {
    GUMROAD_USER, CART_URL, CURRENCY, SITE,
    CATEGORIES, SKILL_LEVELS, PRICE_BANDS, GLOBAL_FAQ,
    products, bundles, collections,
    buyUrl, formatPrice, bySlug, categoryLabel
  };
})();
