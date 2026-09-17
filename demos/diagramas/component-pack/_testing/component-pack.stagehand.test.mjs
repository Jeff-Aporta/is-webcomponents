// component-pack.stagehand.test.mjs — render + a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/component-pack/component-pack.html`;
const tests = [];

tests.push({
  name: 'render: SVG con 2 paquetes y 6 componentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-pack-ready');
    const info = await page.evaluate(() => {
      const host = document.getElementById('host');
      return {
        packages: host?.querySelectorAll('[data-package-id]').length ?? 0,
        components: host?.querySelectorAll('[data-component-id]').length ?? 0,
        svg: !!host?.querySelector('svg'),
      };
    });
    assert.ok(info.svg);
    assert.equal(info.packages, 2);
    assert.equal(info.components, 6);
    await screenshot(page, 'component-pack-render');
  },
});

tests.push({
  name: 'reduced-motion: estable',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-pack-ready');
    const pkgs = await page.evaluate(() => document.getElementById('host')?.querySelectorAll('[data-package-id]').length ?? 0);
    assert.equal(pkgs, 2);
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
      await waitReady(page, 'data-component-pack-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'component-pack-stagehand');
      const result = await sh.act(`
Evalúa este render de component-pack. Checklist:
1. Los 2 paquetes (Frontend, Backend) son visibles.
2. Cada paquete contiene sus 3 componentes sin solapamientos.
3. Las 3 aristas son visibles.
4. El resultado cabe en el viewport.
Responde SOLO con JSON: { "packages_visible": "PASS|FAIL", "no_overlap": "PASS|FAIL", "edges_visible": "PASS|FAIL", "in_viewport": "PASS|FAIL", "summary": "..." }
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

report('component-pack-stagehand', failures === 0, { total: tests.length, failures });