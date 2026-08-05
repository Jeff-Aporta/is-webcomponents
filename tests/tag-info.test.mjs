import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

test('is-tag declara color="info" en VALID_COLOR', () => {
  const src = readFileSync(join(root, 'src', 'components', 'feedback', 'tag.js'), 'utf8');
  assert.ok(
    /VALID_COLOR\s*=\s*\[[^\]]*'info'/.test(src),
    'tag.js debe listar "info" en VALID_COLOR',
  );
});

test('is-tag actualiza doc-block con la colore info', () => {
  const src = readFileSync(join(root, 'src', 'components', 'feedback', 'tag.js'), 'utf8');
  assert.ok(
    /brand\s*\|\s*neutral\s*\|\s*info\s*\|\s*success/.test(src),
    'El doc-block debe listar info entre neutral y success',
  );
});

test('is-tag.css define los tokens de color=info', () => {
  const css = readFileSync(join(root, 'src', 'components', 'feedback', 'tag.css'), 'utf8');
  const m = /:host\(\[\s*color\s*=\s*["']info["']\s*\]\)\s*\{([\s\S]*?)\}/m.exec(css);
  assert.ok(m, 'Debe existir el bloque :host([color="info"]) { ... }');
  const block = m[1];
  assert.ok(/--is-color-info-100/.test(block), '--_bg debe usar --is-color-info-100');
  assert.ok(/--is-color-info-500/.test(block), '--_border debe usar --is-color-info-500');
  assert.ok(/--is-color-info-700/.test(block), '--_text debe usar --is-color-info-700');
});

test('is-tag.css NO anida selectores con atributos del host dentro de :host', () => {
  const css = readFileSync(join(root, 'src', 'components', 'feedback', 'tag.css'), 'utf8');
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
  const css = readFileSync(join(root, 'src', 'components', 'layout', 'callout.css'), 'utf8');
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
      new RegExp(`:host\\(\\[\\s*variant\\s*=\\s*["']${a}["']\\s*\\]\\)`).test(css),
      `callout.css debe tener :host([variant="${a}"]) a top-level`,
    );
  }
});

test('Las 3 paletas definen --is-color-info-500', () => {
  const css = readFileSync(join(root, 'src', 'styles', 'palettes.css'), 'utf8');
  for (const pal of ['insoft', 'contapyme', 'agrowin']) {
    const re = new RegExp(`\\[data-palette=["']${pal}["']\\][\\s\\S]*?--is-color-info-500\\s*:`);
    assert.ok(re.test(css), `La paleta "${pal}" debe definir --is-color-info-500`);
  }
});

test('Las 3 paletas definen la escala completa info-50..800', () => {
  const css = readFileSync(join(root, 'src', 'styles', 'palettes.css'), 'utf8');
  for (const pal of ['insoft', 'contapyme', 'agrowin']) {
    const re = new RegExp(`\\[data-palette=["']${pal}["']\\]([\\s\\S]*?)\\}`, 'm');
    const blockMatch = re.exec(css);
    assert.ok(blockMatch, `Bloque [data-palette="${pal}"] existe`);
    const block = blockMatch[1];
    for (const step of [50, 100, 500, 600, 700, 800]) {
      const ok = new RegExp(`--is-color-info-${step}\\s*:`).test(block);
      assert.ok(ok, `paleta ${pal} debe tener --is-color-info-${step}`);
    }
  }
});

test('preview de is-tag muestra la colore info', () => {
  const def = JSON.parse(
    readFileSync(join(root, 'src', 'previews', 'feedback', 'is-tag.json'), 'utf8'),
  );
  const html = JSON.stringify(def.sections);
  assert.ok(
    html.includes('color=\\"info\\"') || html.includes("color=\\\"info\\\""),
    'El preview debe incluir al menos un <is-tag color="info">',
  );
  for (const v of ['brand', 'neutral', 'info', 'success', 'warning', 'danger']) {
    const needle = `color=\\"${v}\\"`;
    assert.ok(html.includes(needle), `Preview debe demostrar la colore ${v}`);
  }
});
