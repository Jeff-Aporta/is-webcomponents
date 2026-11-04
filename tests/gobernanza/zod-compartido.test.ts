/**
 * Guardián WHAT: Zod vive UNA sola vez en el CDN. Los schemas se usan en runtime (`.shape`, `.extend`,
 * `z.custom`) y cada bundle de componente inlineaba ~300 KB de Zod (flowchart-spec pesaba 413 KB).
 * El build único (F3) marca `zod` como externo (`zodExterno` en src/cdn/build/bundle-kit.ts) y lo resuelve a
 * `../lib/zod.min.mjs`; solo la entrada `lib/zod.min.mjs` lo empaqueta.
 *   Z1 existe `dist/cdn/lib/zod.min.mjs` y trae el runtime de Zod.
 *   Z2 en el metafile del build único (`.tmp/metafile-kit.json`, lo escribe scripts/build.mjs) ninguna salida salvo
 *      `lib/zod.min.mjs` tiene entradas del paquete `zod`, y los imports de `zod` son externos a `../lib/zod.min.mjs`.
 *   Z3 ningún módulo del kit (entradas y `_chunks/`, fuera de lib/) inlinea Zod ni pasa de 200 KB.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const RAIZ = join(import.meta.dirname, '..', '..');
const CDN = join(RAIZ, 'dist', 'cdn');
const METAFILE = join(RAIZ, '.tmp', 'metafile-kit.json');
/** Marca del runtime de Zod minificado (no aparece en código que solo lo importa). */
const MARCA_ZOD = 'Invalid input';
const MAX_KB = 200;

/** Módulos del kit publicados por el build único fuera de lib/: `<carpeta>/*.min.mjs` y `_chunks/*.mjs`. */
async function modulosDelKit(): Promise<string[]> {
  const out: string[] = [];
  for (const carpeta of await readdir(CDN, { withFileTypes: true })) {
    if (!carpeta.isDirectory() || ['lib', 'vendor-distributions', 'skills', 'build'].includes(carpeta.name)) continue;
    for (const f of await readdir(join(CDN, carpeta.name))) {
      if (f.endsWith('.mjs')) out.push(join(CDN, carpeta.name, f));
    }
  }
  return out;
}

test('zod: Z1 dist/cdn/lib/zod.min.mjs existe y trae el runtime de Zod', async () => {
  const src = await readFile(join(CDN, 'lib', 'zod.min.mjs'), 'utf8');
  assert.ok(src.includes(MARCA_ZOD), 'lib/zod.min.mjs no parece el runtime de Zod');
  assert.ok(src.length > 100_000, `lib/zod.min.mjs demasiado pequeño (${src.length} B)`);
});

test('zod: Z2 en el metafile del build único solo lib/zod.min.mjs empaqueta el paquete zod', async () => {
  assert.ok(existsSync(METAFILE), 'falta .tmp/metafile-kit.json: corre `deno task build`');
  const meta = JSON.parse(await readFile(METAFILE, 'utf8')) as {
    outputs: Record<string, { inputs: Record<string, unknown>; imports: { path: string; kind: string; external?: boolean }[] }>;
  };
  const conZod: string[] = [];
  let externos = 0;
  for (const [salida, o] of Object.entries(meta.outputs)) {
    const barras = salida.replaceAll('\\', '/');
    if (Object.keys(o.inputs).some((i) => /node_modules\/(\.deno\/zod@[^/]+\/node_modules\/)?zod\//.test(i.replaceAll('\\', '/'))) && !barras.endsWith('lib/zod.min.mjs')) conZod.push(barras);
    for (const i of o.imports) if (i.external && /zod/.test(i.path)) {
      externos += 1;
      assert.equal(i.path, '../lib/zod.min.mjs', `${barras}: import externo de zod a ${i.path}`);
    }
  }
  assert.deepEqual(conZod, [], `salidas que empaquetan zod:\n${conZod.join('\n')}`);
  assert.ok(externos >= 5, `se esperaban varios módulos importando ../lib/zod.min.mjs (hay ${externos})`);
});

test(`zod: Z3 ningún módulo del kit inlinea Zod ni pasa de ${MAX_KB} KB`, async () => {
  const inlinean: string[] = [];
  const gordos: string[] = [];
  for (const p of await modulosDelKit()) {
    if ((await readFile(p, 'utf8')).includes(MARCA_ZOD)) inlinean.push(p.slice(CDN.length + 1));
    const kb = (await stat(p)).size / 1024;
    if (kb > MAX_KB) gordos.push(`${p.slice(CDN.length + 1)} ${Math.round(kb)} KB`);
  }
  assert.deepEqual(inlinean, [], `módulos que inlinean Zod:\n${inlinean.join('\n')}`);
  assert.deepEqual(gordos, [], `módulos por encima de ${MAX_KB} KB:\n${gordos.join('\n')}`);
});

export default lista();
