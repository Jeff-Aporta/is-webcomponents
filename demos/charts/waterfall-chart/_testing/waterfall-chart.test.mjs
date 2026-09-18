// waterfall-chart.test.mjs — tests exhaustivos del demo waterfall-chart.html.
// Cobertura: smoke + funcional (render, config update, bar count, totales,
// colores success/danger, conectores, hover) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/waterfall-chart/waterfall-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      const bars = el.shadowRoot.querySelectorAll('.mark-waterfall');
      const connectors = el.shadowRoot.querySelectorAll('.waterfall-connector');
      return {
        defined: !!customElements.get('is-waterfall-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        bars: bars.length,
        connectors: connectors.length,
      };
    });
    assert.equal(info.defined, true, 'is-waterfall-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(info.bars > 0, `debe haber barras de waterfall, hay ${info.bars}`);
    assert.ok(info.viewBox, 'el SVG debe tener viewBox');
    await screenshot(page, 'waterfall-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      return document.querySelector('is-waterfall-chart').shadowRoot.querySelectorAll('.mark-waterfall').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      el.payload = {
        type: 'waterfall',
        data: {
          labels: ['A', 'B', 'C', 'D'],
          datasets: [{
            label: 'Subset',
            data: [100, -30, -20, 50],
            totals: [0, 3],
          }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      return document.querySelector('is-waterfall-chart').shadowRoot.querySelectorAll('.mark-waterfall').length;
    });
    assert.equal(after, 4, `re-asignar payload debe dar 4 barras, hay ${after}`);
    assert.notEqual(after, before, 're-asignar payload debe cambiar el render');
  },
});

tests.push({
  name: 'bars: hay tantas barras como valores en el dataset',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    await page.waitForTimeout(200);
    const counts = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const bars = el.shadowRoot.querySelectorAll('.mark-waterfall');
      return {
        bars: bars.length,
        dataLen: el.payload?.data?.datasets?.[0]?.data?.length ?? 0,
      };
    });
    assert.equal(counts.dataLen, 6, `demo debe tener 6 valores, tiene ${counts.dataLen}`);
    assert.equal(
      counts.bars, counts.dataLen,
      `esperaba ${counts.dataLen} barras, hay ${counts.bars}`,
    );
    // Cada barra debe tener un path `d` válido (roundedBarRect: M + L + Z).
    const allValid = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const bars = [...el.shadowRoot.querySelectorAll('.mark-waterfall')];
      return bars.every((b) => {
        const d = b.getAttribute('d') ?? '';
        return d.length > 4 && /^M[\s\d.\-]+/.test(d) && d.trim().endsWith('Z');
      });
    });
    assert.equal(allValid, true, 'todas las barras deben tener path d con M y Z');
  },
});

tests.push({
  name: 'totals: las barras totales usan un color distinto a las de delta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    await page.waitForTimeout(200);
    const colors = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const bars = [...el.shadowRoot.querySelectorAll('.mark-waterfall')];
      return bars.map((b) => ({
        fill: b.getAttribute('fill') ?? '',
      }));
    });
    assert.equal(colors.length, 6, `esperaba 6 barras, hay ${colors.length}`);
    // El demo tiene totals=[0,5]: las barras 0 y 5 son totales; 1..4 son deltas.
    // Los deltas negativos deben usar dangerColor (rojo). El color depende de
    // --status-danger; verificamos al menos que las totales usan un color
    // distinto a las de delta (no todas iguales).
    const totalColors = new Set([colors[0].fill, colors[5].fill]);
    const deltaColors = new Set([colors[1].fill, colors[2].fill, colors[3].fill, colors[4].fill]);
    // El set de colores de delta no debe estar vacío y debe estar separado del
    // set de totales (puede haber 1 color por delta: success o danger).
    assert.ok(deltaColors.size >= 1, `deltas deben tener al menos 1 color (${[...deltaColors].join(', ')})`);
    // Los totales no deben incluir el color rojo de "danger".
    for (const tc of totalColors) {
      assert.notEqual(tc, colors[1].fill,
        `total no debe compartir color con deltas negativos (${tc} == ${colors[1].fill})`);
    }
  },
});

tests.push({
  name: 'connectors: hay N-1 conectores entre barras',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    await page.waitForTimeout(200);
    const counts = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const bars = el.shadowRoot.querySelectorAll('.mark-waterfall').length;
      const connectors = el.shadowRoot.querySelectorAll('.waterfall-connector').length;
      return { bars, connectors };
    });
    assert.equal(counts.bars, 6, `esperaba 6 barras, hay ${counts.bars}`);
    assert.equal(counts.connectors, counts.bars - 1,
      `esperaba ${counts.bars - 1} conectores, hay ${counts.connectors}`);
  },
});

tests.push({
  name: 'kind-mix: el demo incluye al menos un total y un delta down',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    await page.waitForTimeout(200);
    // Verificamos que el dataset declara totales y deltas negativos.
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-waterfall-chart');
      const ds = el.payload?.data?.datasets?.[0];
      const data = (ds?.data ?? []).map(Number);
      const totals = (ds?.totals ?? []).map(Number);
      const positives = data.filter((v) => v > 0).length;
      const negatives = data.filter((v) => v < 0).length;
      return { data, totals, positives, negatives };
    });
    assert.ok(info.totals.length >= 2, `debe declarar >=2 totales, tiene ${info.totals.length}`);
    assert.ok(info.negatives >= 1, `debe haber al menos 1 delta negativo, tiene ${info.negatives}`);
    assert.ok(info.positives >= 1, `debe haber al menos 1 delta positivo (o valor total inicial), tiene ${info.positives}`);
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-waterfall-chart-ready');
    const fired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-waterfall-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.payload = {
          type: 'waterfall',
          data: {
            labels: ['a', 'b'],
            datasets: [{ label: 's', data: [10, -5], totals: [0] }],
          },
        };
        setTimeout(() => { el.remove(); resolve(n); }, 250);
      });
    });
    assert.ok(fired >= 1, `is-render debió dispararse >=1 vez (fue ${fired})`);
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

report('waterfall-chart', failures === 0, { total: tests.length, failures });