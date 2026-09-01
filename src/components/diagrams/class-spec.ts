import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import { makeCostGrid, blockRect, applyRectCost, snapDiagramGrid, snapPointAwayFromSide} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

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
export const CLASS_RELATION_KINDS = new Set([
  'association', 'inheritance', 'composition', 'aggregation', 'dependency', 'realization',
]);

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function textWidth(text: number, charW) {
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
function readMember(raw) {
  if (raw == null) return '';
  if (typeof raw !== 'object') return String(raw);
  const nombre = String(raw.name ?? raw.label ?? '').trim();
  if (!nombre) return '';
  const visibilidad = String(raw.visibility ?? '').trim();
  const tipo = String(raw.type ?? raw.returns ?? '').trim();
  return `${visibilidad ? `${visibilidad} ` : ''}${nombre}${tipo ? ` : ${tipo}` : ''}`;
}

function readClass(raw, i: number) {
  const r = asRecord(raw);
  const attributes = Array.isArray(r.attributes) ? r.attributes.map(readMember) : [];
  const methods = Array.isArray(r.methods) ? r.methods.map(readMember) : [];
  return {
    id: String(r.id ?? `c${i}`),
    name: String(r.name ?? r.id ?? `Clase ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    group: String(r.group ?? '') || undefined,
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    attributes,
    methods,
  };
}

function readRelation(raw, i) {
  const r = asRecord(raw);
  const kind = CLASS_RELATION_KINDS.has(String(r.kind)) ? String(r.kind) : 'association';
  return {
    id: String(r.id ?? `r${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    kind,
    label: String(r.label ?? '').trim() || undefined,
    fromLabel: String(r.fromLabel ?? '').trim() || undefined,
    toLabel: String(r.toLabel ?? '').trim() || undefined,
    group: String(r.group ?? '') || undefined,
  };
}

function readGroups(src) {
  const raw = src.groups ?? [];
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw.map((g, i: number) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** payload → spec normalizada, o null si no hay clases. */
export function resolveClassSpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.classDiagram ?? p.class ?? p);
  const rawClasses = src.classes ?? [];
  if (!Array.isArray(rawClasses) || !rawClasses.length) return null;

  const classes = rawClasses.map(readClass);
  const known = new Set(classes.map((c) => c.id));
  // Descarta relaciones colgantes: una relación a un id inexistente rompería el layout.
  const relations = (Array.isArray(src.relations) ? src.relations : [])
    .map(readRelation)
    .filter((r) => known.has(r.from) && known.has(r.to));

  const dir = String(src.direction ?? 'TB').toUpperCase();
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: ['TB', 'BT', 'LR', 'RL'].includes(dir) ? dir : (dir === 'TD' ? 'TB' : 'TB'),
    groups: readGroups(src),
    classes,
    relations,
  };
}

/**
 * Geometría de compartimentos de una clase: nombre (+estereotipo), atributos,
 * métodos. Los compartimentos vacíos se omiten junto con su divisor.
 */
function classGeometry(cls) {
  const headerH = HEADER_H + (cls.stereotype ? STEREO_H : 0);
  const sections = [{ type: 'header', h: headerH, rows: [] }];
  if (cls.attributes.length) {
    sections.push({ type: 'attributes', h: cls.attributes.length * ROW_H + SECTION_PAD_V * 2, rows: cls.attributes });
  }
  if (cls.methods.length) {
    sections.push({ type: 'methods', h: cls.methods.length * ROW_H + SECTION_PAD_V * 2, rows: cls.methods });
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
  const dividerYs = [];
  for (let i = 0; i < sections.length; i++) {
    sections[i].y = cursor;
    cursor += sections[i].h;
    if (i < sections.length - 1) dividerYs.push(cursor);
  }
  const h = snapDiagramGrid(cursor);

  return { w, h, sections, dividerYs, headerH };
}

/** spec → objeto `classDiagram` listo para persistir / mostrar en el editor. */
export function classSpecToJson(spec) {
  const out = { direction: spec.direction, classes: [], relations: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  out.classes = spec.classes.map((c) => {
    const row = { id: c.id, name: c.name };
    if (c.stereotype) row.stereotype = c.stereotype;
    if (c.group) row.group = c.group;
    if (c.attributes.length) row.attributes = c.attributes;
    if (c.methods.length) row.methods = c.methods;
    return row;
  });
  out.relations = spec.relations.map((r) => {
    const row = { from: r.from, to: r.to };
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

/** Desplaza un punto hacia afuera del nodo, en la dirección de su lado. */
function stepOut(p, side, d) {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

/** Punta de decoración (flecha/triángulo/diamante): posición y ángulo según el lado. */
function tipAt(p, side) {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: p.x, y: p.y, angle };
}

/** Lados de anclaje; para self-relations fuerza lados distintos (loop visible). */
function sidesFor(fromNode, toNode, direction, isSelf) {
  if (isSelf) return { fromSide: 'right', toSide: 'top' };
  return pickSides(fromNode, toNode, direction);
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, nodes:Array, edges:Array, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
export function computeClassLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  const geomById = new Map(spec.classes.map((c) => [c.id, classGeometry(c)]));
  const sized = spec.classes.map((c) => {
    const g = geomById.get(c.id);
    return { id: c.id, w: g.w, h: g.h };
  });

  const placed = layoutNodeLink(sized, spec.relations, {
    direction: spec.direction,
    layerGap: spec.relations.some((r) => r.label) ? 88 : 72,
    nodeGap: 40,
  });

  const byId = new Map(placed.nodes.map((n) => [n.id, n]));
  const specById = new Map(spec.classes.map((c) => [c.id, c]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const nodes = placed.nodes.map((n) => {
    const s = specById.get(n.id);
    const g = geomById.get(n.id);
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

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const contentW = placed.width + offsetX + MARGIN.right;
  const width = Math.max(legendGroups ? Math.max(contentW, legendW + 180) : contentW, 160, diagramHeaderWidth(title, subtitle));
  const height = placed.height + offsetY + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  // Rejilla de costos: las cajas se bloquean para que el A* las rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) blockRect(grid, n.x - 6, n.y - 6, n.w + 12, n.h + 12);

  const routed = spec.relations.map((r, i) => {
    const isSelf = r.from === r.to;
    const from = posById.get(r.from);
    const to = posById.get(r.to);
    const sides = sidesFor(byId.get(r.from), byId.get(r.to), spec.direction, isSelf);
    const a = edgeAnchor(from, sides.fromSide);
    const b = edgeAnchor(to, sides.toSide);

    // El anclaje cae sobre el borde bloqueado: se sale un paso antes de rutear.
    const out = stepOut(a, sides.fromSide, 16);
    const into = stepOut(b, sides.toSide, 16);
    // Snap direccional: nunca redondea de vuelta hacia el nodo del que se aleja
    // (ver snapPointAwayFromSide — corrige el redondeo-al-más-cercano de antes).
    const outSnap = snapPointAwayFromSide(out, sides.fromSide, grid.grid);
    const intoSnap = snapPointAwayFromSide(into, sides.toSide, grid.grid);
    const aGrid = pixelToGrid(outSnap.x, outSnap.y, grid.grid);
    const bGrid = pixelToGrid(intoSnap.x, intoSnap.y, grid.grid);
    const points = routeOrthogonal(aGrid, bGrid, grid);

    const path = buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid);
    const targetTip = tipAt(b, sides.toSide);
    const sourceTip = tipAt(a, sides.fromSide);
    const mid = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    // La etiqueta ocupa espacio: encarece la zona para que otras relaciones la esquiven.
    if (r.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);

    return {
      id: r.id ?? `r${i}`,
      from: r.from,
      to: r.to,
      kind: r.kind,
      label: r.label,
      fromLabel: r.fromLabel,
      toLabel: r.toLabel,
      path,
      targetTipX: targetTip.x,
      targetTipY: targetTip.y,
      targetAngle: targetTip.angle,
      sourceTipX: sourceTip.x,
      sourceTipY: sourceTip.y,
      sourceAngle: sourceTip.angle,
      labelX: mid.x,
      labelY: mid.y,
      hue: r.group ? groupHue.get(r.group) : undefined,
    };
  });

  assignEdgeHues(routed);
  const layout = {
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
