// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion-valores — Conversion pura entre lo que muestra un editor y
 * el valor de la celda, y filtrado de las listas de los editores.
 */
import type { BusquedaLista, OpcionLista } from './edicion.schemas.js';

/** Editor por defecto segun el tipo de columna, con el nombre de AG Grid. */
export function editorPorTipo(tipo: unknown): string {
  if (tipo === 'number' || tipo === 'currency') return 'agNumberCellEditor';
  if (tipo === 'date') return 'agDateCellEditor';
  if (tipo === 'dateString') return 'agDateStringCellEditor';
  if (tipo === 'boolean') return 'agCheckboxCellEditor';
  return 'agTextCellEditor';
}

export function textoANumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export function redondear(n: number, precision: number | undefined): number {
  if (precision == null) return n;
  return Number(n.toFixed(precision));
}

/** Paso de las flechas del editor numerico, limitado por min y max. */
export function pasoNumero(actual: number | null, sentido: 1 | -1, step: number, precision: number | undefined, min: number | undefined, max: number | undefined): number {
  let n = redondear((actual ?? 0) + sentido * step, precision);
  if (min != null) n = Math.max(min, n);
  if (max != null) n = Math.min(max, n);
  return n;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` en hora local: toISOString correria el dia en UTC-5. */
export function fechaAIso(valor: unknown): string {
  if (valor == null || valor === '') return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

export function isoAFecha(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Interpreta texto pegado segun el tipo de columna. Sin valueParser, texto vacio es null. */
export function textoAValor(texto: string, tipo: unknown): unknown {
  if (texto === '') return null;
  if (tipo === 'number' || tipo === 'currency') return textoANumero(texto);
  if (tipo === 'boolean') {
    const bajo = texto.trim().toLowerCase();
    if (bajo === 'true') return true;
    if (bajo === 'false') return false;
    return null;
  }
  if (tipo === 'date') return isoAFecha(texto) ?? texto;
  return texto;
}

export function normalizarOpciones(valores: unknown, aTexto: (v: unknown) => string): OpcionLista[] {
  if (!Array.isArray(valores)) return [];
  return valores.map((valor) => ({ valor, texto: aTexto(valor) }));
}

function esSubsecuencia(aguja: string, pajar: string): boolean {
  let i = 0;
  for (const c of pajar) if (c === aguja[i]) i++;
  return i === aguja.length;
}

/** Filtra por prefijo (`match`), subcadena (`matchAny`) o subsecuencia (`fuzzyMatch`), sin distinguir mayusculas. */
export function filtrarOpciones(opciones: OpcionLista[], consulta: string, busqueda: BusquedaLista): OpcionLista[] {
  const aguja = consulta.trim().toLowerCase();
  if (!aguja) return opciones;
  return opciones.filter(({ texto }) => {
    const pajar = texto.toLowerCase();
    if (busqueda === 'matchAny') return pajar.includes(aguja);
    if (busqueda === 'fuzzyMatch') return esSubsecuencia(aguja, pajar);
    return pajar.startsWith(aguja);
  });
}

/** Un caracter imprimible sin modificadores de comando abre el editor. */
export function esImprimible(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return [...e.key].length === 1;
}
