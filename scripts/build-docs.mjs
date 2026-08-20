/**
 * HTML plano por componente en docs/ (SEO / crawlers). Sin chrome de galería.
 * Fuente: JSON en src/previews. Carga minima: loader.min.js + L.load(tags).
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from '../manifest.js';
import { collectIsTags } from '../src/cdn/collect-is-tags.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const previews = join(root, 'src', 'previews');
const outRoot = join(root, 'docs');
const PAGES = 'https://jeff-aporta.github.io/is-webcomponents';
const KEEP_DIRS = new Set(['superpowers']);

const plain = (s) => String(s ?? '').replace(/<[^>]+>/g, '');
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const loadArgs = (tags) => tags.map((t) => JSON.stringify(t)).join(', ');

function renderBlocks(def) {
  const parts = [];
  if (def.description) parts.push(`<p class="lede">${def.description}</p>`);
  for (const section of def.sections || []) {
    parts.push(`<section id="${esc(section.id || '')}">`);
    const h2 = plain(section.title);
    if (h2) parts.push(`<h2>${esc(h2)}</h2>`);
    if (section.lede) parts.push(`<p class="lede">${section.lede}</p>`);
    for (const block of section.blocks || []) {
      if (block.kind === 'demo' || block.kind === 'html') {
        if (block.html) parts.push(`<div class="demo">${block.html}</div>`);
      } else if (block.kind === 'code' && block.code) {
        parts.push(`<pre><code>${esc(block.code)}</code></pre>`);
      } else if (block.kind === 'callout' && (block.html || block.text)) {
        parts.push(`<aside class="callout">${block.html || esc(block.text)}</aside>`);
      }
    }
    parts.push('</section>');
  }
  return parts.join('\n');
}

function pageHtml({ tag, title, category, def, tags }) {
  const rel = '../..';
  const titleText = String(title || tag).replace(/<[^>]+>/g, '');
  const desc = esc(def.description || `Documentación de ${tag}.`);
  const canon = `${PAGES}/docs/${category}/${tag}.html`;
  return `<!DOCTYPE html>
<html lang="es" class="theme-dark" data-theme="dark" data-palette="contapyme">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titleText)} · IS Web Components</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canon}">
  <link rel="stylesheet" href="${rel}/src/styles/is-base.css">
  <link rel="stylesheet" href="${rel}/src/styles/palettes.css">
  <link rel="stylesheet" href="${rel}/src/styles/presentation.css">
  <script type="module" src="${rel}/dist/cdn/loader.min.js"></script>
  <script type="module">
    const L = globalThis.ISWebComponentsLoader;
    L.configure({ preferSelf: true, mirrors: ['jsdelivr', 'pages'] });
    await L.load(${loadArgs(tags)});
  </script>
</head>
<body>
  <article class="docs-page" data-tag="${esc(tag)}" data-category="${esc(category)}">
    <h1>${esc(plain(def.title) || title || tag)}</h1>
    ${renderBlocks(def)}
  </article>
</body>
</html>
`;
}

function indexHtml(pages) {
  const groups = new Map();
  for (const p of pages) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category).push(p);
  }
  const body = [...groups.entries()].map(([cat, list]) => {
    const items = list.map((p) => `<li><a href="${p.category}/${p.tag}.html">${esc(p.title)} · <code>${esc(p.tag)}</code></a></li>`).join('\n');
    return `<h2>${esc(cat)}</h2>\n<ul>\n${items}\n</ul>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Docs · IS Web Components</title>
  <meta name="description" content="Índice de documentación plana por componente (SEO).">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${PAGES}/docs/">
</head>
<body>
  <h1>IS Web Components · docs</h1>
  <p>Una página por componente, sin navegación de galería.</p>
  ${body}
</body>
</html>
`;
}

function sitemapXml(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `<url><loc>${PAGES}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>`,
    `<url><loc>${PAGES}/docs/</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`,
    ...pages.map((p) => `<url><loc>${PAGES}/docs/${p.category}/${p.tag}.html</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>
`;
}

export async function buildDocsHtml() {
  await mkdir(outRoot, { recursive: true });
  for (const name of await readdir(outRoot, { withFileTypes: true })) {
    if (KEEP_DIRS.has(name.name)) continue;
    await rm(join(outRoot, name.name), { recursive: true, force: true });
  }

  const pages = [];
  for (const c of manifest) {
    if (!c.page) continue;
    const jsonPath = join(previews, c.page);
    if (!existsSync(jsonPath)) continue;
    const def = JSON.parse(await readFile(jsonPath, 'utf8'));
    const tags = collectIsTags(def);
    const dir = join(outRoot, c.category);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${c.tag}.html`),
      pageHtml({ tag: c.tag, title: c.title, category: c.category, def, tags }),
    );
    pages.push({ tag: c.tag, title: c.title, category: c.category });
  }

  await writeFile(join(outRoot, 'index.html'), indexHtml(pages));
  await writeFile(join(root, 'sitemap.xml'), sitemapXml(pages));
  console.log(`  docs/                 ${pages.length} HTML + sitemap`);
  return pages.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildDocsHtml();
}
