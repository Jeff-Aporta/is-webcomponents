/**
 * robots.txt y sitemap.xml en la raíz de Pages: los bots entran sin Disallow.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = 'https://jeff-aporta.github.io/is-webcomponents';
const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

test('robots.txt deja crawlear todo y apunta al sitemap de Pages', () => {
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.doesNotMatch(robots, /Disallow:\s*\//);
  assert.match(robots, new RegExp(`Sitemap:\\s*${pages}/sitemap\\.xml`));
});

test('sitemap.xml lista la galería y docs/ en GitHub Pages', () => {
  assert.match(sitemap, /<urlset\b/);
  assert.match(sitemap, new RegExp(`<loc>${pages}/</loc>`));
  assert.match(sitemap, new RegExp(`<loc>${pages}/docs/</loc>`));
});

test('index.html invita a indexar (bots que no ejecutan JS)', () => {
  assert.match(indexHtml, /<html[^>]*\blang="es"/);
  assert.match(indexHtml, /<meta\s+name="robots"\s+content="index,\s*follow"/);
  assert.match(indexHtml, new RegExp(`<link\\s+rel="canonical"\\s+href="${pages}/"`));
});
