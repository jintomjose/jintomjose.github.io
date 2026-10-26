#!/usr/bin/env node
// Builds the blog from posts/*.md into static files GitHub Pages can serve.
//   node scripts/build-blog.mjs            published posts only
//   node scripts/build-blog.mjs --drafts   include `draft: true` posts (local preview)
// Also writes the shared header/footer and the Blog tab into index.html (between the BUILD markers).
// Outputs: the Blog tab inside index.html, blog/<slug>/index.html, a /blog/ redirect, blog/feed.xml, posts.json, sitemap.xml
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://jintomjose.github.io';
const REPO = 'https://github.com/jintomjose/jintomjose.github.io';
const WITH_DRAFTS = process.argv.includes('--drafts');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3 = MONTHS.map(m => m.slice(0, 3));

// ---------- markdown (small subset: enough for LinkedIn-style posts) ----------
function inline(raw) {
  let s = esc(raw);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" rel="noopener">$2</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
}

function markdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const buf = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) buf.push(lines[i]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
    } else if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length + 1; // # in a post body renders as h2; the title is the h1
      out.push(`<h${level}>${inline(line.replace(/^#+\s+/, ''))}</h${level}>`);
      i++;
    } else if (/^---+\s*$/.test(line)) {
      out.push('<hr>'); i++;
    } else if (/^>\s?/.test(line)) {
      const buf = [];
      for (; i < lines.length && /^>\s?/.test(lines[i]); i++) buf.push(lines[i].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</blockquote>`);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const buf = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]); i++) buf.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`);
      out.push(`<${ordered ? 'ol' : 'ul'}>${buf.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else {
      const buf = [];
      for (; i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|>|---+\s*$|\s*([-*]|\d+\.)\s+)/.test(lines[i]); i++) buf.push(lines[i]);
      out.push(`<p>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`);
    }
  }
  return out.join('\n');
}

// ---------- posts ----------
function parsePost(file) {
  const raw = readFileSync(join(ROOT, 'posts', file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter (--- ... ---)`);
  const fm = {};
  for (const l of m[1].split('\n')) {
    const kv = l.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  for (const k of ['title', 'date']) if (!fm[k]) throw new Error(`${file}: front matter needs "${k}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date)) throw new Error(`${file}: date must be YYYY-MM-DD`);
  const body = m[2].trim();
  const slug = fm.slug || file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const words = body.split(/\s+/).filter(Boolean).length;
  const plain = body.replace(/[#>*`_\[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    file, slug, title: fm.title, date: fm.date,
    tags: (fm.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    summary: fm.summary || (plain.length > 160 ? plain.slice(0, 157).replace(/\s+\S*$/, '') + '…' : plain),
    linkedin: fm.linkedin || '', pinned: fm.pinned === 'true', draft: fm.draft === 'true',
    minutes: Math.max(1, Math.round(words / 200)), html: markdown(body),
  };
}

const fmtDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MON3[m - 1]} ${y}`; };
const fmtShort = d => { const [, m, day] = d.split('-').map(Number); return `${String(day).padStart(2, '0')} ${MON3[m - 1]}`; };
const rfc822 = d => new Date(d + 'T09:00:00Z').toUTCString();

// ---------- page chrome ----------
const THEME_BOOT = `<script>(function(){var t;try{t=localStorage.getItem('jj-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);})();</script>`;

// Header and footer have one source (scripts/partials/) and are written into index.html and every blog page.
const partial = name => readFileSync(join(ROOT, 'scripts', 'partials', name), 'utf8').trim();
function header(active) {
  return partial('header.html').replace(/<a class="tab" ([^>]*?)data-view="([^"]+)"([^>]*)>([^<]+)<\/a>/g,
    (_, pre, view, post, text) => `<a class="tab${view === active ? ' active' : ''}" ${pre}data-view="${view}" data-label="${esc(text)}"${post}${view === active ? ' aria-current="page"' : ''}>${text}</a>`);
}
const footer = () => partial('footer.html');

function injectBlock(html, name, content) {
  const re = new RegExp(`(<!-- BUILD:${name} -->)[\\s\\S]*?(<!-- /BUILD:${name} -->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the BUILD:${name} markers`);
  return html.replace(re, (_, open, close) => `${open}\n${content}\n${close}`);
}

function page({ title, description, path, type = 'website', jsonld, body, script = '' }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f6f2ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f0c18" media="(prefers-color-scheme: dark)">
${THEME_BOOT}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Jinto Jose">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="${type}">
<link rel="canonical" href="${url}">
<link rel="alternate" type="application/rss+xml" title="Jinto Jose — Blog" href="${SITE}/blog/feed.xml">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/blog/assets/post.css">
<script defer src="/assets/site.js"></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
${header('blog')}
<main id="main-content">
${body}
</main>
${footer()}
${script}
</body>
</html>
`;
}

// ---------- blog tab (archive panel inside index.html) ----------
function blogPanel(posts) {
  const pinned = posts.filter(p => p.pinned);
  const rest = posts.filter(p => !p.pinned);
  const tags = [...new Set(posts.flatMap(p => p.tags))].sort((a, b) => a.localeCompare(b));

  const row = (p, pin) => `<a class="bl-row" href="/blog/${p.slug}/" data-tags="${esc(p.tags.join('|'))}" data-text="${esc((p.title + ' ' + p.summary + ' ' + p.tags.join(' ')).toLowerCase())}">
    <span class="bl-d${pin ? ' pin' : ''}">${pin ? 'Pinned' : fmtShort(p.date)}</span>
    <div><div class="bl-h">${esc(p.title)}${p.draft ? ' <span class="bl-tag">draft</span>' : ''}</div><div class="bl-x">${esc(p.summary)}</div></div>
    <span class="bl-m">${p.minutes} min</span>
  </a>`;

  const groups = [];
  for (const p of rest) {
    const [y, m] = p.date.split('-').map(Number);
    const key = `${MONTHS[m - 1]} ${y}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) groups.push(g = { key, posts: [] });
    g.posts.push(p);
  }

  return `<section class="blog-panel" id="blogPanel" aria-label="Blog">
  <div class="about-kicker">Blog · Jinto Jose</div>
  <h2 class="bl-title">Notes from building in the open.</h2>
  <p class="bl-intro">Product, data and AI — first published here, then shared on LinkedIn. Everything lives in <a href="${REPO}" target="_blank" rel="noopener">one GitHub repo</a>. <a href="/blog/feed.xml">RSS</a></p>
${posts.length ? `  <div class="bl-filters" role="group" aria-label="Filter posts">
    <button class="bl-chip on" type="button" data-tag="">All</button>
    ${tags.map(t => `<button class="bl-chip" type="button" data-tag="${esc(t)}">${esc(t)}</button>`).join('\n    ')}
    <input class="bl-search" id="blQ" type="search" placeholder="Search posts…" aria-label="Search posts">
  </div>
  <div id="blList">
  ${pinned.length ? `<h3 class="bl-month" data-group>Pinned</h3>\n${pinned.map(p => row(p, true)).join('\n')}` : ''}
  ${groups.map(g => `<h3 class="bl-month" data-group>${g.key}</h3>\n${g.posts.map(p => row(p, false)).join('\n')}`).join('\n')}
  </div>
  <p class="bl-empty" id="blNone" hidden>No posts match. Try a different tag or search.</p>`
    : `  <div class="bl-empty"><strong>First posts landing soon.</strong><br>Subscribe with <a href="/blog/feed.xml">RSS</a> or follow on <a href="https://www.linkedin.com/in/jintojose" target="_blank" rel="noopener">LinkedIn</a>.</div>`}
</section>`;
}

// /blog/ now lives in the Blog tab of the main page; keep the old address working.
function redirectPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Blog — Jinto Jose</title>
<meta http-equiv="refresh" content="0; url=/#blog">
<link rel="canonical" href="${SITE}/">
<script>location.replace('/#blog');</script>
</head>
<body><a href="/#blog">Go to the blog</a></body>
</html>
`;
}

// ---------- single post ----------
function postPage(p) {
  const body = `<article class="post">
  <a class="back" href="/#blog">← All posts</a>
  <h1 class="post-h">${esc(p.title)}</h1>
  <div class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time><span>·</span><span>${p.minutes} min read</span>${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}${p.draft ? '<span class="tag">draft</span>' : ''}</div>
  <div class="prose">
${p.html}
  </div>
  <div class="post-foot glass">
    <span>${p.linkedin ? `Also posted on LinkedIn on ${fmtDate(p.date)}.` : `Published ${fmtDate(p.date)}.`}</span>
    <span>${p.linkedin ? `<a href="${esc(p.linkedin)}" rel="noopener">View on LinkedIn ↗</a> · ` : ''}<a href="${REPO}/blob/main/posts/${p.file}" rel="noopener">Edit on GitHub ↗</a></span>
  </div>
</article>`;
  return page({
    title: `${p.title} — Jinto Jose`, description: p.summary, path: `/blog/${p.slug}/`, type: 'article',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.summary,
      datePublished: p.date, keywords: p.tags.join(', '), mainEntityOfPage: `${SITE}/blog/${p.slug}/`,
      author: { '@type': 'Person', name: 'Jinto Jose', url: SITE },
      ...(p.linkedin ? { sameAs: [p.linkedin] } : {}),
    },
    body,
  });
}

// ---------- feeds ----------
function feed(posts) {
  const items = posts.slice(0, 30).map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}/blog/${p.slug}/</link>
    <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
    <pubDate>${rfc822(p.date)}</pubDate>
    <description>${esc(p.summary)}</description>
    <content:encoded><![CDATA[${p.html.replace(/]]>/g, ']]&gt;')}]]></content:encoded>
${p.tags.map(t => `    <category>${esc(t)}</category>`).join('\n')}
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Jinto Jose — Blog</title>
  <link>${SITE}/blog/</link>
  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Notes on product, data and AI-native building.</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

function sitemap(posts) {
  const base = [
    ['/', '2026-09-07', '1.0'], ['/projects.json', '2026-09-07', '0.9'], ['/ai-readable.md', '2026-09-07', '0.9'],
  ];
  const latest = posts[0]?.date;
  const urls = [...base, ...(posts.length ? [['/posts.json', latest, '0.7'], ['/blog/feed.xml', latest, '0.5']] : []),
    ...posts.map(p => [`/blog/${p.slug}/`, p.date, '0.7'])];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, mod, pri]) => `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${mod}</lastmod>
    <priority>${pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

// ---------- run ----------
const postsDir = join(ROOT, 'posts');
const files = existsSync(postsDir) ? readdirSync(postsDir).filter(f => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)) : [];
const all = files.map(parsePost);
const slugs = new Set();
for (const p of all) { if (slugs.has(p.slug)) throw new Error(`duplicate slug "${p.slug}"`); slugs.add(p.slug); }
const posts = all.filter(p => WITH_DRAFTS || !p.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

const blogDir = join(ROOT, 'blog');
mkdirSync(join(blogDir, 'assets'), { recursive: true });
for (const e of readdirSync(blogDir, { withFileTypes: true })) {
  if (e.isDirectory() && e.name !== 'assets') rmSync(join(blogDir, e.name), { recursive: true });
}
writeFileSync(join(blogDir, 'index.html'), redirectPage());
for (const p of posts) {
  mkdirSync(join(blogDir, p.slug), { recursive: true });
  writeFileSync(join(blogDir, p.slug, 'index.html'), postPage(p));
}
writeFileSync(join(blogDir, 'feed.xml'), feed(posts));
const indexPath = join(ROOT, 'index.html');
let home = readFileSync(indexPath, 'utf8');
home = injectBlock(home, 'HEADER', header('all'));
home = injectBlock(home, 'BLOG', blogPanel(posts));
home = injectBlock(home, 'FOOTER', footer());
writeFileSync(indexPath, home);
writeFileSync(join(ROOT, 'posts.json'), JSON.stringify(posts.map(({ title, slug, date, tags, summary, linkedin, minutes }) =>
  ({ title, url: `${SITE}/blog/${slug}/`, date, tags, summary, readingMinutes: minutes, ...(linkedin ? { linkedin } : {}) })), null, 2) + '\n');
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap(posts));

console.log(`Built ${posts.length} post(s)${WITH_DRAFTS ? ' (including drafts)' : ''} → blog/, posts.json, sitemap.xml`);
