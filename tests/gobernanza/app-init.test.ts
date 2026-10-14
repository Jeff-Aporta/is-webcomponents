/// <reference lib="dom" />
/**
 * Configuración de la app: inicial (`core/app-init.ts`) y persistente (`core/app-cfg.ts`).
 *
 *   A1 sin config guardada: aplica el tema y la paleta iniciales de la app
 *   A2 lo que el usuario eligió (iswc-app-cfg) gana sobre la config inicial
 *   A3 un valor guardado inválido cae a la config inicial
 *   A4 initApp no escribe nada (la config inicial no es una elección del usuario)
 *   A5 tema, paleta y demás valores de la app viven en UNA sola llave (iswc-app-cfg)
 *   A6 las llaves sueltas viejas (iswc-theme / iswc-palette) se migran y se borran
 *   A7 borrar la config devuelve la app a sus valores iniciales
 *   A8 `icons: { host, folder? }` deja `<html data-icons>` como URL ABSOLUTA (host publicado + carpeta);
 *      un host relativo lanza; sin `icons` no se toca un `data-icons` que ya traiga la página
 *   A9 la config vive bajo el prefijo `iswc:` (`iswc:app-cfg`)
 */
import assert from 'node:assert/strict';
import { ICONS_FOLDER_DEFAULT, iconsBase, initApp } from '../../src/core/app-init.ts';
import { APP_CFG_KEY, borrarAppCfg, guardarAppCfg, leerAppCfg } from '../../src/core/app-cfg.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


function entorno(guardado: Record<string, string> = {}) {
  const datos = new Map(Object.entries(guardado));
  const escritos: string[] = [];
  const almacen = {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => { escritos.push(k); datos.set(k, v); },
    removeItem: (k: string) => { datos.delete(k); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: almacen });
  const root: Pick<HTMLElement, 'dataset'> = { dataset: {} };
  return { root, dataset: root.dataset, escritos, datos };
}

test('A1 config inicial la primera vez', () => {
  const e = entorno();
  const r = initApp({ theme: 'light', palette: 'insoft', root: e.root });
  assert.deepEqual([e.dataset.theme, e.dataset.palette], ['light', 'insoft']);
  assert.deepEqual(r.origen, { theme: 'default', palette: 'default' });
});

test('A2 la elección del usuario gana', () => {
  const e = entorno({ [APP_CFG_KEY]: JSON.stringify({ theme: 'dark', palette: 'agrowin' }) });
  const r = initApp({ theme: 'light', palette: 'contapyme', root: e.root });
  assert.deepEqual([e.dataset.theme, e.dataset.palette], ['dark', 'agrowin']);
  assert.deepEqual(r.origen, { theme: 'usuario', palette: 'usuario' });
});

test('A3 guardado inválido cae a la config inicial', () => {
  const e = entorno({ [APP_CFG_KEY]: JSON.stringify({ theme: 'sepia', palette: 3 }) });
  initApp({ theme: 'light', palette: 'insoft', root: e.root });
  assert.deepEqual([e.dataset.theme, e.dataset.palette], ['light', 'insoft']);
});

test('A4 initApp no escribe', () => {
  const e = entorno();
  initApp({ theme: 'dark', root: e.root });
  assert.deepEqual(e.escritos, []);
});

test('A5 todo en una sola llave', () => {
  const e = entorno();
  guardarAppCfg({ theme: 'dark' });
  guardarAppCfg({ palette: 'insoft', densidad: 'compacta' });
  assert.deepEqual([...new Set(e.escritos)], [APP_CFG_KEY]);
  assert.deepEqual(leerAppCfg(), { theme: 'dark', palette: 'insoft', densidad: 'compacta' });
});

test('A6 migra las llaves sueltas viejas', () => {
  const e = entorno({ 'iswc-theme': 'dark', 'iswc-palette': 'agrowin' });
  assert.deepEqual(leerAppCfg(), { theme: 'dark', palette: 'agrowin' });
  assert.equal(e.datos.has('iswc-theme') || e.datos.has('iswc-palette'), false);
  assert.ok(e.datos.has(APP_CFG_KEY));
});

test('A7 borrar vuelve a la config inicial', () => {
  const e = entorno({ [APP_CFG_KEY]: JSON.stringify({ theme: 'dark' }) });
  assert.deepEqual(borrarAppCfg(), { theme: 'dark' });
  initApp({ theme: 'light', root: e.root });
  assert.equal(e.dataset.theme, 'light');
});

test('A8 icons: base absoluta en data-icons, una sola declaración', () => {
  const e = entorno();
  const r = initApp({ icons: { host: 'https://mi-app.azurestaticapps.net' }, root: e.root });
  assert.equal(e.dataset.icons, 'https://mi-app.azurestaticapps.net/assets/iconify/');
  assert.equal(r.icons, e.dataset.icons);
  assert.equal(ICONS_FOLDER_DEFAULT, 'assets/iconify/');
  assert.equal(iconsBase({ host: 'https://cdn.example/app/', folder: 'img/iconos' }), 'https://cdn.example/app/img/iconos/');
  assert.throws(() => iconsBase({ host: 'assets/iconify/' }), TypeError, 'relativo: nunca');
  assert.throws(() => iconsBase({ host: 'file:///c:/x/' }), TypeError, 'solo http(s)');
  const f = entorno();
  f.dataset.icons = 'https://pagina.example/assets/iconify/';
  assert.equal(initApp({ root: f.root }).icons, 'https://pagina.example/assets/iconify/', 'sin icons no se pisa');
});

test('A9 la config de la app vive en iswc:app-cfg', () => {
  assert.equal(APP_CFG_KEY, 'iswc:app-cfg');
});

export default lista();
