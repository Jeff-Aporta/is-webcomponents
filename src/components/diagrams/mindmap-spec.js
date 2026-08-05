import { buildTree, layoutTree, layoutRadialTree } from '../_shared/tree-layout.js';
import { countIconTokens, extractLeadingIconToken } from '../_shared/tk-icon-inline.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import {
  makeCostGrid,
  snapDiagramGrid,
  snapPointAwayFromSide,
} from '../_shared/diagram-grid.js';
import {
  routeOrthogonal,
  pixelToGrid,
  buildOrthogonalPath,
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
  const leading = extractLeadingIconToken(rawLabel);
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
  const icons = countIconTokens(label) + (hasIcon ? 1 : 0);
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
/**
 * Ancla hacia el lado de `node` que de verdad mira al otro nodo (centro
 * `otherCx,otherCy`) — no siempre izq/der: en el layout radial un hijo puede
 * quedar arriba o abajo del padre, y forzar una salida horizontal ahí produce
 * un tramo largo que choca contra otras ramas del abanico. Se elige el eje
 * dominante (|dx| vs |dy|) y, dentro de ese eje, el lado correspondiente.
 * El eje que NO cambia queda snapeado a 8px (mismo motivo que edgeAnchor()
 * en node-link-layout.js: si no, el tramo manual de salida sale en diagonal).
 */
function anchorTowards(node, otherCx, otherCy) {
  const nodeCx = node.x + node.w / 2;
  const nodeCy = node.y + node.h / 2;
  const dx = otherCx - nodeCx;
  const dy = otherCy - nodeCy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const toRight = dx >= 0;
    return { x: toRight ? node.x + node.w : node.x, y: snapDiagramGrid(nodeCy), side: toRight ? 'right' : 'left' };
  }
  const toBottom = dy >= 0;
  return { x: snapDiagramGrid(nodeCx), y: toBottom ? node.y + node.h : node.y, side: toBottom ? 'bottom' : 'top' };
}

/** Desplaza un punto `d` px hacia afuera del nodo, según el lado del ancla. */
function stepOutPoint(p, side, d) {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
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

  // Aristas: A* ortogonal para los dos modos (tree y radial). Antes el modo
  // radial usaba curvas Bézier "orgánicas" — se unifica con el mismo lenguaje
  // visual angular que el resto de los diagramas (flowchart, ER, etc.), con
  // sus nodos ya bloqueados en la rejilla de costos para que las ramas los
  // rodeen en vez de atravesarlos.
  const edges = [];

  // Rejilla de costos para A* ortogonal: bloquea cada nodo para que las
  // aristas rodeen su contorno, y deja un pasillo limpio entre filas/anillos.
  const gridW = Math.max(...nodes.map((n) => n.x + n.w + 8), 80);
  const gridH = Math.max(...nodes.map((n) => n.y + n.h + 8), 80);
  const grid = makeCostGrid(gridW, gridH);
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
          const toCx = to.x + to.w / 2;
          const toCy = to.y + to.h / 2;
          const fromCx = from.x + from.w / 2;
          const fromCy = from.y + from.h / 2;
          const p1 = anchorTowards(from, toCx, toCy);
          const p2 = anchorTowards(to, fromCx, fromCy);
          // Sale/entra por el eje que corresponde al lado elegido (no siempre
          // x: en radial el hijo puede quedar arriba/abajo del padre). El
          // ancho/alto de nodo no está snapeado a 8px, así que el punto de
          // salida puede quedar a menos de un paso de rejilla del borde
          // bloqueado; snapPointAwayFromSide redondea SIEMPRE alejándose del
          // nodo (nunca "al más cercano", que podría rodar de vuelta al bloqueo).
          const stepOutDist = grid.grid * 3;
          const a1 = stepOutPoint(p1, p1.side, stepOutDist);
          const a2 = stepOutPoint(p2, p2.side, stepOutDist);
          const startPx = snapPointAwayFromSide(a1, p1.side, grid.grid);
          const endPx = snapPointAwayFromSide(a2, p2.side, grid.grid);
          const start = pixelToGrid(startPx.x, startPx.y, grid.grid);
          const end = pixelToGrid(endPx.x, endPx.y, grid.grid);
          const points = routeOrthogonal(start, end, grid);
          // buildOrthogonalPath empalma con points[0]/points[last] (el punto
          // REAL donde arrancó la ruta), no con `start`/`end`: si el punto
          // pedido caía bloqueado, nearestOpenCell lo desplaza, y unir con el
          // punto pedido en vez del real deja una costura en diagonal.
          const path = buildOrthogonalPath(p1, p2, start, end, points, grid.grid);
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
