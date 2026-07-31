import { buildTree, layoutTree, layoutRadialTree } from '../_shared/tree-layout.js';
import { countIconifyTokens, extractLeadingIconifyToken } from '../_shared/tk-iconify-inline.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import {
  makeCostGrid,
  snapDiagramGrid,
} from '../_shared/diagram-grid.js';
import {
  routeOrthogonal,
  pixelToGrid,
  gridPathToSvg,
} from '../_shared/diagram-astar.js';

/**
 * Especificación y layout de mindmaps (sin Mermaid).
 *
 * Reutiliza el motor de jerarquías (`tree-layout.js`): `buildTree` arma el
 * árbol desde el array plano `{id, parent}` y `layoutTree` / `layoutRadialTree`
 * lo colocan en el plano. La salida es geometría pura (nodos + curvas), lista
 * para pintar en SVG.
 */

const ICON_INLINE_W = 16;
const DEFAULT_HUES = [239, 199, 38, 280, 160, 210];

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readNode(raw, i) {
  const r = asRecord(raw);
  const rawLabel = String(r.label ?? r.text ?? r.id ?? `Idea ${i + 1}`);
  const leading = extractLeadingIconifyToken(rawLabel);
  return {
    id: String(r.id ?? `n${i}`),
    parent: r.parent != null ? String(r.parent) : undefined,
    label: leading?.rest || rawLabel,
    icon: leading?.iconId ?? (r.icon != null ? String(r.icon) : undefined),
    hue: leading?.hue ?? (r.hue != null ? resolveTkHue(r) : undefined),
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay nodos. */
export function mindmapSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.mindmap ?? p);
  const rawNodes = src.nodes ?? [];
  if (!Array.isArray(rawNodes) || !rawNodes.length) return null;

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    layout: src.layout === 'tree' ? 'tree' : 'radial',
    nodes: rawNodes.map(readNode),
  };
}

export function resolveMindmapSpec(payload) {
  return mindmapSpecFromPayload(payload);
}

/* ───────────────────────── layout ───────────────────────── */

const ROOT_H = 40;
const BRANCH_H = 32;
const LEAF_H = 24;

/** Ancho estimado según el texto (descuenta tokens {{icon}}), con un padding acorde al estilo del nivel. */
function nodeWidth(label, depth, hasIcon) {
  const plain = richTextPlain(label);
  const icons = countIconifyTokens(label) + (hasIcon ? 1 : 0);
  const perChar = depth === 0 ? 7.4 : depth === 1 ? 6.8 : 6.2;
  const pad = depth === 0 ? 44 : depth === 1 ? 32 : 14;
  return Math.round(Math.ceil(plain.length * perChar) + pad + icons * ICON_INLINE_W);
}

function nodeHeight(depth) {
  if (depth === 0) return ROOT_H;
  if (depth === 1) return BRANCH_H;
  return LEAF_H;
}

/** Marca `depth` en cada nodo del árbol (mutación local, no vive en tree-layout.js). */
function annotateDepth(node, depth) {
  node.depth = depth;
  for (const c of node.children) annotateDepth(c, depth + 1);
}

/** Cada rama hereda el tono de su ancestro de nivel 1, salvo que fije el suyo propio. */
function annotateHue(node, depth, inheritedHue, topCounter) {
  let hue;
  if (node.hue != null) hue = node.hue;
  else if (depth === 0) hue = 210;
  else if (depth === 1) { hue = DEFAULT_HUES[topCounter.i % DEFAULT_HUES.length]; topCounter.i += 1; }
  else hue = inheritedHue;
  node.resolvedHue = hue;
  for (const c of node.children) annotateHue(c, depth + 1, hue, topCounter);
}

/** Punto de anclaje de un nodo hacia otro: borde izq/der según posición relativa. */
function anchorTowards(node, otherCx) {
  const nodeCx = node.x + node.w / 2;
  const toRight = otherCx >= nodeCx;
  return { x: toRight ? node.x + node.w : node.x, y: node.y + node.h / 2 };
}

/**
 * spec → objeto `{width, height, nodes, edges, title, subtitle}` listo para pintar.
 */
export function computeMindmapLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const headerH = title ? (subtitle ? 54 : 36) : (subtitle ? 30 : 8);

  const root = buildTree(spec.nodes);
  annotateDepth(root, 0);
  annotateHue(root, 0, undefined, { i: 0 });

  const measure = (node) => ({
    w: nodeWidth(node.label ?? '', node.depth, !!node.icon),
    h: nodeHeight(node.depth),
  });

  const placed = spec.layout === 'tree'
    ? layoutTree(root, { direction: 'LR', levelGap: 64, siblingGap: 14, measure })
    : layoutRadialTree(root, { radiusStep: 96, measure });

  const byId = new Map();
  (function collect(node) {
    byId.set(node.id, node);
    for (const c of node.children) collect(c);
  })(root);

  const offsetX = 16;
  const offsetY = headerH + 16;
  const nodes = placed.nodes
    .filter((n) => n.id !== '__root__' || !byId.get(n.id)?.synthetic)
    .map((n) => {
      const src = byId.get(n.id);
      const depth = src?.depth ?? n.depth;
      return {
        id: n.id,
        x: n.x + offsetX,
        y: n.y + offsetY,
        w: n.w,
        h: n.h,
        depth,
        kind: depth === 0 ? 'root' : depth === 1 ? 'branch' : 'leaf',
        label: src?.label ?? n.id,
        icon: src?.icon,
        description: src?.description,
        hue: src?.resolvedHue,
      };
    });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Aristas: para tree layout usamos A* ortogonal (L-shape con un solo giro,
  // sube o baja según la posición vertical del hijo). Para radial conservamos
  // curvas Bézier porque la rejilla cartesiana pierde el sentido radial.
  const isTree = spec.layout === 'tree';
  const edges = [];

  if (isTree) {
    // Rejilla de costos para A* ortogonal: bloquea cada nodo para que las
    // aristas rodeen su contorno, y deja un pasillo limpio entre filas.
    const width = Math.max(...nodes.map((n) => n.x + n.w + 8), 80);
    const height = Math.max(...nodes.map((n) => n.y + n.h + 8), 80);
    const grid = makeCostGrid(width, height);
    for (const n of nodes) {
      // Bloquea la caja del nodo con un margen para que la arista pase por fuera.
      const pad = 4;
      for (let r = Math.floor((n.y - pad) / grid.grid); r <= Math.ceil((n.y + n.h + pad) / grid.grid); r++) {
        for (let c = Math.floor((n.x - pad) / grid.grid); c <= Math.ceil((n.x + n.w + pad) / grid.grid); c++) {
          if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
          grid.cost[r * grid.cols + c] = Infinity;
        }
      }
    }

    (function walkEdges(node) {
      for (const c of node.children) {
        if (!node.synthetic) {
          const from = nodeById.get(node.id);
          const to = nodeById.get(c.id);
          if (from && to) {
            const p1 = anchorTowards(from, to.x + to.w / 2);
            const p2 = anchorTowards(to, from.x + from.w / 2);
            // Sale/entra un par de celdas para evitar colgar la línea del borde.
            const fromDir = p2.x >= p1.x ? 1 : -1;
            const stepX = grid.grid * 2;
            const a1 = { x: p1.x + fromDir * stepX, y: p1.y };
            const a2 = { x: p2.x - fromDir * stepX, y: p2.y };
            const start = pixelToGrid(snapDiagramGrid(a1.x), snapDiagramGrid(a1.y), grid.grid);
            const end = pixelToGrid(snapDiagramGrid(a2.x), snapDiagramGrid(a2.y), grid.grid);
            const points = routeOrthogonal(start, end, grid);
            const polyline = gridPathToSvg(points, grid.grid);
            // Encadena: M desde p1 al primer punto A*, polilínea A*, L al p2.
            const segs = [`M${p1.x},${p1.y}`];
            const aStart = { x: start.col * grid.grid, y: start.row * grid.grid };
            segs.push(`L${aStart.x},${aStart.y}`);
            if (polyline) segs.push(polyline.slice(1));
            const aEnd = { x: end.col * grid.grid, y: end.row * grid.grid };
            segs.push(`L${aEnd.x},${aEnd.y}`);
            segs.push(`L${p2.x},${p2.y}`);
            edges.push({
              id: `${node.id}->${c.id}`,
              from: node.id,
              to: c.id,
              path: segs.join(' '),
              hue: to.hue,
              width: to.depth <= 1 ? 2.4 : Math.max(1.2, 2.4 - (to.depth - 1) * 0.4),
            });
          }
        }
        walkEdges(c);
      }
    })(root);
  } else {
    (function walkEdges(node) {
      for (const c of node.children) {
        if (!node.synthetic) {
          const from = nodeById.get(node.id);
          const to = nodeById.get(c.id);
          if (from && to) {
            const p1 = anchorTowards(from, to.x + to.w / 2);
            const p2 = anchorTowards(to, from.x + from.w / 2);
            const dx = (p2.x - p1.x) / 2;
            const path = `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${p1.x + dx},${p2.y} ${p2.x},${p2.y}`;
            edges.push({
              id: `${node.id}->${c.id}`,
              from: node.id,
              to: c.id,
              path,
              hue: to.hue,
              width: to.depth <= 1 ? 2.4 : Math.max(1.2, 2.4 - (to.depth - 1) * 0.4),
            });
          }
        }
        walkEdges(c);
      }
    })(root);
  }

  let width = 0;
  let height = 0;
  for (const n of nodes) {
    width = Math.max(width, n.x + n.w + 16);
    height = Math.max(height, n.y + n.h + 16);
  }

  return {
    width: Math.max(width, 160),
    height: Math.max(height, 120),
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY: title ? 22 : 14,
    subtitleY: title ? 40 : 24,
    nodes,
    edges,
  };
}
