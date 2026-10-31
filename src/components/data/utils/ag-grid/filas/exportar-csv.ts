/**
 * ag-grid/filas/exportar-csv — CSV desde una TablaExport. Logica pura.
 *
 * Como AG Grid: todo entre comillas salvo `suppressQuotes`, separador
 * configurable, grupos como `-> etiqueta` y contenido libre antes y despues.
 */
import type { FilaExport, ParamsExport, TablaExport } from './filas.schemas.js';

const BOM = '\ufeff';

function citar(v: unknown, sinComillas: boolean): string {
  const t = v == null ? '' : String(v);
  if (sinComillas) return t;
  return `"${t.replaceAll('"', '""')}"`;
}

function contenidoLibre(v: unknown, sep: string, sinComillas: boolean): string[] {
  if (v == null || v === '') return [];
  if (typeof v === 'string') return [v];
  if (!Array.isArray(v)) return [];
  return v.map((fila) => {
    const celdas = (fila as { cells?: Array<{ data?: { value?: unknown } | null; mergeAcross?: number }> }).cells ?? [];
    const partes: string[] = [];
    for (const c of celdas) {
      partes.push(citar(c.data?.value, sinComillas));
      for (let i = 0; i < (c.mergeAcross ?? 0); i++) partes.push(citar('', sinComillas));
    }
    return partes.join(sep);
  });
}

function textoFila(f: FilaExport, sep: string, sinComillas: boolean): string {
  const celdas = new Array<string>(f.textos.length);
  for (let i = 0; i < f.textos.length; i++) celdas[i] = citar(f.textos[i], sinComillas);
  return celdas.join(sep);
}

export function tablaACsv(tabla: TablaExport, params: ParamsExport = {}): string {
  const sep = params.columnSeparator ?? ',';
  const sinComillas = params.suppressQuotes === true;
  const lineas: string[] = [];
  for (const l of contenidoLibre(tabla.antes, sep, sinComillas)) lineas.push(l);
  if (!params.skipColumnHeaders) lineas.push(tabla.columnas.map((c) => citar(c.encabezado, sinComillas)).join(sep));
  for (let i = 0; i < tabla.filas.length; i++) lineas.push(textoFila(tabla.filas[i] as FilaExport, sep, sinComillas));
  for (const l of contenidoLibre(tabla.despues, sep, sinComillas)) lineas.push(l);
  return lineas.join('\r\n');
}

export function csvABlob(csv: string): Blob {
  return new Blob([BOM, csv], { type: 'text/csv;charset=utf-8' });
}
