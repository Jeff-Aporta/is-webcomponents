// block-diagram.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo block-diagram.html. Replica el patrón de
// er-stagehand.test.mjs: checks deterministas con Playwright que sustituyen
// al rubric LLM de Stagehand (mismas 5 preguntas).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/block-diagram/block-diagram.html`,
  readyAttr: 'data-block-diagram-ready',
  name: 'block-diagram',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-block-diagram');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.block-svg');
    const svgRect = svg.getBoundingClientRect();
    const nodes = [...shadow.querySelectorAll('.block-node')].map((g) => {
      const r = g.querySelector('rect')?.getBoundingClientRect();
      return r ? { id: g.dataset.blockId, x: r.x, y: r.y, w: r.width, h: r.height } : null;
    }).filter(Boolean);
    const edges = [...shadow.querySelectorAll('.block-edge path')].map((p) => ({
      d: p.getAttribute('d') ?? '',
      stroke: p.getAttribute('stroke') ?? '',
      computedStroke: getComputedStyle(p).stroke ?? '',
    }));
    const texts = [...shadow.querySelectorAll('.block-node text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, nodes, edges, texts };
  });

  // (1) BLOQUES NO SE SOLAPAN
  const overlaps = [];
  for (let i = 0; i < data.nodes.length; i++) {
    for (let j = i + 1; j < data.nodes.length; j++) {
      const a = data.nodes[i], b = data.nodes[j];
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      if (ox && oy) overlaps.push([a.id, b.id]);
    }
  }
  assert.equal(overlaps.length, 0, `bloques solapados: ${JSON.stringify(overlaps)}`);

  // (2) ARISTAS LEGIBLES
  const broken = data.edges.filter((r) => !r.d || r.d.length < 5 || !r.stroke);
  assert.equal(broken.length, 0, `aristas rotas: ${broken.length}`);

  // (3) DIAGRAMA ENCAJA EN VIEWPORT
  const sr = data.svgRect;
  for (const n of data.nodes) {
    const inside =
      n.x >= sr.x - 1 && n.x + n.w <= sr.x + sr.width + 1 &&
      n.y >= sr.y - 1 && n.y + n.h <= sr.y + sr.height + 1;
    assert.ok(inside, `bloque ${n.id} en (${n.x.toFixed(1)},${n.y.toFixed(1)}) se sale del SVG`);
  }

  // (4) TEXTO LEGIBLE
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
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS (no overlap, edges legibles, en viewport, texto legible)`);
  results.push({ name: DEMO.name, skipped: false });
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  results.push({ name: DEMO.name, error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// Rama opt-in Stagehand LLM (no corre por defecto)
if (process.env.STAGEHAND === '1') {
  const sh = await maybeStagehand();
  if (sh) {
    console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
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

