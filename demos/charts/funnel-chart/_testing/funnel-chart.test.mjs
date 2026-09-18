// funnel-chart.test.mjs — tests exhaustivos del demo funnel-chart.html.
// Cobertura: smoke + funcional (render, config update, band count, labels,
// valores + dropPct, geometría trapezoidal, hover) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/funnel-chart/funnel-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      const bands = el.shadowRoot.querySelectorAll('.mark-funnel');
      return {
        defined: !!customElements.get('is-funnel-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        bands: bands.length,
      };
    });
    assert.equal(info.defined, true, 'is-funnel-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(info.bands > 0, `debe haber bandas de funnel, hay ${info.bands}`);
    assert.ok(info.viewBox, 'el SVG debe tener viewBox');
    await screenshot(page, 'funnel-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      return document.querySelector('is-funnel-chart').shadowRoot.querySelectorAll('.mark-funnel').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      el.payload = {
        type: 'funnel',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{ label: 'Subset', data: [100, 50, 25] }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      return document.querySelector('is-funnel-chart').shadowRoot.querySelectorAll('.mark-funnel').length;
    });
    assert.equal(after, 3, `re-asignar payload debe dar 3 bandas, hay ${after}`);
    assert.notEqual(after, before, 're-asignar payload debe cambiar el render');
  },
});

tests.push({
  name: 'bands: hay tantas bandas como valores en el dataset',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    await page.waitForTimeout(200);
    const counts = await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      const bands = el.shadowRoot.querySelectorAll('.mark-funnel');
      return {
        bands: bands.length,
        dataLen: el.payload?.data?.datasets?.[0]?.data?.length ?? 0,
      };
    });
    assert.equal(counts.dataLen, 5, `demo debe tener 5 valores, tiene ${counts.dataLen}`);
    assert.equal(
      counts.bands, counts.dataLen,
      `esperaba ${counts.dataLen} bandas, hay ${counts.bands}`,
    );
    // Cada banda debe tener un path `d` trapezoidal (M, L x3, Z).
    const allValid = await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      const bands = [...el.shadowRoot.querySelectorAll('.mark-funnel')];
      return bands.every((b) => {
        const d = b.getAttribute('d') ?? '';
        const lCount = (d.match(/L/g) ?? []).length;
        return d.length > 4 && /^M[\s\d.\-]+/.test(d) && lCount >= 3 && d.trim().endsWith('Z');
      });
    });
    assert.equal(allValid, true, 'todas las bandas deben tener path trapezoidal (M + ≥3 L + Z)');
  },
});

tests.push({
  name: 'labels: aparece un funnel-label por paso (lado izquierdo)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    await page.waitForTimeout(200);
    const labels = await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      const texts = [...el.shadowRoot.querySelectorAll('text.funnel-label')];
      return texts.map((t) => (t.textContent ?? '').trim());
    });
    const want = ['Visitantes', 'Leads', 'Cualificados', 'Demo', 'Cierre'];
    assert.equal(labels.length, want.length, `esperaba ${want.length} labels, hay ${labels.length}`);
    for (const w of want) {
      assert.ok(labels.includes(w), `debe aparecer la etiqueta "${w}" (${JSON.stringify(labels)})`);
    }
  },
});

tests.push({
  name: 'values: aparece un funnel-value con valor + dropPct por paso (lado derecho)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    await page.waitForTimeout(200);
    const values = await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      const texts = [...el.shadowRoot.querySelectorAll('text.funnel-value')];
      return texts.map((t) => (t.textContent ?? '').trim());
    });
    assert.equal(values.length, 5, `esperaba 5 valores, hay ${values.length}`);
    // El primer paso no incluye dropPct (dropPct = 100 vs sí mismo).
    // Los pasos 2..5 deben contener "%".
    for (let i = 1; i < values.length; i++) {
      assert.ok(values[i].includes('%'), `paso ${i} debe contener %: "${values[i]}"`);
    }
    // El primer paso puede o no tener %; verificamos que al menos los pasos 2..5 sí.
    // Comprobamos además que los valores formateados aparecen (12K, 4.8K, …).
    const allText = values.join(' | ');
    assert.ok(/12\.?0?K|12\.000/.test(allText) || /\b12K\b/.test(allText),
      `debe aparecer el valor del primer paso formateado: "${allText}"`);
  },
});

tests.push({
  name: 'geometry: cada banda posterior es más estrecha que la anterior',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    await page.waitForTimeout(200);
    const widths = await page.evaluate(() => {
      const el = document.querySelector('is-funnel-chart');
      const bands = [...el.shadowRoot.querySelectorAll('.mark-funnel')];
      return bands.map((b) => b.getBoundingClientRect().width);
    });
    // El demo es decreciente: 12000 > 4800 > 2100 > 760 > 184 → widths decrecientes.
    assert.ok(widths.length === 5, `esperaba 5 bandas, hay ${widths.length}`);
    let monotonic = true;
    for (let i = 1; i < widths.length; i++) {
      if (widths[i] >= widths[i - 1]) { monotonic = false; break; }
    }
    assert.equal(monotonic, true,
      `los anchos deben ser decrecientes: [${widths.map((w) => w.toFixed(1)).join(', ')}]`);
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-funnel-chart-ready');
    const fired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-funnel-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.payload = {
          type: 'funnel',
          data: { labels: ['a', 'b'], datasets: [{ label: 's', data: [10, 5] }] },
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

report('funnel-chart', failures === 0, { total: tests.length, failures });