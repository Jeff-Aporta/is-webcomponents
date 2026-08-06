/**
 * context-menu-scroll.test.mjs — al scroll el menú no “persigue”.
 *
 * ago/2026: con position:fixed dentro de un containing block (transform del
 * demo) el panel se movía con el scroll. Contrato:
 *   - default → cerrar al scroll (fuera del panel)
 *   - scroll-lock → bloquear overflow del documento, no cerrar por scroll
 *
 *   npm test -- tests/context-menu-scroll.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => join(raiz, 'src', 'components', ...p);

test('context-menu: cierra al scroll por defecto', async () => {
  const js = await readFile(src('actions', 'context-menu.js'), 'utf8');

  assert.match(
    js,
    /addEventListener\(\s*['"]scroll['"]\s*,\s*this\.#onScroll\s*,\s*true\s*\)/,
    'debe escuchar scroll en capture para cerrar (default)',
  );
  assert.match(
    js,
    /scroll-lock/,
    'atributo scroll-lock documentado / observado',
  );
  assert.match(
    js,
    /overflow\s*=\s*['"]hidden['"]/,
    'scroll-lock congela documentElement.overflow',
  );
  // No debe re-posicionar el panel en cada scroll (eso es “perseguir”).
  assert.doesNotMatch(
    js,
    /#onScroll\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*openAt/,
    'el handler de scroll no debe reposicionar con openAt',
  );
});

test('context-menu: scroll interno del panel no cierra', async () => {
  const js = await readFile(src('actions', 'context-menu.js'), 'utf8');
  assert.match(
    js,
    /composedPath|path\.includes\(this\.#panel\)/,
    'ignorar scroll originado en el propio panel',
  );
});

test('preview documenta default close + scroll-lock', async () => {
  const json = await readFile(
    join(raiz, 'src', 'previews', 'actions', 'is-context-menu.json'),
    'utf8',
  );
  assert.match(json, /scroll-lock/, 'demo/API mencionan scroll-lock');
  assert.match(json, /cierra al hacer scroll|se cierra al hacer scroll/i, 'lede explica el default');
});
