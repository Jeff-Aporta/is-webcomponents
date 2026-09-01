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
import type { AlignName, ColumnDef, ColumnTypeName, SortDirName } from './types.js';

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
export function ispFilterFor(type: string, mode: 'lista'|'filtro') {
  if (type === ColumnType.BOOLEAN) return FilterType.SET;
  if (type === 'dateTime' || type === ColumnType.DATE) return FilterType.DATE;
  if (mode === 'lista') {
    if (type === ColumnType.NUMBER || type === 'currency') return FilterType.NUMBER;
    return FilterType.TEXT;
  }
  return FilterType.TEXT;
}

/**
 * Nodo de `TGridColumn` tal y como lo manda ISP. Es un arbol: los nodos con
 * `children` son grupos de cabecera y el resto son columnas.
 */
export interface IspColumn {
  children?: Record<string, IspColumn>;
  caption?: string;
  align?: AlignName;
  type?: string;
  size?: number;
  visible?: boolean;
  editable?: boolean;
  group?: boolean;
  filter?: boolean;
  orderby?: SortDirName;
  currency?: string;
  decimals?: number;
  dateFormat?: string;
  format?: (v: unknown) => string;
  valueGetter?: (row: Record<string, unknown>) => unknown;
  /** Resolucion asincrona del valor (espejo de ISP). */
  GetDisplayValue?: (row: Record<string, unknown>) => Promise<unknown>;
  /** Render del texto ya resuelto (espejo de ISP). */
  GetDisplayText?: (row: Record<string, unknown>) => string;
}

/**
 * Lo que produce la traduccion: la columna del motor mas los campos que solo
 * entiende la capa ISP. Se declara aparte de `ColumnDef` porque esos extras no
 * son parte del contrato del motor y no deben colarse en el.
 */
export interface IspColumnDef extends Omit<ColumnDef, 'type'> {
  /**
   * ISP maneja tipos que el motor no conoce (`currency`, `dateTime`): se
   * ensancha aqui en vez de meterlos en el vocabulario del motor, que no sabe
   * tratarlos.
   */
  type?: ColumnTypeName | 'currency' | 'dateTime';
  format?: (v: unknown) => string;
  currency?: string;
  decimals?: number;
  dateFormat?: string;
  sort?: SortDirName;
  GetDisplayValue?: (row: Record<string, unknown>) => Promise<unknown>;
  GetDisplayText?: (row: Record<string, unknown>) => string;
}

export interface GroupNode {
  kind: 'group';
  groupId: string;
  headerName: string;
  align: AlignName;
  children: TreeNode[];
}

export interface LeafNode {
  kind: 'leaf';
  colId: string;
  headerName: string;
}

/** Discriminada por `kind`. */
export type TreeNode = GroupNode | LeafNode;

/** Traduce el `TGridColumn` de ISP a defs planas mas el arbol de grupos. */
export function toColumnDefs(
  cols: Record<string, IspColumn>,
  opts: {
    mode?: 'lista' | 'filtro';
    /** Base sobre la que se construye cada columna. */
    defaults?: Partial<IspColumnDef>;
    /** Se rellena con colId -> campo original; puede venir dada para reusarla. */
    colIDFields?: Map<string, string>;
  } = {},
): { columns: IspColumnDef[]; groups: TreeNode[]; colIDFields: Map<string, string> } {
  const mode = opts.mode ?? 'filtro';
  const defaults = opts.defaults ?? {};
  const colIDFields = opts.colIDFields ?? new Map();
  const columns: IspColumnDef[] = [];

  const isGroup = (x: IspColumn): boolean => x != null && typeof x === 'object' && x.children != null;

  /** Nodos de este nivel del arbol. Recursiva, asi que el tipo va explicito. */
  function walk(node: Record<string, IspColumn> | undefined): TreeNode[] {
    const out: TreeNode[] = [];
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

      const type = (def.type != null ? ISP_TYPE[def.type as keyof typeof ISP_TYPE] : undefined)
        ?? ColumnType.TEXT;
      const align = def.align ?? (type === ColumnType.BOOLEAN
        ? 'center'
        : (type === ColumnType.NUMBER || type === 'currency' ? 'right' : 'left'));

      const colDef: IspColumnDef = {
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
      out.push({ kind: 'leaf', colId, headerName: colDef.headerName ?? key });
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
export function groupDepth(groups: readonly TreeNode[]): number {
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
export function groupHeaderRows(
  groups: readonly TreeNode[],
  isVisible: (colId: string) => boolean = () => true,
) {
  const depth = groupDepth(groups);
  if (depth === 0) return [];

  // 1) Para cada hoja visible, su cadena de grupos ancestros (por nivel).
  /** @type {Array<{colId: string, chain: Array<{groupId: string, headerName: string}|null>}>} */
  /** Una hoja visible con la cadena de grupos que la cubre, de fuera a dentro. */
  interface Ancestro { groupId: string; headerName: string }
  const leaves: { colId: string; chain: Ancestro[] }[] = [];
  (function walk(nodes: readonly TreeNode[], chain: Ancestro[]): void {
    for (const node of nodes ?? []) {
      if (node.kind === 'group') {
        walk(node.children, [...chain, { groupId: node.groupId, headerName: node.headerName }]);
      } else if (isVisible(node.colId)) {
        leaves.push({ colId: node.colId, chain });
      }
    }
  })(groups, []);

  // 2) Por nivel, se funden hojas consecutivas que comparten el mismo grupo.
  /** Celda de cabecera: un grupo (o un hueco) sobre una o varias columnas. */
  interface Celda { groupId: string | null; headerName: string; colIds: string[] }
  const rows: Celda[][] = [];
  for (let level = 0; level < depth; level++) {
    const row: Celda[] = [];
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
