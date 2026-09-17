// er-archify.ts: extensiones archify-style para <is-er-diagram>, opcionales
// y aditivas (cero impacto en JSON histórico). Inspirado en archify:
//   schema_version, meta.animation, entities[].pos/size/style,
//   relations[].route/fromSide/toSide/via/labelAt/dashStyle/style/variant.
// Validación STRICT: cualquier campo desconocido lanza error (en consola, sin
// romper render para no boicotear demos legacy que pasen por aquí).
import { snapDiagramGrid } from '../_shared/diagram-grid.js';
import type {
  DiagramGroup,
  DiagramTheme,
  EdgeStyleOverride,
  ErRouteKind,
  ErSpec,
  ErSpecAttribute,
  ErSpecEntity,
  ErSpecRelation,
  ErCardinality,
  ErDashStyle,
  ErLayout,
  ErLayoutEdge,
  ErLayoutEntity,
  BoxSide,
  EdgeVariant,
  NodeStyleOverride,
} from './diagram-types.js';

function snap8(v: number): number {
  return Math.round(v / 8) * 8;
}

/* ──────────────── allowlists de campos conocidos ──────────────── */

const ENTITY_KEYS: Set<string> = new Set([
  'id', 'name', 'group', 'attributes',
  // Nuevos (archify-style):
  'label', 'pos', 'size', 'hue', 'style',
]);

const RELATION_KEYS: Set<string> = new Set([
  'id', 'from', 'to', 'source', 'label',
  'fromCard', 'toCard', 'identifying',
  // Nuevos (archify-style):
  'route', 'fromSide', 'toSide', 'via',
  'labelAt', 'labelDx', 'labelDy', 'labelSegment',
  'dashStyle', 'width', 'style', 'variant',
]);

const ATTRIBUTE_KEYS: Set<string> = new Set(['name', 'type', 'key', 'comment']);
const STYLE_KEYS: Set<string> = new Set([
  'fill', 'stroke', 'strokeWidth', 'paddingX', 'paddingY',
  'marginX', 'marginY', 'radius', 'opacity',
]);
const META_KEYS: Set<string> = new Set([
  'title', 'subtitle', 'animation', 'visual_preset',
  'locale', 'viewBox',
]);
const TOP_KEYS: Set<string> = new Set([
  'erDiagram', 'er', 'entities', 'relations', 'groups',
  'title', 'subtitle', 'direction', 'ratio', 'aspectRatio',
  'meta',
]);

/** Lanza error de validación para campos desconocidos en modo strict. */
function enforceKnown(obj: unknown, allowSet: Set<string> | undefined, path: string, strict: boolean): void {
  if (!strict || obj == null || typeof obj !== 'object') return;
  if (!allowSet) return; // Sin allowlist: skip (caso de grupos donde se valida por elemento).
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    if (!allowSet.has(k)) {
      throw new Error(
        `[er-archify] unknown field "${k}" at ${path}. ` +
        `Allowed: ${[...allowSet].sort().join(', ')}`,
      );
    }
  }
}

/* ──────────────── helpers de normalización ──────────────── */

const ROUTES: Set<ErRouteKind> = new Set(['auto', 'straight', 'orthogonal', 'orthogonal-h', 'orthogonal-v']);
const SIDES: Set<BoxSide> = new Set(['left', 'right', 'top', 'bottom', 'auto']);
const DASH_STYLES: Set<ErDashStyle> = new Set(['solid', 'dashed', 'dotted']);
const VARIANTS: Set<EdgeVariant> = new Set(['default', 'emphasis', 'security', 'dashed']);

function asArray(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function readAttr(raw: unknown, i: number, strict: boolean): ErSpecAttribute {
  enforceKnown(raw, ATTRIBUTE_KEYS, `attributes[${i}]`, strict);
  const r = asRecord(raw);
  return {
    name: String(r.name ?? `attr${i}`),
    type: String(r.type ?? ''),
    key: r.key === 'PK' || r.key === 'FK' ? r.key : undefined,
    comment: typeof r.comment === 'string' ? r.comment : undefined,
  };
}

function readStyle(raw: unknown, path: string, strict: boolean): NodeStyleOverride | undefined {
  if (raw == null) return undefined;
  enforceKnown(raw, STYLE_KEYS, `${path}.style`, strict);
  const r = asRecord(raw);
  const out: NodeStyleOverride = {};
  if (r.fill != null) out.fill = String(r.fill);
  if (r.stroke != null) out.stroke = String(r.stroke);
  if (Number.isFinite(r.strokeWidth)) out.strokeWidth = Number(r.strokeWidth);
  if (Number.isFinite(r.paddingX)) out.paddingX = Number(r.paddingX);
  if (Number.isFinite(r.paddingY)) out.paddingY = Number(r.paddingY);
  if (Number.isFinite(r.marginX)) out.marginX = Number(r.marginX);
  if (Number.isFinite(r.marginY)) out.marginY = Number(r.marginY);
  if (Number.isFinite(r.radius)) out.radius = Number(r.radius);
  if (Number.isFinite(r.opacity)) out.opacity = Number(r.opacity);
  return Object.keys(out).length ? out : undefined;
}

function readPos(raw: unknown): [number, number] | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) return undefined;
  const [x, y] = raw;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return [snap8(Number(x)), snap8(Number(y))];
}

function readSize(raw: unknown): [number, number] | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) return undefined;
  const [w, h] = raw;
  if (!Number.isFinite(w) || !Number.isFinite(h)) return undefined;
  if (Number(w) < 40 || Number(h) < 24) return undefined;
  return [snap8(Number(w)), snap8(Number(h))];
}

function readEntity(raw: unknown, i: number, strict: boolean): ErSpecEntity {
  enforceKnown(raw, ENTITY_KEYS, `entities[${i}]`, strict);
  const r = asRecord(raw);
  const rawAttrs = Array.isArray(r.attributes) ? r.attributes : [];
  const attributes: ErSpecAttribute[] = rawAttrs.map((a, j) => readAttr(a, j, strict));
  const out: ErSpecEntity = {
    id: String(r.id ?? `e${i}`),
    name: String(r.name ?? r.label ?? r.id ?? `Entidad ${i + 1}`),
    group: String(r.group ?? '') || undefined,
    attributes,
  };
  if (r.pos !== undefined) {
    const pos = readPos(r.pos);
    if (pos) out.pos = pos;
  }
  if (r.size !== undefined) {
    const size = readSize(r.size);
    if (size) out.size = size;
  }
  if (typeof r.hue === 'number') out.hue = r.hue;
  const style = readStyle(r.style, `entities[${i}]`, strict);
  if (style) out.style = style;
  if (typeof r.label === 'string') out.label = r.label;
  return out;
}

function readVia(raw: unknown): [number, number][] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: [number, number][] = [];
  for (const p of raw) {
    if (Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      out.push([snap8(Number(p[0])), snap8(Number(p[1]))]);
    }
  }
  return out.length ? out : undefined;
}

function readRelation(raw: unknown, i: number, known: Set<string>, strict: boolean): ErSpecRelation | null {
  enforceKnown(raw, RELATION_KEYS, `relations[${i}]`, strict);
  const r = asRecord(raw);
  const from = String((r.from as string) || (r.source as string) || '');
  const to = String(r.to ?? '');
  if (!known.has(from) || !known.has(to)) return null;
  const fromCard = (r.fromCard as ErCardinality | undefined);
  const toCard = (r.toCard as ErCardinality | undefined);
  const out: ErSpecRelation = {
    id: String(r.id ?? `r${i}`),
    from,
    to,
    label: String(r.label ?? '').trim() || undefined,
    fromCard: fromCard && ['one', 'many', 'zeroOrOne', 'zeroOrMany'].includes(fromCard) ? fromCard : 'one',
    toCard: toCard && ['one', 'many', 'zeroOrOne', 'zeroOrMany'].includes(toCard) ? toCard : 'many',
    identifying: r.identifying !== false,
  };
  const route = r.route as ErRouteKind | undefined;
  if (route && ROUTES.has(route)) out.route = route;
  const fromSide = r.fromSide as BoxSide | undefined;
  const toSide = r.toSide as BoxSide | undefined;
  if (fromSide && SIDES.has(fromSide) && fromSide !== 'auto') out.fromSide = fromSide;
  if (toSide && SIDES.has(toSide) && toSide !== 'auto') out.toSide = toSide;
  if (r.via !== undefined) {
    const via = readVia(r.via);
    if (via) out.via = via;
  }
  if (r.labelAt !== undefined) {
    const labelAt = readPos(r.labelAt);
    if (labelAt) out.labelAt = labelAt;
  }
  if (Number.isFinite(r.labelDx)) out.labelDx = Number(r.labelDx);
  if (Number.isFinite(r.labelDy)) out.labelDy = Number(r.labelDy);
  if (Number.isInteger(r.labelSegment) && Number(r.labelSegment) >= 0) out.labelSegment = Number(r.labelSegment);
  const dashStyle = r.dashStyle as ErDashStyle | undefined;
  if (dashStyle && DASH_STYLES.has(dashStyle)) out.dashStyle = dashStyle;
  if (Number.isFinite(r.width) && Number(r.width) > 0) out.width = Number(r.width);
  const variant = r.variant as EdgeVariant | undefined;
  if (variant && VARIANTS.has(variant)) out.variant = variant;
  const style = readStyle(r.style, `relations[${i}]`, strict);
  if (style) out.style = style as EdgeStyleOverride;
  return out;
}

const CARDS: Set<ErCardinality> = new Set(['one', 'many', 'zeroOrOne', 'zeroOrMany']);
const DIRECTIONS: Set<'TB' | 'BT' | 'LR' | 'RL'> = new Set(['TB', 'BT', 'LR', 'RL']);

/** Lee `meta` con validación strict. */
function readMeta(raw: unknown, strict: boolean): ErSpec['meta'] {
  if (raw == null) return undefined;
  enforceKnown(raw, META_KEYS, 'meta', strict);
  const r = asRecord(raw);
  const out: NonNullable<ErSpec['meta']> = {};
  if (typeof r.title === 'string') out.title = r.title;
  if (typeof r.subtitle === 'string') out.subtitle = r.subtitle;
  if (r.animation === 'trace' || r.animation === 'none') out.animation = r.animation;
  if (r.locale === 'en' || r.locale === 'zh-CN') out.locale = r.locale;
  return Object.keys(out).length ? out : undefined;
}

function readGroups(src: Record<string, unknown>, strict: boolean): DiagramGroup[] | undefined {
  const raw = src.groups;
  if (!Array.isArray(raw) || !raw.length) return undefined;
  // Allowlist custom para cada elemento de groups.
  const GROUP_KEYS: Set<string> = new Set(['id', 'name', 'label', 'hue']);
  for (let i = 0; i < raw.length; i++) {
    enforceKnown(raw[i], GROUP_KEYS, `groups[${i}]`, strict);
  }
  return raw.map((g, i) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: Number.isFinite(r.hue) ? Number(r.hue) : undefined,
    };
  });
}

/**
 * Normaliza un payload crudo aplicando las extensiones archify. STRICT:
 * cualquier campo desconocido lanza. Mantiene el shape original para
 * consumers que ya esperan `entities`/`relations`/`groups`.
 */
export function normalizeErPayload(payload: unknown, opts: { strict?: boolean } = {}): ErSpec | null {
  const strict = opts.strict !== false;
  if (payload == null || typeof payload !== 'object') return null;
  enforceKnown(payload, TOP_KEYS, 'root', strict);
  const p = asRecord(payload);
  const src = asRecord(p.erDiagram ?? p.er ?? p);
  const rawEntities = src.entities;
  if (!Array.isArray(rawEntities) || !rawEntities.length) return null;

  const meta = readMeta(p.meta, strict);
  const entities: ErSpecEntity[] = rawEntities.map((e, i) => readEntity(e, i, strict));
  const known = new Set(entities.map((e) => e.id));
  const relations: ErSpecRelation[] = asArray(src.relations)
    .map((r, i) => readRelation(r, i, known, strict))
    .filter((r): r is ErSpecRelation => r !== null);

  const dir = String(src.direction ?? 'LR').toUpperCase();
  const direction = (DIRECTIONS.has(dir as 'TB' | 'BT' | 'LR' | 'RL') ? dir : 'LR') as 'TB' | 'BT' | 'LR' | 'RL';
  const ratioRaw = src.ratio ?? src.aspectRatio;
  const ratio = Number.isFinite(ratioRaw) ? Number(ratioRaw) : 1.4;

  const out: ErSpec = {
    title: String(src.title ?? p.title ?? meta?.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? meta?.subtitle ?? '') || undefined,
    direction,
    ratio,
    groups: readGroups(src, strict),
    entities,
    relations,
  };
  if (meta) out.meta = meta;
  return out;
}

/* ──────────────── serialización determinista ──────────────── */

/**
 * Serializa un payload normalizado a JSON estable. Características:
 *  - Orden de campos estable (no depende del orden de inserción).
 *  - Números enteros cuando aplica; snap a 8px.
 *  - Defaults omitidos (no emitimos `fromCard: "one"` si coincide con default).
 *  - `pos`/`size` siempre como tupla `[x, y]` con enteros.
 *  - `via` como tupla de tuplas.
 *
 *  Garantiza: el mismo state produce byte-identical JSON.
 */
export function serializeErPayload(spec: ErSpec, opts: { stable?: boolean; indent?: number } = {}): string {
  const stable = opts.stable !== false;
  const indent = Number.isInteger(opts.indent) ? opts.indent : 2;

  const out: Record<string, unknown> = {};
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.direction && spec.direction !== 'LR') out.direction = spec.direction;
  if (spec.ratio && spec.ratio !== 1.4) out.ratio = spec.ratio;

  if (spec.groups && spec.groups.length) {
    out.groups = spec.groups.map((g) => {
      const go: { id: string; name: string; hue?: number } = { id: g.id, name: g.name };
      if (Number.isFinite(g.hue)) go.hue = round(g.hue as number, 0);
      return go;
    });
  }

  out.entities = (spec.entities ?? []).map((e) => {
    const eo: Record<string, unknown> = { id: e.id, name: e.name };
    if (e.group) eo.group = e.group;
    if (Array.isArray(e.pos)) eo.pos = [round(e.pos[0], 0), round(e.pos[1], 0)];
    if (Array.isArray(e.size)) eo.size = [round(e.size[0], 0), round(e.size[1], 0)];
    if (e.style) eo.style = serializeStyle(e.style);
    if (e.attributes && e.attributes.length) {
      eo.attributes = e.attributes.map((a) => {
        const ao: Record<string, unknown> = { name: a.name };
        if (a.type) ao.type = a.type;
        if (a.key) ao.key = a.key;
        return ao;
      });
    }
    return eo;
  });

  out.relations = (spec.relations ?? []).map((r) => {
    const ro: Record<string, unknown> = { id: r.id, from: r.from, to: r.to };
    if (r.label) ro.label = r.label;
    if (r.fromCard && r.fromCard !== 'one') ro.fromCard = r.fromCard;
    if (r.toCard && r.toCard !== 'many') ro.toCard = r.toCard;
    if (r.identifying === false) ro.identifying = false;
    if (r.route && r.route !== 'auto') ro.route = r.route;
    if (r.fromSide && r.fromSide !== 'auto') ro.fromSide = r.fromSide;
    if (r.toSide && r.toSide !== 'auto') ro.toSide = r.toSide;
    if (Array.isArray(r.via) && r.via.length) {
      ro.via = r.via.map((p) => [round(p[0], 0), round(p[1], 0)]);
    }
    if (Array.isArray(r.labelAt)) ro.labelAt = [round(r.labelAt[0], 0), round(r.labelAt[1], 0)];
    if (typeof r.labelDx === 'number') ro.labelDx = round(r.labelDx, 1);
    if (typeof r.labelDy === 'number') ro.labelDy = round(r.labelDy, 1);
    if (typeof r.labelSegment === 'number') ro.labelSegment = r.labelSegment;
    if (r.dashStyle && r.dashStyle !== 'solid') ro.dashStyle = r.dashStyle;
    if (typeof r.width === 'number' && r.width !== 1.3) ro.width = round(r.width, 2);
    if (r.variant && r.variant !== 'default') ro.variant = r.variant;
    if (r.style) ro.style = serializeStyle(r.style);
    return ro;
  });

  return stable ? JSON.stringify(out, null, indent) : JSON.stringify(out);
}

function serializeStyle(style: NodeStyleOverride | EdgeStyleOverride): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (style.fill) out.fill = style.fill;
  if (style.stroke) out.stroke = style.stroke;
  const sw = style.strokeWidth;
  if (Number.isFinite(sw)) out.strokeWidth = round(sw as number, 2);
  const px = style.paddingX;
  if (Number.isFinite(px)) out.paddingX = round(px as number, 0);
  const py = style.paddingY;
  if (Number.isFinite(py)) out.paddingY = round(py as number, 0);
  const mx = style.marginX;
  if (Number.isFinite(mx)) out.marginX = round(mx as number, 0);
  const my = style.marginY;
  if (Number.isFinite(my)) out.marginY = round(my as number, 0);
  const r = style.radius;
  if (Number.isFinite(r)) out.radius = round(r as number, 0);
  const o = style.opacity;
  if (Number.isFinite(o)) out.opacity = round(o as number, 2);
  return out;
}

function round(n: number, digits: number): number {
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}

/**
 * Render del SVG a string standalone (con CSS embebido).
 * Si opts.embedStyle === false, NO embebe los estilos de animación
 * (útil para export "static").
 */
export function renderErSvg(svg: SVGElement, opts: { skipStyleFix?: boolean; embedStyle?: boolean; animation?: 'trace' | 'none' } = {}): string {
  const clone = svg.cloneNode(true) as SVGElement;
  if (!opts.skipStyleFix) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }
  // Asegurar que el <svg> lleva la marca de animación
  const traceEnabled = opts.animation === 'trace';
  if (traceEnabled) {
    clone.setAttribute('data-animation', 'trace');
  }
  // Si el svg ya tiene <style> embebido, no duplicar.
  if (opts.embedStyle !== false) {
    if (!clone.querySelector('style[data-iswc-embedded]')) {
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.setAttribute('data-iswc-embedded', 'true');
      style.textContent = getEmbeddedCss(traceEnabled);
      clone.insertBefore(style, clone.firstChild);
    }
  }
  return new XMLSerializer().serializeToString(clone);
}

export function getEmbeddedCss(traceEnabled: boolean): string {
  return `
.iswc-anim-dash {
  stroke-dasharray: 8 6;
  animation: iswc-dash-march 1.6s linear infinite;
}
.iswc-anim-edge-dashed {
  stroke-dasharray: 6 4;
  animation: iswc-dash-march 1.6s linear infinite;
}
@keyframes iswc-dash-march {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -28; }
}
@media (prefers-reduced-motion: reduce) {
  .iswc-anim-dash, .iswc-anim-edge-dashed {
    animation: none !important;
  }
}
${traceEnabled ? `
[data-animation="trace"] .iswc-anim-dash,
[data-animation="trace"] .iswc-anim-edge-dashed {
  animation: iswc-dash-march 1.6s linear infinite;
}
` : ''}
`.trim();
}

/* ──────────────── route helpers (archify-aligned) ──────────────── */

interface AnchorLike { cx: number; cy: number; }

/**
 * Decide los lados (fromSide, toSide) de una relación según la posición
 * relativa de los centros de las cajas (mismo algoritmo que archify).
 */
export function pickSidesArchify(from: AnchorLike, to: AnchorLike): { fromSide: BoxSide; toSide: BoxSide } {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return { fromSide: dx > 0 ? 'right' : 'left', toSide: dx > 0 ? 'left' : 'right' };
  }
  return { fromSide: dy > 0 ? 'bottom' : 'top', toSide: dy > 0 ? 'top' : 'bottom' };
}

/** Devuelve el path SVG para una línea recta entre entre dos puntos. */
export function straightPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  return `M${a.x},${a.y} L${b.x},${b.y}`;
}

/** Devuelve el path SVG para un dogleg orthogonal-h (primero vertical, luego horizontal).
 *  Usa comandos H/V para que el render sea más legible y round-trip archify-friendly. */
export function orthogonalHPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const midX = (a.x + b.x) / 2;
  return `M${a.x},${a.y} V${midX} H${b.y} L${b.x},${b.y}`;
}

/** Devuelve el path SVG para un dogleg orthogonal-v (primero horizontal, luego vertical).
 *  Usa comandos H/V para que el render sea más legible y round-trip archify-friendly. */
export function orthogonalVPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const midY = (a.y + b.y) / 2;
  return `M${a.x},${a.y} H${midY} V${b.x} L${b.x},${b.y}`;
}

export const SNAP = snap8;

// Re-exports para que consumers que ya importaban tipos desde diagram-types.js
// puedan seguir importándolos desde aquí si lo desean.
export type { DiagramTheme };