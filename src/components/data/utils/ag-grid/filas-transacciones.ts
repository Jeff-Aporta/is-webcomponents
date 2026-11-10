// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filas/transacciones — applyTransaction puro y cola asincrona.
 *
 * Un lote se resuelve en una sola pasada O(n + cambios): se marcan quitados y
 * reemplazos sobre un indice y se reconstruye el arreglo una vez, por muchas
 * transacciones que traiga. Sin `getRowId` la identidad es la referencia.
 */
import type { IdFila, ResultadoTransaccion, Transaccion } from './filas.schemas.js';
import type { RowData } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

function clavesDe(filas: readonly RowData[], idDe: IdFila): Map<unknown, number> {
  const mapa = new Map<unknown, number>();
  for (let i = 0; i < filas.length; i++) {
    const d = filas[i] as RowData;
    mapa.set(idDe ? idDe(d) : d, i);
  }
  return mapa;
}

function insertar(destino: RowData[], nuevas: RowData[], indice: number | null | undefined): RowData[] {
  if (indice == null || indice >= destino.length) {
    for (const d of nuevas) destino.push(d);
    return destino;
  }
  return destino.slice(0, indice).concat(nuevas, destino.slice(indice));
}

/** Aplica transacciones en orden sobre una copia y devuelve una respuesta por transaccion. */
export function aplicarLote(filas: readonly RowData[], lote: readonly Transaccion[], idDe: IdFila): { filas: RowData[]; resultados: ResultadoTransaccion[] } {
  let actual = filas.slice();
  let mapa = clavesDe(actual, idDe);
  let quitadas = 0;
  const resultados: ResultadoTransaccion[] = [];
  const hueco = Symbol('quitada') as unknown as RowData;
  const compactar = (): void => {
    if (!quitadas) return;
    actual = actual.filter((d) => d !== hueco);
    mapa = clavesDe(actual, idDe);
    quitadas = 0;
  };
  for (const tx of lote) {
    const res: ResultadoTransaccion = { filas: [], add: [], update: [], remove: [] };
    for (const d of tx.remove ?? []) {
      const clave = idDe ? idDe(d) : d;
      const i = mapa.get(clave);
      if (i === undefined) continue;
      res.remove.push(actual[i] as RowData);
      actual[i] = hueco;
      mapa.delete(clave);
      quitadas++;
    }
    for (const d of tx.update ?? []) {
      const clave = idDe ? idDe(d) : d;
      const i = mapa.get(clave);
      if (i === undefined) continue;
      actual[i] = d;
      if (!idDe) mapa.set(d, i);
      res.update.push(d);
    }
    if (tx.add?.length) {
      const nuevas = tx.add.filter((d) => !idDe || !mapa.has(idDe(d)));
      compactar();
      const base = actual.length;
      actual = insertar(actual, nuevas, tx.addIndex);
      if (tx.addIndex != null && tx.addIndex < base) mapa = clavesDe(actual, idDe);
      else for (let i = 0; i < nuevas.length; i++) mapa.set(idDe ? idDe(nuevas[i] as RowData) : nuevas[i], base + i);
      res.add = nuevas;
    }
    resultados.push(res);
  }
  compactar();
  for (const r of resultados) r.filas = actual;
  return { filas: actual, resultados };
}

export function aplicarTransaccion(filas: readonly RowData[], tx: Transaccion, idDe: IdFila): ResultadoTransaccion {
  const { resultados } = aplicarLote(filas, [tx], idDe);
  return resultados[0] as ResultadoTransaccion;
}
