/**
 * sin-codigo-muerto.test.ts — guardián de la depuración F9a (5-nov-2026). El análisis vive en
 * `scripts/codemods/codigo-muerto.ts`; el arreglo, en `scripts/codemods/depurar.mjs [--exports]`.
 *
 *   M1 `deno lint` (no-unused-vars) no reporta ningún import sin uso en src, scripts, tests ni skills.
 *   M2 ningún `export` de src/scripts/tests queda sin consumidor fuera de las excepciones de abajo (API pública).
 *   M3 ningún `.ts`/`.mjs`/`.js` queda sin importador fuera de las entradas legítimas (tests, componentes,
 *      core, previews, schemas de un `.ts` vivo, scripts citados en deno.json/skills/docs) y de las excepciones.
 *
 * Las listas son la única fuente de excepciones: cada entrada lleva su razón. Rojo bloquea.
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { analizarCodigoMuerto, importsSinUso } from '../../scripts/codemods/codigo-muerto.ts';
import type { Excepciones } from '../../scripts/codemods/codigo-muerto.schemas.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');

/** Archivos (o prefijos `…/`, o patrones con `*`) cuyos exports son API aunque nadie del repo los importe. */
export const EXCEPCIONES_ARCHIVO: [string, string][] = [
  ['src/cdn/loader.ts', 'API de iswcLoader (capa 1), contrato con las apps'],
  ['src/cdn/loader-*', 'capa 2 del loader: se carga por import() con nombre estable'],
  ['src/cdn/schemas/loader.schemas.ts', 'tipos públicos de iswcLoader'],
  ['src/cdn/build/', 'herramientas publicadas en dist/cdn/build/ para consumidores'],
  ['src/core/iswc-element.ts', 'molde público de componentes'],
  ['src/core/props-element.ts', 'molde público de componentes'],
  ['src/core/attrs.ts', 'atributos públicos del molde'],
  ['src/core/app-init.ts', 'lo pinean las apps (DER docs, Avatar)'],
  ['src/core/cdn-ref.ts', 'capa 1 del loader'],
  ['src/core/iswc-storage.ts', 'capa 1 del loader'],
  ['src/core/form-control-mixin.ts', 'público compat; lo reemplaza iswc-form-control en F8'],
  ['src/core/element-base.ts', 'público compat (ElementBase); se decide en F8'],
  ['src/vendor-distributions/', 'herramientas vendorizadas en las apps'],
  ['skills/', 'plantillas y tools que se vendorizan en las apps'],
  ['src/previews/', 'galería: la resuelve por nombre (registry, bundle-scripts)'],
  ['src/components/*.preview.ts', 'galería: bundle-scripts los busca por nombre'],
  ['src/components/diagrams/utils/theme.ts', 'entrada pública por URL (diagrams/theme)'],
  ['src/components/helpers/utils/md-*', 'entrada pública por URL (helpers/md-*)'],
  ['src/components/isp/utils/customs-base.ts', 'entrada pública por URL (isp/customs-base)'],
  ['src/components/charts/utils/marks-*', 'entrada pública por URL (charts/marks-*)'],
  ['src/ai/motores/', 'motores de IA: motores.ts los carga por URL (motores/<id>.min.mjs) y llama crear'],
  ['src/pages/', 'páginas de la galería: el router las carga por URL y llama mount/unmount'],
  ['src/manifest.ts', 'manifest del kit (build, galería, catálogo del loader)'],
  ['tests/.audit/', 'motor de deno task test/audit (CLI y adaptadores con contrato propio)'],
  ['scripts/codemods/', 'codemods reutilizables: CLI a mano (propuesta aplanar §4.1)'],
  ['scripts/watch.mjs', 'dudoso: watcher de desarrollo sin task en deno.json (se decide en F9b)'],
  ['scripts/inject-reload.mjs', 'dudoso: cliente de recarga que usa watch.mjs'],
  ['scripts/verify-server.cjs', 'documentado en AGENTS.md (servidor de verificación en :8765)'],
  ['scripts/verify-fetch.cjs', 'documentado en AGENTS.md (pide URLs a verify-server)'],
  ['scripts/lab-componente.mjs', 'lab local de un componente (lo documenta gobernanza/build-unico)'],
  ['scripts/sondas/previews-to-json.ts', 'genera src/previews/catalog.ts (cabecera AUTO-GENERADO)'],
  ['scripts/sondas/generate-templates.ts', 'esqueleto de preview: documentado en AGENTS.md y specs/constraints.md'],
  ['scripts/sondas/sync-skill-catalog.mjs', 'regenera skills/iswc-base/catalog.md'],
  ['scripts/sondas/shoot-one.mjs', 'captura de un tag: la cita tests/e2e/10-ux-proposals'],
];

/** Símbolos sueltos que usan apps fuera del repo (grep en D:\VPS y D:\Dev\avatar, 5-nov-2026). */
export const EXCEPCIONES_SIMBOLO: [string, string, string][] = [
  ['src/components/diagrams/utils/diagram-studio.ts', 'bootDiagramStudio', 'lo importan labs/DER por dist/cdn/diagrams/diagram-studio'],
];

const EXCEPCIONES: Excepciones = { archivo: EXCEPCIONES_ARCHIVO, simbolo: EXCEPCIONES_SIMBOLO };

test('gobernanza/sin-codigo-muerto: M1 ningún import sin uso (deno lint no-unused-vars)', () => {
  const sobrantes = importsSinUso(RAIZ);
  assert.deepEqual(sobrantes, [], `imports sin uso (arreglo: deno run -A scripts/codemods/depurar.mjs):\n${sobrantes.join('\n')}`);
});

test('gobernanza/sin-codigo-muerto: M2 ningún export sin consumidor y M3 ningún archivo sin importador', () => {
  const { muertos, sinImportador } = analizarCodigoMuerto(RAIZ, EXCEPCIONES);
  const exportsMuertos = muertos.map((m) => `${m.archivo}:${m.linea} ${m.nombre}`);
  assert.deepEqual(exportsMuertos, [], `M2 exports sin consumidor (arreglo: depurar.mjs --exports, o excepción con razón):\n${exportsMuertos.join('\n')}`);
  assert.deepEqual(sinImportador, [], `M3 archivos sin importador (borrar, o excepción con razón):\n${sinImportador.join('\n')}`);
});

export default lista();
