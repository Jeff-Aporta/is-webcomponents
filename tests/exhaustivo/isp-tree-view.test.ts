// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * tree-view.test.ts — Tier A (15 aserciones) para `<iswc-tree-view>`.
 *
 * Componente complejo: árbol editable con drag, drawer, history, custom
 * adapters. Las piezas de personalización se importan de su módulo de origen
 * (sin re-exports, specs/typescript S-TS9).
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TAG = 'iswc-tree-view';
const TS  = join(ROOT, 'src', 'components', 'isp', 'tree-view.ts');
const CSS = join(ROOT, '.tmp-scss', 'src', 'components', 'isp', 'tree-view.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'isp', 'tree-view.json');

test('iswc-tree-view:  1. módulo existe', async () => {
  assert.ok(existsSync(TS));
});

test('iswc-tree-view:  2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('iswc-tree-view:  3. JSON existe y respeta iswc-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'iswc-preview/v1');
});

test('iswc-tree-view:  las piezas de personalización se importan de su módulo de origen y tienen bundle (S-TS9)', async () => {
  // Lo que promete tree-view.md: cada símbolo sale de su propio módulo publicado, no de tree-view.
  const piezas: Array<[string, string[]]> = [
    // F9a: utils/tree-view/ aplanado a utils/tree-view-*.ts (tree-data vive en tree-view-flow).
    ['customs-base', ['TreeCustomsBase']],
    ['tree-view-adapter', ['TreeRowViewAdapter']],
    ['tree-view-row-adapter', ['TreeRowAdapter']],
    ['tree-view-flow', ['objRootsToNodes', 'groupedWithSeparators']],
  ];
  for (const [mod, nombres] of piezas) {
    const m = await import('../../src/components/isp/utils/' + mod + '.ts');
    for (const n of nombres) assert.equal(typeof m[n], 'function', mod + ' exporta ' + n);
    assert.ok(existsSync(join(ROOT, 'dist', 'cdn', 'isp', mod + '.min.mjs')), 'falta el bundle dist/cdn/isp/' + mod + '.min.mjs');
  }
  const doc = readFileSync(join(ROOT, 'src', 'components', 'isp', 'tree-view.md'), 'utf8');
  assert.ok(doc.includes('./isp/customs-base.min.mjs'), 'la doc enseña a importar TreeCustomsBase de su módulo');
  assert.ok(!/export\s*\{[^}]*TreeCustomsBase/.test(readFileSync(TS, 'utf8')), 'tree-view no re-exporta (S-TS9)');
});

// tree-view.ts no usa TreeCustomsBase (lo extiende la app): el import que tenía era código muerto (F9a).
test('iswc-tree-view:  customs base compartido: la doc enseña a extenderlo desde su módulo', async () => {
  const doc = readFileSync(join(ROOT, 'src', 'components', 'isp', 'tree-view.md'), 'utf8');
  assert.match(doc, /import \{ TreeCustomsBase \} from '\.\/isp\/customs-base\.min\.mjs';/);
  assert.match(doc, /extends TreeCustomsBase/);
});

test('iswc-tree-view:  importa paintForest para pintar el árbol', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+utils\/tree-view-render/.test(src));
  assert.ok(/paintForest/.test(src));
});

test('iswc-tree-view:  custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"]iswc-tree-view['"]/.test(src));
});

test('iswc-tree-view:  integra con confirm-delete', async () => {
  const src = readFileSync(TS, 'utf8');
  // Acepta tanto `import './confirm-delete.js'` como `from './confirm-delete'`.
  assert.ok(/confirm-delete/.test(src), 'integra con confirm-delete');
});

test('iswc-tree-view:  integra con flex-options (panel de opciones)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/flex-options/.test(src));
});

test('iswc-tree-view:  integra con float-card (ficha del item)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/float-card/.test(src));
});

test('iswc-tree-view:  el módulo de customs base existe en utils/ (entrada pública isp/customs-base)', async () => {
  const customs = join(ROOT, 'src', 'components', 'isp', 'utils', 'customs-base.ts');
  assert.ok(existsSync(customs));
});

test('iswc-tree-view:  emite eventos de cambio / selección', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]iswc-change['"]/.test(src) || /['"]iswc-select['"]/.test(src) || /['"]iswc-edit['"]/.test(src));
});

test('iswc-tree-view:  CSS tiene reglas para indentación y chevron del árbol', async () => {
  const css = readFileSync(CSS, 'utf8');
  // Aceptar padding-left, padding-inline-start, margin-left, --indent, etc.
  assert.ok(
    /padding-left|--indent|padding-inline-start|margin-left/i.test(css),
    'debe tener indentación por nivel',
  );
});

test('iswc-tree-view:  JSON tiene secciones de demo (no es solo tabla de referencia)', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const demos = (json.sections || []).filter((s: any) =>
    (s.blocks || []).some((b: any) => b.kind === 'demo')
  );
  assert.ok(demos.length > 0, `debe haber al menos 1 sección con demo, hay ${demos.length}`);
});

test('iswc-tree-view:  preview.ts existe (componente complejo → behavior obligatorio)', async () => {
  const preview = join(ROOT, 'src', 'components', 'isp', 'utils', 'tree-view.preview.ts');
  assert.ok(existsSync(preview));
});

export default lista();
