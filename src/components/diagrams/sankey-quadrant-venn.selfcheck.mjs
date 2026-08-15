import assert from 'node:assert';
import { resolveSankeySpec, computeSankeyLayout } from './sankey-spec.js';
import { resolveQuadrantSpec, computeQuadrantLayout } from './quadrant-spec.js';
import { resolveVennSpec, computeVennLayout } from './venn-spec.js';

/**
 * Invariantes de los tres diagramas de magnitud/posición.
 *
 * Lo que se protege aquí es lo que hace que el dibujo NO mienta:
 *   - Sankey: el grosor de las bandas de un nodo suma su altura (conservación).
 *   - Quadrant: las coordenadas se recortan y el eje Y crece hacia arriba.
 *   - Venn: dos o tres conjuntos, nunca uno ni cuatro.
 */

/* ── Sankey ── */

const sankeySpec = resolveSankeySpec({
  sankey: {
    title: 'Reparto',
    unit: 'min',
    nodes: [
      { id: 'total', label: 'Total' },
      { id: 'a', label: 'Redacción' },
      { id: 'b', label: 'Código' },
      { id: 'fin', label: 'Cierre' },
    ],
    links: [
      { from: 'total', to: 'a', value: 30 },
      { from: 'total', to: 'b', value: 10 },
      { from: 'a', to: 'fin', value: 12 },
      { from: 'b', to: 'fin', value: 4 },
      { from: 'a', to: 'b', value: 0 },      // sin grosor: se descarta
      { from: 'x', to: 'fin', value: 5 },    // nodo no declarado: se crea solo
    ],
  },
});

assert.ok(sankeySpec, 'sankey: el spec no debe ser null con enlaces válidos');
assert.ok(!sankeySpec.links.some((l) => l.value <= 0), 'sankey: un enlace sin valor positivo no es un enlace');
assert.ok(sankeySpec.nodes.some((n) => n.id === 'x'), 'sankey: un nodo citado solo en un enlace debe crearse');

const sankeyLayout = computeSankeyLayout(sankeySpec, { height: 320 });
const byId = new Map(sankeyLayout.nodes.map((n) => [n.id, n]));

for (const nodo of sankeyLayout.nodes) {
  const sale = sankeyLayout.links.filter((l) => l.from === nodo.id).reduce((a, l) => a + l.thickness, 0);
  const entra = sankeyLayout.links.filter((l) => l.to === nodo.id).reduce((a, l) => a + l.thickness, 0);
  const alto = nodo.h;
  const mayor = Math.max(sale, entra);
  assert.ok(mayor <= alto + 0.5,
    `sankey: las bandas de "${nodo.id}" (${mayor.toFixed(1)}) no caben en su alto (${alto.toFixed(1)})`);
}

assert.ok(byId.get('a').x > byId.get('total').x, 'sankey: un destino va siempre a la derecha de su origen');
assert.ok(byId.get('fin').x > byId.get('a').x, 'sankey: la capa del cierre debe ser la última');
// La etiqueta va siempre a la derecha del nodo: a la izquierda se montaba
// encima de las cintas de entrada (defecto visto en un PNG real).
for (const nodo of sankeyLayout.nodes) {
  assert.equal(nodo.labelSide, 'right', `sankey: "${nodo.id}" rotula a la izquierda y pisaría las cintas`);
  assert.ok(nodo.x + nodo.w + 8 < sankeyLayout.width,
    `sankey: la etiqueta de "${nodo.id}" no cabe en el lienzo`);
}
// Y el diagrama ocupa el ancho: la última capa no puede quedarse a media calle.
const derecha = Math.max(...sankeyLayout.nodes.map((n) => n.x + n.w));
assert.ok(derecha > sankeyLayout.width * 0.55,
  `sankey: la última capa termina en ${Math.round(derecha)} de ${Math.round(sankeyLayout.width)}: sobra lienzo a la derecha`);
for (const l of sankeyLayout.links) {
  assert.ok(/^M[\d.-]+,[\d.-]+ C/.test(l.path), `sankey: la cinta debe abrir con M y curva — ${l.path.slice(0, 24)}`);
  assert.ok(l.path.trim().endsWith('Z'), 'sankey: la cinta debe cerrarse (Z) para poder rellenarse');
}
assert.equal(resolveSankeySpec({ sankey: { nodes: [{ id: 'a' }], links: [] } }), null,
  'sankey: sin enlaces con valor no hay diagrama');

/* ── Quadrant ── */

const quadSpec = resolveQuadrantSpec({
  quadrant: {
    xAxis: { left: 'Bajo', right: 'Alto' },
    yAxis: { bottom: 'Poco', top: 'Mucho' },
    quadrants: { topLeft: 'Elegir', topRight: 'Justificar' },
    points: [
      { id: 'p1', label: 'A', x: 0.2, y: 0.9 },
      { id: 'p2', label: 'B', x: 1.8, y: -3 },   // fuera de rango: se recorta
      { id: 'p3', label: 'C', x: 0.21, y: 0.9 }, // casi encima de p1
    ],
  },
});

assert.ok(quadSpec, 'quadrant: el spec no debe ser null con puntos');
assert.equal(quadSpec.points[1].x, 1, 'quadrant: x fuera de rango se recorta a 1');
assert.equal(quadSpec.points[1].y, 0, 'quadrant: y fuera de rango se recorta a 0');

const quadLayout = computeQuadrantLayout(quadSpec);
const [p1, p2, p3] = quadLayout.points;
assert.ok(p1.cy < quadLayout.axes.midY, 'quadrant: y=0.9 debe quedar en la mitad superior (el eje crece hacia arriba)');
assert.ok(p2.cy > quadLayout.axes.midY, 'quadrant: y=0 debe quedar abajo del todo');
assert.ok(p2.cx > quadLayout.axes.midX, 'quadrant: x=1 debe quedar a la derecha');
assert.ok(p3.labelDy > 0, 'quadrant: dos puntos casi iguales no pueden compartir la línea de la etiqueta');
assert.equal(quadLayout.quadrants.length, 2, 'quadrant: solo se rotulan los cuadrantes con nombre');
assert.equal(resolveQuadrantSpec({ quadrant: { points: [] } }), null, 'quadrant: sin puntos no hay matriz');

/* ── Venn ── */

const venn2 = resolveVennSpec({
  venn: {
    sets: [{ id: 'a', label: 'Pedido' }, { id: 'b', label: 'Entregado' }],
    regions: [
      { sets: ['a'], label: 'Pendiente' },
      { sets: ['a', 'b'], label: 'Cumplido', value: 7 },
      { sets: ['a', 'z'], label: 'Colgante' }, // conjunto inexistente: se descarta
    ],
  },
});
assert.ok(venn2, 'venn: dos conjuntos son válidos');
assert.equal(venn2.regions.length, 2, 'venn: una región con un conjunto inexistente no se dibuja');

const venn2Layout = computeVennLayout(venn2);
assert.equal(venn2Layout.circles.length, 2);
assert.ok(venn2Layout.circles[0].cx < venn2Layout.circles[1].cx, 'venn: los dos círculos no pueden coincidir');
const interseccion = venn2Layout.regions.find((r) => r.sets.length === 2);
const [c0, c1] = venn2Layout.circles;
assert.ok(Math.abs(interseccion.x - (c0.cx + c1.cx) / 2) < 1,
  'venn: la región compartida se rotula entre los dos centros');
const exclusiva = venn2Layout.regions.find((r) => r.sets.length === 1);
assert.ok(exclusiva.x < interseccion.x, 'venn: la región exclusiva se aleja de la zona compartida');

const venn3 = resolveVennSpec({ venn: { sets: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] } });
assert.equal(venn3.sets.length, 3, 'venn: con más de tres conjuntos solo se toman tres (los círculos no dan para más)');
assert.equal(resolveVennSpec({ venn: { sets: [{ id: 'a' }] } }), null, 'venn: un solo conjunto no es un Venn');

console.log('sankey-quadrant-venn.selfcheck: OK');
