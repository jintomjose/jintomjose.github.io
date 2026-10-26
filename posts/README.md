# Blog posts

One Markdown file per post, named `YYYY-MM-DD-slug.md`. The build script turns them into one static page per post under `blog/<slug>/`, the Blog tab archive inside `index.html`, plus `posts.json`, `blog/feed.xml` and `sitemap.xml`. `/blog/` redirects to the Blog tab.

The header, footer and Blog tab in `index.html` are generated between `<!-- BUILD:... -->` markers — edit `scripts/partials/` or `scripts/build-blog.mjs`, never the generated block itself.

## Front matter

```yaml
---
title: Why the best PMs eventually ship the thing themselves
date: 2026-10-21
tags: Product, AI
summary: One-line description for the archive, RSS and link previews. Optional; defaults to the first lines.
linkedin: https://www.linkedin.com/posts/...   # optional; adds "View on LinkedIn"
pinned: true                                   # optional; shows at the top of the archive
draft: true                                    # optional; excluded from the live build
slug: custom-slug                              # optional; defaults to the filename without the date
---
```

Markdown supported: headings, paragraphs (single line breaks are kept), lists, `**bold**`, `*italic*`, links, images, inline and fenced code, blockquotes, `---`.

## Publish

```bash
node scripts/build-blog.mjs            # live build (skips drafts)
node scripts/build-blog.mjs --drafts   # local preview including drafts
git add -A && git commit -m "Add post: ..." && git push
```

Commit the generated `index.html`, `blog/`, `posts.json` and `sitemap.xml` — GitHub Pages serves them as-is. Run the build without `--drafts` before committing.
