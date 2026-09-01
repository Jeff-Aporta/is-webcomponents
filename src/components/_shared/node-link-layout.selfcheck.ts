// Self-check plano (node:assert) para node-link-layout.js. Sin framework.
import assert from 'node:assert';
import {
  assignLayers,
  orderLayers,
  layoutNodeLink,
  edgeAnchor,
  pickSides,
} from './node-link-layout.js';

function isMultipleOf8(v: number) {
  return v % 8 === 0;
}

// 1) Cadena simple a->b->c, TB: layers 0,1,2 y y estrictamente creciente.
{
  const nodes = [
    { id: 'a', w: 100, h: 40 },
    { id: 'b', w: 100, h: 40 },
    { id: 'c', w: 100, h: 40 },
  ];
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ];
  const layers = assignLayers(nodes, edges);
  assert.strictEqual(layers.get('a'), 0);
  assert.strictEqual(layers.get('b'), 1);
  assert.strictEqual(layers.get('c'), 2);

  const { nodes: out } = layoutNodeLink(nodes, edges, { direction: 'TB' });
  const byId = Object.fromEntries(out.map((n) => [n.id, n]));
  assert.ok(byId.a.y < byId.b.y);
  assert.ok(byId.b.y < byId.c.y);
}

// 2) Direction LR en el mismo grafo: x estrictamente creciente, y igual.
{
  const nodes = [
    { id: 'a', w: 100, h: 40 },
    { id: 'b', w: 100, h: 40 },
    { id: 'c', w: 100, h: 40 },
  ];
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ];
  const { nodes: out } = layoutNodeLink(nodes, edges, { direction: 'LR' });
  const byId = Object.fromEntries(out.map((n) => [n.id, n]));
  assert.ok(byId.a.x < byId.b.x);
  assert.ok(byId.b.x < byId.c.x);
  assert.strictEqual(byId.a.y, byId.b.y);
  assert.strictEqual(byId.b.y, byId.c.y);
}

// 3) Ciclo a->b->c->a: DEBE terminar y devolver 3 nodos.
{
  const nodes = [
    { id: 'a', w: 100, h: 40 },
    { id: 'b', w: 100, h: 40 },
    { id: 'c', w: 100, h: 40 },
  ];
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'c', to: 'a' },
  ];
  const result = layoutNodeLink(nodes, edges, { direction: 'TB' });
  assert.strictEqual(result.nodes.length, 3);
}

// 4) Diamante a->b, a->c, b->d, c->d: b y c mismo layer, distinto x; d en layer 2.
{
  const nodes = [
    { id: 'a', w: 100, h: 40 },
    { id: 'b', w: 100, h: 40 },
    { id: 'c', w: 100, h: 40 },
    { id: 'd', w: 100, h: 40 },
  ];
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
    { from: 'b', to: 'd' },
    { from: 'c', to: 'd' },
  ];
  const layers = assignLayers(nodes, edges);
  assert.strictEqual(layers.get('a'), 0);
  assert.strictEqual(layers.get('b'), 1);
  assert.strictEqual(layers.get('c'), 1);
  assert.strictEqual(layers.get('d'), 2);

  const { nodes: out } = layoutNodeLink(nodes, edges, { direction: 'TB' });
  const byId = Object.fromEntries(out.map((n) => [n.id, n]));
  assert.strictEqual(byId.b.y, byId.c.y);
  assert.notStrictEqual(byId.b.x, byId.c.x);
}

// 5) Dos nodos desconectados: ambos en layer 0.
{
  const nodes = [
    { id: 'x', w: 80, h: 30 },
    { id: 'y', w: 80, h: 30 },
  ];
  const layers = assignLayers(nodes, []);
  assert.strictEqual(layers.get('x'), 0);
  assert.strictEqual(layers.get('y'), 0);
}

// 6) Todas las coordenadas devueltas son múltiplos de 8.
{
  const nodes = [
    { id: 'a', w: 97, h: 41 },
    { id: 'b', w: 103, h: 37 },
    { id: 'c', w: 90, h: 45 },
  ];
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
  ];
  const { nodes: out } = layoutNodeLink(nodes, edges, { direction: 'TB' });
  for (const n of out) {
    assert.ok(isMultipleOf8(n.x), `x de ${n.id} no es múltiplo de 8: ${n.x}`);
    assert.ok(isMultipleOf8(n.y), `y de ${n.id} no es múltiplo de 8: ${n.y}`);
  }
}

// 7) width/height son >= a la extensión de los nodos colocados.
{
  const nodes = [
    { id: 'a', w: 100, h: 40 },
    { id: 'b', w: 120, h: 50 },
    { id: 'c', w: 90, h: 30 },
  ];
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
  ];
  const { nodes: out, width, height } = layoutNodeLink(nodes, edges, { direction: 'TB' });
  for (const n of out) {
    assert.ok(n.x + n.w <= width, `nodo ${n.id} excede el width`);
    assert.ok(n.y + n.h <= height, `nodo ${n.id} excede el height`);
  }
}

// 8) edgeAnchor devuelve el punto medio de cada lado, snapeado a 8px en el eje
//    cruzado (top/bottom snapean x, left/right snapean y) para que el primer
//    tramo ruteado —que sí vive en la rejilla— nunca arranque en diagonal.
{
  const node = { x: 10, y: 20, w: 100, h: 50 };
  const top = edgeAnchor(node, 'top');
  const bottom = edgeAnchor(node, 'bottom');
  const left = edgeAnchor(node, 'left');
  const right = edgeAnchor(node, 'right');

  assert.ok(isMultipleOf8(top.x), 'top.x debe estar en la rejilla de 8px');
  assert.strictEqual(top.y, node.y);
  assert.ok(isMultipleOf8(bottom.x), 'bottom.x debe estar en la rejilla de 8px');
  assert.strictEqual(bottom.y, node.y + node.h);
  assert.strictEqual(top.x, bottom.x);

  assert.strictEqual(left.x, node.x);
  assert.ok(isMultipleOf8(left.y), 'left.y debe estar en la rejilla de 8px');
  assert.strictEqual(right.x, node.x + node.w);
  assert.ok(isMultipleOf8(right.y), 'right.y debe estar en la rejilla de 8px');
  assert.strictEqual(left.y, right.y);

  // El snap nunca se aleja más de medio paso (4px) del punto medio real.
  assert.ok(Math.abs(top.x - (node.x + node.w / 2)) <= 4);
  assert.ok(Math.abs(left.y - (node.y + node.h / 2)) <= 4);
}

// Extra: pickSides sanity (no exigido explícitamente pero cubre la firma).
{
  const forward = pickSides({ layer: 0 }, { layer: 1 }, 'TB');
  assert.deepStrictEqual(forward, { fromSide: 'bottom', toSide: 'top' });
  const back = pickSides({ layer: 2 }, { layer: 0 }, 'TB');
  assert.deepStrictEqual(back, { fromSide: 'right', toSide: 'right' });
}

console.log('node-link-layout self-check: PASS');
