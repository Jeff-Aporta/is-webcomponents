// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion-relleno — Calculo puro del fill handle.
 *
 *   - `planRelleno`: que rango resulta de soltar el asa en una celda.
 *   - `valoresRelleno`: serie que ocupa las celdas nuevas.
 */
import { contiene } from './edicion-rangos.js';
import type { EjeRelleno, PlanRelleno, Posicion, Rango } from './edicion.schemas.js';

const PRECISION = 12;

function sinRuido(n: number): number {
  return Number(n.toPrecision(PRECISION));
}

export function esNumero(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'string') return false;
  if (v.trim() === '') return false;
  return Number.isFinite(Number(v));
}

/** Recta de minimos cuadrados sobre x = 0..n-1. */
export function regresion(valores: number[]): { pendiente: number; origen: number } {
  const n = valores.length;
  if (n < 2) return { pendiente: 0, origen: valores[0] ?? 0 };
  const mediaX = (n - 1) / 2;
  const mediaY = valores.reduce((s, v) => s + v, 0) / n;
  let numerador = 0;
  let denominador = 0;
  valores.forEach((v, i) => {
    numerador += (i - mediaX) * (v - mediaY);
    denominador += (i - mediaX) ** 2;
  });
  const pendiente = numerador / denominador;
  return { pendiente, origen: mediaY - pendiente * mediaX };
}

/**
 * Genera `cantidad` valores que continuan `origen`. `inverso` es arrastrar
 * hacia arriba o la izquierda: la serie sigue hacia atras. Con `alt`:
 * una celda numerica incrementa de a uno y un rango numerico se repite.
 */
export function valoresRelleno(origen: unknown[], cantidad: number, inverso: boolean, alt: boolean): unknown[] {
  const salida: unknown[] = [];
  const todosNumero = origen.length > 0 && origen.every(esNumero);
  if (origen.length === 1 && todosNumero && alt) {
    const base = Number(origen[0]);
    for (let i = 1; i <= cantidad; i++) salida.push(sinRuido(base + (inverso ? -i : i)));
    return salida;
  }
  if (origen.length > 1 && todosNumero && !alt) {
    const { pendiente, origen: b } = regresion(origen.map(Number));
    for (let i = 0; i < cantidad; i++) {
      const x = inverso ? -1 - i : origen.length + i;
      salida.push(sinRuido(b + pendiente * x));
    }
    return salida;
  }
  const n = origen.length;
  for (let i = 0; i < cantidad; i++) {
    const indice = inverso ? n - 1 - (i % n) : i % n;
    salida.push(origen[indice]);
  }
  return salida;
}

function reducir(r: Rango, destino: Posicion, direccion: EjeRelleno): PlanRelleno {
  const restoFilas = r.filaHasta - destino.fila;
  const restoCols = r.colHasta - destino.col;
  const porFilas = direccion === 'y' || (direccion === 'xy' && restoFilas >= restoCols);
  if (porFilas) {
    if (restoFilas === 0) return { eje: null, inverso: false, final: r, nuevas: null, reducidas: null };
    const reducidas = { ...r, filaDesde: destino.fila + 1 };
    return { eje: 'y', inverso: true, final: { ...r, filaHasta: destino.fila }, nuevas: null, reducidas };
  }
  if (restoCols === 0) return { eje: null, inverso: false, final: r, nuevas: null, reducidas: null };
  const reducidas = { ...r, colDesde: destino.col + 1 };
  return { eje: 'x', inverso: true, final: { ...r, colHasta: destino.col }, nuevas: null, reducidas };
}

/** Decide el eje con mas distancia y separa celdas nuevas de celdas que salen del rango. */
export function planRelleno(r: Rango, destino: Posicion, direccion: EjeRelleno): PlanRelleno {
  if (contiene(r, destino)) return reducir(r, destino, direccion);
  const filas = destino.fila > r.filaHasta ? destino.fila - r.filaHasta : Math.max(0, r.filaDesde - destino.fila);
  const cols = destino.col > r.colHasta ? destino.col - r.colHasta : Math.max(0, r.colDesde - destino.col);
  const usarFilas = direccion === 'y' || (direccion === 'xy' && filas >= cols);
  const sinCambio: PlanRelleno = { eje: null, inverso: false, final: r, nuevas: null, reducidas: null };
  if (usarFilas) {
    if (filas === 0) return sinCambio;
    const inverso = destino.fila < r.filaDesde;
    const nuevas = inverso ? { ...r, filaDesde: destino.fila, filaHasta: r.filaDesde - 1 } : { ...r, filaDesde: r.filaHasta + 1, filaHasta: destino.fila };
    const final = inverso ? { ...r, filaDesde: destino.fila } : { ...r, filaHasta: destino.fila };
    return { eje: 'y', inverso, final, nuevas, reducidas: null };
  }
  if (cols === 0) return sinCambio;
  const inverso = destino.col < r.colDesde;
  const nuevas = inverso ? { ...r, colDesde: destino.col, colHasta: r.colDesde - 1 } : { ...r, colDesde: r.colHasta + 1, colHasta: destino.col };
  const final = inverso ? { ...r, colDesde: destino.col } : { ...r, colHasta: destino.col };
  return { eje: 'x', inverso, final, nuevas, reducidas: null };
}
