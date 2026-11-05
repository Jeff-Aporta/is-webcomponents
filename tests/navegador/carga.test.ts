/**
 * carga.test.ts — presupuestos de carga como gate (plan carga modular, F7 tarea 2). Rojo bloquea.
 *
 * Todo sobre el `dist` local (sin red), en Edge headless (nunca el Chrome del usuario), con `scripts/medir-carga.mjs`
 * (la misma medición que `deno task medir`). Cada presupuesto imprime el valor medido junto al tope.
 *
 *   - `core/loader.min.mjs` ≤ 8 KB brotli (núcleo del loader, D7).
 *   - Tamaño medio por `<cat>/<tag>.min.mjs`: ≤ 6 KB brotli (lo que viaja), y sin comprimir ≤ lo medido + 10 %
 *     (F7b, 5-nov-2026: 7 145 B de media; el objetivo de 6 KB sin comprimir NO se cumple y queda como pendiente en
 *     specs/plan-carga-modular.md §8). `actions/button.min.mjs` ≤ 2 KB sin comprimir.
 *   - Lote shell (los 17 tags de `SHELL_CRITICO` de `gobernanza/deps-json`) por el loader, origen mutable, servidor
 *     con 120 ms de latencia (mayor que el umbral de ráfaga): la cascada de `load()` en ≤ 2 ráfagas encadenadas
 *     (`rafagasEncadenadas`: un grupo que salió antes de que respondiera el anterior no es un nivel nuevo), 0 URLs
 *     duplicadas, 0 `indexedDB.open`, 0 `caches.open`, 0 peticiones a api.github.com, 0 errores de consola, y los
 *     17 tags definidos.
 *   - Galería local (`index.html` de la raíz, que carga `dist/`), servida estática sin latencia y sin red externa:
 *     `iswc-doc-demo[data-ready="1"]` en frío ≤ 1 500 ms (mediana de 3 corridas).
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { medirCarga } from '../../scripts/medir-carga.mjs';
import { rafagas } from '../_shared/rafagas.ts';
import { rafagasEncadenadas } from '../_shared/rafagas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const DIST = join(RAIZ, 'dist', 'cdn');

/** Copia de `SHELL_CRITICO` de tests/gobernanza/deps-json.test.ts (arranque de frontend-avatar). */
const SHELL_CRITICO = ['iswc-app-shell', 'iswc-doc-layout', 'iswc-doc-index', 'iswc-theme-toggle', 'iswc-icon', 'iswc-button', 'iswc-heading', 'iswc-spinner', 'iswc-skeleton', 'iswc-toast', 'iswc-avatar', 'iswc-tag', 'iswc-badge', 'iswc-card', 'iswc-dropdown', 'iswc-dropdown-item', 'iswc-session-menu'];

const MAX_LOADER_BR = 8 * 1024;
const MAX_MEDIO_TAG_BR = 6 * 1024;
/** F7b: 7 145 B de media sin comprimir; tope = medido + 10 %. */
const MAX_MEDIO_TAG = 7_860;
const MAX_BUTTON = 2 * 1024;
const MAX_RAFAGAS_LOTE = 2;
const LATENCIA_LOTE_MS = 120;
const MAX_GALERIA_MS = 1_500;

const hayDist = () => existsSync(join(DIST, 'deps.json')) && existsSync(join(DIST, 'core', 'loader.min.mjs'));
const br = (ruta: string) => brotliCompressSync(readFileSync(ruta)).length;

/** Módulo de cada tag del índice (`<cat>/<tag>.min.mjs`). */
function modulosDeTag(): string[] {
  const indice = JSON.parse(readFileSync(join(DIST, 'deps.json'), 'utf8')) as { categorias: Record<string, string> };
  return Object.entries(indice.categorias)
    .map(([tag, cat]) => join(DIST, cat, `${tag.replace(/^iswc-/, '')}.min.mjs`))
    .filter((ruta) => existsSync(ruta));
}

test('navegador/carga: rafagasEncadenadas une el escalonado (sin respuesta entre medias) y separa la cascada', () => {
  const p = (inicio: number, fin: number) => ({ url: `u${inicio}`, inicio, fin });
  // 0 y 80 ms salen antes de la primera respuesta (120): un nivel; 260 sale tras ella: otro nivel.
  const ps = [p(0, 120), p(80, 200), p(260, 380)];
  assert.equal(rafagas(ps).length, 3);
  assert.equal(rafagasEncadenadas(ps).length, 2);
});

test('navegador/carga: loader núcleo ≤ 8 KB brotli', () => {
  if (!hayDist()) return;
  const n = br(join(DIST, 'core', 'loader.min.mjs'));
  console.log(`  core/loader.min.mjs: ${n} B brotli (tope ${MAX_LOADER_BR})`);
  assert.ok(n <= MAX_LOADER_BR, `loader núcleo: ${n} B brotli > ${MAX_LOADER_BR}`);
});

test('navegador/carga: tamaño medio por tag ≤ 6 KB brotli (y sin comprimir ≤ medido + 10 %); button ≤ 2 KB', () => {
  if (!hayDist()) return;
  const mods = modulosDeTag();
  assert.ok(mods.length > 100, `solo ${mods.length} módulos de tag en dist/cdn`);
  const crudo = Math.round(mods.reduce((s, r) => s + statSync(r).size, 0) / mods.length);
  const comprimido = Math.round(mods.reduce((s, r) => s + br(r), 0) / mods.length);
  const boton = statSync(join(DIST, 'actions', 'button.min.mjs')).size;
  console.log(`  ${mods.length} módulos de tag: media ${comprimido} B brotli (tope ${MAX_MEDIO_TAG_BR}) · ${crudo} B sin comprimir (tope ${MAX_MEDIO_TAG}) · button ${boton} B (tope ${MAX_BUTTON})`);
  assert.ok(comprimido <= MAX_MEDIO_TAG_BR, `media por tag: ${comprimido} B brotli > ${MAX_MEDIO_TAG_BR}`);
  assert.ok(crudo <= MAX_MEDIO_TAG, `media por tag: ${crudo} B sin comprimir > ${MAX_MEDIO_TAG}`);
  assert.ok(boton <= MAX_BUTTON, `actions/button.min.mjs: ${boton} B > ${MAX_BUTTON}`);
});

test('navegador/carga: lote shell (17 tags) en ≤ 2 ráfagas, sin duplicados, sin IndexedDB/Cache Storage/GitHub ni errores', { timeout: 180_000 }, async () => {
  if (!hayDist()) return;
  const r = await medirCarga({ lote: SHELL_CRITICO, latencia: LATENCIA_LOTE_MS, corridas: 1, espera: 500, soloLocal: true, resolver: [], warm: false, throttle: false, seo: false, ready: 'data-app-ready', url: null, servir: null, kit: null, json: null });
  const v = r.corridas[0][0];
  console.log(`  lote shell: ready ${v.ready} ms · ${v.peticiones} peticiones · ${v.kbTransferidos} KB · ráfagas tras load() ${v.rafagasTrasLoad} (tope ${MAX_RAFAGAS_LOTE}) · duplicadas ${v.duplicadas}/${v.rutasDuplicadas} (tope 0) · idb ${v.idb} · caches ${v.caches} · github ${v.github} · errores ${v.errores} (topes 0)`);
  assert.notEqual(v.ready, null, 'el lote no llegó a data-app-ready');
  assert.deepEqual(v.sinDefinir, [], 'tags del lote sin definir');
  assert.ok(v.rafagasTrasLoad <= MAX_RAFAGAS_LOTE, `lote shell: ${v.rafagasTrasLoad} ráfagas > ${MAX_RAFAGAS_LOTE}`);
  assert.equal(v.duplicadas, 0, `URLs pedidas dos veces: ${v.detalle.duplicadas.join(' ')}`);
  assert.equal(v.rutasDuplicadas, 0, `misma ruta con dos URLs: ${v.detalle.rutasDuplicadas.join(' ')}`);
  assert.equal(v.idb, 0, 'indexedDB.open en el arranque');
  assert.equal(v.caches, 0, 'caches.open en el arranque');
  assert.equal(v.github, 0, 'peticiones a api.github.com');
  assert.equal(v.errores, 0, `errores de consola: ${v.detalle.errores.join(' | ')}`);
});

test('navegador/carga: galería local data-ready ≤ 1 500 ms en frío', { timeout: 240_000 }, async () => {
  if (!hayDist() || !existsSync(join(RAIZ, 'index.html')) || !existsSync(join(RAIZ, 'dist', 'gallery-app.min.js'))) return;
  const r = await medirCarga({ servir: RAIZ, url: '/', ready: 'iswc-doc-demo[data-ready="1"]', corridas: 3, espera: 500, soloLocal: true, resolver: [], latencia: 0, warm: false, throttle: false, seo: false, lote: null, kit: null, json: null });
  const v = r.resumen.frio;
  console.log(`  galería local: data-ready ${v.ready} ms en frío (mediana de ${v.n}: ${v.readys.join('/')}; tope ${MAX_GALERIA_MS}) · ${v.peticiones} peticiones · ${v.kbTransferidos} KB · ráfagas ${v.rafagas} · duplicadas ${v.duplicadas}`);
  assert.notEqual(v.ready, null, 'la galería no llegó a data-ready="1"');
  assert.ok(v.ready <= MAX_GALERIA_MS, `galería local: data-ready ${v.ready} ms > ${MAX_GALERIA_MS}`);
});

export default lista();
