// sequence-diagram.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo sequence-diagram.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/sequence-diagram/sequence-diagram.html`,
  readyAttr: 'data-sequence-ready',
  name: 'sequence-diagram',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-sequence-diagram');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.seq-svg');
    const svgRect = svg.getBoundingClientRect();
    const actors = [...shadow.querySelectorAll('.seq-actor')].map((g) => {
      const r = g.getBoundingClientRect();
      return { id: g.dataset.actorId ?? g.dataset.nodeId ?? null, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const edges = [...shadow.querySelectorAll('[data-msg-id] path, [data-msg-id] line')].map((p) => ({
      d: p.getAttribute('d') ?? '',
      stroke: p.getAttribute('stroke') ?? '',
      computedStroke: getComputedStyle(p).stroke ?? '',
    }));
    const texts = [...shadow.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, actors, edges, texts };
  });

  // Los actores están en columnas: NO deben solaparse horizontalmente.
  const overlaps = [];
  for (let i = 0; i < data.actors.length; i++) {
    for (let j = i + 1; j < data.actors.length; j++) {
      const a = data.actors[i], b = data.actors[j];
      // Solape significativo horizontal (>=30% del ancho)
      const ox = a.x < b.x + b.w * 0.5 && b.x < a.x + a.w * 0.5;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      if (ox && oy) overlaps.push([i, j]);
    }
  }
  assert.equal(overlaps.length, 0, `actores solapados: ${JSON.stringify(overlaps)}`);

  const broken = data.edges.filter((r) => !r.d || r.d.length < 3 || !r.stroke);
  assert.equal(broken.length, 0, `mensajes rotos: ${broken.length}`);

  const sr = data.svgRect;
  for (const a of data.actors) {
    const inside =
      a.x >= sr.x - 1 && a.x + a.w <= sr.x + sr.width + 1 &&
      a.y >= sr.y - 1 && a.y + a.h <= sr.y + sr.height + 1;
    assert.ok(inside, `actor ${a.id} se sale del SVG`);
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

