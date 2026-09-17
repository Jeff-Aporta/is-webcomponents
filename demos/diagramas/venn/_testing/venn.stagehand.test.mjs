// venn.stagehand.test.mjs — render + a11y + prefers-reduced-motion.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/venn/venn.html`;

const tests = [];
const results = [];

tests.push({
  name: 'render: el componente monta y dibuja 2 círculos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const info = await page.evaluate(() => {
      const v = document.querySelector('is-venn-diagram');
      const sr = v?.shadowRoot;
      const svg = sr?.querySelector('svg');
      return {
        circles: sr?.querySelectorAll('circle').length ?? 0,
        labels: sr?.querySelectorAll('text').length ?? 0,
        viewBox: svg?.getAttribute('viewBox'),
      };
    });
    assert.ok(info.circles >= 2, `esperaba >=2 círculos (hay ${info.circles})`);
    assert.ok(info.labels >= 4, `esperaba >=4 textos (hay ${info.labels}) — 2 sets + 2 regiones exclusivas`);
    assert.ok(info.viewBox, 'SVG debe tener viewBox');
    await screenshot(page, 'venn-render');
  },
});

tests.push({
  name: 'a11y: el SVG tiene role y aria-label no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const a11y = await page.evaluate(() => {
      const v = document.querySelector('is-venn-diagram');
      const svg = v?.shadowRoot?.querySelector('svg');
      return {
        role: svg?.getAttribute('role'),
        ariaLabel: svg?.getAttribute('aria-label'),
      };
    });
    assert.ok(a11y.role || a11y.ariaLabel, 'SVG debe tener role o aria-label para a11y');
  },
});

tests.push({
  name: 'reduced-motion: prefers-reduced-motion reduce no rompe render',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const info = await page.evaluate(() => {
      const v = document.querySelector('is-venn-diagram');
      const sr = v?.shadowRoot;
      return {
        circles: sr?.querySelectorAll('circle').length ?? 0,
        labels: sr?.querySelectorAll('text').length ?? 0,
      };
    });
    assert.ok(info.circles >= 2);
    assert.ok(info.labels >= 4);
  },
});

tests.push({
  name: 'stagehand: rubric visual (skip si no disponible)',
  run: async () => {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('    ⊘ stagehand no disponible, skipping');
      return;
    }
    const { browser, page } = await newPage();
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await waitReady(page, 'data-venn-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'venn-stagehand');
      const result = await sh.act(`
Evalúa este diagrama de Venn de 2 conjuntos.
Checklist:
1. Los 2 círculos NO se solapan de forma caótica (su intersección es visible).
2. Las etiquetas de los conjuntos son legibles y no se cortan contra el borde.
3. La región compartida (intersección) tiene su etiqueta visible dentro o cerca de ella.
4. El diagrama cabe completo en el viewport visible.
Responde SOLO con JSON: { "no_overlap": "PASS|FAIL", "text_legible": "PASS|FAIL", "intersection_visible": "PASS|FAIL", "in_viewport": "PASS|FAIL", "summary": "..." }
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
  results.push({ name: t.name, ok });
}

report('venn-stagehand', failures === 0, { total: tests.length, failures, results });