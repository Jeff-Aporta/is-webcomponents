/**
 * ag-grid/filas/tree-data — Arbol desde datos jerarquicos. Logica pura.
 *
 * Tres entradas como AG Grid: `getDataPath`, `treeDataChildrenField` y
 * `treeDataParentIdField`. Los eslabones que faltan en una ruta son grupos de
 * relleno (`nodo: null`). El id del nodo con datos es el de su RowNode.
 */
import { colgar, crearNodo, ID_RAIZ } from './grupos.js';
import type { NodoArbol, OpcionesTree, ResultadoTree } from './filas.schemas.js';
import type { RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

function hijoDe(padre: NodoArbol, clave: string): NodoArbol {
  const previo = padre.mapa.get(clave);
  if (previo) return previo;
  const id = padre.padre ? `${padre.id}\u0001${clave}` : `tree\u0001${clave}`;
  const hijo = crearNodo(id, padre, 'ag-Grid-AutoColumn', '', clave, clave, clave);
  colgar(padre, clave, hijo);
  return hijo;
}

function sumarHoja(n: NodoArbol, hoja: RowNode): void {
  let g: NodoArbol | null = n;
  while (g) {
    g.hojas.push(hoja);
    g = g.padre;
  }
}

/** Solo las hojas reales cuentan para agregados y conteos: un padre no se suma a si mismo. */
function cerrar(raiz: NodoArbol): void {
  const visitar = (g: NodoArbol): void => {
    if (g.nodo && g.hijos.length === 0) sumarHoja(g, g.nodo);
    for (let i = 0; i < g.hijos.length; i++) visitar(g.hijos[i] as NodoArbol);
  };
  visitar(raiz);
}

/** Va al final: el id de relleno depende solo de la ruta, no del orden en que llego su padre con datos. */
function fijarIds(g: NodoArbol): void {
  if (g.nodo) g.id = g.nodo.id;
  for (let i = 0; i < g.hijos.length; i++) fijarIds(g.hijos[i] as NodoArbol);
}

function porRutas(nodos: readonly RowNode[], rutaDe: (d: RowData) => string[]): NodoArbol {
  const raiz = crearNodo(ID_RAIZ, null, '', '', '', null, '');
  for (let i = 0; i < nodos.length; i++) {
    const nodo = nodos[i] as RowNode;
    const ruta = rutaDe(nodo.data);
    if (!Array.isArray(ruta)) continue;
    let actual = raiz;
    for (let d = 0; d < ruta.length; d++) actual = hijoDe(actual, String(ruta[d]));
    if (actual !== raiz) actual.nodo = nodo;
  }
  fijarIds(raiz);
  return raiz;
}

function porPadre(nodos: readonly RowNode[], campo: string, idDe: (d: RowData) => string): NodoArbol {
  const raiz = crearNodo(ID_RAIZ, null, '', '', '', null, '');
  const porId = new Map<string, NodoArbol>();
  for (let i = 0; i < nodos.length; i++) {
    const nodo = nodos[i] as RowNode;
    const id = idDe(nodo.data);
    const n = crearNodo(nodo.id, raiz, 'ag-Grid-AutoColumn', '', id, id, id);
    n.nodo = nodo;
    porId.set(id, n);
  }
  for (let i = 0; i < nodos.length; i++) {
    const nodo = nodos[i] as RowNode;
    const n = porId.get(idDe(nodo.data)) as NodoArbol;
    const padreId = nodo.data[campo];
    const padre = padreId == null ? raiz : porId.get(String(padreId)) ?? raiz;
    n.padre = creaCiclo(n, padre) ? raiz : padre;
    n.padre.hijos.push(n);
  }
  corregirNiveles(raiz);
  return raiz;
}

function creaCiclo(n: NodoArbol, padre: NodoArbol): boolean {
  let g: NodoArbol | null = padre;
  while (g) {
    if (g === n) return true;
    g = g.padre;
  }
  return false;
}

function corregirNiveles(raiz: NodoArbol): void {
  const visitar = (g: NodoArbol, nivel: number): void => {
    g.nivel = nivel;
    for (let i = 0; i < g.hijos.length; i++) visitar(g.hijos[i] as NodoArbol, nivel + 1);
  };
  visitar(raiz, -1);
}

function porHijos(nodos: readonly RowNode[], campo: string, idDe: (d: RowData) => string): ResultadoTree {
  const raiz = crearNodo(ID_RAIZ, null, '', '', '', null, '');
  const planos: RowNode[] = [];
  const visitar = (data: RowData, padre: NodoArbol): void => {
    const id = idDe(data);
    const nodo: RowNode = { id, index: planos.length, data };
    planos.push(nodo);
    const n = crearNodo(id, padre, 'ag-Grid-AutoColumn', '', id, id, id);
    n.nodo = nodo;
    padre.hijos.push(n);
    const hijos = data[campo];
    if (Array.isArray(hijos)) for (const h of hijos) visitar(h as RowData, n);
  };
  for (let i = 0; i < nodos.length; i++) visitar((nodos[i] as RowNode).data, raiz);
  return { raiz, nodos: planos };
}

/** Construye el arbol. `nodos` trae el orden deseado (ya ordenado por el modelo). */
export function construirTree(nodos: readonly RowNode[], op: OpcionesTree): ResultadoTree {
  const idDe = op.idDe ?? ((d: RowData) => String(d['id']));
  if (op.campoHijos) {
    const r = porHijos(nodos, op.campoHijos, idDe);
    cerrar(r.raiz);
    return r;
  }
  const raiz = op.rutaDe ? porRutas(nodos, op.rutaDe) : porPadre(nodos, op.campoPadre ?? 'parentId', idDe);
  cerrar(raiz);
  return { raiz, nodos: nodos as RowNode[] };
}

/**
 * Filtro en arbol: se ve quien coincide, sus ancestros y (salvo
 * excludeChildrenWhenTreeDataFiltering) todos sus descendientes.
 */
export function filtrarTree(raiz: NodoArbol, coincide: (n: RowNode) => boolean, excluirHijos = false): void {
  const visitar = (g: NodoArbol, heredado: boolean): boolean => {
    const propio = g.nodo !== null && coincide(g.nodo);
    const pasa = heredado || propio;
    g.hijos = g.hijos.filter((h) => visitar(h, pasa && !excluirHijos));
    g.hojas = [];
    return pasa || g.hijos.length > 0;
  };
  raiz.hijos = raiz.hijos.filter((h) => visitar(h, false));
  raiz.hojas = [];
  cerrar(raiz);
}
