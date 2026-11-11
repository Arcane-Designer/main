# Arcane Designer website

arcanedesigner.com. One-time website and logo redesigns for small businesses in Spokane, run by Nathan Gellatly (Arcane Designer LLC). Static HTML/CSS/JS on GitHub Pages, no framework.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: offer, before/after slider, annotated "what I look for" example, steps, about Nathan, reviews carousel, prices |
| `work.html` | Work and reviews: before/after examples, each with its client's review under it once there is one |
| `process.html` | The full process, the AI note, short FAQ |
| `pricing.html` | Prices, what's included, full FAQ (with FAQ structured data for search and AI answers) |
| `contact.html` | Start-a-project form |
| `questionnaire.html` | Private client questionnaire (noindex). Send the link to clients after they say yes |
| `404.html` | Not-found page |

`math/`, `neosai/` and `blastforge/` are Nathan's separate personal apps. Leave them alone when working on the business site.

## Editing

The HTML is generated. Edit copy in `tools/pages.py`, then run:

```
python3 tools/pages.py
```

Styles: `css/site.css`. Behavior: `js/site.js`. Bump `V` in `tools/pages.py` after changing CSS or JS so browsers fetch the new files.

## Things to fill in (top of `js/site.js`)

- `SITE.email`: the business email address (Google Workspace).
- `SITE.forms.contact` and `SITE.forms.questionnaire`: form endpoints (Formspree). Until these are set, the forms tell visitors to email instead.
- `REVIEWS`: add real reviews here. The home page reviews section stays hidden until there is at least one. Preview the layout with `?demo-reviews` on the home page.

## Work samples

The three examples on the Work page are made-up businesses, labeled as samples. Their source pages are in `tools/samples-src/`. To add a real client project, add an entry to `SAMPLES` in `tools/pages.py` (drop the sample pill), put `<slug>-before.webp` and `<slug>-after.webp` (1440x900, top of the homepage) in `assets/samples/`, and attach the client's review.

## Brand

Colors: navy `#1A113D`, blue `#238DBB`, teal `#08D8A0`, pink `#FF6B93`, gray `#EEEEEE`. The hexagon tiles come from the logo. Arc (the mascot) appears on every page; art is in `assets/arc/`. Fonts: Fraunces (headings), Figtree (body), Bebas Neue (wordmark), Caveat (handwritten notes, sparingly). Copy follows the voice guide one folder up (`AI-Tone-Guide.md`): plain, first person, no em dashes, no hype words.
