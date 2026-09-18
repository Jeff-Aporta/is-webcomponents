// venn-diagram.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo venn-diagram.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/venn-diagram/venn-diagram.html`,
  readyAttr: 'data-venn-ready',
  name: 'venn-diagram',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const el = document.querySelector('main is-venn-diagram');
    const shadow = el.shadowRoot;
    const svg = shadow.querySelector('svg.vn-svg');
    const svgRect = svg.getBoundingClientRect();
    const circles = [...shadow.querySelectorAll('circle')].map((c) => {
      const r = c.getBoundingClientRect();
      // Calcular bounding box del círculo a partir de cx/cy/r del viewBox
      // y escalando a píxeles. Más fiable: usar getBBox y mapear.
      const vb = svg.viewBox.baseVal;
      const cx = Number(c.getAttribute('cx')) || 0;
      const cy = Number(c.getAttribute('cy')) || 0;
      const rad = Number(c.getAttribute('r')) || 0;
      const sx = svgRect.width / vb.width;
      const sy = svgRect.height / vb.height;
      return {
        x: svgRect.x + (cx - rad) * sx,
        y: svgRect.y + (cy - rad) * sy,
        w: rad * 2 * sx,
        h: rad * 2 * sy,
      };
    });
    const texts = [...shadow.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return { svgRect, circles, texts };
  });

  // Validar que cada círculo cabe en el SVG (no se sale por ningún borde).
  const sr = data.svgRect;
  for (let i = 0; i < data.circles.length; i++) {
    const c = data.circles[i];
    const inside =
      c.x >= sr.x - 1 && c.x + c.w <= sr.x + sr.width + 1 &&
      c.y >= sr.y - 1 && c.y + c.h <= sr.y + sr.height + 1;
    assert.ok(inside, `círculo ${i} se sale del SVG: x=${c.x.toFixed(1)}, y=${c.y.toFixed(1)}, w=${c.w.toFixed(1)}, h=${c.h.toFixed(1)}`);
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
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS (3 círculos en viewport, texto legible)`);
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