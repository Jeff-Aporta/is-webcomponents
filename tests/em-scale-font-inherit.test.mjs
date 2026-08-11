/**
 * em-scale-font-inherit.test.mjs — la escala por font-size no puede mentir.
 *
 * ago/2026: is-fab documentaba escala en em (0.75 / 1 / 1.25) pero los tres
 * demos salían idénticos. Causa: el <button> interno no hereda font-size
 * (stylesheet UA) y `--size: 3.5em` se resolvía contra ~16px fijo.
 *
 * Contrato (LLM.md): sin atributo `size`; métricas en em; controles nativos
 * (button/input) deben declarar `font: inherit` / `font-size: inherit`.
 *
 *   npm test -- tests/em-scale-font-inherit.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const comps = join(raiz, 'src', 'components');

const read = (...p) => readFile(join(comps, ...p), 'utf8');

/** Controles nativos que el UA no escala con el font del host. */
const NATIVE_CONTROL = /\b(button|input|select|textarea)\b/i;

test('is-fab: host + .fab heredan font-size (escala em)', async () => {
  const css = await read('actions', 'fab.css');
  const js = await read('actions', 'fab.js');

  assert.match(
    css,
    /:host\s*\{[^}]*font-size:\s*inherit/s,
    ':host debe heredar font-size del contexto',
  );
  assert.match(
    css,
    /\.fab\s*\{[^}]*font:\s*inherit/s,
    '.fab <button> debe usar font: inherit (UA no hereda)',
  );
  assert.match(
    css,
    // Renombrada a `--is-fab-size`: `--size` era genérica y colisionaba por
    // herencia con la del drawer y la de preview-component.
    /--is-fab-size:\s*[\d.]+em/,
    '--is-fab-size debe estar en em, no en px/rem fijos',
  );
  assert.doesNotMatch(
    css,
    /--size:\s*[\d.]+(?:px|rem)\b/,
    'prohibido --size en px/rem: rompe la escala contextual',
  );
  assert.match(
    js,
    /this\.color/,
    'fab sincroniza color semántico con this.color (no this.variant)',
  );
  assert.doesNotMatch(
    js,
    /this\.variant/,
    'this.variant en fab es bug post-rename a color',
  );
});

test('is-fab preview: demo de escala con tres font-size distintos', async () => {
  const json = await readFile(
    join(raiz, 'src', 'previews', 'actions', 'is-fab.json'),
    'utf8',
  );
  assert.match(json, /font-size:0\.75em/, 'demo 0.75em');
  assert.match(json, /font-size:1em/, 'demo 1em');
  assert.match(json, /font-size:1\.25em/, 'demo 1.25em');
  assert.match(json, /"<code>color<\/code>"/, 'tabla API documenta color, no variant-como-tono');
});

test('controles nativos en CSS con métricas em llevan font inherit', async () => {
  /** Pares { css, controlClass } donde el control es button/input y dimensiona en em. */
  const criticos = [
    ['actions/fab.css', /\.fab\s*\{/],
    ['forms/pin-input.css', /\.cell\s*\{/],
    ['actions/button.css', /\.btn\s*\{/],
    ['actions/copy-button.css', /\.button\s*\{/],
    ['actions/check-icon-button.css', /\.btn\s*\{/],
  ];

  // El cierre del toast dejó de ser un <button> propio: ahora es <is-button>,
  // que ya hereda font-size desde su :host. Comprobar el CSS del consumidor
  // aquí buscaría una regla que no debe existir.
  const toastJs = await read('feedback', 'toast-item.js');
  assert.match(toastJs, /<is-button[^>]*class="close"/s,
    'feedback/toast-item.js: el cierre debe ser <is-button>, no un control nativo');

  // Igual el botón de quitar de is-tag.
  const tagJs = await read('feedback', 'tag.js');
  assert.match(tagJs, /<is-button[^>]*class="remove"/s,
    'feedback/tag.js: el botón de quitar debe ser <is-button>');

  for (const [rel, bloque] of criticos) {
    const css = await read(...rel.split('/'));
    // Con CSS anidado el selector aparece varias veces (`&[data-state] .cell`
    // antes que la regla base): vale con que ALGUNO de esos bloques herede.
    const bloques = [...css.matchAll(new RegExp(bloque.source + '[^}]*\\}', 'gs'))];
    assert.ok(bloques.length, `${rel}: no se encontró el bloque del control`);
    assert.ok(
      bloques.some((m) => /font(?:-size)?:\s*inherit/.test(m[0])),
      `${rel}: el control nativo debe heredar font para que em escale`,
    );
  }
});

test('JS no asigna item.variant / this.variant cuando la API es color (tonos)', async () => {
  const toast = await read('feedback', 'toast.js');
  assert.match(toast, /item\.color\s*=/, 'toast.create debe setear item.color');
  assert.doesNotMatch(
    toast,
    /item\.variant\s*=/,
    'toast no debe escribir item.variant (toast-item solo tiene color)',
  );

  const drop = await read('actions', 'dropdown-item.js');
  assert.match(drop, /this\.color\s*===\s*['"]danger['"]/, 'dropdown-item danger vía color');
  assert.doesNotMatch(
    drop,
    /this\.variant\s*===\s*['"]danger['"]/,
    'dropdown-item: this.variant === danger es bug post-rename',
  );
});

test('LLM actions documenta escala em + font inherit / error de FAB', async () => {
  const llm = await read('actions', 'LLM.md');
  assert.match(
    llm,
    /font-size contextual|font:\s*inherit|em/i,
    'actions/LLM.md debe recordar escala por font-size/em',
  );
});
