/**
 * Motor de layout puro (sin DOM, sin globals) para jerarquías: árbol de
 * parentesco (mindmap, tree), radial (mindmap) y treemap (squarify).
 * Mismo estilo que `node-link-layout.js`: entrada/salida en objetos planos,
 * snap a 8px salvo cuando rompe el teselado exacto (squarify).
 */

/** Redondea al múltiplo de 8px más cercano (misma rejilla que node-link-layout). */
function snap8(v) {
  return Math.round(v / 8) * 8;
}

/**
 * Arma un árbol a partir de un array plano `[{id, parent, ...}]`.
 * Tolera: múltiples raíces (se envuelven en una raíz sintética `__root__`),
 * un `parent` que no existe (el nodo se vuelve raíz) y ciclos de parentesco
 * (se cortan por el primer back-edge detectado — nunca entra en loop infinito).
 * @param {Array<{id:string|number, parent?:string|number}>} nodes
 * @returns {{id:string, children:Array}} raíz (real o sintética)
 */
export function buildTree(nodes) {
  const map = new Map();
  for (const raw of nodes ?? []) {
    const id = String(raw.id);
    map.set(id, { ...raw, id, children: [] });
  }

  // Resuelve el padre "efectivo" de cada nodo con DFS coloreado (blanco/gris/negro),
  // igual que assignLayers en node-link-layout: un back-edge (padre en curso, gris)
  // es un ciclo y se corta ahí, tratando al nodo como raíz.
  const color = new Map();
  for (const id of map.keys()) color.set(id, 0);
  const effectiveParent = new Map();

  function resolveParent(id) {
    if (color.get(id) === 2) return effectiveParent.get(id);
    color.set(id, 1);
    const node = map.get(id);
    const rawParent = node.parent != null ? String(node.parent) : null;
    let parentId = rawParent && rawParent !== id && map.has(rawParent) ? rawParent : null;
    if (parentId && color.get(parentId) === 1) {
      // back-edge: cerraría un ciclo -> se descarta, este nodo pasa a ser raíz.
      parentId = null;
    } else if (parentId) {
      resolveParent(parentId);
    }
    effectiveParent.set(id, parentId);
    color.set(id, 2);
    return parentId;
  }
  for (const id of map.keys()) resolveParent(id);

  const roots = [];
  for (const [id, node] of map) {
    const p = effectiveParent.get(id);
    if (p) map.get(p).children.push(node);
    else roots.push(node);
  }

  if (roots.length === 1) return roots[0];
  return { id: '__root__', synthetic: true, children: roots };
}

/* ───────────────────────── layoutTree (tidy tree) ───────────────────────── */

const DEFAULT_MEASURE = () => ({ w: 80, h: 32 });

/** Construye la lista plana de entradas de layout (depth, tamaño medido, hijos). */
function flattenForLayout(root, measure) {
  const entries = [];
  const visited = new Set();
  function build(node, depth) {
    if (visited.has(node)) return null; // defensivo: nunca debería ocurrir en un árbol
    visited.add(node);
    const size = measure ? measure(node) : DEFAULT_MEASURE();
    const entry = { id: node.id, depth, w: size.w, h: size.h, children: [] };
    entries.push(entry);
    for (const c of node.children || []) {
      const ce = build(c, depth + 1);
      if (ce) entry.children.push(ce);
    }
    return entry;
  }
  const rootEntry = build(root, 0);
  return { entries, rootEntry };
}

/**
 * Layout de árbol "tidy" (estilo Reingold–Tilford simplificado): reserva por
 * subárbol el máximo entre su propio tamaño y la suma de sus hijos, así los
 * hermanos nunca se solapan aunque el nodo padre sea más grande que sus hijos.
 * @param {{id:string, children:Array}} root
 * @param {{direction?:'LR'|'RL'|'TB'|'BT', levelGap?:number, siblingGap?:number, measure?:Function}} [opts]
 * @returns {{nodes:Array<{id:string,x:number,y:number,w:number,h:number,depth:number}>, width:number, height:number}}
 */
export function layoutTree(root, opts = {}) {
  const { direction = 'LR', levelGap = 56, siblingGap = 16, measure } = opts;
  const swapAxes = direction === 'LR' || direction === 'RL';
  const mirrorMain = direction === 'BT' || direction === 'RL';

  const { entries, rootEntry } = flattenForLayout(root, measure);
  if (!rootEntry) return { nodes: [], width: 0, height: 0 };

  const mainSize = (e) => (swapAxes ? e.w : e.h);
  const crossSize = (e) => (swapAxes ? e.h : e.w);

  const maxDepth = entries.reduce((m, e) => Math.max(m, e.depth), 0);
  const depthMain = new Array(maxDepth + 1).fill(0);
  for (const e of entries) depthMain[e.depth] = Math.max(depthMain[e.depth], mainSize(e));
  const depthOffset = new Array(maxDepth + 1).fill(0);
  let cursor = 0;
  for (let d = 0; d <= maxDepth; d++) {
    depthOffset[d] = cursor;
    cursor += depthMain[d] + levelGap;
  }
  const totalMain = Math.max(0, cursor - levelGap);

  // Reserva por subárbol (extent): el mayor entre el tamaño propio y la suma
  // de las reservas de los hijos (+ huecos). Garantiza que ningún hermano,
  // ni sus descendientes, se solape con otro aunque el padre sea "gordo".
  function computeExtent(entry) {
    if (!entry.children.length) {
      entry.childrenExtent = 0;
      entry.extent = crossSize(entry);
      return entry.extent;
    }
    let sum = 0;
    entry.children.forEach((c, i) => {
      sum += computeExtent(c);
      if (i > 0) sum += siblingGap;
    });
    entry.childrenExtent = sum;
    entry.extent = Math.max(crossSize(entry), sum);
    return entry.extent;
  }
  computeExtent(rootEntry);

  function assignPositions(entry, offset) {
    if (!entry.children.length) {
      entry.crossStart = offset + (entry.extent - crossSize(entry)) / 2;
      return;
    }
    const childrenStart = offset + (entry.extent - entry.childrenExtent) / 2;
    let childCursor = childrenStart;
    for (const c of entry.children) {
      assignPositions(c, childCursor);
      childCursor += c.extent + siblingGap;
    }
    const first = entry.children[0];
    const last = entry.children[entry.children.length - 1];
    const firstCenter = first.crossStart + crossSize(first) / 2;
    const lastCenter = last.crossStart + crossSize(last) / 2;
    entry.crossStart = (firstCenter + lastCenter) / 2 - crossSize(entry) / 2;
  }
  assignPositions(rootEntry, 0);

  const outNodes = entries.map((e) => {
    const mainStart = depthOffset[e.depth];
    let x;
    let y;
    if (!swapAxes) { x = e.crossStart; y = mainStart; } else { x = mainStart; y = e.crossStart; }
    return { id: e.id, x, y, w: e.w, h: e.h, depth: e.depth };
  });

  if (mirrorMain) {
    for (const n of outNodes) {
      if (!swapAxes) n.y = totalMain - n.y - n.h;
      else n.x = totalMain - n.x - n.w;
    }
  }

  // Normaliza a coordenadas no negativas (el centrado de padres puede desplazar
  // ligeramente hacia negativos cuando un nodo hoja es más chico que su padre).
  let minX = 0;
  let minY = 0;
  for (const n of outNodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
  }
  if (minX < 0 || minY < 0) {
    for (const n of outNodes) { n.x -= minX; n.y -= minY; }
  }

  for (const n of outNodes) { n.x = snap8(n.x); n.y = snap8(n.y); }

  let width = 0;
  let height = 0;
  for (const n of outNodes) {
    width = Math.max(width, n.x + n.w);
    height = Math.max(height, n.y + n.h);
  }

  return { nodes: outNodes, width, height };
}

/* ───────────────────────── layoutRadialTree ───────────────────────── */

/**
 * Layout radial: anillos concéntricos por profundidad, ángulo repartido
 * proporcional a la cantidad de hojas de cada subárbol (como un dendrograma
 * circular). Ideal para mindmaps.
 * @param {{id:string, children:Array}} root
 * @param {{radiusStep?:number, measure?:Function}} [opts]
 * @returns {{nodes:Array<{id:string,x:number,y:number,w:number,h:number,depth:number}>, width:number, height:number, cx:number, cy:number}}
 */
export function layoutRadialTree(root, opts = {}) {
  const { radiusStep = 90, measure } = opts;
  const { entries, rootEntry } = flattenForLayout(root, measure);
  if (!rootEntry) return { nodes: [], width: 0, height: 0, cx: 0, cy: 0 };

  function countLeaves(entry) {
    if (!entry.children.length) { entry.leaves = 1; return 1; }
    entry.leaves = entry.children.reduce((s, c) => s + countLeaves(c), 0);
    return entry.leaves;
  }
  countLeaves(rootEntry);

  function assignAngle(entry, a0, a1) {
    if (!entry.children.length) {
      entry.angle = (a0 + a1) / 2;
      return;
    }
    let cur = a0;
    const span = a1 - a0;
    for (const c of entry.children) {
      const share = (c.leaves / entry.leaves) * span;
      assignAngle(c, cur, cur + share);
      cur += share;
    }
    const first = entry.children[0].angle;
    const last = entry.children[entry.children.length - 1].angle;
    entry.angle = (first + last) / 2;
  }
  assignAngle(rootEntry, 0, Math.PI * 2);

  const maxDepth = entries.reduce((m, e) => Math.max(m, e.depth), 0);

  // Radio por profundidad, calculado anillo por anillo: un radio fijo
  // (depth * radiusStep) ignora el tamaño real de las etiquetas — un anillo
  // con texto largo puede chocar contra el anterior, y la asignación angular
  // (proporcional a hojas, no a ancho tangencial) puede dejar dos hermanos
  // encimados en el mismo anillo. Cada anillo parte de radiusStep + la mitad
  // del nodo más grande del anillo anterior y de sí mismo, y si aun así se
  // solapa entre sí, crece hasta que no.
  const byDepth = new Map();
  for (const e of entries) {
    if (!byDepth.has(e.depth)) byDepth.set(e.depth, []);
    byDepth.get(e.depth).push(e);
  }

  function maxHalfExtent(ring) {
    return ring.reduce((m, e) => Math.max(m, Math.max(e.w, e.h) / 2), 0);
  }

  function ringOverlapsAt(ring, r) {
    const boxes = ring.map((e) => ({
      x: r * Math.cos(e.angle) - e.w / 2, y: r * Math.sin(e.angle) - e.h / 2, w: e.w, h: e.h,
    }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) return true;
      }
    }
    return false;
  }

  const radiusAtDepth = [0];
  for (let d = 1; d <= maxDepth; d++) {
    const ring = byDepth.get(d) ?? [];
    const prevHalf = maxHalfExtent(byDepth.get(d - 1) ?? []);
    const curHalf = maxHalfExtent(ring);
    let r = radiusAtDepth[d - 1] + radiusStep + prevHalf + curHalf;
    let guard = 0;
    while (ringOverlapsAt(ring, r) && guard < 32) {
      r += radiusStep / 2;
      guard += 1;
    }
    radiusAtDepth[d] = r;
  }

  const cx = Math.max(radiusStep, radiusAtDepth[maxDepth] + 60);
  const cy = cx;

  const outNodes = entries.map((e) => {
    const r = radiusAtDepth[e.depth];
    const x = snap8(cx + r * Math.cos(e.angle) - e.w / 2);
    const y = snap8(cy + r * Math.sin(e.angle) - e.h / 2);
    return { id: e.id, x, y, w: e.w, h: e.h, depth: e.depth };
  });

  return { nodes: outNodes, width: cx * 2, height: cy * 2, cx, cy };
}

/* ───────────────────────── squarify (treemap) ───────────────────────── */

/** Peor aspect-ratio (más alejado de 1) de una fila candidata. Bruls/Huizing/van Wijk. */
function worst(rowAreas, rowSum, shortSide) {
  const rowMax = Math.max(...rowAreas);
  const rowMin = Math.min(...rowAreas);
  const s2 = rowSum * rowSum;
  const w2 = shortSide * shortSide;
  return Math.max((w2 * rowMax) / s2, s2 / (w2 * rowMin));
}

/**
 * Treemap "squarified" (Bruls/Huizing/van Wijk): tesela exactamente la caja
 * dada con rectángulos de aspect-ratio cercano a 1. `items` deben venir
 * ordenados descendente por `value` (se re-ordenan igual por seguridad).
 * @param {Array<{id:string|number, value:number}>} items
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @returns {Array<{id, value, x:number, y:number, w:number, h:number}>}
 */
export function squarify(items, x, y, w, h) {
  const sorted = [...(items ?? [])]
    .filter((it) => Number(it.value) > 0)
    .sort((a, b) => b.value - a.value);
  if (!sorted.length || w <= 0 || h <= 0) return [];

  const total = sorted.reduce((s, it) => s + it.value, 0);
  const scale = (w * h) / total;
  let remaining = sorted.map((item) => ({ item, area: item.value * scale }));

  const results = [];
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;

  while (remaining.length) {
    const shortSide = Math.min(rw, rh);
    let row = [remaining[0]];
    let rowSum = remaining[0].area;
    let i = 1;
    while (i < remaining.length) {
      const candidate = remaining[i];
      const nextSum = rowSum + candidate.area;
      const currentWorst = worst(row.map((r) => r.area), rowSum, shortSide);
      const nextWorst = worst([...row.map((r) => r.area), candidate.area], nextSum, shortSide);
      if (nextWorst <= currentWorst) {
        row.push(candidate);
        rowSum = nextSum;
        i++;
      } else {
        break;
      }
    }

    const rowLen = rowSum / shortSide;
    if (rw >= rh) {
      // Fila = columna vertical de ancho `rowLen`, apilada dentro de la altura rh.
      let cy = ry;
      for (const r of row) {
        const itemH = r.area / rowLen;
        results.push({ ...r.item, x: rx, y: cy, w: rowLen, h: itemH });
        cy += itemH;
      }
      rx += rowLen;
      rw -= rowLen;
    } else {
      // Fila = banda horizontal de alto `rowLen`, apilada dentro del ancho rw.
      let cx = rx;
      for (const r of row) {
        const itemW = r.area / rowLen;
        results.push({ ...r.item, x: cx, y: ry, w: itemW, h: rowLen });
        cx += itemW;
      }
      ry += rowLen;
      rh -= rowLen;
    }
    remaining = remaining.slice(row.length);
  }

  return results;
}
