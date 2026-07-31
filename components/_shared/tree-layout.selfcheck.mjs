// Self-check plano (node:assert) para tree-layout.js. Sin framework.
import assert from 'node:assert';
import { buildTree, layoutTree, layoutRadialTree, squarify } from './tree-layout.js';

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// 1) buildTree: ciclo de parentesco DEBE terminar (regresión crítica) y no perder nodos.
{
  const nodes = [
    { id: 'a', parent: 'c' },
    { id: 'b', parent: 'a' },
    { id: 'c', parent: 'b' },
  ];
  const root = buildTree(nodes);
  let count = 0;
  (function walk(n) { count++; for (const c of n.children) walk(c); })(root);
  assert.strictEqual(count, 3, 'el ciclo debe resolverse sin perder ni duplicar nodos');
}

// 2) buildTree: parent inexistente se trata como raíz.
{
  const nodes = [
    { id: 'x', parent: 'no-existe' },
    { id: 'y', parent: 'x' },
  ];
  const root = buildTree(nodes);
  assert.strictEqual(root.id, 'x');
  assert.strictEqual(root.children.length, 1);
  assert.strictEqual(root.children[0].id, 'y');
}

// 3) buildTree: múltiples raíces se envuelven en una raíz sintética.
{
  const nodes = [{ id: 'r1' }, { id: 'r2' }, { id: 'c1', parent: 'r1' }];
  const root = buildTree(nodes);
  assert.strictEqual(root.synthetic, true);
  assert.strictEqual(root.children.length, 2);
}

// 4) layoutTree: árbol de 3 niveles — los hijos quedan más profundos que su
//    padre en el eje principal (LR -> x), y ningún par de nodos se solapa.
{
  const nodes = [
    { id: 'root' },
    { id: 'a', parent: 'root' },
    { id: 'b', parent: 'root' },
    { id: 'a1', parent: 'a' },
    { id: 'a2', parent: 'a' },
    { id: 'a3', parent: 'a' },
    { id: 'b1', parent: 'b' },
  ];
  const root = buildTree(nodes);
  const { nodes: out } = layoutTree(root, { direction: 'LR', measure: () => ({ w: 100, h: 32 }) });
  const byId = Object.fromEntries(out.map((n) => [n.id, n]));

  assert.ok(byId.a.x > byId.root.x, 'a debe estar más a la derecha que root');
  assert.ok(byId.a1.x > byId.a.x, 'a1 debe estar más a la derecha que a');
  assert.ok(byId.b.x > byId.root.x, 'b debe estar más a la derecha que root');

  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      assert.ok(!rectsOverlap(out[i], out[j]), `${out[i].id} y ${out[j].id} se solapan`);
    }
  }
}

// 5) layoutRadialTree: los nodos de una misma profundidad son equidistantes al centro.
{
  const nodes = [
    { id: 'root' },
    { id: 'a', parent: 'root' },
    { id: 'b', parent: 'root' },
    { id: 'c', parent: 'root' },
    { id: 'a1', parent: 'a' },
    { id: 'b1', parent: 'b' },
  ];
  const root = buildTree(nodes);
  const { nodes: out, cx, cy } = layoutRadialTree(root, { radiusStep: 90, measure: () => ({ w: 40, h: 20 }) });
  const byDepth = new Map();
  for (const n of out) {
    const cx2 = n.x + n.w / 2;
    const cy2 = n.y + n.h / 2;
    const dist = Math.hypot(cx2 - cx, cy2 - cy);
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
    byDepth.get(n.depth).push(dist);
  }
  for (const [depth, dists] of byDepth) {
    if (depth === 0) continue;
    const first = dists[0];
    for (const d of dists) assert.ok(Math.abs(d - first) < 6, `profundidad ${depth}: distancias distintas (${dists})`);
  }
}

// 5b) layoutRadialTree: con etiquetas anchas y desiguales, ningún par de
//     nodos de la MISMA profundidad debe solaparse (bug real: un radio fijo
//     por profundidad ignoraba el ancho del texto y la asignación angular,
//     proporcional a cantidad de hojas, dejaba hermanos encimados).
{
  const labels = ['Contabilidad', 'RH', 'Facturación electrónica y nómina', 'Compras', 'Inventario', 'Tesorería', 'Impuestos', 'Reportes gerenciales'];
  const nodes = [{ id: 'root' }, ...labels.map((label, i) => ({ id: `n${i}`, parent: 'root', label }))];
  const root = buildTree(nodes);
  const measure = (n) => ({ w: Math.max(40, (n.label ?? '').length * 7 + 20), h: 24 });
  const { nodes: out } = layoutRadialTree(root, { radiusStep: 70, measure });
  const ring = out.filter((n) => n.depth === 1);
  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 1; j < ring.length; j++) {
      const a = ring[i];
      const b = ring[j];
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      assert.ok(!overlap, `nodos radiales ${a.id} y ${b.id} se solapan`);
    }
  }
}

// 6) squarify: los rectángulos producidos teselan EXACTAMENTE la caja de entrada
//    (suma de áreas == área de la caja) y ninguno se sale de los límites.
{
  const items = [
    { id: 'a', value: 3200 },
    { id: 'b', value: 1800 },
    { id: 'c', value: 900 },
    { id: 'd', value: 620 },
    { id: 'e', value: 480 },
    { id: 'f', value: 300 },
  ];
  const box = { x: 20, y: 30, w: 640, h: 360 };
  const rects = squarify(items, box.x, box.y, box.w, box.h);
  assert.strictEqual(rects.length, items.length);

  let areaSum = 0;
  let aspectSum = 0;
  for (const r of rects) {
    areaSum += r.w * r.h;
    assert.ok(r.x >= box.x - 1e-6 && r.x + r.w <= box.x + box.w + 1e-6, `rect ${r.id} se sale en x`);
    assert.ok(r.y >= box.y - 1e-6 && r.y + r.h <= box.y + box.h + 1e-6, `rect ${r.id} se sale en y`);
    const ratio = Math.max(r.w / r.h, r.h / r.w);
    aspectSum += ratio;
  }
  assert.ok(Math.abs(areaSum - box.w * box.h) < 1e-6, `área total no cuadra: ${areaSum} vs ${box.w * box.h}`);
  assert.ok(aspectSum / rects.length < 3, `aspect ratio promedio demasiado alargado: ${aspectSum / rects.length}`);
}

// 7) squarify: caso degenerado (un solo item) llena toda la caja sin romperse.
{
  const rects = squarify([{ id: 'only', value: 10 }], 0, 0, 100, 50);
  assert.strictEqual(rects.length, 1);
  assert.ok(Math.abs(rects[0].w * rects[0].h - 5000) < 1e-6);
}

console.log('tree-layout self-check: PASS');
