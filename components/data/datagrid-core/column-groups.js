/**
 * datagrid-core/column-groups — Grupos de columnas y traducción del `TGridColumn` de ISP.
 *
 * ISP declara las columnas como un RECORD anidado
 * (`ISP-SvelteComponents/src/lib/base/Grid.svelte` · `toAgGridColumns`):
 *
 *   {
 *     codigo: { caption: 'Código', size: 90 },
 *     contacto: {                       // ← grupo: tiene `children`
 *       caption: 'Contacto',
 *       children: { correo: {…}, telefono: {…} },
 *     },
 *   }
 *
 * Aquí se traduce ese record a lo que consume el motor:
 *   - `columns`: ColumnDef[] planas y EN ORDEN de renderizado.
 *   - `groups`:  árbol de cabeceras de grupo (para las filas extra del header).
 *   - `colIDFields`: Map colId → campo real, igual que ISP (los colId llevan un
 *     sufijo único para que dos grupos puedan repetir el mismo campo).
 *
 * También expone `groupHeaderRows()` que aplana el árbol en filas de cabecera
 * listas para pintar (una por nivel), con el tramo de columnas que abarca cada
 * celda de grupo.
 */

import { ColumnType, FilterType } from './types.js';

let uid = 0;
const nextId = () => `c${(uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Tipos de ISP → tipos del motor. `dateTime` y `currency` se conservan tal cual. */
const ISP_TYPE = Object.freeze({
  text: ColumnType.TEXT,
  bool: ColumnType.BOOLEAN,
  boolean: ColumnType.BOOLEAN,
  number: ColumnType.NUMBER,
  date: ColumnType.DATE,
  dateTime: 'dateTime',
  currency: 'currency',
});

/**
 * Filtro por defecto de una columna según ISP:
 *   - `mode: 'lista'`  → filtro por tipo (`filter: true` en ISP).
 *   - `mode: 'filtro'` → siempre texto (`agTextColumnFilter` en ISP).
 *   - booleano         → filtro de conjunto (`agSetColumnFilter` en ISP).
 *   - dateTime         → filtro de fecha (`agDateColumnFilter` en ISP).
 * @param {string} type
 * @param {'lista'|'filtro'} mode
 * @returns {string}
 */
export function ispFilterFor(type, mode) {
  if (type === ColumnType.BOOLEAN) return FilterType.SET;
  if (type === 'dateTime' || type === ColumnType.DATE) return FilterType.DATE;
  if (mode === 'lista') {
    if (type === ColumnType.NUMBER || type === 'currency') return FilterType.NUMBER;
    return FilterType.TEXT;
  }
  return FilterType.TEXT;
}

/**
 * Traduce el `TGridColumn` de ISP a defs planas + árbol de grupos.
 *
 * @param {Record<string, any>} cols  TGridColumn de ISP.
 * @param {{mode?: 'lista'|'filtro', defaults?: Object, colIDFields?: Map<string,string>}} [opts]
 * @returns {{columns: Array<Object>, groups: Array<Object>, colIDFields: Map<string,string>}}
 */
export function toColumnDefs(cols, opts = {}) {
  const mode = opts.mode ?? 'filtro';
  const defaults = opts.defaults ?? {};
  const colIDFields = opts.colIDFields ?? new Map();
  const columns = [];

  const isGroup = (x) => x && typeof x === 'object' && x.children != null;

  /** @returns {Array<Object>} nodos de grupo de este nivel */
  function walk(node) {
    const out = [];
    for (const [key, def] of Object.entries(node ?? {})) {
      if (!def || typeof def !== 'object') continue;
      const colId = `${key}-${nextId()}`;
      colIDFields.set(colId, key);

      if (isGroup(def)) {
        const children = walk(def.children);
        // Un grupo sin hojas no se pinta (mismo criterio que ISP).
        if (!children.length) continue;
        out.push({
          kind: 'group',
          groupId: colId,
          headerName: def.caption ?? key,
          align: def.align ?? 'center',
          children,
        });
        continue;
      }

      const type = ISP_TYPE[def.type] ?? ColumnType.TEXT;
      const align = def.align ?? (type === ColumnType.BOOLEAN
        ? 'center'
        : (type === ColumnType.NUMBER || type === 'currency' ? 'right' : 'left'));

      /** @type {Object} ColumnDef del motor */
      const colDef = {
        ...defaults,
        colId,
        field: key,
        headerName: def.caption ?? key,
        type,
        align,
        width: def.size ?? defaults.width ?? 120,
        minWidth: defaults.minWidth ?? 100,
        flex: def.size ? undefined : (defaults.flex ?? 1),
        hide: def.visible === false,
        sortable: true,
        resizable: true,
        // ISP: `editable: false` en el defaultColDef; sólo se edita si se pide.
        editable: def.editable === true,
        rowGroup: def.group === true,
        enableRowGroup: mode === 'lista',
        filter: def.filter === false ? false : ispFilterFor(type, mode),
        currency: def.currency,
        decimals: def.decimals,
        dateFormat: def.dateFormat,
        format: def.format,
        valueGetter: def.GetDisplayValue ? undefined : def.valueGetter,
        // Espejo de ISP: GetDisplayValue (async) y GetDisplayText (render).
        GetDisplayValue: def.GetDisplayValue,
        GetDisplayText: def.GetDisplayText,
      };
      if (def.orderby) colDef.sort = def.orderby;

      columns.push(colDef);
      out.push({ kind: 'leaf', colId, headerName: colDef.headerName });
    }
    return out;
  }

  const groups = walk(cols);
  return { columns, groups, colIDFields };
}

/**
 * Profundidad del árbol de grupos (0 = sin grupos, sólo la fila de columnas).
 * @param {Array<Object>} groups
 * @returns {number}
 */
export function groupDepth(groups) {
  let max = 0;
  for (const n of groups ?? []) {
    if (n.kind !== 'group') continue;
    max = Math.max(max, 1 + groupDepth(n.children));
  }
  return max;
}

/**
 * Aplana el árbol en FILAS de cabecera (una por nivel de grupo). Cada celda
 * declara los colId que abarca, para que el render calcule su ancho sumando
 * los anchos vigentes (así el resize de una hoja reajusta su grupo).
 *
 * @param {Array<Object>} groups
 * @param {(colId: string) => boolean} isVisible  filtra columnas ocultas
 * @returns {Array<Array<{groupId: string|null, headerName: string, colIds: string[]}>>}
 */
export function groupHeaderRows(groups, isVisible = () => true) {
  const depth = groupDepth(groups);
  if (depth === 0) return [];

  // 1) Para cada hoja visible, su cadena de grupos ancestros (por nivel).
  /** @type {Array<{colId: string, chain: Array<{groupId: string, headerName: string}|null>}>} */
  const leaves = [];
  (function walk(nodes, chain) {
    for (const node of nodes ?? []) {
      if (node.kind === 'group') {
        walk(node.children, [...chain, { groupId: node.groupId, headerName: node.headerName }]);
      } else if (isVisible(node.colId)) {
        leaves.push({ colId: node.colId, chain });
      }
    }
  })(groups, []);

  // 2) Por nivel, se funden hojas consecutivas que comparten el mismo grupo.
  const rows = [];
  for (let level = 0; level < depth; level++) {
    const row = [];
    for (const leaf of leaves) {
      const anc = leaf.chain[level] ?? null;
      const prev = row[row.length - 1];
      if (prev && prev.groupId === (anc?.groupId ?? null) && (anc || prev.groupId === null)) {
        // Sólo se funden celdas de un mismo grupo real; los huecos quedan sueltos.
        if (anc) { prev.colIds.push(leaf.colId); continue; }
      }
      row.push({
        groupId: anc?.groupId ?? null,
        headerName: anc?.headerName ?? '',
        colIds: [leaf.colId],
      });
    }
    rows.push(row);
  }
  return rows;
}
