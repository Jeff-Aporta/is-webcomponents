// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/nucleo-opciones — Traduce opciones con nombres de AG Grid al motor.
 *
 * Fusiona defaultColDef + columnTypes + ColDef, aplana grupos de columnas y
 * mapea los atributos HTML a su opcion. Puro: sin DOM.
 */
import type { DefAplanada, GrupoCabecera } from './nucleo-opciones.schemas.js';
import type { ColDefAg, OpcionesGrid } from './contrato.schemas.js';

/** Atributo del host → opcion. Los booleanos se activan por presencia. */
export const ATRIBUTOS: Record<string, string> = {
  'animate-rows': 'animateRows',
  'row-height': 'rowHeight',
  'header-height': 'headerHeight',
  'floating-filters': 'floatingFilters',
  'tree-data': 'treeData',
  'master-detail': 'masterDetail',
  'cell-selection': 'cellSelection',
  'row-model-type': 'rowModelType',
  'dom-layout': 'domLayout',
  'status-bar': 'statusBar',
  'side-bar': 'sideBar',
  'enable-rtl': 'enableRtl',
  'preset': 'theme',
};

const NUMERICOS = new Set(['numero', 'moneda', 'porcentaje', 'delta', 'number', 'currency', 'agAnimateShowChangeCellRenderer']);
const BOOLEANOS = new Set(['floatingFilters', 'treeData', 'masterDetail', 'cellSelection', 'enableRtl', 'sideBar', 'statusBar']);

/** Valor de un atributo ya convertido al tipo de su opcion. */
export function valorAtributo(opcion: string, crudo: string | null): unknown {
  if (crudo === null) return undefined;
  if (BOOLEANOS.has(opcion)) return crudo !== 'false';
  if (opcion === 'animateRows') return crudo !== 'false';
  if (opcion === 'rowHeight' || opcion === 'headerHeight') return Number(crudo) || undefined;
  return crudo;
}


/** Une capas sin arrastrar `undefined` ni `children`. */
function fusionar(capas: (Record<string, unknown> | undefined)[]): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const capa of capas) {
    if (!capa) continue;
    for (const [k, v] of Object.entries(capa)) if (v !== undefined) salida[k] = v;
  }
  return salida;
}

/** `type` admite el tipo logico del motor o una lista de `columnTypes`. */
function tiposDe(def: ColDefAg, columnTypes: Record<string, Record<string, unknown>>): Record<string, unknown>[] {
  const t = def['type'];
  const nombres = Array.isArray(t) ? t.map(String) : typeof t === 'string' ? t.split(',').map((s) => s.trim()) : [];
  return nombres.map((n) => columnTypes[n]).filter((c): c is Record<string, unknown> => c != null);
}

/** Aplana el arbol de ColDef/ColGroupDef en orden de pintado, con su camino de grupos. */
export function aplanarDefs(defs: ColDefAg[], opciones: OpcionesGrid): DefAplanada[] {
  const porDefecto = opciones['defaultColDef'] as Record<string, unknown> | undefined;
  const columnTypes = (opciones['columnTypes'] ?? {}) as Record<string, Record<string, unknown>>;
  const salida: DefAplanada[] = [];
  let secuencia = 0;
  const bloqueadas = opciones['suppressMovableColumns'] === true;
  if (opciones['rowNumbers']) salida.push({ colId: '__numeroFila', field: '__numeroFila', headerName: '#', width: 56, sortable: false, filter: false, resizable: false, pinned: 'left', cellRenderer: '__numeroFila', suppressMovable: true, __grupos: [] });
  const recorrer = (lista: ColDefAg[], camino: GrupoCabecera[]): void => {
    for (const def of lista) {
      const hijos = def['children'];
      if (Array.isArray(hijos)) {
        secuencia += 1;
        const grupo: GrupoCabecera = {
          id: String(def['groupId'] ?? `grupo-${secuencia}`),
          headerName: String(def['headerName'] ?? def['header'] ?? ''),
          marryChildren: def['marryChildren'] === true,
          headerClass: typeof def['headerClass'] === 'string' ? def['headerClass'] : undefined,
        };
        recorrer(hijos as ColDefAg[], [...camino, grupo]);
        continue;
      }
      const fusion = fusionar([porDefecto, ...tiposDe(def, columnTypes), def]) as DefAplanada;
      if (fusion['field'] == null) fusion.field = String(def['colId'] ?? `col-${salida.length}`);
      if (typeof fusion['type'] !== 'string' || columnTypes[String(fusion['type'])]) fusion['type'] = fusion['cellDataType'] ?? undefined;
      if (fusion['sort'] === undefined && fusion['initialSort'] !== undefined) fusion['sort'] = fusion['initialSort'];
      if (fusion['hide'] === undefined && fusion['initialHide'] !== undefined) fusion['hide'] = fusion['initialHide'];
      if (fusion['pinned'] === undefined && fusion['initialPinned'] !== undefined) fusion['pinned'] = fusion['initialPinned'];
      if (fusion['width'] === undefined && fusion['initialWidth'] !== undefined) fusion['width'] = fusion['initialWidth'];
      if (fusion['pinned'] === true) fusion['pinned'] = 'left';
      if (fusion['align'] === undefined && NUMERICOS.has(String(fusion['cellRenderer'] ?? fusion['renderer'] ?? fusion['cellDataType'] ?? ''))) fusion['align'] = 'right';
      if (bloqueadas) fusion['suppressMovable'] = true;
      fusion.__grupos = camino;
      salida.push(fusion);
    }
  };
  recorrer(defs, []);
  return salida;
}

/** SortModel inicial segun `sort`/`sortIndex` de los ColDef. */
export function ordenInicial(defs: DefAplanada[]): { colId: string; dir: 'asc' | 'desc' }[] {
  return defs
    .filter((d) => d['sort'] === 'asc' || d['sort'] === 'desc')
    .map((d, i) => ({ d, i: typeof d['sortIndex'] === 'number' ? d['sortIndex'] : i }))
    .sort((a, b) => a.i - b.i)
    .map(({ d }) => ({ colId: String(d['colId'] ?? d['field']), dir: d['sort'] as 'asc' | 'desc' }));
}

/** Sin columnas declaradas: una por clave de la primera fila (autoGenerateColumnDefs). */
export function autogenerarDefs(filas: Record<string, unknown>[]): ColDefAg[] {
  const fila = filas[0];
  if (!fila) return [];
  return Object.keys(fila).map((field) => ({ field }));
}

export function aKebab(evento: string): string {
  return evento.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
}
