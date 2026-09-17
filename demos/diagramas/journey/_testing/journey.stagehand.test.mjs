// journey.stagehand.test.mjs — render + a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/journey/journey.html`;
const tests = [];

tests.push({
  name: 'render: 6 pasos y 3 bandas de fase',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-ready');
    const info = await page.evaluate(() => {
      const j = document.querySelector('is-journey-map');
      const sr = j?.shadowRoot;
      return {
        steps: sr?.querySelectorAll('[data-step-id]').length ?? 0,
        phases: sr?.querySelectorAll('[data-phase-id]').length ?? 0,
        svg: !!sr?.querySelector('svg'),
      };
    });
    assert.ok(info.svg);
    assert.equal(info.steps, 6);
    assert.equal(info.phases, 3);
    await screenshot(page, 'journey-render');
  },
});

tests.push({
  name: 'a11y: SVG accesible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-ready');
    const a11y = await page.evaluate(() => {
      const svg = document.querySelector('is-journey-map')?.shadowRoot?.querySelector('svg');
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
    await waitReady(page, 'data-journey-ready');
    const steps = await page.evaluate(() => document.querySelector('is-journey-map')?.shadowRoot?.querySelectorAll('[data-step-id]').length ?? 0);
    assert.equal(steps, 6);
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
      await waitReady(page, 'data-journey-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'journey-stagehand');
      const result = await sh.act(`
Evalúa este journey map. Checklist:
1. La curva de satisfacción conecta los pasos con score.
2. Las 3 bandas de fase son distinguibles y tienen etiqueta.
3. Los actores están visibles bajo sus pasos.
4. El recorrido cabe en el viewport.
Responde SOLO con JSON: { "line_visible": "PASS|FAIL", "phase_bands_visible": "PASS|FAIL", "actors_visible": "PASS|FAIL", "in_viewport": "PASS|FAIL", "summary": "..." }
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

report('journey-stagehand', failures === 0, { total: tests.length, failures });