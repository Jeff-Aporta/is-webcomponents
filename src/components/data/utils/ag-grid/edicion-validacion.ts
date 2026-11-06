/**
 * ag-grid/edicion/validacion — Reglas internas de los editores provistos.
 * Las plantillas de texto usan `{n}`; salen de `grid.texto` en quien llama.
 */
import type { ReglasValidacion, TextosValidacion, TipoValidacion } from './edicion.schemas.js';

function comoFecha(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const fecha = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function plantilla(texto: string, n: unknown): string {
  return texto.replace('{n}', String(n));
}

function validarTexto(valor: unknown, reglas: ReglasValidacion, textos: TextosValidacion): string[] {
  const largo = valor == null ? 0 : String(valor).length;
  if (reglas.maxLength != null && largo > reglas.maxLength) return [plantilla(textos.muyLargo, reglas.maxLength)];
  return [];
}

function validarNumero(valor: unknown, reglas: ReglasValidacion, textos: TextosValidacion): string[] {
  if (valor == null || valor === '') return [];
  const n = Number(valor);
  if (!Number.isFinite(n)) return [textos.noNumero];
  if (reglas.min != null && n < Number(reglas.min)) return [plantilla(textos.mayorQue, reglas.min)];
  if (reglas.max != null && n > Number(reglas.max)) return [plantilla(textos.menorQue, reglas.max)];
  return [];
}

function validarFecha(valor: unknown, reglas: ReglasValidacion, textos: TextosValidacion): string[] {
  if (valor == null || valor === '') return [];
  const fecha = comoFecha(valor);
  if (!fecha) return [textos.noFecha];
  const min = comoFecha(reglas.min);
  const max = comoFecha(reglas.max);
  if (min && fecha < min) return [plantilla(textos.mayorQue, reglas.min instanceof Date ? min.toISOString().slice(0, 10) : reglas.min)];
  if (max && fecha > max) return [plantilla(textos.menorQue, reglas.max instanceof Date ? max.toISOString().slice(0, 10) : reglas.max)];
  return [];
}

export function erroresInternos(tipo: TipoValidacion, valor: unknown, reglas: ReglasValidacion, textos: TextosValidacion): string[] {
  if (tipo === 'numero') return validarNumero(valor, reglas, textos);
  if (tipo === 'fecha') return validarFecha(valor, reglas, textos);
  return validarTexto(valor, reglas, textos);
}

/** `getValidationErrors` reemplaza lo interno; devolver null significa valido. */
export function resolverErrores(internos: string[], propio: unknown, params: Record<string, unknown>): string[] {
  if (typeof propio !== 'function') return internos;
  const salida = propio({ ...params, internalErrors: internos.length ? internos : null });
  return Array.isArray(salida) ? salida.map(String) : [];
}
