/**
 * types-strong-wt0052.test.ts — verificación estructural de los 5 archivos
 * tipados por WT-0052 (Tanda 5).
 *
 * Scope: row-adapter-base, row-adapter-drag (tree-view), md-editor, popover,
 * format (helpers). Estos archivos pasaron de 337 errores strict audit a 0
 * tras la migración a tipos explícitos.
 *
 * Estrategia: análisis estático (regex sobre el código fuente). No levanta
 * DOM porque las dependencias (ElementBase, iswc-floating, iswc-dialog) requieren
 * jsdom y eso queda fuera del smoke test.
 *
 * Cómo correr:
 *   deno test -A --no-check \
 *     tests/exhaustivo/types-strong-wt0052.test.ts
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const ROW_ADAPTER_BASE = join(ROOT, 'src', 'components', 'isp', 'utils', 'tree-view', 'row-adapter-base.ts');
const ROW_ADAPTER_DRAG = join(ROOT, 'src', 'components', 'isp', 'utils', 'tree-view', 'row-adapter-drag.ts');
const MD_EDITOR         = join(ROOT, 'src', 'components', 'helpers', 'md-editor.ts');
const POPOVER           = join(ROOT, 'src', 'components', 'helpers', 'popover.ts');
const FORMAT            = join(ROOT, 'src', 'components', 'helpers', 'format.ts');

// Tras WT-0052 los tipos de contrato se migraron a módulos `schemas/*.schemas.ts`
// (Zod + `z.infer`). El archivo los importa con `import type`; aquí se verifica
// que (1) el import existe y (2) el módulo de schemas los declara de verdad
// (ignorando comentarios: los `TODO: parse fail ...` NO cuentan como campo).

const sinComentarios = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Fuente (sin comentarios) de los `*.schemas.ts` que importa `ruta`. */
function schemasDe(ruta: string): string {
  const src = readFileSync(ruta, 'utf8');
  let out = '';
  for (const m of src.matchAll(/from\s*['"](\.[^'"]+\.schemas)\.js['"]/g)) {
    const f = join(dirname(ruta), `${m[1]}.ts`);
    assert.ok(existsSync(f), `${f} debe existir (importado por ${ruta})`);
    out += '\n' + readFileSync(f, 'utf8');
  }
  return sinComentarios(out);
}

/** `nombre` se importa en `ruta` desde un `*.schemas.js` y ese módulo lo exporta. */
function tipoDeSchemas(ruta: string, nombre: string): void {
  const src = readFileSync(ruta, 'utf8');
  assert.match(
    src,
    new RegExp(`import\\s+(?:type\\s+)?\\{[^}]*\\b${nombre}\\b[^}]*\\}\\s*from\\s*['"][^'"]+\\.schemas\\.js['"]`),
    `importa ${nombre} desde su módulo *.schemas`,
  );
  assert.match(schemasDe(ruta), new RegExp(`export\\s+(?:type|interface)\\s+${nombre}\\b`), `declara ${nombre} en *.schemas.ts`);
}

/** Cuerpo `z.object({...})` (sin comentarios) del schema `nombre` en los schemas de `ruta`. */
function cuerpoSchema(ruta: string, nombre: string): string {
  const s = schemasDe(ruta);
  const i = s.search(new RegExp(`export\\s+const\\s+${nombre}Schema\\s*=`));
  assert.ok(i >= 0, `${nombre}Schema debe existir`);
  const fin = s.indexOf(`export type ${nombre}`, i);
  return s.slice(i, fin > i ? fin : undefined);
}

// ── row-adapter-base.ts ───────────────────────────────────────────────────

test('WT-0052 / row-adapter-base: archivo existe y declara TRABase', () => {
  assert.ok(existsSync(ROW_ADAPTER_BASE), `${ROW_ADAPTER_BASE} debe existir`);
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  assert.match(src, /class\s+TRABase\b/, 'debe declarar la clase TRABase');
  assert.match(src, /export\s+class\s+TRABase\b/, 'TRABase debe estar exportada');
});

test('WT-0052 / row-adapter-base: usa tipos compartidos de tree-view-types.schemas', () => {
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  for (const t of ['RowConfig', 'TNode', 'TreeActionEntry']) {
    tipoDeSchemas(ROW_ADAPTER_BASE, t);
    // Además de importarlo, lo usa en firmas (más de una aparición).
    assert.ok(src.split(new RegExp(`\\b${t}\\b`)).length > 2, `usa ${t} en el código`);
  }
});

test('WT-0052 / row-adapter-base: declara el contrato TreeAdapterLike', () => {
  tipoDeSchemas(ROW_ADAPTER_BASE, 'TreeAdapterLike');
  const cuerpo = cuerpoSchema(ROW_ADAPTER_BASE, 'TreeAdapterLike');
  assert.match(cuerpo, /\bdisabled:\s*z\.boolean\(\)/, 'TreeAdapterLike expone disabled: boolean');
  assert.match(cuerpo, /\bisProtected:\s*z\.boolean\(\)/, 'TreeAdapterLike expone isProtected: boolean');
  assert.match(cuerpo, /\bcanMutate:\s*z\.boolean\(\)/, 'TreeAdapterLike expone canMutate: boolean');
});

test('WT-0052 / row-adapter-base: treeAdapter es TreeAdapterLike', () => {
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  assert.match(src, /\btreeAdapter:\s*TreeAdapterLike\b/, 'treeAdapter: TreeAdapterLike');
});

test('WT-0052 / row-adapter-base: narrowing instanceof HTMLDetailsElement', () => {
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  assert.match(src, /instanceof\s+HTMLDetailsElement/, 'getVisibleSummaries usa instanceof HTMLDetailsElement');
});

test('WT-0052 / row-adapter-base: NO usa `any` en firmas', () => {
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  // Cuenta firmas con `: any` o `as any` o `any[]`. Aceptamos hasta 2 ocurrencias
  // (la convención permite `any` con justificación explícita).
  const matches = src.match(/:\s*any\b|\bas\s+any\b|<any>/g) ?? [];
  assert.ok(matches.length <= 2, `esperado ≤2 usos de any, encontró ${matches.length}`);
});

// ── row-adapter-drag.ts ───────────────────────────────────────────────────

test('WT-0052 / row-adapter-drag: archivo existe y declara TRADrag', () => {
  assert.ok(existsSync(ROW_ADAPTER_DRAG), `${ROW_ADAPTER_DRAG} debe existir`);
  const src = readFileSync(ROW_ADAPTER_DRAG, 'utf8');
  assert.match(src, /class\s+TRADrag\b/, 'debe declarar la clase TRADrag');
  assert.match(src, /extends\s+TRABase\b/, 'TRADrag debe extender TRABase');
  assert.match(src, /export\s+class\s+TRADrag\b/, 'TRADrag debe estar exportada');
});

test('WT-0052 / row-adapter-drag: handlers tipados como DragEvent', () => {
  const src = readFileSync(ROW_ADAPTER_DRAG, 'utf8');
  assert.match(src, /\bon(dragstart|dragend|summarydragenter|summarydragover|summarydragleave|drop)\s*\(\s*e:\s*DragEvent\b/, 'handlers firmados DragEvent');
});

test('WT-0052 / row-adapter-drag: usa instanceof Element / HTMLElement', () => {
  const src = readFileSync(ROW_ADAPTER_DRAG, 'utf8');
  assert.match(src, /instanceof\s+Element/, 'usa instanceof Element');
  assert.match(src, /instanceof\s+HTMLElement/, 'usa instanceof HTMLElement');
  assert.match(src, /instanceof\s+Node/, 'usa instanceof Node');
});

test('WT-0052 / row-adapter-drag: tipo DragOverPosition', () => {
  tipoDeSchemas(ROW_ADAPTER_DRAG, 'DragOverPosition');
  assert.match(
    cuerpoSchema(ROW_ADAPTER_DRAG, 'DragOverPosition'),
    /z\.union\(\[\s*z\.literal\(['"]before['"]\)\s*,\s*z\.literal\(['"]after['"]\)\s*,\s*z\.literal\(['"]into['"]\)\s*\]\)/,
    'DragOverPosition union before | after | into',
  );
});

test('WT-0052 / row-adapter-drag: NO usa `any` en firmas', () => {
  const src = readFileSync(ROW_ADAPTER_DRAG, 'utf8');
  const matches = src.match(/:\s*any\b|\bas\s+any\b|<any>/g) ?? [];
  assert.ok(matches.length <= 2, `esperado ≤2 usos de any, encontró ${matches.length}`);
});

// ── md-editor.ts ──────────────────────────────────────────────────────────

test('WT-0052 / md-editor: archivo existe y registra iswc-md-editor', () => {
  assert.ok(existsSync(MD_EDITOR), `${MD_EDITOR} debe existir`);
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /class\s+IswcMdEditor\b/, 'declara IswcMdEditor');
  assert.match(src, /defineElement\s*\(\s*['"]iswc-md-editor['"]/, 'registra iswc-md-editor');
  assert.match(src, /extends\s+ElementBase\b/, 'extiende ElementBase');
});

test('WT-0052 / md-editor: tipos del contrato declarados (md-editor.schemas)', () => {
  for (const t of ['IswcMdEditorDocument', 'IswcMdEditorApiConfig', 'IswcMdEditorActions']) {
    tipoDeSchemas(MD_EDITOR, t);
  }
});

test('WT-0052 / md-editor: subset tipado de wrappers (Dialog, Switch, Copy, Textarea)', () => {
  for (const t of ['DialogElement', 'SwitchElement', 'CopyButtonElement', 'TextareaElement']) {
    tipoDeSchemas(MD_EDITOR, t);
  }
  assert.match(cuerpoSchema(MD_EDITOR, 'DialogElement'), /\bopen:\s*z\.boolean\(\)/, 'DialogElement.open: boolean');
  assert.match(cuerpoSchema(MD_EDITOR, 'SwitchElement'), /\bchecked:\s*z\.boolean\(\)/, 'SwitchElement.checked: boolean');
});

test('WT-0052 / md-editor: detalles de eventos custom (LoadDetail, ErrorDetail, PersistDetail)', () => {
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /interface\s+LoadDetail\b/, 'declara LoadDetail');
  assert.match(src, /interface\s+ErrorDetail\b/, 'declara ErrorDetail');
  assert.match(src, /interface\s+PersistDetail\b/, 'declara PersistDetail');
});

test('WT-0052 / md-editor: handlers firmados (MouseEvent, KeyboardEvent)', () => {
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /\bonPreviewActivate\s*\(\s*e:\s*MouseEvent\b/, 'onPreviewActivate firma MouseEvent');
  assert.match(src, /\bonEditorKeyDown\s*\(\s*e:\s*KeyboardEvent\b/, 'onEditorKeyDown firma KeyboardEvent');
});

test('WT-0052 / md-editor: usa narrowing instanceof Element', () => {
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /instanceof\s+Element/, 'usa instanceof Element');
  assert.match(src, /instanceof\s+HTMLElement/, 'usa instanceof HTMLElement');
});

test('WT-0052 / md-editor: NO usa `any` en firmas', () => {
  const src = readFileSync(MD_EDITOR, 'utf8');
  const matches = src.match(/:\s*any\b|\bas\s+any\b|<any>/g) ?? [];
  assert.ok(matches.length <= 3, `esperado ≤3 usos de any, encontró ${matches.length}`);
});

// ── popover.ts ────────────────────────────────────────────────────────────

test('WT-0052 / popover: archivo existe y registra iswc-popover', () => {
  assert.ok(existsSync(POPOVER), `${POPOVER} debe existir`);
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /class\s+IswcPopover\b/, 'declara IswcPopover');
  assert.match(src, /defineElement\s*\(\s*['"]iswc-popover['"]/, 'registra iswc-popover');
});

test('WT-0052 / popover: define el tipo FloatingElement', () => {
  tipoDeSchemas(POPOVER, 'FloatingElement');
  const cuerpo = cuerpoSchema(POPOVER, 'FloatingElement');
  assert.match(cuerpo, /z\.intersection\(\s*z\.custom<HTMLElement>\(\)/, 'FloatingElement es HTMLElement & {...}');
  assert.match(cuerpo, /\bplacement:\s*z\.string\(\)/, 'placement: string');
  assert.match(cuerpo, /\bactive:\s*z\.boolean\(\)/, 'active: boolean');
  assert.match(cuerpo, /\breposition:\s*z\.function\(\{\s*input:\s*\[\]\s*,\s*output:\s*z\.void\(\)/, 'reposition(): void');
});

test('WT-0052 / popover: openPopover tipado como IswcPopover | null', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /let\s+openPopover\s*:\s*IswcPopover\s*\|\s*null\b/, 'openPopover: IswcPopover | null');
});

test('WT-0052 / popover: #anchor tipado como HTMLElement | null', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /#anchor:\s*HTMLElement\s*\|\s*null\s*=\s*null/, '#anchor: HTMLElement | null');
});

test('WT-0052 / popover: declare internals', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /declare\s+internals\s*:\s*ElementInternals\s*\|\s*undefined/, 'declare internals');
});

test('WT-0052 / popover: parameter silent tipado como boolean | undefined', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /#doShow\s*\(\s*silent\?:\s*boolean\s*\)\s*:/, '#doShow(silent?: boolean)');
  assert.match(src, /#doHide\s*\(\s*silent\?:\s*boolean\s*\)\s*:/, '#doHide(silent?: boolean)');
});

test('WT-0052 / popover: narrowing instanceof Document | ShadowRoot en getRootNode', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /instanceof\s+Document\s*\|\|\s*\w+\s+instanceof\s+ShadowRoot/, 'narrowing del root');
});

test('WT-0052 / popover: NO usa `any` en firmas', () => {
  const src = readFileSync(POPOVER, 'utf8');
  const matches = src.match(/:\s*any\b|\bas\s+any\b|<any>/g) ?? [];
  assert.ok(matches.length <= 2, `esperado ≤2 usos de any, encontró ${matches.length}`);
});

// ── format.ts ─────────────────────────────────────────────────────────────

test('WT-0052 / format: archivo existe y registra iswc-format', () => {
  assert.ok(existsSync(FORMAT), `${FORMAT} debe existir`);
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /class\s+FormatElement\b/, 'declara FormatElement');
  assert.match(src, /extends\s+ElementBase\b/, 'extiende ElementBase');
  assert.match(src, /defineElement\s*\(\s*['"]iswc-format['"]/, 'registra iswc-format');
});

test('WT-0052 / format: discriminated union ExcelPreset', () => {
  const variantes = ['NumberPreset', 'CurrencyPreset', 'AccountingPreset', 'FractionPreset', 'TextPreset', 'DatePreset'];
  for (const t of ['ExcelPreset', ...variantes]) tipoDeSchemas(FORMAT, t);
  // ExcelPreset es la unión de las 6 variantes.
  const cuerpo = cuerpoSchema(FORMAT, 'ExcelPreset');
  assert.match(cuerpo, /z\.(?:union|discriminatedUnion)\(/, 'ExcelPreset es una unión');
  for (const v of variantes) assert.match(cuerpo, new RegExp(`\\b${v}Schema\\b`), `ExcelPreset incluye ${v}`);
});

test('WT-0052 / format: usa Intl.NumberFormatOptions / DateTimeFormatOptions', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /Intl\.NumberFormatOptions/, 'usa Intl.NumberFormatOptions');
  assert.match(src, /Intl\.DateTimeFormatOptions/, 'usa Intl.DateTimeFormatOptions');
  // La unidad relativa (RelativeUnit) se tipa con Intl.RelativeTimeFormatUnit.
  tipoDeSchemas(FORMAT, 'RelativeUnit');
  assert.match(cuerpoSchema(FORMAT, 'RelativeUnit'), /Intl\.RelativeTimeFormatUnit/, 'RelativeUnit usa Intl.RelativeTimeFormatUnit');
  assert.match(src, /\bRelativeUnit\b[\s\S]*\bRelativeUnit\b/, 'format.ts usa RelativeUnit');
});

test('WT-0052 / format: tipos alias para narrowing', () => {
  // Uniones de literales (no `string`): permiten narrowing en el switch.
  for (const t of ['FormatType', 'NumberFormatKind', 'RelativeStyle', 'RelativeNumeric', 'TextCase']) {
    tipoDeSchemas(FORMAT, t);
    assert.match(cuerpoSchema(FORMAT, t), /z\.union\(\[\s*z\.literal\(/, `${t} es unión de literales`);
  }
});

test('WT-0052 / format: #timer con ReturnType<typeof setInterval>', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /#timer:\s*ReturnType<typeof\s+setInterval>\s*\|\s*null/, '#timer: ReturnType<typeof setInterval> | null');
});

test('WT-0052 / format: funciones puras siguen existiendo (toFraction, normalizePattern)', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /function\s+toFraction\s*\(\s*n:\s*number,\s*maxDen:\s*number\)\s*:\s*string/, 'toFraction(n: number, maxDen: number): string');
  assert.match(src, /function\s+normalizePattern\s*\(\s*raw:\s*string\s*\|\s*null\s*\|\s*undefined\)\s*:\s*string/, 'normalizePattern(raw: string | null | undefined): string');
  assert.match(src, /function\s+titleCase\s*\(\s*s:\s*string\)\s*:\s*string/, 'titleCase(s: string): string');
});

test('WT-0052 / format: cast HTMLTimeElement para dateTime', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /\(this\.#el\s+as\s+HTMLTimeElement\)\.dateTime/, 'cast this.#el as HTMLTimeElement para dateTime');
});

test('WT-0052 / format: NO usa `any` en firmas', () => {
  const src = readFileSync(FORMAT, 'utf8');
  const matches = src.match(/:\s*any\b|\bas\s+any\b|<any>/g) ?? [];
  assert.ok(matches.length <= 2, `esperado ≤2 usos de any, encontró ${matches.length}`);
});

// ── Verificación cruzada ──────────────────────────────────────────────────

test('WT-0052 / total: los 5 archivos tienen clases y usan tipos explícitos', () => {
  for (const f of [ROW_ADAPTER_BASE, ROW_ADAPTER_DRAG, MD_EDITOR, POPOVER, FORMAT]) {
    const src = readFileSync(f, 'utf8');
    assert.ok(/class\s+\w+/.test(src), `${f} debe contener una clase`);
    // Algunos archivos exportan sus clases (row-adapter-base/drag), otros sólo
    // registran el custom element vía defineElement (md-editor/popover/format).
    const exportsClass = /export\s+(class|interface|type)\s+\w+/.test(src);
    const registersElement = /defineElement\s*\(/.test(src);
    assert.ok(exportsClass || registersElement, `${f} debe exportar una clase o registrar un custom element`);
  }
});

export default lista();
