/**
 * ag-grid/filas/pivote — Columnas generadas por pivote. Logica pura.
 *
 * Recorre las hojas una vez para descubrir las claves, las ordena y genera
 * columnas con ids estables (`pivot_<cols>_<claves>_<valor>`). La agregacion por
 * clave la hace `agregarArbol` con `clavesPivote`.
 */
import type { ClaveArbol, ColPivote, DefPivote, GrupoPivote, OpcionesPivote, ResultadoPivote, ValorAgg } from './filas.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

const SEP = '\u0002';
const TOTAL = 'PivotRowTotal';
const TOTAL_GRUPO = 'PivotGroupTotal';

function compararClaves(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function textoClave(v: unknown): string {
  return v == null || v === '' ? '' : String(v);
}

export function idPivote(pivotes: readonly string[], claves: readonly string[], colId: string): string {
  return `pivot_${pivotes.join('-')}_${claves.join('_')}_${colId}`;
}

function defColumna(pivotes: readonly string[], claves: string[], v: ValorAgg, titulo: string, op: OpcionesPivote): DefPivote {
  const id = idPivote(pivotes, claves, v.colId);
  const def: DefPivote = { colId: id, field: id, headerName: titulo, pivotKeys: claves, pivotValueColumn: v.colId, type: 'number', aggFunc: v.func };
  op.procesarCol?.(def);
  return def;
}

function defsValor(pivotes: readonly string[], claves: string[], valores: readonly ValorAgg[], nombreValor: (colId: string) => string, op: OpcionesPivote): DefPivote[] {
  return valores.map((v) => defColumna(pivotes, claves, v, nombreValor(v.colId), op));
}

/** Genera columnas para las hojas dadas. Con `excedido` no devuelve columnas: AG Grid aborta igual. */
export function pivotar(hojas: readonly RowNode[], pivotes: readonly ColPivote[], valores: readonly ValorAgg[], nombreValor: (colId: string) => string, op: OpcionesPivote = {}): ResultadoPivote {
  const ids = pivotes.map((p) => p.colId);
  const raiz: ClaveArbol = { clave: '', etiqueta: '', hijos: new Map() };
  const rutas = new Map<RowNode, string[]>();
  const prof = pivotes.length;
  const conGrupo = !!op.totalesGrupo && prof > 1;
  const conFila = !!op.totalesFila;
  for (let i = 0; i < hojas.length; i++) {
    const hoja = hojas[i] as RowNode;
    let actual = raiz;
    const partes: string[] = [];
    const claves: string[] = [];
    for (let d = 0; d < prof; d++) {
      const p = pivotes[d] as ColPivote;
      const v = p.valor(hoja);
      const clave = textoClave(v);
      partes.push(clave);
      let hijo = actual.hijos.get(clave);
      if (!hijo) {
        hijo = { clave, etiqueta: p.etiqueta ? p.etiqueta(v) : clave, hijos: new Map() };
        actual.hijos.set(clave, hijo);
      }
      actual = hijo;
      if (conGrupo && d < prof - 1) claves.push(`${TOTAL_GRUPO}${SEP}${partes.join(SEP)}`);
    }
    claves.push(partes.join(SEP));
    if (conFila) claves.push(TOTAL);
    rutas.set(hoja, claves);
  }
  const planas: DefPivote[] = [];
  const unico = op.quitarNivelValorUnico === true && valores.length === 1;
  const construir = (n: ClaveArbol, ruta: string[], d: number): Array<DefPivote | GrupoPivote> => {
    const comparar = (pivotes[d] as ColPivote | undefined)?.comparador ?? compararClaves;
    const hijos = [...n.hijos.values()].sort((a, b) => comparar(a.clave, b.clave));
    const out: Array<DefPivote | GrupoPivote> = [];
    for (const h of hijos) {
      const sub = [...ruta, h.clave];
      if (d === prof - 1) {
        const defs = defsValor(ids, sub, valores, nombreValor, op);
        for (const def of defs) def.headerName = unico ? h.etiqueta : `${h.etiqueta} › ${def.headerName}`;
        planas.push(...defs);
        if (unico) out.push(...defs);
        else out.push(grupo(sub, h.etiqueta, defs, op));
        continue;
      }
      const inicio = planas.length;
      const hijosGrupo = construir(h, sub, d + 1);
      out.push(grupo(sub, h.etiqueta, hijosGrupo, op));
      if (!conGrupo) continue;
      const totales = totalesGrupo(h, sub, ids, valores, nombreValor, op);
      if (op.totalesGrupo === 'top') {
        planas.splice(inicio, 0, ...totales);
        out.splice(out.length - 1, 0, ...totales);
      } else {
        planas.push(...totales);
        out.push(...totales);
      }
    }
    return out;
  };
  const arbolDefs = prof ? construir(raiz, [], 0) : [];
  if (conFila) {
    const totales = valores.map((v) => {
      const def = defColumna(ids, [TOTAL], v, `Total ${nombreValor(v.colId)}`, op);
      def.colId = `${TOTAL}_${v.colId}`;
      def.field = def.colId;
      return def;
    });
    if (op.totalesFila === 'top') {
      planas.unshift(...totales);
      arbolDefs.unshift(...totales);
    } else {
      planas.push(...totales);
      arbolDefs.push(...totales);
    }
  }
  const excedido = op.maximo != null && op.maximo >= 0 && planas.length > op.maximo;
  if (excedido) return { arbolDefs: [], planas: [], clavesDe: () => [], excedido, firma: '' };
  const clavesDe = (hoja: RowNode): string[] => rutas.get(hoja) ?? [];
  return { arbolDefs, planas, clavesDe, excedido, firma: planas.map((d) => d.colId).join('\u0003') };
}

function totalesGrupo(h: ClaveArbol, ruta: string[], ids: readonly string[], valores: readonly ValorAgg[], nombreValor: (c: string) => string, op: OpcionesPivote): DefPivote[] {
  return valores.map((v) => defColumna(ids, [TOTAL_GRUPO, ...ruta], v, `Total ${h.etiqueta} › ${nombreValor(v.colId)}`, op));
}

function grupo(ruta: string[], titulo: string, hijos: Array<DefPivote | GrupoPivote>, op: OpcionesPivote): GrupoPivote {
  const def: GrupoPivote = { groupId: `pivotGroup_${ruta.join('_')}`, headerName: titulo, pivotKeys: ruta, children: hijos };
  op.procesarGrupo?.(def);
  return def;
}

/** Traduce la clave interna de una ranura de agregacion al colId de la columna generada. */
export function resolverIdPivote(pivotes: readonly string[]): (clave: string, colId: string) => string {
  return (clave: string, colId: string): string => {
    if (clave === TOTAL) return `${TOTAL}_${colId}`;
    return idPivote(pivotes, clave.split(SEP), colId);
  };
}
