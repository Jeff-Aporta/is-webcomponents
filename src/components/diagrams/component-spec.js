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
 * Las posiciones son EXPLICITAS: el usuario declara x/y/w/h de cada package y
 * cada component, igual que en composicion/diagrama-secuencia.html. Esto
 * replica el flujo de trabajo de PlantUML/Structurizr, donde el diagrama es
 * un mapa mental del sistema, no un grafo que el motor dibuja.
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

const TAB_W = 56;
const TAB_H = 14;
const STEREO_GAP = 4;
/** Radio del lollipop / socket. Visible en PNG a tamaño ficha. */
export const LOLLI_R = 8;
/** Distancia del borde del componente al centro del círculo. */
export const LOLLI_STEM = 22;

function asList(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v).trim()].filter(Boolean);
}

function asRecord(v) { return v && typeof v === 'object' ? v : {}; }

function readPackage(raw, i) {
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

function readComponent(raw, i) {
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
    kind: ['dependency', 'association', 'realization', 'assembly'].includes(kind) ? kind : 'dependency',
  };
}

/** payload → spec normalizada, o null si no hay componentes. */
export function resolveComponentSpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.componentDiagram ?? p);
  const rawComponents = src.components ?? [];
  if (!Array.isArray(rawComponents) || !rawComponents.length) return null;

  const packages = (Array.isArray(src.packages) ? src.packages : []).map(readPackage);
  const components = rawComponents.map(readComponent);
  const interfaces = (Array.isArray(src.interfaces) ? src.interfaces : []).map(readInterface);
  // `links` / `connections` / `relations`: el resto del kit y los LLM
  // usan esas claves; si solo se acepta `edges` el PNG sale sin aristas.
  const rawEdges = src.edges ?? src.links ?? src.connections ?? src.relations;
  const edges = (Array.isArray(rawEdges) ? rawEdges : []).map(readEdge);

  const wired = wireComponentDiagram(components, interfaces, edges);

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    packages,
    components: wired.components,
    interfaces: wired.interfaces,
    edges: wired.edges,
  };
}

function facingSide(from, to) {
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

function oppositeSide(side) {
  if (side === 'right') return 'left';
  if (side === 'left') return 'right';
  if (side === 'top') return 'bottom';
  return 'top';
}

function sideOffset(comp, side, index, total) {
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

  const slots = new Map();
  const slotKey = (compId, side) => `${compId}:${side}`;
  const takeSlot = (comp, side) => {
    const k = slotKey(comp.id, side);
    const n = slots.get(k) ?? 0;
    slots.set(k, n + 1);
    return n;
  };
  const countSlots = new Map();
  for (const e of outEdges) {
    const fromC = byId.get(e.from);
    const toC = byId.get(e.to);
    if (!fromC || !toC) continue;
    if (e.fromInterface || e.toInterface || knownIf.has(e.from) || knownIf.has(e.to)) continue;
    const fs = facingSide(fromC, toC);
    const ts = oppositeSide(fs);
    countSlots.set(slotKey(fromC.id, fs), (countSlots.get(slotKey(fromC.id, fs)) ?? 0) + 1);
    countSlots.set(slotKey(toC.id, ts), (countSlots.get(slotKey(toC.id, ts)) ?? 0) + 1);
  }

  for (const e of outEdges) {
    const fromC = byId.get(e.from);
    const toC = byId.get(e.to);
    if (!fromC || !toC) continue;
    if (e.fromInterface || e.toInterface || knownIf.has(e.from) || knownIf.has(e.to)) continue;
    const fs = facingSide(fromC, toC);
    const ts = oppositeSide(fs);
    const fi = takeSlot(fromC, fs);
    const ti = takeSlot(toC, ts);
    const req = addIface({
      id: `if-${e.id}-req`,
      component: fromC.id,
      kind: 'required',
      side: fs,
      offset: sideOffset(fromC, fs, fi, countSlots.get(slotKey(fromC.id, fs)) || 1),
      // Sin nombre a propósito. El par de lollipops que se genera aquí no es
      // una interfaz con identidad —solo el conector UML de una arista sin
      // `provides`/`requires` declarados—, y ponerle `e.label` imprimía el
      // mismo texto tres veces: en el lollipop de salida, en el de entrada y
      // en el chip de la arista. El chip ya lo dice una vez.
    });
    const prv = addIface({
      id: `if-${e.id}-prv`,
      component: toC.id,
      kind: 'provided',
      side: ts,
      offset: sideOffset(toC, ts, ti, countSlots.get(slotKey(toC.id, ts)) || 1),
    });
    // Los dos lollipops del par tienen que caer en la MISMA vertical (o la
    // misma horizontal). Cada offset se calcula contra su propia caja, así
    // que con anchos distintos —`local.settings.json` de 160 contra
    // `PR_GENERAL…` de 200— el centro de una no coincide con el de la otra y
    // el conector `-(O-` sale partido en dos trozos sueltos.
    //
    // Solo cuando cada lado lleva un único conector: con varios hay que
    // repartirlos, y ahí manda el reparto de slots.
    const unoSolo = (countSlots.get(slotKey(fromC.id, fs)) || 1) === 1
      && (countSlots.get(slotKey(toC.id, ts)) || 1) === 1;
    if (unoSolo) {
      const horizontal = fs === 'top' || fs === 'bottom';
      const desde = horizontal ? [fromC.x, fromC.x + fromC.w] : [fromC.y, fromC.y + fromC.h];
      const hasta = horizontal ? [toC.x, toC.x + toC.w] : [toC.y, toC.y + toC.h];
      const a = Math.max(desde[0], hasta[0]);
      const b = Math.min(desde[1], hasta[1]);
      if (b > a) {
        const centro = (a + b) / 2;
        req.offset = centro - (horizontal ? fromC.x : fromC.y);
        prv.offset = centro - (horizontal ? toC.x : toC.y);
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

/** Punto de la arista: borde exterior del O / abertura de la C, no el centro. */
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
    const itemLines = (c.items ?? []).flatMap((s) => wrapLabel(s, c.w, 9, 1));
    const topLibre = c.y + (c.stereotype ? 16 : 0);
    // Con inventario (endpoints) el nombre ancla arriba; si no, se centra.
    const bloqueH = lines.length * LINE_H + (itemLines.length ? 6 + itemLines.length * ITEM_H : 0);
    const centro = topLibre + (c.y + c.h - topLibre) / 2;
    const labelY = itemLines.length
      ? topLibre + 12
      : centro - ((lines.length - 1) * LINE_H) / 2 + 4;
    return {
      ...c,
      stereoY: c.y + (c.stereotype ? 14 : 0),
      lines,
      itemLines,
      itemsY: labelY + (lines.length - 1) * LINE_H + 12,
      itemLineHeight: ITEM_H,
      labelY,
      lineHeight: LINE_H,
      bloqueH,
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

  const pointOf = (iface) => iface ? ifaceOuterPoint(iface) : null;

  const edges = spec.edges.map((e) => {
    let fromPt = null;
    if (e.fromInterface && ifaceById.has(e.fromInterface)) {
      fromPt = pointOf(ifaceById.get(e.fromInterface));
    } else if (ifaceById.has(e.from)) {
      fromPt = pointOf(ifaceById.get(e.from));
    } else if (compById.has(e.from)) {
      fromPt = nearestSidePoint(compById.get(e.from), e.toInterface
        ? ifaceById.get(e.toInterface)
        : (compById.get(e.to) ? nearestSidePoint(compById.get(e.to), compById.get(e.from), true) : null));
    }

    let toPt = null;
    if (e.toInterface && ifaceById.has(e.toInterface)) {
      toPt = pointOf(ifaceById.get(e.toInterface));
    } else if (ifaceById.has(e.to)) {
      toPt = pointOf(ifaceById.get(e.to));
    } else if (compById.has(e.to)) {
      toPt = nearestSidePoint(compById.get(e.to), fromPt);
    }

    const obstaculos = shiftedComps.filter((c) => c.id !== e.from && c.id !== e.to);
    return {
      ...e,
      fromX: fromPt?.x ?? 0, fromY: fromPt?.y ?? 0,
      toX: toPt?.x ?? 0, toY: toPt?.y ?? 0,
      path: fromPt && toPt ? buildEdgePath(fromPt, toPt, obstaculos) : '',
    };
  });

  let maxX = 0;
  let maxY = 0;
  for (const p of packages) { maxX = Math.max(maxX, p.x + p.w + 4); maxY = Math.max(maxY, p.y + p.h + 4); }
  for (const c of components) { maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); }
  for (const i of interfaces) {
    maxX = Math.max(maxX, i.cx + LOLLI_R + 8);
    maxY = Math.max(maxY, i.cy + LOLLI_R + 8);
    if (i.name) {
      const lw = (i.name.length + 4) * 6;
      if (i.side === 'right') maxX = Math.max(maxX, i.cx + LOLLI_R + lw);
      if (i.side === 'left') { /* ya entra por ox */ }
      if (i.side === 'bottom') maxY = Math.max(maxY, i.cy + LOLLI_R + 18);
      if (i.side === 'top') { /* ya entra por oy */ }
    }
  }
  for (const e of edges) {
    maxX = Math.max(maxX, e.fromX, e.toX);
    maxY = Math.max(maxY, e.fromY, e.toY);
  }

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
  applyEdgeActorLayout(layout, components.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })));
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

/** ¿El segmento recto (horizontal o vertical) corta la caja? */
function segmentoCortaCaja(x1, y1, x2, y2, c) {
  const M = 6; // margen: rozar el borde ya se lee como "la atraviesa"
  const [xa, xb] = x1 <= x2 ? [x1, x2] : [x2, x1];
  const [ya, yb] = y1 <= y2 ? [y1, y2] : [y2, y1];
  return xa <= c.x + c.w + M && xb >= c.x - M && ya <= c.y + c.h + M && yb >= c.y - M;
}

/** ¿Alguna caja ajena se cruza en la polilínea? */
function rutaChoca(puntos, obstaculos) {
  for (let i = 0; i < puntos.length - 1; i++) {
    const [a, b] = [puntos[i], puntos[i + 1]];
    for (const c of obstaculos) {
      if (segmentoCortaCaja(a.x, a.y, b.x, b.y, c)) return true;
    }
  }
  return false;
}

const comoPath = (pts) => `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(' ');

/**
 * Traza una polilínea ortogonal que no atraviese componentes ajenos.
 *
 * Antes salía siempre por el punto medio en X. En un layout de tres columnas
 * eso basta casi siempre, pero cuando origen y destino comparten fila y hay
 * una caja en medio —`Azure Functions → Canal SignalR` con `payload` entre
 * los dos— la recta pasaba por encima de esa caja y el diagrama mostraba una
 * conexión que no existe.
 *
 * No es un router A*: se prueban unas pocas rutas candidatas en orden de
 * preferencia y gana la primera limpia. Con diagramas de cuadrícula —que es
 * para lo que está pensado este motor— sobra, y si ninguna sirve se cae a la
 * de siempre en vez de inventar un trazado peor.
 */
function buildEdgePath(from, to, obstaculos = []) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const recto = [from, to];
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    if (!rutaChoca(recto, obstaculos)) return comoPath(recto);
    // Comparten fila (o columna) con algo en medio: se rodea por un carril
    // desplazado, por arriba o por abajo, el que quede libre antes.
    const alineadoEnY = Math.abs(dy) < 1;
    for (const d of [-46, 46, -78, 78, -112, 112]) {
      const ruta = alineadoEnY
        ? [from, { x: from.x + Math.sign(dx || 1) * 26, y: from.y },
           { x: from.x + Math.sign(dx || 1) * 26, y: from.y + d },
           { x: to.x - Math.sign(dx || 1) * 26, y: to.y + d },
           { x: to.x - Math.sign(dx || 1) * 26, y: to.y }, to]
        : [from, { x: from.x + d, y: from.y },
           { x: from.x + d, y: to.y }, to];
      if (!rutaChoca(ruta, obstaculos)) return comoPath(ruta);
    }
    return comoPath(recto);
  }

  const candidatas = [
    // L por el punto medio en X (la de siempre).
    [from, { x: (from.x + to.x) / 2, y: from.y }, { x: (from.x + to.x) / 2, y: to.y }, to],
    // L por el punto medio en Y.
    [from, { x: from.x, y: (from.y + to.y) / 2 }, { x: to.x, y: (from.y + to.y) / 2 }, to],
    // Salir del origen y girar pegado al destino, y su simétrica.
    [from, { x: to.x, y: from.y }, to],
    [from, { x: from.x, y: to.y }, to],
  ];
  for (const ruta of candidatas) {
    if (!rutaChoca(ruta, obstaculos)) return comoPath(ruta);
  }
  return comoPath(candidatas[0]);
}

/**
 * Ancho de la pestaña del paquete.
 *
 * Va con el nombre y no fijo: `min(56, w*0.4)` recortaba «Servicio» y
 * «Consulta» a media palabra, y el diagrama pasaba a identificar sus paquetes
 * por un rótulo cortado. El techo sigue existiendo (75% del cuerpo) para que
 * la pestaña no se coma la caja entera.
 */
export function packageTabWidth(p) {
  const texto = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : String(p.name ?? '');
  return Math.max(TAB_W, Math.min(texto.length * 6.2 + 18, p.w * 0.75));
}

const LINE_H = 13;
const ITEM_H = 11;
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
export function wrapLabel(texto, ancho, fontPx = 11.5, maxLineas = MAX_LINEAS) {
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

/** Forma UML de paquete: rectángulo grande con pestaña arriba a la izquierda. */
export function packageShapePath(p) {
  const { x, y, w, h } = p;
  const tabW = packageTabWidth(p);
  const tabH = TAB_H;
  return `M${x + tabW},${y}
          L${x + w},${y} Q${x + w + 4},${y} ${x + w + 4},${y + 4}
          L${x + w + 4},${y + h} Q${x + w + 4},${y + h + 4} ${x + w},${y + h + 4}
          L${x + 4},${y + h + 4} Q${x},${y + h + 4} ${x},${y + h}
          L${x},${y + tabH}
          L${x + tabW},${y + tabH}
          Q${x + tabW + 4},${y + tabH} ${x + tabW + 4},${y + tabH - 4}
          L${x + tabW + 4},${y + 4} Q${x + tabW + 4},${y} ${x + tabW},${y} Z`;
}
