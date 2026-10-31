/**
 * ag-grid/celdas/spark — Sparkline de celda como string SVG, sin medir el DOM.
 *
 * `<iswc-sparkline>` por celda no resiste virtualizacion (shadow, ResizeObserver
 * y getComputedStyle en cada instancia), asi que aqui se reusan las mismas
 * primitivas de trazado del kit (`svg-chart-engine`) en un viewBox fijo 100x100
 * estirado con preserveAspectRatio="none": el ancho real lo pone CSS y el pool
 * de celdas puede reciclar el string. Los puntos van en spans porque un circulo
 * dentro del SVG se deformaria al estirarse.
 */

import type { Punto, Curva, Caja } from './spark.schemas.js';
export type * from './spark.schemas.js';
import { pathArea, pathLine } from '../../../../../core/svg-chart-engine.js';
import { aEm, escaparHtml, limpiarCss } from './html.js';
import type { EstiloPunto, OpcionesSparkline } from './schemas.js';


const TRAZO_POR_DEFECTO = 'var(--iswc-grid-spark, var(--iswc-accent))';
const SUBE = 'var(--iswc-grid-up)';
const BAJA = 'var(--iswc-grid-down)';
const memoria = new WeakMap<object, Map<string, string>>();

function yValido(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** Numeros, tuplas [x, y] u objetos con xKey/yKey. Una Y invalida queda como hueco (null). */
export function normalizarSerie(valor: unknown, o: OpcionesSparkline = {}): Array<number | null> {
  if (!Array.isArray(valor)) return [];
  const clave = o.yKey ?? 'y';
  return valor.map((item: unknown) => {
    if (Array.isArray(item)) return yValido(item[1]);
    if (item != null && typeof item === 'object') return yValido((item as Record<string, unknown>)[clave]);
    return yValido(item);
  });
}

export function resumenSerie(serie: Array<number | null>): { n: number; primero: number | null; ultimo: number | null; min: number | null; max: number | null } {
  const validos = serie.filter((v): v is number => v != null);
  if (!validos.length) return { n: 0, primero: null, ultimo: null, min: null, max: null };
  return { n: validos.length, primero: validos[0] ?? null, ultimo: validos[validos.length - 1] ?? null, min: Math.min(...validos), max: Math.max(...validos) };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function cajaDe(o: OpcionesSparkline, porDefecto: number): Caja {
  const p = o.padding ?? {};
  return { arriba: p.top ?? porDefecto, derecha: p.right ?? 0, abajo: p.bottom ?? porDefecto, izquierda: p.left ?? 0 };
}

function segmentos(puntos: Array<Punto | null>): Punto[][] {
  const salida: Punto[][] = [];
  let actual: Punto[] = [];
  for (const punto of puntos) {
    if (punto) {
      actual.push(punto);
      continue;
    }
    if (actual.length) salida.push(actual);
    actual = [];
  }
  if (actual.length) salida.push(actual);
  return salida;
}

function estiloDe(o: OpcionesSparkline, serie: Array<number | null>, i: number, min: number, max: number): EstiloPunto | null {
  const y = serie[i];
  if (!o.itemStyler || y == null) return null;
  return o.itemStyler({ first: i === 0, last: i === serie.length - 1, min: y === min, max: y === max, yValue: y, xIndex: i }) ?? null;
}

function puntoHtml(p: Punto, color: string, tamano: number, borde?: string): string {
  const contorno = borde ? `;box-shadow:0 0 0 .0625em ${escaparHtml(limpiarCss(borde))}` : '';
  return `<i class="iswc-ag-spark-punto" style="left:${p.x}%;top:${p.y}%;--t:${aEm(tamano)};background:${escaparHtml(limpiarCss(color))}${contorno}"></i>`;
}

function trazarLinea(serie: Array<number | null>, o: OpcionesSparkline, min: number, max: number, color: string): string {
  const caja = cajaDe(o, 12);
  const ancho = 100 - caja.izquierda - caja.derecha;
  const alto = 100 - caja.arriba - caja.abajo;
  const rango = max - min || 1;
  const pasos = Math.max(serie.length - 1, 1);
  const llano = max === min;
  const puntos = serie.map((v, i) => {
    if (v == null) return null;
    const y = llano ? caja.arriba + alto / 2 : caja.arriba + alto - ((v - min) / rango) * alto;
    return { x: redondear(caja.izquierda + (i / pasos) * ancho), y: redondear(y) };
  });
  const tipoCurva = o.interpolation?.type;
  const curva: Curva = tipoCurva === 'smooth' ? 'natural' : tipoCurva === 'step' ? 'step' : 'linear';
  const trazo = escaparHtml(limpiarCss(color));
  const grosor = o.strokeWidth ?? 1.5;
  let cuerpo = '';
  for (const tramo of segmentos(puntos)) {
    if (o.type === 'area') {
      const relleno = escaparHtml(limpiarCss(o.fill ?? color));
      cuerpo += `<path d="${pathArea(tramo, String(100 - caja.abajo), { curve: curva })}" fill="${relleno}" fill-opacity="${o.fillOpacity ?? 0.18}" stroke="none"/>`;
    }
    cuerpo += `<path d="${pathLine(tramo, { curve: curva })}" fill="none" stroke="${trazo}" stroke-width="${grosor}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  const marcas: string[] = [];
  const marcador = o.marker ?? {};
  const tamanoBase = marcador.enabled === false ? 0 : (marcador.size ?? 0);
  puntos.forEach((p, i) => {
    if (!p) return;
    const propio = estiloDe(o, serie, i, min, max);
    const tamano = propio?.size ?? tamanoBase;
    if (tamano > 0) marcas.push(puntoHtml(p, propio?.fill ?? marcador.fill ?? color, tamano, propio?.stroke ?? marcador.stroke));
  });
  if (o.marcarUltimo) {
    const ultimo = [...puntos].reverse().find((p) => p != null);
    if (ultimo) marcas.push(puntoHtml(ultimo, color, 4.5));
  }
  return svg(cuerpo) + marcas.join('');
}

function trazarBarras(serie: Array<number | null>, o: OpcionesSparkline, min: number, max: number, color: string): string {
  const horizontal = o.direction === 'horizontal';
  const base = Math.min(Math.max(0, min), max);
  const techo = Math.max(max, base);
  const piso = Math.min(min, base);
  const rango = techo - piso || 1;
  const banda = 100 / Math.max(serie.length, 1);
  const ancho = banda * 0.72;
  const origen = ((base - piso) / rango) * 100;
  let cuerpo = '';
  serie.forEach((v, i) => {
    if (v == null) return;
    const propio = estiloDe(o, serie, i, min, max);
    const relleno = propio?.fill ?? o.fill ?? (v < base ? BAJA : color);
    const largo = Math.max((Math.abs(v - base) / rango) * 100, 1.5);
    const inicio = v < base ? origen - largo : origen;
    const eje = redondear(i * banda + (banda - ancho) / 2);
    const rect = horizontal
      ? `x="${redondear(inicio)}" y="${eje}" width="${redondear(largo)}" height="${redondear(ancho)}"`
      : `x="${eje}" y="${redondear(100 - inicio - largo)}" width="${redondear(ancho)}" height="${redondear(largo)}"`;
    cuerpo += `<rect ${rect} fill="${escaparHtml(limpiarCss(relleno))}"/>`;
  });
  return svg(cuerpo);
}

function svg(cuerpo: string): string {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
}

function clavePara(o: OpcionesSparkline, etiqueta: string): string | null {
  if (o.itemStyler) return null;
  return `${etiqueta}|${JSON.stringify(o)}`;
}

function construir(valor: unknown, o: OpcionesSparkline, etiqueta: string): string {
  const serie = normalizarSerie(valor, o);
  const resumen = resumenSerie(serie);
  if (resumen.min == null || resumen.max == null) return '';
  const min = o.min ?? resumen.min;
  const max = o.max ?? resumen.max;
  const haciaArriba = (resumen.ultimo ?? 0) >= (resumen.primero ?? 0);
  const color = o.stroke ?? (o.tendencia ? (haciaArriba ? SUBE : BAJA) : TRAZO_POR_DEFECTO);
  const esBarra = o.type === 'bar' || o.type === 'column';
  const cuerpo = esBarra ? trazarBarras(serie, o, min, max, color) : trazarLinea(serie, o, min, max, color);
  const accesible = etiqueta ? `role="img" aria-label="${escaparHtml(etiqueta)}"` : 'aria-hidden="true"';
  return `<span class="iswc-ag-spark" ${accesible}>${cuerpo}</span>`;
}

/** HTML de la sparkline. Se memoiza por identidad del arreglo: al hacer scroll no se retraza. */
export function htmlSparkline(valor: unknown, o: OpcionesSparkline = {}, etiqueta = ''): string {
  if (!Array.isArray(valor)) return '';
  const clave = clavePara(o, etiqueta);
  if (clave == null) return construir(valor, o, etiqueta);
  let porOpciones = memoria.get(valor);
  if (!porOpciones) {
    porOpciones = new Map();
    memoria.set(valor, porOpciones);
  }
  let html = porOpciones.get(clave);
  if (html == null) {
    html = construir(valor, o, etiqueta);
    porOpciones.set(clave, html);
  }
  return html;
}
