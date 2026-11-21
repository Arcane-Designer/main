# Adding a blog post

Every post is one entry in `tools/blog.json` (a list). Add the new entry anywhere in the list, put its cover image in `assets/blog/`, then run `python3 tools/pages.py`.

The builder sorts posts newest first by `date` and puts five on each page: `/blog/` is page 1, then `/blog/page/2/`, `/blog/page/3/` and so on, with page numbers at the bottom once there are more than five. Each post gets its own page at `/blog/<slug>/`, plus sitemap and search data (BlogPosting, and FAQPage when it has FAQs).

What to cover: mostly recent changes in AI tools (new features, launches, models). Step-by-step training belongs in the kits.

## Entry format

```json
{
  "slug": "canva-generative-ai-controls",
  "date": "2026-11-20",
  "layout": "brief",
  "category": "Tool update",
  "title": "Canva now lets you turn off its generative AI tools",
  "summary": "One or two sentences. Shown under the title, on the card and in search results.",
  "cover": "/assets/blog/canva-ai-controls.jpg",
  "lead": "The opening paragraph, shown in bold.",
  "settings_label": "Canva’s two AI settings",
  "settings": [
    { "name": "Setting name", "description": "What it does.", "path": "Profile / Settings / Permissions" }
  ],
  "sections": [
    { "id": "short-anchor", "heading": "Section heading", "paragraphs": ["Paragraph one.", "Paragraph two."] }
  ],
  "sources": [
    { "name": "Link text", "url": "https://example.com/announcement" }
  ],
  "faq": [
    ["Question?", "Answer."]
  ]
}
```

Required: `slug` (lowercase words with hyphens; becomes the address), `date` (YYYY-MM-DD), `title`, `summary`.

Optional: `category` (small label on the card, like "Tool update", "Model launch", "New feature"), `cover` (wide image, about 1800×900; without one the card and cover use a brand pattern), `lead`, `settings` (the two-column box; leave it out for posts that aren't about settings), `sections`, `sources`, `faq`, `updated` (YYYY-MM-DD, if the post is revised).

`layout`: `brief` is the only article theme so far (dark cover with the light pink reading area). New themes are added in `css/site.css` as `.blog-post--<name>` and listed in `LAYOUTS` in `tools/pages.py`.

Write text with real apostrophes and quotes (’ “ ”). Plain text only: no HTML in the fields.
