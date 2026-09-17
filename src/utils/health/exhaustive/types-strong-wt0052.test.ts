/**
 * types-strong-wt0052.test.ts — verificación estructural de los 5 archivos
 * tipados por WT-0052 (Tanda 5).
 *
 * Scope: row-adapter-base, row-adapter-drag (tree-view), md-editor, popover,
 * format (helpers). Estos archivos pasaron de 337 errores strict audit a 0
 * tras la migración a tipos explícitos.
 *
 * Estrategia: análisis estático (regex sobre el código fuente). No levanta
 * DOM porque las dependencias (ElementBase, is-floating, is-dialog) requieren
 * jsdom y eso queda fuera del smoke test.
 *
 * Cómo correr:
 *   node --import ./scripts/ts-resolve-hook.ts --test \
 *     src/utils/health/exhaustive/types-strong-wt0052.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');

const ROW_ADAPTER_BASE = join(ROOT, 'src', 'components', 'isp', '_shared', 'tree-view', 'row-adapter-base.ts');
const ROW_ADAPTER_DRAG = join(ROOT, 'src', 'components', 'isp', '_shared', 'tree-view', 'row-adapter-drag.ts');
const MD_EDITOR         = join(ROOT, 'src', 'components', 'helpers', 'md-editor.ts');
const POPOVER           = join(ROOT, 'src', 'components', 'helpers', 'popover.ts');
const FORMAT            = join(ROOT, 'src', 'components', 'helpers', 'format.ts');

// ── row-adapter-base.ts ───────────────────────────────────────────────────

test('WT-0052 / row-adapter-base: archivo existe y declara TRABase', () => {
  assert.ok(existsSync(ROW_ADAPTER_BASE), `${ROW_ADAPTER_BASE} debe existir`);
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  assert.match(src, /class\s+TRABase\b/, 'debe declarar la clase TRABase');
  assert.match(src, /export\s+class\s+TRABase\b/, 'TRABase debe estar exportada');
});

test('WT-0052 / row-adapter-base: usa tipos compartidos de _types.ts', () => {
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  assert.match(src, /import\s+type[^;]+from\s+['"]\.\/_types\.js['"]/, 'debe importar tipos desde _types.js');
  assert.match(src, /\bRowConfig\b/, 'usa RowConfig');
  assert.match(src, /\bTNode\b/, 'usa TNode');
  assert.match(src, /\bTreeActionEntry\b/, 'usa TreeActionEntry');
});

test('WT-0052 / row-adapter-base: define interface TreeAdapterLike local', () => {
  const src = readFileSync(ROW_ADAPTER_BASE, 'utf8');
  assert.match(src, /interface\s+TreeAdapterLike\b/, 'debe declarar TreeAdapterLike local');
  assert.match(src, /readonly\s+disabled/, 'TreeAdapterLike expone readonly disabled');
  assert.match(src, /readonly\s+isProtected/, 'TreeAdapterLike expone readonly isProtected');
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

test('WT-0052 / row-adapter-drag: tipo local DragOverPosition', () => {
  const src = readFileSync(ROW_ADAPTER_DRAG, 'utf8');
  assert.match(src, /type\s+DragOverPosition\s*=\s*['"]before['"]\s*\|\s*['"]after['"]\s*\|\s*['"]into['"]/, 'DragOverPosition union');
});

test('WT-0052 / row-adapter-drag: NO usa `any` en firmas', () => {
  const src = readFileSync(ROW_ADAPTER_DRAG, 'utf8');
  const matches = src.match(/:\s*any\b|\bas\s+any\b|<any>/g) ?? [];
  assert.ok(matches.length <= 2, `esperado ≤2 usos de any, encontró ${matches.length}`);
});

// ── md-editor.ts ──────────────────────────────────────────────────────────

test('WT-0052 / md-editor: archivo existe y registra is-md-editor', () => {
  assert.ok(existsSync(MD_EDITOR), `${MD_EDITOR} debe existir`);
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /class\s+IsMdEditor\b/, 'declara IsMdEditor');
  assert.match(src, /defineElement\s*\(\s*['"]is-md-editor['"]/, 'registra is-md-editor');
  assert.match(src, /extends\s+ElementBase\b/, 'extiende ElementBase');
});

test('WT-0052 / md-editor: tipos del contrato declarados inline', () => {
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /interface\s+IsMdEditorDocument\b/, 'declara IsMdEditorDocument inline');
  assert.match(src, /interface\s+IsMdEditorApiConfig\b/, 'declara IsMdEditorApiConfig inline');
  assert.match(src, /interface\s+IsMdEditorActions\b/, 'declara IsMdEditorActions inline');
});

test('WT-0052 / md-editor: subset tipado de wrappers (Dialog, Switch, Copy, Textarea)', () => {
  const src = readFileSync(MD_EDITOR, 'utf8');
  assert.match(src, /type\s+DialogElement\b/, 'declara DialogElement');
  assert.match(src, /interface\s+SwitchElement\b/, 'declara SwitchElement');
  assert.match(src, /interface\s+CopyButtonElement\b/, 'declara CopyButtonElement');
  assert.match(src, /interface\s+TextareaElement\b/, 'declara TextareaElement');
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

test('WT-0052 / popover: archivo existe y registra is-popover', () => {
  assert.ok(existsSync(POPOVER), `${POPOVER} debe existir`);
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /class\s+IsPopover\b/, 'declara IsPopover');
  assert.match(src, /defineElement\s*\(\s*['"]is-popover['"]/, 'registra is-popover');
});

test('WT-0052 / popover: define interface FloatingElement', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /interface\s+FloatingElement\b/, 'declara FloatingElement');
  assert.match(src, /FloatingElement\s+extends\s+HTMLElement/, 'extends HTMLElement');
  assert.match(src, /placement:\s*string/, 'placement: string');
  assert.match(src, /active:\s*boolean/, 'active: boolean');
  assert.match(src, /reposition\s*\(\s*\)\s*:\s*void/, 'reposition(): void');
});

test('WT-0052 / popover: openPopover tipado como IsPopover | null', () => {
  const src = readFileSync(POPOVER, 'utf8');
  assert.match(src, /let\s+openPopover\s*:\s*IsPopover\s*\|\s*null\b/, 'openPopover: IsPopover | null');
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

test('WT-0052 / format: archivo existe y registra is-format', () => {
  assert.ok(existsSync(FORMAT), `${FORMAT} debe existir`);
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /class\s+FormatElement\b/, 'declara FormatElement');
  assert.match(src, /extends\s+ElementBase\b/, 'extiende ElementBase');
  assert.match(src, /defineElement\s*\(\s*['"]is-format['"]/, 'registra is-format');
});

test('WT-0052 / format: discriminated union ExcelPreset', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /type\s+ExcelPreset\s*=/, 'declara ExcelPreset');
  assert.match(src, /type\s+NumberPreset\b/, 'NumberPreset');
  assert.match(src, /type\s+CurrencyPreset\b/, 'CurrencyPreset');
  assert.match(src, /type\s+AccountingPreset\b/, 'AccountingPreset');
  assert.match(src, /type\s+FractionPreset\b/, 'FractionPreset');
  assert.match(src, /type\s+TextPreset\b/, 'TextPreset');
  assert.match(src, /type\s+DatePreset\b/, 'DatePreset');
});

test('WT-0052 / format: usa Intl.NumberFormatOptions / DateTimeFormatOptions', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /Intl\.NumberFormatOptions/, 'usa Intl.NumberFormatOptions');
  assert.match(src, /Intl\.DateTimeFormatOptions/, 'usa Intl.DateTimeFormatOptions');
  assert.match(src, /Intl\.RelativeTimeFormatUnit/, 'usa Intl.RelativeTimeFormatUnit');
});

test('WT-0052 / format: tipos alias para narrowing', () => {
  const src = readFileSync(FORMAT, 'utf8');
  assert.match(src, /type\s+FormatType\b/, 'FormatType');
  assert.match(src, /type\s+NumberFormatKind\b/, 'NumberFormatKind');
  assert.match(src, /type\s+RelativeStyle\b/, 'RelativeStyle');
  assert.match(src, /type\s+RelativeNumeric\b/, 'RelativeNumeric');
  assert.match(src, /type\s+TextCase\b/, 'TextCase');
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
