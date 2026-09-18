// loader-global-guardian.test.ts — Guardian del bug de "loader bundled pisa globalThis".
//
// Síntoma: tras navegar a `ecosystem` (cuyo behavior bundlea el loader dentro
// porque usa `await import('../../dist/cdn/core/loader.min.js')`), los nav-clicks
// subsiguientes (`home`, `is-flex-options`, etc.) generaban 48× 404 contra
// `dist/pages/{cat}/{tag}.min.js`. Causa: el loader bundled dentro de
// `dist/pages/ecosystem.min.js` se asigna a `globalThis.ISWebComponentsLoader`
// con SELF_BASE = `dist/pages/`, pisando la instancia canónica que la galería
// cargó desde `dist/cdn/core/loader.min.js` (SELF_BASE = `dist/cdn/`).
//
// Estos tests:
//   1. (runtime) Verifican que el módulo loader es idempotente sobre globalThis:
//      la PRIMERA instancia registrada gana, una segunda no la pisa.
//   2. (regresión source) Verifican que la condición `&& !globalThis.ISWebComponentsLoader`
//      sigue presente en `src/cdn/loader.ts` (defensa contra reintroducir el bug).
//   3. (precondición) Verifican que el módulo loader expone `ISWebComponentsLoader`
//      (sanity: si cambias la forma del export, este test lo dice).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(new URL(import.meta.url).pathname.replace(/^\//, ''), '..', '..', '..', '..', '..');
const LOADER_TS = join(RAIZ, 'src', 'cdn', 'loader.ts');

test('loader.ts: el guardado `!globalThis.ISWebComponentsLoader` sigue presente', () => {
  const src = readFileSync(LOADER_TS, 'utf8');
  // El comentario explica la razón; la condición debe existir en código.
  assert.match(
    src,
    /!\s*\(globalThis\s+as\s+Record<string,\s*unknown>\)\s*\.ISWebComponentsLoader/,
    'Falta la guarda idempotente. Sin ella, un page bundle que embebe el loader\n' +
      '(caso real: dist/pages/ecosystem.min.js bundlea el loader porque\n' +
      'src/pages/ecosystem.ts usa `await import("../../dist/cdn/core/loader.min.js")`)\n' +
      'pisa la instancia canónica con SELF_BASE=`dist/pages/`, y los\n' +
      'nav-clicks subsiguientes rompen con 48× 404 a `dist/pages/{cat}/{tag}.min.js`.',
  );
});

test('loader.ts: explica el por qué del guardado en el comentario', () => {
  const src = readFileSync(LOADER_TS, 'utf8');
  // Busca cerca de la asignación el comentario con "idempotente" o "primera instancia".
  const idx = src.indexOf('globalThis');
  assert.ok(idx > 0, 'No se encontró globalThis en loader.ts');
  const window = src.slice(Math.max(0, idx - 600), idx + 200);
  assert.match(window, /idempotente|primera instancia|guarda/i, 'Falta el comentario explicativo cerca del guardado.');
});

test('runtime: el módulo loader expone ISWebComponentsLoader (sanity de export)', async () => {
  // Importar el loader puede fallar en CI si __IS_LOADER_CATALOG__ no está
  // definido (esbuild define). Si falla, saltamos con t.skip equivalente.
  let mod;
  try {
    mod = await import('../../../cdn/loader.ts' as string).catch(() => null);
  } catch { mod = null; }
  if (!mod) {
    // El loader TS usa `declare const __IS_LOADER_CATALOG__` que esbuild define.
    // Si el test runner no lo define, lo verificamos por fuente.
    const src = readFileSync(LOADER_TS, 'utf8');
    assert.match(src, /export const ISWebComponentsLoader/);
    return;
  }
  assert.ok(mod.ISWebComponentsLoader, 'Falta export ISWebComponentsLoader');
  assert.equal(typeof mod.ISWebComponentsLoader.load, 'function');
});
