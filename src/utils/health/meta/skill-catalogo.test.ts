/**
 * Guardián WHAT: la skill principal enruta TODO componente publicado. Cada tag del manifest tiene su
 * fila en `skills/iswc-root/catalog.md` (así un agente sabe qué componente usar) y la ficha `.md`
 * que esa fila nombra existe en `src/components/`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const catalogo = readFileSync(join(RAIZ, 'skills', 'iswc-root', 'catalog.md'), 'utf8');
const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
const tags = [...new Set([...manifest.matchAll(/tag:\s*'(iswc-[a-z0-9-]+)'/g)].map((m) => m[1]))];

test('skill: todo tag del manifest tiene fila en catalog.md', () => {
  const faltan = tags.filter((t) => !catalogo.includes(`\`<${t}>\``));
  assert.deepEqual(faltan, [], `tags sin fila en skills/iswc-root/catalog.md:\n${faltan.join('\n')}`);
});

test('skill: toda ficha que nombra catalog.md existe', () => {
  const fichas = [...new Set([...catalogo.matchAll(/^\| `([a-z-]+\/[a-z0-9-]+\.md)` \|/gm)].map((m) => m[1]))];
  const rotas = fichas.filter((f) => !existsSync(join(RAIZ, 'src', 'components', f)));
  assert.deepEqual(rotas, [], `fichas que no existen:\n${rotas.join('\n')}`);
});
