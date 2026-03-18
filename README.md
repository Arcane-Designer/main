# Arcane Designer — Website

**Arcane Designer LLC** — "Where Strategy Meets Sorcery"

A static multi-page website for Arcane Designer, an AI-powered digital marketing studio. Built with pure HTML, CSS, and JavaScript — no frameworks, no build tools. Hosted on GitHub Pages.

## Project Structure

```
/
├── index.html          # Homepage — hero, services, blog preview, shop preview
├── about.html          # About — company story, detailed services, track record
├── blog.html           # Blog — post listings with sidebar
├── shop.html           # Shop — digital product listings (The Arcane Vault)
├── contact.html        # Contact — form and social links
├── css/
│   └── styles.css      # All styles — variables, components, responsive
├── js/
│   └── main.js         # Mobile nav, sticky nav, scroll animations
├── assets/
│   └── images/         # All brand assets (logo, Arc poses, header)
└── README.md
```

## How to Update Content

### Add a Blog Post
1. Open `blog.html`
2. Copy an existing `<article class="blog-card">` block
3. Update the title, date, excerpt, and gradient colors
4. Change the `href="#"` to point to the new post HTML file when ready

### Add a Shop Product
1. Open `shop.html`
2. Copy an existing `<div class="product-card">` block
3. Update the title, price, description
4. Change the `href="#"` to a Gumroad (or other) product link when ready

### Connect the Contact Form
The contact form in `contact.html` currently submits to `#`. To make it functional:
- **Formspree**: Change `action="#"` to `action="https://formspree.io/f/YOUR_ID"` and add `method="POST"`
- **Netlify Forms**: Add `data-netlify="true"` to the `<form>` tag
- **Google Forms**: Redirect to a Google Form URL

### Swap Images
All images are in `assets/images/`. Replace any file with the same filename, or update the `src` attribute in the HTML.

## Brand Colors (CSS Variables)

| Variable    | Hex       | Usage                          |
|-------------|-----------|--------------------------------|
| `--navy`    | `#1A113D` | Primary dark / backgrounds     |
| `--blue`    | `#238DBB` | Secondary accent               |
| `--teal`    | `#08D8A0` | Primary accent / CTAs          |
| `--pink`    | `#FF6B93` | Warm accent / highlights       |
| `--gray`    | `#EEEEEE` | Light backgrounds              |
| `--white`   | `#FFFFFF` | Text on dark / clean spacing   |
| `--black`   | `#000000` | Body text on light backgrounds |

## Fonts

- **Headings**: Oswald (Google Fonts) — bold, condensed, high-impact
- **Body**: DM Sans (Google Fonts) — clean, readable

## External Dependencies

- [Google Fonts](https://fonts.google.com/) — Oswald + DM Sans
- [Font Awesome 6](https://fontawesome.com/) — social media icons (loaded via CDN)

No npm, no build steps, no frameworks. Just open `index.html` in a browser.

## Deployment

This site is designed for GitHub Pages. Push to the `main` branch and enable Pages from Settings → Pages → Deploy from branch → `main` → `/ (root)`.

## License

© 2026 Arcane Designer LLC. All rights reserved.
