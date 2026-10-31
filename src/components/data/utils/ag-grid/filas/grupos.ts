/**
 * ag-grid/filas/grupos — Arbol de grupos, agregacion y aplanado. Logica pura.
 *
 * Una sola pasada por las hojas (O(n · niveles)) y agregacion de abajo hacia
 * arriba: los padres combinan los acumulados de sus hijos, no vuelven a tocar
 * las hojas. Por eso `avg` sale ponderado y 100.000 filas no pagan por nivel.
 *
 * Los ids son los mismos de datagrid-core (`col=valor|col=valor`), asi que
 * `expandedGroups` y `toggleGroup` del motor siguen funcionando.
 */
import type { Acumulado, CriterioGrupo, FuncionAgg, NivelGrupo, NodoArbol, OpcionesAgg, OpcionesAplanar, PosicionTotal, ValorAgg } from './filas.schemas.js';
import type { RowNode } from '../../../schemas/datagrid-types.schemas.js';
import type { FilaDisplay } from '../contrato.js';

export const ID_RAIZ = 'ROOT_NODE_ID';
export const PREFIJO_TOTAL = 'rowGroupFooter_';
export const FUNCIONES_AGG = ['sum', 'min', 'max', 'count', 'avg', 'first', 'last'];

/** Compartidos: un arbol de 100.000 hojas no paga dos Map por nodo que nunca usara. */
const SIN_MAPA: Map<string, NodoArbol> = new Map();
const SIN_ACUM: Map<string, Acumulado> = new Map();

/** Da al nodo su propio mapa de hijos la primera vez que tiene uno. */
export function colgar(padre: NodoArbol, clave: string, hijo: NodoArbol): void {
  if (padre.mapa === SIN_MAPA) padre.mapa = new Map();
  padre.mapa.set(clave, hijo);
  padre.hijos.push(hijo);
}

export function crearNodo(id: string, padre: NodoArbol | null, colId: string, field: string, clave: string, valor: unknown, etiqueta: string): NodoArbol {
  const nivel = padre ? padre.nivel + 1 : -1;
  return { id, padre, colId, field, clave, valor, etiqueta, nivel, hijos: [], mapa: SIN_MAPA, directas: [], hojas: [], agg: {}, acum: SIN_ACUM, nodo: null };
}

/**
 * Agrupa hojas ya filtradas y ordenadas conservando el orden de primera
 * aparicion. Con `desbalance` (groupAllowUnbalanced) la hoja sin clave se queda
 * en el nivel donde su valor es vacio.
 */
export function construirArbol(hojas: readonly RowNode[], niveles: readonly NivelGrupo[], desbalance = false): NodoArbol {
  const raiz = crearNodo(ID_RAIZ, null, '', '', '', null, '');
  const prof = niveles.length;
  raiz.hojas = hojas as RowNode[];
  for (let i = 0; i < hojas.length; i++) {
    const hoja = hojas[i] as RowNode;
    let actual = raiz;
    for (let d = 0; d < prof; d++) {
      const nivel = niveles[d] as NivelGrupo;
      const valor = nivel.valor(hoja);
      if (desbalance && (valor == null || valor === '')) break;
      const clave = nivel.clave ? nivel.clave(valor, hoja) : String(valor ?? '');
      let hijo = actual.mapa.get(clave);
      if (!hijo) {
        const tramo = `${nivel.colId}=${clave}`;
        const id = actual.padre ? `${actual.id}|${tramo}` : tramo;
        hijo = crearNodo(id, actual, nivel.colId, nivel.field, clave, valor, nivel.etiqueta(valor));
        colgar(actual, clave, hijo);
      }
      hijo.hojas.push(hoja);
      actual = hijo;
    }
    actual.directas.push(hoja);
  }
  return raiz;
}

export function recorrerArbol(raiz: NodoArbol, fn: (g: NodoArbol) => void): void {
  const pila: NodoArbol[] = [raiz];
  while (pila.length) {
    const g = pila.pop() as NodoArbol;
    if (g !== raiz) fn(g);
    for (let i = g.hijos.length - 1; i >= 0; i--) pila.push(g.hijos[i] as NodoArbol);
  }
}

/* ── Acumuladores ─────────────────────────────────────────────────────── */

function nuevoAcumulado(guardar: boolean): Acumulado {
  return { suma: 0, sumaBig: null, numericos: 0, total: 0, min: null, max: null, primero: null, ultimo: null, vacio: true, valores: guardar ? [] : null };
}

function sumarValor(a: Acumulado, v: unknown): void {
  a.total++;
  if (a.vacio) {
    a.primero = v;
    a.vacio = false;
  }
  a.ultimo = v;
  if (a.valores) a.valores.push(v);
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return;
    a.suma += v;
    a.numericos++;
    if (a.min === null || v < (a.min as number)) a.min = v;
    if (a.max === null || v > (a.max as number)) a.max = v;
    return;
  }
  if (typeof v !== 'bigint') return;
  a.sumaBig = (a.sumaBig ?? 0n) + v;
  a.numericos++;
  if (a.min === null || v < (a.min as bigint)) a.min = v;
  if (a.max === null || v > (a.max as bigint)) a.max = v;
}

function fundir(a: Acumulado, b: Acumulado): void {
  if (b.vacio) return;
  if (a.vacio) {
    a.primero = b.primero;
    a.vacio = false;
  }
  a.ultimo = b.ultimo;
  a.suma += b.suma;
  a.total += b.total;
  a.numericos += b.numericos;
  if (b.sumaBig !== null) a.sumaBig = (a.sumaBig ?? 0n) + b.sumaBig;
  if (b.min !== null && (a.min === null || (b.min as number) < (a.min as number))) a.min = b.min;
  if (b.max !== null && (a.max === null || (b.max as number) > (a.max as number))) a.max = b.max;
}

function resultado(func: string, a: Acumulado): unknown {
  if (func === 'count') return a.total;
  if (func === 'first') return a.vacio ? null : a.primero;
  if (func === 'last') return a.vacio ? null : a.ultimo;
  if (func === 'min') return a.min;
  if (func === 'max') return a.max;
  if (a.numericos === 0) return null;
  if (func === 'sum') return a.sumaBig !== null ? a.sumaBig + BigInt(Math.trunc(a.suma)) : a.suma;
  if (func === 'avg') {
    if (a.sumaBig !== null) return Number(a.sumaBig + BigInt(Math.trunc(a.suma))) / a.numericos;
    return a.suma / a.numericos;
  }
  return null;
}

function esNativa(func: unknown, propias: Record<string, FuncionAgg>): func is string {
  return typeof func === 'string' && FUNCIONES_AGG.includes(func) && !propias[func];
}

/** Agrega `valores` en todo el arbol (incluida la raiz, para totales generales). */
export function agregarArbol(raiz: NodoArbol, valores: readonly ValorAgg[], op: OpcionesAgg = {}): void {
  const propias = op.funciones ?? {};
  const visitar = (g: NodoArbol): void => {
    for (let i = 0; i < g.hijos.length; i++) visitar(g.hijos[i] as NodoArbol);
    g.agg = {};
    g.acum = SIN_ACUM;
    const externo = op.porGrupo?.(g);
    if (externo) {
      g.agg = externo;
      return;
    }
    if (!valores.length) return;
    g.acum = new Map();
    if (!op.soloPivote) for (const v of valores) agregarColumna(g, v, propias, op);
    if (op.clavesPivote) agregarPivote(g, valores, propias, op);
  };
  visitar(raiz);
}

function agregarColumna(g: NodoArbol, v: ValorAgg, propias: Record<string, FuncionAgg>, op: OpcionesAgg): void {
  const nativa = esNativa(v.func, propias);
  const a = nuevoAcumulado(!nativa);
  for (let i = 0; i < g.hijos.length; i++) {
    const h = g.hijos[i] as NodoArbol;
    const previo = h.acum.get(v.colId);
    if (previo) fundir(a, previo);
  }
  if (!nativa) {
    a.valores = [];
    for (let i = 0; i < g.hijos.length; i++) a.valores.push((g.hijos[i] as NodoArbol).agg[v.colId]);
  }
  for (let i = 0; i < g.directas.length; i++) sumarValor(a, v.valor(g.directas[i] as RowNode));
  if (g.nodo && g.hijos.length === 0) sumarValor(a, v.valor(g.nodo));
  g.acum.set(v.colId, a);
  g.agg[v.colId] = nativa ? resultado(v.func as string, a) : aplicarPropia(g, v, a, propias, op);
}

function aplicarPropia(g: NodoArbol, v: ValorAgg, a: Acumulado, propias: Record<string, FuncionAgg>, op: OpcionesAgg): unknown {
  const fn = typeof v.func === 'function' ? v.func : propias[v.func];
  if (!fn) return null;
  return fn({ values: a.valores ?? [], rowNode: g, colDef: v.colDef, column: v.column, api: op.api, context: op.contexto });
}

/** Cada clave de pivote es una ranura propia: `clave\u0001colId`. Disperso: solo las que aparecen. */
function agregarPivote(g: NodoArbol, valores: readonly ValorAgg[], propias: Record<string, FuncionAgg>, op: OpcionesAgg): void {
  const claves = op.clavesPivote as (hoja: RowNode) => string[];
  const idDe = op.idPivote ?? ((clave: string, colId: string) => `${clave}_${colId}`);
  const ranuras = new Map<string, Acumulado>();
  const propiasPorRanura = new Map<string, boolean>();
  for (const v of valores) propiasPorRanura.set(v.colId, !esNativa(v.func, propias));
  for (let i = 0; i < g.hijos.length; i++) {
    for (const [ranura, previo] of (g.hijos[i] as NodoArbol).acum) {
      if (!ranura.includes('\u0001')) continue;
      let a = ranuras.get(ranura);
      if (!a) {
        const colId = ranura.slice(ranura.indexOf('\u0001') + 1);
        a = nuevoAcumulado(propiasPorRanura.get(colId) === true);
        ranuras.set(ranura, a);
      }
      fundir(a, previo);
      if (a.valores && previo.valores) for (const x of previo.valores) a.valores.push(x);
    }
  }
  for (let i = 0; i < g.directas.length; i++) {
    const hoja = g.directas[i] as RowNode;
    const lista = claves(hoja);
    for (const v of valores) {
      const x = v.valor(hoja);
      for (let k = 0; k < lista.length; k++) {
        const ranura = `${lista[k]}\u0001${v.colId}`;
        let a = ranuras.get(ranura);
        if (!a) {
          a = nuevoAcumulado(propiasPorRanura.get(v.colId) === true);
          ranuras.set(ranura, a);
        }
        sumarValor(a, x);
      }
    }
  }
  const porCol = new Map(valores.map((v) => [v.colId, v]));
  for (const [ranura, a] of ranuras) {
    g.acum.set(ranura, a);
    const corte = ranura.indexOf('\u0001');
    const clave = ranura.slice(0, corte);
    const colId = ranura.slice(corte + 1);
    const v = porCol.get(colId) as ValorAgg;
    g.agg[idDe(clave, colId)] = esNativa(v.func, propias) ? resultado(v.func, a) : aplicarPropia(g, v, a, propias, op);
  }
}

/* ── Orden de grupos ──────────────────────────────────────────────────── */

function compararNatural(a: unknown, b: unknown): number {
  if (a == null) return b == null ? 0 : -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Las hojas ya vienen ordenadas, asi que un orden por la columna agrupada sale
 * solo. Esto cubre lo demas: orden por columna agregada e
 * initialGroupOrderComparator cuando no hay criterio aplicable.
 */
export function ordenarArbol(raiz: NodoArbol, criterios: readonly CriterioGrupo[], inicial?: (a: NodoArbol, b: NodoArbol) => number): void {
  const visitar = (g: NodoArbol): void => {
    if (g.hijos.length > 1) {
      const aplica = criterios.filter((c) => c.colId === (g.hijos[0] as NodoArbol).colId || c.colId in (g.hijos[0] as NodoArbol).agg);
      if (aplica.length) g.hijos.sort((a, b) => compararCon(a, b, aplica));
      else if (inicial) g.hijos.sort(inicial);
    }
    for (const h of g.hijos) visitar(h);
  };
  visitar(raiz);
}

function compararCon(a: NodoArbol, b: NodoArbol, criterios: readonly CriterioGrupo[]): number {
  for (const c of criterios) {
    const va = c.colId === a.colId ? a.valor : a.agg[c.colId];
    const vb = c.colId === b.colId ? b.valor : b.agg[c.colId];
    const r = (c.comparar ?? compararNatural)(va, vb);
    if (r !== 0) return c.dir === 'desc' ? -r : r;
  }
  return 0;
}

/**
 * groupAggFiltering: el grupo que pasa conserva todo su contenido; el que no,
 * solo lo que pase por si mismo. Se llama sobre un arbol construido sin filtrar.
 */
export function podarArbol(raiz: NodoArbol, pasaHoja: (n: RowNode) => boolean, pasaGrupo: (g: NodoArbol) => boolean): void {
  const podar = (g: NodoArbol): boolean => {
    if (g !== raiz && pasaGrupo(g)) return true;
    g.hijos = g.hijos.filter(podar);
    g.directas = g.directas.filter(pasaHoja);
    g.hojas = g.hojas.filter(pasaHoja);
    return g.hijos.length > 0 || g.directas.length > 0;
  };
  podar(raiz);
}

/* ── Aplanado ─────────────────────────────────────────────────────────── */

function filaTotal(g: NodoArbol, nivel: number, op: OpcionesAplanar): FilaDisplay {
  const esRaiz = g.padre === null;
  const etiqueta = op.textoTotal?.(esRaiz ? null : g) ?? (esRaiz ? 'Total' : `Total ${g.etiqueta}`);
  const data: Record<string, unknown> = { ...g.agg };
  const id = `${PREFIJO_TOTAL}${g.id}`;
  return { kind: 'total', id, level: nivel, node: { id, index: -1, data }, agg: g.agg, grupoId: esRaiz ? null : g.id, etiqueta } as FilaDisplay;
}

/** Agregados ya formateados, por colId: la capa de render los pone bajo su columna. */
function textosAgg(agg: Record<string, unknown>, formatear: OpcionesAplanar['formatear']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const colId of Object.keys(agg)) {
    const v = agg[colId];
    if (v == null) continue;
    out[colId] = formatear ? formatear(colId, v) : String(v);
  }
  return out;
}

function filaGrupo(g: NodoArbol, abierto: boolean, agg: Record<string, unknown>, nivel: number, expandible: boolean, formatear: OpcionesAplanar['formatear']): FilaDisplay {
  return {
    kind: 'group',
    id: g.id,
    colId: g.colId,
    field: g.field,
    value: g.valor,
    label: g.etiqueta,
    level: nivel,
    count: g.hojas.length,
    expanded: abierto,
    agg,
    expandible,
    nodo: g.nodo,
    get leafIds(): string[] {
      return g.hojas.map((n) => n.id);
    },
    get aggTextos(): Record<string, string> {
      return textosAgg(agg, formatear);
    },
  } as FilaDisplay;
}

function posicionTotal(v: OpcionesAplanar['totalGrupo'], g: NodoArbol): PosicionTotal {
  if (typeof v === 'function') return v(g);
  return v ?? null;
}

/** Convierte el arbol en filas de display respetando expansion y totales. */
export function aplanarArbol(raiz: NodoArbol, op: OpcionesAplanar): FilaDisplay[] {
  const out: FilaDisplay[] = [];
  const hojasDe = (g: NodoArbol, nivel: number): void => {
    if (op.sinHojas) return;
    for (let i = 0; i < g.directas.length; i++) out.push({ kind: 'leaf', level: nivel, node: g.directas[i] as RowNode });
  };
  const visitar = (g: NodoArbol, nivel: number): void => {
    const hoja = g.hijos.length === 0 && g.directas.length === 0;
    if (hoja && g.nodo) {
      out.push({ kind: 'leaf', level: nivel, node: g.nodo });
      return;
    }
    if (saltarHijoUnico(g, op)) {
      for (const h of g.hijos) visitar(h, nivel);
      hojasDe(g, nivel);
      return;
    }
    const expandible = !(op.sinHojas && g.hijos.length === 0);
    const abierto = expandible && op.abierto(g);
    const total = abierto ? posicionTotal(op.totalGrupo, g) : null;
    const ocultar = abierto && op.ocultarPadresAbiertos === true;
    if (!ocultar) out.push(filaGrupo(g, abierto, total === 'bottom' ? {} : g.agg, nivel, expandible, op.formatear));
    if (!abierto) return;
    const siguiente = ocultar ? nivel : nivel + 1;
    if (total === 'top') out.push(filaTotal(g, siguiente, op));
    for (const h of g.hijos) visitar(h, siguiente);
    hojasDe(g, siguiente);
    if (total === 'bottom') out.push(filaTotal(g, siguiente, op));
  };
  if (op.totalGeneral === 'top') out.push(filaTotal(raiz, 0, op));
  for (const h of raiz.hijos) visitar(h, 0);
  hojasDe(raiz, 0);
  if (op.totalGeneral === 'bottom') out.push(filaTotal(raiz, 0, op));
  return out;
}

function saltarHijoUnico(g: NodoArbol, op: OpcionesAplanar): boolean {
  if (!op.ocultarHijoUnico) return false;
  if (g.hijos.length + g.directas.length !== 1) return false;
  if (op.ocultarHijoUnico === 'leafGroupsOnly') return g.hijos.length === 0;
  return true;
}
