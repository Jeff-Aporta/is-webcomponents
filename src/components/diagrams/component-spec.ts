/**
 * Especificación y layout de diagramas de componentes UML (sin Mermaid).
 *
 * A diferencia de flowchart/block, este modo tiene tres primitivas:
 * Alias aceptados, por consistencia con el resto de motores del kit:
 * `label` por `name` (nodos y paquetes) y `links` por `edges`.
 *
 *   - packages: carpetas con pestaña (tab) arriba a la izquierda.
 *   - components: rectángulos con estereotipo `<<name>>` sobre la etiqueta.
 *   - interfaces (lollipop): circulo hueco O (provided) o arco C (required)
 *     perpendicular al lado del componente. Una arista componente→componente
 *     sin interfaces se completa sola a conector UML `-(O-`.
 *
 * Las posiciones del payload son la semilla. Si hay paquetes, el motor
 * reordena columnas (corredor entre ellas) para que las aristas no atraviesen
 * cajas. El contorno del paquete es la unión ortogonal de sus hijos.
 *
 * Las aristas (`edges`) conectan interfaces (no componentes) para mantener
 * la semántica UML: "componente A expone interfaz I → componente B la
 * requiere". Si el usuario prefiere una arista cruda entre componentes, basta
 * con no declarar `via` y el router la resuelve de borde a borde.
 *
 *   <is-component-diagram>
 *     <script type="application/json">
 *       {
 *         "componentDiagram": {
 *           "packages": [
 *             { "id": "azure", "name": "Azure", "x": 100, "y": 30, "w": 800, "h": 600 }
 *           ],
 *           "components": [
 *             { "id": "ayudas", "package": "azure", "name": "AYUDASCP-IA",
 *               "stereotype": "component", "x": 220, "y": 120, "w": 240, "h": 64 }
 *           ],
 *           "interfaces": [
 *             { "id": "if1", "component": "ayudas", "side": "right", "offset": 30,
 *               "kind": "provided", "name": "IApi" }
 *           ],
 *           "edges": [
 *             { "from": "cliente", "to": "if1", "kind": "dependency" }
 *           ]
 *         }
 *       }
 *     </script>
 *   </is-component-diagram>
 *
 * Decisiones que NO son negociables sin pedir:
 *   - tema claro por defecto (prefijo `theme-light` en <html>).
 *   - fondo blanco siempre (los PNG van a la ficha y a chats).
 *   - sin auto-layout: la posición la pone el autor del payload.
 */

import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { packDiagram, layoutPackageOutlines, outlineToPath, routeAvoidingBoxes, pathIllegal, pathHasDiagonal, segsFromPath, resolvePackingGaps, inflateBox, inflateTitleObstacle, COL_GUTTER, PKG_CORRIDOR, ROW_GAP, EDGE_CLEARANCE, TITLE_CLEARANCE } from './component-pack.js';
import { parsePathPoints } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';

const TAB_W = 56;
const TAB_H = 14;
const STEREO_GAP = 4;
/** Radio del lollipop / socket. Visible en PNG a tamaño ficha. */
export const LOLLI_R = 8;
/** Distancia borde → centro O. C acopla al O, no al origen. */
export const LOLLI_STEM = 18;
/** Aire boca-C vs borde-O. 1 px: enchufe junto, sin anidar. */
export const LOLLI_GAP = 1;

const LINE_H = 13;
const BUBBLE_H = 18;
const BUBBLE_GAP = 4;

/** Colores tipo Swagger/OpenAPI para el verbo HTTP. */
export const HTTP_METHOD_BADGE = {
  GET: { fill: '#61affe', text: '#ffffff' },
  POST: { fill: '#49cc90', text: '#ffffff' },
  PUT: { fill: '#fca130', text: '#ffffff' },
  PATCH: { fill: '#50e3c2', text: '#14332c' },
  DELETE: { fill: '#f93e3e', text: '#ffffff' },
  QUERY: { fill: '#9012fe', text: '#ffffff' },
  HEAD: { fill: '#9012fe', text: '#ffffff' },
  OPTIONS: { fill: '#0d5aa7', text: '#ffffff' },
};

export function parseHttpEndpoint(raw) {
  const s = String(raw ?? '').trim();
  const m = /^(GET|POST|PUT|PATCH|DELETE|QUERY|HEAD|OPTIONS)\b\s*/i.exec(s);
  if (!m) return { method: '', path: s };
  return { method: m[1].toUpperCase(), path: s.slice(m[0].length).trim() };
}

function fittedHeight(c) {
  const items = c.items ?? [];
  if (!items.length) return c.h;
  const nameN = wrapLabel(c.name, c.w).length;
  const header = c.stereotype ? 18 : 8;
  return header + nameN * LINE_H + 10 + items.length * (BUBBLE_H + BUBBLE_GAP) + 6;
}

function asList(v: string) {
  if (Array.isArray(v)) return v.map((x: string) => String(x).trim()).filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v).trim()].filter(Boolean);
}

function asRecord(v) { return v && typeof v === 'object' ? v : {}; }

function readPackage(raw, i: number) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `pkg-${i}`),
    name: String(r.name ?? r.label ?? r.id ?? `Paquete ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Math.max(80, Number(r.w ?? 200)),
    h: Math.max(60, Number(r.h ?? 120)),
  };
}

function readComponent(raw, i: number) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `cmp-${i}`),
    name: String(r.label ?? r.name ?? r.id ?? `Componente ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    package: String(r.package ?? '') || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Math.max(72, Number(r.w ?? 160)),
    h: Math.max(36, Number(r.h ?? 56)),
    provides: asList(r.provides ?? r.expose ?? r.exposes),
    requires: asList(r.requires ?? r.consume ?? r.consumes ?? r.needs),
    connects: asList(r.connects ?? r.links ?? r.depends ?? r.uses ?? r.to),
    items: asList(r.items ?? r.endpoints ?? r.body),
  };
}

function readInterface(raw, i) {
  const r = asRecord(raw);
  const kind = String(r.kind ?? 'provided').toLowerCase();
  return {
    id: String(r.id ?? `if-${i}`),
    component: String(r.component ?? ''),
    name: String(r.name ?? '').trim() || undefined,
    side: ['top', 'right', 'bottom', 'left'].includes(String(r.side)) ? String(r.side) : 'right',
    offset: Number(r.offset ?? 30),
    kind: kind === 'required' ? 'required' : 'provided',
  };
}

function readEdge(raw, i) {
  const r = asRecord(raw);
  const kind = String(r.kind ?? 'dependency').toLowerCase();
  return {
    id: String(r.id ?? `e-${i}`),
    from: String(r.from ?? r.source ?? r.src ?? ''),
    to: String(r.to ?? r.target ?? r.dst ?? ''),
    fromInterface: String(r.fromInterface ?? r.fromIf ?? '') || undefined,
    toInterface: String(r.toInterface ?? r.toIf ?? '') || undefined,
    label: String(r.label ?? r.name ?? '').trim() || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    kind: ['dependency', 'association', 'realization', 'assembly'].includes(kind) ? kind : 'dependency',
  };
}

function readLayout(raw) {
  const r = asRecord(raw);
  const mode = ['pack', 'triptych', 'manual'].includes(String(r.mode)) ? String(r.mode) : 'pack';
  return {
    mode,
    ungroup: asList(r.ungroup),
    sources: asList(r.sources),
    sourceSides: asRecord(r.sourceSides),
    sourceGap: r.sourceGap != null ? Number(r.sourceGap) : undefined,
    colGutter: r.colGutter != null ? Number(r.colGutter) : undefined,
    pkgCorridor: r.pkgCorridor != null ? Number(r.pkgCorridor) : undefined,
    rowGap: r.rowGap != null ? Number(r.rowGap) : undefined,
    minGap: r.minGap != null ? Number(r.minGap) : undefined,
  };
}

/** payload → spec normalizada, o null si no hay componentes. */
export function resolveComponentSpec(payload, host = {}) {
  const p = asRecord(payload);
  const src = asRecord(p.componentDiagram ?? p);
  const rawComponents = src.components ?? [];
  if (!Array.isArray(rawComponents) || !rawComponents.length) return null;

  const packages = (Array.isArray(src.packages) ? src.packages : []).map(readPackage);
  const components = rawComponents.map(readComponent).map((c) => ({ ...c, h: fittedHeight(c) }));
  const interfaces = (Array.isArray(src.interfaces) ? src.interfaces : []).map(readInterface);
  const rawEdges = src.edges ?? src.links ?? src.connections ?? src.relations;
  const edges = (Array.isArray(rawEdges) ? rawEdges : []).map(readEdge);
  const layout = readLayout(src.layout);
  if (layout.minGap == null && host.minGap != null) layout.minGap = Number(host.minGap);
  if (layout.mode !== 'manual') packDiagram(packages, components, edges, layout);

  const wired = wireComponentDiagram(components, interfaces, edges);

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    layout,
    packages,
    components: wired.components,
    interfaces: wired.interfaces,
    edges: wired.edges,
  };
}

function boundsOfComps(comps) {
  const x = Math.min(...comps.map((c) => c.x));
  const y = Math.min(...comps.map((c) => c.y));
  return {
    x,
    y,
    w: Math.max(...comps.map((c) => c.x + c.w)) - x,
    h: Math.max(...comps.map((c) => c.y + c.h)) - y,
  };
}

/** Cara del rectángulo que mira al destino (o al origen). */
function rankSides(from, to) {
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  const lr = dx >= 0 ? ['right', 'left'] : ['left', 'right'];
  const tb = dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
  const sameColumn = Math.abs(dx) < Math.max(from.w, to.w) * 0.6;
  if (sameColumn) return [tb[0], lr[0], lr[1], tb[1]];
  return [lr[0], tb[0], tb[1], lr[1]];
}

/**
 * Lados del destino desde el más exterior del clúster: así las llegadas
 * no se acumulan todas a la izquierda.
 * El borde superior del paquete es el título: no aparcar el O ahí.
 */
function outerSides(comp, cluster, sibs = []) {
  const cx = comp.x + comp.w / 2;
  const cy = comp.y + comp.h / 2;
  const dx = cx - (cluster.x + cluster.w / 2);
  const dy = cy - (cluster.y + cluster.h / 2);
  let ranked;
  if (Math.abs(dx) >= Math.abs(dy)) {
    ranked = dx >= 0
      ? ['right', 'top', 'bottom', 'left']
      : ['left', 'top', 'bottom', 'right'];
  } else {
    ranked = dy >= 0
      ? ['bottom', 'left', 'right', 'top']
      : ['top', 'left', 'right', 'bottom'];
  }
  const topY = sibs.length ? Math.min(...sibs.map((c) => c.y)) : null;
  if (topY != null && comp.y <= topY + 8) {
    ranked = ranked.filter((s) => s !== 'top').concat(['top']);
  }
  return ranked;
}

/** Round-robin: cap 1 fuerza a rotar de lado antes de repetir. */
function takeLeastLoaded(comp, ranked, loads, cap = 1) {
  for (const side of ranked) {
    if ((loads.get(`${comp.id}:${side}`) ?? 0) < cap) return side;
  }
  let best = ranked[0];
  let bestN = Infinity;
  for (const side of ranked) {
    const n = loads.get(`${comp.id}:${side}`) ?? 0;
    if (n < bestN) { bestN = n; best = side; }
  }
  return best;
}

function sideOffset(comp, side, index: number, total: number) {
  const t = (index + 1) / (total + 1);
  if (side === 'top' || side === 'bottom') return Math.max(12, Math.min(comp.w - 12, comp.w * t));
  return Math.max(12, Math.min(comp.h - 12, comp.h * t));
}

/**
 * Completa el diagrama UML:
 *   1. `connects` en el componente → aristas.
 *   2. `provides` / `requires` → lollipops y, si hay nombre en común, arista.
 *   3. Arista componente→componente sin interfaz → socket (C) en el origen
 *      y lollipop (O) en el destino. Sin esto el PNG solo enseña cajas.
 */
function wireComponentDiagram(components, interfaces, edges) {
  const known = new Set(components.map((c) => c.id));
  const byId = new Map(components.map((c) => [c.id, c]));
  const ifaces = interfaces.slice();
  const knownIf = new Set(ifaces.map((i) => i.id));
  const outEdges = [];
  const seenPair = new Set();

  const pushEdge = (e) => {
    const key = `${e.from}|${e.to}|${e.fromInterface ?? ''}|${e.toInterface ?? ''}`;
    if (seenPair.has(key)) return;
    seenPair.add(key);
    outEdges.push(e);
  };

  for (const e of edges) pushEdge(e);

  for (const c of components) {
    for (const to of c.connects) {
      if (!known.has(to) || to === c.id) continue;
      pushEdge({
        id: `e-${c.id}-${to}`,
        from: c.id,
        to,
        kind: 'dependency',
      });
    }
  }

  let ifaceSeq = ifaces.length;
  const addIface = (partial) => {
    const id = partial.id || `if-${ifaceSeq++}`;
    if (knownIf.has(id)) return ifaces.find((i) => i.id === id);
    const iface = { id, name: undefined, offset: 30, kind: 'provided', side: 'right', ...partial };
    ifaces.push(iface);
    knownIf.add(id);
    return iface;
  };

  for (const c of components) {
    c.provides.forEach((name, i) => {
      if (ifaces.some((x) => x.component === c.id && x.kind === 'provided' && x.name === name)) return;
      addIface({
        id: `if-${c.id}-prv-${i}`,
        component: c.id,
        name,
        kind: 'provided',
        side: 'right',
        offset: sideOffset(c, 'right', i, Math.max(c.provides.length, 1)),
      });
    });
    c.requires.forEach((name, i) => {
      if (ifaces.some((x) => x.component === c.id && x.kind === 'required' && x.name === name)) return;
      addIface({
        id: `if-${c.id}-req-${i}`,
        component: c.id,
        name,
        kind: 'required',
        side: 'left',
        offset: sideOffset(c, 'left', i, Math.max(c.requires.length, 1)),
      });
    });
  }

  for (const req of ifaces.filter((i) => i.kind === 'required' && i.name)) {
    const prv = ifaces.find((i) => i.kind === 'provided' && i.name === req.name && i.component !== req.component);
    if (!prv) continue;
    pushEdge({
      id: `e-${req.id}-${prv.id}`,
      from: req.component,
      to: prv.component,
      fromInterface: req.id,
      toInterface: prv.id,
      label: req.name,
      kind: 'assembly',
    });
  }

  const loads = new Map();
  const pending = [];
  for (const e of outEdges) {
    const fromC = byId.get(e.from);
    const toC = byId.get(e.to);
    if (!fromC || !toC) continue;
    if (e.fromInterface || e.toInterface || knownIf.has(e.from) || knownIf.has(e.to)) continue;
    pending.push({ e, fromC, toC });
  }
  pending.sort((a, b) => {
    const aa = Math.atan2(
      (a.toC.y + a.toC.h / 2) - (a.fromC.y + a.fromC.h / 2),
      (a.toC.x + a.toC.w / 2) - (a.fromC.x + a.fromC.w / 2),
    );
    const bb = Math.atan2(
      (b.toC.y + b.toC.h / 2) - (b.fromC.y + b.fromC.h / 2),
      (b.toC.x + b.toC.w / 2) - (b.fromC.x + b.fromC.w / 2),
    );
    return aa - bb || String(a.e.id).localeCompare(String(b.e.id));
  });

  const clusterOf = (comp) => {
    const sibs = comp.package
      ? components.filter((c) => c.package === comp.package)
      : [comp];
    return sibs.length > 1 ? boundsOfComps(sibs) : { x: comp.x, y: comp.y, w: comp.w, h: comp.h };
  };

  const planned = [];
  for (const item of pending) {
    const { e, fromC, toC } = item;
    const fs = takeLeastLoaded(fromC, rankSides(fromC, toC), loads, 1);
    loads.set(`${fromC.id}:${fs}`, (loads.get(`${fromC.id}:${fs}`) ?? 0) + 1);
    const ts = takeLeastLoaded(toC, outerSides(toC, clusterOf(toC), toC.package
      ? components.filter((c) => c.package === toC.package)
      : []), loads, 1);
    loads.set(`${toC.id}:${ts}`, (loads.get(`${toC.id}:${ts}`) ?? 0) + 1);
    planned.push({ e, fs, ts, fromC, toC });
  }

  const slots = new Map();
  const slotKey = (compId, side) => `${compId}:${side}`;
  const takeSlot = (comp, side) => {
    const k = slotKey(comp.id, side);
    const n = slots.get(k) ?? 0;
    slots.set(k, n + 1);
    return n;
  };
  const countSlots = new Map();
  for (const p of planned) {
    countSlots.set(slotKey(p.fromC.id, p.fs), (countSlots.get(slotKey(p.fromC.id, p.fs)) ?? 0) + 1);
    countSlots.set(slotKey(p.toC.id, p.ts), (countSlots.get(slotKey(p.toC.id, p.ts)) ?? 0) + 1);
  }

  for (const p of planned) {
    const { e, fs, ts, fromC, toC } = p;
    const fi = takeSlot(fromC, fs);
    const ti = takeSlot(toC, ts);
    const req = addIface({
      id: `if-${e.id}-req`,
      component: fromC.id,
      kind: 'required',
      side: fs,
      offset: sideOffset(fromC, fs, fi, countSlots.get(slotKey(fromC.id, fs)) || 1),
    });
    const prv = addIface({
      id: `if-${e.id}-prv`,
      component: toC.id,
      kind: 'provided',
      side: ts,
      offset: sideOffset(toC, ts, ti, countSlots.get(slotKey(toC.id, ts)) || 1),
    });
    const unoSolo = (countSlots.get(slotKey(fromC.id, fs)) || 1) === 1
      && (countSlots.get(slotKey(toC.id, ts)) || 1) === 1;
    const sameAxisTB = (fs === 'top' || fs === 'bottom') && (ts === 'top' || ts === 'bottom');
    const sameAxisLR = (fs === 'left' || fs === 'right') && (ts === 'left' || ts === 'right');
    if (unoSolo && (sameAxisTB || sameAxisLR)) {
      const alongX = sameAxisTB;
      const desde = alongX ? [fromC.x, fromC.x + fromC.w] : [fromC.y, fromC.y + fromC.h];
      const hasta = alongX ? [toC.x, toC.x + toC.w] : [toC.y, toC.y + toC.h];
      const a = Math.max(desde[0], hasta[0]);
      const b = Math.min(desde[1], hasta[1]);
      if (b > a) {
        const centro = (a + b) / 2;
        req.offset = centro - (alongX ? fromC.x : fromC.y);
        prv.offset = centro - (alongX ? toC.x : toC.y);
      }
    }
    e.fromInterface = req.id;
    e.toInterface = prv.id;
  }

  const safeEdges = outEdges.filter((e) => {
    const fromOk = known.has(e.from) || knownIf.has(e.from) || knownIf.has(e.fromInterface);
    const toOk = known.has(e.to) || knownIf.has(e.to) || knownIf.has(e.toInterface);
    return fromOk && toOk && e.from && e.to;
  });

  return { components, interfaces: ifaces, edges: safeEdges };
}

function interfaceAnchor(iface, comp) {
  // El lollipop asoma perpendicular al lado; el centro queda a LOLLI_STEM
  // del borde para que el O y la C se lean en el PNG (14 px se perdía).
  const stem = LOLLI_STEM;
  switch (iface.side) {
    case 'top':    return { cx: comp.x + iface.offset, cy: comp.y - stem };
    case 'bottom': return { cx: comp.x + iface.offset, cy: comp.y + comp.h + stem };
    case 'left':   return { cx: comp.x - stem, cy: comp.y + iface.offset };
    case 'right':
    default:       return { cx: comp.x + comp.w + stem, cy: comp.y + iface.offset };
  }
}

/** Punto de la arista: dorso de la C, alineado al centro del O. */
function ifaceLineEnd(iface) {
  const r = LOLLI_R;
  if (iface.kind === 'required' && iface.docked) {
    switch (iface.side) {
      case 'right':  return { x: iface.cx - r, y: iface.cy };
      case 'left':   return { x: iface.cx + r, y: iface.cy };
      case 'bottom': return { x: iface.cx, y: iface.cy - r };
      default:       return { x: iface.cx, y: iface.cy + r };
    }
  }
  return ifaceOuterPoint(iface);
}

function componentSidePoint(comp, side, offset) {
  switch (side) {
    case 'top':    return { x: comp.x + offset, y: comp.y };
    case 'bottom': return { x: comp.x + offset, y: comp.y + comp.h };
    case 'left':   return { x: comp.x, y: comp.y + offset };
    default:       return { x: comp.x + comp.w, y: comp.y + offset };
  }
}

function oppositeDrawSide(side) {
  if (side === 'left') return 'right';
  if (side === 'right') return 'left';
  if (side === 'top') return 'bottom';
  return 'top';
}

/** C al dorso del O: centros a 2R+GAP. Abertura de C mira al O. */
function dockRequiredToProvided(req, prv) {
  const d = LOLLI_R + LOLLI_GAP;
  req.attachSide = req.side;
  req.docked = true;
  req.side = oppositeDrawSide(prv.side);
  switch (prv.side) {
    case 'left':
      req.cx = prv.cx - d;
      req.cy = prv.cy;
      break;
    case 'right':
      req.cx = prv.cx + d;
      req.cy = prv.cy;
      break;
    case 'top':
      req.cx = prv.cx;
      req.cy = prv.cy - d;
      break;
    default:
      req.cx = prv.cx;
      req.cy = prv.cy + d;
      break;
  }
}

function ifaceOuterPoint(iface) {
  const r = LOLLI_R;
  switch (iface.side) {
    case 'top':    return { x: iface.cx, y: iface.cy - r };
    case 'bottom': return { x: iface.cx, y: iface.cy + r };
    case 'left':   return { x: iface.cx - r, y: iface.cy };
    case 'right':
    default:       return { x: iface.cx + r, y: iface.cy };
  }
}

function componentAnchorPoint(comp, side) {
  switch (side) {
    case 'top':    return { x: comp.x + comp.w / 2, y: comp.y };
    case 'bottom': return { x: comp.x + comp.w / 2, y: comp.y + comp.h };
    case 'left':   return { x: comp.x, y: comp.y + comp.h / 2 };
    case 'right':
    default:       return { x: comp.x + comp.w, y: comp.y + comp.h / 2 };
  }
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, packages:Array, components:Array, interfaces:Array, edges:Array, title?:string, subtitle?:string}}
 */
export function computeComponentLayout(spec) {
  const PAD = 24;
  const titleH = spec.title ? 28 : 0;
  const subtitleH = spec.subtitle ? 18 : 0;

  // Los lollipops salen del rectángulo del componente: si el autor pone x=0,
  // el O de la izquierda queda en negativo y overflow:hidden lo recorta.
  let minX = 0;
  let minY = 0;
  for (const p of spec.packages) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  }
  for (const c of spec.components) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  for (const iface of spec.interfaces) {
    const comp = spec.components.find((c) => c.id === iface.component);
    if (!comp) continue;
    const { cx, cy } = interfaceAnchor(iface, comp);
    minX = Math.min(minX, cx - LOLLI_R - 8);
    minY = Math.min(minY, cy - LOLLI_R - 8);
  }
  const ox = Math.max(0, PAD - minX);
  const oy = Math.max(0, titleH + subtitleH + PAD - minY);

  const packages = spec.packages.map((p) => ({ ...p, x: p.x + ox, y: p.y + oy }));
  const shiftedComps = spec.components.map((c) => ({ ...c, x: c.x + ox, y: c.y + oy }));
  const compById = new Map(shiftedComps.map((c) => [c.id, c]));

  const components = shiftedComps.map((c) => {
    const lines = wrapLabel(c.name, c.w);
    const parsed = (c.items ?? []).map(parseHttpEndpoint);
    const topLibre = c.y + (c.stereotype ? 16 : 0);
    const labelY = parsed.length
      ? topLibre + 12
      : topLibre + (c.y + c.h - topLibre) / 2 - ((lines.length - 1) * LINE_H) / 2 + 4;
    const itemsY = labelY + (lines.length - 1) * LINE_H + 10;
    const badgeW = 34;
    const itemBubbles = parsed.map((ep, i) => ({
      method: ep.method,
      path: wrapLabel(ep.path || ep.method, c.w - (ep.method ? badgeW + 16 : 16), 9, 1)[0],
      x: c.x + 7,
      y: itemsY + i * (BUBBLE_H + BUBBLE_GAP) - 11,
      w: c.w - 14,
      h: BUBBLE_H,
      badgeW,
    }));
    return {
      ...c,
      stereoY: c.y + (c.stereotype ? 14 : 0),
      lines,
      itemLines: parsed.map((ep) => [ep.method, ep.path].filter(Boolean).join(' ')),
      itemBubbles,
      itemsY,
      itemLineHeight: BUBBLE_H + BUBBLE_GAP,
      labelY,
      lineHeight: LINE_H,
    };
  });

  const interfaces = spec.interfaces.map((iface) => {
    const comp = compById.get(iface.component);
    const { cx, cy } = comp ? interfaceAnchor(iface, comp) : { cx: 0, cy: 0 };
    return { ...iface, cx, cy };
  });

  // Importante: este mapa se rellena DESPUÉS de calcular cx/cy de cada interfaz;
  // si se construye sobre `spec.interfaces` (sin geometría), las aristas caen a
  // (0, 0) y desaparecen del render sin error visible.
  const ifaceById = new Map(interfaces.map((i) => [i.id, i]));

  for (const e of spec.edges) {
    if (!e.fromInterface || !e.toInterface) continue;
    const req = ifaceById.get(e.fromInterface);
    const prv = ifaceById.get(e.toInterface);
    if (req?.kind === 'required' && prv?.kind === 'provided') {
      dockRequiredToProvided(req, prv);
    }
  }

  const pointOf = (iface) => (iface ? ifaceLineEnd(iface) : null);

  assignEdgeHues(spec.edges);
  const edges = spec.edges.map((e) => {
    const hue = e.hue;
    const req = e.fromInterface ? ifaceById.get(e.fromInterface) : null;
    const prv = e.toInterface ? ifaceById.get(e.toInterface) : null;
    if (req) req.hue = hue;
    if (prv) prv.hue = hue;

    let fromPt = null;
    let toPt = null;
    if (req?.docked && compById.has(e.from)) {
      fromPt = componentSidePoint(compById.get(e.from), req.attachSide, req.offset);
      toPt = ifaceLineEnd(req);
    } else {
      if (e.fromInterface && ifaceById.has(e.fromInterface)) {
        fromPt = pointOf(ifaceById.get(e.fromInterface));
      } else if (ifaceById.has(e.from)) {
        fromPt = pointOf(ifaceById.get(e.from));
      } else if (compById.has(e.from)) {
        fromPt = nearestSidePoint(compById.get(e.from), e.toInterface
          ? ifaceById.get(e.toInterface)
          : (compById.get(e.to) ? nearestSidePoint(compById.get(e.to), compById.get(e.from), true) : null));
      }

      if (e.toInterface && ifaceById.has(e.toInterface)) {
        toPt = pointOf(ifaceById.get(e.toInterface));
      } else if (ifaceById.has(e.to)) {
        toPt = pointOf(ifaceById.get(e.to));
      } else if (compById.has(e.to)) {
        toPt = nearestSidePoint(compById.get(e.to), fromPt);
      }
    }

    return {
      ...e,
      hue,
      fromX: fromPt?.x ?? 0, fromY: fromPt?.y ?? 0,
      toX: toPt?.x ?? 0, toY: toPt?.y ?? 0,
      path: '',
      _fromPt: fromPt,
      _toPt: toPt,
      _fromSide: req?.attachSide ?? req?.side,
      _toSide: prv?.side,
    };
  });

  const ranked = edges
    .map((e, i) => ({ e, i, mid: (e.fromY + e.toY) / 2 }))
    .sort((a, b) => a.mid - b.mid || a.i - b.i);
  const usedSegs = [];
  const sourceSet = new Set(spec.layout?.sources ?? []);
  const titleBoxes = packages.map((p) => packageTitleBox(p, shiftedComps));
  const titleObst = titleBoxes.map((tb, i) => {
    const kids = shiftedComps.filter((c) => c.package === packages[i].id);
    const yClip = kids.length ? Math.min(...kids.map((c) => c.y)) - 8 : undefined;
    return inflateTitleObstacle(tb, TITLE_CLEARANCE, yClip);
  });
  const frame = {
    x: Math.min(...shiftedComps.map((c) => c.x)),
    y: Math.min(...shiftedComps.map((c) => c.y)),
    w: Math.max(...shiftedComps.map((c) => c.x + c.w)) - Math.min(...shiftedComps.map((c) => c.x)),
    h: Math.max(...shiftedComps.map((c) => c.y + c.h)) - Math.min(...shiftedComps.map((c) => c.y)),
  };
  ranked.forEach((item, rank) => {
    const e = item.e;
    const fromPt = e._fromPt;
    const toPt = e._toPt;
    const fromSide = e._fromSide;
    const toSide = e._toSide;
    delete e._fromPt;
    delete e._toPt;
    delete e._fromSide;
    delete e._toSide;
    if (!fromPt || !toPt) return;
    const obstaculos = [
      ...shiftedComps.filter((c) => c.id !== e.from && c.id !== e.to),
      ...titleObst,
    ];
    const fromBox = compById.get(e.from);
    const toBox = compById.get(e.to);
    const wrapBoxes = obstaculos.filter((c) => !sourceSet.has(c.id));
    e.path = routeAvoidingBoxes(fromPt, toPt, obstaculos, rank, ranked.length, {
      fromSide, toSide, fromBox, toBox, clearance: EDGE_CLEARANCE, usedSegs, frame, wrapBoxes,
    }) ?? '';
    const pts = parsePathPoints(e.path);
    if (pts.length) usedSegs.push(...segsFromPath(pts));
  });

  const mustRelax = edges.some((e) => {
    const pts = parsePathPoints(e.path);
    return !e.path || pts.length < 2 || pathHasDiagonal(pts)
      || pathIllegal(pts, [...shiftedComps, ...titleObst], e.from, e.to, EDGE_CLEARANCE);
  });
  const relaxN = spec._relax ?? 0;
  if (mustRelax && relaxN < 3) {
    spec._relax = relaxN + 1;
    const b = spec._relax;
    const gaps = resolvePackingGaps(spec.layout ?? {});
    packDiagram(spec.packages, spec.components, spec.edges, {
      ...spec.layout,
      colGutter: gaps.colGutter + b * 8,
      pkgCorridor: gaps.pkgCorridor + b * 10,
      sourceGap: gaps.sourceGap + b * 8,
      rowGap: gaps.rowGap + b * 8,
    });
    return computeComponentLayout(spec);
  }

  layoutPackageOutlines(packages, components, { pad: 14, tabH: TAB_H + 4 });
  for (const p of packages) p.titleBox = packageTitleBox(p, components);

  const hit = (box, x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
  };
  const extent = () => {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const p of packages) {
      hit(box, p.x, p.y);
      hit(box, p.x + p.w + 4, p.y + p.h + 4);
      for (const q of p.outline ?? []) hit(box, q.x, q.y);
      if (p.titleBox) {
        hit(box, p.titleBox.x, p.titleBox.y);
        hit(box, p.titleBox.x + p.titleBox.w, p.titleBox.y + p.titleBox.h);
      }
    }
    for (const c of components) {
      hit(box, c.x, c.y);
      hit(box, c.x + c.w, c.y + c.h);
    }
    for (const i of interfaces) {
      hit(box, i.cx - LOLLI_R - 8, i.cy - LOLLI_R - 8);
      hit(box, i.cx + LOLLI_R + 8, i.cy + LOLLI_R + 8);
      if (i.name) {
        const lw = (i.name.length + 4) * 6;
        if (i.side === 'right') hit(box, i.cx + LOLLI_R + lw, i.cy);
        if (i.side === 'bottom') hit(box, i.cx, i.cy + LOLLI_R + 18);
      }
    }
    for (const e of edges) {
      hit(box, e.fromX, e.fromY);
      hit(box, e.toX, e.toY);
      for (const pt of parsePathPoints(e.path)) hit(box, pt.x, pt.y);
    }
    return box;
  };
  let box = extent();
  const dx = Number.isFinite(box.minX) ? Math.max(0, PAD - box.minX) : 0;
  const dy = Number.isFinite(box.minY) ? Math.max(0, titleH + subtitleH + PAD - box.minY) : 0;
  if (dx || dy) {
    for (const p of packages) {
      p.x += dx;
      p.y += dy;
      for (const q of p.outline ?? []) {
        q.x += dx;
        q.y += dy;
      }
    }
    for (const c of components) {
      c.x += dx;
      c.y += dy;
      if (c.stereoY != null) c.stereoY += dy;
      if (c.labelY != null) c.labelY += dy;
      if (c.itemsY != null) c.itemsY += dy;
      for (const b of c.itemBubbles ?? []) {
        b.x += dx;
        b.y += dy;
      }
    }
    for (const i of interfaces) {
      i.cx += dx;
      i.cy += dy;
    }
    for (const e of edges) {
      e.fromX += dx;
      e.fromY += dy;
      e.toX += dx;
      e.toY += dy;
      const pts = parsePathPoints(e.path);
      if (pts.length) {
        e.path = `M${pts[0].x + dx},${pts[0].y + dy} ` + pts.slice(1).map((pt) => `L${pt.x + dx},${pt.y + dy}`).join(' ');
      }
    }
    for (const p of packages) p.titleBox = packageTitleBox(p, components);
    box = extent();
  }
  for (const p of packages) p.titleBox = packageTitleBox(p, components);
  const maxX = Number.isFinite(box.maxX) ? box.maxX : 0;
  const maxY = Number.isFinite(box.maxY) ? box.maxY : 0;

  const width = Math.max(640, maxX + PAD, diagramHeaderWidth(spec.title, spec.subtitle));
  const height = Math.max(360, maxY + PAD);

  const layout = {
    width,
    height,
    title: spec.title,
    subtitle: spec.subtitle,
    titleY: 20,
    subtitleY: titleH ? 38 : 0,
    packages,
    components,
    interfaces,
    edges,
  };
  applyEdgeActorLayout(layout, [
    ...components.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })),
    ...packages.map((p) => {
      if (!p.titleBox) return null;
      const kids = components.filter((c) => c.package === p.id);
      const yClip = kids.length ? Math.min(...kids.map((c) => c.y)) - 8 : undefined;
      return inflateTitleObstacle(p.titleBox, TITLE_CLEARANCE, yClip);
    }).filter(Boolean),
  ], { glue: true, spread: false });
  return layout;
}

function nearestSidePoint(comp, target, reverse = false) {
  if (!target) return componentAnchorPoint(comp, 'right');
  const tx = target.x ?? target.cx ?? 0;
  const ty = target.y ?? target.cy ?? 0;
  const dx = tx - (comp.x + comp.w / 2);
  const dy = ty - (comp.y + comp.h / 2);
  if (reverse) {
    // Para "from", queremos el lado que mira al destino. Aquí solo se llama
    // desde el cálculo de toPt; los casos de fromInterface/fromComponent
    // se resuelven arriba.
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    return componentAnchorPoint(comp, dx >= 0 ? 'right' : 'left');
  }
  return componentAnchorPoint(comp, dy >= 0 ? 'bottom' : 'top');
}

export function packageTitleText(p) {
  return p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : String(p.name ?? '');
}

/** Ancho de tinta del título (cursiva 11px; 6.2 recortaba y las aristas lo cruzaban). */
export function packageTitleInkWidth(p: number) {
  return Math.max(TAB_W, packageTitleText(p).length * 7.4 + 24);
}

const OUTLINE_PAD = 14;
const OUTLINE_TAB = TAB_H + 4;

/** Caja del rótulo = pestaña del paquete. Las aristas la rodean. */
export function packageTitleBox(p, components = []) {
  const w = packageTitleInkWidth(p);
  const h = OUTLINE_TAB + 6;
  const kids = components.filter((c) => c.package === p.id);
  if (!kids.length) {
    return { id: `${p.id}::title`, x: p.x, y: p.y, w, h };
  }
  const x0 = Math.min(...kids.map((c) => c.x));
  const y0 = Math.min(...kids.map((c) => c.y));
  return {
    id: `${p.id}::title`,
    x: x0 - OUTLINE_PAD,
    y: y0 - OUTLINE_PAD - OUTLINE_TAB,
    w,
    h,
  };
}

/**
 * Ancho de la pestaña del paquete.
 *
 * Va con el nombre y no fijo: `min(56, w*0.4)` recortaba «Servicio» y
 * «Consulta» a media palabra. El título largo es obstáculo de aristas.
 */
export function packageTabWidth(p) {
  return packageTitleInkWidth(p);
}

const MAX_LINEAS = 3;

/**
 * Parte una etiqueta en las líneas que quepan dentro de `ancho`.
 *
 * Los componentes traen nombres reales («payload JSON por mensaje»,
 * «PR_TIPO_CONSULTAS, PR_EXTRACTOR…»), no identificadores de tres letras, y
 * el texto se pintaba en una sola línea centrada: se salía de la caja por los
 * dos lados y se montaba con el componente de al lado.
 *
 * Una palabra más larga que la caja se parte por caracteres —feo, pero
 * legible y dentro del marco, que es lo que no se puede negociar en un PNG
 * que va a la documentación oficial.
 */
export function wrapLabel(texto, ancho: number, fontPx: number = 11.5, maxLineas: number = MAX_LINEAS) {
  const porChar = fontPx * 0.58;
  const max = Math.max(4, Math.floor((ancho - 16) / porChar));
  const lineas = [];
  let actual = '';
  for (const palabra of String(texto ?? '').split(/\s+/).filter(Boolean)) {
    const cand = actual ? `${actual} ${palabra}` : palabra;
    if (cand.length <= max) { actual = cand; continue; }
    if (actual) { lineas.push(actual); actual = ''; }
    if (palabra.length > max) {
      let resto = palabra;
      while (resto.length > max) { lineas.push(resto.slice(0, max)); resto = resto.slice(max); }
      actual = resto;
    } else actual = palabra;
  }
  if (actual) lineas.push(actual);
  if (!lineas.length) return [''];
  if (lineas.length <= maxLineas) return lineas;
  const cortadas = lineas.slice(0, maxLineas);
  cortadas[maxLineas - 1] = `${cortadas[maxLineas - 1].slice(0, Math.max(1, max - 1))}…`;
  return cortadas;
}

/** Forma UML de paquete: unión ortogonal de hijos (ángulos rectos) o rectángulo. */
export function packageShapePath(p) {
  if (p.outline?.length >= 4) return outlineToPath(p.outline);
  const { x, y, w, h } = p;
  const tabW = packageTabWidth(p);
  const tabH = TAB_H;
  return `M${x + tabW},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} L${x},${y + tabH} L${x + tabW},${y + tabH} Z`;
}
