/**
 * flowchart-labels — las etiquetas de las aristas como ENTIDADES del layout (estilo insoft).
 *
 * Una etiqueta ocupa una caja y guarda 1U (el paso de la rejilla de ruteo, 15 px) con todo lo demás:
 *   - nodos, insignias y títulos de carriles / grupos (estos empujan pero nunca se mueven),
 *   - las demás etiquetas (nunca se cruzan),
 *   - las aristas ajenas (ningún riel pasa por encima de un texto).
 * Con su arista dueña la regla es otra: va PEGADA a ella (a media U) sin taparla; si al ubicarse
 * cae encima de su propia línea se corre lo justo (≤ 1U) a un costado.
 *
 * Cada etiqueta prueba candidatas a lo largo de su arista (la posición que propuso el ruteo
 * primero, luego cerca del arranque, del final y del centro de cada tramo, a uno y otro lado).
 * Si es larga se parte en un rectángulo de ancho máximo (2 líneas) y, si aun así no cabe, se
 * resume con «…». Lo que no encuentra sitio se devuelve como conflicto: el layout abre espacio
 * (empuja las entidades) y vuelve a rutear.
 */
import { ROUTING_COSTS_DEFAULTS } from './routing-costs.js';
import { pathPoints } from '../_shared/diagram-arrow.js';
import type { EmbedBox } from '../_shared/diagram-embed.schemas.js';
import type { FlowLayoutEdge, FlowLayoutNode, FlowPoint } from './flowchart-spec.schemas.js';

/** 1U (el paso de la rejilla de ruteo del kit, 15 px): margen de las etiquetas con todo lo que no es su arista. */
export const U = ROUTING_COSTS_DEFAULTS.grid.step;
/** Ancho máximo de una etiqueta antes de partirse (20U). */
export const ETIQUETA_MAX_W = 20 * U;
/** Interlineado y distancia a la arista dueña. */
export const ETIQUETA_LINE_H = 12;
/** Ícono de la etiqueta: lado y aire hasta el texto. */
export const ETIQUETA_ICONO = 12;
const ICONO_AIRE = 3;
const PEGADA = U / 2;

const corta = (a: EmbedBox, b: EmbedBox, m = 0): boolean =>
  a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

/** Caja fina de un tramo ortogonal (para medir choques con textos). */
const cajaTramo = (p: FlowPoint, q: FlowPoint): EmbedBox => ({
  x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.max(1, Math.abs(q.x - p.x)), h: Math.max(1, Math.abs(q.y - p.y)),
});

/** Parte un texto en líneas de ancho ≤ `max` (por palabras); más de 2 líneas → 2 con «…». */
export function partirEtiqueta(texto: string, max: number, mide: (t: string) => number): string[] {
  if (mide(texto) <= max) return [texto];
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (mide(prueba) <= max || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length <= 2) return lineas;
  return [lineas[0]!, resumir(lineas.slice(1).join(' '), max, mide)];
}

/** Recorta con «…» hasta caber en `max`. */
export function resumir(texto: string, max: number, mide: (t: string) => number): string {
  if (mide(texto) <= max) return texto;
  let t = texto;
  while (t.length > 1 && mide(`${t}…`) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Caja de la etiqueta tal como la dejó el ruteo (x/y/anchor de una línea). */
function cajaInicial(e: FlowLayoutEdge, w: number, h: number): EmbedBox {
  const a = e.labelAnchor ?? 'middle';
  const x = a === 'start' ? e.labelX : a === 'end' ? e.labelX - w : e.labelX - w / 2;
  return { x, y: e.labelY - 9.5, w, h };
}

/**
 * Candidatas COHERENTES: el riel pasa por los lados largos de la caja.
 *   - horizontal: a lo largo de un tramo horizontal, encima o debajo, con la caja entera dentro del
 *     tramo (el riel recorre todo su lado largo);
 *   - vertical: a lo largo de un tramo vertical, a la derecha o a la izquierda, igual de contenida.
 * Por tramo (primero, último, resto) y, dentro del tramo, cada 2U desde el arranque.
 */
function candidatas(pts: readonly FlowPoint[], w: number, h: number, vertical: boolean): EmbedBox[] {
  const out: EmbedBox[] = [];
  const orden = [0, pts.length - 2, ...Array.from({ length: Math.max(0, pts.length - 3) }, (_, i) => i + 1)];
  for (const k of [...new Set(orden)].filter((k) => k >= 0)) {
    const p = pts[k]!;
    const q = pts[k + 1]!;
    if (!vertical && p.y === q.y) {
      const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
      for (let x = x0 + U; x + w <= x1 - U; x += 2 * U) {
        out.push({ x, y: p.y - PEGADA - h, w, h }); // encima
        out.push({ x, y: p.y + PEGADA, w, h }); // debajo
      }
    } else if (vertical && p.x === q.x) {
      const [y0, y1] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
      for (let y = y0 + U; y + h <= y1 - U; y += 2 * U) {
        out.push({ x: p.x + PEGADA, y, w, h }); // a la derecha
        out.push({ x: p.x - PEGADA - w, y, w, h }); // a la izquierda
      }
    }
  }
  return out;
}

/** ¿El riel recorre el lado largo de la caja? (horizontal: encima/debajo; vertical: a un costado). */
function coherente(c: EmbedBox, pts: readonly FlowPoint[], vertical: boolean): boolean {
  return pts.slice(1).some((q, k) => {
    const p = pts[k]!;
    if (!vertical && p.y === q.y) {
      const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
      const pegada = Math.abs(c.y + c.h + PEGADA - p.y) <= 1 || Math.abs(c.y - PEGADA - p.y) <= 1;
      return pegada && c.x >= x0 - 0.5 && c.x + c.w <= x1 + 0.5;
    }
    if (vertical && p.x === q.x) {
      const [y0, y1] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
      const pegada = Math.abs(c.x + c.w + PEGADA - p.x) <= 1 || Math.abs(c.x - PEGADA - p.x) <= 1;
      return pegada && c.y >= y0 - 0.5 && c.y + c.h <= y1 + 0.5;
    }
    return false;
  });
}

/**
 * Ubica todas las etiquetas sin choques. Muta cada arista (`labelBox`, `labelLines`, `labelX/Y`,
 * `labelAnchor`, `labelVertical`) y devuelve las que no encontraron sitio (para abrir espacio ahí).
 * `fijos`: cajas que empujan y no se mueven (títulos de carriles y grupos, insignias).
 * Orientación: horizontal (preferencia INSOFT); vertical solo si la arista la pide (`labelVertical`
 * en el spec) o si no tiene ningún tramo horizontal. Lo que no cabe abre espacio. Con el emisor y el receptor guarda 3U (si no
 * cabe, 1U).
 */
export function resolverEtiquetas(
  edges: FlowLayoutEdge[],
  nodes: readonly FlowLayoutNode[],
  fijos: readonly EmbedBox[],
  mide: (t: string) => number,
  lienzo: { w: number; h: number },
): Array<{ caja: EmbedBox; edge: number; tramo: 'h' | 'v' }> {
  const tramos = edges.map((e) => {
    const pts = pathPoints(e.path);
    return pts.slice(1).map((q, i) => cajaTramo(pts[i]!, q));
  });
  const ocupadas: EmbedBox[] = [];
  const conflictos: Array<{ caja: EmbedBox; edge: number; tramo: 'h' | 'v' }> = [];
  const cajaDe = (n: FlowLayoutNode): EmbedBox => ({ x: n.x, y: n.y, w: n.w, h: n.h });
  edges.forEach((e, i) => {
    if (!e.label) return;
    const pts = pathPoints(e.path);
    const extremos = nodes.filter((n) => n.id === e.from || n.id === e.to).map(cajaDe);
    const otros = [...nodes.filter((n) => n.id !== e.from && n.id !== e.to).map(cajaDe), ...fijos];
    const libre = (c: EmbedBox, margenExtremos: number): boolean =>
      c.x >= 0 && c.y >= 0 && c.x + c.w <= lienzo.w && c.y + c.h <= lienzo.h
      && !extremos.some((b) => corta(c, b, margenExtremos))
      && !otros.some((b) => corta(c, b, U))
      && !ocupadas.some((b) => corta(c, b, U))
      && !tramos.some((ts, j) => (j === i ? ts.some((t) => corta(c, t, 1)) : ts.some((t) => corta(c, t, U))));
    const pideVertical = e.labelPide === 'vertical';
    // Con ícono, la caja reserva su lado (más el aire) delante del texto.
    const extra = e.labelIcon ? ETIQUETA_ICONO + ICONO_AIRE : 0;
    const horizontales = [partirEtiqueta(e.label, ETIQUETA_MAX_W - extra, mide), [resumir(e.label, ETIQUETA_MAX_W / 2, mide)]];
    const verticales = [[e.label], [resumir(e.label, ETIQUETA_MAX_W / 2, mide)], [resumir(e.label, ETIQUETA_MAX_W / 4, mide)]];
    // INSOFT: horizontal siempre; la vertical solo si la arista la pide. Si no cabe, se abre espacio
    // (no se gira ni se recorta una etiqueta que la arista no pidió vertical).
    // Sin ningún tramo horizontal (una recta vertical), lo coherente es vertical: empujar no crea tramos.
    const sinHorizontal = !pts.slice(1).some((q, k) => q.y === pts[k]!.y && q.x !== pts[k]!.x);
    const intentos: Array<{ lineas: string[]; vertical: boolean }> = pideVertical || sinHorizontal
      ? verticales.map((lineas) => ({ lineas, vertical: true }))
      : [{ lineas: horizontales[0]!, vertical: false }];
    let elegida: { caja: EmbedBox; lineas: string[]; vertical: boolean } | null = null;
    let preferida: { caja: EmbedBox; vertical: boolean } | null = null;
    // Orden: horizontal (3U, luego 1U de los extremos) y solo después vertical (3U, 1U).
    const rondas = [false, true].flatMap((v) => [3 * U, U].map((margen) => ({ v, margen })));
    for (const { v, margen } of rondas) {
      for (const { lineas, vertical } of intentos.filter((x) => x.vertical === v)) {
        const largo = Math.ceil(Math.max(...lineas.map(mide))) + 4 + extra;
        const w = vertical ? ETIQUETA_LINE_H : largo;
        const h = vertical ? largo : lineas.length * ETIQUETA_LINE_H;
        // La caja de la pasada anterior primero (si sigue valiendo, no se mueve: determinismo).
        const previa = e.labelBox && Math.abs(e.labelBox.w - w) < 1 && Math.abs(e.labelBox.h - h) < 1 ? [e.labelBox] : [];
        const inicial = vertical ? [] : [cajaInicial(e, w, h)];
        const cands = [...previa, ...inicial, ...candidatas(pts, w, h, vertical)].filter((c) => coherente(c, pts, vertical));
        preferida ??= cands[0] ? { caja: cands[0], vertical } : null;
        const c = cands.find((x) => libre(x, margen));
        if (c) {
          elegida = { caja: c, lineas, vertical };
          break;
        }
      }
      if (elegida) break;
    }
    if (!elegida) {
      // Sin sitio: se abre espacio a lo largo del tramo más largo de la arista (donde cabría horizontal).
      let largoMax = -1;
      let tramo: 'h' | 'v' = 'h';
      let ref: FlowPoint = pts[0] ?? { x: 0, y: 0 };
      pts.slice(1).forEach((q, k) => {
        const p = pts[k]!;
        const l = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
        if (p.y === q.y && l > largoMax) { largoMax = l; tramo = 'h'; ref = { x: Math.min(p.x, q.x), y: p.y }; }
      });
      if (largoMax < 0) { tramo = 'v'; ref = pts[0] ?? ref; }
      const lineas = horizontales[0]!;
      const w = Math.ceil(Math.max(...lineas.map(mide))) + 4 + extra;
      const h = lineas.length * ETIQUETA_LINE_H;
      // Sin sitio limpio: al menos no pisa otro texto (los textos son entidades; nunca se montan).
      const sinTexto = (c: EmbedBox): boolean => !ocupadas.some((o) => corta(c, o, 2));
      const cands = [
        ...(preferida ? [preferida] : []),
        ...candidatas(pts, w, h, false).map((caja) => ({ caja, vertical: false })),
        ...candidatas(pts, ETIQUETA_LINE_H, w, true).map((caja) => ({ caja, vertical: true })),
      ];
      // Primero sin texto ni nodo encima; si no hay, al menos sin texto.
      const sinNodo = (c: EmbedBox): boolean => !nodes.some((n) => corta(c, { x: n.x, y: n.y, w: n.w, h: n.h }, 2));
      const sinChoque = cands.find((c) => sinTexto(c.caja) && sinNodo(c.caja)) ?? cands.find((c) => sinTexto(c.caja));
      if (sinChoque) preferida = sinChoque;
      const caja = preferida?.caja ?? { x: ref.x + U, y: ref.y - PEGADA - h, w, h };
      conflictos.push({ caja, edge: i, tramo });
      elegida = { caja, lineas: preferida?.vertical ? [e.label] : lineas, vertical: !!preferida?.vertical };
    }
    const { caja, lineas, vertical } = elegida;
    e.labelBox = caja;
    e.labelLines = lineas;
    e.labelVertical = vertical || undefined;
    if (vertical) {
      // Girada −90° alrededor de su centro: el texto corre de abajo arriba dentro de la caja.
      // El ícono va abajo (el texto corre de abajo arriba): el texto se centra en el resto.
      e.labelX = caja.x + caja.w - 2;
      e.labelY = caja.y + (caja.h - extra) / 2;
      e.labelAnchor = 'middle';
    } else {
      e.labelX = caja.x + 2 + extra;
      e.labelY = caja.y + 9.5;
      e.labelAnchor = 'start';
    }
    ocupadas.push(caja);
  });
  return conflictos;
}
