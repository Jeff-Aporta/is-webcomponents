/**
 * nucleo/base-celdas — Renderers minimos por `type`, para que la grilla pinte
 * igual si el plugin de celdas no esta instalado. Ese plugin los sobreescribe.
 */

import type { GridHost, RendererCelda } from '../contrato.js';

const numeros = new Map<string, Intl.NumberFormat>();
const fechas = new Map<string, Intl.DateTimeFormat>();

function formatoNumero(locale: string, opciones: Intl.NumberFormatOptions): Intl.NumberFormat {
  const clave = `${locale}|${JSON.stringify(opciones)}`;
  let f = numeros.get(clave);
  if (!f) {
    f = new Intl.NumberFormat(locale, opciones);
    numeros.set(clave, f);
  }
  return f;
}

function formatoFecha(locale: string, estilo: Intl.DateTimeFormatOptions['dateStyle']): Intl.DateTimeFormat {
  const clave = `${locale}|${estilo}`;
  let f = fechas.get(clave);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { dateStyle: estilo });
    fechas.set(clave, f);
  }
  return f;
}

function localeDe(format: unknown): string {
  return typeof format === 'string' ? format : 'es-CO';
}

const numero: RendererCelda = ({ value, def, grid }) => {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const decimales = typeof def['decimals'] === 'number' ? def['decimals'] : 2;
  return grid.escapar(formatoNumero(localeDe(def['format']), { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n));
};

const moneda: RendererCelda = ({ value, def, grid }) => {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const decimales = typeof def['decimals'] === 'number' ? def['decimals'] : 0;
  const currency = typeof def['currency'] === 'string' ? def['currency'] : 'COP';
  return grid.escapar(formatoNumero(localeDe(def['format']), { style: 'currency', currency, minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n));
};

const fecha: RendererCelda = ({ value, def, grid }) => {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return grid.escapar(value);
  const estilo = (def['dateFormat'] ?? 'medium') as Intl.DateTimeFormatOptions['dateStyle'];
  return grid.escapar(formatoFecha(localeDe(def['format']), estilo).format(d));
};

const booleano: RendererCelda = ({ value }) => `<span class="mim-dg-bool mim-dg-bool--${value ? 'on' : 'off'}" aria-checked="${!!value}">${value ? '✓' : ''}</span>`;

const enlace: RendererCelda = ({ value, grid }) => (value ? `<a class="mim-dg-link" href="${grid.escapar(value)}" target="_blank" rel="noopener">${grid.escapar(value)}</a>` : '');

const etiqueta: RendererCelda = ({ value, def, grid }) => {
  const colores = def['enumColors'] as Record<string, string> | undefined;
  const color = colores?.[String(value)] ?? 'var(--iswc-accent)';
  return `<span class="mim-dg-tag" style="--c:${grid.escapar(color)}">${grid.escapar(value ?? '')}</span>`;
};

const etiquetas: RendererCelda = ({ value, grid }) => (Array.isArray(value) ? value.map((v) => `<span class="mim-dg-pill">${grid.escapar(v)}</span>`).join('') : '');

const acciones: RendererCelda = ({ def, grid }) => {
  const lista = (def['actions'] ?? []) as { value: string; label?: string; icon?: string }[];
  return lista.map((a) => `<button class="mim-dg__action" type="button" data-action="${grid.escapar(a.value)}" title="${grid.escapar(a.label ?? a.value)}"><iswc-icon icon="${grid.escapar(a.icon ?? 'mdi:dots-horizontal')}"></iswc-icon></button>`).join('');
};

export function registrarBase(grid: GridHost): void {
  grid.renderer('number', numero);
  grid.renderer('currency', moneda);
  grid.renderer('date', fecha);
  grid.renderer('boolean', booleano);
  grid.renderer('link', enlace);
  grid.renderer('enum', etiqueta);
  grid.renderer('badge', etiqueta);
  grid.renderer('tags', etiquetas);
  grid.renderer('actions', acciones);
}
