// org-chart.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo org-chart.html. org-chart no extiende
// DiagramElementBase, así que usamos selectores específicos del componente.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/org-chart/org-chart.html`,
  readyAttr: 'data-org-chart-ready',
  name: 'org-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-org-chart');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.canvas');
    const svgRect = svg.getBoundingClientRect();
    // En org-chart los nodos son <g class="node"> con tarjeta <foreignObject>.
    const nodes = [...shadow.querySelectorAll('.node')].map((g) => {
      const r = g.getBoundingClientRect();
      return { id: g.dataset.id, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const edges = [...shadow.querySelectorAll('path.edge')].map((p) => ({
      d: p.getAttribute('d') ?? '',
      stroke: p.getAttribute('stroke') ?? '',
      computedStroke: getComputedStyle(p).stroke ?? '',
    }));
    return { svgRect, nodes, edges };
  });

  // Las tarjetas NO deben solaparse.
  const overlaps = [];
  for (let i = 0; i < data.nodes.length; i++) {
    for (let j = i + 1; j < data.nodes.length; j++) {
      const a = data.nodes[i], b = data.nodes[j];
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      if (ox && oy) overlaps.push([a.id, b.id]);
    }
  }
  assert.equal(overlaps.length, 0, `tarjetas solapadas: ${JSON.stringify(overlaps)}`);

  const broken = data.edges.filter((r) => !r.d || r.d.length < 10 || (!r.stroke && !r.computedStroke));
  assert.equal(broken.length, 0, `aristas rotas: ${broken.length}`);

  const sr = data.svgRect;
  for (const n of data.nodes) {
    const inside =
      n.x >= sr.x - 1 && n.x + n.w <= sr.x + sr.width + 1 &&
      n.y >= sr.y - 1 && n.y + n.h <= sr.y + sr.height + 1;
    assert.ok(inside, `tarjeta ${n.id} se sale del SVG`);
  }
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
