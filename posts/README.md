# Blog posts

One Markdown file per post, named `YYYY-MM-DD-slug.md`. The build script turns them into the static pages under `blog/`, plus `posts.json`, `blog/feed.xml` and `sitemap.xml`.

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

Commit the generated `blog/`, `posts.json` and `sitemap.xml` — GitHub Pages serves them as-is. Run the build without `--drafts` before committing.
