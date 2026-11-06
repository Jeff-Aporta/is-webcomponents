/**
 * resumen — Calculos puros de los paneles: paginacion, agregados, side bar, columnas y menus.
 */
import type { DefItemMenu, FuncionAgregado, NodoColumna, PanelLateralDef, ResultadoAgregados, ResumenPagina, SideBarDef } from './filtros.schemas.js';
import type { ItemMenu } from './contrato.schemas.js';

const TAMANOS_DEFECTO = [20, 50, 100];
const PANELES: Record<string, PanelLateralDef> = {
  columns: { id: 'columns', labelKey: 'columns', labelDefault: 'Columnas', iconKey: 'mdi:view-column-outline', toolPanel: 'agColumnsToolPanel' },
  filters: { id: 'filters', labelKey: 'filters', labelDefault: 'Filtros', iconKey: 'mdi:filter-outline', toolPanel: 'agFiltersToolPanel' },
  'filters-new': { id: 'filters-new', labelKey: 'filtersNew', labelDefault: 'Filtros', iconKey: 'mdi:filter-outline', toolPanel: 'agNewFiltersToolPanel' },
};

/** Paginas, pagina acotada y rango visible (desde/hasta en base 1). */
export function resumenPagina(pagina: number, tam: number, total: number): ResumenPagina {
  const tamano = Math.max(1, Math.floor(tam) || 1);
  const paginas = total > 0 ? Math.ceil(total / tamano) : 0;
  const acotada = Math.min(Math.max(0, Math.floor(pagina) || 0), Math.max(0, paginas - 1));
  const desde = total ? acotada * tamano + 1 : 0;
  const hasta = total ? Math.min(total, (acotada + 1) * tamano) : 0;
  return { pagina: acotada, paginas, desde, hasta, total, tam: tamano };
}

/** Filas que caben en el area visible; al menos una. */
export function tamAutomatico(altoDisponible: number, altoFila: number): number {
  if (!(altoFila > 0)) return 1;
  return Math.max(1, Math.floor(altoDisponible / altoFila));
}

/** Opciones del selector; false lo oculta. El tamano actual siempre queda en la lista. */
export function opcionesTam(selector: unknown, actual: number): number[] {
  if (selector === false) return [];
  const base = Array.isArray(selector) ? selector.filter((n): n is number => typeof n === 'number' && n > 0) : TAMANOS_DEFECTO;
  if (!base.length) return [];
  return base.includes(actual) ? base : [...base, actual].sort((a, b) => a - b);
}

/** Agregados de la barra de estado: count cuenta no vacios, el resto solo numeros. */
export function agregados(valores: Iterable<unknown>): ResultadoAgregados {
  let count = 0;
  let sum = 0;
  let numeros = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of valores) {
    if (v == null || v === '') continue;
    count += 1;
    const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN);
    if (!Number.isFinite(n)) continue;
    numeros += 1;
    sum += n;
    min = Math.min(min, n);
    max = Math.max(max, n);
  }
  if (!numeros) return { count, sum: null, min: null, max: null, avg: null };
  return { count, sum, min, max, avg: sum / numeros };
}

/** Lista de funciones a mostrar en agAggregationComponent. */
export function funcionesAgregado(pedidas: unknown): FuncionAgregado[] {
  const todas: FuncionAgregado[] = ['avg', 'count', 'min', 'max', 'sum'];
  if (!Array.isArray(pedidas)) return todas;
  return todas.filter((f) => pedidas.includes(f));
}

function panelDe(p: unknown): PanelLateralDef | null {
  if (typeof p === 'string') return PANELES[p] ?? null;
  if (!p || typeof p !== 'object') return null;
  const def = p as PanelLateralDef;
  const base = typeof def.toolPanel === 'string' ? Object.values(PANELES).find((x) => x.toolPanel === def.toolPanel) : undefined;
  return { ...base, ...def };
}

/** Forma larga de sideBar. Cualquier atajo se expande; sin side bar devuelve null. */
export function normalizarSideBar(v: unknown): SideBarDef | null {
  if (v == null || v === false) return null;
  const crudo = v as Record<string, unknown>;
  const esDef = typeof v === 'object' && !Array.isArray(v);
  const lista: unknown[] = v === true ? ['columns', 'filters'] : typeof v === 'string' ? [v] : Array.isArray(v) ? v : (crudo['toolPanels'] as unknown[] | undefined) ?? ['columns', 'filters'];
  const toolPanels = lista.flatMap((p) => {
    const def = panelDe(p);
    return def ? [def] : [];
  });
  const porDefecto = esDef ? (crudo['defaultToolPanel'] as string | undefined) ?? null : null;
  return { toolPanels, defaultToolPanel: porDefecto, hiddenByDefault: esDef && crudo['hiddenByDefault'] === true, position: esDef && crudo['position'] === 'left' ? 'left' : 'right', hideButtons: esDef && crudo['hideButtons'] === true };
}

/** Arbol de columnas desde columnDefs: grupos con `children`, hojas con su colId. */
export function arbolColumnas(defs: unknown[], idDe: (d: Record<string, unknown>) => string | null = (d) => (d['colId'] ?? d['field'] ?? null) as string | null, prefijo = 'g'): NodoColumna[] {
  return defs.flatMap((d, i): NodoColumna[] => {
    const def = d as Record<string, unknown>;
    const hijos = def['children'];
    if (Array.isArray(hijos)) return [{ id: String(def['groupId'] ?? `${prefijo}${i}`), etiqueta: String(def['headerName'] ?? ''), colId: null, hijos: arbolColumnas(hijos, idDe, `${prefijo}${i}-`) }];
    const colId = idDe(def);
    if (colId === null) return [];
    return [{ id: colId, etiqueta: String(def['headerName'] ?? colId), colId, hijos: [] }];
  });
}

/** Hojas de un arbol de columnas. */
export function hojasColumna(nodos: NodoColumna[]): string[] {
  return nodos.flatMap((n) => n.colId !== null ? [n.colId] : hojasColumna(n.hijos));
}

/** Filtra un arbol por texto; un grupo sobrevive si coincide o le queda algun hijo. */
export function filtrarArbolColumnas(nodos: NodoColumna[], texto: string): NodoColumna[] {
  const aguja = texto.trim().toLowerCase();
  if (!aguja) return nodos;
  return nodos.flatMap((n) => {
    if (n.etiqueta.toLowerCase().includes(aguja)) return [n];
    const hijos = filtrarArbolColumnas(n.hijos, texto);
    return hijos.length ? [{ ...n, hijos }] : [];
  });
}

/** Convierte MenuItemDef o clave integrada a ItemMenu del contrato. Separadores contiguos se colapsan. */
export function resolverMenu(lista: unknown[], integrados: Record<string, ItemMenu | ItemMenu[] | null | undefined>): ItemMenu[] {
  const salida: ItemMenu[] = [];
  for (const item of lista) {
    if (item === 'separator') {
      const ultimo = salida[salida.length - 1];
      if (ultimo && !ultimo.separador) salida.push({ separador: true });
      continue;
    }
    if (typeof item === 'string') {
      const r = integrados[item];
      if (r) salida.push(...(Array.isArray(r) ? r : [r]));
      continue;
    }
    if (item && typeof item === 'object') salida.push(menuPropio(item as DefItemMenu, integrados));
  }
  if (salida[salida.length - 1]?.separador) salida.pop();
  return salida;
}

function menuPropio(def: DefItemMenu, integrados: Record<string, ItemMenu | ItemMenu[] | null | undefined>): ItemMenu {
  const hijos = Array.isArray(def['subMenu']) ? resolverMenu(def['subMenu'], integrados) : undefined;
  const accion = def['action'] as (() => void) | undefined;
  return { texto: String(def['name'] ?? ''), icono: def['icon'] as string | undefined, atajo: def['shortcut'] as string | undefined, marcado: def['checked'] === true, deshabilitado: def['disabled'] === true, hijos, accion };
}
