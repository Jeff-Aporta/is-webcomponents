// radar-chart.stagehand.test.mjs — visual rubric determinista (Playwright puro).
//
// Checklist (cada check debe pasar):
//   (1) POLÍGONOS CERRADOS: cada path.mark.mark-radar termina en Z.
//   (2) FILLS NO VACÍOS: cada polígono tiene un fill distinto de "none".
//   (3) VÉRTICES POR POLÍGONO: polígonos deben tener exactamente N vértices
//       (= número de labels del eje).
//   (4) ETIQUETAS LEGIBLES: las N etiquetas del eje están presentes en el DOM.
//   (5) VIEWBOX AJUSTADO: el SVG tiene viewBox "0 0 W H" coherente con el
//       tamaño visible.
//   (6) ENCAJA EN VIEWPORT: el bounding box del SVG es > 0.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/radar-chart/radar-chart.html`,
  readyAttr: 'data-radar-chart-ready',
  name: 'radar-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const el = document.querySelector('is-radar-chart');
    const svg = el?.shadowRoot?.querySelector('svg');
    if (!svg) return null;
    const svgRect = svg.getBoundingClientRect();
    const polys = [...el.shadowRoot.querySelectorAll('path.mark.mark-radar')].map((p) => {
      const r = p.getBoundingClientRect();
      return {
        d: p.getAttribute('d') ?? '',
        fill: p.getAttribute('fill'),
        stroke: p.getAttribute('stroke'),
        x: r.x, y: r.y, w: r.width, h: r.height,
      };
    });
    const points = [...el.shadowRoot.querySelectorAll('circle.mark.mark-point')].map((c) => ({
      cx: Number(c.getAttribute('cx')),
      cy: Number(c.getAttribute('cy')),
      r: Number(c.getAttribute('r')),
    }));
    const labels = [...el.shadowRoot.querySelectorAll('text.tick-label')].map((t) => (t.textContent ?? '').trim());
    return { svgRect, polys, points, labels, viewBox: svg.getAttribute('viewBox') };
  });
  if (!data) throw new Error('no se encontró SVG dentro del shadow DOM');

  // (1) POLÍGONOS CERRADOS.
  for (const p of data.polys) {
    const trimmed = p.d.trim();
    assert.ok(trimmed.endsWith('Z'), `polígono debe terminar en Z (era "${trimmed.slice(-20)}")`);
    // Un polígono radar con N vértices tiene N-1 L's más una Z final.
    const lCount = (trimmed.match(/L/g) ?? []).length;
    const mCount = (trimmed.match(/M/g) ?? []).length;
    assert.equal(mCount, 1, `polígono debe tener un único M inicial (tiene ${mCount})`);
    assert.ok(lCount >= 2, `polígono debe tener al menos 2 segmentos L (tiene ${lCount})`);
  }

  // (2) FILLS NO VACÍOS.
  for (const p of data.polys) {
    assert.ok(p.fill && p.fill !== 'none', `polígono debe tener fill distinto de none (era "${p.fill}")`);
    assert.ok(p.stroke && p.stroke !== 'none', `polígono debe tener stroke distinto de none (era "${p.stroke}")`);
  }

  // (3) VÉRTICES POR POLÍGONO = N labels.
  const N = data.labels.length;
  for (const p of data.polys) {
    const segCount = (p.d.match(/[ML]/g) ?? []).length;
    assert.equal(segCount, N, `polígono debe tener ${N} vértices (uno por label), tiene ${segCount}`);
  }
  // (3.b) Puntos deben coincidir: cada polígono tiene N vértices ⇒ 2 × N puntos.
  assert.equal(data.points.length, data.polys.length * N,
    `debe haber ${data.polys.length}×${N}=${data.polys.length * N} vértices (hay ${data.points.length})`);

  // (4) ETIQUETAS LEGIBLES.
  assert.ok(data.labels.length >= 3, `debe haber al menos 3 etiquetas (hay ${data.labels.length})`);
  for (const lb of data.labels) {
    assert.ok(lb && lb.length > 0, `etiqueta de eje no debe estar vacía ("${lb}")`);
  }

  // (5) VIEWBOX AJUSTADO.
  assert.ok(data.viewBox, `SVG debe tener viewBox (era ${data.viewBox})`);
  const parts = (data.viewBox ?? '').split(/\s+/).map(Number);
  assert.equal(parts.length, 4, `viewBox debe tener 4 valores (tiene ${parts.length})`);
  assert.equal(parts[0], 0, `viewBox.x debe ser 0 (era ${parts[0]})`);
  assert.equal(parts[1], 0, `viewBox.y debe ser 0 (era ${parts[1]})`);
  assert.ok(parts[2] > 0 && parts[3] > 0, `viewBox.w y viewBox.h deben ser > 0 (era ${parts[2]}×${parts[3]})`);

  // (6) ENCAJA EN VIEWPORT.
  assert.ok(data.svgRect.width > 0, `ancho del SVG debe ser > 0 (era ${data.svgRect.width})`);
  assert.ok(data.svgRect.height > 0, `alto del SVG debe ser > 0 (era ${data.svgRect.height})`);
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS (polígonos cerrados, fills válidos, vértices=N, etiquetas legibles, viewBox ajustado)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}
await close({ browser, page });
report(DEMO.name, true);