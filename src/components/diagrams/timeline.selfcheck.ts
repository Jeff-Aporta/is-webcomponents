import assert from 'node:assert';
import { resolveTimelineSpec, computeTimelineLayout } from './timeline-spec.js';

/**
 * Regresión: ninguna tarjeta de evento debe superponerse a otra.
 *
 * Bug original: `MIN_GAP_PX` (96) era menor que el ancho real de la tarjeta
 * (`CARD_W`=168), y el intervalo de empaquetado se modelaba hacia adelante
 * desde la marca de tiempo en vez de centrado — la tarjeta se dibuja
 * centrada sobre su punto (`cardX = dotX - CARD_W/2`), así que su huella
 * ocupa tiempo a ambos lados del evento. Este check arma un cluster de
 * eventos muy juntos con etiquetas largas y verifica, por intersección real
 * de rectángulos (no una métrica indirecta), que ninguna tarjeta se toca.
 */

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function assertNoCardOverlap(layout, label) {
  const cards = layout.events.map((e) => ({ id: e.id, x: e.cardX, y: e.cardY, w: e.cardW, h: e.cardH }));
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      assert.ok(
        !rectsOverlap(cards[i], cards[j]),
        `${label}: tarjetas ${cards[i].id} y ${cards[j].id} se superponen`,
      );
    }
  }
}

// 1. Horizontal: 8 eventos apretados en 10 días, etiquetas largas.
{
  const events = Array.from({ length: 8 }, (_, i: number) => ({
    id: `e${i}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    label: `Hito de facturación electrónica número ${i + 1}`,
  }));
  const spec = resolveTimelineSpec({ timeline: { orientation: 'horizontal', events } });
  const layout = computeTimelineLayout(spec);
  assert.strictEqual(layout.events.length, 8);
  assertNoCardOverlap(layout, 'horizontal apretado');
}

// 2. Vertical: mismo cluster.
{
  const events = Array.from({ length: 8 }, (_, i: number) => ({
    id: `e${i}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    label: `Hito ${i + 1}`,
  }));
  const spec = resolveTimelineSpec({ timeline: { orientation: 'vertical', events } });
  const layout = computeTimelineLayout(spec);
  assertNoCardOverlap(layout, 'vertical apretado');
}

// 3. Eventos en el MISMO instante (caso límite: gap cero).
{
  const events = [
    { id: 'a', date: '2026-03-01', label: 'Evento A' },
    { id: 'b', date: '2026-03-01', label: 'Evento B' },
    { id: 'c', date: '2026-03-01', label: 'Evento C' },
  ];
  const spec = resolveTimelineSpec({ timeline: { orientation: 'horizontal', events } });
  const layout = computeTimelineLayout(spec);
  assertNoCardOverlap(layout, 'mismo instante');
}

// 4. Espaciados de sobra: no debe forzar carriles innecesarios.
{
  const events = [
    { id: 'a', date: '2026-01-01', label: 'A' },
    { id: 'b', date: '2026-06-01', label: 'B' },
    { id: 'c', date: '2026-12-01', label: 'C' },
  ];
  const spec = resolveTimelineSpec({ timeline: { orientation: 'horizontal', events } });
  const layout = computeTimelineLayout(spec);
  assertNoCardOverlap(layout, 'espaciado amplio');
  // packLanes reutiliza el mismo carril cuando no hay colisión de tiempo
  // (validado en lane-layout.selfcheck.mjs) — aquí solo importa que, con
  // huecos de sobra, nada exige más de una profundidad de apilado.
  const maxDepth = Math.max(...layout.events.map((e) => Math.round(Math.abs(e.cardY - e.dotY) / 50)));
  assert.ok(maxDepth <= 1, 'espaciado amplio no debería necesitar apilar en profundidad');
}

console.log('timeline self-check: PASS');
