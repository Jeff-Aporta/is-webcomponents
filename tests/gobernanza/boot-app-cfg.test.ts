/// <reference lib="dom" />
/**
 * El boot de la plantilla (`skills/iswc-foundation/templates/src/js/boot.ts`) aplica antes del primer
 * pintado lo que el usuario eligió, leyendo la MISMA llave que escriben el toggle y el selector.
 *
 *   B1 tema y paleta guardados en `iswc:app-cfg` (APP_CFG_KEY) ganan tras recargar
 *   B2 sin elección del usuario quedan los defaults del `<html>` de la app
 *   B3 `?s=` gana sobre lo guardado
 *   B4 llaves viejas (`iswc-theme`) se respetan si el kit aún no migró ese navegador
 *   B5 guardado corrupto cae al default sin romper la carga
 */
import assert from 'node:assert/strict';
import { APP_CFG_KEY } from '../../src/core/app-cfg.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const BOOT = new URL('../../skills/iswc-foundation/templates/src/js/boot.ts', import.meta.url).href;
let n = 0;

async function cargar(guardado: Record<string, string>, html: { theme: string; palette: string }, search = '') {
  const datos = new Map(Object.entries(guardado));
  const clases = new Set<string>();
  const raiz = { dataset: { ...html } as Record<string, string>, classList: { toggle: (c: string, si: boolean) => (si ? clases.add(c) : clases.delete(c)) } };
  const g = globalThis as Record<string, unknown>;
  g.document = { documentElement: raiz };
  g.location = { search };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: (k: string) => datos.get(k) ?? null } });
  await import(`${BOOT}?n=${n++}`);
  return { theme: raiz.dataset.theme, palette: raiz.dataset.palette, clases };
}

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('B1 lo guardado en iswc:app-cfg gana tras recargar', async () => {
  assert.equal(APP_CFG_KEY, 'iswc:app-cfg');
  const r = await cargar({ [APP_CFG_KEY]: JSON.stringify({ theme: 'dark', palette: 'iguana' }) }, { theme: 'light', palette: 'turquesa' });
  assert.deepEqual([r.theme, r.palette, r.clases.has('theme-dark')], ['dark', 'iguana', true]);
});

test('B2 sin elección quedan los defaults del html', async () => {
  const r = await cargar({}, { theme: 'light', palette: 'turquesa' });
  assert.deepEqual([r.theme, r.palette], ['light', 'turquesa']);
});

test('B3 ?s= gana sobre lo guardado', async () => {
  const r = await cargar({ [APP_CFG_KEY]: JSON.stringify({ theme: 'dark' }) }, { theme: 'dark', palette: 'delfin' }, `?s=${b64({ theme: 'light', palette: 'rubi' })}`);
  assert.deepEqual([r.theme, r.palette], ['light', 'rubi']);
});

test('B4 llaves viejas sin migrar', async () => {
  const r = await cargar({ 'iswc-theme': 'dark', 'iswc-palette': 'jade' }, { theme: 'light', palette: 'turquesa' });
  assert.deepEqual([r.theme, r.palette], ['dark', 'jade']);
});

test('B5 guardado corrupto cae al default', async () => {
  const r = await cargar({ [APP_CFG_KEY]: '{roto' }, { theme: 'light', palette: 'turquesa' });
  assert.deepEqual([r.theme, r.palette], ['light', 'turquesa']);
});

export default lista();
