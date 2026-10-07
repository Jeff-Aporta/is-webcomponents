import { layoutNodeLink } from '../_shared/node-link-layout.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import { snapDiagramGrid } from '../_shared/diagram-grid.js';
import { routeEdges, planPorts, pointsToPath, simplifyOrthoPath } from './component-router.js';
import { packDiagram, resolvePackingGaps, EDGE_CLEARANCE, GRID_STEP } from './component-pack.js';
import { assignEmitterReceiverPalette } from '../_shared/diagram-edge-style.js';
import type { Componente, Paquete } from '../_shared/diagram-tipos.js';
import type { ClassPackage, ClassLayoutOpts } from './diagram-types.schemas.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import type {
  ClassSpec,
  ClassSpecClass,
  ClassSpecRelation,
  ClassLayout,
  ClassLayoutNode,
  ClassLayoutEdge,
  ClassRelationKind,
  DiagramGroup,
} from './diagram-types.js';
import type { Point2D } from "./class-spec.schemas.js";

/**
 * Especificación y layout de diagramas de clases (sin Mermaid).
 *
 * Misma idea que flowchart-spec: JSON → geometría pura, reutilizando el motor
 * node-link para colocar las cajas y el A* de la rejilla de costos para
 * rutear las relaciones alrededor de ellas.
 */

const MIN_W = 140;
const MAX_W = 320;
const ROW_H = 16;
const HEADER_H = 24;
const STEREO_H = 14;
const SECTION_PAD_V = 6;
const CHAR_W = 6.4; // ancho monoespaciado aproximado por carácter (filas de miembros)
const NAME_CHAR_W = 7.2;

/** Tipos de relación soportados; cualquier otro valor cae a 'association'. */
export const CLASS_RELATION_KINDS = new Set<ClassRelationKind>([
  'association', 'inheritance', 'composition', 'aggregation', 'dependency', 'realization',
]);

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

function asRecord(v: unknown): Record<string, any> {
  return v && typeof v === 'object' ? v as Record<string, any> : {};
}

function textWidth(text: string, charW: number): number {
  return Math.ceil(richTextPlain(text).length * charW);
}

/**
 * Miembro de una clase: cadena ya formateada, u objeto UML.
 *
 * Antes solo aceptaba cadena y hacía `String(raw)`: un objeto
 * `{ name, type, visibility }` — la forma natural de escribirlo, y la que se
 * usó en varios payloads reales — se renderizaba como `[object Object]` en el
 * diagrama, sin ningún aviso. Ahora se compone en la notación UML
 * `visibilidad nombre : tipo`.
 */
function readMember(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw !== 'object') return String(raw);
  const r = raw as Record<string, unknown>;
  const nombre = String(r.name ?? r.label ?? '').trim();
  if (!nombre) return '';
  const visibilidad = String(r.visibility ?? '').trim();
  const tipo = String(r.type ?? r.returns ?? '').trim();
  return `${visibilidad ? `${visibilidad} ` : ''}${nombre}${tipo ? ` : ${tipo}` : ''}`;
}

function readClass(raw: unknown, i: number): ClassSpecClass {
  const r = asRecord(raw);
  const attributes = Array.isArray(r.attributes) ? r.attributes.map(readMember) : [];
  const methods = Array.isArray(r.methods) ? r.methods.map(readMember) : [];
  return {
    id: String(r.id ?? `c${i}`),
    name: String(r.name ?? r.id ?? `Clase ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    group: String(r.group ?? '') || undefined,
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    package: String(r.package ?? '').trim() || undefined,
    color: typeof r.color === 'string' && r.color.trim() ? r.color.trim() : undefined,
    fill: typeof r.fill === 'string' && r.fill.trim() ? r.fill.trim() : undefined,
    attributes,
    methods,
  };
}

function readRelation(raw: unknown, i: number): ClassSpecRelation | null {
  const r = asRecord(raw);
  const kindRaw = String(r.kind);
  const kind: ClassRelationKind = CLASS_RELATION_KINDS.has(kindRaw as ClassRelationKind)
    ? (kindRaw as ClassRelationKind)
    : 'association';
  const rel: ClassSpecRelation = {
    id: String(r.id ?? `r${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    kind,
    label: String(r.label ?? '').trim() || undefined,
    fromLabel: String(r.fromLabel ?? '').trim() || undefined,
    toLabel: String(r.toLabel ?? '').trim() || undefined,
    group: Number.isFinite(r.group) ? Number(r.group) : undefined,
  };
  return rel;
}

function readGroups(src: Record<string, any>): DiagramGroup[] | undefined {
  const raw = src.groups ?? [];
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw.map((g: unknown, i: number): DiagramGroup => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** payload → spec normalizada, o null si no hay clases. */
export function resolveClassSpec(payload: unknown): ClassSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.classDiagram ?? p.class ?? p);
  const rawClasses = src.classes ?? [];
  if (!Array.isArray(rawClasses) || !rawClasses.length) return null;

  const classes: ClassSpecClass[] = rawClasses.map((c: unknown, i: number) => readClass(c, i));
  const known = new Set(classes.map((c) => c.id));
  // Descarta relaciones colgantes: una relación a un id inexistente rompería el layout.
  const relations = (Array.isArray(src.relations) ? src.relations : [])
    .map((r: unknown, i: number) => readRelation(r, i))
    .filter((r): r is ClassSpecRelation => !!r && known.has(r.from) && known.has(r.to));

  const dir = String(src.direction ?? 'TB').toUpperCase();
  const direction: ClassSpec['direction'] =
    dir === 'BT' || dir === 'LR' || dir === 'RL' ? dir : 'TB';
  const groups = readGroups(src);
  const packages = readPackages(src);
  const layout = readClassLayoutOpts(src.layout);
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction,
    groups,
    classes,
    relations,
    ...(packages ? { packages } : {}),
    ...(layout ? { layout } : {}),
  };
}

function readPackages(src: Record<string, any>): ClassPackage[] | undefined {
  const raw = src.packages;
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const hex = (v: unknown): string | undefined =>
    typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : undefined;
  return raw.map((g: unknown, i: number): ClassPackage => {
    const r = asRecord(g);
    const palette = hex(r.palette);
    const accent = hex(r.accent);
    return {
      id: String(r.id ?? `pkg-${i}`),
      name: String(r.name ?? r.label ?? r.id ?? `Paquete ${i + 1}`),
      ...(String(r.stereotype ?? '').trim() ? { stereotype: String(r.stereotype).trim() } : {}),
      ...(String(r.parent ?? '').trim() ? { parent: String(r.parent).trim() } : {}),
      ...(palette ? { palette } : {}),
      ...(accent ? { accent } : {}),
      ...(Number(r.cols) > 0 ? { cols: Number(r.cols) } : {}),
      ...(hex(r.classFill) ? { classFill: hex(r.classFill) } : {}),
    };
  });
}

function readClassLayoutOpts(raw: unknown): ClassLayoutOpts | undefined {
  const r = asRecord(raw);
  const out: ClassLayoutOpts = {};
  for (const k of ['layerCols', 'nestedCols', 'colGutter', 'nestedRowGap', 'nestedPkgGap', 'pkgRowGap', 'lanePitch',
    'laneNearFactor', 'pkgBorderClearance', 'pkgBorderNearFactor', 'pkgCrossFactor'] as const) {
    if (r[k] != null && Number.isFinite(Number(r[k]))) out[k] = Number(r[k]);
  }
  if (r.boxStyle === 'card' || r.boxStyle === 'uml' || r.boxStyle === 'vp') out.boxStyle = r.boxStyle;
  return Object.keys(out).length ? out : undefined;
}

/** Acento legible derivado de un relleno pastel: mismo tono, más saturado y oscuro. */
export function accentFromPalette(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const sat = max === min ? 0 : 0.6;
  const lig = max === min ? 0.3 : 0.34;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = lig - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number): string => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`.toUpperCase();
}


/**
 * Geometría de compartimentos de una clase: nombre (+estereotipo), atributos,
 * métodos. Los compartimentos vacíos se omiten junto con su divisor.
 */
function classGeometry(cls: ClassSpecClass): { w: number; h: number; headerH: number; sections: Array<{ type: 'header' | 'attributes' | 'methods'; y: number; h: number; rows: string[] }>; dividerYs: number[] } {
  const headerH = HEADER_H + (cls.stereotype ? STEREO_H : 0);
  const sections: Array<{ type: 'header' | 'attributes' | 'methods'; y: number; h: number; rows: string[] }> = [
    { type: 'header', y: 0, h: headerH, rows: [] },
  ];
  if (cls.attributes.length) {
    sections.push({ type: 'attributes', y: 0, h: cls.attributes.length * ROW_H + SECTION_PAD_V * 2, rows: cls.attributes });
  }
  if (cls.methods.length) {
    sections.push({ type: 'methods', y: 0, h: cls.methods.length * ROW_H + SECTION_PAD_V * 2, rows: cls.methods });
  }

  let widthEst = Math.max(
    textWidth(cls.name, NAME_CHAR_W) + 32,
    cls.stereotype ? textWidth(cls.stereotype, CHAR_W) + 24 : 0,
  );
  for (const s of sections) {
    for (const row of s.rows) widthEst = Math.max(widthEst, textWidth(row, CHAR_W) + 24);
  }
  const w = snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, widthEst)));

  let cursor = 0;
  const dividerYs: number[] = [];
  for (let i = 0; i < sections.length; i++) {
    sections[i].y = cursor;
    cursor += sections[i].h;
    if (i < sections.length - 1) dividerYs.push(cursor);
  }
  const h = snapDiagramGrid(cursor);

  return { w, h, sections, dividerYs, headerH };
}

/** spec → objeto `classDiagram` listo para persistir / mostrar en el editor. */
export function classSpecToJson(spec: ClassSpec): Record<string, unknown> {
  const out: Record<string, unknown> = { direction: spec.direction, classes: [], relations: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  (out.classes as Array<Record<string, unknown>>) = spec.classes.map((c) => {
    const row: Record<string, unknown> = { id: c.id, name: c.name };
    if (c.stereotype) row.stereotype = c.stereotype;
    if (c.group) row.group = c.group;
    if (c.attributes.length) row.attributes = c.attributes;
    if (c.methods.length) row.methods = c.methods;
    return row;
  });
  (out.relations as Array<Record<string, unknown>>) = spec.relations.map((r) => {
    const row: Record<string, unknown> = { from: r.from, to: r.to };
    if (r.kind !== 'association') row.kind = r.kind;
    if (r.label) row.label = r.label;
    if (r.fromLabel) row.fromLabel = r.fromLabel;
    if (r.toLabel) row.toLabel = r.toLabel;
    return row;
  });
  return out;
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

/** Punta de decoración (flecha/triángulo/diamante): posición y ángulo según el lado. */
function tipAt(p: Point2D, side: string): Point2D & { angle: number } {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: p.x, y: p.y, angle };
}

/**
 * spec → geometría lista para pintar.
 */
export function computeClassLayout(spec: ClassSpec): ClassLayout {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;
  if (spec.packages?.length) return computePackagedClassLayout(spec, { title, subtitle, titleY, subtitleY, headerH });

  const geomById = new Map(spec.classes.map((c) => [c.id, classGeometry(c)]));
  const sized = spec.classes.map((c) => {
    const g = geomById.get(c.id)!;
    return { id: c.id, w: g.w, h: g.h };
  });

  const placed = layoutNodeLink(sized, spec.relations, {
    direction: spec.direction,
    // Corredores para el router (aire de 20 px a cada caja + carriles).
    layerGap: spec.relations.some((r) => r.label) ? 136 : 120,
    nodeGap: 72,
  });

  const specById = new Map(spec.classes.map((c) => [c.id, c]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const nodes: ClassLayoutNode[] = placed.nodes.map((n) => {
    const s = specById.get(n.id)!;
    const g = geomById.get(n.id)!;
    return {
      id: n.id,
      x: n.x + offsetX,
      y: n.y + offsetY,
      w: n.w,
      h: n.h,
      layer: n.layer,
      name: s.name,
      stereotype: s.stereotype,
      sections: g.sections,
      dividerYs: g.dividerYs,
      hue: s.hue ?? (s.group ? groupHue.get(s.group) : undefined),
      group: s.group,
    };
  });

  // ── Ruteo: mismo sistema que componentes y DER ──────────────────────
  // Puertos por el perímetro (planPorts) + grilla con zonas prohibidas,
  // costos aditivos y negociación (routeEdges). El glifo del extremo
  // (triángulo, rombo, flecha) se pinta en el tip, sobre el stub recto.
  const boxes = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h }));
  const plans = planPorts(boxes, spec.relations.map((r) => ({ from: r.from, to: r.to })), { pitch: 24, room: 2 * 28 + 20 });
  const ri: number[] = [];
  const res = routeEdges({ components: boxes, packages: [], titles: [], rings: [] },
    spec.relations.flatMap((r, i) => {
      const pl = plans[i];
      if (!pl) return [];
      ri.push(i);
      return [{
        id: r.id ?? `r${i}`, from: pl.from, fromSide: pl.fromSide, to: pl.to, toSide: pl.toSide,
        fromBox: boxes.find((b) => b.id === r.from)!, toBox: boxes.find((b) => b.id === r.to)!,
        fromPkgs: new Set<string>(), toPkgs: new Set<string>(),
      }];
    }), { clearance: 20, stub: 28, lanePitch: 24 });
  const ptsOf = new Map<number, Array<{ x: number; y: number }>>();
  ri.forEach((i, k) => {
    const pl = plans[i]!;
    ptsOf.set(i, res.paths[k] ?? simplifyOrthoPath([pl.from, { x: pl.to.x, y: pl.from.y }, pl.to]));
  });

  // Lienzo ajustado a cajas + rieles con margen uniforme.
  const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const hit = (x: number, y: number): void => {
    bb.x0 = Math.min(bb.x0, x); bb.y0 = Math.min(bb.y0, y); bb.x1 = Math.max(bb.x1, x); bb.y1 = Math.max(bb.y1, y);
  };
  for (const n of nodes) { hit(n.x, n.y); hit(n.x + n.w, n.y + n.h); }
  for (const pts of ptsOf.values()) for (const q of pts) hit(q.x, q.y);
  const dx = MARGIN.left - bb.x0;
  const dy = offsetY - bb.y0;
  for (const n of nodes) { n.x += dx; n.y += dy; }
  for (const [k, pts] of ptsOf) ptsOf.set(k, pts.map((q) => ({ x: q.x + dx, y: q.y + dy })));

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;
  const contentW = bb.x1 - bb.x0 + MARGIN.left + MARGIN.right;
  const width = Math.max(legendGroups ? Math.max(contentW, legendW + 180) : contentW, 160, diagramHeaderWidth(title, subtitle));
  const height = bb.y1 - bb.y0 + offsetY + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  const routed: ClassLayoutEdge[] = spec.relations.flatMap((r, i) => {
    const pts = ptsOf.get(i);
    const pl = plans[i];
    if (!pts || !pl) return [];
    const a = pts[0]!;
    const b = pts[pts.length - 1]!;
    const targetTip = tipAt(b, pl.toSide);
    const sourceTip = tipAt(a, pl.fromSide);
    // Etiqueta en el centro del tramo más largo.
    let mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let best = -1;
    for (let k = 1; k < pts.length; k++) {
      const len = Math.abs(pts[k]!.x - pts[k - 1]!.x) + Math.abs(pts[k]!.y - pts[k - 1]!.y);
      if (len > best) { best = len; mid = { x: (pts[k]!.x + pts[k - 1]!.x) / 2, y: (pts[k]!.y + pts[k - 1]!.y) / 2 }; }
    }
    return [{
      id: r.id ?? `r${i}`,
      from: r.from,
      to: r.to,
      kind: r.kind,
      label: r.label,
      fromLabel: r.fromLabel,
      toLabel: r.toLabel,
      path: pointsToPath(pts),
      targetTipX: targetTip.x,
      targetTipY: targetTip.y,
      targetAngle: targetTip.angle,
      sourceTipX: sourceTip.x,
      sourceTipY: sourceTip.y,
      sourceAngle: sourceTip.angle,
      labelX: mid.x,
      labelY: mid.y,
      hue: r.group != null ? groupHue.get(String(r.group)) : undefined,
    }];
  });

  assignEdgeHues(routed as unknown as Parameters<typeof assignEdgeHues>[0]);
  const layout: ClassLayout = {
    width,
    height,
    nodes,
    edges: routed,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
  applyEdgeActorLayout(layout, nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })));
  return layout;
}

/** Alto del rótulo de un paquete (franja superior donde va el título). */
const PKG_TITLE_H = 26;

/**
 * Layout con paquetes: las clases se empacan por capas dentro de sus
 * paquetes (mismo `packDiagram` en modo `layers` que el diagrama de
 * componentes: franjas apiladas, subpaquetes en rejilla de columnas) y las
 * relaciones se rutean con el mismo router, que conoce los agrupadores
 * (costo por anidación y por cercanía a bordes) y rodea sus títulos.
 *
 * El orden de las franjas es el del payload: en un diagrama de herencia
 * conviene declarar primero los ancestros, así las flechas de herencia
 * apuntan hacia arriba como en UML.
 */
function computePackagedClassLayout(
  spec: ClassSpec,
  head: { title: string; subtitle: string; titleY: number; subtitleY: number; headerH: number },
): ClassLayout {
  const opts = spec.layout ?? {};
  const pkgSpec = spec.packages ?? [];
  const pkgById = new Map(pkgSpec.map((p) => [p.id, p]));
  const geomById = new Map(spec.classes.map((c) => [c.id, classGeometry(c)]));

  const paquetes: Paquete[] = pkgSpec.map((p) => ({
    id: p.id, name: p.name, stereotype: p.stereotype, parent: p.parent,
    ...(p.cols ? { cols: p.cols } : {}),
    x: 0, y: 0, w: 0, h: 0,
  }));
  const cajas: Componente[] = spec.classes.map((c) => {
    const g = geomById.get(c.id)!;
    return { id: c.id, name: c.name, package: c.package, x: 0, y: 0, w: g.w, h: g.h };
  });
  const rails = resolvePackingGaps({
    ...(opts.lanePitch != null ? { lanePitch: opts.lanePitch } : {}),
    ...(opts.laneNearFactor != null ? { laneNearFactor: opts.laneNearFactor } : {}),
    ...(opts.pkgBorderClearance != null ? { pkgBorderClearance: opts.pkgBorderClearance } : {}),
    ...(opts.pkgBorderNearFactor != null ? { pkgBorderNearFactor: opts.pkgBorderNearFactor } : {}),
    ...(opts.pkgCrossFactor != null ? { pkgCrossFactor: opts.pkgCrossFactor } : {}),
  });
  const lanePitch = rails.lanePitch;
  packDiagram(paquetes, cajas, [], {
    mode: 'layers',
    layerCols: opts.layerCols ?? 4,
    nestedCols: opts.nestedCols ?? 2,
    colGutter: opts.colGutter ?? 80,
    nestedRowGap: opts.nestedRowGap ?? 72,
    nestedPkgGap: opts.nestedPkgGap ?? 80,
    ...(opts.pkgRowGap != null ? { pkgRowGap: opts.pkgRowGap } : {}),
    lanePitch,
  });

  const depthOf = (id: string): number => {
    let d = 0;
    for (let cur = pkgById.get(id); cur?.parent; cur = pkgById.get(cur.parent)) d++;
    return d;
  };
  const rootOf = (id: string | undefined): string | undefined => {
    let cur = id ? pkgById.get(id) : undefined;
    while (cur?.parent && pkgById.has(cur.parent)) cur = pkgById.get(cur.parent);
    return cur?.id;
  };
  const ancestros = (id: string | undefined): Set<string> => {
    const out = new Set<string>();
    for (let cur = id ? pkgById.get(id) : undefined; cur; cur = cur.parent ? pkgById.get(cur.parent) : undefined) out.add(cur.id);
    return out;
  };
  const accentOfPkg = (id: string | undefined): string | undefined => {
    for (let cur = id ? pkgById.get(id) : undefined; cur; cur = cur.parent ? pkgById.get(cur.parent) : undefined) {
      if (cur.accent) return cur.accent;
      if (cur.palette) return accentFromPalette(cur.palette);
    }
    return undefined;
  };

  const fillOfPkg = (id: string | undefined): string | undefined => {
    for (let cur = id ? pkgById.get(id) : undefined; cur; cur = cur.parent ? pkgById.get(cur.parent) : undefined) {
      if (cur.classFill) return cur.classFill;
    }
    return undefined;
  };
  const vp = opts.boxStyle === 'vp';

  const packages = paquetes
    .filter((p) => p.w > 0 && p.h > 0)
    .map((p) => ({
      ...pkgById.get(p.id)!, x: p.x, y: p.y, w: p.w, h: p.h, depth: depthOf(p.id),
      titleAlign: undefined as 'center' | 'left' | undefined,
    }))
    .sort((a, b) => a.depth - b.depth);
  const pkgBox = new Map(packages.map((p) => [p.id, p]));

  const specById = new Map(spec.classes.map((c) => [c.id, c]));
  // En modo paquetes solo se pintan las clases con paquete conocido: packLayers no coloca las sueltas.
  const nodes: ClassLayoutNode[] = cajas
    .filter((c) => c.package && pkgById.has(c.package))
    .map((c) => {
      const s = specById.get(c.id)!;
      const g = geomById.get(c.id)!;
      const color = s.color ?? accentOfPkg(s.package);
      const fill = s.fill ?? fillOfPkg(s.package);
      return {
        ...(fill ? { fill } : {}),
        id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, layer: 0,
        name: s.name, stereotype: s.stereotype, sections: g.sections, dividerYs: g.dividerYs,
        hue: s.hue, group: s.group, package: s.package,
        ...(color ? { color } : {}),
      };
    });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const rels = spec.relations.filter((r) => nodeById.has(r.from) && nodeById.has(r.to));

  // ── Herencia en bus ────────────────────────────────────────────────
  // Un padre con 3 o más hijos por debajo, en otra franja: cada hijo sube
  // hasta una barra común en el corredor entre franjas y de ahí un solo
  // tronco llega al triángulo. Es la notación UML de conjunto de
  // generalización: un triángulo por padre, no uno por hijo.
  const busOf = new Map<string, { y: number; members: number[] }>();
  const porPadre = new Map<string, number[]>();
  rels.forEach((r, i) => {
    if (r.kind !== 'inheritance') return;
    porPadre.set(r.to, [...(porPadre.get(r.to) ?? []), i]);
  });
  for (const [padre, idx] of porPadre) {
    const p = nodeById.get(padre)!;
    const rootP = pkgBox.get(rootOf(p.package) ?? '');
    const hijos = idx.map((i) => nodeById.get(rels[i]!.from)!);
    if (idx.length < 3 || !rootP) continue;
    if (!hijos.every((h) => h.y > p.y + p.h && rootOf(h.package) !== rootP.id)) continue;
    const debajo = packages.filter((q) => !q.parent && q.y >= rootP.y + rootP.h);
    if (!debajo.length) continue;
    const siguiente = debajo.reduce((a, b) => (b.y < a.y ? b : a));
    busOf.set(padre, { y: (rootP.y + rootP.h + siguiente.y) / 2, members: idx });
  }
  const enBus = new Set([...busOf.values()].flatMap((b) => b.members));

  // Títulos: franja superior izquierda de cada paquete (donde se pinta).
  // En `vp` el rótulo va centrado como en Visual Paradigm, salvo que caiga
  // sobre la vertical de una clase directa del paquete (una franja con una
  // sola clase centrada): ahí la arista que sube tendría que rodearlo, así
  // que el rótulo se corre junto a la pestaña.
  const VP_TAB_W = 56;
  const titles = packages.map((p) => {
    const label = p.stereotype ? `«${p.stereotype}» ${p.name}` : p.name;
    const w = Math.ceil(label.length * 7.2) + 28;
    if (!vp) return { x: p.x - 4, y: p.y - 4, w, h: PKG_TITLE_H + 8 };
    const x0 = p.x + p.w / 2 - w / 2;
    const tapa = nodes.some((n) => n.package === p.id && n.x < x0 + w && n.x + n.w > x0);
    p.titleAlign = tapa ? 'left' : 'center';
    return tapa
      ? { x: p.x + Math.min(VP_TAB_W, p.w / 3) + 4, y: p.y - 4, w, h: PKG_TITLE_H + 12 }
      : { x: x0, y: p.y - 4, w, h: PKG_TITLE_H + 12 };
  });
  const boxes = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h }));
  const normales = rels.map((_, i) => i).filter((i) => !enBus.has(i));
  const plans = planPorts(boxes, normales.map((i) => ({ from: rels[i]!.from, to: rels[i]!.to })), {
    pitch: lanePitch, room: 2 * 28 + 20, obstacles: titles, obstacleRoom: 28 + 12,
  });
  const planOf = new Map<number, NonNullable<(typeof plans)[number]>>();
  normales.forEach((i, k) => { if (plans[k]) planOf.set(i, plans[k]!); });

  // Llegadas al bus. Un hijo con el camino libre hacia arriba sale por su
  // cara superior y sube recto. Uno con otra clase encima sale por el
  // lateral más cercano a un pasillo libre y sube por el pasillo: así nadie
  // rodea el paquete. Dos llegadas a la misma x se corren un carril.
  const busPlan = new Map<number, { from: { x: number; y: number }; fromSide: 'top' | 'left' | 'right'; to: { x: number; y: number } }>();
  // Tapa: otra clase o un rótulo de paquete en la vertical, entre el bus y el hijo.
  const tapa = (x0: number, x1: number, yTop: number, yBottom: number, self: string): boolean =>
    nodes.some((o) => o.id !== self && o.x < x1 + 20 && o.x + o.w > x0 - 20 && o.y + o.h > yTop && o.y < yBottom)
    || titles.some((t) => t.x < x1 + 8 && t.x + t.w > x0 - 8 && t.y + t.h > yTop && t.y < yBottom);
  for (const [, bus] of busOf) {
    const usados = new Set<number>();
    const libre = (x: number): number => {
      let k = 0;
      while (usados.has(x + k * lanePitch)) k++;
      usados.add(x + k * lanePitch);
      return x + k * lanePitch;
    };
    const orden = [...bus.members].sort((a, b) => nodeById.get(rels[a]!.from)!.y - nodeById.get(rels[b]!.from)!.y);
    for (const i of orden) {
      const h = nodeById.get(rels[i]!.from)!;
      const cx = Math.round(h.x + h.w / 2);
      if (!tapa(cx - 1, cx + 1, bus.y, h.y, h.id)) {
        const x = libre(cx);
        busPlan.set(i, { from: { x, y: h.y }, fromSide: 'top', to: { x, y: bus.y } });
        continue;
      }
      // Pasillo a cada lado: primer x a ≥ 24 px de la caja sin otra clase
      // encima y DENTRO del paquete del hijo; fuera de él, el router rodea.
      const caja = pkgBox.get(h.package ?? '');
      const pasillo = (dir: -1 | 1): number | null => {
        for (let d = 24; d < 400; d += 4) {
          const x = dir < 0 ? h.x - d : h.x + h.w + d;
          if (caja && (x < caja.x + 28 || x > caja.x + caja.w - 28)) return null;
          if (!tapa(x - 1, x + 1, bus.y, h.y + h.h, h.id)) return x;
        }
        return null;
      };
      const izq = pasillo(-1);
      const der = pasillo(1);
      const lado: 'left' | 'right' = der == null || (izq != null && h.x - izq <= der - (h.x + h.w)) ? 'left' : 'right';
      const x = libre(Math.round((lado === 'left' ? izq : der) ?? cx));
      const y = Math.round(h.y + 18);
      busPlan.set(i, { from: { x: lado === 'left' ? h.x : h.x + h.w, y }, fromSide: lado, to: { x, y: bus.y } });
    }
  }

  const ruteables = rels.map((_, i) => i).filter((i) => planOf.has(i) || busPlan.has(i));
  // La barra del bus es un muro para el router: ninguna arista corre por
  // encima de ella. Cada hijo llega desde abajo a un punto bajo la barra
  // (fuera del aire del muro) y el último tramo vertical hasta la barra se
  // agrega después: así las llegadas son perpendiculares y no se montan.
  const BUS_APPROACH = EDGE_CLEARANCE + 4;
  const busWalls = [...busOf.entries()].map(([padre, bus]) => {
    const p = nodeById.get(padre)!;
    const xs = [p.x + p.w / 2, ...bus.members.map((i) => busPlan.get(i)?.to.x).filter((x): x is number => x != null)];
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    return { x: x0 - 4, y: bus.y - 2, w: x1 - x0 + 8, h: 4 };
  });
  const res = routeEdges(
    {
      components: boxes,
      packages: packages.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h })),
      titles: [...titles, ...busWalls],
      rings: [],
    },
    ruteables.map((i) => {
      const r = rels[i]!;
      const pl = planOf.get(i);
      const bp = busPlan.get(i);
      const from = pl ? pl.from : bp!.from;
      const to = pl ? pl.to : { x: bp!.to.x, y: bp!.to.y + BUS_APPROACH };
      const punto = { id: `${r.to}::bus`, x: to.x, y: to.y, w: 1, h: 1 };
      return {
        id: r.id ?? `r${i}`, from, fromSide: pl ? pl.fromSide : bp!.fromSide, to, toSide: pl ? pl.toSide : 'bottom',
        fromBox: boxes.find((b) => b.id === r.from)!, toBox: pl ? boxes.find((b) => b.id === r.to)! : punto,
        fromPkgs: ancestros(specById.get(r.from)?.package),
        toPkgs: pl ? ancestros(specById.get(r.to)?.package) : new Set<string>(),
      };
    }),
    // Mismo router y mismas perillas que el diagrama de componentes: grilla,
    // aire a cajas, carriles y costo de agrupadores salen de
    // `resolvePackingGaps` con los nombres del payload de componentes. Solo
    // cambia el stub, que es el largo del remate (triángulo/flecha).
    {
      step: GRID_STEP,
      clearance: EDGE_CLEARANCE,
      stub: 28,
      lanePitch: rails.lanePitch,
      laneNearFactor: rails.laneNearFactor,
      pkgBorderClearance: rails.pkgBorderClearance,
      pkgBorderNearFactor: rails.pkgBorderNearFactor,
      pkgCrossFactor: rails.pkgCrossFactor,
    },
  );
  const ptsOf = new Map<number, Array<{ x: number; y: number }>>();
  ruteables.forEach((i, k) => {
    const pl = planOf.get(i);
    const bp = busPlan.get(i);
    const from = pl ? pl.from : bp!.from;
    const to = pl ? pl.to : { x: bp!.to.x, y: bp!.to.y + BUS_APPROACH };
    const pts = res.paths[k] ?? simplifyOrthoPath([from, { x: to.x, y: from.y }, to]);
    // Hijo del bus: tramo final perpendicular hasta la barra.
    ptsOf.set(i, bp ? simplifyOrthoPath([...pts, bp.to]) : pts);
  });

  // Lienzo: todo lo pintado entra con margen uniforme, también los rieles
  // que el router saque por fuera de los paquetes.
  const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const hit = (x: number, y: number): void => {
    bb.x0 = Math.min(bb.x0, x); bb.y0 = Math.min(bb.y0, y); bb.x1 = Math.max(bb.x1, x); bb.y1 = Math.max(bb.y1, y);
  };
  for (const p of packages) { hit(p.x, p.y); hit(p.x + p.w, p.y + p.h); }
  for (const n of nodes) { hit(n.x, n.y); hit(n.x + n.w, n.y + n.h); }
  for (const pts of ptsOf.values()) for (const q of pts) hit(q.x, q.y);
  const dx = MARGIN.left + 8 - bb.x0;
  const dy = MARGIN.top + head.headerH + 8 - bb.y0;
  for (const p of packages) { p.x += dx; p.y += dy; }
  for (const n of nodes) { n.x += dx; n.y += dy; }
  for (const [k, pts] of ptsOf) ptsOf.set(k, pts.map((q) => ({ x: q.x + dx, y: q.y + dy })));
  for (const b of busOf.values()) b.y += dy;

  const midOf = (pts: Array<{ x: number; y: number }>): { x: number; y: number } => {
    let mid = { x: (pts[0]!.x + pts[pts.length - 1]!.x) / 2, y: (pts[0]!.y + pts[pts.length - 1]!.y) / 2 };
    let best = -1;
    for (let k = 1; k < pts.length; k++) {
      const len = Math.abs(pts[k]!.x - pts[k - 1]!.x) + Math.abs(pts[k]!.y - pts[k - 1]!.y);
      if (len > best) { best = len; mid = { x: (pts[k]!.x + pts[k - 1]!.x) / 2, y: (pts[k]!.y + pts[k - 1]!.y) / 2 }; }
    }
    return mid;
  };
  // Color de arista: la misma regla W60 del diagrama de componentes (color
  // del emisor, B −5 %), calculada sobre copias para no tocar los rellenos.
  const colorDeArista = new Map<number, string>();
  {
    const cajasColor = nodes.map((n) => ({ id: n.id, ...(n.color ? { color: n.color } : {}) }));
    const aristasColor = rels.map((r) => ({ from: r.from, to: r.to } as { from: string; to: string; color?: string }));
    assignEmitterReceiverPalette(cajasColor, aristasColor);
    aristasColor.forEach((a, i) => { if (a.color) colorDeArista.set(i, a.color); });
  }
  const edges: ClassLayoutEdge[] = ruteables.flatMap((i) => {
    const r = rels[i]!;
    const pts = ptsOf.get(i);
    if (!pts) return [];
    const pl = planOf.get(i);
    const a = pts[0]!;
    const b = pts[pts.length - 1]!;
    const targetTip = tipAt(b, pl ? pl.toSide : 'bottom');
    const sourceTip = tipAt(a, pl ? pl.fromSide : busPlan.get(i)!.fromSide);
    const mid = midOf(pts);
    const color = colorDeArista.get(i) ?? nodeById.get(r.from)?.color;
    return [{
      id: r.id ?? `r${i}`, from: r.from, to: r.to, kind: r.kind,
      label: r.label, fromLabel: r.fromLabel, toLabel: r.toLabel,
      path: pointsToPath(pts),
      targetTipX: targetTip.x, targetTipY: targetTip.y, targetAngle: targetTip.angle,
      sourceTipX: sourceTip.x, sourceTipY: sourceTip.y, sourceAngle: sourceTip.angle,
      labelX: mid.x, labelY: mid.y,
      ...(color ? { color } : {}),
      ...(busPlan.has(i) ? { noTip: true } : {}),
    }];
  });
  // Barra + tronco de cada bus, con el único triángulo en el padre.
  for (const [padre, bus] of busOf) {
    const p = nodeById.get(padre)!;
    const xs = bus.members.map((i) => ptsOf.get(i)?.[ptsOf.get(i)!.length - 1]?.x).filter((x): x is number => x != null);
    const cx = Math.round(p.x + p.w / 2);
    const x0 = Math.min(cx, ...xs);
    const x1 = Math.max(cx, ...xs);
    const base = { x: cx, y: p.y + p.h };
    const tip = tipAt(base, 'bottom');
    edges.push({
      id: `${padre}::bus`, from: padre, to: padre, kind: 'inheritance',
      path: `M${x0},${bus.y} L${x1},${bus.y} M${cx},${bus.y} L${base.x},${base.y}`,
      targetTipX: tip.x, targetTipY: tip.y, targetAngle: tip.angle,
      sourceTipX: cx, sourceTipY: bus.y, sourceAngle: tip.angle,
      labelX: cx, labelY: bus.y,
      ...((colorDeArista.get(bus.members[0]!) ?? p.color) ? { color: colorDeArista.get(bus.members[0]!) ?? p.color } : {}),
    });
  }

  const width = Math.max(bb.x1 + dx + MARGIN.right + 8, diagramHeaderWidth(head.title, head.subtitle));
  const height = bb.y1 + dy + MARGIN.bottom + 8;

  const layout: ClassLayout = {
    width, height, nodes, edges,
    title: head.title || undefined,
    subtitle: head.subtitle || undefined,
    titleY: head.titleY, subtitleY: head.subtitleY, legendX: 0,
    packages,
    boxStyle: opts.boxStyle ?? 'card',
  };
  applyEdgeActorLayout(layout, nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })));
  return layout;
}
