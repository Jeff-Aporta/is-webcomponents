/**
 * loader-capas.test.ts — el loader en dos capas (plan carga modular D7, fase F4).
 *
 *   (a) `src/cdn/loader.ts` (capa 1, núcleo) no importa en estático nada de la capa 2: `sheet-cache`, `asset-store` ni
 *       los módulos `loader-<x>`; cada `loader-<x>` aparece SOLO como `import()` (se carga al primer uso). Y ningún
 *       módulo de capa 2 importa el núcleo (reciben su contexto por argumento: sin ciclo).
 *   (b) `dist/cdn/core/loader.min.mjs` ≤ 8 KB brotli (reporta gzip, el crudo y el cierre estático completo).
 *   (c) `core/loader.min.js` (compat hasta F5) es copia byte a byte de `core/loader.min.mjs`.
 *   (d) cada `loader-<x>` sale con nombre estable `core/loader-<x>.min.mjs` y `deps/core.json` lo lista bajo `core`.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { CAPAS_LOADER } from '../../src/cdn/build/bundle-kit.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const CDN = join(RAIZ, 'src', 'cdn');
const DIST = join(RAIZ, 'dist', 'cdn');
/** Presupuesto del núcleo (plan D7): 8 KB comprimido con brotli. */
const MAX_BR = 8 * 1024;

/** Especificadores de los `import … from` estáticos de un fuente (sin los `import type`). */
function importsEstaticos(codigo: string): string[] {
  return [...codigo.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]!);
}

test('gobernanza/loader-capas: el núcleo no importa en estático la capa 2 (solo import())', () => {
  const nucleo = readFileSync(join(CDN, 'loader.ts'), 'utf8');
  const estaticos = importsEstaticos(nucleo);
  const prohibidos = ['sheet-cache', 'asset-store', ...CAPAS_LOADER.map((c) => `loader-${c}`)];
  for (const p of prohibidos) {
    assert.ok(!estaticos.some((s) => s.includes(p)), `loader.ts importa en estático ${p}: ${estaticos.join(', ')}`);
  }
  for (const c of CAPAS_LOADER) {
    assert.match(nucleo, new RegExp(`import\\('@jeff-aporta/iswc-base/cdn/loader-${c}\\.js'\\)`), `loader.ts: falta import() de loader-${c}`);
    const capa = readFileSync(join(CDN, `loader-${c}.ts`), 'utf8');
    assert.ok(!importsEstaticos(capa).some((s) => /(^|\/)loader(\.js|\.ts)?$/.test(s)), `loader-${c}.ts importa el núcleo (ciclo)`);
  }
});

test('gobernanza/loader-capas: core/loader.min.mjs ≤ 8 KB br; loader.min.js es copia byte a byte', () => {
  const mjs = join(DIST, 'core', 'loader.min.mjs');
  if (!existsSync(mjs)) return;
  const cuerpo = readFileSync(mjs);
  const br = brotliCompressSync(cuerpo).length;
  const gz = gzipSync(cuerpo).length;
  const deps = JSON.parse(readFileSync(join(DIST, 'deps', 'core.json'), 'utf8')) as { core: Record<string, string[]> };
  const cierre = Buffer.concat((deps.core.loader ?? []).map((r) => readFileSync(join(DIST, r))));
  console.log(`  core/loader.min.mjs: ${cuerpo.length} B · br ${br} B · gzip ${gz} B · cierre estático ${deps.core.loader?.length} archivos ${cierre.length} B (br ${brotliCompressSync(cierre).length} B)`);
  assert.ok(br <= MAX_BR, `core/loader.min.mjs pesa ${br} B br > ${MAX_BR}`);
  const compat = join(DIST, 'core', 'loader.min.js');
  assert.ok(existsSync(compat), 'falta core/loader.min.js (compat hasta F5)');
  assert.ok(readFileSync(compat).equals(cuerpo), 'core/loader.min.js no es copia byte a byte de core/loader.min.mjs');
});

test('gobernanza/loader-capas: cada capa 2 sale como core/loader-<x>.min.mjs y deps.json la lista bajo core', () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const deps = JSON.parse(readFileSync(join(DIST, 'deps', 'core.json'), 'utf8')) as { core: Record<string, string[]> };
  const nucleo = readFileSync(join(DIST, 'core', 'loader.min.mjs'), 'utf8');
  for (const c of CAPAS_LOADER) {
    const ruta = `core/loader-${c}.min.mjs`;
    assert.ok(existsSync(join(DIST, ruta)), `falta dist/cdn/${ruta}`);
    assert.ok(deps.core[`loader-${c}`]?.includes(ruta), `deps.json: core["loader-${c}"] no incluye ${ruta}`);
    assert.ok(!deps.core.loader?.includes(ruta), `${ruta} no puede estar en el cierre estático del núcleo`);
    assert.match(nucleo, new RegExp(`import\\("\\./loader-${c}\\.min\\.mjs(\\?v=[0-9a-z]+)?"\\)`), `el núcleo publicado no pide ${ruta} con import()`);
  }
});

export default lista();
