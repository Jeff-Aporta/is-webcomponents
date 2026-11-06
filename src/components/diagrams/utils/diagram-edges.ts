/**
 * Puntas de flecha para diagramas.
 *
 * El problema que resuelve: cada diagrama dibujaba su cabeza asumiendo que la
 * arista llegaba en horizontal. Cuando el router ortogonal desviaba la última
 * curva, la punta quedaba apuntando de lado y separada visualmente de la línea
 * ("la flecha no toca la línea"). Aquí la orientación sale del ÚLTIMO TRAMO
 * REAL del path, no de la dirección global origen→destino.
 */
import { svgEl } from '@jeff-aporta/iswc-base/core/svg-chart-engine.js';
import type { ArrowPoint, SvgArrowHeadOpts, SpreadPoint, SpreadItem, EdgeWithHue, Colored, Edged } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-edges.schemas.js';
import { type Run } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-edges.schemas.js';
import { tkHueToHex, bg2fontColor } from '@jeff-aporta/iswc-base/core/color.js';

/** Punto en píxeles. */

/**
 * Puntos absolutos de un path ortogonal (`M`/`L`/`H`/`V`, may/min).
 * Solo se usan comandos de línea: los diagramas del kit no emiten curvas.
 */
export function pathPoints(d: string): ArrowPoint[] {
  const points: ArrowPoint[] = [];
  let x = 0;
  let y = 0;
  const tokens = String(d || '').match(/[MmLlHhVv][^MmLlHhVvZz]*/g) || [];
  for (const token of tokens) {
    const cmd = token[0]!;
    const nums = (token.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L':
        for (let i = 0; i + 1 < nums.length; i += 2) {
          x = rel ? x + nums[i]! : nums[i]!;
          y = rel ? y + nums[i + 1]! : nums[i + 1]!;
          points.push({ x, y });
        }
        break;
      case 'H':
        for (const n of nums) {
          x = rel ? x + n : n;
          points.push({ x, y });
        }
        break;
      case 'V':
        for (const n of nums) {
          y = rel ? y + n : n;
          points.push({ x, y });
        }
        break;
      default:
        break;
    }
  }
  return points;
}

/**
 * Vector unitario del último tramo con longitud real del path.
 * Si el path no da información utilizable, cae al `fallback`.
 * Por defecto el fallback apunta hacia la derecha.
 */
export function pathEndDirection(d: string, fallback: ArrowPoint = { x: 1, y: 0 }): ArrowPoint {
  const points = pathPoints(d);
  for (let i = points.length - 1; i > 0; i -= 1) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) return { x: dx / len, y: dy / len };
  }
  return fallback;
}

/**
 * Triángulo con vértice en `tip`, apuntando según `dir`.
 * @returns Atributo `points` de un `<polygon>`.
 */
export function arrowHeadPoints(tip: ArrowPoint, dir: ArrowPoint, len: number = 7, halfWidth: number = 3.5): string {
  // Perpendicular en 2D: (-dy, dx).
  const baseX = tip.x - dir.x * len;
  const baseY = tip.y - dir.y * len;
  const px = -dir.y * halfWidth;
  const py = dir.x * halfWidth;
  return [
    `${tip.x},${tip.y}`,
    `${baseX + px},${baseY + py}`,
    `${baseX - px},${baseY - py}`,
  ].join(' ');
}

/**
 * Punta ABIERTA (dos trazos en V, sin relleno) con vértice en `tip`, apuntando según `dir`.
 * @returns Atributo `points` de un `<polyline>` (base, vértice, base).
 */
export function openArrowHeadPoints(tip: ArrowPoint, dir: ArrowPoint, len: number = 9, halfWidth: number = 4.5): string {
  const baseX = tip.x - dir.x * len;
  const baseY = tip.y - dir.y * len;
  const px = -dir.y * halfWidth;
  const py = dir.x * halfWidth;
  return `${baseX + px},${baseY + py} ${tip.x},${tip.y} ${baseX - px},${baseY - py}`;
}

/**
 * `<polygon>` de cabeza de flecha ya orientado contra el final del path.
 */
export function svgArrowHead({
  d, tip, color, len = 7, halfWidth = 3.5, className = null, fallbackDir,
}: SvgArrowHeadOpts): SVGElement {
  const dir = pathEndDirection(d, fallbackDir);
  return svgEl('polygon', {
    points: arrowHeadPoints(tip, dir, len, halfWidth),
    fill: color,
    class: className,
  });
}

/**
 * Auto-cruce PROHIBIDO: una arista nunca se corta (ni se pisa) a sí misma. Si su polilínea ortogonal
 * se cruza, se corta en el cruce y se descarta el bucle: la ruta resultante solo usa tramos que ya
 * tenía (no invade terreno nuevo) y conserva sus extremos. Sin cruce devuelve los mismos puntos.
 */
export function quitarAutoCruces(pts: readonly ArrowPoint[]): ArrowPoint[] {
  const ortogonal = pts.slice(1).every((q, k) => q.x === pts[k]!.x || q.y === pts[k]!.y);
  if (!ortogonal) return [...pts];
  let p = [...pts];
  let cambio = false;
  for (let vuelta = 0; vuelta < 64; vuelta++) {
    const limpio = sinRetrocesos(p);
    if (limpio.length !== p.length) cambio = true;
    p = limpio;
    let corte: { i: number; j: number; x: ArrowPoint } | null = null;
    for (let i = 0; i < p.length - 1 && !corte; i++) {
      // El tramo más lejano que toca al i-ésimo: se descarta el bucle más grande.
      for (let j = p.length - 2; j >= i + 2; j--) {
        const x = cruceOrtogonal(p[i]!, p[i + 1]!, p[j]!, p[j + 1]!);
        if (x) { corte = { i, j, x }; break; }
      }
    }
    if (!corte) break;
    p = [...p.slice(0, corte.i + 1), corte.x, ...p.slice(corte.j + 1)];
    cambio = true;
  }
  return cambio ? p : [...pts];
}

/** ¿La polilínea ortogonal se cruza o se pisa a sí misma? (guardianes y diagnósticos). */
export function tieneAutoCruce(pts: readonly ArrowPoint[]): boolean {
  const sinRepetidos = pts.filter((q, k) => !k || q.x !== pts[k - 1]!.x || q.y !== pts[k - 1]!.y);
  if (huboRetroceso(sinRepetidos)) return true;
  const p = sinRetrocesos(sinRepetidos);
  for (let i = 0; i < p.length - 1; i++) {
    for (let j = i + 2; j < p.length - 1; j++) if (cruceOrtogonal(p[i]!, p[i + 1]!, p[j]!, p[j + 1]!)) return true;
  }
  return false;
}

/** Path `M/L` de una polilínea. */
function polilineaPath(pts: readonly ArrowPoint[]): string {
  return pts.map((q, i) => `${i ? 'L' : 'M'}${q.x},${q.y}`).join(' ');
}

/** Igual que `quitarAutoCruces`, sobre un path: devuelve el mismo `d` si no había cruce. */
export function pathSinAutoCruces(d: string): string {
  const pts = pathPoints(d);
  const limpio = quitarAutoCruces(pts);
  return limpio.length === pts.length && limpio.every((q, k) => q.x === pts[k]!.x && q.y === pts[k]!.y) ? d : polilineaPath(limpio);
}

/** Un tramo que vuelve sobre el anterior (ida y vuelta por la misma recta). */
function huboRetroceso(pts: readonly ArrowPoint[]): boolean {
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1]!;
    const b = pts[k]!;
    const c = pts[k + 1]!;
    const enX = a.y === b.y && b.y === c.y && Math.sign(b.x - a.x) * Math.sign(c.x - b.x) < 0;
    const enY = a.x === b.x && b.x === c.x && Math.sign(b.y - a.y) * Math.sign(c.y - b.y) < 0;
    if (enX || enY) return true;
  }
  return false;
}

/** Quita puntos repetidos y los intermedios colineales (incluye los retrocesos: ida y vuelta). */
function sinRetrocesos(pts: readonly ArrowPoint[]): ArrowPoint[] {
  const out: ArrowPoint[] = [];
  for (const q of pts) {
    const u = out[out.length - 1];
    if (u && u.x === q.x && u.y === q.y) continue;
    const t = out[out.length - 2];
    if (t && u && ((t.x === u.x && u.x === q.x) || (t.y === u.y && u.y === q.y))) out.pop();
    out.push(q);
  }
  return out;
}

/** Punto común de dos tramos ortogonales (en un solape colineal, el más cercano al final de `b`). */
function cruceOrtogonal(a0: ArrowPoint, a1: ArrowPoint, b0: ArrowPoint, b1: ArrowPoint): ArrowPoint | null {
  const dentro = (v: number, p: number, q: number): boolean => v >= Math.min(p, q) && v <= Math.max(p, q);
  const aH = a0.y === a1.y;
  const bH = b0.y === b1.y;
  if (aH !== bH) {
    const [h0, h1, v0, v1] = aH ? [a0, a1, b0, b1] : [b0, b1, a0, a1];
    return dentro(v0.x, h0.x, h1.x) && dentro(h0.y, v0.y, v1.y) ? { x: v0.x, y: h0.y } : null;
  }
  const eje = aH ? 'x' : 'y';
  const otro = aH ? 'y' : 'x';
  if (a0[otro] !== b0[otro]) return null;
  const lo = Math.max(Math.min(a0[eje], a1[eje]), Math.min(b0[eje], b1[eje]));
  const hi = Math.min(Math.max(a0[eje], a1[eje]), Math.max(b0[eje], b1[eje]));
  if (lo > hi) return null;
  const v = Math.min(hi, Math.max(lo, b1[eje]));
  return aH ? { x: v, y: a0.y } : { x: a0.x, y: v };
}

// ── diagram-curve ──
/**
 * diagram-curve.ts — Capa de diseño «curva» sobre un recorrido ortogonal.
 *
 * El router ortogonal sigue mandando: aquí no se mueve ningún tramo. Solo
 * se redondea cada giro con una Bézier cuadrática cuyo punto de control es
 * el vértice del giro, así la curva sigue exactamente el mismo camino y los
 * extremos (donde van las puntas y los -(O-) quedan rectos e intactos.
 *
 * Es determinista: mismo path y mismo radio → mismo resultado.
 */
const f = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * @param d       Path ortogonal (`M/L/H/V`).
 * @param radius  Radio deseado por giro (px); se acota a la mitad del tramo
 *                más corto adyacente para no cruzar el vértice siguiente.
 */
export function roundOrthogonalPath(d: string, radius: number = 12): string {
  const pts = pathPoints(d).filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1]!.x, p.y - a[i - 1]!.y) > 0.01);
  if (pts.length < 3 || radius <= 0) return d;
  let out = `M${f(pts[0]!.x)},${f(pts[0]!.y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!;
    const v = pts[i]!;
    const b = pts[i + 1]!;
    const inLen = Math.hypot(v.x - a.x, v.y - a.y);
    const outLen = Math.hypot(b.x - v.x, b.y - v.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r < 0.5) {
      out += ` L${f(v.x)},${f(v.y)}`;
      continue;
    }
    const p1 = { x: v.x + ((a.x - v.x) / inLen) * r, y: v.y + ((a.y - v.y) / inLen) * r };
    const p2 = { x: v.x + ((b.x - v.x) / outLen) * r, y: v.y + ((b.y - v.y) / outLen) * r };
    out += ` L${f(p1.x)},${f(p1.y)} Q${f(v.x)},${f(v.y)} ${f(p2.x)},${f(p2.y)}`;
  }
  const last = pts[pts.length - 1]!;
  out += ` L${f(last.x)},${f(last.y)}`;
  return out;
}

/** Radio máximo de un giro `bezier`: en tramos largos evita un barrido enorme. */
export const BEZIER_MAX = 40;

/**
 * `curved` → giros redondeados con `radius`; `bezier` → cada giro toma la curva más amplia que cabe
 * (la mitad de sus tramos, hasta `BEZIER_MAX`): el riel fluye en «S» sin dejar el recorrido del
 * router y sus extremos siguen rectos (puntas intactas). Cualquier otro estilo → el path tal cual.
 */
export function styledEdgePath(d: string, edgeStyle: string | null | undefined, radius: number = 12): string {
  if (edgeStyle === 'curved') return roundOrthogonalPath(d, radius);
  if (edgeStyle === 'bezier') return roundOrthogonalPath(d, BEZIER_MAX);
  return d;
}

// ── diagram-edge-spread ──
/**
 * Separa polilíneas ortogonales que corren pegadas.
 *
 * El A* reutiliza el mismo corredor: varias aristas salen como una sola raya.
 * Aquí se desplazan los vértices interiores de tramos paralelos que se solapan,
 * un poco a cada lado, para poder seguir cada línea.
 */

// El parser de puntos es el de diagram-arrow (M/L/H/V, may/min). El parser
// local antiguo solo entendía M/L: una path ortogonal con H/V (codos y
// reprocesos de swimlane) se colapsaba a su primer punto cuando había ≥2
// aristas etiquetadas y las líneas desaparecían del render.
function rangesOverlap(a0: number, a1: number, b0: number, b1: number, min: number = 12): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > min;
}

/** Punto en píxeles. */

/** Item que `spreadAxis` recibe: una arista y sus puntos. */

function toPath(pts: SpreadPoint[]): string {
  if (!pts.length) return '';
  // Se conservan los comandos ortogonales (H/V) cuando el tramo sigue alineado
  // al eje: la geometría emitida por los specs (elbowPath/returnPath de
  // swimlane) usa H/V y hay selfchecks que lo exigen; L solo cuando el
  // desplazamiento del spread descuadró el tramo.
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (Math.abs(a.y - b.y) < 1e-6) d += ` H${b.x}`;
    else if (Math.abs(a.x - b.x) < 1e-6) d += ` V${b.y}`;
    else d += ` L${b.x},${b.y}`;
  }
  return d;
}

function collectRuns(items: SpreadItem[], vertical: boolean): Run[] {
  const runs: Run[] = [];
  for (let ii = 0; ii < items.length; ii++) {
    const pts = items[ii]!.pts;
    let i = 0;
    while (i < pts.length - 1) {
      const aligned = vertical
        ? Math.abs(pts[i]!.x - pts[i + 1]!.x) < 0.6
        : Math.abs(pts[i]!.y - pts[i + 1]!.y) < 0.6;
      if (!aligned) { i += 1; continue; }
      let j = i + 1;
      while (j < pts.length - 1) {
        const next = vertical
          ? Math.abs(pts[j]!.x - pts[j + 1]!.x) < 0.6
          : Math.abs(pts[j]!.y - pts[j + 1]!.y) < 0.6;
        if (!next) break;
        j += 1;
      }
      const pos = vertical ? pts[i]!.x : pts[i]!.y;
      const a = vertical
        ? Math.min(pts[i]!.y, pts[j]!.y)
        : Math.min(pts[i]!.x, pts[j]!.x);
      const b = vertical
        ? Math.max(pts[i]!.y, pts[j]!.y)
        : Math.max(pts[i]!.x, pts[j]!.x);
      if (b - a >= 24 && j - i >= 1) {
        runs.push({ ii, i, j, pos, a, b });
      }
      i = j;
    }
  }
  return runs;
}

function spreadAxis(items: SpreadItem[], vertical: boolean, gap: number): void {
  const runs = collectRuns(items, vertical);
  const buckets = new Map<number, Run[]>();
  for (const r of runs) {
    const k = Math.round(r.pos / 5) * 5;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(r);
  }
  for (const group of buckets.values()) {
    const sorted = group.slice().sort((a, b) => a.a - b.a);
    const clusters: Run[][] = [];
    for (const r of sorted) {
      const hit = clusters.find((c) => c.some((o) => rangesOverlap(o.a, o.b, r.a, r.b)));
      if (hit) hit.push(r);
      else clusters.push([r]);
    }
    for (const cluster of clusters) {
      const byEdge = new Map<number, Run>();
      for (const r of cluster) {
        const prev = byEdge.get(r.ii);
        if (!prev || (r.b - r.a) > (prev.b - prev.a)) byEdge.set(r.ii, r);
      }
      const uniq = [...byEdge.values()].sort((a, b) => a.ii - b.ii);
      if (uniq.length < 2) continue;
      uniq.forEach((r, idx) => {
        const delta = (idx - (uniq.length - 1) / 2) * gap;
        const pts = items[r.ii]!.pts;
        for (let k = r.i; k <= r.j; k++) {
          if (k === 0 || k === pts.length - 1) continue;
          if (vertical) pts[k]!.x += delta;
          else pts[k]!.y += delta;
        }
      });
    }
  }
}

/** Mutates `edges[].path`. */
export function spreadOrthogonalPaths<T extends { path?: string }>(edges: readonly T[], gap: number = 7): T[] {
  const items: SpreadItem[] = (edges ?? [])
    .filter((e): e is T & { path: string } => !!e && !!e.path)
    .map((e) => ({ e: e as unknown as { path: string }, pts: pathPoints(e.path).map((p) => ({ x: p.x, y: p.y })) }));
  if (items.length < 2) return edges.slice();
  spreadAxis(items, true, gap);
  spreadAxis(items, false, gap);
  for (const it of items) it.e.path = toPath(it.pts);
  return edges.slice();
}

// ── diagram-edge-style ──
/** Arista del grafo con un hue opcional para colorearla. */

/** Paleta de aristas: un hue por índice, distinto del tono de la caja origen. */
const EDGE_HUES: readonly number[] = [205, 160, 18, 280, 40, 330, 195, 250, 90, 145, 310, 55];

/** Emisores: misma S/L, H rota (TestPatyIA verde / soporte rojo ≈ este perfil). */
const EMITTER_S = 85;
const EMITTER_L = 28;
/** Hues de reserva si el emisor no trae color. */
const EMITTER_HUES: readonly number[] = [145, 0, 210, 280, 40, 320, 190, 90];
/** Solo-receptores: lila fijo del theme InSoft CD. */
export const RECEIVER_COLOR = '#C1BFFF';
/** Aristas = color del emisor con B (L) −5% (más oscuro). */
const EDGE_DARKEN = 0.95;

export function assignEdgeHues<T extends EdgeWithHue>(edges: readonly T[]): T[] {
  if (!edges?.length) return edges.slice();
  return edges.map((e, i) => {
    e.hue = EDGE_HUES[i % EDGE_HUES.length];
    return e;
  });
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** #rgb/#rrggbb → HSL (H 0..360, S/L 0..100). */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;
  return { h: hue * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  return tkHueToHex(((h % 360) + 360) % 360, clampPct(s), clampPct(l)) ?? '#334155';
}

/** Baja el brillo (L) por factor (p.ej. 0.95 = −5%). */
function darkenHex(hex: string, factor = EDGE_DARKEN): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, Math.max(4, hsl.l * factor));
}

/**
 * Emisores = misma S/L, H del payload o rota; solo-receptores = #C1BFFF;
 * aristas = color del emisor con B −5%.
 */
export function assignEmitterReceiverPalette(
  components: readonly Colored[],
  edges: readonly Edged[],
): void {
  if (!components?.length) return;
  const emitters = new Set<string>();
  const receivers = new Set<string>();
  for (const e of edges ?? []) {
    if (e.from) emitters.add(e.from);
    if (e.to) receivers.add(e.to);
  }
  const byId = new Map(components.map((c) => [c.id, c]));
  let hueIdx = 0;
  for (const id of emitters) {
    const c = byId.get(id);
    if (!c) continue;
    const hsl = c.color ? hexToHsl(c.color) : null;
    const h = hsl && hsl.s > 5 ? hsl.h : EMITTER_HUES[hueIdx++ % EMITTER_HUES.length]!;
    c.color = hslToHex(h, EMITTER_S, EMITTER_L);
  }
  for (const id of receivers) {
    if (emitters.has(id)) continue;
    const c = byId.get(id);
    if (!c) continue;
    c.color = RECEIVER_COLOR;
  }
  // Huérfanos (sin aristas): siempre #C1BFFF, aunque el payload traiga otro.
  for (const c of components) {
    if (emitters.has(c.id) || receivers.has(c.id)) continue;
    c.color = RECEIVER_COLOR;
  }
  for (const e of edges ?? []) {
    const src = byId.get(e.from);
    if (src?.color) e.color = darkenHex(src.color, EDGE_DARKEN);
  }
}

/** Mezcla un hex con blanco (fondos acordes a stroke oscuro). */
export function hexMixWhite(hex: string, t = 0.88): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return hex;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function edgeStrokeHex(hue: number | null | undefined, fallback: string = '#334155'): string {
  return tkHueToHex(hue, 48, 30) || fallback;
}

/** Fondo del chip = color de la arista (sólido). */
export function edgeChipFill(hue: number | null | undefined): string {
  return edgeStrokeHex(hue);
}

/** Texto del chip: contraste OKLCH sobre el color de la arista. */
export function edgeChipText(hue: number | null | undefined, fallback: string = '#334155'): string {
  return bg2fontColor(edgeStrokeHex(hue, fallback));
}

/** Chip a partir de un stroke ya resuelto (tema / override). */
export function edgeChipFromStroke(stroke: string): { fill: string; text: string } {
  return { fill: stroke, text: bg2fontColor(stroke) };
}
