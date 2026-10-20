import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCssCompilado, reglas, selectores } from './_css-compilado.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(here));

test('iswc-tag acepta color="info" (VALID_COLOR = INTENT, que incluye info)', async () => {
  // WHAT: el vocabulario común INTENT trae `info` y tag valida contra él (sin duplicarlo a mano).
  const { INTENT } = await import('../../src/core/intent.ts');
  assert.ok((INTENT as readonly string[]).includes('info'), 'INTENT incluye info');
  const src = readFileSync(join(root, 'src', 'components', 'feedback', 'tag.ts'), 'utf8');
  assert.ok(
    /VALID_COLOR\s*=\s*\[\s*\.\.\.INTENT/.test(src) || /VALID_COLOR\s*=\s*\[[^\]]*'info'/.test(src),
    'tag.ts valida color contra INTENT (o lista info explícitamente)',
  );
});

test('iswc-tag actualiza doc-block con la colore info', () => {
  const src = readFileSync(join(root, 'src', 'components', 'feedback', 'tag.ts'), 'utf8');
  assert.ok(
    // Puede haber familias intermedias (p.ej. `text`), pero info va tras neutral y antes de success.
    /brand\s*\|\s*neutral\s*\|(?:\s*[\w-]+\s*\|)*?\s*info\s*\|\s*success/.test(src),
    'El doc-block debe listar info entre neutral y success',
  );
});

test('iswc-tag.css define los tokens de color=info', () => {
  const css = leerCssCompilado(root, ['src', 'components', 'feedback', 'tag.css'].join('/'));
  const m = /:host\(\[\s*color\s*=\s*["']info["']\s*\]\)\s*\{([\s\S]*?)\}/m.exec(css);
  assert.ok(m, 'Debe existir el bloque :host([color="info"]) { ... }');
  const block = m[1];
  // Vocabulario del kit: modificadores relativos, no escala numérica. La capa
  // de tema define paler/pale/base/strong/stronger/strongest y NADA numerado
  // (lo vigila token-vocabulary.test.ts); pedir -100/-500/-700 aquí obligaba
  // a mantener dos idiomas de color a la vez.
  assert.ok(/--iswc-color-info-pale/.test(block), '--_bg debe usar --iswc-color-info-pale');
  assert.ok(/--iswc-color-info/.test(block), '--_border debe usar --iswc-color-info');
  assert.ok(/--iswc-color-info-stronger/.test(block), '--_text debe usar --iswc-color-info-stronger');
});

test('iswc-tag.css NO anida selectores con atributos del host dentro de :host', () => {
  const css = leerCssCompilado(root, ['src', 'components', 'feedback', 'tag.css'].join('/'));
  const idx = css.indexOf(':host {');
  assert.ok(idx > -1, ':host { ... } existe en tag.css');
  const start = css.indexOf('{', idx);
  let depth = 1;
  let j = start + 1;
  while (j < css.length && depth > 0) {
    const c = css[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
  }
  const block = css.slice(start, j);
  assert.ok(
    !/&\s*\[\s*(?:color|variant|pill)/.test(block),
    'Dentro de :host { ... } NO debe haber &[color=...], &[variant=...] ni &[pill]. Sacarlos a top-level como :host([...]).',
  );
  for (const v of ['brand', 'neutral', 'info', 'success', 'warning', 'danger']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*color\\s*=\\s*["']${v}["']\\s*\\]\\)`).test(css),
      `Debe existir :host([color="${v}"]) a top-level`,
    );
  }
  for (const a of ['filled', 'outlined', 'accent']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*variant\\s*=\\s*["']${a}["']\\s*\\]\\)`).test(css),
      `Debe existir :host([variant="${a}"]) a top-level`,
    );
  }
});

test('callout.css NO anida selectores con atributos del host dentro de :host', () => {
  const css = leerCssCompilado(root, ['src', 'components', 'layout', 'callout.css'].join('/'));
  const idx = css.indexOf(':host {');
  assert.ok(idx > -1, ':host { ... } existe en callout.css');
  const start = css.indexOf('{', idx);
  let depth = 1;
  let j = start + 1;
  while (j < css.length && depth > 0) {
    const c = css[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
  }
  const block = css.slice(start, j);
  assert.ok(
    !/&\s*\[\s*(?:color|variant|data-no-icon)/.test(block),
    'callout.css NO debe tener &[color=...], &[variant=...] ni &[data-no-icon] dentro de :host { ... }',
  );
  for (const v of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*color\\s*=\\s*["']${v}["']\\s*\\]\\)`).test(css),
      `callout.css debe tener :host([color="${v}"]) a top-level`,
    );
  }
  for (const a of ['filled', 'outlined', 'filled-outlined', 'plain', 'accent']) {
    assert.ok(
      // Directo `:host([variant="x"])` o agrupado `:host(:is([variant="x"], …))`.
      new RegExp(`:host\\((?::is\\([^{]*?)?\\[\\s*variant\\s*=\\s*["']${a}["']\\s*\\]`).test(css),
      `callout.css debe tener :host([variant="${a}"]) a top-level`,
    );
  }
});

// Las paletas solo declaran h/s/b; la rampa de info vive en la capa común
// `:root, [data-palette]` y la HEREDA cada [data-palette="…"]. Lo observable:
// el conjunto de reglas que aplican al nodo de la paleta (genéricas
// `[data-palette]` o específicas de esa paleta, sin tema) define los tokens.
const PALETAS = ['insoft', 'contapyme', 'agrowin'];
const palettesCss = () => leerCssCompilado(root, 'src/styles/palettes.css');
/** Cuerpos de las reglas que aplican a un nodo con sólo `data-palette="pal"`. */
const reglasDePaleta = (css, pal) => reglas(css)
  .filter((r) => r.at.length === 0)
  .filter((r) => selectores(r.selector).some((sel) =>
    sel === '[data-palette]' || sel === `[data-palette="${pal}"]`))
  .map((r) => r.cuerpo)
  .join('\n');

test('Las 3 paletas definen --iswc-color-info', () => {
  const css = palettesCss();
  for (const pal of PALETAS) {
    const cuerpo = reglasDePaleta(css, pal);
    assert.ok(cuerpo, `no hay reglas que apliquen a [data-palette="${pal}"]`);
    assert.ok(/--iswc-color-info\s*:/.test(cuerpo), `La paleta "${pal}" debe definir --iswc-color-info`);
  }
});

test('Las 3 paletas definen la rampa relativa completa de info', () => {
  const css = palettesCss();
  for (const pal of PALETAS) {
    const block = reglasDePaleta(css, pal);
    assert.ok(block, `Bloque [data-palette="${pal}"] existe`);
    // Rampa relativa: el mismo idioma que el resto de familias del tema.
    for (const step of ['paler', 'pale', 'strong', 'stronger', 'strongest']) {
      const ok = new RegExp(`--iswc-color-info-${step}\\s*:`).test(block);
      assert.ok(ok, `paleta ${pal} debe tener --iswc-color-info-${step}`);
    }
    // Ninguna paleta puede anular la rampa a medias (base sin variantes).
    const propia = reglas(css).filter((r) => r.at.length === 0
      && selectores(r.selector).includes(`[data-palette="${pal}"]`)).map((r) => r.cuerpo).join('\n');
    if (/--iswc-color-info\s*:/.test(propia)) {
      for (const step of ['paler', 'pale', 'strong', 'stronger', 'strongest']) {
        assert.ok(new RegExp(`--iswc-color-info-${step}\\s*:`).test(propia),
          `paleta ${pal} redefine --iswc-color-info pero no --iswc-color-info-${step}`);
      }
    }
  }
});

test('preview de iswc-tag muestra la colore info', () => {
  const def = JSON.parse(
    readFileSync(join(root, 'src', 'components', 'feedback', 'tag.json'), 'utf8'),
  );
  const html = JSON.stringify(def.sections);
  assert.ok(
    html.includes('color=\\"info\\"') || html.includes("color=\\\"info\\\""),
    'El preview debe incluir al menos un <iswc-tag color="info">',
  );
  for (const v of ['brand', 'neutral', 'info', 'success', 'warning', 'danger']) {
    const needle = `color=\\"${v}\\"`;
    assert.ok(html.includes(needle), `Preview debe demostrar la colore ${v}`);
  }
});

export default lista();
