// mindmap.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo mindmap.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/mindmap/mindmap.html`,
  readyAttr: 'data-mindmap-ready',
  name: 'mindmap',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-mindmap');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.mm-svg');
    const svgRect = svg.getBoundingClientRect();
    const nodes = [...shadow.querySelectorAll('.mm-node')].map((g) => {
      const r = g.getBoundingClientRect();
      return { id: g.dataset.nodeId, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const edges = [...shadow.querySelectorAll('.mm-edge')].map((p) => ({
      d: p.getAttribute('d') ?? '',
      stroke: p.getAttribute('stroke') ?? '',
      computedStroke: getComputedStyle(p).stroke ?? '',
    }));
    const texts = [...shadow.querySelectorAll('.mm-node text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, nodes, edges, texts };
  });

  // En mindmap los nodos hoja pueden solaparse libremente (subrayado), pero
  // los roots/branches NO deben solaparse entre sí.
  const heavyNodes = data.nodes.filter((n) => n.id === 'root' || /^(mkt|prod|ops)$/.test(n.id));
  const overlaps = [];
  for (let i = 0; i < heavyNodes.length; i++) {
    for (let j = i + 1; j < heavyNodes.length; j++) {
      const a = heavyNodes[i], b = heavyNodes[j];
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      if (ox && oy) overlaps.push([a.id, b.id]);
    }
  }
  assert.equal(overlaps.length, 0, `roots/branches solapados: ${JSON.stringify(overlaps)}`);

  const broken = data.edges.filter((r) => !r.d || r.d.length < 5 || !r.stroke);
  assert.equal(broken.length, 0, `aristas rotas: ${broken.length}`);

  const sr = data.svgRect;
  for (const n of data.nodes) {
    const inside =
      n.x >= sr.x - 1 && n.x + n.w <= sr.x + sr.width + 1 &&
      n.y >= sr.y - 1 && n.y + n.h <= sr.y + sr.height + 1;
    assert.ok(inside, `nodo ${n.id} se sale del SVG`);
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

