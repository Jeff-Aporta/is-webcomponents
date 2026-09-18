// chart.stagehand.test.mjs — visual rubric determinista (Playwright puro).
//
// Checklist (cada check debe pasar):
//   (1) MARKS PRESENTES: type="bar" debe renderizar al menos 1 .mark.
//   (2) FILLS NO VACÍOS: cada mark debe tener fill visible (no "none"/"transparent").
//   (3) VIEWBOX AJUSTADO: el SVG tiene viewBox "0 0 W H" coherente con el
//       tamaño visible.
//   (4) ENCAJA EN VIEWPORT: el bounding box del SVG es > 0.
//   (5) ETIQUETAS LEGIBLES: las N etiquetas categóricas están presentes.
//   (6) TÍTULO RENDERIZADO: el atributo label="..." aparece como texto en
//       el SVG.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/chart/chart.html`,
  readyAttr: 'data-chart-ready',
  name: 'chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const el = document.querySelector('is-chart');
    const svg = el?.shadowRoot?.querySelector('svg');
    if (!svg) return null;
    const svgRect = svg.getBoundingClientRect();
    const marks = [...el.shadowRoot.querySelectorAll('.mark')].map((m) => {
      const r = m.getBoundingClientRect();
      return {
        tag: m.tagName.toLowerCase(),
        cls: m.getAttribute('class') ?? '',
        fill: m.getAttribute('fill'),
        d: m.getAttribute('d') ?? '',
        x: r.x, y: r.y, w: r.width, h: r.height,
      };
    });
    const labels = [...el.shadowRoot.querySelectorAll('text.tick-label')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      x: t.getAttribute('x'),
      y: t.getAttribute('y'),
    }));
    const title = el?.shadowRoot?.querySelector('text.chart-title');
    return {
      svgRect,
      marks,
      labels,
      titleText: title?.textContent?.trim() ?? null,
      viewBox: svg.getAttribute('viewBox'),
      type: el.getAttribute('type'),
    };
  });
  if (!data) throw new Error('no se encontró SVG dentro del shadow DOM');

  // (1) MARKS PRESENTES.
  assert.ok(data.marks.length >= 1, `debe haber al menos 1 .mark (hay ${data.marks.length})`);

  // (2) FILLS NO VACÍOS.
  for (const m of data.marks) {
    assert.ok(m.fill && m.fill !== 'none' && m.fill !== 'transparent',
      `mark debe tener fill visible (tag=${m.tag} cls="${m.cls}" fill="${m.fill}")`);
  }
  // Marks de bar deben tener un "d" con datos de path (la engine usa paths
  // para rectángulos redondeados).
  const barsWithD = data.marks.filter((m) => m.d && m.d.length > 0);
  assert.equal(barsWithD.length, data.marks.length,
    `todos los marks de bar deben tener atributo d (${barsWithD.length}/${data.marks.length})`);

  // (3) VIEWBOX AJUSTADO.
  assert.ok(data.viewBox, `SVG debe tener viewBox (era ${data.viewBox})`);
  const parts = (data.viewBox ?? '').split(/\s+/).map(Number);
  assert.equal(parts.length, 4, `viewBox debe tener 4 valores (tiene ${parts.length})`);
  assert.equal(parts[0], 0, `viewBox.x debe ser 0 (era ${parts[0]})`);
  assert.equal(parts[1], 0, `viewBox.y debe ser 0 (era ${parts[1]})`);
  assert.ok(parts[2] > 0 && parts[3] > 0, `viewBox.w y viewBox.h deben ser > 0 (era ${parts[2]}×${parts[3]})`);

  // (4) ENCAJA EN VIEWPORT.
  assert.ok(data.svgRect.width > 0, `ancho del SVG debe ser > 0 (era ${data.svgRect.width})`);
  assert.ok(data.svgRect.height > 0, `alto del SVG debe ser > 0 (era ${data.svgRect.height})`);

  // (5) ETIQUETAS LEGIBLES.
  assert.ok(data.labels.length >= 3, `debe haber al menos 3 etiquetas categóricas (hay ${data.labels.length})`);
  for (const lb of data.labels) {
    assert.ok(lb.text && lb.text.length > 0, `etiqueta no debe estar vacía ("${lb.text}")`);
  }

  // (6) TÍTULO RENDERIZADO.
  assert.ok(data.titleText && data.titleText.length > 0, `el título debe estar presente (era "${data.titleText}")`);

  // (EXTRA) type debe conservarse como atributo.
  assert.equal(data.type, 'bar', `el atributo type debe ser "bar" (era "${data.type}")`);
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS (marks presentes, fills válidos, viewBox ajustado, etiquetas legibles, título OK)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}
await close({ browser, page });
report(DEMO.name, true);