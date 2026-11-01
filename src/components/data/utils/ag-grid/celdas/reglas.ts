/**
 * ag-grid/celdas/reglas — cellClass, cellClassRules, cellStyle y sus pares de
 * fila, evaluados a strings para el render. Puro.
 *
 * Diferencia con AG: cada repintado parte de cero, asi que una clase o estilo
 * que ya no aplica desaparece solo, sin el "se acumulan" que AG documenta.
 */

import type { ColDefAg } from '../contrato.schemas.js';
import { claseSegura, escaparHtml, limpiarCss, unirClases } from './html.js';
import type { ParamsCelda } from './schemas.js';
import { ambitoDe } from './celdas-valores.js';
import { evaluarExpresion } from './expresion.js';

const kebabs = new Map<string, string>();

function aKebab(nombre: string): string {
  let k = kebabs.get(nombre);
  if (k == null) {
    k = nombre.startsWith('--') ? nombre : nombre.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    kebabs.set(nombre, k);
  }
  return k;
}

export function estiloATexto(estilo: unknown): string {
  if (estilo == null || typeof estilo !== 'object') return '';
  let salida = '';
  for (const [nombre, valor] of Object.entries(estilo)) {
    const limpio = limpiarCss(valor);
    if (limpio === '') continue;
    salida += `${aKebab(nombre)}:${escaparHtml(limpio)};`;
  }
  return salida;
}

function aClases(valor: unknown): string {
  if (Array.isArray(valor)) return valor.map(claseSegura).filter(Boolean).join(' ');
  return claseSegura(valor);
}

function reglaCumple(regla: unknown, params: ParamsCelda): boolean {
  if (typeof regla === 'function') return Boolean(regla(params));
  if (typeof regla === 'string') return Boolean(evaluarExpresion(regla, ambitoDe(params)));
  return Boolean(regla);
}

export function clasesPorReglas(reglas: unknown, params: ParamsCelda): string {
  if (reglas == null || typeof reglas !== 'object') return '';
  let salida = '';
  for (const [clase, regla] of Object.entries(reglas)) {
    if (reglaCumple(regla, params)) salida = unirClases(salida, claseSegura(clase));
  }
  return salida;
}

/** `cellClass` admite string, arreglo o funcion. Un string es nombre de clase, nunca expresion. */
function clasesDe(opcion: unknown, params: ParamsCelda): string {
  if (typeof opcion === 'function') return aClases(opcion(params));
  return aClases(opcion);
}

export function clasesCelda(def: ColDefAg, params: ParamsCelda): string {
  const fija = def['cellClass'];
  const reglas = def['cellClassRules'];
  if (fija == null && reglas == null) return '';
  return unirClases(clasesDe(fija, params), clasesPorReglas(reglas, params));
}

export function estiloCelda(def: ColDefAg, params: ParamsCelda): string {
  const estilo = def['cellStyle'];
  if (estilo == null) return '';
  return estiloATexto(typeof estilo === 'function' ? estilo(params) : estilo);
}

export function clasesCabecera(def: ColDefAg, params: ParamsCelda): string {
  return clasesDe(def['headerClass'], params);
}

export function opcionesAClasesFila(rowClass: unknown, getRowClass: unknown, rowClassRules: unknown, params: ParamsCelda): string {
  const fija = aClases(rowClass);
  const calculada = typeof getRowClass === 'function' ? aClases(getRowClass(params)) : '';
  return unirClases(fija, calculada, clasesPorReglas(rowClassRules, params));
}

export function opcionesAEstiloFila(rowStyle: unknown, getRowStyle: unknown, params: ParamsCelda): string {
  const fijo = estiloATexto(rowStyle);
  return typeof getRowStyle === 'function' ? fijo + estiloATexto(getRowStyle(params)) : fijo;
}

/** Clases estructurales que AG agrega por posicion. */
export function clasesPosicionFila(indice: number, total: number): string {
  return unirClases(indice % 2 ? 'iswc-ag-row-odd' : 'iswc-ag-row-even', indice === 0 && 'iswc-ag-row-first', indice === total - 1 && 'iswc-ag-row-last');
}

/** Clases por la forma de la columna: alineacion, ajuste de texto. */
export function clasesColumna(def: ColDefAg): string {
  const tipo = def['type'];
  const tipos = Array.isArray(tipo) ? tipo : [tipo];
  const derecha = tipos.includes('rightAligned') || tipos.includes('numericColumn');
  return unirClases(derecha && 'iswc-ag-right', def['wrapText'] === true && 'iswc-ag-wrap', def['autoHeight'] === true && 'iswc-ag-auto-alto');
}
