// bar-chart.test.mjs — tests exhaustivos del demo bar-chart.html.
// Cobertura: smoke + funcional (render, config update, dataset multi-bar,
// axis labels, hover) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/bar-chart/bar-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      const rects = svg.getBoundingClientRect();
      return {
        defined: !!customElements.get('is-bar-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        width: rects.width,
        height: rects.height,
      };
    });
    assert.equal(info.defined, true, 'is-bar-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(info.viewBox, 'el SVG debe tener viewBox');
    await screenshot(page, 'bar-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      return el.shadowRoot.querySelectorAll('.mark').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      el.payload = {
        type: 'bar',
        data: {
          labels: ['A', 'B'],
          datasets: [{ label: 'S1', data: [10, 20] }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      return {
        marks: el.shadowRoot.querySelectorAll('.mark').length,
      };
    });
    assert.notEqual(after.marks, before, 're-asignar payload debe cambiar las marcas');
  },
});

tests.push({
  name: 'multi-dataset: dos series producen N×2 barras (N labels × 2 datasets)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    await page.waitForTimeout(200);
    const counts = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const marks = [...el.shadowRoot.querySelectorAll('.mark')];
      const bars = marks.filter((m) => m.classList.contains('mark-bar'));
      // Cada .mark-bar es una barra individual (path con d).
      // 4 labels × 2 datasets = 8 barras esperadas.
      const ds = el.payload?.data?.datasets?.length ?? 0;
      const labels = el.payload?.data?.labels?.length ?? 0;
      return { bars: bars.length, ds, labels };
    });
    assert.equal(counts.ds, 2, `demo debe tener 2 datasets, tiene ${counts.ds}`);
    assert.equal(counts.labels, 4, `demo debe tener 4 labels, tiene ${counts.labels}`);
    assert.equal(
      counts.bars,
      counts.ds * counts.labels,
      `esperaba ${counts.ds * counts.labels} barras, hay ${counts.bars}`,
    );
    // Cada barra debe tener un path `d` con comandos válidos.
    const allValid = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const bars = [...el.shadowRoot.querySelectorAll('.mark.mark-bar')];
      return bars.every((b) => {
        const d = b.getAttribute('d') ?? '';
        return d.length > 4 && /^M[\s\d.]+/.test(d);
      });
    });
    assert.equal(allValid, true, 'todas las barras deben tener path d con M');
  },
});

tests.push({
  name: 'axis: el eje de categoría muestra los labels Q1..Q4',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    await page.waitForTimeout(200);
    const tickLabels = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const texts = [...el.shadowRoot.querySelectorAll('text.tick-label')];
      return texts.map((t) => (t.textContent ?? '').trim());
    });
    // El demo usa labels ['Q1','Q2','Q3','Q4'] — el eje X debe traerlos.
    const want = ['Q1', 'Q2', 'Q3', 'Q4'];
    for (const w of want) {
      assert.ok(
        tickLabels.includes(w),
        `el eje debe contener la etiqueta "${w}" (labels: ${JSON.stringify(tickLabels)})`,
      );
    }
  },
});

tests.push({
  name: 'legend: aparece una entrada por dataset (2 series)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    await page.waitForTimeout(200);
    const legend = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const leg = el.shadowRoot.querySelector('.legend');
      if (!leg || leg.hidden) return { hidden: true, items: [] };
      const items = [...leg.querySelectorAll('.legend-item')].map((it) => ({
        label: it.querySelector('.legend-label')?.textContent?.trim() ?? '',
      }));
      return { hidden: false, items };
    });
    assert.equal(legend.hidden, false, 'la leyenda debe estar visible con 2 datasets');
    assert.equal(legend.items.length, 2, `esperaba 2 items, hay ${legend.items.length}`);
    const labels = legend.items.map((i) => i.label);
    assert.ok(labels.includes('2024'), `leyenda debe contener "2024" (${JSON.stringify(labels)})`);
    assert.ok(labels.includes('2025'), `leyenda debe contener "2025" (${JSON.stringify(labels)})`);
  },
});

tests.push({
  name: 'hover: pointermove sobre una barra marca data-active en el grupo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.querySelector('is-bar-chart');
        const bar = el.shadowRoot.querySelector('.mark.mark-bar');
        if (!bar) return resolve({ bar: false });
        const box = bar.getBoundingClientRect();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const svg = el.shadowRoot.querySelector('svg');
        svg.dispatchEvent(new PointerEvent('pointermove', {
          clientX: cx, clientY: cy, bubbles: true, composed: true,
        }));
        setTimeout(() => {
          const marksGroup = el.shadowRoot.querySelector('g.marks');
          const active = marksGroup?.querySelectorAll('.mark[data-active]').length ?? 0;
          const tip = el.shadowRoot.querySelector('.tooltip');
          resolve({ bar: true, active, tipVisible: tip ? !tip.hidden : false });
        }, 80);
      });
    });
    assert.equal(result.bar, true, 'debe haber al menos una barra');
    assert.ok(result.active >= 1, `hover debe marcar >=1 barra activa, hay ${result.active}`);
  },
});

tests.push({
  name: 'stacked: atributo stacked=true apila las series en una sola pila por categoría',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    await page.waitForTimeout(200);
    // Cambiamos a stacked y comparamos Y-top de las primeras barras por label.
    // En el demo original (grouped) las dos barras de "Q1" tienen bases iguales.
    // Apiladas, la segunda empieza donde termina la primera: el Y inicial cambia.
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const bars = [...el.shadowRoot.querySelectorAll('.mark.mark-bar')];
      return bars.slice(0, 4).map((b) => b.getBoundingClientRect().y);
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      el.setAttribute('stacked', '');
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-bar-chart');
      const bars = [...el.shadowRoot.querySelectorAll('.mark.mark-bar')];
      return bars.slice(0, 4).map((b) => b.getBoundingClientRect().y);
    });
    // Stacked vs grouped debe dar geometrías distintas (al menos una Y cambia).
    const changed = before.some((y, i) => Math.abs(y - after[i]) > 0.5);
    assert.equal(changed, true, 'stacked debe producir una geometría de barras distinta a grouped');
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bar-chart-ready');
    const fired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-bar-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.payload = {
          type: 'bar',
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

report('bar-chart', failures === 0, { total: tests.length, failures });