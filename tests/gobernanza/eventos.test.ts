// @contexto INDICE.md · tests/gobernanza/README.md
// eventos.test.ts — guardián de F8 hito 5 (specs/paridad-webawesome.md HOW-6): eventos tipados.
//   E1 todo evento `iswc-*` que el código emite (emit/emitCancelable, new CustomEvent, helpers `this.#x('iswc-…')`,
//      `cambioDelUsuario`) está en el `declare static events` de su clase, y todo evento escrito en el tipo propio
//      (`XEventos = … & { … }` en `schemas/<tag>.schemas.ts`) aparece en el código. Por archivo, nunca más faltas que
//      en `eventos-pendientes.json`; un archivo fuera de la lista tiene 0. La lista solo baja (trinquete, como
//      `reactivo-pendientes.json`): al bajar, la prueba reescribe el JSON con lo medido.
//   E2 la ficha `.json` (`"events"`) y la tabla «Eventos» del `.md` salen de la fuente: `scripts/sondas/eventos.ts`
//      no deja nada por escribir.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { analizar, sincronizar } from '../../scripts/sondas/eventos.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const PENDIENTES = join(import.meta.dirname!, 'eventos-pendientes.json');

const archivos = analizar();

/** Faltas de un archivo: emitidos sin declarar y propios declarados que el código no nombra. */
function faltas(a: (typeof archivos)[number]): string[] {
  const declarados = new Set(a.clases.flatMap((k) => k.eventos.map((e) => e.name)));
  const sinDeclarar = [...a.emitidos.keys()].filter((n) => !declarados.has(n)).map((n) => `emite ${n} sin declararlo`);
  const sinEmitir = [...a.propios].filter((n) => !a.literales.has(n)).map((n) => `declara ${n} y no lo emite`);
  return [...sinDeclarar, ...sinEmitir];
}

test('eventos: E1 emitidos y declarados coinciden (pendientes solo bajan)', () => {
  const previo = existsSync(PENDIENTES) ? (JSON.parse(readFileSync(PENDIENTES, 'utf8')) as Record<string, number>) : {};
  const detalle = Object.fromEntries(archivos.map((a) => [a.ruta, faltas(a)]));
  const medido = Object.fromEntries(Object.entries(detalle).filter(([, f]) => f.length > 0).map(([r, f]) => [r, f.length]).sort(([a], [b]) => String(a).localeCompare(String(b))));
  const suben = Object.entries(medido).filter(([r, n]) => n > (previo[r] ?? 0)).map(([r, n]) => `${r}: ${n} (pendiente ${previo[r] ?? 0}) — ${detalle[r]!.join('; ')}`);
  assert.deepEqual(suben, [], 'declara el evento en `XEventos` (schemas) y enlázalo con `declare static events: XEventos;`');
  if (JSON.stringify(medido) !== JSON.stringify(previo)) writeFileSync(PENDIENTES, `${JSON.stringify(medido, null, 2)}\n`, 'utf8');
  const total = Object.values(medido).reduce((a, b) => a + b, 0);
  console.log(`  eventos pendientes de declarar: ${total} en ${Object.keys(medido).length} archivos`);
});

test('eventos: E2 fichas .json y .md al día con la fuente', () => {
  assert.deepEqual(sincronizar(false, archivos), [], 'corre: deno run -A --no-check scripts/sondas/eventos.ts');
});

export default lista();
