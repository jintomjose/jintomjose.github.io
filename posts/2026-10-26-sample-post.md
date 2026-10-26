---
title: Sample post — how this blog works
date: 2026-10-26
tags: Meta, Building
summary: A draft that shows the post format. It is hidden from the live site until you remove "draft: true".
linkedin: https://www.linkedin.com/in/jintojose
pinned: false
draft: true
---

This is a **draft** used to preview the blog. It is excluded from the live build.

Every post is one Markdown file in `posts/`, named `YYYY-MM-DD-slug.md`.
Single line breaks are kept, so LinkedIn-style posts paste in as written.

## What the front matter does

- `title`, `date` are required
- `tags` is a comma-separated list and powers the filter chips
- `linkedin` adds a "View on LinkedIn" link to the post footer
- `pinned: true` moves a post to the top of the archive
- `draft: true` hides a post from the live site

> Write once on GitHub, then share the link everywhere.

```bash
node scripts/build-blog.mjs
```
