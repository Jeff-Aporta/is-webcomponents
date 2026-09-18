// marks-waterfall.test.mjs — tests exhaustivos del demo marks-waterfall.html.
// marks-waterfall es un utility bundle: exporta waterfallBars (pura) y
// drawWaterfallMarks (requiere ctx SVG). El demo pinta el wrapper
// <is-waterfall-chart> en vivo + invoca waterfallBars directamente para
// mostrar el resultado de la función pura.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/marks-waterfall/marks-waterfall.html`;

const tests = [];

tests.push({
  name: 'smoke: el bundle marks-waterfall expone waterfallBars + drawWaterfallMarks y el wrapper renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-waterfall-ready');
    const info = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-waterfall.min.js');
      const exports = Object.keys(lib).sort();
      const types = {};
      for (const k of exports) types[k] = typeof lib[k];
      const wf = document.querySelector('is-waterfall-chart');
      return {
        exports,
        types,
        wfDefined: !!customElements.get('is-waterfall-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!wf?.shadowRoot?.querySelector('svg'),
        marks: wf?.shadowRoot?.querySelectorAll('.mark.mark-waterfall').length || 0,
        connectors: wf?.shadowRoot?.querySelectorAll('.waterfall-connector').length || 0,
        exportsPre: document.getElementById('exports')?.textContent?.trim() || '',
        barsPre: document.getElementById('bars')?.textContent?.trim() || '',
      };
    });
    assert.deepEqual(
      info.exports,
      ['drawWaterfallMarks', 'waterfallBars'],
      `exports deben ser exactamente waterfallBars + drawWaterfallMarks (got ${JSON.stringify(info.exports)})`,
    );
    assert.equal(info.types.waterfallBars, 'function', 'waterfallBars debe ser function');
    assert.equal(info.types.drawWaterfallMarks, 'function', 'drawWaterfallMarks debe ser function');
    assert.equal(info.wfDefined, true, 'is-waterfall-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en el shadow DOM del wrapper');
    assert.ok(info.marks >= 5, `esperaba >=5 marks waterfall, hay ${info.marks}`);
    assert.ok(info.exportsPre.includes('waterfallBars'), '<pre> exports debe listar waterfallBars');
    assert.ok(info.exportsPre.includes('drawWaterfallMarks'), '<pre> exports debe listar drawWaterfallMarks');
    assert.ok(info.barsPre.includes('"kind"'), '<pre> bars debe contener la propiedad kind');
    await screenshot(page, 'marks-waterfall-smoke');
  },
});

tests.push({
  name: 'pure: waterfallBars([1200, 850, -420, -180, null], [0, 4]) → 5 barras con ranges correctos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-waterfall-ready');
    const result = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-waterfall.min.js');
      return lib.waterfallBars([1200, 850, -420, -180, null], [0, 4]);
    });
    assert.equal(result.length, 5, `esperaba 5 barras, hay ${result.length}`);
    assert.deepEqual(
      [result[0].start, result[0].end],
      [0, 1200],
      'índice 0 es total desde 0 a 1200',
    );
    assert.deepEqual(
      [result[1].start, result[1].end],
      [1200, 2050],
      'índice 1 sube desde 1200 a 2050 (delta +850)',
    );
    assert.deepEqual(
      [result[2].start, result[2].end],
      [2050, 1630],
      'índice 2 baja desde 2050 a 1630 (delta -420)',
    );
    assert.deepEqual(
      [result[3].start, result[3].end],
      [1630, 1450],
      'índice 3 baja desde 1630 a 1450 (delta -180)',
    );
    assert.deepEqual(
      [result[4].start, result[4].end],
      [0, 1450],
      'índice 4 es total (totals=[0,4]) desde 0 a 1450',
    );
    assert.deepEqual(
      result.map((b) => b.kind),
      ['total', 'up', 'down', 'down', 'total'],
      `kinds deben ser total/up/down/down/total (got ${JSON.stringify(result.map((b) => b.kind))})`,
    );
  },
});

tests.push({
  name: 'pure: waterfallBars con sólo deltas (sin totals) clasifica cada uno como up o down',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-waterfall-ready');
    const result = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-waterfall.min.js');
      return lib.waterfallBars([100, -30, 50, -20], []);
    });
    assert.equal(result.length, 4, 'debe haber 4 barras');
    assert.deepEqual(
      result.map((b) => b.kind),
      ['up', 'down', 'up', 'down'],
      'kinds deben ser up/down/up/down',
    );
    assert.equal(result[0].start, 0);
    assert.equal(result[0].end, 100);
    assert.equal(result[1].start, 100);
    assert.equal(result[1].end, 70);
    assert.equal(result[2].start, 70);
    assert.equal(result[2].end, 120);
    assert.equal(result[3].start, 120);
    assert.equal(result[3].end, 100);
  },
});

tests.push({
  name: 'live: <is-waterfall-chart> pinta 5 marks .mark-waterfall + conectores entre barras',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-waterfall-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const marks = [...el.shadowRoot.querySelectorAll('.mark.mark-waterfall')];
      const connectors = [...el.shadowRoot.querySelectorAll('.waterfall-connector')];
      const tickLabels = [...el.shadowRoot.querySelectorAll('text.tick-label')].map((t) => (t.textContent ?? '').trim());
      return {
        marks: marks.length,
        connectors: connectors.length,
        marksHaveFill: marks.map((m) => m.getAttribute('fill') ?? ''),
        tickLabels,
      };
    });
    assert.equal(data.marks, 5, `esperaba 5 marks waterfall, hay ${data.marks}`);
    assert.equal(data.connectors, 4, `esperaba 4 conectores entre 5 barras, hay ${data.connectors}`);
    assert.ok(data.marksHaveFill.every((f) => f.length > 0), 'todas las barras deben tener fill');
    assert.deepEqual(
      data.tickLabels,
      ['Ingresos', 'COGS', 'OpEx', 'Tax', 'Neto'],
      `labels del eje deben ser Ingresos..Neto (got ${JSON.stringify(data.tickLabels)})`,
    );
  },
});

tests.push({
  name: 'live: re-asignar payload re-pinta la cascada',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-waterfall-ready');
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => {
      return document.querySelector('is-waterfall-chart').shadowRoot.querySelectorAll('.mark.mark-waterfall').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      el.payload = {
        data: {
          labels: ['A', 'B', 'C', 'D'],
          datasets: [{ label: 'mini', data: [100, 50, -30, null], totals: [0, 3] }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const root = document.querySelector('is-waterfall-chart').shadowRoot;
      return {
        marks: root.querySelectorAll('.mark.mark-waterfall').length,
        ticks: [...root.querySelectorAll('text.tick-label')].map((t) => (t.textContent ?? '').trim()),
      };
    });
    assert.equal(after.marks, 4, 'nuevo payload (4 categorías) debe repintar 4 barras');
    assert.deepEqual(after.ticks, ['A', 'B', 'C', 'D'], 'los ticks deben coincidir con el nuevo payload');
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

report('marks-waterfall', failures === 0, { total: tests.length, failures });
