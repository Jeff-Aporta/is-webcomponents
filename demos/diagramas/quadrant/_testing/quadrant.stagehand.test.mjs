// quadrant.stagehand.test.mjs — render + a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/quadrant/quadrant.html`;
const tests = [];

tests.push({
  name: 'render: 6 puntos y 4 cuadrantes en SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const info = await page.evaluate(() => {
      const q = document.querySelector('is-quadrant-chart');
      const sr = q?.shadowRoot;
      return {
        points: sr?.querySelectorAll('[data-point-id]').length ?? 0,
        quadrants: sr?.querySelectorAll('[data-quadrant-id]').length ?? 0,
        svg: !!sr?.querySelector('svg'),
      };
    });
    assert.ok(info.svg);
    assert.equal(info.points, 6);
    assert.equal(info.quadrants, 4);
    await screenshot(page, 'quadrant-render');
  },
});

tests.push({
  name: 'a11y: SVG accesible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const a11y = await page.evaluate(() => {
      const svg = document.querySelector('is-quadrant-chart')?.shadowRoot?.querySelector('svg');
      return { role: svg?.getAttribute('role'), ariaLabel: svg?.getAttribute('aria-label') };
    });
    assert.ok(a11y.role || a11y.ariaLabel);
  },
});

tests.push({
  name: 'reduced-motion: estable',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const points = await page.evaluate(() => document.querySelector('is-quadrant-chart')?.shadowRoot?.querySelectorAll('[data-point-id]').length ?? 0);
    assert.equal(points, 6);
  },
});

tests.push({
  name: 'stagehand: rubric (skip si no disponible)',
  run: async () => {
    const sh = await maybeStagehand();
    if (!sh) { console.log('    ⊘ stagehand no disponible, skipping'); return; }
    const { browser, page } = await newPage();
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await waitReady(page, 'data-quadrant-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'quadrant-stagehand');
      const result = await sh.act(`
Evalúa esta matriz 2×2. Checklist:
1. Los 4 cuadrantes tienen etiquetas legibles.
2. Los 6 puntos están dentro del área de plot.
3. Las etiquetas de los puntos no se salen del lienzo.
4. Los ejes X e Y son visibles.
Responde SOLO con JSON: { "quadrant_labels": "PASS|FAIL", "points_in_plot": "PASS|FAIL", "labels_in_viewport": "PASS|FAIL", "axes_visible": "PASS|FAIL", "summary": "..." }
      `.trim(), { image: shot });
      console.log('    stagehand:', JSON.parse(result?.output ?? result?.text ?? '{}').summary ?? '(sin summary)');
    } finally {
      await sh.close?.().catch(() => {});
      await close({ browser, page });
    }
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('quadrant-stagehand', failures === 0, { total: tests.length, failures });