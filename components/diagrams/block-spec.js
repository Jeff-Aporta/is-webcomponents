import { makeCostGrid, blockRect as blockGridRect, applyRectCost, snapDiagramGrid, snapPointAwayFromSide} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { countIconifyTokens, extractLeadingIconifyToken } from '../_shared/tk-iconify-inline.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas de bloques (sin Mermaid).
 *
 * A diferencia de flowchart-spec.js, este NO usa capas node-link: los bloques se
 * ubican en una rejilla explícita de `columns` columnas, fluyendo de izquierda a
 * derecha y bajando de fila cuando no caben (con `span` ocupando N columnas). Las
 * aristas entre bloques siguen ruteando con el mismo A* sobre la rejilla de costos.
 */

const GAP = 24;
const ROW_H = 64;
const MIN_UNIT_W = 96;
const MAX_UNIT_W = 200;
const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];
const SHAPES = new Set(['rect', 'round']);

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readBlock(raw, i) {
  const r = asRecord(raw);
  const rawLabel = String(r.label ?? r.id ?? `Bloque ${i + 1}`);
  const leading = extractLeadingIconifyToken(rawLabel);
  return {
    id: String(r.id ?? `b${i}`),
    label: rawLabel,
    shape: SHAPES.has(String(r.shape)) ? String(r.shape) : 'rect',
    icon: leading?.iconId ?? (r.icon != null ? String(r.icon) : undefined),
    hue: leading?.hue ?? (r.hue != null ? resolveTkHue(r) : undefined),
    group: String(r.group ?? '') || undefined,
    span: Math.max(1, Math.round(Number(r.span) || 1)),
  };
}

function readEdge(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `e${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    label: String(r.label ?? '').trim() || undefined,
  };
}

function readGroups(src) {
  const raw = src.groups ?? [];
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw.map((g, i) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** payload → spec normalizada, o null si no hay bloques. */
export function blockSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.blockDiagram ?? p.block ?? p);
  const rawBlocks = src.blocks ?? [];
  if (!Array.isArray(rawBlocks) || !rawBlocks.length) return null;

  const blocks = rawBlocks.map(readBlock);
  const known = new Set(blocks.map((b) => b.id));
  // Descarta aristas colgantes: una arista a un id inexistente rompería el layout.
  const edges = (Array.isArray(src.edges) ? src.edges : [])
    .map(readEdge)
    .filter((e) => known.has(e.from) && known.has(e.to));

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    columns: Math.max(1, Math.round(Number(src.columns) || 3)),
    groups: readGroups(src),
    blocks,
    edges,
  };
}

export function resolveBlockSpec(payload) {
  return blockSpecFromPayload(payload);
}

function blockUnitWidth(label) {
  const plain = richTextPlain(label);
  const icons = countIconifyTokens(label);
  const est = Math.ceil(plain.length * 7) + 32 + icons * 18;
  return snapDiagramGrid(Math.min(MAX_UNIT_W, Math.max(MIN_UNIT_W, est)));
}

/**
 * Empaqueta bloques en una rejilla de `columns` columnas: fluye izquierda a
 * derecha, `span` ocupa N columnas y hace wrap a la siguiente fila si no cabe
 * en el espacio restante de la fila actual.
 * @param {Array<{id:string, span:number}>} blocks
 * @param {number} columns
 * @returns {Array<{id:string, row:number, col:number, span:number}>}
 */
export function computeBlockGrid(blocks, columns) {
  let row = 0;
  let col = 0;
  const placed = [];
  for (const b of blocks) {
    const span = Math.min(columns, Math.max(1, b.span || 1));
    if (col + span > columns) {
      row += 1;
      col = 0;
    }
    placed.push({ id: b.id, row, col, span });
    col += span;
  }
  return placed;
}

const MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, blocks:Array, edges:Array, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
export function computeBlockLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 56 : 32) : 0;

  // Ancho de columna uniforme: el máximo requerido por cualquier bloque, repartido
  // entre las columnas que ocupa (descontando el hueco entre ellas).
  const unitW = spec.blocks.length
    ? Math.max(...spec.blocks.map((b) => {
        const need = blockUnitWidth(b.label);
        const span = Math.min(spec.columns, b.span);
        return snapDiagramGrid(Math.ceil((need - (span - 1) * GAP) / span));
      }))
    : MIN_UNIT_W;

  const placements = computeBlockGrid(spec.blocks, spec.columns);
  const byId = new Map(spec.blocks.map((b) => [b.id, b]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const blocks = placements.map((pl) => {
    const b = byId.get(pl.id);
    return {
      id: b.id,
      x: offsetX + pl.col * (unitW + GAP),
      y: offsetY + pl.row * (ROW_H + GAP),
      w: pl.span * unitW + (pl.span - 1) * GAP,
      h: ROW_H,
      row: pl.row,
      col: pl.col,
      label: b.label,
      shape: b.shape,
      icon: b.icon,
      hue: b.hue ?? (b.group ? groupHue.get(b.group) : undefined),
      group: b.group,
    };
  });

  const rowCount = placements.length ? Math.max(...placements.map((p) => p.row)) + 1 : 0;

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const contentW = spec.columns * unitW + (spec.columns - 1) * GAP + offsetX + MARGIN.right;
  const width = Math.max(legendGroups ? Math.max(contentW, legendW + 180) : contentW, 160);
  const height = offsetY + (rowCount ? rowCount * ROW_H + (rowCount - 1) * GAP : 0) + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  // Rejilla de costos: los bloques se bloquean para que el A* los rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(blocks.map((b) => [b.id, b]));
  for (const b of blocks) blockGridRect(grid, b.x - 6, b.y - 6, b.w + 12, b.h + 12);

  const edges = spec.edges.map((e, i) => {
    const from = posById.get(e.from);
    const to = posById.get(e.to);
    const sides = pickBlockSides(from, to);
    const a = anchor(from, sides.fromSide);
    const b = anchor(to, sides.toSide);

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
    const tip = arrowTip(b, sides.toSide);
    const mid = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    if (e.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);

    return {
      id: e.id ?? `e${i}`,
      from: e.from,
      to: e.to,
      label: e.label,
      path,
      arrowTipX: tip.x,
      arrowTipY: tip.y,
      arrowAngle: tip.angle,
      labelX: mid.x,
      labelY: mid.y,
    };
  });

  return {
    width,
    height,
    blocks,
    edges,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
}

/** Elige los lados de anclaje según la posición relativa de los centros de los bloques. */
function pickBlockSides(from, to) {
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { fromSide: 'right', toSide: 'left' } : { fromSide: 'left', toSide: 'right' };
  }
  return dy >= 0 ? { fromSide: 'bottom', toSide: 'top' } : { fromSide: 'top', toSide: 'bottom' };
}

function anchor(node, side) {
  switch (side) {
    case 'top':
      return { x: node.x + node.w / 2, y: node.y };
    case 'bottom':
      return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'left':
      return { x: node.x, y: node.y + node.h / 2 };
    case 'right':
    default:
      return { x: node.x + node.w, y: node.y + node.h / 2 };
  }
}

function stepOut(p, side, d) {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

function arrowTip(p, side) {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: p.x, y: p.y, angle };
}

/** Contorno SVG de un bloque: rectángulo recto o con esquinas redondeadas. */
export function blockShapePath(shape, x, y, w, h) {
  if (shape === 'round') {
    const r = 10;
    return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  }
  return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
}
