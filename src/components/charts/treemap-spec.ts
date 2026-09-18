import { buildTree, squarify } from '../_shared/tree-layout.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import type { TreeNode } from '../_shared/tree-layout.js';

/**
 * Especificación y layout de treemaps (Chart.js-ish, sin dependencias).
 *
 * Reutiliza `buildTree` (jerarquía por `parent`) y `squarify` (teselado por
 * área) de `tree-layout.js`. La salida es geometría pura: un rectángulo por
 * nodo, ya anidado y con el hue resuelto.
 */

const DEFAULT_HUES = [239, 199, 38, 280, 160, 210];
const LABEL_H = 14;

type Rect = { x: number; y: number; w: number; h: number };

/** Nodo crudo del payload (entrada de `readNode`). */
type RawSpecNode = Record<string, unknown>;

/** Nodo normalizado de la spec pública. */
export interface SpecNode {
  id: string;
  parent?: string;
  label: string;
  value: number;
  hue?: number;
}

/** Spec normalizada que devuelve `treemapSpecFromPayload`. */
export interface TreemapSpec {
  title?: string;
  subtitle?: string;
  nodes: SpecNode[];
}

/** Layout geométrico que devuelve `computeTreemapLayout`. */
export interface TreemapLayout {
  width: number;
  height: number;
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
  total: number;
  nodes: TreemapLayoutNode[];
}

/** Un nodo del layout: rectángulo teselado + datos para pintar. */
export interface TreemapLayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  label: string;
  value: number;
  hue?: number;
  lightness: number;
  hasChildren: boolean;
  showLabel: boolean;
  percent: number;
}

/** Opciones de `computeTreemapLayout`. */
export interface TreemapLayoutOpts {
  width?: number;
  height?: number;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function readNode(raw: unknown, i: number): SpecNode {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `n${i}`),
    parent: r.parent != null ? String(r.parent) : undefined,
    label: String(r.label ?? r.id ?? `Ítem ${i + 1}`),
    value: Math.max(Number(r.value) || 0, 0),
    hue: r.hue != null ? resolveTkHue(r as { hue: unknown }) : undefined,
  };
}

/** payload → spec normalizada, o null si no hay nodos. */
export function treemapSpecFromPayload(payload: unknown): TreemapSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.treemap ?? p);
  const rawNodes = src.nodes;
  if (!Array.isArray(rawNodes) || !rawNodes.length) return null;

  const rawNodesArr = rawNodes as unknown[];
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    nodes: rawNodesArr.map((n, i) => readNode(n, i)),
  };
}

export function resolveTreemapSpec(payload: unknown): TreemapSpec | null {
  return treemapSpecFromPayload(payload);
}

/* ───────────────────────── hue + tiling ───────────────────────── */

/** Cada rama hereda el tono de su ancestro de nivel 1, salvo que fije el suyo. La
 *  luminosidad varía un poco por hijo para distinguir hermanos del mismo tono. */
function annotateHue(
  node: TreeNode,
  inheritedHue: number | undefined,
  topCounter: { i: number },
  siblingIndex: number,
  isTopLevel: boolean,
): void {
  let hue: number | undefined;
  const ownHue = (node as { hue?: unknown }).hue;
  if (ownHue != null) hue = Number(ownHue);
  else if (isTopLevel) { hue = DEFAULT_HUES[topCounter.i % DEFAULT_HUES.length] ?? 210; topCounter.i += 1; }
  else hue = inheritedHue;
  (node as Record<string, unknown>).resolvedHue = hue;
  (node as Record<string, unknown>).lightness = 50 + (siblingIndex % 4) * 5;
  // Los hijos directos de una raíz sintética (varias raíces "reales" en el JSON)
  // son las ramas visuales; el resto de descendientes solo heredan el tono.
  const childrenAreTopLevel = !!(node as { synthetic?: boolean }).synthetic;
  const childList = node.children;
  childList.forEach((c, i) => annotateHue(c, hue, topCounter, i, childrenAreTopLevel));
}

/** Reserva el rect de cada nodo (recursivo): los hijos tesellan el rect del
 *  padre, insetado 14px arriba para el rótulo (salvo la raíz sintética invisible). */
function layoutSubtree(node: TreeNode, rect: Rect, isTopSynthetic: boolean): void {
  (node as Record<string, unknown>).rect = rect;
  const childList = node.children;
  if (!childList.length) return;
  const inner: Rect = isTopSynthetic
    ? rect
    : { x: rect.x, y: rect.y + LABEL_H, w: rect.w, h: Math.max(0, rect.h - LABEL_H) };
  const items = childList.map((c) => ({ id: c.id, value: Math.max(Number((c as Record<string, unknown>).value) || 0, 1e-6) }));
  const placed = squarify(items, inner.x, inner.y, inner.w, inner.h);
  const byId = new Map(childList.map((c) => [c.id, c] as const));
  for (const p of placed) {
    const child = byId.get(p.id as string);
    if (!child) continue;
    layoutSubtree(child, { x: p.x, y: p.y, w: p.w, h: p.h }, false);
  }
}

const DEFAULT_W = 640;
const DEFAULT_H = 380;

/** ¿Cabe el texto en el rect, a ojo (según el conteo de caracteres)? */
function labelFits(label: string, rect: Rect): boolean {
  const w = richTextPlain(label).length * 6.2 + 10;
  return rect.w >= w && rect.h >= 16;
}

/**
 * spec → objeto `{width, height, nodes, title, subtitle, total}` listo para pintar.
 * `nodes` viene en orden pre-order (padres antes que hijos), clave para dibujar
 * el rect del padre primero y que sus hijos lo tapen dejando visible solo la
 * franja superior (el rótulo del contenedor).
 *
 * Acepta `opts.width` y `opts.height` para que el componente re-tesele
 * cuando el contenedor cambia de tamaño (fit-width).
 */
export function computeTreemapLayout(spec: TreemapSpec, opts: TreemapLayoutOpts = {}): TreemapLayout {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const headerH = title ? (subtitle ? 40 : 26) : (subtitle ? 20 : 4);

  const root = buildTree(spec.nodes as unknown as ReadonlyArray<import('../_shared/tree-layout.js').RawNode>);
  annotateHue(root, undefined, { i: 0 }, 0, true);

  const W = Math.max(160, opts.width ?? DEFAULT_W);
  // Mantiene el ratio 640:380 si el caller solo pasa width.
  const H = opts.height ?? Math.round((W / DEFAULT_W) * DEFAULT_H);
  const canvasH = H;
  layoutSubtree(root, { x: 0, y: headerH, w: W, h: canvasH }, !!(root as { synthetic?: boolean }).synthetic);

  const specById = new Map(spec.nodes.map((n) => [n.id, n] as const));
  const total = ((root as { synthetic?: boolean }).synthetic ? root.children : [root])
    .reduce((s, n) => s + (specById.get(n.id)?.value ?? Number((n as Record<string, unknown>).value) ?? 0), 0);

  const nodes: TreemapLayoutNode[] = [];
  (function collect(node: TreeNode, depth: number): void {
    if (!(node as { synthetic?: boolean }).synthetic) {
      const src = specById.get(node.id);
      const rect = (node as Record<string, unknown>).rect as Rect | undefined;
      const rectX = rect?.x ?? 0;
      const rectY = rect?.y ?? 0;
      const rectW = rect?.w ?? 0;
      const rectH = rect?.h ?? 0;
      const nodeValue = Number((node as Record<string, unknown>).value) || 0;
      nodes.push({
        id: node.id,
        x: rectX,
        y: rectY,
        w: rectW,
        h: rectH,
        depth,
        label: src?.label ?? node.id,
        value: src?.value ?? nodeValue,
        hue: (node as Record<string, unknown>).resolvedHue as number | undefined,
        lightness: ((node as Record<string, unknown>).lightness as number) ?? 50,
        hasChildren: node.children.length > 0,
        showLabel: labelFits(src?.label ?? node.id, { x: rectX, y: rectY, w: rectW, h: rectH }),
        percent: total > 0 ? ((src?.value ?? nodeValue) / total) * 100 : 0,
      });
    }
    for (const c of node.children) collect(c, (node as { synthetic?: boolean }).synthetic ? depth : depth + 1);
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