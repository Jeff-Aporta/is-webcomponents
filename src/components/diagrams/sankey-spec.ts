import { richTextPlain } from '../_shared/tk-rich-text.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas de Sankey (sin Mermaid).
 *
 * Mismo contrato que el resto de la categoría: JSON → geometría pura. El
 * componente solo pinta lo que sale de aquí.
 *
 * El Sankey es un grafo dirigido por capas donde el GROSOR es el dato: cada
 * enlace ocupa una banda proporcional a su valor, y la altura de un nodo es la
 * suma de lo que entra o sale de él (la mayor de las dos).
 */

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

const NODE_W = 14;
const NODE_GAP = 14;
const MIN_BAND = 2;
// Separación entre capas: se calcula para llenar el ancho objetivo. Antes era
// fija (168 px) y con un margen derecho enorme, así que el diagrama quedaba
// apretado a la izquierda con medio lienzo vacío.
const LAYER_GAP_MIN = 150;
const LAYER_GAP_MAX = 560;
const ANCHO_OBJETIVO = 940;
const MARGIN = { top: 16, right: 24, bottom: 20, left: 20 };

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readNode(raw, i: number) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `n${i}`),
    label: String(r.label ?? r.name ?? r.id ?? `Nodo ${i + 1}`),
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    group: String(r.group ?? '') || undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readLink(raw, i) {
  const r = asRecord(raw);
  const value = Number(r.value ?? r.weight ?? r.amount ?? 0);
  return {
    id: String(r.id ?? `l${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    // Un enlace sin valor positivo no tiene grosor: no es un enlace, es ruido.
    value: Number.isFinite(value) && value > 0 ? value : 0,
    label: String(r.label ?? '').trim() || undefined,
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

/** payload → spec normalizada, o null si no hay nodos ni enlaces con valor. */
export function resolveSankeySpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.sankey ?? p.sankeyDiagram ?? p);
  const rawLinks = Array.isArray(src.links) ? src.links : [];
  const links = rawLinks.map(readLink).filter((l) => l.value > 0 && l.from && l.to && l.from !== l.to);
  if (!links.length) return null;

  // Los nodos declarados mandan; los que solo aparecen en un enlace se crean
  // al vuelo para que un payload mínimo (solo links) siga siendo válido.
  const declared = (Array.isArray(src.nodes) ? src.nodes : []).map(readNode);
  const byId = new Map(declared.map((n) => [n.id, n]));
  let auto = declared.length;
  for (const l of links) {
    for (const id of [l.from, l.to]) {
      if (!byId.has(id)) byId.set(id, readNode({ id, label: id }, auto++));
    }
  }

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    unit: String(src.unit ?? '').trim() || undefined,
    groups: readGroups(src),
    nodes: [...byId.values()],
    links,
  };
}

/** spec → objeto `sankey` listo para persistir / mostrar en el editor. */
export function sankeySpecToJson(spec) {
  const out = { nodes: [], links: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.unit) out.unit = spec.unit;
  if (spec.groups?.length) out.groups = spec.groups;
  out.nodes = spec.nodes.map((n) => {
    const row = { id: n.id, label: n.label };
    if (n.group) row.group = n.group;
    if (n.description) row.desc = n.description;
    return row;
  });
  out.links = spec.links.map((l) => {
    const row = { from: l.from, to: l.to, value: l.value };
    if (l.label) row.label = l.label;
    if (l.group) row.group = l.group;
    return row;
  });
  return out;
}

/**
 * Capa de cada nodo: el más lejano desde cualquier fuente (longest path).
 * Los ciclos se cortan con un tope de iteraciones — un Sankey cíclico no
 * existe, pero un payload mal armado no puede colgar el render.
 */
function assignLayers(nodes, links) {
  const layer = new Map(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map();
  for (const l of links) {
    if (!outgoing.has(l.from)) outgoing.set(l.from, []);
    outgoing.get(l.from).push(l);
  }
  const limit = nodes.length + 1;
  for (let pass = 0; pass < limit; pass++) {
    let moved = false;
    for (const l of links) {
      const next = layer.get(l.from) + 1;
      if (next > layer.get(l.to)) {
        layer.set(l.to, next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return layer;
}

/** Suma de valores por nodo: la altura del nodo es la mayor de entrada/salida. */
function nodeTotals(nodes, links) {
  const inSum = new Map(nodes.map((n) => [n.id, 0]));
  const outSum = new Map(nodes.map((n) => [n.id, 0]));
  for (const l of links) {
    outSum.set(l.from, outSum.get(l.from) + l.value);
    inSum.set(l.to, inSum.get(l.to) + l.value);
  }
  const total = new Map();
  for (const n of nodes) total.set(n.id, Math.max(inSum.get(n.id), outSum.get(n.id)));
  return { inSum, outSum, total };
}

/** Cinta del enlace: dos bordes cúbicos horizontales cerrados en un solo path. */
function ribbonPath(x0, y0, x1, y1, thickness: number) {
  const cx = (x0 + x1) / 2;
  const top0 = y0 - thickness / 2;
  const top1 = y1 - thickness / 2;
  const bot0 = y0 + thickness / 2;
  const bot1 = y1 + thickness / 2;
  return [
    `M${x0},${top0}`,
    `C${cx},${top0} ${cx},${top1} ${x1},${top1}`,
    `L${x1},${bot1}`,
    `C${cx},${bot1} ${cx},${bot0} ${x0},${bot0}`,
    'Z',
  ].join(' ');
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, nodes:Array, links:Array, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number, unit?:string}}
 */
export function computeSankeyLayout(spec, opts = {}) {
  const height = Math.max(220, Number(opts.height) || 320);
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  const anchoLabel = (t: number) => Math.ceil(richTextPlain(t).length * 6.2);
  const labelW = Math.max(...spec.nodes.map((n) => anchoLabel(n.label)), 60);

  const layerById = assignLayers(spec.nodes, spec.links);
  const { total } = nodeTotals(spec.nodes, spec.links);
  const layers = new Map();
  for (const n of spec.nodes) {
    const li = layerById.get(n.id) ?? 0;
    if (!layers.has(li)) layers.set(li, []);
    layers.get(li).push(n);
  }
  const layerKeys = [...layers.keys()].sort((a, b) => a - b);
  const ultimaCapa = layerKeys[layerKeys.length - 1] ?? 0;
  // El ancho útil se reparte entre las capas: el diagrama ocupa todo el lienzo.
  const anchoUtil = (opts.width ?? ANCHO_OBJETIVO) - MARGIN.left - NODE_W - labelW - MARGIN.right;
  const layerGap = ultimaCapa === 0
    ? 0
    : Math.min(LAYER_GAP_MAX, Math.max(LAYER_GAP_MIN, anchoUtil / ultimaCapa));

  // Escala: la columna más cargada define cuántos píxeles vale una unidad.
  const plotTop = MARGIN.top + headerH;
  const plotH = height - plotTop - MARGIN.bottom;
  let maxSum = 0;
  for (const li of layerKeys) {
    const nodesIn = layers.get(li);
    const sum = nodesIn.reduce((acc, n) => acc + total.get(n.id), 0);
    const gaps = (nodesIn.length - 1) * NODE_GAP;
    maxSum = Math.max(maxSum, sum / Math.max(1, plotH - gaps));
  }
  const unitPx = maxSum > 0 ? 1 / maxSum : 1;

  const nodes = [];
  const posById = new Map();
  for (const li of layerKeys) {
    const nodesIn = layers.get(li);
    const heights = nodesIn.map((n) => Math.max(MIN_BAND, total.get(n.id) * unitPx));
    const used = heights.reduce((a, b) => a + b, 0) + (nodesIn.length - 1) * NODE_GAP;
    let y = plotTop + Math.max(0, (plotH - used) / 2);
    nodesIn.forEach((n, i) => {
      const h = heights[i];
      const node = {
        id: n.id,
        label: n.label,
        description: n.description,
        group: n.group,
        hue: n.hue,
        layer: li,
        value: total.get(n.id),
        x: MARGIN.left + li * layerGap,
        y,
        w: NODE_W,
        h,
        // Siempre a la derecha: anclarla a la izquierda en la última capa la
        // hacía caer encima de las cintas de entrada.
        labelSide: 'right',
      };
      nodes.push(node);
      posById.set(n.id, node);
      y += h + NODE_GAP;
    });
  }

  // Reparto vertical dentro de cada nodo: las bandas se apilan en el orden de
  // declaración, igual en el lado de salida y en el de entrada.
  const outCursor = new Map(nodes.map((n) => [n.id, n.y]));
  const inCursor = new Map(nodes.map((n) => [n.id, n.y]));
  const links = spec.links.map((l, i) => {
    const from = posById.get(l.from);
    const to = posById.get(l.to);
    const thickness = Math.max(MIN_BAND, l.value * unitPx);
    const y0 = outCursor.get(l.from) + thickness / 2;
    const y1 = inCursor.get(l.to) + thickness / 2;
    outCursor.set(l.from, outCursor.get(l.from) + thickness);
    inCursor.set(l.to, inCursor.get(l.to) + thickness);
    const x0 = from.x + from.w;
    const x1 = to.x;
    return {
      id: l.id ?? `l${i}`,
      from: l.from,
      to: l.to,
      value: l.value,
      label: l.label,
      group: l.group,
      thickness,
      path: ribbonPath(x0, y0, x1, y1, thickness),
      labelX: (x0 + x1) / 2,
      labelY: (y0 + y1) / 2,
      hue: from.hue,
    };
  });

  const width = Math.max(
    MARGIN.left + ultimaCapa * layerGap + NODE_W + labelW + MARGIN.right,
    diagramHeaderWidth(title, subtitle),
  );
  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendX = legendGroups
    ? Math.max(8, width - Math.max(...legendGroups.map((g) => g.name.length * 6 + 30)) - 8)
    : 0;

  return {
    width,
    height,
    nodes,
    links,
    groups: legendGroups,
    unit: spec.unit,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
}
