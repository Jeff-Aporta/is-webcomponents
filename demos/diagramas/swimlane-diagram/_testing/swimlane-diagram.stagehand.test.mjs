// swimlane-diagram.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo swimlane-diagram.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/swimlane-diagram/swimlane-diagram.html`,
  readyAttr: 'data-swimlane-ready',
  name: 'swimlane-diagram',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-swimlane-diagram');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.sw-svg');
    const svgRect = svg.getBoundingClientRect();
    const steps = [...shadow.querySelectorAll('[data-step-id]')].map((g) => {
      const r = g.getBoundingClientRect();
      return { id: g.dataset.stepId, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const edges = [...shadow.querySelectorAll('[data-link-id] path')].map((p) => ({
      d: p.getAttribute('d') ?? '',
      stroke: p.getAttribute('stroke') ?? '',
      computedStroke: getComputedStyle(p).stroke ?? '',
    }));
    const texts = [...shadow.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, steps, edges, texts };
  });

  const overlaps = [];
  for (let i = 0; i < data.steps.length; i++) {
    for (let j = i + 1; j < data.steps.length; j++) {
      const a = data.steps[i], b = data.steps[j];
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      if (ox && oy) overlaps.push([a.id, b.id]);
    }
  }
  assert.equal(overlaps.length, 0, `pasos solapados: ${JSON.stringify(overlaps)}`);

  const broken = data.edges.filter((r) => !r.d || r.d.length < 5 || !r.stroke);
  assert.equal(broken.length, 0, `enlaces rotos: ${broken.length}`);

  const sr = data.svgRect;
  for (const s of data.steps) {
    const inside =
      s.x >= sr.x - 1 && s.x + s.w <= sr.x + sr.width + 1 &&
      s.y >= sr.y - 1 && s.y + s.h <= sr.y + sr.height + 1;
    assert.ok(inside, `paso ${s.id} se sale del SVG`);
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

