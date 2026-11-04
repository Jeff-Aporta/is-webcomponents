/**
 * extension-modulos.test.ts — la extensión declara el tipo (plan D2, fase F3): `.mjs` = módulo ES, `.js` = clásico.
 *
 *   (a) en dist/cdn todo módulo ES termina en `.min.mjs` o está en `_chunks/*.mjs`; los únicos `.js` permitidos son
 *       la copia compat `core/loader.min.js` (F5 la retira) y los artefactos clásicos `*.classic.js`;
 *   (b) en src/**, skills/**, specs/** y README.md no queda `<módulo del kit>.min.js` (misma detección que el codemod
 *       scripts/codemods/min-mjs.mjs; sus excepciones: terceros, galería, pines SHA, líneas de compat, historia);
 *   (c) deps.json no nombra ningún `.js`.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { pendientes } from '../../scripts/codemods/min-mjs.mjs';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const DIST = join(RAIZ, 'dist', 'cdn');

/** Carpetas de dist/cdn que no son módulos del kit: copias de fuentes para vendorizar y documentación. */
const NO_MODULOS = /^(skills|vendor-distributions|build)\//;

/** `.js` permitidos en dist/cdn. */
const JS_PERMITIDO = (ruta: string) => ruta === 'core/loader.min.js' || ruta.endsWith('.classic.js');

test('gobernanza/extension-modulos: en dist/cdn los módulos ES son .min.mjs o _chunks/*.mjs', () => {
  if (!existsSync(DIST)) return;
  const rutas = readdirSync(DIST, { recursive: true }).map((r) => String(r).replaceAll('\\', '/')).filter((r) => !NO_MODULOS.test(r));
  const malos: string[] = [];
  for (const r of rutas) {
    if (r.endsWith('.js') && !JS_PERMITIDO(r)) malos.push(r);
    if (r.endsWith('.mjs') && !r.endsWith('.min.mjs') && !/^_chunks\/[^/]+\.mjs$/.test(r) && r !== 'loader.min.mjs') malos.push(r);
  }
  assert.deepEqual(malos, [], `módulos con extensión fuera de la regla D2: ${malos.slice(0, 10).join(', ')}`);
  assert.ok(rutas.some((r) => r.startsWith('_chunks/')), 'dist/cdn/_chunks/ vacío: ¿build único sin splitting?');
});

test('gobernanza/extension-modulos: sin .min.js del kit en src, skills, specs y README', () => {
  const quedan = pendientes(['src', 'skills', 'specs', 'README.md'], RAIZ);
  assert.deepEqual(quedan, {}, `quedan .min.js del kit (corre scripts/codemods/min-mjs.mjs): ${JSON.stringify(quedan)}`);
});

test('gobernanza/extension-modulos: deps.json no nombra .js', () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const texto = readFileSync(join(DIST, 'deps.json'), 'utf8');
  assert.doesNotMatch(texto, /\.js"/, 'deps.json debe nombrar solo .mjs');
});

export default lista();
