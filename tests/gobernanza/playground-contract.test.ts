/**
 * Guardián S-PG1…S-PG3 — playground canonico + chrome sin clip.
 *
 * La ficha del playground ya no vive en specs/playground/spec.md: es la doc
 * del propio componente (src/components/preview/playground.md), enlazada desde
 * specs/README.md y specs/galeria/spec.md. S-PG2 se afirma sobre esas dos.
 */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');

const manText = readFileSync(join(root, 'src/manifest.ts'), 'utf8');
const pgTs = readFileSync(join(root, 'src/components/preview/playground.ts'), 'utf8');
const pgCss = readFileSync(join(root, 'src/components/preview/playground.scss'), 'utf8');
const controlsTs = readFileSync(join(root, 'src/components/layout/preview-controls.ts'), 'utf8');
const galeria = readFileSync(join(root, 'specs/galeria/spec.md'), 'utf8');
const pgDoc = readFileSync(join(root, 'src/components/preview/playground.md'), 'utf8');
const intent = readFileSync(join(root, 'src/core/intent.ts'), 'utf8');
const ui = readFileSync(join(root, 'src/components/helpers/ui.ts'), 'utf8');

test('S-PG1: iswc-playground en manifest con paths preview/', () => {
  assert.match(manText, /tag:\s*'iswc-playground'/);
  assert.match(manText, /script:\s*'components\/preview\/playground\.js'/);
  assert.match(manText, /page:\s*'components\/preview\/playground\.json'/);
  assert.match(manText, /category:\s*'preview'/);
});

test('S-PG1: fuentes playground existen', () => {
  for (const rel of [
    'src/components/preview/playground.ts',
    'src/components/preview/playground.scss',
    'src/components/preview/playground.json',
    'src/components/preview/playground.md',
  ]) {
    assert.ok(statSync(join(root, rel)).isFile(), rel);
  }
});

test('S-PG1: CE registra iswc-playground y reusa preview-controls', () => {
  assert.match(pgTs, /defineElement\(\s*'iswc-playground'/);
  assert.ok(pgTs.includes('preview-controls') || pgTs.includes('iswc-preview-controls'));
  assert.ok(!/<select[\s>]/i.test(pgTs), 'sin select nativo en CE');
  assert.ok(pgCss.includes('[layout="split"]') || pgCss.includes('layout="split"'));
});

test('S-PG1: preview-controls no clippea selects del panel', () => {
  assert.ok(
    !/\.fila iswc-select\s*\{[^}]*overflow:\s*hidden/s.test(controlsTs),
    'no overflow:hidden en host select del panel',
  );
});

test('S-PG2: specs documentan playground-first', () => {
  // La galería enlaza la doc del componente y fija que la sección playground va primera.
  assert.ok(galeria.includes('(../../src/components/preview/playground.md)'), 'galeria enlaza playground.md');
  assert.match(galeria, /playground[^\n]*\n?[^\n]*\*\*primera\*\*/i, 'galeria: playground va primera');
  // La doc del componente declara su tag y el evento de los knobs.
  assert.match(pgDoc, /^tag:\s*iswc-playground\s*$/m);
  assert.ok(pgDoc.includes('iswc-controls-change'));
});

test('S-PG: intent default brand helper + CDN ui', () => {
  assert.ok(intent.includes('ensureDefaultColor'));
  assert.ok(intent.includes("DEFAULT_INTENT = 'brand'"));
  assert.ok(ui.includes('ensureDefaultColor'));
  assert.ok(ui.includes('INTENT'));
});

test('S-PG3: auditor cargar.ts conoce category preview (y files)', () => {
  const cargar = readFileSync(join(root, 'tests/.audit/engine/cargar.ts'), 'utf8');
  assert.match(cargar, /'preview'/);
  assert.match(cargar, /'files'/);
});

test('auditor: toda category del manifest tiene candidato en cargar.ts', () => {
  const cargar = readFileSync(join(root, 'tests/.audit/engine/cargar.ts'), 'utf8');
  const cats = new Set(
    [...manText.matchAll(/category:\s*'([^']+)'/g)].map((m) => m[1]),
  );
  for (const cat of cats) {
    assert.ok(
      cargar.includes(`'${cat}'`),
      `cargar.ts debe listar category '${cat}' (si no, audit FATAL al tag)`,
    );
  }
});

export default lista();
