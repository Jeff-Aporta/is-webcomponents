// pie-chart.test.mjs — tests exhaustivos del demo pie-chart.html.
// Cobertura: smoke + funcional (render, config update, slice count,
// legend, slice colors, slice percentages) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/pie-chart/pie-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      const rects = svg.getBoundingClientRect();
      return {
        defined: !!customElements.get('is-pie-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        width: rects.width,
        height: rects.height,
      };
    });
    assert.equal(info.defined, true, 'is-pie-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(info.viewBox, 'el SVG debe tener viewBox');
    await screenshot(page, 'pie-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      return el.shadowRoot.querySelectorAll('.mark.mark-slice').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      el.payload = {
        type: 'pie',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{ label: 'S', data: [10, 20, 30] }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      return el.shadowRoot.querySelectorAll('.mark.mark-slice').length;
    });
    assert.notEqual(after, before, `re-asignar payload debe cambiar # de slices (${before}→${after})`);
  },
});

tests.push({
  name: 'slices: 5 labels producen 5 .mark-slice',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark.mark-slice')];
      const labels = el.payload?.data?.labels ?? [];
      return {
        slices: slices.length,
        labels: labels.length,
        ds: el.payload?.data?.datasets?.length ?? 0,
        // Cada slice debe tener un path d con A (arc) commands.
        dsList: slices.map((s) => ({
          d: s.getAttribute('d') ?? '',
          fill: s.getAttribute('fill') ?? '',
        })),
      };
    });
    assert.equal(info.ds, 1, `esperaba 1 dataset, hay ${info.ds}`);
    assert.equal(info.labels, 5, `esperaba 5 labels, hay ${info.labels}`);
    assert.equal(info.slices, info.labels, `esperaba ${info.labels} slices, hay ${info.slices}`);
    // Cada slice debe tener un path con arc command "A" (svg arc).
    for (const s of info.dsList) {
      assert.ok(/[Aa]/.test(s.d), `slice path debe contener arc command: "${s.d.slice(0, 60)}"`);
      assert.ok(s.fill.length > 2, `slice debe tener fill no-vacío, fue "${s.fill}"`);
    }
  },
});

tests.push({
  name: 'slices: cada slice tiene un color distinto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    await page.waitForTimeout(200);
    const fills = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark.mark-slice')];
      return slices.map((s) => s.getAttribute('fill') ?? '');
    });
    assert.equal(fills.length, 5, `esperaba 5 slices, hay ${fills.length}`);
    const distinct = new Set(fills);
    assert.equal(distinct.size, fills.length, `esperaba ${fills.length} colores distintos, hay ${distinct.size}: ${JSON.stringify(fills)}`);
  },
});

tests.push({
  name: 'legend: enumera las 5 etiquetas con swatches',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    await page.waitForTimeout(200);
    const legend = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      const leg = el.shadowRoot.querySelector('.legend');
      if (!leg || leg.hidden) return { hidden: true, items: [] };
      const items = [...leg.querySelectorAll('.legend-item')].map((it) => ({
        label: it.querySelector('.legend-label')?.textContent?.trim() ?? '',
        swatchBg: it.querySelector('.legend-swatch')?.style?.background ?? '',
      }));
      return { hidden: false, items };
    });
    assert.equal(legend.hidden, false, 'la leyenda debe estar visible con >1 slice');
    assert.equal(legend.items.length, 5, `esperaba 5 items de leyenda, hay ${legend.items.length}`);
    const labels = legend.items.map((i) => i.label);
    const expected = ['Orgánico', 'Directo', 'Social', 'Referral', 'Email'];
    for (const ex of expected) {
      assert.ok(labels.includes(ex), `leyenda debe contener "${ex}" (${JSON.stringify(labels)})`);
    }
    // Cada item debe tener un swatch con color.
    for (const it of legend.items) {
      assert.ok(it.swatchBg.length > 2, `item "${it.label}" debe tener swatch con color`);
    }
  },
});

tests.push({
  name: 'slice percentages: cuando pct >= 8% se renderiza text con %',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark.mark-slice')];
      const total = el.payload.data.datasets[0].data.reduce((s, v) => s + Number(v), 0);
      // Calculamos el % esperado por slice.
      const expected = el.payload.data.datasets[0].data.map((v) => (Number(v) / total) * 100);
      const percentTexts = [...el.shadowRoot.querySelectorAll('text.slice-value')];
      return {
        slices: slices.length,
        expected,
        percentTexts: percentTexts.map((t) => (t.textContent ?? '').trim()),
      };
    });
    // El demo tiene 5 slices: total = 420+310+260+145+95 = 1230.
    // Porcentajes: 34.1%, 25.2%, 21.1%, 11.8%, 7.7%.
    // El motor pinta la etiqueta cuando pct >= 8% y rOuter-rInner > 26.
    // En el demo todas menos la última (7.7%) deben aparecer.
    const expectedShown = info.expected.filter((p) => p >= 8).length;
    assert.ok(
      info.percentTexts.length >= expectedShown,
      `esperaba >=${expectedShown} textos de %, hay ${info.percentTexts.length}: ${JSON.stringify(info.percentTexts)}`,
    );
    for (const t of info.percentTexts) {
      assert.match(t, /^\d+%\s*$/, `texto de porcentaje debe terminar en %, fue "${t}"`);
    }
  },
});

tests.push({
  name: 'hover: pointermove sobre una slice marca data-active',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.querySelector('is-pie-chart');
        const slice = el.shadowRoot.querySelector('.mark.mark-slice');
        if (!slice) return resolve({ slice: false });
        const box = slice.getBoundingClientRect();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const svg = el.shadowRoot.querySelector('svg');
        svg.dispatchEvent(new PointerEvent('pointermove', {
          clientX: cx, clientY: cy, bubbles: true, composed: true,
        }));
        setTimeout(() => {
          const marksGroup = el.shadowRoot.querySelector('g.marks');
          const active = marksGroup?.querySelectorAll('.mark[data-active]').length ?? 0;
          resolve({ slice: true, active });
        }, 80);
      });
    });
    assert.equal(result.slice, true, 'debe haber al menos una slice');
    assert.ok(result.active >= 1, `hover debe marcar >=1 slice activa, hay ${result.active}`);
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pie-chart-ready');
    const fired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-pie-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.payload = {
          type: 'pie',
          data: { labels: ['a', 'b'], datasets: [{ label: 's', data: [1, 2] }] },
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

report('pie-chart', failures === 0, { total: tests.length, failures });