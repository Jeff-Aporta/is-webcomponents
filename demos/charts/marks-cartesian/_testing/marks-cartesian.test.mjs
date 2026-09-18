// marks-cartesian.test.mjs — tests del utility marks-cartesian.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/marks-cartesian/marks-cartesian.html`;

const tests = [];

tests.push({
  name: 'smoke: la página importa el bundle y expone los exports',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-cartesian-ready');
    const info = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-cartesian.min.js');
      const bars = document.querySelectorAll('is-chart[type="bar"]');
      const lines = document.querySelectorAll('is-chart[type="line"]');
      return {
        exports: Object.keys(lib).sort(),
        hasBar: typeof lib.drawBarMarks === 'function',
        hasLine: typeof lib.drawLineMarks === 'function',
        hasScatter: typeof lib.drawScatterMarks === 'function',
        hasBubble: typeof lib.drawBubbleMarks === 'function',
        chartDefined: !!customElements.get('is-chart'),
        barCharts: bars.length,
        lineCharts: lines.length,
      };
    });
    assert.deepEqual(info.exports, ['drawBarMarks', 'drawBubbleMarks', 'drawLineMarks', 'drawScatterMarks']);
    assert.equal(info.hasBar, true);
    assert.equal(info.hasLine, true);
    assert.equal(info.hasScatter, true);
    assert.equal(info.hasBubble, true);
    assert.equal(info.chartDefined, true);
    assert.equal(info.barCharts, 1, 'debe haber 1 <is-chart type=bar>');
    assert.equal(info.lineCharts, 1, 'debe haber 1 <is-chart type=line>');
    await screenshot(page, 'marks-cartesian-smoke');
  },
});

tests.push({
  name: 'demos: los charts embebidos renderizan marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-cartesian-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const bar = document.querySelector('is-chart[type="bar"]');
      const line = document.querySelector('is-chart[type="line"]');
      return {
        barSvg: !!bar?.shadowRoot?.querySelector('svg'),
        barMarks: bar?.shadowRoot?.querySelectorAll('.mark.mark-bar').length || 0,
        lineSvg: !!line?.shadowRoot?.querySelector('svg'),
        lineMarks: line?.shadowRoot?.querySelectorAll('.mark.mark-line').length || 0,
      };
    });
    assert.equal(data.barSvg, true, '<is-chart type=bar> debe renderizar SVG');
    assert.equal(data.lineSvg, true, '<is-chart type=line> debe renderizar SVG');
    assert.ok(data.barMarks >= 3, `esperaba >=3 barras (3 categorías), hay ${data.barMarks}`);
    assert.ok(data.lineMarks >= 1, `esperaba >=1 línea, hay ${data.lineMarks}`);
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

report('marks-cartesian', failures === 0, { total: tests.length, failures });
