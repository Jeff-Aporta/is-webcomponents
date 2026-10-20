// tests/icon-render.test.ts
//
// Los dos motivos por los que un icono existente se ve MAL en la rejilla pero
// bien al abrirlo en el formulario (que inyecta el SVG crudo, sin <iswc-icon>).
//
// BUG 1 — "academicons no muestra iconos, solo los nombres".
//   icon-loader.ts pedia los SVG con `cache: 'force-cache'`, que sirve la
//   entrada cacheada SIN revalidar nunca. Tras reparar el viewBox de 166k SVG,
//   los navegadores que ya habian visitado el sitio seguian pintando los bytes
//   rotos de forma permanente. El servidor manda `cache-control: no-cache`
//   justamente para evitar eso, y force-cache lo pisaba.
//
// BUG 2 — "CoreUI Flags se ven como bloques oscuros en la rejilla".
//   #normalizeInlineSvg aplastaba TODO fill/stroke a `currentColor`. Para un
//   set monocromo es lo correcto; para banderas/logos/emoji convierte el icono
//   en una silueta solida. Ahora se detecta la paleta propia y se respeta.
//
// Uso:  node tests/icon-render.test.ts

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/icon-render', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  // Los iconos viven SOLO en dist/assets/icons (src/assets/ se elimino en el
  // refactor de layout CDN; ver el doc-block de _shared/icon-loader.ts).
  const assetsIcons = join(root, 'dist', 'assets', 'icons');
  
  const iconJs = await readFile(join(root, 'src/components/media/icon.ts'), 'utf8');
  const iconCss = await readFile(join(root, 'src/components/media/icon.scss'), 'utf8');
  const loaderJs = await readFile(join(root, 'src/core/icon-loader.ts'), 'utf8');
  
  // --- BUG 1: nada de force-cache -------------------------------------------
  
  // Se ignoran las menciones dentro de comentarios: lo que importa es que no
  // quede ninguna llamada real a fetch con force-cache.
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  
  for (const [nombre, src] of [['icon-loader.ts', loaderJs], ['icon.ts', iconJs]]) {
    assert.ok(
      !/cache:\s*'force-cache'/.test(sinComentarios(src)),
      `${nombre} no debe pedir recursos con \`cache: 'force-cache'\`: congela bytes obsoletos ` +
        'en el navegador y un icono reparado sigue viendose roto para siempre',
    );
  }
  // WHAT: lo que el loader pide de verdad. Se intercepta fetch y se observa
  // la URL y el `cache` de cada petición (protocolo de icon-loader.ts:
  // localStorage → <html data-icons> local → API de Iconify).
  {
    const loader = await import(new URL('../../src/core/icon-loader.ts', import.meta.url).href);
    const fetchOriginal = globalThis.fetch;
    const docOriginal = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const warnOriginal = console.warn;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>';
    const pedidos = [];
    let localResponde = true;
    const avisos = [];
    globalThis.fetch = async (url, init = {}) => {
      pedidos.push({ url: String(url), cache: init.cache });
      const esLocal = String(url).startsWith('https://iconos.example.test/');
      return esLocal && !localResponde ? new Response('no', { status: 404 }) : new Response(svg, { status: 200 });
    };
    console.warn = (...a) => { avisos.push(a.join(' ')); };
    const reset = () => { loader.clearRawCache(); loader.clearPersistedIcons(); pedidos.length = 0; };
    try {
      // 1) Sin <html data-icons> (y fuera del kit): API de Iconify, cache 'default'.
      reset();
      assert.equal(await loader.resolveIconRaw('render-test', 'a'), svg);
      assert.equal(pedidos.length, 1);
      assert.match(pedidos[0].url, /^https:\/\/api\.iconify\.design\/render-test\/a\.svg$/);
      assert.equal(
        pedidos[0].cache,
        'default',
        'el fetch del SVG debe usar `cache: \'default\'` (revalida contra el ETag del servidor)',
      );
      // El cache en memoria evita requests repetidos por sesión.
      await loader.resolveIconRaw('render-test', 'a');
      assert.equal(pedidos.length, 1, 'la caché en memoria debe evitar el segundo fetch');

      // 2) Con <html data-icons="https://…"> la base local manda (y se normaliza con `/`).
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { documentElement: { dataset: { icons: 'https://iconos.example.test/icons' } } },
      });
      assert.equal(loader.resolveIconBase(), 'https://iconos.example.test/icons/');
      reset();
      await loader.resolveIconRaw('render-test', 'b');
      assert.deepEqual(pedidos.map((p) => p.url), ['https://iconos.example.test/icons/render-test/b.svg']);
      assert.equal(pedidos[0].cache, 'default');

      // 3) Local sin el ícono → API, con UN aviso por ícono.
      localResponde = false;
      reset();
      await loader.resolveIconRaw('render-test', 'c');
      assert.deepEqual(pedidos.map((p) => p.url), [
        'https://iconos.example.test/icons/render-test/c.svg',
        'https://api.iconify.design/render-test/c.svg',
      ]);
      assert.equal(avisos.filter((a) => a.includes(`${loader.AVISO_FALTA_LOCAL} render-test:c`)).length, 1);

      // Una base relativa o no-http no se usa.
      assert.equal(loader.baseAbsoluta('/assets/iconify/'), null);
      assert.equal(loader.baseAbsoluta('file:///x/'), null);
    } finally {
      globalThis.fetch = fetchOriginal;
      console.warn = warnOriginal;
      if (docOriginal) Object.defineProperty(globalThis, 'document', docOriginal);
      else delete globalThis.document;
      loader.clearRawCache();
      loader.clearPersistedIcons();
    }
  }
  
  // --- BUG 2: los multicolor conservan su paleta -----------------------------
  
  assert.ok(/#isMulticolor/.test(iconJs), 'icon.ts debe detectar iconos con paleta propia');
  assert.ok(
    /linearGradient|radialGradient/.test(iconJs),
    'la detección debe tratar degradados/patrones/imágenes como multicolor',
  );
  assert.ok(
    /#isMulticolor\(svg\)\)\s*\{[\s\S]{0,160}return;/.test(iconJs),
    'si el icono es multicolor, #normalizeInlineSvg debe salir ANTES de aplastar los fills',
  );
  assert.ok(
    /iswc-multicolor/.test(iconCss),
    'icon.scss debe neutralizar el `fill: currentColor` heredado para .iswc-multicolor',
  );
  // El viewBox nativo no se toca: reescribirlo es el bug de los iconos vacios.
  assert.ok(
    !/svg\.setAttribute\('viewBox'/.test(iconJs),
    'iswc-icon no debe reescribir el viewBox: cada colección tiene su grid nativo',
  );
  
  // --- Premisa de la heurística sobre los assets reales ----------------------
  // Si esto falla, la heurística de color dejó de reflejar los datos.
  
  const NEUTRAL = new Set(['currentcolor', '#000', '#000000', 'black', 'none']);
  const colorsOf = (svg) =>
    [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)]
      .map((m) => m[1].trim().toLowerCase())
      .filter((v) => !NEUTRAL.has(v));
  
  // Sets fuera del repo desde 2026-10-09 (solo mdi/solar/tabler viajan; el resto llega por API): si no
  // están en disco no hay muestra que revisar.
  const enDisco = (prefix) => existsSync(join(assetsIcons, prefix));
  const sample = async (prefix, n = 6) => {
    if (!enDisco(prefix)) return [];
    const files = (await readdir(join(assetsIcons, prefix))).filter((f) => f.endsWith('.svg'));
    const stepSize = Math.max(1, Math.floor(files.length / n));
    const out = [];
    for (let i = 0; i < files.length && out.length < n; i += stepSize) {
      out.push({ file: files[i], svg: await readFile(join(assetsIcons, prefix, files[i]), 'utf8') });
    }
    return out;
  };
  
  const MULTICOLOR = ['cif', 'circle-flags', 'logos', 'twemoji'];
  const MONOTONE = ['mdi', 'tabler', 'academicons'];
  
  // La deteccion es POR ICONO, no por coleccion: `logos` es mixta (la mayoria
  // traen su paleta, pero p.ej. logos/game-analytics-icon es una silueta negra
  // sin ningun fill, y tenirla con currentColor es lo correcto). Por eso se exige
  // mayoria, no unanimidad.
  for (const prefix of MULTICOLOR) {
    const muestras = await sample(prefix);
    const conPaleta = muestras.filter(
      ({ svg }) => colorsOf(svg).length > 0 || /<(linearGradient|radialGradient|pattern|image)\b/.test(svg),
    );
    if (!muestras.length) continue;
    assert.ok(
      conPaleta.length > muestras.length / 2,
      `${prefix}: solo ${conPaleta.length}/${muestras.length} muestras declaran paleta propia; ` +
        'la heurística de color dejó de reflejar los assets',
    );
  }
  
  for (const prefix of MONOTONE) {
    for (const { file, svg } of await sample(prefix)) {
      assert.equal(
        colorsOf(svg).length,
        0,
        `${prefix}/${file} declara colores propios (${colorsOf(svg).join(', ')}): ` +
          'se detectaria como multicolor y dejaria de responder a `color`',
      );
    }
  }
  
  console.log('OK icon-render — sin force-cache, multicolor preservado, viewBox intacto');
});

export default lista();
