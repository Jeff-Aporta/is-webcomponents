import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

test('is-tag declara variant="info" en VALID_VARIANT', () => {
  const src = readFileSync(join(root, 'components', 'feedback', 'tag.js'), 'utf8');
  assert.ok(
    /VALID_VARIANT\s*=\s*\[[^\]]*'info'/.test(src),
    'tag.js debe listar "info" en VALID_VARIANT',
  );
});

test('is-tag actualiza doc-block con la variante info', () => {
  const src = readFileSync(join(root, 'components', 'feedback', 'tag.js'), 'utf8');
  assert.ok(
    /brand\s*\|\s*neutral\s*\|\s*info\s*\|\s*success/.test(src),
    'El doc-block debe listar info entre neutral y success',
  );
});

test('is-tag.css define los tokens de variant=info', () => {
  const css = readFileSync(join(root, 'components', 'feedback', 'tag.css'), 'utf8');
  // Buscar el bloque :host([variant="info"]) { ... }
  const m = /:host\(\[\s*variant\s*=\s*["']info["']\s*\]\)\s*\{([\s\S]*?)\}/m.exec(css);
  assert.ok(m, 'Debe existir el bloque :host([variant="info"]) { ... }');
  const block = m[1];
  // Comprobar que cada token usa --is-color-info-*
  assert.ok(/--is-color-info-100/.test(block), '--_bg debe usar --is-color-info-100');
  assert.ok(/--is-color-info-500/.test(block), '--_border debe usar --is-color-info-500');
  assert.ok(/--is-color-info-700/.test(block), '--_text debe usar --is-color-info-700');
});

test('is-tag.css NO anida selectores con atributos del host dentro de :host', () => {
  // CSS Nesting dentro de :host { ... } rompe la cascada: el navegador
  // aplana todas las reglas en una sola y deja de aplicar los selectores
  // &[variant="..."]. Hay que sacarlos a top-level como :host([variant="..."]).
  const css = readFileSync(join(root, 'components', 'feedback', 'tag.css'), 'utf8');
  // Tomamos el primer bloque :host { ... } y miramos si dentro hay un &
  // seguido de [variant= o [appearance= o [pill].
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
    !/&\s*\[\s*(?:variant|appearance|pill)/.test(block),
    'Dentro de :host { ... } NO debe haber &[variant=...], &[appearance=...] ni &[pill]. Sacarlos a top-level como :host([...]).',
  );
  // Y a top-level deben existir las 6 variantes
  for (const v of ['brand', 'neutral', 'info', 'success', 'warning', 'danger']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*variant\\s*=\\s*["']${v}["']\\s*\\]\\)`).test(css),
      `Debe existir :host([variant="${v}"]) a top-level`,
    );
  }
  // Y las appearances
  for (const a of ['filled', 'outlined', 'accent']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*appearance\\s*=\\s*["']${a}["']\\s*\\]\\)`).test(css),
      `Debe existir :host([appearance="${a}"]) a top-level`,
    );
  }
});

test('callout.css NO anida selectores con atributos del host dentro de :host', () => {
  // Mismo bug que tag.css tenía: callout.css también anidaba
  // &[variant=...] y &[appearance=...] dentro de :host { ... }.
  // Ya está migrado a top-level, este test protege contra regresiones.
  const css = readFileSync(join(root, 'components', 'layout', 'callout.css'), 'utf8');
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
    !/&\s*\[\s*(?:variant|appearance|data-no-icon)/.test(block),
    'callout.css NO debe tener &[variant=...], &[appearance=...] ni &[data-no-icon] dentro de :host { ... }',
  );
  // Verificar que las 5 variantes están a top-level
  for (const v of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*variant\\s*=\\s*["']${v}["']\\s*\\]\\)`).test(css),
      `callout.css debe tener :host([variant="${v}"]) a top-level`,
    );
  }
  // Y las 5 appearances a top-level
  for (const a of ['filled', 'outlined', 'filled-outlined', 'plain', 'accent']) {
    assert.ok(
      new RegExp(`:host\\(\\[\\s*appearance\\s*=\\s*["']${a}["']\\s*\\]\\)`).test(css),
      `callout.css debe tener :host([appearance="${a}"]) a top-level`,
    );
  }
});

test('Las 3 paletas definen --is-color-info-500', () => {
  const css = readFileSync(join(root, 'styles', 'palettes.css'), 'utf8');
  for (const pal of ['insoft', 'contapyme', 'agrowin']) {
    const re = new RegExp(`\\[data-palette=["']${pal}["']\\][\\s\\S]*?--is-color-info-500\\s*:`);
    assert.ok(re.test(css), `La paleta "${pal}" debe definir --is-color-info-500`);
  }
});

test('Las 3 paletas definen la escala completa info-50..800', () => {
  const css = readFileSync(join(root, 'styles', 'palettes.css'), 'utf8');
  for (const pal of ['insoft', 'contapyme', 'agrowin']) {
    const re = new RegExp(
      `\\[data-palette=["']${pal}["']\\]([\\s\\S]*?)\\}`,
      'm',
    );
    const blockMatch = re.exec(css);
    assert.ok(blockMatch, `Bloque [data-palette="${pal}"] existe`);
    const block = blockMatch[1];
    for (const step of [50, 100, 500, 600, 700, 800]) {
      const ok = new RegExp(`--is-color-info-${step}\\s*:`).test(block);
      assert.ok(ok, `paleta ${pal} debe tener --is-color-info-${step}`);
    }
  }
});

test('preview de is-tag muestra la variante info', () => {
  const html = readFileSync(join(root, 'previews', 'feedback', 'is-tag.html'), 'utf8');
  assert.ok(
    /<is-tag\s+variant=["']info["']/.test(html),
    'El preview debe incluir al menos un <is-tag variant="info">',
  );
  // Y debe demostrar TODAS las variantes para consistencia visual.
  for (const v of ['brand', 'neutral', 'info', 'success', 'warning', 'danger']) {
    assert.ok(
      new RegExp(`<is-tag[^>]*variant=["']${v}["']`).test(html),
      `Preview debe demostrar la variante ${v}`,
    );
  }
});