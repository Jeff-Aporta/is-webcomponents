// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * construir-app.test.ts — el conversor TS → `.mjs` de las apps (`src/cdn/build/construir-app.ts`, F10).
 *
 * Construye en `.tmp/construir-app/` una app mínima de fixture (dos componentes `xx-a`/`xx-b` con `.scss`, un módulo
 * común, un `boot.ts` plano y una vista) contra el `dist` LOCAL del kit servido estático en un puerto libre como «pin»
 * (`cdn`), y comprueba:
 *   A1 `.min.mjs` por entrada, `_chunks/` propios, `boot.js` IIFE, registrador `xxLoader.min.mjs` y `deps.json` con
 *      cierres válidos (cada ruta existe; el de `xx-a` incluye su entrada y el chunk común).
 *   A2 HTML: import map (alias y `zod` del pin) → `modulepreload` (kit y app) → hojas base no bloqueantes → loader →
 *      registrador, en ese orden y dentro de las marcas.
 *   A3 `?v=` ausente sobre pin (`origenMutable: false`) y presente en origen mutable (registrador y entradas en el HTML;
 *      nunca dentro de un `.mjs` ni en un chunk).
 *   A4 idempotencia: una segunda corrida sin cambios no reescribe HTML y deja `dist` byte a byte igual (salvo el sello).
 *   A5 Edge headless: la vista define `xx-a` y `xx-b` con su estilo (`iswc:css`) sin pedir ningún `.css` de la app, y
 *      los cierres del registrador (`xxLoader.deps.json`) se piden una vez con la primera interacción, no al cargar.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { construirApp } from '../../src/cdn/build/construir-app.ts';
import type { ConstruirAppOpts } from '../../src/cdn/build/construir-app.schemas.ts';
import { cerrarChromium, lanzarChromium } from '../_shared/navegador.ts';
import { servirEstatico } from '../../scripts/medir-carga.mjs';

const { test, lista } = coleccionPruebas({ categoria: 'how', timeoutMs: 240000 });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const APP = join(RAIZ, '.tmp', 'construir-app', 'app');
const DIST = join(APP, 'dist', 'cdn');
const VISTA = 'view/hola/index.html';

/** De `view/hola/components/` a la raíz de la app de fixture (armado: el guardián de hermeticidad lee este archivo). */
const DESDE_VISTA = '../'.repeat(3);

const FUENTES: Record<string, string> = {
  'src/js/base/comun.ts': `export const saludo = (x: string): string => \`hola \${x}\`;\n`,
  'src/js/boot.ts': `document.documentElement.dataset.boot = '1';\n`,
  'src/js/components/xx/xx-a.ts': [
    `import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';`,
    `import css from 'iswc:css';`,
    `import { saludo } from '../../base/comun.js';`,
    `class XxA extends IswcElement { static override tag = 'xx-a'; static override css = css; onConnected() { this.shadowRoot!.textContent = saludo('a'); } }`,
    `define(XxA);`,
  ].join('\n'),
  'src/js/components/xx/xx-a.scss': `$c: rgb(1, 2, 3);\n:host { display: block; color: $c; }\n`,
  'view/hola/components/xx-b.ts': [
    `import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';`,
    `import css from 'iswc:css';`,
    `import { saludo } from '${DESDE_VISTA}src/js/base/comun.js';`,
    `class XxB extends IswcElement { static override tag = 'xx-b'; static override css = css; onConnected() { this.shadowRoot!.textContent = saludo('b'); } }`,
    `define(XxB);`,
  ].join('\n'),
  'view/hola/components/xx-b.scss': `:host { display: block; color: rgb(4, 5, 6); }\n`,
  [VISTA]: `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>fixture construirApp</title>
<link rel="icon" href="data:,">
<script src="../../dist/cdn/boot.js"></script>
<!-- iswc:precarga:inicio -->
<!-- iswc:precarga:fin -->
<script type="module">
  await globalThis.iswcLoader.load('xx-a', 'xx-b');
  document.documentElement.setAttribute('data-app-ready', '');
</script>
</head>
<body><xx-a></xx-a><xx-b></xx-b></body>
</html>
`,
};

/** `sass` se importa al correr (no al cargar): el runner importa todos los archivos en un proceso para leer sus listas. */
async function fixture(): Promise<void> {
  const sass = await import('sass');
  rmSync(join(APP, '..'), { recursive: true, force: true });
  for (const [rel, texto] of Object.entries(FUENTES)) {
    mkdirSync(dirname(join(APP, rel)), { recursive: true });
    writeFileSync(join(APP, rel), texto);
    if (!rel.endsWith('.scss')) continue;
    const css = join(APP, '.tmp-scss', rel.replace(/\.scss$/, '.css'));
    mkdirSync(dirname(css), { recursive: true });
    writeFileSync(css, sass.compile(join(APP, rel), { style: 'expanded' }).css);
  }
}

function arbol(dir: string, out: Record<string, string> = {}): Record<string, string> {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) arbol(p, out);
    else out[relative(DIST, p).replaceAll('\\', '/')] = readFileSync(p, 'utf8');
  }
  return out;
}

const opciones = (cdn: string, origenMutable: boolean): ConstruirAppOpts => ({
  raiz: APP,
  prefijo: 'xx',
  pin: 'local',
  cdn,
  planos: ['src/js/boot.ts'],
  origenMutable,
  tags: { 'xx-a': 'src/js/components/xx/xx-a.ts', 'xx-b': 'view/hola/components/xx-b.ts' },
  html: [{ archivo: VISTA, kit: ['iswc-button'], app: ['xx-a', 'xx-b'] }],
});

test('gobernanza/construir-app: A1–A5 conversor sobre una app de fixture', async (t) => {
  if (!existsSync(join(RAIZ, 'dist', 'cdn', 'core', 'loader.min.mjs'))) return t.skip('sin dist/cdn (corre deno task build)');
  await fixture();
  const srv = await servirEstatico(RAIZ);
  t.after(() => srv.cerrar());
  const cdn = `${srv.origen}/dist/cdn/`;

  // A1 + A3 (pin): salidas, deps.json y ningún ?v=
  const inf = await construirApp(opciones(cdn, false));
  for (const f of ['js/components/xx/xx-a.min.mjs', 'view/hola/components/xx-b.min.mjs', 'js/base/comun.min.mjs', 'boot.js', 'xxLoader.min.mjs', 'deps.json']) {
    assert.ok(existsSync(join(DIST, f)), `A1 falta dist/cdn/${f}`);
  }
  assert.ok(inf.chunks > 0 && readdirSync(join(DIST, '_chunks')).length === inf.chunks, 'A1 sin _chunks/ propios');
  assert.ok(!readFileSync(join(DIST, 'boot.js'), 'utf8').includes('import'), 'A1 boot.js no es IIFE');
  const deps = JSON.parse(readFileSync(join(DIST, 'deps.json'), 'utf8'));
  for (const [tag, cierre] of Object.entries(deps.tags as Record<string, string[]>)) {
    for (const r of cierre) assert.ok(existsSync(join(DIST, r)), `A1 ${tag}: ${r} no existe`);
  }
  assert.ok(deps.tags['xx-a'].includes('js/components/xx/xx-a.min.mjs') && deps.tags['xx-a'].some((r: string) => r.startsWith('_chunks/')), 'A1 cierre de xx-a sin su entrada o sin chunk');
  assert.deepEqual(inf.tags, ['xx-a', 'xx-b']);
  const htmlPin = readFileSync(join(APP, VISTA), 'utf8');
  assert.ok(!/\?v=/.test(htmlPin) && !readFileSync(join(DIST, 'xxLoader.min.mjs'), 'utf8').includes('?v='), 'A3 ?v= sobre pin');

  // A2 orden del bloque
  const bloque = htmlPin.slice(htmlPin.indexOf('<!-- iswc:precarga:inicio -->'), htmlPin.indexOf('<!-- iswc:precarga:fin -->'));
  const pos = (s: string) => {
    const i = bloque.indexOf(s);
    assert.ok(i >= 0, `A2 falta en el bloque: ${s}`);
    return i;
  };
  const orden = [
    pos('<script type="importmap">'),
    pos(`<link rel="modulepreload" href="${cdn}core/loader.min.mjs">`),
    pos('<link rel="modulepreload" href="../../dist/cdn/js/components/xx/xx-a.min.mjs">'),
    pos(`<link rel="preload" as="style" href="${cdn}is-base.min.css"`),
    pos(`<script type="module" src="${cdn}core/loader.min.mjs"></script>`),
    pos('<script type="module" src="../../dist/cdn/xxLoader.min.mjs"></script>'),
  ];
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b), 'A2 orden del bloque');
  const mapa = JSON.parse(bloque.match(/<script type="importmap">(.*?)<\/script>/)![1]!);
  assert.equal(mapa.imports['@jeff-aporta/iswc-base/'], cdn);
  assert.equal(mapa.imports.zod, `${cdn}lib/zod.min.mjs`);
  assert.ok(bloque.includes(`${cdn}${'actions/button.min.mjs'}`), 'A2 sin el cierre de iswc-button');
  assert.ok(bloque.includes(`${cdn}core/iswc-element.min.mjs`), 'A2 sin lo que la app importa del kit por alias');
  assert.ok(!bloque.includes('as="fetch"'), 'A2 precarga .css de un componente con iswc:css');

  // A3 (origen mutable): ?v= en el registrador y en el HTML; nunca dentro de un .mjs ni en un chunk
  await construirApp(opciones(cdn, true));
  const htmlMut = readFileSync(join(APP, VISTA), 'utf8');
  assert.match(htmlMut, /src="\.\.\/\.\.\/dist\/cdn\/xxLoader\.min\.mjs\?v=[0-9a-z]+"/, 'A3 registrador sin ?v=');
  assert.match(htmlMut, /href="\.\.\/\.\.\/dist\/cdn\/js\/components\/xx\/xx-a\.min\.mjs\?v=[0-9a-z]+"/, 'A3 entrada sin ?v=');
  assert.match(htmlMut, /src="\.\.\/\.\.\/dist\/cdn\/boot\.js\?v=[0-9a-z]+"/, 'A3 boot.js fuera del bloque sin ?v=');
  assert.ok(!/_chunks\/[^"]+\?v=/.test(htmlMut), 'A3 chunk con ?v=');
  assert.match(readFileSync(join(DIST, 'xxLoader.min.mjs'), 'utf8'), /xx-a\.min\.mjs\?v=/, 'A3 el registrador no sella');
  const conV = Object.entries(arbol(DIST)).filter(([f, txt]) => f.endsWith('.mjs') && f !== 'xxLoader.min.mjs' && /\?v=/.test(txt)).map(([f]) => f);
  assert.deepEqual(conV, [], 'A3 .mjs con ?v= dentro');

  // A4 idempotencia
  const antes = arbol(DIST);
  const inf2 = await construirApp(opciones(cdn, true));
  assert.deepEqual(inf2.html, [], 'A4 la segunda corrida reescribió HTML');
  assert.equal(readFileSync(join(APP, VISTA), 'utf8'), htmlMut);
  const despues = arbol(DIST);
  delete antes['build-stamp.json'];
  delete despues['build-stamp.json'];
  assert.deepEqual(Object.keys(despues).sort(), Object.keys(antes).sort(), 'A4 cambió la lista de archivos');
  for (const f of Object.keys(antes)) assert.equal(despues[f], antes[f], `A4 cambió dist/cdn/${f}`);

  // A5 Edge headless
  const nav = await lanzarChromium();
  t.after(() => cerrarChromium(nav));
  const pagina = await nav.newPage();
  const css: string[] = [];
  const errores: string[] = [];
  const pedidosDeps: string[] = [];
  pagina.on('request', (r) => {
    if (r.url().startsWith(`${srv.origen}/.tmp/`) && /\.css(?:[?#]|$)/.test(r.url())) css.push(r.url());
    if (r.url().includes('xxLoader.deps.json')) pedidosDeps.push(r.url());
  });
  pagina.on('pageerror', (e) => errores.push(String(e)));
  await pagina.goto(`${srv.origen}/.tmp/construir-app/app/${VISTA}`);
  await pagina.waitForSelector('html[data-app-ready]', { timeout: 30000 });
  // Texto (no función): se evalúa en la página y el test no necesita los tipos del DOM.
  const estado = await pagina.evaluate(`['xx-a', 'xx-b'].map((tag) => ({
    tag,
    definido: !!customElements.get(tag),
    color: getComputedStyle(document.querySelector(tag)).color,
    texto: document.querySelector(tag).shadowRoot?.textContent ?? '',
  }))`);
  assert.deepEqual(errores, [], 'A5 errores en la página');
  assert.deepEqual(estado, [
    { tag: 'xx-a', definido: true, color: 'rgb(1, 2, 3)', texto: 'hola a' },
    { tag: 'xx-b', definido: true, color: 'rgb(4, 5, 6)', texto: 'hola b' },
  ], 'A5 tags sin definir o sin estilo');
  assert.deepEqual(css, [], 'A5 la vista pidió .css de la app por red');
  // Los cierres para el loader (`xxLoader.deps.json`) no se piden al cargar, sino con la primera interacción.
  assert.ok(existsSync(join(DIST, 'xxLoader.deps.json')), 'A5 falta xxLoader.deps.json');
  await pagina.waitForTimeout(300);
  assert.deepEqual(pedidosDeps, [], 'A5 los deps se pidieron sin interacción');
  await pagina.mouse.move(20, 20);
  await pagina.waitForResponse((r) => r.url().includes('xxLoader.deps.json'), { timeout: 10000 });
  assert.equal(pedidosDeps.length, 1, 'A5 los deps no se pidieron una vez al interactuar');
});

export default lista();
