// @contexto INDICE.md · tests/gobernanza/README.md
// smoke-runtime.test.ts — los componentes del catálogo en un DOM real (Edge headless, nunca el Chrome del usuario).
//
// El resto de la batería es sobre todo análisis estático: vigila contratos, pero no ve lo que solo falla al
// ejecutar (un import roto, un custom element que no se registra, un `attributeChangedCallback` que lanza, o un
// componente que no sobrevive a que le muevan el nodo).
//
// Sirve `dist/` estático en un puerto libre (sin red externa) y, en una sola página, pide cada tag del catálogo al
// loader publicado (`cdn/core/loader.min.mjs`, `ensure(tag)`), lo construye, lo conecta, le pone su primer atributo
// observado y lo mueve de padre. Falla si alguno no carga, no se registra o lanza en ese recorrido. Lo que solo
// avisa (sin shadowRoot ni hijos) se imprime. Sin `dist` (build sin correr) no hay nada que probar.
//
// Antes (hasta F7) lanzaba el chrome.exe del sistema con `--dump-dom` contra una página que importaba las fuentes
// `.js` (ya no existen): siempre salía SKIP. Plan carga modular F7, tarea 3.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { cerrarChromium } from '../_shared/navegador.ts';
import { servirEstatico } from '../../scripts/medir-carga.mjs';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(RAIZ, 'dist');

type Fila = { tag: string; ok: boolean; notas: string[] };

/** Recorrido en la página: cada tag por el loader, construir, conectar, atributo observado y mover. */
const PAGINA = `<!doctype html><html lang="es"><meta charset="utf-8"><title>smoke</title><link rel="icon" href="data:,">
<body><div id="host"></div><script type="module">
import { iswcLoader as L } from '/cdn/core/loader.min.mjs';
const tags = await (await fetch('/__tags.json')).json();
const host = document.getElementById('host');
const filas = [];
const plazo = (ms) => new Promise((_, no) => setTimeout(() => no(new Error('sin definir en ' + ms + ' ms')), ms));
for (const tag of tags) {
  const fila = { tag, ok: true, notas: [] };
  try {
    await Promise.race([L.ensure(tag), plazo(15000)]);
  } catch (e) {
    fila.ok = false; fila.notas.push('carga: ' + (e && e.message || e));
    filas.push(fila); continue;
  }
  const C = customElements.get(tag);
  if (!C) { fila.ok = false; fila.notas.push('no registrado'); filas.push(fila); continue; }
  try {
    const el = document.createElement(tag);
    host.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    if (!el.shadowRoot && !el.children.length) fila.notas.push('sin shadowRoot ni hijos');
    const obs = C.observedAttributes || [];
    if (obs.length) el.setAttribute(obs[0], el.getAttribute(obs[0]) ?? '1');
    const otro = document.createElement('div');
    host.appendChild(otro);
    otro.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    el.remove(); otro.remove();
  } catch (e) {
    fila.ok = false; fila.notas.push('runtime: ' + (e && e.message || e));
  }
  filas.push(fila);
}
window.__filas = filas;
document.documentElement.setAttribute('data-smoke-listo', '');
</script></body></html>`;

test('gobernanza/smoke-runtime: cada tag del catálogo carga por el loader, se registra, monta, acepta un atributo y se mueve', { timeout: 600_000 }, async () => {
  if (!existsSync(join(DIST, 'cdn', 'deps.json')) || !existsSync(join(DIST, 'cdn', 'core', 'loader.min.mjs'))) return;
  const indice = JSON.parse(Deno.readTextFileSync(join(DIST, 'cdn', 'deps.json'))) as { categorias: Record<string, string> };
  const { default: manifest } = await import(new URL('../../src/manifest.ts', import.meta.url).href) as { default: { tag: string; module?: boolean }[] };
  // Solo los custom elements con módulo propio (los `module: true` son utilidades sin tag registrado).
  const tags = manifest.filter((m) => !m.module && indice.categorias[m.tag]).map((m) => m.tag);
  assert.ok(tags.length > 150, `solo ${tags.length} tags del catálogo en deps.json`);
  const srv = await servirEstatico(DIST, { extra: { '/__smoke.html': PAGINA, '/__tags.json': JSON.stringify(tags) } });
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] });
  try {
    const page = await browser.newPage();
    const fatales: string[] = [];
    page.on('pageerror', (e) => fatales.push(String(e.message ?? e).slice(0, 200)));
    await page.goto(`${srv.origen}/__smoke.html`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-smoke-listo'), null, { timeout: 540_000 });
    const filas = await page.evaluate(() => (window as unknown as { __filas: Fila[] }).__filas);
    const rotos = filas.filter((f) => !f.ok);
    const avisos = filas.filter((f) => f.ok && f.notas.length);
    for (const f of rotos) console.log(`  ✗ ${f.tag}: ${f.notas.join('; ')}`);
    for (const e of [...new Set(fatales)].slice(0, 8)) console.log(`  · no capturado: ${e}`);
    console.log(`  ${filas.length} tags · ${rotos.length} rotos · ${avisos.length} sin shadowRoot ni hijos (aviso: light DOM o montaje diferido) · ${fatales.length} errores no capturados en la página`);
    assert.equal(filas.length, tags.length, 'el recorrido no llegó a todos los tags');
    assert.deepEqual(rotos.map((f) => `${f.tag}: ${f.notas.join('; ')}`), [], 'componentes que no arrancan');
  } finally {
    await cerrarChromium(browser);
    await srv.cerrar();
  }
});

export default lista();
