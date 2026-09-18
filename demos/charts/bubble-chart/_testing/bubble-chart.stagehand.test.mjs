// bubble-chart.stagehand.test.mjs — visual rubric determinista (Playwright puro).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/bubble-chart/bubble-chart.html`,
  readyAttr: 'data-bubble-chart-ready',
  name: 'bubble-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const el = document.querySelector('is-bubble-chart');
    const svg = el.shadowRoot.querySelector('svg');
    const svgRect = svg.getBoundingClientRect();
    const marks = [...el.shadowRoot.querySelectorAll('.mark')].map((m) => {
      const r = m.getBoundingClientRect();
      return { tag: m.tagName.toLowerCase(), x: r.x, y: r.y, w: r.width, h: r.height, d: m.getAttribute('d') ?? m.getAttribute('cx') ?? '' };
    });
    const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, marks, texts };
  });

  const broken = data.marks.filter((m) => !m.d || m.d.length < 2);
  assert.equal(broken.length, 0, `${data.marks.length - broken.length}/${data.marks.length} marks con path/coord válida`);
  const empty = data.texts.filter((t) => !t.text);
  const tooSmall = data.texts.filter((t) => t.fontSize && Number(t.fontSize) < 6);
  assert.equal(empty.length, 0, `textos vacíos: ${empty.length}`);
  assert.equal(tooSmall.length, 0, `textos < 6px: ${tooSmall.length}`);
  // Check específico de bubble: SVG dimensionado correctamente + circles >= 8
  assert.ok(data.svgRect.width > 100, `SVG debe tener ancho > 100px (got ${data.svgRect.width})`);
  assert.ok(data.svgRect.height > 100, `SVG debe tener alto > 100px (got ${data.svgRect.height})`);
  const circles = data.marks.filter((m) => m.tag === 'circle');
  assert.ok(circles.length >= 8, `bubble debe tener >= 8 circles, hay ${circles.length}`);
  // Las burbujas deben tener tamaños heterogéneos (no todos iguales)
  const radii = new Set();
  await page.evaluate((set) => {
    document.querySelector('is-bubble-chart').shadowRoot
      .querySelectorAll('.mark.mark-bubble')
      .forEach((m) => set.add(Number(m.getAttribute('r'))));
  }, radii);
  assert.ok(radii.size >= 4, `las burbujas deben tener radios heterogéneos, hay ${radii.size} valores únicos`);
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}
await close({ browser, page });
report(DEMO.name, true);
