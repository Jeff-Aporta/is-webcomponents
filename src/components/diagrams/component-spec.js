/**
 * Especificación y layout de diagramas de componentes UML (sin Mermaid).
 *
 * A diferencia de flowchart/block, este modo tiene tres primitivas:
 *   - packages: carpetas con pestaña (tab) arriba a la izquierda.
 *   - components: rectángulos con estereotipo `<<name>>` sobre la etiqueta.
 *   - interfaces (lollipop): circulo sobre una arista corta perpendicular al
 *     lado del componente (provided = circulo lleno, required = semicírculo).
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

const TAB_W = 56;
const TAB_H = 14;
const STEREO_GAP = 4;
const LOLLI_R = 7;

function asRecord(v) { return v && typeof v === 'object' ? v : {}; }

function readPackage(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `pkg-${i}`),
    name: String(r.name ?? r.id ?? `Paquete ${i + 1}`),
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
    name: String(r.name ?? r.id ?? `Componente ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    package: String(r.package ?? '') || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Math.max(72, Number(r.w ?? 160)),
    h: Math.max(36, Number(r.h ?? 56)),
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
    from: String(r.from ?? ''),
    to: String(r.to ?? ''),
    fromInterface: String(r.fromInterface ?? '') || undefined,
    toInterface: String(r.toInterface ?? '') || undefined,
    label: String(r.label ?? '').trim() || undefined,
    kind: ['dependency', 'association', 'realization'].includes(kind) ? kind : 'dependency',
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
  const edges = (Array.isArray(src.edges) ? src.edges : []).map(readEdge);

  const known = new Set(components.map((c) => c.id));
  const knownIf = new Set(interfaces.map((i) => i.id));

  // Filtra aristas que apuntan a componentes o interfaces inexistentes.
  const safeEdges = edges.filter((e) => {
    const fromOk = known.has(e.from) || knownIf.has(e.from) || knownIf.has(e.fromInterface);
    const toOk = known.has(e.to) || knownIf.has(e.to) || knownIf.has(e.toInterface);
    return fromOk && toOk;
  });

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    packages,
    components,
    interfaces,
    edges: safeEdges,
  };
}

function interfaceAnchor(iface, comp) {
  // El lollipop asoma perpendicular al lado del componente; el extremo de la
  // arista cae justo en el círculo. Calculamos el centro del círculo.
  let cx, cy;
  switch (iface.side) {
    case 'top':
      cx = comp.x + iface.offset; cy = comp.y - 14;
      break;
    case 'bottom':
      cx = comp.x + iface.offset; cy = comp.y + comp.h + 14;
      break;
    case 'left':
      cx = comp.x - 14; cy = comp.y + iface.offset;
      break;
    case 'right':
    default:
      cx = comp.x + comp.w + 14; cy = comp.y + iface.offset;
      break;
  }
  return { cx, cy };
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

  const compById = new Map(spec.components.map((c) => [c.id, c]));

  const components = spec.components.map((c) => ({
    ...c,
    stereoY: c.y + (c.stereotype ? 14 : 0),
    labelY: c.y + c.h / 2 + (c.stereotype ? 5 : 4),
  }));

  const interfaces = spec.interfaces.map((iface) => {
    const comp = compById.get(iface.component);
    const { cx, cy } = comp ? interfaceAnchor(iface, comp) : { cx: 0, cy: 0 };
    return { ...iface, cx, cy };
  });

  // Importante: este mapa se rellena DESPUÉS de calcular cx/cy de cada interfaz;
  // si se construye sobre `spec.interfaces` (sin geometría), las aristas caen a
  // (0, 0) y desaparecen del render sin error visible.
  const ifaceById = new Map(interfaces.map((i) => [i.id, i]));

  const edges = spec.edges.map((e) => {
    // Resuelve el punto de origen: interface (lollipop) o componente (borde).
    let fromPt = null;
    if (e.fromInterface && ifaceById.has(e.fromInterface)) {
      fromPt = { x: ifaceById.get(e.fromInterface).cx, y: ifaceById.get(e.fromInterface).cy };
    } else if (ifaceById.has(e.from)) {
      fromPt = { x: ifaceById.get(e.from).cx, y: ifaceById.get(e.from).cy };
    } else if (compById.has(e.from)) {
      // Elige el lado del componente más cercano al destino.
      fromPt = nearestSidePoint(compById.get(e.from), e.toInterface
        ? ifaceById.get(e.toInterface)
        : (compById.get(e.to) ? nearestSidePoint(compById.get(e.to), compById.get(e.from), true) : null));
    }

    let toPt = null;
    if (e.toInterface && ifaceById.has(e.toInterface)) {
      toPt = { x: ifaceById.get(e.toInterface).cx, y: ifaceById.get(e.toInterface).cy };
    } else if (ifaceById.has(e.to)) {
      toPt = { x: ifaceById.get(e.to).cx, y: ifaceById.get(e.to).cy };
    } else if (compById.has(e.to)) {
      toPt = nearestSidePoint(compById.get(e.to), fromPt);
    }

    return {
      ...e,
      fromX: fromPt?.x ?? 0, fromY: fromPt?.y ?? 0,
      toX: toPt?.x ?? 0, toY: toPt?.y ?? 0,
      path: fromPt && toPt ? buildEdgePath(fromPt, toPt) : '',
    };
  });

  // Tamaño total: bounding box de packages + padding + cabecera.
  let maxX = 0, maxY = 0;
  for (const p of spec.packages) { maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); }
  for (const c of spec.components) { maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); }

  const width = Math.max(640, maxX + PAD * 2, diagramHeaderWidth(spec.title, spec.subtitle));
  const height = Math.max(360, titleH + subtitleH + maxY + PAD * 2);

  return {
    width,
    height,
    title: spec.title,
    subtitle: spec.subtitle,
    titleY: 20,
    subtitleY: titleH ? 38 : 0,
    packages: spec.packages,
    components,
    interfaces,
    edges,
  };
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

/** Traza una polilínea ortogonal simple: sale recto del origen y gira 1 vez
 *  hacia el destino. Suficiente para los diagramas de arquitectura donde los
 *  paquetes están alineados en filas/columnas; el router A* completo no aporta
 *  valor mientras el author siga un layout de cuadrícula.
 */
function buildEdgePath(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return `M${from.x},${from.y} L${to.x},${to.y}`;
  if (Math.abs(dx) < 1) return `M${from.x},${from.y} L${to.x},${to.y}`;
  if (Math.abs(dy) < 1) return `M${from.x},${from.y} L${to.x},${to.y}`;
  // L-shape: sal horizontal, luego vertical.
  return `M${from.x},${from.y} L${(from.x + to.x) / 2},${from.y} L${(from.x + to.x) / 2},${to.y} L${to.x},${to.y}`;
}

/** Forma UML de paquete: rectángulo grande con pestaña arriba a la izquierda. */
export function packageShapePath(p) {
  const { x, y, w, h } = p;
  const tabW = Math.min(TAB_W, w * 0.4);
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
