import assert from 'node:assert';
import { resolveMindmapSpec, computeMindmapLayout } from './mindmap-spec.js';

/**
 * Regresión: conectores ortogonales (nunca curvas) en ambos modos de layout,
 * y sin solapes de nodos ni de aristas diagonales.
 *
 * El modo `radial` usaba antes una curva Bézier cúbica ("C..."); ahora
 * comparte el mismo ruteo A* ortogonal que `tree` (única excepción
 * documentada del proyecto a las curvas orgánicas: ninguna, aquí ya no hay).
 */

function parsePathPoints(d) {
  const tokens = d.match(/[ML]\s*-?\d+(?:\.\d+)?[\s,]+-?\d+(?:\.\d+)?/g) || [];
  return tokens.map((t) => {
    const n = t.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return { x: n[0], y: n[1] };
  });
}

function assertOrthogonal(path, label) {
  assert.ok(!/[CQAcqa]/.test(path), `${label}: no debe contener comandos de curva (C/Q/A) — path: ${path}`);
  const pts = parsePathPoints(path);
  const distinct = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  for (let i = 1; i < distinct.length; i++) {
    const a = distinct[i - 1];
    const b = distinct[i];
    assert.ok(a.x === b.x || a.y === b.y, `${label}: segmento diagonal (${a.x},${a.y}) → (${b.x},${b.y})`);
  }
}

const PAYLOAD = {
  mindmap: {
    title: 'ContaPyme',
    nodes: [
      { id: 'root', label: 'ContaPyme' },
      { id: 'a', parent: 'root', label: 'Contabilidad' },
      { id: 'b', parent: 'root', label: 'Facturación electrónica y nómina' },
      { id: 'c', parent: 'root', label: 'Inventario' },
      { id: 'd', parent: 'root', label: 'Tesorería' },
      { id: 'a1', parent: 'a', label: 'Plan de cuentas' },
      { id: 'a2', parent: 'a', label: 'Cierre mensual' },
      { id: 'b1', parent: 'b', label: 'CUFE y DIAN' },
    ],
  },
};

for (const layout of ['radial', 'tree']) {
  const payload = { mindmap: { ...PAYLOAD.mindmap, layout } };
  const spec = resolveMindmapSpec(payload);
  const L = computeMindmapLayout(spec);
  assert.ok(L.edges.length > 0, `${layout}: debe generar aristas`);
  for (const e of L.edges) assertOrthogonal(e.path, `${layout} ${e.from}->${e.to}`);
  for (const n of L.nodes) {
    assert.ok(n.x >= 0 && n.x + n.w <= L.width, `${layout}: nodo ${n.id} dentro del ancho`);
    assert.ok(n.y >= 0 && n.y + n.h <= L.height, `${layout}: nodo ${n.id} dentro del alto`);
  }
  // Sin solapes entre nodos de ramas distintas.
  for (let i = 0; i < L.nodes.length; i++) {
    for (let j = i + 1; j < L.nodes.length; j++) {
      const a = L.nodes[i];
      const b = L.nodes[j];
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      assert.ok(!overlap, `${layout}: nodos ${a.id} y ${b.id} se solapan`);
    }
  }
}

// Ciclo en `parent` (dato de usuario corrupto) no debe colgar el layout.
{
  const cyclic = {
    mindmap: {
      nodes: [
        { id: 'a', parent: 'b', label: 'A' },
        { id: 'b', parent: 'a', label: 'B' },
      ],
    },
  };
  const spec = resolveMindmapSpec(cyclic);
  const L = computeMindmapLayout(spec);
  assert.ok(L.nodes.length >= 2, 'un ciclo en parent debe resolverse, no colgar');
}

console.log('mindmap self-check: PASS');
