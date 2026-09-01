/**
 * Comprobación mínima (node:assert) para er-spec.js y block-spec.js.
 * No depende de DOM: solo geometría pura.
 */
import assert from 'node:assert';
import { resolveErSpec, computeErLayout } from './er-spec.js';
import { computeBlockGrid, resolveBlockSpec, computeBlockLayout } from './block-spec.js';

/* ───────────────────────── ER ───────────────────────── */

const erPayload = {
  erDiagram: {
    title: 'Facturación',
    direction: 'LR',
    groups: [{ id: 'g1', name: 'Facturación', hue: 199 }],
    entities: [
      {
        id: 'FACTURA', name: 'FACTURA', group: 'g1',
        attributes: [
          { name: 'id', type: 'int', key: 'PK' },
          { name: 'cliente_id', type: 'int', key: 'FK' },
          { name: 'fecha', type: 'date' },
          { name: 'total', type: 'decimal' },
          { name: 'estado', type: 'varchar' },
        ],
      },
      { id: 'CLIENTE', name: 'CLIENTE', attributes: [{ name: 'id', type: 'int', key: 'PK' }] },
      { id: 'ITEM', name: 'ITEM', attributes: [{ name: 'id', type: 'int', key: 'PK' }] },
      { id: 'PRODUCTO', name: 'PRODUCTO', attributes: [{ name: 'id', type: 'int', key: 'PK' }] },
    ],
    relations: [
      { from: 'FACTURA', to: 'CLIENTE', label: 'pertenece a', fromCard: 'many', toCard: 'one', identifying: true },
      { from: 'FACTURA', to: 'ITEM', label: 'contiene', fromCard: 'one', toCard: 'many', identifying: true },
      { from: 'ITEM', to: 'PRODUCTO', label: 'referencia', fromCard: 'zeroOrOne', toCard: 'zeroOrMany', identifying: false },
      { from: 'CLIENTE', to: 'PRODUCTO', label: 'fantasma', fromCard: 'one', toCard: 'many', identifying: true },
      // Relación colgante: debe descartarse silenciosamente.
      { from: 'FACTURA', to: 'NOEXISTE', label: 'no debería sobrevivir' },
    ],
  },
};

const erSpec = resolveErSpec(erPayload);
assert.ok(erSpec, 'erSpec no debe ser null');
assert.strictEqual(erSpec.relations.length, 4, 'la relación colgante debe descartarse');

const erLayout = computeErLayout(erSpec);

// Todas las cajas caen dentro del lienzo.
for (const e of erLayout.entities) {
  assert.ok(e.x >= 0 && e.y >= 0, `entidad ${e.id} fuera del lienzo (x/y negativos)`);
  assert.ok(e.x + e.w <= erLayout.width, `entidad ${e.id} se sale del ancho del lienzo`);
  assert.ok(e.y + e.h <= erLayout.height, `entidad ${e.id} se sale del alto del lienzo`);
}

// Toda relación tiene un path que arranca con 'M'.
for (const r of erLayout.relations) {
  assert.ok(r.path.startsWith('M'), `path de relación ${r.id} no arranca con M`);
}

// Entidad con 5 atributos es más alta que una con 1.
const factura = erLayout.entities.find((e) => e.id === 'FACTURA');
const cliente = erLayout.entities.find((e) => e.id === 'CLIENTE');
assert.ok(factura.h > cliente.h, 'FACTURA (5 attrs) debe ser más alta que CLIENTE (1 attr)');

const legendPayload = {
  erDiagram: {
    title: 'Errores · Marcar como atendidos · tablas',
    direction: 'LR',
    groups: [{ id: 'g1', name: 'Facturación electrónica', hue: 210 }],
    entities: [
      {
        id: 'E',
        name: 'patyia_errores',
        group: 'g1',
        attributes: [{ name: 'ierror', type: 'text', key: 'PK' }],
      },
    ],
    relations: [],
  },
};
const legendLayout = computeErLayout(resolveErSpec(legendPayload));
const legendEntity = legendLayout.entities[0];
assert.ok(
  legendLayout.legendX >= legendEntity.x + legendEntity.w + 8,
  'la leyenda debe quedar a la derecha del contenido, sin solaparse',
);
assert.ok(
  legendLayout.titleLines?.length >= 2,
  'títulos largos deben partirse en varias líneas',
);

console.log('er self-check: OK');

/* ───────────────────────── Block ───────────────────────── */

// computeBlockGrid: columns=3, spans [1,1,1,2,1].
// Empaquetado voraz (izq->der, wrap cuando no cabe):
//   fila0: b0(1) b1(1) b2(1)  → llena las 3 columnas
//   fila1: b3(2) b4(1)        → llena las 3 columnas
// Total: 2 filas (6 columnas-unidad / 3 columnas por fila = 2 filas exactas).
const spanBlocks = [1, 1, 1, 2, 1].map((span, i) => ({ id: `b${i}`, span }));
const grid = computeBlockGrid(spanBlocks, 3);
const rowCount = Math.max(...grid.map((p) => p.row)) + 1;
assert.strictEqual(rowCount, 2, 'con spans [1,1,1,2,1] y columns=3 el empaquetado voraz da 2 filas');

// Ningún par de bloques en la misma fila se superpone horizontalmente.
for (let i = 0; i < grid.length; i++) {
  for (let j = i + 1; j < grid.length; j++) {
    const a = grid[i];
    const b = grid[j];
    if (a.row !== b.row) continue;
    const overlap = a.col < b.col + b.span && b.col < a.col + a.span;
    assert.ok(!overlap, `bloques ${a.id} y ${b.id} se superponen en la fila ${a.row}`);
  }
}

// Payload completo → layout con coordenadas en px, span:2 ~ 2x el ancho de span:1.
const blockPayload = {
  blockDiagram: {
    title: 'Arquitectura',
    columns: 3,
    groups: [{ id: 'g1', name: 'Frontend', hue: 239 }],
    blocks: [
      { id: 'ui', label: 'Portal web', group: 'g1', span: 2, icon: 'mdi:monitor' },
      { id: 'api', label: 'API', span: 1 },
      { id: 'db', label: 'BD', span: 1 },
      { id: 'cache', label: 'Cache', span: 1 },
      { id: 'ghost', label: 'Colgante', span: 1 },
    ],
    edges: [
      { from: 'ui', to: 'api', label: 'HTTPS' },
      { from: 'api', to: 'db' },
      // Arista colgante: debe descartarse silenciosamente.
      { from: 'api', to: 'noexiste' },
    ],
  },
};

const blockSpec = resolveBlockSpec(blockPayload);
assert.ok(blockSpec, 'blockSpec no debe ser null');
assert.strictEqual(blockSpec.edges.length, 2, 'la arista colgante debe descartarse');

const blockLayout = computeBlockLayout(blockSpec);
const ui = blockLayout.blocks.find((b) => b.id === 'ui'); // span 2
const api = blockLayout.blocks.find((b) => b.id === 'api'); // span 1
assert.ok(Math.abs(ui.w - api.w * 2) <= api.w * 0.35, `span:2 (${ui.w}) debe ser ~2x span:1 (${api.w})`);

// Todas las coordenadas/dimensiones son múltiplos de 8.
const GRID = 8;
for (const b of blockLayout.blocks) {
  for (const v of [b.x, b.y, b.w, b.h]) {
    assert.strictEqual(v % GRID, 0, `coordenada ${v} de bloque ${b.id} no es múltiplo de 8`);
  }
}

for (const e of blockLayout.edges) {
  assert.ok(e.path.startsWith('M'), `path de arista ${e.id} no arranca con M`);
}

console.log('er/block self-check: PASS');
