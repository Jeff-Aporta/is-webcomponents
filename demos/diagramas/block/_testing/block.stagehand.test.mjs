// block.stagehand.test.mjs — render + a11y + prefers-reduced-motion.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/block/block.html`;
const tests = [];

tests.push({
  name: 'render: 6 bloques + 5 aristas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    const info = await page.evaluate(() => {
      const b = document.querySelector('is-block-diagram');
      const sr = b?.shadowRoot;
      return {
        blocks: sr?.querySelectorAll('[data-block-id]').length ?? 0,
        edges: sr?.querySelectorAll('[data-edge-id]').length ?? 0,
        svg: !!sr?.querySelector('svg'),
      };
    });
    assert.ok(info.svg);
    assert.equal(info.blocks, 6);
    assert.equal(info.edges, 5);
    await screenshot(page, 'block-render');
  },
});

tests.push({
  name: 'a11y: SVG accesible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    const a11y = await page.evaluate(() => {
      const svg = document.querySelector('is-block-diagram')?.shadowRoot?.querySelector('svg');
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
    await waitReady(page, 'data-block-ready');
    const blocks = await page.evaluate(() => document.querySelector('is-block-diagram')?.shadowRoot?.querySelectorAll('[data-block-id]').length ?? 0);
    assert.equal(blocks, 6);
  },
});

tests.push({
  name: 'stagehand: rubric (skip si no disponible)',
  run: async () => {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('    ⊘ stagehand no disponible, skipping');
      return;
    }
    const { browser, page } = await newPage();
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await waitReady(page, 'data-block-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'block-stagehand');
      const result = await sh.act(`
Evalúa este diagrama de bloques. Checklist:
1. Los 6 bloques están visibles y NO se solapan.
2. Las 5 aristas son legibles y conectan bloques correctos.
3. La leyenda de grupos es visible si existe.
4. El diagrama cabe en el viewport.
Responde SOLO con JSON: { "no_overlap": "PASS|FAIL", "edges_legible": "PASS|FAIL", "legend_visible": "PASS|FAIL|N/A", "in_viewport": "PASS|FAIL", "summary": "..." }
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

report('block-stagehand', failures === 0, { total: tests.length, failures });