# Arcane Designer: Website

**Arcane Designer LLC**, *"Where Strategy Meets Sorcery"*

A **product-first** static storefront for instant-download AI marketing products: prompt packs,
templates, playbooks, toolkits, and mini-courses. Pure HTML/CSS/JS, no build step, no framework.
Sells through **Gumroad** (embeddable buy buttons) and grows an email list with a free lead magnet.
Designed for GitHub Pages.

---

## Project structure

```
/
├── index.html              # Home (product-first): hero, bestsellers, collections, lead magnet, bundle, testimonials
├── shop.html               # The Arcane Vault: faceted filter (category/level/price) + sort, renders from the catalog
├── product.html            # Product-detail TEMPLATE: reads ?p=<slug> and renders from the catalog
├── free.html               # Free "Marketer's Spellbook" lead magnet + email capture
├── thank-you.html          # Post-signup delivery + tripwire offer (noindexed)
├── about.html              # Founder story + trust markers (products only, no services)
├── contact.html            # Support form + FAQ (delivery/refunds/license)
├── 404.html                # On-brand not-found page
├── blog.html               # Blog index: real posts, topic filter, sidebar capture
├── blog/
│   ├── ai-marketing-is-not-cheating.html
│   ├── 5-prompts-replace-content-team.html
│   └── one-ai-tool-vs-a-stack.html
├── assets/
│   ├── data/products.js    # ★ THE SINGLE SOURCE OF TRUTH: the whole catalog
│   └── images/             # Logo + 8 "Arc" mascot poses
├── css/styles.css          # Design system (BlastForge palette, glass cards, components)
├── js/main.js              # Nav, product covers, shop filtering, product rendering, forms, JSON-LD
├── favicon.svg             # Hex-cluster favicon
├── sitemap.xml · robots.txt
└── README.md
```

**How the store renders:** `assets/data/products.js` defines every product once. `js/main.js` reads it to
build the shop grid, the home bestsellers/collections, and each product-detail page (it generates the
product "cover" art as inline SVG, so there are no image files to make). Edit the data, and every page updates.

---

## ✅ Go-live checklist (do these before launch)

Everything works in "demo mode" today. To take real money and send real email:

1. **Wire up Gumroad.** In `assets/data/products.js`:
   - Set `GUMROAD_USER` (top of the file) to your Gumroad username.
   - For each product, set `permalink` to its Gumroad permalink (the part after `/l/` in the product URL).
     While a `permalink` is blank, that product's Buy button shows **"Coming soon"** (never a dead link).
   - The Buy button opens the Gumroad overlay automatically (`gumroad.js` is loaded on product pages).

2. **Connect email capture.** Pick one and set it on every `<form data-arcane-form>`:
   - **Formspree:** set `action="https://formspree.io/f/XXXX"` (keep `method="POST"`). Add a hidden
     `<input type="hidden" name="_next" value="https://YOURDOMAIN/thank-you.html">` to redirect after submit.
   - **Netlify Forms:** add `data-netlify="true"` to the form tag (host on Netlify).
   - **Kit/ConvertKit/Mailchimp/Beehiiv:** paste their embed and point the free magnet at it.
   - Until you set a real `action`, forms show a success message and redirect locally (demo mode).
   - Set the actual download link on `thank-you.html` → `#download-btn`.

3. **Set your real domain.** Find/replace `https://arcanedesigner.com` across all `.html`,
   `sitemap.xml`, and `robots.txt` with your real URL (used by canonical tags, Open Graph, and JSON-LD).

4. **Replace the placeholder social proof.** The reviews, star ratings, and the trust-band numbers
   (`SITE.stats` in `products.js`, plus the About/Home stat blocks) are **sample content**. Swap in real
   figures, or remove them, before launch. Don't present sample reviews as real.

5. **Deploy.** Push to GitHub and enable Pages (Settings → Pages → Deploy from branch → `main` → `/root`).
   For a custom domain, add a `CNAME` file and point your DNS at GitHub Pages.

---

## Editing content

- **Add / edit a product:** copy a product object in `assets/data/products.js`, give it a unique
  `slug` and `id`, fill in `name`, `tagline`, `priceCents`, `category`, `whatsInside`, etc. It appears
  in the shop, gets a detail page at `product.html?p=<slug>`, and generates its own cover art. No image needed.
- **Add a collection tile / category:** edit `CATEGORIES` and `collections` in `products.js`.
- **Add a blog post:** copy a file in `blog/`, update the content and the `<head>`/JSON-LD, then add a
  card to `blog.html`.
- **Swap the mascot in a spot:** the 8 Arc poses are in `assets/images/`.

## Brand tokens (CSS variables in `css/styles.css`)

| Variable | Hex | Use |
|---|---|---|
| `--navy` | `#1A113D` | Primary dark canvas |
| `--blue` | `#238DBB` | Secondary accent / gradients |
| `--teal` | `#08D8A0` | Primary accent, CTAs, hover glow |
| `--pink` | `#FF6B93` | Warm accent, **Buy** buttons |
| `--gray` | `#EEEEEE` | Light sections |

**Fonts:** Oswald (headings) + DM Sans (body), via Google Fonts.
**Accessibility:** skip links, focus-visible outlines, labelled inputs, `prefers-reduced-motion` support.

## Local preview

No build needed. From this folder: `python3 -m http.server 8000` then open `http://localhost:8000`.
The shop and product pages use query-param routing, so preview over `http://` (not `file://`).

## License

© 2026 Arcane Designer LLC. All rights reserved.
