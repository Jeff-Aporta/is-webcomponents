import { buildTree, squarify } from '../_shared/tree-layout.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de treemaps (Chart.js-ish, sin dependencias).
 *
 * Reutiliza `buildTree` (jerarquía por `parent`) y `squarify` (teselado por
 * área) de `tree-layout.js`. La salida es geometría pura: un rectángulo por
 * nodo, ya anidado y con el hue resuelto.
 */

const DEFAULT_HUES = [239, 199, 38, 280, 160, 210];
const LABEL_H = 14;

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readNode(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `n${i}`),
    parent: r.parent != null ? String(r.parent) : undefined,
    label: String(r.label ?? r.id ?? `Ítem ${i + 1}`),
    value: Math.max(Number(r.value) || 0, 0),
    hue: r.hue != null ? resolveTkHue(r) : undefined,
  };
}

/** payload → spec normalizada, o null si no hay nodos. */
export function treemapSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.treemap ?? p);
  const rawNodes = src.nodes ?? [];
  if (!Array.isArray(rawNodes) || !rawNodes.length) return null;

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    nodes: rawNodes.map(readNode),
  };
}

export function resolveTreemapSpec(payload) {
  return treemapSpecFromPayload(payload);
}

/* ───────────────────────── hue + tiling ───────────────────────── */

/** Cada rama hereda el tono de su ancestro de nivel 1, salvo que fije el suyo. La
 *  luminosidad varía un poco por hijo para distinguir hermanos del mismo tono. */
function annotateHue(node, inheritedHue, topCounter, siblingIndex, isTopLevel) {
  let hue;
  if (node.hue != null) hue = node.hue;
  else if (isTopLevel) { hue = DEFAULT_HUES[topCounter.i % DEFAULT_HUES.length]; topCounter.i += 1; }
  else hue = inheritedHue;
  node.resolvedHue = hue;
  node.lightness = 50 + (siblingIndex % 4) * 5;
  // Los hijos directos de una raíz sintética (varias raíces "reales" en el JSON)
  // son las ramas visuales; el resto de descendientes solo heredan el tono.
  const childrenAreTopLevel = !!node.synthetic;
  node.children.forEach((c, i) => annotateHue(c, hue, topCounter, i, childrenAreTopLevel));
}

/** Reserva el rect de cada nodo (recursivo): los hijos tesellan el rect del
 *  padre, insetado 14px arriba para el rótulo (salvo la raíz sintética invisible). */
function layoutSubtree(node, rect, isTopSynthetic) {
  node.rect = rect;
  if (!node.children.length) return;
  const inner = isTopSynthetic
    ? rect
    : { x: rect.x, y: rect.y + LABEL_H, w: rect.w, h: Math.max(0, rect.h - LABEL_H) };
  const items = node.children.map((c) => ({ id: c.id, value: Math.max(c.value, 1e-6) }));
  const placed = squarify(items, inner.x, inner.y, inner.w, inner.h);
  const byId = new Map(node.children.map((c) => [c.id, c]));
  for (const p of placed) {
    layoutSubtree(byId.get(p.id), { x: p.x, y: p.y, w: p.w, h: p.h }, false);
  }
}

const DEFAULT_W = 640;
const DEFAULT_H = 380;

/** ¿Cabe el texto en el rect, a ojo (según el conteo de caracteres)? */
function labelFits(label, rect) {
  const w = richTextPlain(label).length * 6.2 + 10;
  return rect.w >= w && rect.h >= 16;
}

/**
 * spec → objeto `{width, height, nodes, title, subtitle, total}` listo para pintar.
 * `nodes` viene en orden pre-order (padres antes que hijos), clave para dibujar
 * el rect del padre primero y que sus hijos lo tapen dejando visible solo la
 * franja superior (el rótulo del contenedor).
 */
/**
 * spec → objeto `{width, height, nodes, title, subtitle, total}` listo para pintar.
 * `nodes` viene en orden pre-order (padres antes que hijos), clave para dibujar
 * el rect del padre primero y que sus hijos lo tapen dejando visible solo la
 * franja superior (el rótulo del contenedor).
 *
 * Acepta `opts.width` y `opts.height` para que el componente re-tesele
 * cuando el contenedor cambia de tamaño (fit-width).
 */
export function computeTreemapLayout(spec, opts = {}) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const headerH = title ? (subtitle ? 40 : 26) : (subtitle ? 20 : 4);

  const root = buildTree(spec.nodes);
  annotateHue(root, undefined, { i: 0 }, 0, true);

  const W = Math.max(160, opts.width ?? DEFAULT_W);
  // Mantiene el ratio 640:380 si el caller solo pasa width.
  const H = opts.height ?? Math.round((W / DEFAULT_W) * DEFAULT_H);
  const canvasH = H;
  layoutSubtree(root, { x: 0, y: headerH, w: W, h: canvasH }, !!root.synthetic);

  const specById = new Map(spec.nodes.map((n) => [n.id, n]));
  const total = (root.synthetic ? root.children : [root])
    .reduce((s, n) => s + (specById.get(n.id)?.value ?? n.value ?? 0), 0);

  const nodes = [];
  (function collect(node, depth) {
    if (!node.synthetic) {
      const src = specById.get(node.id);
      nodes.push({
        id: node.id,
        x: node.rect.x,
        y: node.rect.y,
        w: node.rect.w,
        h: node.rect.h,
        depth,
        label: src?.label ?? node.id,
        value: src?.value ?? node.value ?? 0,
        hue: node.resolvedHue,
        lightness: node.lightness,
        hasChildren: node.children.length > 0,
        showLabel: labelFits(src?.label ?? node.id, node.rect),
        percent: total > 0 ? ((src?.value ?? node.value ?? 0) / total) * 100 : 0,
      });
    }
    for (const c of node.children) collect(c, node.synthetic ? depth : depth + 1);
  })(root, 0);

  return {
    width: W,
    height: headerH + canvasH,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY: title ? 20 : 12,
    subtitleY: title ? 36 : 20,
    nodes,
    total,
  };
}
