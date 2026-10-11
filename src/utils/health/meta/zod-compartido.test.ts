/**
 * Guardián WHAT: Zod vive UNA sola vez en el CDN. Los schemas se usan en runtime (`.shape`, `.extend`,
 * `z.custom`) y cada bundle de componente inlineaba ~300 KB de Zod (flowchart-spec pesaba 413 KB).
 * El build marca `zod` como externo y lo resuelve a `../lib/zod.min.js` (scripts/build.mjs).
 *   Z1 existe `dist/cdn/lib/zod.min.js` y es el único bundle con el runtime de Zod.
 *   Z2 ningún bundle de componente (dist/cdn/<carpeta>/*.min.js) inlinea Zod; el que lo usa lo importa de `../lib/zod.min.js`.
 *   Z3 ningún bundle de componente pasa de 200 KB (el runtime de Zod duplicado volvería a dispararlos).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const CDN = join(RAIZ, 'dist', 'cdn');
/** Marca del runtime de Zod minificado (no aparece en código que solo lo importa). */
const MARCA_ZOD = 'Invalid input';
const MAX_KB = 200;

async function bundlesDeComponentes(): Promise<string[]> {
  const out: string[] = [];
  for (const carpeta of await readdir(CDN, { withFileTypes: true })) {
    if (!carpeta.isDirectory() || carpeta.name === 'lib' || carpeta.name === 'tools' || carpeta.name === 'skills' || carpeta.name === 'build') continue;
    for (const f of await readdir(join(CDN, carpeta.name))) {
      if (f.endsWith('.min.js')) out.push(join(CDN, carpeta.name, f));
    }
  }
  return out;
}

test('zod: Z1 dist/cdn/lib/zod.min.js existe y trae el runtime de Zod', async () => {
  const src = await readFile(join(CDN, 'lib', 'zod.min.js'), 'utf8');
  assert.ok(src.includes(MARCA_ZOD), 'lib/zod.min.js no parece el runtime de Zod');
  assert.ok(src.length > 100_000, `lib/zod.min.js demasiado pequeño (${src.length} B)`);
});

test('zod: Z2 ningún bundle de componente inlinea Zod; el que lo usa lo importa de ../lib/zod.min.js', async () => {
  const inlinean: string[] = [];
  let importan = 0;
  for (const p of await bundlesDeComponentes()) {
    const src = await readFile(p, 'utf8');
    if (src.includes(MARCA_ZOD)) inlinean.push(p.slice(CDN.length + 1));
    if (src.includes('../lib/zod.min.js')) importan += 1;
  }
  assert.deepEqual(inlinean, [], `bundles que inlinean Zod:\n${inlinean.join('\n')}`);
  assert.ok(importan >= 5, `se esperaban varios bundles importando ../lib/zod.min.js (hay ${importan})`);
});

test(`zod: Z3 ningún bundle de componente pasa de ${MAX_KB} KB`, async () => {
  const gordos: string[] = [];
  for (const p of await bundlesDeComponentes()) {
    const kb = (await stat(p)).size / 1024;
    if (kb > MAX_KB) gordos.push(`${p.slice(CDN.length + 1)} ${Math.round(kb)} KB`);
  }
  assert.deepEqual(gordos, [], `bundles por encima de ${MAX_KB} KB:\n${gordos.join('\n')}`);
});
