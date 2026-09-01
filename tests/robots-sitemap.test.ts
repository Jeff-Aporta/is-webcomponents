/**
 * robots.txt en la raíz de Pages: los bots entran sin Disallow.
 *
 * Sin sitemap desde el 31-ago-2026. Tenía sentido cuando `docs/` publicaba 178
 * páginas planas por componente; retiradas esas, quedaba una sola URL —la SPA—
 * y un sitemap de una entrada no le dice nada a un crawler que ya la tiene por
 * el enlace raíz. El test comprueba que no vuelva a anunciarse uno inexistente:
 * un `Sitemap:` colgado es peor que ninguno.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = 'https://jeff-aporta.github.io/is-webcomponents';
const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

test('robots.txt deja crawlear todo', () => {
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.doesNotMatch(robots, /Disallow:\s*\//);
});

test('no se anuncia un sitemap que no existe', () => {
  assert.doesNotMatch(robots, /Sitemap:/i);
  assert.equal(existsSync(join(root, 'sitemap.xml')), false);
});

test('index.html invita a indexar (bots que no ejecutan JS)', () => {
  assert.match(indexHtml, /<html[^>]*\blang="es"/);
  assert.match(indexHtml, /<meta\s+name="robots"\s+content="index,\s*follow"/);
  assert.match(indexHtml, new RegExp(`<link\\s+rel="canonical"\\s+href="${pages}/"`));
});
