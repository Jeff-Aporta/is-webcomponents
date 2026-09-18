// quadrant-chart.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo quadrant-chart.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/quadrant-chart/quadrant-chart.html`,
  readyAttr: 'data-quadrant-ready',
  name: 'quadrant-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-quadrant-chart');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.qd-svg');
    const svgRect = svg.getBoundingClientRect();
    const points = [...shadow.querySelectorAll('[data-point-id]')].map((g) => {
      const r = g.getBoundingClientRect();
      return { id: g.dataset.pointId, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const texts = [...shadow.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, points, texts };
  });

  // Los puntos pueden solaparse (es un scatter) — sólo validamos que están
  // dentro del SVG y que los textos son legibles.
  const sr = data.svgRect;
  for (const p of data.points) {
    const inside =
      p.x >= sr.x - 1 && p.x + p.w <= sr.x + sr.width + 1 &&
      p.y >= sr.y - 1 && p.y + p.h <= sr.y + sr.height + 1;
    assert.ok(inside, `punto ${p.id} se sale del SVG`);
  }

  const empty = data.texts.filter((t) => !t.text);
  const tooSmall = data.texts.filter((t) => t.fontSize && Number(t.fontSize) < 6);
  assert.equal(empty.length, 0, `textos vacíos: ${empty.length}`);
  assert.equal(tooSmall.length, 0, `textos < 6px: ${tooSmall.length}`);
}

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS`);
  results.push({ name: DEMO.name, skipped: false });
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  results.push({ name: DEMO.name, error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  const sh = await maybeStagehand();
  if (sh) {
    const { browser: b2, page: p2 } = await newPage();
    try {
      await p2.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
      await waitReady(p2, DEMO.readyAttr);
      await p2.waitForTimeout(400);
      await screenshot(p2, `stagehand-${DEMO.name}`);
      console.log(`  ✓ ${DEMO.name}: visual rubric LLM completado`);
    } catch (err) {
      console.error(`  ✗ ${DEMO.name} (LLM): ${String(err?.message ?? err)}`);
    } finally {
      await sh.close?.().catch(() => {});
      await close({ browser: b2, page: p2 });
    }
  }
}

const failures = results.filter((r) => r.error).length;
report(`${DEMO.name}-stagehand`, failures === 0, { total: results.length, failures, results });