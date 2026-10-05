/**
 * Guardián S-PG1…S-PG3 — playground canonico + chrome sin clip.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const manText = readFileSync(join(root, 'src/manifest.ts'), 'utf8');
const pgTs = readFileSync(join(root, 'src/components/preview/playground.ts'), 'utf8');
const pgCss = readFileSync(join(root, 'src/components/preview/playground.css'), 'utf8');
const controlsTs = readFileSync(join(root, 'src/components/layout/preview-controls.ts'), 'utf8');
const galeria = readFileSync(join(root, 'specs/galeria/spec.md'), 'utf8');
const pgSpec = readFileSync(join(root, 'specs/playground/spec.md'), 'utf8');
const intent = readFileSync(join(root, 'src/components/_shared/intent.ts'), 'utf8');
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
    'src/components/preview/playground.css',
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
  assert.ok(pgSpec.includes('S-PG2'));
  assert.ok(galeria.includes('iswc-playground') || galeria.includes('playground'));
});

test('S-PG: intent default brand helper + CDN ui', () => {
  assert.ok(intent.includes('ensureDefaultColor'));
  assert.ok(intent.includes("DEFAULT_INTENT = 'brand'"));
  assert.ok(ui.includes('ensureDefaultColor'));
  assert.ok(ui.includes('INTENT'));
});

test('S-PG3: auditor cargar.ts conoce category preview (y files)', () => {
  const cargar = readFileSync(join(root, 'src/utils/health/engine/cargar.ts'), 'utf8');
  assert.match(cargar, /'preview'/);
  assert.match(cargar, /'files'/);
});

test('auditor: toda category del manifest tiene candidato en cargar.ts', () => {
  const cargar = readFileSync(join(root, 'src/utils/health/engine/cargar.ts'), 'utf8');
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
