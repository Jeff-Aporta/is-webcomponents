// marks-funnel.test.mjs — tests del utility marks-funnel.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/marks-funnel/marks-funnel.html`;

const tests = [];

tests.push({
  name: 'smoke: la página importa el bundle y expone los exports',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-funnel-ready');
    const info = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-funnel.min.js');
      const fc = document.querySelector('is-funnel-chart');
      return {
        exports: Object.keys(lib).sort(),
        hasFunnelBands: typeof lib.funnelBands === 'function',
        hasDrawFunnelMarks: typeof lib.drawFunnelMarks === 'function',
        bands: lib.funnelBands([4200, 1800, 640, 210]),
        funnelChartDefined: !!customElements.get('is-funnel-chart'),
        funnelChartSvg: !!fc?.shadowRoot?.querySelector('svg'),
        funnelChartMarks: fc?.shadowRoot?.querySelectorAll('.mark').length || 0,
      };
    });
    assert.deepEqual(info.exports, ['drawFunnelMarks', 'funnelBands']);
    assert.equal(info.hasFunnelBands, true);
    assert.equal(info.hasDrawFunnelMarks, true);
    assert.equal(info.bands.length, 4, 'funnelBands debe devolver un array por cada valor');
    assert.equal(info.bands[0].ratio, 1, 'primer ratio es 1 (referencia)');
    assert.equal(info.bands[0].dropPct, 100, 'dropPct inicial = 100');
    assert.equal(info.funnelChartDefined, true);
    assert.ok(info.funnelChartMarks > 0, 'is-funnel-chart debe renderizar marcas');
    await screenshot(page, 'marks-funnel-smoke');
  },
});

tests.push({
  name: 'funnelBands: ratio es monótono no-creciente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-funnel-ready');
    const bands = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-funnel.min.js');
      return lib.funnelBands([4200, 1800, 640, 210]);
    });
    for (let i = 1; i < bands.length; i++) {
      assert.ok(bands[i].ratio <= bands[i - 1].ratio + 1e-9, `ratio no creciente en paso ${i}`);
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
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('marks-funnel', failures === 0, { total: tests.length, failures });
