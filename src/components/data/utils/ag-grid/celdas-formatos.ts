// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/celdas-formatos — Numero, moneda, porcentaje y fecha sobre Intl.
 *
 * Construir un Intl.*Format es lo caro; formatear no. Por eso cada combinacion
 * de opciones se cachea: una columna visible reusa el mismo formateador.
 */
import { aNumero } from './celdas-html.js';
import type { FormatoFecha, FormatoMoneda, FormatoNumero, FormatoPorcentaje, FormatoValor } from './celdas.schemas.js';

const numeros = new Map<string, Intl.NumberFormat>();
const fechas = new Map<string, Intl.DateTimeFormat>();
const relativos = new Map<string, Intl.RelativeTimeFormat>();
const RE_SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const UNIDADES: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];

function numeroIntl(locale: string | undefined, opciones: Intl.NumberFormatOptions): Intl.NumberFormat {
  const clave = `${locale ?? ''}|${JSON.stringify(opciones)}`;
  let f = numeros.get(clave);
  if (!f) {
    f = new Intl.NumberFormat(locale, opciones);
    numeros.set(clave, f);
  }
  return f;
}

function fechaIntl(locale: string | undefined, opciones: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const clave = `${locale ?? ''}|${JSON.stringify(opciones)}`;
  let f = fechas.get(clave);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opciones);
    fechas.set(clave, f);
  }
  return f;
}

function opcionesBase(o: FormatoNumero): Intl.NumberFormatOptions {
  const salida: Intl.NumberFormatOptions = {};
  if (o.decimales != null) {
    salida.minimumFractionDigits = o.decimales;
    salida.maximumFractionDigits = o.decimales;
  }
  if (o.minDecimales != null) salida.minimumFractionDigits = o.minDecimales;
  if (o.maxDecimales != null) salida.maximumFractionDigits = o.maxDecimales;
  if (o.compacto) salida.notation = 'compact';
  if (o.signo) salida.signDisplay = 'exceptZero';
  return salida;
}

export function fmtNumero(valor: unknown, o: FormatoNumero = {}): string {
  const n = aNumero(valor);
  if (n == null) return '';
  return numeroIntl(o.locale, opcionesBase(o)).format(n);
}

export function fmtMoneda(valor: unknown, o: FormatoMoneda = {}): string {
  const n = aNumero(valor);
  if (n == null) return '';
  const opciones: Intl.NumberFormatOptions = { ...opcionesBase(o), style: 'currency', currency: o.moneda ?? 'USD' };
  if (o.mostrar) opciones.currencyDisplay = o.mostrar;
  return numeroIntl(o.locale, opciones).format(n);
}

/** `escala: 'fraccion'` (defecto) lee 0.12 como 12 %; `'ciento'` lee 12 como 12 %. */
export function fmtPorcentaje(valor: unknown, o: FormatoPorcentaje = {}): string {
  const n = aNumero(valor);
  if (n == null) return '';
  const fraccion = o.escala === 'ciento' ? n / 100 : n;
  const decimales = o.decimales == null && o.maxDecimales == null ? { maximumFractionDigits: 2 } : {};
  return numeroIntl(o.locale, { ...decimales, ...opcionesBase(o), style: 'percent' }).format(fraccion);
}

export function fmtValor(valor: unknown, formato: FormatoValor | undefined, o: FormatoMoneda & FormatoPorcentaje = {}): string {
  if (formato === 'moneda') return fmtMoneda(valor, o);
  if (formato === 'porcentaje') return fmtPorcentaje(valor, o);
  return fmtNumero(valor, o);
}

/** Date local: `new Date('2026-10-31')` seria UTC y en America cae en el dia anterior. */
export function aFecha(valor: unknown): Date | null {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor === 'string') {
    const m = RE_SOLO_FECHA.exec(valor);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relativa(d: Date, o: FormatoFecha): string {
  const segundos = (d.getTime() - (o.ahora ?? Date.now())) / 1000;
  const clave = o.locale ?? '';
  let f = relativos.get(clave);
  if (!f) {
    f = new Intl.RelativeTimeFormat(o.locale, { numeric: 'auto' });
    relativos.set(clave, f);
  }
  for (const [unidad, tamano] of UNIDADES) {
    if (Math.abs(segundos) >= tamano || unidad === 'second') return f.format(Math.trunc(segundos / tamano), unidad);
  }
  return '';
}

function iso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function fmtFecha(valor: unknown, o: FormatoFecha = {}): string {
  const d = aFecha(valor);
  if (!d) return valor == null ? '' : String(valor);
  const formato = o.formato ?? 'corta';
  if (formato === 'iso') return iso(d);
  if (formato === 'relativa') return relativa(d, o);
  const zona: Intl.DateTimeFormatOptions = o.zona ? { timeZone: o.zona } : {};
  if (formato === 'hora') return fechaIntl(o.locale, { ...zona, timeStyle: 'short' }).format(d);
  if (formato === 'fechaHora') return fechaIntl(o.locale, { ...zona, dateStyle: 'medium', timeStyle: 'short' }).format(d);
  const estilo = formato === 'larga' ? 'long' : formato === 'media' ? 'medium' : 'short';
  return fechaIntl(o.locale, { ...zona, dateStyle: estilo }).format(d);
}
