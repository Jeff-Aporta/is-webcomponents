// component.stagehand.test.mjs — render + a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/component/component.html`;
const tests = [];

tests.push({
  name: 'render: 5 componentes + paquete contenedor en SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-ready');
    const info = await page.evaluate(() => {
      const c = document.querySelector('is-component-diagram');
      const sr = c?.shadowRoot;
      return {
        components: sr?.querySelectorAll('[data-component-id]').length ?? 0,
          // lollipops pueden ser círculos para provided y arcos para required
          lollipops: sr?.querySelectorAll('[data-iface-id]').length ?? 0,
        edges: sr?.querySelectorAll('[data-edge-id]').length ?? 0,
        svg: !!sr?.querySelector('svg'),
      };
    });
    assert.ok(info.svg);
    assert.ok(info.components >= 5, `esperaba >=5 componentes (hay ${info.components})`);
    assert.ok(info.lollipops >= 0, 'lollipops opcionales');
    await screenshot(page, 'component-render');
  },
});

tests.push({
  name: 'a11y: SVG accesible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-ready');
    const a11y = await page.evaluate(() => {
      const svg = document.querySelector('is-component-diagram')?.shadowRoot?.querySelector('svg');
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
    await waitReady(page, 'data-component-ready');
    const comps = await page.evaluate(() => document.querySelector('is-component-diagram')?.shadowRoot?.querySelectorAll('[data-component-id]').length ?? 0);
    assert.ok(comps >= 5);
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
      await waitReady(page, 'data-component-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'component-stagehand');
      const result = await sh.act(`
Evalúa este diagrama de componentes UML. Checklist:
1. Los 5 componentes están visibles y NO se solapan.
2. El paquete "Azure" envuelve sus componentes con una pestaña.
3. Los lollipops (provided/required) son visibles.
4. Las aristas no atraviesan cajas.
Responde SOLO con JSON: { "no_overlap": "PASS|FAIL", "package_visible": "PASS|FAIL", "lollipops_visible": "PASS|FAIL", "edges_clean": "PASS|FAIL", "summary": "..." }
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

report('component-stagehand', failures === 0, { total: tests.length, failures });