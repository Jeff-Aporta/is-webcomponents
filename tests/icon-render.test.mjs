// tests/icon-render.test.mjs
//
// Los dos motivos por los que un icono existente se ve MAL en la rejilla pero
// bien al abrirlo en el formulario (que inyecta el SVG crudo, sin <is-icon>).
//
// BUG 1 — "academicons no muestra iconos, solo los nombres".
//   icon-loader.js pedia los SVG con `cache: 'force-cache'`, que sirve la
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
// Uso:  node tests/icon-render.test.mjs

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const assetsIcons = join(root, 'src', 'assets', 'icons');

const iconJs = await readFile(join(root, 'src/components/media/icon.js'), 'utf8');
const iconCss = await readFile(join(root, 'src/components/media/icon.css'), 'utf8');
const loaderJs = await readFile(join(root, 'src/components/_shared/icon-loader.js'), 'utf8');

// --- BUG 1: nada de force-cache -------------------------------------------

// Se ignoran las menciones dentro de comentarios: lo que importa es que no
// quede ninguna llamada real a fetch con force-cache.
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

for (const [nombre, src] of [['icon-loader.js', loaderJs], ['icon.js', iconJs]]) {
  assert.ok(
    !/cache:\s*'force-cache'/.test(sinComentarios(src)),
    `${nombre} no debe pedir recursos con \`cache: 'force-cache'\`: congela bytes obsoletos ` +
      'en el navegador y un icono reparado sigue viendose roto para siempre',
  );
}
assert.ok(
  /LOCAL_SVG_PATH\(prefix, name\), \{ signal, cache: 'default' \}/.test(loaderJs),
  'el fetch del SVG debe usar `cache: \'default\'` (revalida contra el ETag del servidor)',
);
// El cache en memoria sigue siendo el que evita requests repetidos por sesion.
assert.ok(/rawCache\.set\(key, text\)/.test(loaderJs), 'rawCache debe seguir cacheando en memoria');

// --- BUG 2: los multicolor conservan su paleta -----------------------------

assert.ok(/#isMulticolor/.test(iconJs), 'icon.js debe detectar iconos con paleta propia');
assert.ok(
  /linearGradient|radialGradient/.test(iconJs),
  'la detección debe tratar degradados/patrones/imágenes como multicolor',
);
assert.ok(
  /#isMulticolor\(svg\)\)\s*\{[\s\S]{0,160}return;/.test(iconJs),
  'si el icono es multicolor, #normalizeInlineSvg debe salir ANTES de aplastar los fills',
);
assert.ok(
  /is-multicolor/.test(iconCss),
  'icon.css debe neutralizar el `fill: currentColor` heredado para .is-multicolor',
);
// El viewBox nativo no se toca: reescribirlo es el bug de los iconos vacios.
assert.ok(
  !/svg\.setAttribute\('viewBox'/.test(iconJs),
  'is-icon no debe reescribir el viewBox: cada colección tiene su grid nativo',
);

// --- Premisa de la heurística sobre los assets reales ----------------------
// Si esto falla, la heurística de color dejó de reflejar los datos.

const NEUTRAL = new Set(['currentcolor', '#000', '#000000', 'black', 'none']);
const colorsOf = (svg) =>
  [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)]
    .map((m) => m[1].trim().toLowerCase())
    .filter((v) => !NEUTRAL.has(v));

const sample = async (prefix, n = 6) => {
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
