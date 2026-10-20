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
import { coleccionPruebas } from '../../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const TAG = 'iswc-tree-view';
const TS  = join(ROOT, 'src', 'components', 'isp', 'tree-view.ts');
const CSS = join(ROOT, '.tmp-scss', 'src', 'components', 'isp', 'tree-view.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'isp', 'tree-view.json');

test('tree-view: 1. módulo existe', async () => {
  assert.ok(existsSync(TS));
});

test('tree-view: 2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('tree-view: 3. JSON existe y respeta iswc-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'iswc-preview/v1');
});

test('4. las piezas de personalización se importan de su módulo de origen y tienen bundle (S-TS9)', async () => {
  // Lo que promete tree-view.md: cada símbolo sale de su propio módulo publicado, no de tree-view.
  const piezas: Array<[string, string[]]> = [
    ['customs-base', ['TreeCustomsBase']],
    ['adapter', ['TreeRowViewAdapter']],
    ['row-adapter', ['TreeRowAdapter']],
    ['tree-data', ['objRootsToNodes', 'groupedWithSeparators']],
  ];
  for (const [mod, nombres] of piezas) {
    const m = await import('../../../src/components/isp/utils/tree-view/' + mod + '.ts');
    for (const n of nombres) assert.equal(typeof m[n], 'function', mod + ' exporta ' + n);
    assert.ok(existsSync(join(ROOT, 'dist', 'cdn', 'isp', mod + '.min.js')), 'falta el bundle dist/cdn/isp/' + mod + '.min.js');
  }
  const doc = readFileSync(join(ROOT, 'src', 'components', 'isp', 'tree-view.md'), 'utf8');
  assert.ok(doc.includes('./isp/customs-base.min.js'), 'la doc enseña a importar TreeCustomsBase de su módulo');
  assert.ok(!/export\s*\{[^}]*TreeCustomsBase/.test(readFileSync(TS, 'utf8')), 'tree-view no re-exporta (S-TS9)');
});

test('5. importa customs base compartido (utils/tree-view/customs-base)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+utils\/tree-view\/customs-base/.test(src));
});

test('6. importa paintForest para pintar el árbol', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+utils\/tree-view\/render-rows/.test(src));
  assert.ok(/paintForest/.test(src));
});

test('7. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]iswc-tree-view['"]/.test(src));
});

test('8. integra con confirm-delete', async () => {
  const src = readFileSync(TS, 'utf8');
  // Acepta tanto `import './confirm-delete.js'` como `from './confirm-delete'`.
  assert.ok(/confirm-delete/.test(src), 'integra con confirm-delete');
});

test('9. integra con flex-options (panel de opciones)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/flex-options/.test(src));
});

test('10. integra con float-card (ficha del item)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/float-card/.test(src));
});

test('11. el módulo de customs base existe en utils/tree-view/', async () => {
  const customs = join(ROOT, 'src', 'components', 'isp', 'utils', 'tree-view', 'customs-base.ts');
  assert.ok(existsSync(customs));
});

test('12. emite eventos de cambio / selección', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]iswc-change['"]/.test(src) || /['"]iswc-select['"]/.test(src) || /['"]iswc-edit['"]/.test(src));
});

test('13. CSS tiene reglas para indentación y chevron del árbol', async () => {
  const css = readFileSync(CSS, 'utf8');
  // Aceptar padding-left, padding-inline-start, margin-left, --indent, etc.
  assert.ok(
    /padding-left|--indent|padding-inline-start|margin-left/i.test(css),
    'debe tener indentación por nivel',
  );
});

test('14. JSON tiene secciones de demo (no es solo tabla de referencia)', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const demos = (json.sections || []).filter((s: any) =>
    (s.blocks || []).some((b: any) => b.kind === 'demo')
  );
  assert.ok(demos.length > 0, `debe haber al menos 1 sección con demo, hay ${demos.length}`);
});

test('15. preview.ts existe (componente complejo → behavior obligatorio)', async () => {
  const preview = join(ROOT, 'src', 'components', 'isp', 'utils', 'tree-view.preview.ts');
  assert.ok(existsSync(preview));
});

export default lista();
