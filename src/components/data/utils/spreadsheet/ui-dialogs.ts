// @contexto INDICE.md · src/components/data/README.md
// find.ts — buscar y reemplazar en una hoja o en todo el libro.
import type { SpreadsheetDoc } from './document.js';
import { keyCol, keyRow } from './engine.js';
import type { Sheet } from './engine.js';
import type { FindOptions, FindHit, Fields, DialogHost } from './ui-dialogs.schemas.js';
import { cellName, colName, parseCell, parseRange, rangeName } from './address.js';
import type { Rect } from './address.schemas.js';
import type { SortKey } from './document.schemas.js';
import { allFunctions, aliasOf } from './fn-registry.js';
import { formatValue, NUMBER_FORMATS } from './numfmt.js';
import { signatureParts } from './ui-formula-assist.js';
import { esc } from './ui-render.js';
import type { BorderSide, CellStyle, CfRule, ValidationRule } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';

/** Regex de la consulta; null si no es válida. */
function queryRegex(q: string, o: FindOptions, global: boolean): RegExp | null {
  const body = o.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { return new RegExp(o.wholeCell ? `^(?:${body})$` : body, `${o.matchCase ? '' : 'i'}${global ? 'g' : ''}`); } catch { return null; }
}

/** Todas las coincidencias, en orden de filas. */
export function findAll(doc: SpreadsheetDoc, query: string, o: FindOptions = {}, from: Sheet = doc.sheet): FindHit[] {
  if (!query) return [];
  const re = queryRegex(query, o, false);
  if (!re) return [];
  const hits: FindHit[] = [];
  for (const sheet of o.allSheets ? doc.engine.sheets : [from]) {
    const keys = [...new Set([...sheet.cells.keys(), ...sheet.calc.keys()])].sort((a, b) => a - b);
    for (const k of keys) {
      const r = keyRow(k);
      const c = keyCol(k);
      const text = o.inFormulas ? doc.rawText(sheet, r, c) || doc.displayText(sheet, r, c).text : doc.displayText(sheet, r, c).text;
      if (text && re.test(text)) hits.push({ sheet, r, c, text });
    }
  }
  return hits;
}

/** Reemplaza coincidencias y devuelve cuántas celdas cambió. */
export function replaceAll(doc: SpreadsheetDoc, query: string, by: string, o: FindOptions = {}, from: Sheet = doc.sheet): number {
  const re = queryRegex(query, o, true);
  if (!re) return 0;
  const hits = findAll(doc, query, { ...o, inFormulas: true }, from).filter((h) => doc.engine.getCell(h.sheet, h.r, h.c));
  doc.transact('Reemplazar', () => {
    for (const h of hits) doc.setInput(h.sheet, h.r, h.c, doc.rawText(h.sheet, h.r, h.c).replace(re, by));
  });
  return hits.length;
}

// ── dialogs ──
// dialogs.ts — diálogos de la hoja, con controles del kit. Cada función arma su cuerpo y su acción;
// el componente solo aporta el `iswc-dialog` y el contexto.
/** Campo de texto. */
export const input = (name: string, label: string, value = '', hint = ''): string => `<iswc-input data-f="${name}" label="${esc(label)}" value="${esc(value)}"${hint ? ` hint="${esc(hint)}"` : ''}></iswc-input>`;

/** Lista desplegable. */
export const select = (name: string, label: string, opts: [string, string][], value = ''): string => `<iswc-select data-f="${name}" label="${esc(label)}" value="${esc(value || opts[0]?.[0] || '')}">${opts.map(([v, t]) => `<iswc-option value="${esc(v)}">${esc(t)}</iswc-option>`).join('')}</iswc-select>`;

/** Casilla. */
export const check = (name: string, label: string, on = false): string => `<iswc-checkbox data-f="${name}"${on ? ' checked' : ''}>${esc(label)}</iswc-checkbox>`;

/** Selector de color. */
export const color = (name: string, label: string, value = ''): string => `<iswc-color-picker data-f="${name}" data-initial="${esc(value)}" label="${esc(label)}"></iswc-color-picker>`;

/** Columnas de un rango para los selectores. */
function colOptions(doc: SpreadsheetDoc, sheet: Sheet, x: Rect): [string, string][] {
  const out: [string, string][] = [];
  for (let c = x.c1; c <= x.c2 && out.length < 64; c++) {
    const head = doc.displayText(sheet, x.r1, c).text;
    out.push([String(c), `${colName(c)}${head ? ` — ${head}` : ''}`]);
  }
  return out;
}

// ---- Formato de celdas ----

/** Formato de celdas. */
export function formatDialog(h: DialogHost): void {
  const { r, c } = h.active();
  const s = h.doc.styleAt(h.sheet(), r, c);
  const value = h.doc.engine.getValue(h.sheet(), r, c);
  const known = NUMBER_FORMATS.find((f) => f.fmt === (s.numFmt ?? 'General'));
  const body = `<div class="dlg-grid two">
    <fieldset><legend>Número</legend>
      ${select('kind', 'Categoría', [...NUMBER_FORMATS.map((f): [string, string] => [f.fmt, f.label]), ['custom', 'Personalizado']], known ? known.fmt : 'custom')}
      ${input('fmt', 'Código de formato', s.numFmt ?? 'General', 'Secciones: positivo;negativo;cero;texto')}
      <p class="dlg-preview" data-preview></p>
    </fieldset>
    <fieldset><legend>Alineación</legend>
      ${select('align', 'Horizontal', [['', 'General'], ['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']], s.align ?? '')}
      ${select('valign', 'Vertical', [['', 'Por defecto'], ['top', 'Superior'], ['middle', 'Centro'], ['bottom', 'Inferior']], s.valign ?? '')}
      ${input('indent', 'Sangría', String(s.indent ?? 0))}
      ${check('wrap', 'Ajustar texto', !!s.wrap)}
    </fieldset>
    <fieldset><legend>Fuente</legend>
      ${input('font', 'Fuente', s.font ?? '')}
      ${input('size', 'Tamaño (pt)', s.size ? String(s.size) : '')}
      <div class="dlg-row">${check('bold', 'Negrita', !!s.bold)}${check('italic', 'Cursiva', !!s.italic)}${check('underline', 'Subrayado', !!s.underline)}${check('strike', 'Tachado', !!s.strike)}</div>
    </fieldset>
    <fieldset><legend>Color y borde</legend>
      ${color('color', 'Color de texto', s.color ?? '')}
      ${color('bg', 'Relleno', s.bg ?? '')}
      ${select('border', 'Borde', [['', 'Sin cambios'], ['all', 'Todos'], ['outer', 'Exterior'], ['none', 'Ninguno']])}
      ${select('bstyle', 'Estilo', [['thin', 'Fino'], ['medium', 'Medio'], ['thick', 'Grueso'], ['dashed', 'Discontinuo'], ['dotted', 'Punteado'], ['double', 'Doble']])}
    </fieldset></div>`;
  h.open({
    title: 'Formato de celdas', body, wide: true,
    onOpen: (f) => {
      const paint = (): void => {
        const el = f.root.querySelector('[data-preview]');
        if (el) el.textContent = `Vista previa: ${formatValue(value ?? 1234.5, f.get('fmt'), h.doc.locale).text}`;
      };
      paint();
      f.root.addEventListener('iswc-change', (e) => {
        const t = e.target as HTMLElement;
        if (t.dataset.f === 'kind' && f.get('kind') !== 'custom') (f.root.querySelector('[data-f="fmt"]') as HTMLInputElement).value = f.get('kind');
        paint();
      });
      f.root.addEventListener('iswc-input', paint);
    },
    onOk: (f) => {
      const size = Number(f.get('size'));
      const patch: CellStyle = {
        numFmt: f.get('fmt') === 'General' ? undefined : f.get('fmt'), align: (f.get('align') || undefined) as CellStyle['align'], valign: (f.get('valign') || undefined) as CellStyle['valign'],
        indent: Number(f.get('indent')) || undefined, wrap: f.on('wrap') || undefined, font: f.get('font') || undefined, size: size > 0 ? size : undefined,
        bold: f.on('bold') || undefined, italic: f.on('italic') || undefined, underline: f.on('underline') || undefined, strike: f.on('strike') || undefined,
        color: f.get('color') || undefined, bg: f.get('bg') || undefined,
      };
      h.doc.transact('Formato de celdas', () => {
        h.doc.applyStyle(h.sheet(), h.rects(), patch);
        if (f.get('border')) for (const x of h.rects()) h.doc.setBorders(h.sheet(), x, f.get('border'), { style: f.get('bstyle') as BorderSide['style'] });
      });
      h.record('formato', rangeName(h.rect()), Object.fromEntries(Object.entries({ negrita: patch.bold, cursiva: patch.italic, relleno: patch.bg, color: patch.color, formato: patch.numFmt }).filter(([, v]) => v !== undefined)) as Record<string, string | boolean>);
    },
  });
}

// ---- Buscar y reemplazar ----

/** Buscar y reemplazar. */
export function findDialog(h: DialogHost): void {
  let hits: FindHit[] = [];
  let at = -1;
  let key = '';
  const options = (f: Fields): { matchCase: boolean; wholeCell: boolean; inFormulas: boolean; allSheets: boolean; regex: boolean } => ({ matchCase: f.on('case'), wholeCell: f.on('whole'), inFormulas: f.on('formulas'), allSheets: f.on('all'), regex: f.on('regex') });
  const status = (f: Fields, t: string): void => {
    const el = f.root.querySelector('[data-status]');
    if (el) el.textContent = t;
  };
  const search = (f: Fields): void => {
    const o = options(f);
    const k = JSON.stringify([f.get('q'), o, h.doc.engine.generation]);
    if (k !== key) {
      key = k;
      hits = findAll(h.doc, f.get('q'), o, h.sheet());
      at = -1;
    }
  };
  const next = (f: Fields, dir: number): void => {
    search(f);
    if (!hits.length) { status(f, 'Sin resultados'); return; }
    at = (at + dir + hits.length) % hits.length;
    const hit = hits[at];
    h.select(hit.sheet, hit.r, hit.c);
    status(f, `${at + 1} de ${hits.length}: ${cellName(hit.r, hit.c)}`);
  };
  h.open({
    title: 'Buscar y reemplazar',
    hideOk: true,
    body: `<div class="dlg-grid">
      ${input('q', 'Buscar')}${input('by', 'Reemplazar con')}
      <div class="dlg-row">${check('case', 'Mayúsculas')}${check('whole', 'Celda completa')}${check('formulas', 'En fórmulas')}${check('all', 'Todo el libro')}${check('regex', 'Regex')}</div>
      <div class="dlg-row">
        <iswc-button data-act="prev" variant="outlined">Anterior</iswc-button>
        <iswc-button data-act="next" variant="outlined">Siguiente</iswc-button>
        <iswc-button data-act="one" variant="outlined">Reemplazar</iswc-button>
        <iswc-button data-act="all" variant="outlined">Reemplazar todo</iswc-button>
      </div>
      <p class="dlg-status" data-status aria-live="polite"></p></div>`,
    onOpen: (f) => {
      f.root.addEventListener('click', (e) => {
        const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
        if (act === 'next') next(f, 1);
        if (act === 'prev') next(f, -1);
        if (act === 'one') {
          const hit = hits[at];
          if (!hit) { next(f, 1); return; }
          replaceAll(h.doc, f.get('q'), f.get('by'), { ...options(f), wholeCell: false, allSheets: false }, hit.sheet);
          h.refresh();
          key = '';
          next(f, 1);
        }
        if (act === 'all') {
          const n = replaceAll(h.doc, f.get('q'), f.get('by'), options(f), h.sheet());
          h.refresh();
          key = '';
          status(f, `${n} reemplazos`);
        }
      });
      f.root.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();
        next(f, (e as KeyboardEvent).shiftKey ? -1 : 1);
      });
    },
  });
}

/** Ir a. */
export function gotoDialog(h: DialogHost): void {
  const names = [...h.doc.engine.names.values()].map((n): [string, string] => [n.ref, n.name]);
  h.open({
    title: 'Ir a', okLabel: 'Ir',
    body: `<div class="dlg-grid">${input('ref', 'Referencia', '', 'Celda, rango o nombre')}${names.length ? select('name', 'Nombres', [['', '—'], ...names]) : ''}
      ${select('special', 'Ir a especial', [['', 'Ninguno'], ['blanks', 'Celdas en blanco'], ['formulas', 'Fórmulas'], ['constants', 'Constantes'], ['errors', 'Errores'], ['comments', 'Comentarios']])}</div>`,
    onOk: (f) => {
      const special = f.get('special');
      if (special) return goSpecial(h, special);
      const text = (f.get('name') || f.get('ref')).replace(/^=/, '');
      const bang = text.lastIndexOf('!');
      const sheet = bang >= 0 ? h.doc.sheetByName(text.slice(0, bang).replace(/^'|'$/g, '')) : h.sheet();
      const x = sheet ? parseRange(bang >= 0 ? text.slice(bang + 1) : text, sheet.rows, sheet.cols) : null;
      if (!x || !sheet) { h.toast('Referencia no válida'); return false; }
      h.select(sheet, x.r1, x.c1);
      h.selectRect(x);
    },
  });
}

/** Selecciona celdas por tipo. */
function goSpecial(h: DialogHost, kind: string): boolean | void {
  const sheet = h.sheet();
  const box = h.rect().r1 === h.rect().r2 && h.rect().c1 === h.rect().c2 ? { r1: 0, c1: 0, r2: h.doc.engine.usedBounds(sheet).rows - 1, c2: h.doc.engine.usedBounds(sheet).cols - 1 } : h.rect();
  for (let r = box.r1; r <= box.r2; r++) {
    for (let c = box.c1; c <= box.c2; c++) {
      const cell = h.doc.engine.getCell(sheet, r, c);
      const v = h.doc.engine.getValue(sheet, r, c);
      const hit = kind === 'blanks' ? v === null : kind === 'formulas' ? cell?.f !== undefined : kind === 'constants' ? cell?.v !== undefined : kind === 'comments' ? !!cell?.c : typeof v === 'object' && v !== null;
      if (hit) { h.select(sheet, r, c); return; }
    }
  }
  h.toast('No se encontraron celdas');
  return false;
}

// ---- Funciones ----

/** Insertar función. */
export function functionDialog(h: DialogHost): void {
  const cats = [...new Set(allFunctions().map((f) => f.cat))].sort();
  const body = `<div class="dlg-grid">${input('q', 'Buscar función')}${select('cat', 'Categoría', [['', 'Todas'], ...cats.map((c): [string, string] => [c, c])])}<div class="fn-list" data-list role="listbox" aria-label="Funciones"></div><p class="dlg-status" data-info></p></div>`;
  h.open({
    title: 'Insertar función', hideOk: true, body,
    onOpen: (f) => {
      const list = f.root.querySelector<HTMLElement>('[data-list]')!;
      const label = (name: string): string => (h.doc.locale === 'es' ? aliasOf(name) : name);
      const paint = (): void => {
        const q = f.get('q').toLowerCase();
        const cat = f.get('cat');
        const rows = allFunctions().filter((x) => (!cat || x.cat === cat) && (!q || x.name.toLowerCase().includes(q) || label(x.name).toLowerCase().includes(q) || x.desc.toLowerCase().includes(q)));
        list.innerHTML = rows.slice(0, 80).map((x) => `<button class="fn-item" role="option" data-fn="${esc(label(x.name))}"><b>${esc(label(x.name))}</b><span>${esc(x.desc)}</span></button>`).join('') || '<p>Sin resultados</p>';
      };
      paint();
      f.root.addEventListener('iswc-input', paint);
      f.root.addEventListener('iswc-change', paint);
      list.addEventListener('click', (e) => {
        const name = (e.target as HTMLElement).closest<HTMLElement>('[data-fn]')?.dataset.fn;
        if (!name) return;
        h.close();
        h.insertAtEditor(`${name}(`);
      });
      list.addEventListener('mouseover', (e) => {
        const name = (e.target as HTMLElement).closest<HTMLElement>('[data-fn]')?.dataset.fn;
        const def = allFunctions().find((x) => label(x.name) === name);
        const info = f.root.querySelector('[data-info]');
        if (def && info) {
          const p = signatureParts(def, -1, h.doc.locale);
          info.textContent = `${p.name}(${p.params.map((x) => x.text).join(', ')})`;
        }
      });
    },
  });
}

/** Administrador de nombres. */
export function namesDialog(h: DialogHost): void {
  const row = (name: string, ref: string): string => `<div class="dlg-item"><b>${esc(name)}</b><code>${esc(ref)}</code><iswc-button data-del="${esc(name)}" variant="text" color="danger" aria-label="Eliminar ${esc(name)}"><iswc-icon icon="mdi:delete-outline"></iswc-icon></iswc-button></div>`;
  const list = (): string => [...h.doc.engine.names.values()].map((n) => row(n.name, n.ref)).join('') || '<p class="dlg-status">Aún no hay nombres.</p>';
  h.open({
    title: 'Administrador de nombres', okLabel: 'Agregar',
    body: `<div class="dlg-grid"><div data-names class="dlg-list">${list()}</div>${input('name', 'Nombre')}${input('ref', 'Se refiere a', `=${h.sheet().name.includes(' ') ? `'${h.sheet().name}'` : h.sheet().name}!${rangeName(h.rect())}`)}</div>`,
    onOpen: (f) => {
      f.root.addEventListener('click', (e) => {
        const name = (e.target as HTMLElement).closest<HTMLElement>('[data-del]')?.dataset.del;
        if (!name) return;
        h.doc.removeName(name);
        f.root.querySelector('[data-names]')!.innerHTML = list();
        h.refresh();
      });
    },
    onOk: (f) => {
      if (!h.doc.defineName(f.get('name').trim(), f.get('ref'))) { h.toast('Nombre no válido'); return false; }
      h.record('definirNombre', f.get('name').trim(), f.get('ref'));
    },
  });
}

// ---- Datos ----

/** Orden personalizado. */
export function sortDialog(h: DialogHost): void {
  const sheet = h.sheet();
  const x = h.rect();
  const box = x.r1 === x.r2 && x.c1 === x.c2 ? h.doc.currentRegion(sheet, x.r1, x.c1) : x;
  const cols = colOptions(h.doc, sheet, box);
  const level = (i: number): string => `<div class="dlg-row">${select(`col${i}`, i ? 'Luego por' : 'Ordenar por', [...(i ? [['', '—'] as [string, string]] : []), ...cols])}${select(`dir${i}`, 'Orden', [['asc', 'Ascendente'], ['desc', 'Descendente']])}</div>`;
  h.open({
    title: `Ordenar ${rangeName(box)}`, okLabel: 'Ordenar',
    body: `<div class="dlg-grid">${level(0)}${level(1)}${level(2)}${check('head', 'La primera fila es encabezado', true)}</div>`,
    onOk: (f) => {
      const keys: SortKey[] = [0, 1, 2].filter((i) => f.get(`col${i}`) !== '').map((i) => ({ col: Number(f.get(`col${i}`)), desc: f.get(`dir${i}`) === 'desc' }));
      h.doc.sort(sheet, box, keys, f.on('head'));
      h.record('ordenar', rangeName(box), colName(keys[0].col), !!keys[0].desc, f.on('head'));
    },
  });
}

/** Quitar duplicados. */
export function dedupeDialog(h: DialogHost): void {
  const sheet = h.sheet();
  const box = h.doc.currentRegion(sheet, h.rect().r1, h.rect().c1);
  const cols = colOptions(h.doc, sheet, box);
  h.open({
    title: 'Quitar duplicados', okLabel: 'Quitar',
    body: `<div class="dlg-grid">${check('head', 'Tiene encabezado', true)}${cols.map(([v, t]) => check(`c${v}`, t, true)).join('')}</div>`,
    onOk: (f) => {
      const n = h.doc.removeDuplicates(sheet, box, cols.filter(([v]) => f.on(`c${v}`)).map(([v]) => Number(v)), f.on('head'));
      h.toast(n ? `Se quitaron ${n} filas duplicadas` : 'No había duplicados');
    },
  });
}

/** Texto en columnas. */
export function textColumnsDialog(h: DialogHost): void {
  h.open({
    title: 'Texto en columnas', okLabel: 'Dividir',
    body: `<div class="dlg-grid">${select('sep', 'Separador', [[',', 'Coma'], [';', 'Punto y coma'], ['\t', 'Tabulación'], [' ', 'Espacio'], ['|', 'Barra'], ['custom', 'Otro']])}${input('other', 'Otro separador')}</div>`,
    onOk: (f) => { h.doc.textToColumns(h.sheet(), h.rect(), f.get('sep') === 'custom' ? f.get('other') : f.get('sep')); },
  });
}

/** Buscar objetivo. */
export function goalSeekDialog(h: DialogHost): void {
  const { r, c } = h.active();
  h.open({
    title: 'Buscar objetivo', okLabel: 'Buscar',
    body: `<div class="dlg-grid">${input('cell', 'Celda con fórmula', cellName(r, c))}${input('goal', 'Valor buscado', '0')}${input('change', 'Cambiando la celda')}</div>`,
    onOk: (f) => {
      const a = parseCell(f.get('cell'));
      const b = parseCell(f.get('change'));
      if (!a || !b) { h.toast('Referencia no válida'); return false; }
      const x = h.doc.goalSeek(h.sheet(), a, Number(f.get('goal')), b);
      h.toast(x === null ? 'No se encontró solución' : `Solución: ${x}`);
    },
  });
}

/** Validación de datos. */
export function validationDialog(h: DialogHost): void {
  const sheet = h.sheet();
  const x = h.rect();
  const cur = h.doc.validationAt(sheet, x.r1, x.c1);
  const ops: [string, string][] = [['between', 'entre'], ['notBetween', 'fuera de'], ['eq', 'igual a'], ['ne', 'distinto de'], ['gt', 'mayor que'], ['lt', 'menor que'], ['gte', 'mayor o igual'], ['lte', 'menor o igual']];
  h.open({
    title: 'Validación de datos', okLabel: 'Aplicar',
    body: `<div class="dlg-grid">
      ${select('type', 'Permitir', [['whole', 'Número entero'], ['decimal', 'Decimal'], ['list', 'Lista'], ['date', 'Fecha'], ['textLength', 'Longitud de texto'], ['custom', 'Fórmula']], cur?.type ?? 'list')}
      ${select('op', 'Condición', ops, cur?.op ?? 'between')}
      ${input('a', 'Valor, lista o fórmula', cur?.a ?? '', 'Lista: a, b, c o =A1:A5. Fórmula: =A1>0')}
      ${input('b', 'Máximo', cur?.b ?? '')}
      ${input('prompt', 'Mensaje de entrada', cur?.prompt ?? '')}
      ${input('message', 'Mensaje de error', cur?.message ?? '')}
      ${select('severity', 'Estilo', [['stop', 'Detener'], ['warning', 'Advertencia'], ['info', 'Información']], cur?.severity ?? 'stop')}
      ${check('blank', 'Permitir vacío', cur?.allowBlank !== false)}
      <div class="dlg-row"><iswc-button data-act="clear" variant="text" color="danger">Quitar validación</iswc-button></div></div>`,
    onOpen: (f) => f.root.querySelector('[data-act="clear"]')?.addEventListener('click', () => {
      h.doc.removeValidation(sheet, x);
      h.close();
      h.refresh();
    }),
    onOk: (f) => {
      h.doc.removeValidation(sheet, x);
      h.doc.addValidation(sheet, {
        range: rangeName(x), type: f.get('type') as ValidationRule['type'], op: f.get('op') as ValidationRule['op'], a: f.get('a'), b: f.get('b') || undefined,
        prompt: f.get('prompt') || undefined, message: f.get('message') || undefined, severity: f.get('severity') as ValidationRule['severity'], allowBlank: f.on('blank'),
      });
    },
  });
}

// ---- Formato condicional ----

/** Crear regla de formato condicional. */
export function cfDialog(h: DialogHost, type: string): void {
  const x = h.rect();
  const titles: Record<string, string> = { cell: 'Resaltar celdas', text: 'Texto que contiene', formula: 'Regla con fórmula', top: 'Reglas superiores' };
  const fields: Record<string, string> = {
    cell: `${select('op', 'Condición', [['gt', 'mayor que'], ['lt', 'menor que'], ['gte', 'mayor o igual'], ['lte', 'menor o igual'], ['eq', 'igual a'], ['ne', 'distinto de'], ['between', 'entre']])}${input('a', 'Valor o =fórmula')}${input('b', 'Hasta (solo «entre»)')}`,
    text: input('a', 'Contiene'),
    formula: input('a', 'Fórmula', `=${cellName(x.r1, x.c1)}>0`, 'Relativa a la primera celda del rango'),
    top: `${select('dir', 'Tipo', [['top', 'Mayores'], ['bottom', 'Menores']])}${input('rank', 'Cantidad', '10')}`,
  };
  h.open({
    title: titles[type] ?? 'Regla', okLabel: 'Crear',
    body: `<div class="dlg-grid">${input('range', 'Rango', rangeName(x))}${fields[type] ?? ''}${color('bg', 'Relleno', '#ffc7ce')}${color('color', 'Texto', '#9c0006')}${check('bold', 'Negrita')}</div>`,
    onOk: (f) => {
      const rule: Omit<CfRule, 'id'> = {
        range: f.get('range'), type: (type === 'top' ? f.get('dir') : type) as CfRule['type'],
        style: { bg: f.get('bg') || undefined, color: f.get('color') || undefined, bold: f.on('bold') || undefined },
      };
      if (type === 'cell') { rule.op = f.get('op') as CfRule['op']; rule.a = f.get('a'); rule.b = f.get('b') || undefined; }
      if (type === 'text' || type === 'formula') rule.a = f.get('a');
      if (type === 'top') rule.rank = Number(f.get('rank')) || 10;
      h.doc.addCf(h.sheet(), rule);
    },
  });
}

/** Administrar reglas. */
export function cfManageDialog(h: DialogHost): void {
  const sheet = h.sheet();
  const names: Record<string, string> = { cell: 'Valor de celda', text: 'Texto', formula: 'Fórmula', top: 'Mayores', bottom: 'Menores', aboveAverage: 'Sobre el promedio', belowAverage: 'Bajo el promedio', duplicate: 'Duplicados', unique: 'Únicos', blank: 'Vacías', colorScale: 'Escala de color', dataBar: 'Barras', iconSet: 'Iconos' };
  const list = (): string => h.doc.extras(sheet).cf.map((r) => `<div class="dlg-item"><b>${esc(names[r.type] ?? r.type)}</b><code>${esc(r.range)}</code><iswc-button data-del="${esc(r.id)}" variant="text" color="danger" aria-label="Eliminar regla"><iswc-icon icon="mdi:delete-outline"></iswc-icon></iswc-button></div>`).join('') || '<p class="dlg-status">La hoja no tiene reglas.</p>';
  h.open({
    title: 'Reglas de formato condicional', hideOk: true, body: `<div class="dlg-list" data-rules>${list()}</div>`,
    onOpen: (f) => f.root.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-del]')?.dataset.del;
      if (!id) return;
      h.doc.removeCf(sheet, id);
      f.root.querySelector('[data-rules]')!.innerHTML = list();
      h.refresh();
    }),
  });
}

/** Pegado especial. */
export function pasteSpecialDialog(h: DialogHost, apply: (mode: 'all' | 'values' | 'formulas' | 'formats', transpose: boolean) => void): void {
  h.open({
    title: 'Pegado especial', okLabel: 'Pegar',
    body: `<div class="dlg-grid">${select('mode', 'Pegar', [['all', 'Todo'], ['values', 'Valores'], ['formulas', 'Fórmulas'], ['formats', 'Formatos']])}${check('tr', 'Transponer')}</div>`,
    onOk: (f) => apply(f.get('mode') as 'all', f.on('tr')),
  });
}

/** Pide un texto simple. */
export function promptDialog(h: DialogHost, title: string, label: string, value: string, ok: (v: string) => void, hint = ''): void {
  h.open({ title, body: `<div class="dlg-grid">${input('v', label, value, hint)}</div>`, onOk: (f) => ok(f.get('v')) });
}

/** Comentario de celda. */
export function commentDialog(h: DialogHost): void {
  const { r, c } = h.active();
  const cur = h.doc.engine.getCell(h.sheet(), r, c)?.c ?? '';
  h.open({
    title: `Comentario de ${cellName(r, c)}`,
    body: `<div class="dlg-grid"><iswc-textarea data-f="text" label="Comentario" value="${esc(cur)}" rows="4"></iswc-textarea></div>`,
    onOk: (f) => {
      h.doc.setComment(h.sheet(), r, c, f.get('text'));
      h.record('comentario', cellName(r, c), f.get('text'));
    },
  });
}

/** Ayuda breve del lenguaje de macros. */
export const MACRO_HELP = `# Variables y texto
sea total = 0
sea nombre = "Hoja"

# Control de flujo
si total > 10 { mensaje("alto") } sino { mensaje("bajo") }
mientras total < 3 { total += 1 }
para f en 2..ultimaFila("A") { poner(f, 2, celda(f, 1) * 2) }
para x en ["a", "b"] { imprimir(x) }

# Funciones propias
funcion doble(x) { retorna x * 2 }

# Hoja
leer("A1")   escribir("B1", "=SUM(A:A)")   limpiar("A1:B2")
seleccionar("A1")   seleccion()   filaActual()   columnaActual()
formato("A1:B2", {negrita: verdadero, relleno: "#ffe08a", alineacion: "centro"})
formatoNumero("B:B", "$#,##0.00")   bordes("A1:B2", "all")   combinar("A1:C1")
insertarFilas(2, 1)   borrarColumnas("C", 1)   ordenar("A1:B9", "B", verdadero)
rellenar("A1:A2", "A1:A9")   copiar("A1:A3", "C1")   calcular("=PROMEDIO(A:A)")
hoja("Datos")   nuevaHoja("Resumen")   inmovilizar(1, 0)
mensaje("Listo")   imprimir("depuración")`;
