/**
 * preview-controls-tabs.test.ts — Guardián: panel SOLO knobs (sin tabs Code).
 *
 * El tab Code / anatomía Shadow DOM se descartó. Si alguien lo reintroduce
 * (nav tablist, data-tab="code", data-role="anatomy", getter anatomy), falla.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const CTRL_TS = join(root, 'src/components/layout/preview-controls.ts');
const PG_TS = join(root, 'src/components/preview/playground.ts');
const CTLS_TS = join(root, 'src/utils/system/controles.ts');

const ctrlTs = readFileSync(CTRL_TS, 'utf8');
const pgTs = readFileSync(PG_TS, 'utf8');
const ctlsTs = readFileSync(CTLS_TS, 'utf8');

test('panel: fuente preview-controls.ts existe', () => {
  assert.ok(existsSync(CTRL_TS), 'falta src/components/layout/preview-controls.ts');
});

test('panel: sin tabs Attrs/Code ni anatomía', () => {
  assert.doesNotMatch(ctrlTs, /data-tab="code"/, 'no reintroducir tab Code');
  assert.doesNotMatch(ctrlTs, /data-tab="attrs"/, 'no reintroducir nav de tabs');
  assert.doesNotMatch(ctrlTs, /role="tablist"/, 'no reintroducir tablist');
  assert.doesNotMatch(ctrlTs, /data-role="anatomy"/, 'no reintroducir pre anatomy');
  assert.doesNotMatch(ctrlTs, /get\s+anatomy\s*\(/, 'no reintroducir getter anatomy');
  assert.doesNotMatch(ctrlTs, /#refreshAnatomy|#detectAnatomy|#wireTabs|#showTab/, 'sin helpers de tabs/anatomy');
});

test('panel: título por defecto Atributos', () => {
  assert.match(
    ctrlTs,
    /['"]Atributos['"]/,
    'preview-controls.ts debe usar "Atributos" como label por defecto',
  );
});

test('playground: label Atributos, sin tag→Code', () => {
  assert.match(pgTs, /label=["']Atributos["']|setAttribute\(\s*['"]label['"]\s*,\s*['"]Atributos['"]/,
    'playground.ts debe etiquetar el panel como Atributos');
  assert.doesNotMatch(
    pgTs,
    /#panel\.setAttribute\(\s*['"]tag['"]/,
    'playground.ts no debe pasar tag al panel (era para Code)',
  );
});

test('controles.ts: label Atributos, sin tag→Code', () => {
  assert.match(
    ctlsTs,
    /setAttribute\(\s*['"]label['"]\s*,\s*['"]Atributos['"]/,
    'controles.ts debe etiquetar el panel como Atributos',
  );
  assert.doesNotMatch(
    ctlsTs,
    /panel\.setAttribute\(\s*['"]tag['"]/,
    'controles.ts no debe pasar tag al panel (era para Code)',
  );
});
