/**
 * Motor de layout puro (sin DOM, sin globals) para diagramas de nodos y
 * enlaces (flowchart, class, state, ER, C4, architecture, block).
 * Implementa un pipeline estilo Sugiyama: capas -> orden -> coordenadas px.
 * No importa diagram-grid.js a propósito: este módulo debe ser
 * dependency-free para poder testearse con Node puro.
 */

/** Redondea al múltiplo de 8px más cercano (misma rejilla que el resto de los diagramas). */
function snap8(v) {
  return Math.round(v / 8) * 8;
}

/**
 * Asigna una capa (nivel jerárquico) a cada nodo mediante longest-path.
 * Tolera ciclos: primero rompe back-edges con una DFS (visited / en-pila),
 * y luego capa el DAG resultante. Nunca entra en loop infinito.
 * @param {Array<{id:string}>} nodes
 * @param {Array<{from:string,to:string}>} edges
 * @returns {Map<string, number>} id -> layer
 */
export function assignLayers(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  const adj = new Map();
  for (const id of ids) adj.set(id, []);
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) continue;
    adj.get(e.from).push(e.to);
  }

  // 1) Detectar y descartar back-edges vía DFS (WHITE/GRAY/BLACK).
  const color = new Map();
  for (const id of ids) color.set(id, 0); // 0=blanco, 1=gris, 2=negro
  const dagAdj = new Map();
  for (const id of ids) dagAdj.set(id, []);

  function dfs(u) {
    color.set(u, 1);
    for (const v of adj.get(u)) {
      if (color.get(v) === 1) {
        // back-edge (incluye self-loop): se descarta para el cálculo de capas
        continue;
      }
      dagAdj.get(u).push(v);
      if (color.get(v) === 0) dfs(v);
    }
    color.set(u, 2);
  }
  for (const id of ids) {
    if (color.get(id) === 0) dfs(id);
  }

  // 2) Longest-path layering sobre el DAG (sin back-edges), iterativo.
  const layer = new Map();
  for (const id of ids) layer.set(id, 0);
  const preds = new Map();
  for (const id of ids) preds.set(id, []);
  for (const [u, list] of dagAdj) {
    for (const v of list) preds.get(v).push(u);
  }

  // Relajación iterativa acotada: como el grafo (dagAdj) es acíclico, converge
  // en a lo sumo |V| pasadas. El límite explícito evita cualquier loop infinito.
  const maxPasses = ids.size + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const id of ids) {
      const ps = preds.get(id);
      if (ps.length === 0) continue;
      let maxPred = -1;
      for (const p of ps) maxPred = Math.max(maxPred, layer.get(p));
      const next = maxPred + 1;
      if (next !== layer.get(id)) {
        layer.set(id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return layer;
}

/**
 * Ordena los nodos dentro de cada capa con el heurístico de baricentro para
 * reducir cruces de aristas. Alterna barridos hacia abajo y hacia arriba.
 * @param {Map<string, number>} layersMap
 * @param {Array<{id:string}>} nodes
 * @param {Array<{from:string,to:string}>} edges
 * @param {number} sweeps
 * @returns {Map<string, number>} id -> índice de orden dentro de su capa
 */
export function orderLayers(layersMap, nodes, edges, sweeps = 4) {
  const byLayer = new Map();
  for (const n of nodes) {
    const l = layersMap.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(n.id);
  }
  const maxLayer = byLayer.size ? Math.max(...byLayer.keys()) : 0;

  const order = new Map();
  for (const [, ids] of byLayer) {
    ids.forEach((id, i) => order.set(id, i));
  }

  const neighborsDown = new Map(); // id -> ids en la capa siguiente (mayor)
  const neighborsUp = new Map(); // id -> ids en la capa anterior (menor)
  for (const n of nodes) {
    neighborsDown.set(n.id, []);
    neighborsUp.set(n.id, []);
  }
  for (const e of edges) {
    if (!neighborsDown.has(e.from) || !neighborsDown.has(e.to)) continue;
    const lf = layersMap.get(e.from) ?? 0;
    const lt = layersMap.get(e.to) ?? 0;
    if (lt > lf) {
      neighborsDown.get(e.from).push(e.to);
      neighborsUp.get(e.to).push(e.from);
    } else if (lf > lt) {
      neighborsDown.get(e.to).push(e.from);
      neighborsUp.get(e.from).push(e.to);
    }
    // aristas dentro de la misma capa (o self-loops) no afectan el orden.
  }

  function barycenter(id, neighborMap) {
    const ns = neighborMap.get(id);
    if (!ns || ns.length === 0) return null;
    let sum = 0;
    for (const nb of ns) sum += order.get(nb) ?? 0;
    return sum / ns.length;
  }

  function sortLayer(layerIdx, neighborMap) {
    const ids = byLayer.get(layerIdx);
    if (!ids) return;
    const withBc = ids.map((id, i) => ({ id, i, bc: barycenter(id, neighborMap) }));
    withBc.sort((a, b) => {
      if (a.bc === null && b.bc === null) return a.i - b.i;
      if (a.bc === null) return 1;
      if (b.bc === null) return -1;
      if (a.bc !== b.bc) return a.bc - b.bc;
      return a.i - b.i; // estable
    });
    withBc.forEach((entry, idx) => {
      order.set(entry.id, idx);
    });
    byLayer.set(layerIdx, withBc.map((e) => e.id));
  }

  for (let s = 0; s < sweeps; s++) {
    if (s % 2 === 0) {
      // barrido hacia abajo: reordena cada capa usando vecinos de la capa anterior
      for (let l = 0; l <= maxLayer; l++) sortLayer(l, neighborsUp);
    } else {
      // barrido hacia arriba: reordena cada capa usando vecinos de la capa siguiente
      for (let l = maxLayer; l >= 0; l--) sortLayer(l, neighborsDown);
    }
  }

  return order;
}

/**
 * Punto de conexión (midpoint) de un lado del nodo.
 * @param {{x:number,y:number,w:number,h:number}} node
 * @param {'top'|'bottom'|'left'|'right'} side
 * @returns {{x:number,y:number}}
 */
export function edgeAnchor(node, side) {
  // El punto medio de un lado cae a menudo fuera de la rejilla de 8px (la
  // mitad de una altura no múltiplo de 16 no es múltiplo de 8). Sin este snap,
  // el primer tramo ruteado —que sí vive en la rejilla— arranca en un punto
  // distinto al de este ancla, y la línea "M ancla ... L primer punto" queda
  // en diagonal en vez de horizontal/vertical: el "torcido" que se ve en ER.
  switch (side) {
    case 'top':
      return { x: snap8(node.x + node.w / 2), y: node.y };
    case 'bottom':
      return { x: snap8(node.x + node.w / 2), y: node.y + node.h };
    case 'left':
      return { x: node.x, y: snap8(node.y + node.h / 2) };
    case 'right':
    default:
      return { x: node.x + node.w, y: snap8(node.y + node.h / 2) };
  }
}

/**
 * Elige los lados de anclaje más sensatos entre dos nodos según la dirección
 * del layout. Para aristas hacia atrás (o mismo nivel / self-loop) rutea por
 * los costados (right -> right / bottom -> bottom) en vez de atravesar el nodo.
 * @param {{layer:number}} fromNode
 * @param {{layer:number}} toNode
 * @param {'TB'|'BT'|'LR'|'RL'} direction
 * @returns {{fromSide:string, toSide:string}}
 */
export function pickSides(fromNode, toNode, direction) {
  const isBack = toNode.layer <= fromNode.layer;

  if (direction === 'TB') {
    return isBack ? { fromSide: 'right', toSide: 'right' } : { fromSide: 'bottom', toSide: 'top' };
  }
  if (direction === 'BT') {
    return isBack ? { fromSide: 'right', toSide: 'right' } : { fromSide: 'top', toSide: 'bottom' };
  }
  if (direction === 'LR') {
    return isBack ? { fromSide: 'bottom', toSide: 'bottom' } : { fromSide: 'right', toSide: 'left' };
  }
  // RL
  return isBack ? { fromSide: 'bottom', toSide: 'bottom' } : { fromSide: 'left', toSide: 'right' };
}

/**
 * Calcula el layout completo: capas, orden y coordenadas en píxeles.
 * @param {Array<{id:string,w:number,h:number}>} nodes
 * @param {Array<{from:string,to:string}>} edges
 * @param {{direction?:'TB'|'BT'|'LR'|'RL', layerGap?:number, nodeGap?:number, align?:'center'|'start'}} [opts]
 * @returns {{nodes:Array<{id:string,x:number,y:number,w:number,h:number,layer:number,order:number}>, width:number, height:number, layers:Map<string,number>}}
 */
export function layoutNodeLink(nodes, edges, opts = {}) {
  const { direction = 'TB', layerGap = 64, nodeGap = 28, align = 'center' } = opts;
  const swapAxes = direction === 'LR' || direction === 'RL';
  const mirrorMain = direction === 'BT' || direction === 'RL';

  const layers = assignLayers(nodes, edges);
  const order = orderLayers(layers, nodes, edges);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byLayer = new Map();
  for (const n of nodes) {
    const l = layers.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(n.id);
  }
  for (const [, ids] of byLayer) {
    ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }

  const maxLayer = byLayer.size ? Math.max(...byLayer.keys()) : 0;

  // Extensión en el eje cruzado (ancho para TB/BT, alto para LR/RL) y tamaño
  // principal (alto para TB/BT, ancho para LR/RL) de cada nodo, según eje.
  function crossSize(n) {
    return swapAxes ? n.h : n.w;
  }
  function mainSize(n) {
    return swapAxes ? n.w : n.h;
  }

  // Extensión cruzada total de cada capa (para centrar/alinear) y overall.
  const layerCrossExtent = new Map();
  let overallCrossExtent = 0;
  for (const [l, ids] of byLayer) {
    const nodesInLayer = ids.map((id) => byId.get(id));
    const total =
      nodesInLayer.reduce((acc, n) => acc + crossSize(n), 0) +
      nodeGap * Math.max(0, nodesInLayer.length - 1);
    layerCrossExtent.set(l, total);
    overallCrossExtent = Math.max(overallCrossExtent, total);
  }

  // Tamaño principal (grosor) de cada capa = el nodo más "grueso" de la capa.
  const layerMainSize = new Map();
  for (const [l, ids] of byLayer) {
    const nodesInLayer = ids.map((id) => byId.get(id));
    layerMainSize.set(l, Math.max(0, ...nodesInLayer.map((n) => mainSize(n))));
  }

  // Offset principal acumulado (posición inicial de cada capa a lo largo del eje principal).
  const layerMainOffset = new Map();
  let mainCursor = 0;
  for (let l = 0; l <= maxLayer; l++) {
    layerMainOffset.set(l, mainCursor);
    mainCursor += (layerMainSize.get(l) ?? 0) + layerGap;
  }
  const totalMain = mainCursor > 0 ? mainCursor - layerGap : 0;

  const positioned = [];
  for (const [l, ids] of byLayer) {
    const crossExtent = layerCrossExtent.get(l) ?? 0;
    const startCross = align === 'start' ? 0 : (overallCrossExtent - crossExtent) / 2;
    let crossCursor = startCross;
    const mainStart = layerMainOffset.get(l) ?? 0;
    ids.forEach((id, idx) => {
      const n = byId.get(id);
      const cross = crossCursor;
      crossCursor += crossSize(n) + nodeGap;
      positioned.push({
        id,
        layer: l,
        order: idx,
        crossPos: cross,
        mainPos: mainStart,
        w: n.w,
        h: n.h,
      });
    });
  }

  const outNodes = positioned.map((p) => {
    let x;
    let y;
    if (!swapAxes) {
      x = p.crossPos;
      y = p.mainPos;
    } else {
      x = p.mainPos;
      y = p.crossPos;
    }
    return { id: p.id, x, y, w: p.w, h: p.h, layer: p.layer, order: p.order };
  });

  // Mirroring para BT/RL: invierte la coordenada principal.
  if (mirrorMain) {
    for (const n of outNodes) {
      if (!swapAxes) {
        n.y = totalMain - n.y - n.h;
      } else {
        n.x = totalMain - n.x - n.w;
      }
    }
  }

  // Snap a rejilla de 8px.
  for (const n of outNodes) {
    n.x = snap8(n.x);
    n.y = snap8(n.y);
  }

  let width = 0;
  let height = 0;
  for (const n of outNodes) {
    width = Math.max(width, n.x + n.w);
    height = Math.max(height, n.y + n.h);
  }

  return { nodes: outNodes, width, height, layers };
}
