// tests/home-invariants.test.mjs
//
// Invariantes estáticos sobre previews/home.html. Sin navegador, sin
// test runner externo: `node --test tests/`. Si rompe, alguien revirtió
// una de las reglas del LLM.md.
//
// Migrar a .ts + tsx si el proyecto agrega TypeScript.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homePath = join(__dirname, '..', 'previews', 'home.html');
const src = readFileSync(homePath, 'utf8');

/** Extrae el primer bloque CSS cuyo selector empieza con `selectorPrefix`. */
function extractBlock(prefix) {
  // Soporta selectores compuestos: ".foo, .bar { ... }" o ".foo:hover { ... }".
  // Toma la primera ocurrencia de "selector {" y cuenta llaves hasta cerrar.
  // `(?![\w-])` evita que un prefijo corto capture un selector mas largo: sin
  // el, buscar `.home` casaba con `.home-lab__title` y se extraia el bloque
  // equivocado, asi que el test fallaba por una regla nueva y no por el fallo
  // que vigila.
  const start = src.search(new RegExp(`\\${prefix}(?![\\w-])[^{]*\\{`));
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/** Extrae el contenido de un bloque @media contando llaves anidadas. */
function extractMediaBlock(mediaQuery) {
  const start = src.indexOf(`@media ${mediaQuery}`);
  if (start === -1) return null;
  const braceStart = src.indexOf('{', start);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ─── 3D per-card, no group rotation ────────────────────────────────

test('grid containers NO rotan el grupo entero', () => {
  const stage = extractBlock('.home-stage__grid');
  const lab = extractBlock('.home-lab__grid');
  assert.ok(stage, '.home-stage__grid debe existir');
  assert.ok(lab, '.home-lab__grid debe existir');
  assert.doesNotMatch(
    stage,
    /transform:\s*rotate/i,
    '.home-stage__grid no debe tener transform: rotate en su bloque base (gira todas las cards como bloque)',
  );
  assert.doesNotMatch(
    lab,
    /transform:\s*rotate/i,
    '.home-lab__grid no debe tener transform: rotate en su bloque base (gira todas las cards como bloque)',
  );
});

test('hover de tile y lab-card incluye tilt 3D (rotateY/X)', () => {
  const tileHover = extractBlock('.tile:hover');
  const labHover = extractBlock('.lab-card:hover');
  assert.ok(tileHover, '.tile:hover debe existir');
  assert.ok(labHover, '.lab-card:hover debe existir');
  assert.match(tileHover, /rotate[Y|X]/, '.tile:hover debe incluir rotate para tilt 3D');
  assert.match(labHover, /rotate[Y|X]/, '.lab-card:hover debe incluir rotate para tilt 3D');
});

test('hover de collage-card setea --tilt-y y --tilt-x', () => {
  const hover = extractBlock('.collage-card:hover');
  assert.ok(hover, '.collage-card:hover debe existir');
  assert.match(hover, /--tilt-y/, '.collage-card:hover debe setear --tilt-y');
  assert.match(hover, /--tilt-x/, '.collage-card:hover debe setear --tilt-x');
});

// ─── Theming light/dark ────────────────────────────────────────────

test('existen overrides de tema claro ([data-theme="light"])', () => {
  assert.match(
    src,
    /\[data-theme="light"\]/,
    'debe existir un bloque [data-theme="light"] con ajustes para light mode',
  );
});

test('override de light mode redefine --shadow-lift/pop con menos negro', () => {
  const light = extractBlock('[data-theme="light"] .home');
  assert.ok(light, 'debe existir override [data-theme="light"] .home con vars de shadow');
  // En light, el black del shadow debe bajar drásticamente respecto al base
  assert.match(light, /--shadow-lift:/, '--shadow-lift debe redefinirse');
  assert.match(light, /--shadow-pop:/, '--shadow-pop debe redefinirse');
  // El shadow de light no debe mantener el 26-34% del base
  assert.doesNotMatch(light, /rgb\(0 0 0 \/ (2[6-9]|3[0-9])%\)/,
    'shadows de light mode no deben tener rgb(0 0 0 / >=26%) — es demasiado negro sobre fondo claro');
});

// ─── Demo button (inyectado por JS) ────────────────────────────────

test('CSS de .card-demo existe', () => {
  const block = extractBlock('.card-demo');
  assert.ok(block, '.card-demo debe existir en el CSS');
  assert.match(block, /position:\s*absolute/, '.card-demo debe estar posicionado absolute');
  assert.match(block, /top:\s*0\.5rem/, '.card-demo debe estar en top-right');
});

test('script inyecta botón card-demo con is-icon mdi:open-in-new', () => {
  assert.match(
    src,
    /className\s*=\s*['"]card-demo['"]/,
    'script debe crear elemento con className "card-demo"',
  );
  assert.match(
    src,
    /setAttribute\(\s*['"]icon['"],\s*['"]mdi:open-in-new['"]\s*\)/,
    'script debe setear icon="mdi:open-in-new" en el is-icon',
  );
  assert.match(
    src,
    /parent\.postMessage\(\s*\{\s*type:\s*['"]is-select['"]/,
    'click handler debe postear is-select al parent (mismo shape que los CTA del hero)',
  );
});

test('whitelist de tags demoable cubre los componentes is-* usados en home', () => {
  const whitelist = src.match(/demoable\s*=\s*new Set\(\[([^\]]+)\]\)/);
  assert.ok(whitelist, 'debe existir una whitelist demoable');
  for (const tag of [
    'is-bar-chart',
    'is-line-chart',
    'is-doughnut-chart',
    'is-pie-chart',
    'is-radar-chart',
    'is-polar-area-chart',
    'is-scatter-chart',
    'is-bubble-chart',
    'is-sparkline',
    'is-flowchart',
    'is-timeline',
  ]) {
    assert.match(
      whitelist[1],
      new RegExp(`['"]${tag}['"]`),
      `whitelist debe incluir ${tag}`,
    );
  }
});

// ─── Reset responsive + reduced-motion ─────────────────────────────

test('reset responsive desactiva el 3D de los grids en móvil', () => {
  const mq = extractMediaBlock('(max-width: 960px)');
  assert.ok(mq, 'debe existir @media (max-width: 960px)');
  // El bloque debe mencionar al menos un grid/sección de cards
  // (los resets de transform/grid se hicieron en sesiones anteriores).
  assert.ok(
    /home-(stage|lab|showcase|collage)/.test(mq),
    'MQ móvil debe mencionar al menos un grid/sección de cards',
  );
});

test('reset prefers-reduced-motion desactiva transforms de cards', () => {
  const mq = extractMediaBlock('(prefers-reduced-motion: reduce)');
  assert.ok(mq, 'debe existir @media (prefers-reduced-motion: reduce)');
  assert.match(
    mq,
    /transform:\s*none\s*!important/,
    'reduced-motion debe poner transform: none !important en cards',
  );
});

// ─── Texto con degradado recortado y modo light ────────────────────
//
// `background-clip: text` + `-webkit-text-fill-color: transparent` deja el
// texto SIN color propio: lo pinta el degradado. Los hues (--hue-a..e) se
// derivan de --is-accent con la MISMA luminosidad en ambos temas, y varias
// paradas se mezclan hacia #fff. Sobre el fondo blanco del tema light eso es
// texto ilegible — el sintoma reportado: "en modo light esto no se lee".
//
// Regla: todo selector con relleno transparente necesita un override
// [data-theme="light"] que oscurezca sus paradas.

test('todo texto con background-clip:text tiene override en modo light', () => {
  // Selectores que declaran relleno transparente (el degradado los pinta).
  const conDegradado = [...src.matchAll(/^\s*([.#][\w-]+(?:\s+\w+)?)\s*\{[^}]*-webkit-text-fill-color:\s*transparent/gms)]
    .map((m) => m[1].trim())
    // Dentro de @supports ya son el override, no el caso base.
    .filter((sel, i, arr) => arr.indexOf(sel) === i);

  assert.ok(conDegradado.length > 0, 'se esperaba al menos un texto con degradado recortado');

  for (const sel of conDegradado) {
    const base = sel.split(/\s+/)[0];
    const tieneOverride = new RegExp(
      '\\[data-theme="light"\\][^{]*\\' + base + '(?![\\w-])',
    ).test(src);
    assert.ok(
      tieneOverride,
      `${sel} usa background-clip:text sin override [data-theme="light"]: ` +
        'en fondo blanco queda ilegible',
    );
  }
});

test('el override light del titular no depende solo de min() en color relativo', () => {
  // `min()` dentro de `oklch(from …)` es reciente. Si no se soporta, la
  // declaracion se descarta ENTERA y el texto vuelve a quedar invisible.
  // Por eso el color plano va fuera y la version buena dentro de @supports.
  assert.match(
    src,
    /@supports \(color: oklch\(from red min\(/,
    'el degradado light debe ir dentro de @supports que pruebe min() en color relativo',
  );
  const fallback = extractBlock('[data-theme="light"] .home-title__accent');
  assert.ok(fallback, 'debe existir el bloque de fallback del titular en light');
  assert.match(
    fallback,
    /-webkit-text-fill-color:\s*currentColor/,
    'el fallback debe devolver el relleno del texto a currentColor, no dejarlo transparente',
  );
});
