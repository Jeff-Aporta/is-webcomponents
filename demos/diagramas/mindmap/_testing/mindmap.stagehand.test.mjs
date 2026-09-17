// mindmap.stagehand.test.mjs — render + a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/mindmap/mindmap.html`;
const tests = [];

tests.push({
  name: 'render: 12 nodos visibles en SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const info = await page.evaluate(() => {
      const m = document.querySelector('is-mindmap');
      const sr = m?.shadowRoot;
      return {
        nodes: sr?.querySelectorAll('[data-node-id]').length ?? 0,
        edges: sr?.querySelectorAll('[data-edge-id]').length ?? 0,
        svg: !!sr?.querySelector('svg'),
      };
    });
    assert.ok(info.svg);
    assert.ok(info.nodes >= 12, `esperaba >=12 nodos (hay ${info.nodes})`);
    assert.ok(info.edges >= 10);
    await screenshot(page, 'mindmap-render');
  },
});

tests.push({
  name: 'a11y: SVG con role o aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const a11y = await page.evaluate(() => {
      const svg = document.querySelector('is-mindmap')?.shadowRoot?.querySelector('svg');
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
    await waitReady(page, 'data-mindmap-ready');
    const nodes = await page.evaluate(() => document.querySelector('is-mindmap')?.shadowRoot?.querySelectorAll('[data-node-id]').length ?? 0);
    assert.ok(nodes >= 12);
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
      await waitReady(page, 'data-mindmap-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'mindmap-stagehand');
      const result = await sh.act(`
Evalúa este mindmap radial. Checklist:
1. La raíz está al centro.
2. Las 3 ramas principales (Observabilidad, Deploy, Datos) están distribuidas alrededor.
3. Las hojas son legibles.
4. El árbol cabe en el viewport.
Responde SOLO con JSON: { "root_centered": "PASS|FAIL", "branches_distributed": "PASS|FAIL", "leaves_legible": "PASS|FAIL", "in_viewport": "PASS|FAIL", "summary": "..." }
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

report('mindmap-stagehand', failures === 0, { total: tests.length, failures });