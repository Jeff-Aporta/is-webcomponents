import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas de Venn, sin Mermaid.
 *
 * Dos o tres conjuntos con posiciones canónicas (las mismas que usa cualquier
 * libro de texto), porque un Venn legible NO es un problema de optimización:
 * es una figura conocida. Con más de tres conjuntos las intersecciones dejan de
 * poder dibujarse con círculos, así que el spec corta ahí.
 */

const DEFAULT_HUES: number[] = [210, 38, 160];
const R = 82;
const MARGIN: { top: number; right: number; bottom: number; left: number } = { top: 16, right: 24, bottom: 24, left: 24 };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

interface VennSet {
  id: string;
  label: string;
  hue: number;
  description?: string;
}

interface VennRegion {
  id: string;
  sets: string[];
  label?: string;
  value?: number;
  description?: string;
}

export interface VennSpec {
  title?: string;
  subtitle?: string;
  sets: VennSet[];
  regions: VennRegion[];
}

function readSet(raw: unknown, i: number): VennSet {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `s${i}`),
    label: String(r.label ?? r.name ?? r.id ?? `Conjunto ${i + 1}`),
    hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length] ?? 210),
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readRegion(raw: unknown, i: number): VennRegion {
  const r = asRecord(raw);
  const rawSets = Array.isArray(r.sets) ? r.sets.map(String) : [];
  return {
    id: String(r.id ?? `r${i}`),
    sets: rawSets,
    label: String(r.label ?? r.text ?? '').trim() || undefined,
    value: r.value != null && Number.isFinite(Number(r.value)) ? Number(r.value) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay dos o tres conjuntos. */
export function resolveVennSpec(payload: unknown): VennSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.venn ?? p.vennDiagram ?? p);
  const rawSets = src.sets ?? src.circles ?? [];
  if (!Array.isArray(rawSets)) return null;
  const sets: VennSet[] = rawSets.map(readSet).slice(0, 3);
  // Un solo conjunto no es un Venn; cuatro no se dibujan con círculos.
  if (sets.length < 2) return null;

  const known = new Set(sets.map((s) => s.id));
  const regions: VennRegion[] = (Array.isArray(src.regions) ? src.regions : [])
    .map(readRegion)
    .filter((r) => r.sets.length > 0 && r.sets.every((id) => known.has(id)));

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    sets,
    regions,
  };
}

interface VennJsonOut {
  title?: string;
  subtitle?: string;
  sets: Array<{ id: string; label: string; hue: number; desc?: string }>;
  regions?: Array<{ sets: string[]; label?: string; value?: number; desc?: string }>;
}

/** spec → objeto `venn` listo para persistir / mostrar en el editor. */
export function vennSpecToJson(spec: VennSpec): VennJsonOut {
  const out: VennJsonOut = { sets: [], regions: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  out.sets = spec.sets.map((s) => {
    const row: { id: string; label: string; hue: number; desc?: string } = { id: s.id, label: s.label, hue: s.hue };
    if (s.description) row.desc = s.description;
    return row;
  });
  out.regions = spec.regions.map((r) => {
    const row: { sets: string[]; label?: string; value?: number; desc?: string } = { sets: r.sets };
    if (r.label) row.label = r.label;
    if (r.value != null) row.value = r.value;
    if (r.description) row.desc = r.description;
    return row;
  });
  if (!out.regions.length) delete out.regions;
  return out;
}

/** Centros canónicos: dos círculos solapados, o tres en triángulo equilátero. */
function circleCenters(count: number, cx: number, cy: number): Array<{ x: number; y: number }> {
  if (count === 2) {
    return [{ x: cx - R * 0.55, y: cy }, { x: cx + R * 0.55, y: cy }];
  }
  const d = R * 0.62;
  return [
    { x: cx, y: cy - d },
    { x: cx - d * 0.92, y: cy + d * 0.62 },
    { x: cx + d * 0.92, y: cy + d * 0.62 },
  ];
}

/**
 * Centro visual de una región: promedio de los centros que la componen,
 * empujado hacia afuera cuando la región es de un solo conjunto para que el
 * texto no caiga sobre la zona compartida.
 */
function regionCenter(ids: string[], centers: Array<{ x: number; y: number }>, byId: Map<string, number>, count: number): { x: number; y: number } | null {
  const pts = ids.map((id) => centers[byId.get(id) as number]).filter((p): p is { x: number; y: number } => Boolean(p));
  if (!pts.length) return null;
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  if (ids.length > 1) return { x: cx, y: cy };

  // Región exclusiva: se aleja del centroide de todos los círculos.
  const gx = centers.reduce((a, p) => a + p.x, 0) / centers.length;
  const gy = centers.reduce((a, p) => a + p.y, 0) / centers.length;
  const dx = cx - gx;
  const dy = cy - gy;
  const len = Math.hypot(dx, dy) || 1;
  const push = count === 2 ? R * 0.5 : R * 0.52;
  return { x: cx + (dx / len) * push, y: cy + (dy / len) * push };
}

interface VennLayoutCircle {
  id: string;
  label: string;
  description?: string;
  hue: number;
  cx: number;
  cy: number;
  r: number;
  labelX: number;
  labelY: number;
}

interface VennLayoutRegion extends VennRegion {
  x: number;
  y: number;
  hues: number[];
}

export interface VennLayout {
  width: number;
  height: number;
  circles: VennLayoutCircle[];
  regions: VennLayoutRegion[];
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
}

/**
 * spec → geometría lista para pintar.
 */
export function computeVennLayout(spec: VennSpec): VennLayout {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  const count = spec.sets.length;
  const spanW = count === 2 ? R * 3.1 : R * 3.3;
  const spanH = count === 2 ? R * 2.3 : R * 3;

  // Las etiquetas de los conjuntos viven FUERA de los círculos: si el lienzo
  // solo mide los círculos, los nombres largos se cortan contra el borde (y el
  // título/subtítulo también). Se reserva su ancho a los dos lados.
  const anchoEtiqueta = (t: string): number => Math.ceil(richTextPlain(t).length * 6.4);
  const ladoTexto = Math.max(0, ...spec.sets.map((s) => anchoEtiqueta(s.label) / 2 - R * 0.5));
  const anchoCabecera = Math.max(anchoEtiqueta(title) * 1.25, anchoEtiqueta(subtitle) * 1.05);

  const width = Math.max(
    MARGIN.left + spanW + MARGIN.right + ladoTexto * 2,
    anchoCabecera + MARGIN.left + MARGIN.right,
  );
  // El rótulo del conjunto de arriba (caso de tres) se sale por encima del
  // círculo: hay que dejarle sitio bajo la cabecera.
  const holguraArriba = count === 3 ? 22 : 0;
  const height = MARGIN.top + headerH + holguraArriba + spanH + MARGIN.bottom + 20;

  const cx = width / 2;
  const cy = MARGIN.top + headerH + holguraArriba + spanH / 2;
  const centers = circleCenters(count, cx, cy);
  const byId = new Map<string, number>(spec.sets.map((s, i) => [s.id, i]));

  const circles: VennLayoutCircle[] = spec.sets.map((s, i) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    hue: s.hue,
    cx: centers[i]!.x,
    cy: centers[i]!.y,
    r: R,
    // La etiqueta del conjunto vive fuera del círculo, del lado que le queda
    // libre, y se recorta al lienzo para que nunca se salga por el borde.
    labelX: Math.min(
      width - 8 - anchoEtiqueta(s.label) / 2,
      Math.max(8 + anchoEtiqueta(s.label) / 2,
        centers[i]!.x + (centers[i]!.x < cx ? -R * 0.7 : centers[i]!.x > cx ? R * 0.7 : 0)),
    ),
    labelY: centers[i]!.y + (count === 3 && i === 0 ? -R - 12 : R + 20),
  }));

  const regions: VennLayoutRegion[] = spec.regions.map((r) => {
    const center = regionCenter(r.sets, centers, byId, count);
    return {
      ...r,
      x: center?.x ?? cx,
      y: center?.y ?? cy,
      hues: r.sets.map((id) => spec.sets[byId.get(id) as number]?.hue).filter((h): h is number => h != null),
    };
  });

  return {
    width,
    height,
    circles,
    regions,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
  };
}