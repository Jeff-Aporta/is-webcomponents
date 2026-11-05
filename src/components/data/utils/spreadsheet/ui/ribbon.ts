// ribbon.ts — definición de la cinta y de los menús. Solo datos y su HTML con componentes del kit;
// cada elemento lleva un `cmd` que el componente despacha.
import { NUMBER_FORMATS } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/numfmt.js';
import { esc } from './render.js';
import type { RibbonItem, MenuItem, RibbonTab } from './ribbon.schemas.js';

/** Muestras de los selectores de color: se asignan por propiedad, ya actualizados. */
export const SWATCHES = ['#000000', '#ffffff', '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0', '#f2f2f2', '#d9d9d9', '#fce4d6', '#fff2cc', '#e2efda', '#ddebf7'];

const FONTS = ['Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];
const BORDERS: MenuItem[] = [
  { cmd: 'border', arg: 'all', label: 'Todos los bordes', icon: 'mdi:border-all' },
  { cmd: 'border', arg: 'outer', label: 'Borde exterior', icon: 'mdi:border-outside' },
  { cmd: 'border', arg: 'inner', label: 'Bordes interiores', icon: 'mdi:border-inside' },
  { cmd: 'border', arg: 'top', label: 'Superior', icon: 'mdi:border-top' },
  { cmd: 'border', arg: 'bottom', label: 'Inferior', icon: 'mdi:border-bottom' },
  { cmd: 'border', arg: 'left', label: 'Izquierdo', icon: 'mdi:border-left' },
  { cmd: 'border', arg: 'right', label: 'Derecho', icon: 'mdi:border-right' },
  {},
  { cmd: 'border-thick', label: 'Borde exterior grueso', icon: 'mdi:border-outside' },
  { cmd: 'border-double', label: 'Doble inferior', icon: 'mdi:border-bottom-variant' },
  {},
  { cmd: 'border', arg: 'none', label: 'Sin bordes', icon: 'mdi:border-none' },
];
const CF_MENU: MenuItem[] = [
  { cmd: 'cf-dialog', arg: 'cell', label: 'Resaltar celdas…', icon: 'mdi:format-color-highlight' },
  { cmd: 'cf-dialog', arg: 'text', label: 'Texto que contiene…', icon: 'mdi:format-text' },
  { cmd: 'cf-dialog', arg: 'formula', label: 'Con una fórmula…', icon: 'mdi:function-variant' },
  { cmd: 'cf-dialog', arg: 'top', label: 'Reglas superiores…', icon: 'mdi:sort-numeric-descending' },
  {},
  { cmd: 'cf-quick', arg: 'duplicate', label: 'Valores duplicados', icon: 'mdi:content-duplicate' },
  { cmd: 'cf-quick', arg: 'aboveAverage', label: 'Sobre el promedio', icon: 'mdi:chart-bell-curve' },
  { cmd: 'cf-quick', arg: 'dataBar', label: 'Barras de datos', icon: 'mdi:chart-bar' },
  { cmd: 'cf-quick', arg: 'colorScale', label: 'Escala de color', icon: 'mdi:gradient-horizontal' },
  { cmd: 'cf-quick', arg: 'iconSet', label: 'Conjunto de iconos', icon: 'mdi:arrow-up-bold' },
  {},
  { cmd: 'cf-manage', label: 'Administrar reglas…', icon: 'mdi:format-list-checks' },
  { cmd: 'cf-clear', label: 'Borrar reglas de la hoja', icon: 'mdi:eraser' },
];
const CLEAR_MENU: MenuItem[] = [
  { cmd: 'clear-all', label: 'Borrar todo' },
  { cmd: 'clear-formats', label: 'Borrar formatos' },
  { cmd: 'clear-contents', label: 'Borrar contenido', key: 'Supr' },
  { cmd: 'clear-comments', label: 'Borrar comentarios' },
];
const CHARTS: MenuItem[] = [
  { cmd: 'chart', arg: 'bar', label: 'Columnas', icon: 'mdi:chart-bar' },
  { cmd: 'chart', arg: 'bar-h', label: 'Barras', icon: 'mdi:chart-gantt' },
  { cmd: 'chart', arg: 'line', label: 'Líneas', icon: 'mdi:chart-line' },
  { cmd: 'chart', arg: 'pie', label: 'Circular', icon: 'mdi:chart-pie' },
  { cmd: 'chart', arg: 'doughnut', label: 'Anillo', icon: 'mdi:chart-donut' },
  { cmd: 'chart', arg: 'scatter', label: 'Dispersión', icon: 'mdi:chart-scatter-plot' },
  { cmd: 'chart', arg: 'radar', label: 'Radial', icon: 'mdi:radar' },
];
const FREEZE_MENU: MenuItem[] = [
  { cmd: 'freeze', arg: 'cell', label: 'Inmovilizar en la selección', icon: 'mdi:table-lock' },
  { cmd: 'freeze', arg: 'row', label: 'Inmovilizar fila superior', icon: 'mdi:table-row' },
  { cmd: 'freeze', arg: 'col', label: 'Inmovilizar primera columna', icon: 'mdi:table-column' },
  { cmd: 'freeze', arg: 'none', label: 'Movilizar paneles', icon: 'mdi:table-off' },
];

/** Cinta completa. */
const RIBBON: RibbonTab[] = [
  {
    id: 'home', label: 'Inicio', groups: [
      { label: 'Historial', items: [
        { cmd: 'undo', label: 'Deshacer (Ctrl+Z)', icon: 'mdi:undo' },
        { cmd: 'redo', label: 'Rehacer (Ctrl+Y)', icon: 'mdi:redo' },
      ] },
      { label: 'Portapapeles', items: [
        { cmd: 'paste', label: 'Pegar (Ctrl+V)', icon: 'mdi:content-paste' },
        { cmd: 'cut', label: 'Cortar (Ctrl+X)', icon: 'mdi:content-cut' },
        { cmd: 'copy', label: 'Copiar (Ctrl+C)', icon: 'mdi:content-copy' },
        { cmd: 'painter', label: 'Copiar formato', icon: 'mdi:format-paint', kind: 'toggle' },
      ] },
      { label: 'Fuente', items: [
        { cmd: 'font', label: 'Fuente', kind: 'select', options: FONTS.map((f) => ({ value: f, label: f })) },
        { cmd: 'size', label: 'Tamaño', kind: 'select', options: SIZES.map((s) => ({ value: String(s), label: String(s) })) },
        { cmd: 'bold', label: 'Negrita (Ctrl+B)', icon: 'mdi:format-bold', kind: 'toggle' },
        { cmd: 'italic', label: 'Cursiva (Ctrl+I)', icon: 'mdi:format-italic', kind: 'toggle' },
        { cmd: 'underline', label: 'Subrayado (Ctrl+U)', icon: 'mdi:format-underline', kind: 'toggle' },
        { cmd: 'strike', label: 'Tachado (Ctrl+5)', icon: 'mdi:format-strikethrough', kind: 'toggle' },
        { cmd: 'borders', label: 'Bordes', icon: 'mdi:border-all', kind: 'menu', menu: BORDERS },
        { cmd: 'bg', label: 'Color de relleno', icon: 'mdi:format-color-fill', kind: 'color' },
        { cmd: 'color', label: 'Color de fuente', icon: 'mdi:format-color-text', kind: 'color' },
      ] },
      { label: 'Alineación', items: [
        { cmd: 'align-left', label: 'Alinear a la izquierda', icon: 'mdi:format-align-left', kind: 'toggle' },
        { cmd: 'align-center', label: 'Centrar', icon: 'mdi:format-align-center', kind: 'toggle' },
        { cmd: 'align-right', label: 'Alinear a la derecha', icon: 'mdi:format-align-right', kind: 'toggle' },
        { cmd: 'valign-top', label: 'Arriba', icon: 'mdi:format-align-top', kind: 'toggle' },
        { cmd: 'valign-middle', label: 'En medio', icon: 'mdi:format-align-middle', kind: 'toggle' },
        { cmd: 'valign-bottom', label: 'Abajo', icon: 'mdi:format-align-bottom', kind: 'toggle' },
        { cmd: 'wrap', label: 'Ajustar texto', icon: 'mdi:wrap', kind: 'toggle' },
        { cmd: 'merges', label: 'Combinar', icon: 'mdi:table-merge-cells', kind: 'menu', menu: [
          { cmd: 'merge-center', label: 'Combinar y centrar' },
          { cmd: 'merge', label: 'Combinar celdas' },
          { cmd: 'merge-across', label: 'Combinar horizontalmente' },
          { cmd: 'unmerge', label: 'Separar celdas' },
        ] },
      ] },
      { label: 'Número', items: [
        { cmd: 'numfmt', label: 'Formato de número', kind: 'select', options: NUMBER_FORMATS.map((f) => ({ value: f.id, label: f.label })) },
        { cmd: 'currency', label: 'Moneda', icon: 'mdi:currency-usd' },
        { cmd: 'percent', label: 'Porcentaje', icon: 'mdi:percent' },
        { cmd: 'comma', label: 'Miles', icon: 'mdi:comma' },
        { cmd: 'dec-more', label: 'Más decimales', icon: 'mdi:decimal-increase' },
        { cmd: 'dec-less', label: 'Menos decimales', icon: 'mdi:decimal-decrease' },
      ] },
      { label: 'Estilos', items: [
        { cmd: 'cf', label: 'Formato condicional', icon: 'mdi:palette-swatch-outline', kind: 'menu', menu: CF_MENU },
        { cmd: 'table-style', label: 'Dar formato de tabla', icon: 'mdi:table-large' },
        { cmd: 'format-dialog', label: 'Formato de celdas (Ctrl+1)', icon: 'mdi:format-paint' },
      ] },
      { label: 'Celdas', items: [
        { cmd: 'inserts', label: 'Insertar', icon: 'mdi:table-row-plus-after', kind: 'menu', menu: [
          { cmd: 'insert-row', label: 'Insertar filas', icon: 'mdi:table-row-plus-before' },
          { cmd: 'insert-col', label: 'Insertar columnas', icon: 'mdi:table-column-plus-before' },
          { cmd: 'sheet-add', label: 'Insertar hoja', icon: 'mdi:tab-plus' },
        ] },
        { cmd: 'deletes', label: 'Eliminar', icon: 'mdi:table-row-remove', kind: 'menu', menu: [
          { cmd: 'delete-row', label: 'Eliminar filas', icon: 'mdi:table-row-remove' },
          { cmd: 'delete-col', label: 'Eliminar columnas', icon: 'mdi:table-column-remove' },
        ] },
        { cmd: 'formats', label: 'Formato', icon: 'mdi:arrow-expand-horizontal', kind: 'menu', menu: [
          { cmd: 'row-height', label: 'Alto de fila…' },
          { cmd: 'col-width', label: 'Ancho de columna…' },
          { cmd: 'autofit-col', label: 'Autoajustar columnas' },
          { cmd: 'autofit-row', label: 'Autoajustar filas' },
          {},
          { cmd: 'hide-row', label: 'Ocultar filas' },
          { cmd: 'unhide-row', label: 'Mostrar filas' },
          { cmd: 'hide-col', label: 'Ocultar columnas' },
          { cmd: 'unhide-col', label: 'Mostrar columnas' },
        ] },
      ] },
      { label: 'Edición', items: [
        { cmd: 'autosum', label: 'Autosuma (Alt+=)', icon: 'mdi:sigma' },
        { cmd: 'fills', label: 'Rellenar', icon: 'mdi:arrow-down-bold-box-outline', kind: 'menu', menu: [
          { cmd: 'fill-down', label: 'Hacia abajo', key: 'Ctrl+D' },
          { cmd: 'fill-right', label: 'Hacia la derecha', key: 'Ctrl+R' },
          { cmd: 'flash-fill', label: 'Relleno rápido', key: 'Ctrl+E' },
        ] },
        { cmd: 'clears', label: 'Borrar', icon: 'mdi:eraser', kind: 'menu', menu: CLEAR_MENU },
        { cmd: 'sorts', label: 'Ordenar y filtrar', icon: 'mdi:sort', kind: 'menu', menu: [
          { cmd: 'sort-asc', label: 'Ordenar A → Z', icon: 'mdi:sort-alphabetical-ascending' },
          { cmd: 'sort-desc', label: 'Ordenar Z → A', icon: 'mdi:sort-alphabetical-descending' },
          { cmd: 'sort-dialog', label: 'Orden personalizado…', icon: 'mdi:sort' },
          {},
          { cmd: 'filter', label: 'Filtro', icon: 'mdi:filter-outline', key: 'Ctrl+Mayús+L' },
        ] },
        { cmd: 'find', label: 'Buscar y reemplazar (Ctrl+F)', icon: 'mdi:magnify' },
      ] },
    ],
  },
  {
    id: 'insert', label: 'Insertar', groups: [
      { label: 'Gráficos', items: [
        { cmd: 'chart', label: 'Columnas', icon: 'mdi:chart-bar', big: true },
        { cmd: 'charts', label: 'Otros gráficos', icon: 'mdi:chart-box-outline', kind: 'menu', menu: CHARTS, big: true },
      ] },
      { label: 'Celdas', items: [
        { cmd: 'comment', label: 'Comentario (Mayús+F2)', icon: 'mdi:comment-text-outline', big: true },
        { cmd: 'link', label: 'Vínculo (Ctrl+K)', icon: 'mdi:link-variant', big: true },
      ] },
      { label: 'Hojas', items: [
        { cmd: 'sheet-add', label: 'Hoja nueva', icon: 'mdi:tab-plus', big: true },
      ] },
    ],
  },
  {
    id: 'formulas', label: 'Fórmulas', groups: [
      { label: 'Biblioteca', items: [
        { cmd: 'fx', label: 'Insertar función (Mayús+F3)', icon: 'mdi:function-variant', big: true },
        { cmd: 'autosum', label: 'Autosuma', icon: 'mdi:sigma', big: true },
      ] },
      { label: 'Nombres', items: [
        { cmd: 'names', label: 'Administrador de nombres', icon: 'mdi:tag-text-outline', big: true },
        { cmd: 'define-name', label: 'Definir nombre', icon: 'mdi:tag-plus-outline', big: true },
      ] },
      { label: 'Auditoría', items: [
        { cmd: 'show-formulas', label: 'Mostrar fórmulas (Ctrl+`)', icon: 'mdi:code-equal', kind: 'toggle', big: true },
        { cmd: 'recalc', label: 'Calcular ahora (F9)', icon: 'mdi:calculator-variant-outline', big: true },
      ] },
    ],
  },
  {
    id: 'data', label: 'Datos', groups: [
      { label: 'Archivos', items: [
        { cmd: 'import', label: 'Abrir XLSX o CSV', icon: 'mdi:file-upload-outline', big: true },
        { cmd: 'export-xlsx', label: 'Guardar XLSX', icon: 'mdi:microsoft-excel', big: true },
        { cmd: 'export-csv', label: 'Guardar CSV', icon: 'mdi:file-delimited-outline', big: true },
      ] },
      { label: 'Ordenar y filtrar', items: [
        { cmd: 'sort-asc', label: 'A → Z', icon: 'mdi:sort-alphabetical-ascending', big: true },
        { cmd: 'sort-desc', label: 'Z → A', icon: 'mdi:sort-alphabetical-descending', big: true },
        { cmd: 'sort-dialog', label: 'Ordenar…', icon: 'mdi:sort', big: true },
        { cmd: 'filter', label: 'Filtro', icon: 'mdi:filter-outline', kind: 'toggle', big: true },
      ] },
      { label: 'Herramientas', items: [
        { cmd: 'text-columns', label: 'Texto en columnas', icon: 'mdi:table-split-cell', big: true },
        { cmd: 'dedupe', label: 'Quitar duplicados', icon: 'mdi:content-duplicate', big: true },
        { cmd: 'validation', label: 'Validación de datos', icon: 'mdi:check-decagram-outline', big: true },
        { cmd: 'goal-seek', label: 'Buscar objetivo', icon: 'mdi:target', big: true },
      ] },
    ],
  },
  {
    id: 'review', label: 'Revisar', groups: [
      { label: 'Comentarios', items: [
        { cmd: 'comment', label: 'Comentario', icon: 'mdi:comment-text-outline', big: true },
        { cmd: 'clear-comments', label: 'Eliminar comentarios', icon: 'mdi:comment-remove-outline', big: true },
      ] },
      { label: 'Revisión', items: [
        { cmd: 'find', label: 'Buscar', icon: 'mdi:magnify', big: true },
        { cmd: 'goto', label: 'Ir a (Ctrl+G)', icon: 'mdi:target-variant', big: true },
      ] },
    ],
  },
  {
    id: 'view', label: 'Vista', groups: [
      { label: 'Paneles', items: [
        { cmd: 'freezes', label: 'Inmovilizar', icon: 'mdi:table-lock', kind: 'menu', menu: FREEZE_MENU, big: true },
      ] },
      { label: 'Mostrar', items: [
        { cmd: 'gridlines', label: 'Cuadrícula', icon: 'mdi:grid', kind: 'toggle', big: true },
        { cmd: 'formula-bar', label: 'Barra de fórmulas', icon: 'mdi:form-textbox', kind: 'toggle', big: true },
        { cmd: 'show-formulas', label: 'Fórmulas', icon: 'mdi:code-equal', kind: 'toggle', big: true },
      ] },
      { label: 'Zoom', items: [
        { cmd: 'zoom-out', label: 'Alejar', icon: 'mdi:magnify-minus-outline', big: true },
        { cmd: 'zoom-reset', label: '100 %', icon: 'mdi:magnify-scan', big: true },
        { cmd: 'zoom-in', label: 'Acercar', icon: 'mdi:magnify-plus-outline', big: true },
      ] },
    ],
  },
  {
    id: 'macros', label: 'Macros', groups: [
      { label: 'Código', items: [
        { cmd: 'macro-editor', label: 'Editor de macros (Alt+F8)', icon: 'mdi:code-braces', big: true },
        { cmd: 'macro-record', label: 'Grabar macro', icon: 'mdi:record-circle-outline', kind: 'toggle', big: true },
      ] },
    ],
  },
];

/** Atributo title seguro. */
const attr = (s: string): string => esc(s);

/** HTML de un botón de la cinta. */
function itemHtml(i: RibbonItem): string {
  if (i.kind === 'select') {
    const opts = (i.options ?? []).map((o) => `<iswc-option value="${attr(o.value)}">${esc(o.label)}</iswc-option>`).join('');
    return `<iswc-select class="rb-select rb-${i.cmd}" data-cmd="${i.cmd}" aria-label="${attr(i.label)}" title="${attr(i.label)}">${opts}</iswc-select>`;
  }
  if (i.kind === 'color') {
    return `<span class="rb-color" title="${attr(i.label)}"><iswc-icon icon="${i.icon}"></iswc-icon><iswc-color-picker data-cmd="${i.cmd}" aria-label="${attr(i.label)}"></iswc-color-picker></span>`;
  }
  const caret = i.kind === 'menu' ? ' with-caret' : '';
  const label = i.big ? `<span class="rb-big-label">${esc(i.label.replace(/\s*\(.*\)$/, ''))}</span>` : '';
  return `<iswc-button class="rb-btn${i.big ? ' big' : ''}" variant="text" color="neutral" shape="round" data-cmd="${i.cmd}" data-kind="${i.kind ?? 'button'}" title="${attr(i.label)}" aria-label="${attr(i.label)}"${caret}><iswc-icon icon="${i.icon}"></iswc-icon>${label}</iswc-button>`;
}

/** HTML de la cinta completa. */
export function ribbonHtml(): string {
  const tabs = RIBBON.map((t) => `<iswc-tab slot="nav" panel="${t.id}">${esc(t.label)}</iswc-tab>`).join('');
  const panels = RIBBON.map((t) => {
    const groups = t.groups.map((g) => `<div class="rb-group" role="group" aria-label="${attr(g.label)}"><div class="rb-items">${g.items.map(itemHtml).join('')}</div><div class="rb-label">${esc(g.label)}</div></div>`).join('');
    return `<iswc-tab-panel name="${t.id}"><div class="rb-panel" role="toolbar" aria-label="${attr(t.label)}">${groups}</div></iswc-tab-panel>`;
  }).join('');
  return `<iswc-tab-group active="home" activation="manual" without-scroll-controls>${tabs}${panels}</iswc-tab-group>`;
}

/** Busca un elemento de la cinta por comando. */
export function ribbonItem(cmd: string): RibbonItem | null {
  for (const t of RIBBON) for (const g of t.groups) for (const i of g.items) if (i.cmd === cmd) return i;
  return null;
}

/** HTML de un menú dentro de `iswc-context-menu`. */
export function menuHtml(items: MenuItem[]): string {
  return items.map((m) => {
    if (!m.cmd) return '<hr class="mn-sep">';
    const icon = m.icon ? `<iswc-icon icon="${m.icon}"></iswc-icon>` : '<span class="mn-noicon"></span>';
    const key = m.key ? `<kbd>${esc(m.key)}</kbd>` : '';
    return `<button class="item" data-value="${attr(m.cmd)}" data-arg="${attr(m.arg ?? '')}"${m.disabled ? ' disabled' : ''}>${icon}<span>${esc(m.label ?? '')}</span>${key}</button>`;
  }).join('');
}

/** Menú contextual de celdas. */
export const CELL_MENU: MenuItem[] = [
  { cmd: 'cut', label: 'Cortar', icon: 'mdi:content-cut', key: 'Ctrl+X' },
  { cmd: 'copy', label: 'Copiar', icon: 'mdi:content-copy', key: 'Ctrl+C' },
  { cmd: 'paste', label: 'Pegar', icon: 'mdi:content-paste', key: 'Ctrl+V' },
  { cmd: 'paste-special', label: 'Pegado especial…', icon: 'mdi:clipboard-text-outline' },
  {},
  { cmd: 'insert-row', label: 'Insertar filas', icon: 'mdi:table-row-plus-before' },
  { cmd: 'insert-col', label: 'Insertar columnas', icon: 'mdi:table-column-plus-before' },
  { cmd: 'delete-row', label: 'Eliminar filas', icon: 'mdi:table-row-remove' },
  { cmd: 'delete-col', label: 'Eliminar columnas', icon: 'mdi:table-column-remove' },
  { cmd: 'clear-contents', label: 'Borrar contenido', icon: 'mdi:eraser', key: 'Supr' },
  {},
  { cmd: 'sort-asc', label: 'Ordenar A → Z', icon: 'mdi:sort-alphabetical-ascending' },
  { cmd: 'sort-desc', label: 'Ordenar Z → A', icon: 'mdi:sort-alphabetical-descending' },
  { cmd: 'filter', label: 'Filtro', icon: 'mdi:filter-outline' },
  {},
  { cmd: 'comment', label: 'Comentario', icon: 'mdi:comment-text-outline', key: 'Mayús+F2' },
  { cmd: 'link', label: 'Vínculo', icon: 'mdi:link-variant', key: 'Ctrl+K' },
  { cmd: 'define-name', label: 'Definir nombre…', icon: 'mdi:tag-plus-outline' },
  { cmd: 'format-dialog', label: 'Formato de celdas…', icon: 'mdi:format-paint', key: 'Ctrl+1' },
];

/** Menú de cabecera de fila. */
export const ROW_MENU: MenuItem[] = [
  { cmd: 'insert-row', label: 'Insertar filas', icon: 'mdi:table-row-plus-before' },
  { cmd: 'delete-row', label: 'Eliminar filas', icon: 'mdi:table-row-remove' },
  { cmd: 'row-height', label: 'Alto de fila…', icon: 'mdi:arrow-expand-vertical' },
  { cmd: 'autofit-row', label: 'Autoajustar', icon: 'mdi:arrow-collapse-vertical' },
  { cmd: 'hide-row', label: 'Ocultar', icon: 'mdi:eye-off-outline' },
  { cmd: 'unhide-row', label: 'Mostrar', icon: 'mdi:eye-outline' },
];

/** Menú de cabecera de columna. */
export const COL_MENU: MenuItem[] = [
  { cmd: 'insert-col', label: 'Insertar columnas', icon: 'mdi:table-column-plus-before' },
  { cmd: 'delete-col', label: 'Eliminar columnas', icon: 'mdi:table-column-remove' },
  { cmd: 'col-width', label: 'Ancho de columna…', icon: 'mdi:arrow-expand-horizontal' },
  { cmd: 'autofit-col', label: 'Autoajustar', icon: 'mdi:arrow-collapse-horizontal' },
  { cmd: 'hide-col', label: 'Ocultar', icon: 'mdi:eye-off-outline' },
  { cmd: 'unhide-col', label: 'Mostrar', icon: 'mdi:eye-outline' },
  {},
  { cmd: 'sort-asc', label: 'Ordenar A → Z', icon: 'mdi:sort-alphabetical-ascending' },
  { cmd: 'sort-desc', label: 'Ordenar Z → A', icon: 'mdi:sort-alphabetical-descending' },
];

/** Menú de pestaña de hoja. */
export const TAB_MENU: MenuItem[] = [
  { cmd: 'sheet-rename', label: 'Cambiar nombre', icon: 'mdi:pencil-outline' },
  { cmd: 'sheet-duplicate', label: 'Duplicar', icon: 'mdi:content-copy' },
  { cmd: 'sheet-color', label: 'Color de pestaña…', icon: 'mdi:palette-outline' },
  { cmd: 'sheet-hide', label: 'Ocultar', icon: 'mdi:eye-off-outline' },
  { cmd: 'sheet-unhide', label: 'Mostrar hojas ocultas', icon: 'mdi:eye-outline' },
  {},
  { cmd: 'sheet-delete', label: 'Eliminar', icon: 'mdi:delete-outline' },
];
