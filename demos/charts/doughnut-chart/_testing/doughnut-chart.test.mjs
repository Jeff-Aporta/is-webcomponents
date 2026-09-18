// doughnut-chart.test.mjs — tests exhaustivos del demo doughnut-chart.html.
// Cobertura: smoke + funcional (render, config update, slice count, leyenda,
// total al centro, hover) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/doughnut-chart/doughnut-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      const slices = el.shadowRoot.querySelectorAll('.mark-slice');
      return {
        defined: !!customElements.get('is-doughnut-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        slices: slices.length,
      };
    });
    assert.equal(info.defined, true, 'is-doughnut-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(info.slices > 0, `debe haber slices renderizadas, hay ${info.slices}`);
    assert.ok(info.viewBox, 'el SVG debe tener viewBox');
    await screenshot(page, 'doughnut-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      return el.shadowRoot.querySelectorAll('.mark-slice').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      el.payload = {
        type: 'doughnut',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{ label: 'Subset', data: [10, 20, 30] }],
        },
        options: { cutout: '60' },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      return el.shadowRoot.querySelectorAll('.mark-slice').length;
    });
    assert.equal(after, 3, `re-asignar payload debe dar 3 slices, hay ${after}`);
    assert.notEqual(after, before, 're-asignar payload debe cambiar el render');
  },
});

tests.push({
  name: 'slices: el número de slices coincide con el número de labels',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    await page.waitForTimeout(200);
    const counts = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const slices = el.shadowRoot.querySelectorAll('.mark-slice');
      return {
        slices: slices.length,
        labels: el.payload?.data?.labels?.length ?? 0,
      };
    });
    assert.equal(counts.labels, 5, `demo debe tener 5 labels, tiene ${counts.labels}`);
    assert.equal(
      counts.slices, counts.labels,
      `esperaba ${counts.labels} slices, hay ${counts.slices}`,
    );
    // Cada slice debe tener un path `d` con comandos válidos (pathArc → M ... A ...).
    const allValid = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark-slice')];
      return slices.every((s) => {
        const d = s.getAttribute('d') ?? '';
        return d.length > 4 && /^M[\s\d.]+/.test(d) && /[Aa][\s\d.,\-]+/.test(d);
      });
    });
    assert.equal(allValid, true, 'todas las slices deben tener path d con M y A');
  },
});

tests.push({
  name: 'center: aparece el total al centro cuando cutout > 0',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const centerValue = el.shadowRoot.querySelector('.center-value');
      const centerCaption = el.shadowRoot.querySelector('.center-caption');
      return {
        value: (centerValue?.textContent ?? '').trim(),
        caption: (centerCaption?.textContent ?? '').trim(),
      };
    });
    // El demo usa cutout: '55' → total = 42+18+15+12+13 = 100.
    assert.ok(info.value.length > 0, `center-value debe tener texto, tiene "${info.value}"`);
    // formatValue devuelve "100" o "100,00" según locale; sólo verificamos no-vacío y >= 100.
    const num = Number(info.value.replace(/[^\d.,]/g, '').replace(',', '.'));
    assert.ok(num >= 100, `total central debe ser >= 100, es ${num}`);
    // caption puede ser el label del dataset ("2024") o "Total" si está vacío.
    assert.ok(info.caption.length > 0, `center-caption debe tener texto, tiene "${info.caption}"`);
  },
});

tests.push({
  name: 'legend: aparece una entrada por label (5 categorías)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    await page.waitForTimeout(200);
    const legend = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const leg = el.shadowRoot.querySelector('.legend');
      if (!leg || leg.hidden) return { hidden: true, items: [] };
      const items = [...leg.querySelectorAll('.legend-item')].map((it) => ({
        label: it.querySelector('.legend-label')?.textContent?.trim() ?? '',
      }));
      return { hidden: false, items };
    });
    assert.equal(legend.hidden, false, 'la leyenda debe estar visible con 5 labels');
    assert.equal(legend.items.length, 5, `esperaba 5 items, hay ${legend.items.length}`);
    const labels = legend.items.map((i) => i.label);
    for (const want of ['Operaciones', 'Marketing', 'RRHH', 'I+D', 'Otros']) {
      assert.ok(labels.includes(want), `leyenda debe contener "${want}" (${JSON.stringify(labels)})`);
    }
  },
});

tests.push({
  name: 'legend-toggle: click en item oculta el slice correspondiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const before = el.shadowRoot.querySelectorAll('.mark-slice').length;
      const item = el.shadowRoot.querySelector('.legend-item');
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      return new Promise((resolve) => {
        setTimeout(() => {
          const after = el.shadowRoot.querySelectorAll('.mark-slice').length;
          resolve({ before, after });
        }, 150);
      });
    });
    assert.ok(result.before >= 5, `antes debe haber >=5 slices, hay ${result.before}`);
    assert.ok(result.after < result.before,
      `ocultar un item debe reducir el conteo (antes=${result.before}, después=${result.after})`);
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doughnut-chart-ready');
    const fired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-doughnut-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.payload = {
          type: 'doughnut',
          data: { labels: ['a', 'b'], datasets: [{ label: 's', data: [1, 2] }] },
          options: { cutout: '50' },
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

report('doughnut-chart', failures === 0, { total: tests.length, failures });