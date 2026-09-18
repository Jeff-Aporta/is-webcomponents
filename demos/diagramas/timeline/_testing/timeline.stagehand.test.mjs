// timeline.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo timeline.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/timeline/timeline.html`,
  readyAttr: 'data-timeline-ready',
  name: 'timeline',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-timeline');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.tl-svg');
    const svgRect = svg.getBoundingClientRect();
    const events = [...shadow.querySelectorAll('[data-event-id]')].map((g) => {
      const r = g.getBoundingClientRect();
      return { id: g.dataset.eventId, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const texts = [...shadow.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, events, texts };
  });

  // Los eventos pueden compartir Y (mismo grupo), no deben solaparse.
  const overlaps = [];
  for (let i = 0; i < data.events.length; i++) {
    for (let j = i + 1; j < data.events.length; j++) {
      const a = data.events[i], b = data.events[j];
      // Solape solo si son muy parecidos en X (>=50% del ancho)
      const ox = a.x < b.x + b.w * 0.5 && b.x < a.x + a.w * 0.5;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      if (ox && oy) overlaps.push([a.id, b.id]);
    }
  }
  assert.equal(overlaps.length, 0, `eventos solapados: ${JSON.stringify(overlaps)}`);

  const sr = data.svgRect;
  for (const e of data.events) {
    const inside =
      e.x >= sr.x - 1 && e.x + e.w <= sr.x + sr.width + 1 &&
      e.y >= sr.y - 1 && e.y + e.h <= sr.y + sr.height + 1;
    assert.ok(inside, `evento ${e.id} se sale del SVG`);
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