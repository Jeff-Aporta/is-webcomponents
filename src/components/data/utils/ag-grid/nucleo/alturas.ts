import type { VentanaFilas } from './alturas.schemas.js';
export type * from './alturas.schemas.js';
/**
 * nucleo/alturas — Indice de alturas de fila para virtualizar.
 *
 * Con alto uniforme la posicion es una multiplicacion. Cuando alguna fila
 * difiere (detalle, autoHeight, getRowHeight) se construye una suma prefija y
 * la ventana se busca por biseccion. Medidas en px: solo se usan para la
 * matematica del scroll; al DOM llegan convertidas a em.
 */


export function crearAlturas() {
  let cantidad = 0;
  let base = 0;
  let prefijo: Float64Array | null = null;

  function configurar(n: number, altoBase: number, altoDe: ((i: number) => number | undefined) | null): void {
    cantidad = n;
    base = altoBase;
    prefijo = null;
    if (!altoDe) return;
    const suma = new Float64Array(n + 1);
    let variable = false;
    for (let i = 0; i < n; i++) {
      const a = altoDe(i);
      if (a !== undefined && a !== altoBase) variable = true;
      suma[i + 1] = suma[i]! + (a ?? altoBase);
    }
    if (variable) prefijo = suma;
  }

  function arriba(i: number): number {
    return prefijo ? (prefijo[Math.max(0, Math.min(i, cantidad))] ?? 0) : i * base;
  }

  function alto(i: number): number {
    return arriba(i + 1) - arriba(i);
  }

  function total(): number {
    return arriba(cantidad);
  }

  function indiceEn(y: number): number {
    if (!prefijo) return base > 0 ? Math.floor(y / base) : 0;
    let lo = 0;
    let hi = cantidad;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (prefijo[m]! <= y) lo = m;
      else hi = m - 1;
    }
    return lo;
  }

  function ventana(scroll: number, alturaVista: number, margen: number): VentanaFilas {
    const primero = indiceEn(scroll);
    const ultimo = indiceEn(scroll + alturaVista);
    return { inicio: Math.max(0, primero - margen), fin: Math.min(cantidad, ultimo + 1 + margen), total: total() };
  }

  return { configurar, arriba, alto, total, indiceEn, ventana };
}

