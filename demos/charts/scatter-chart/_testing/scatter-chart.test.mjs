// scatter-chart.test.mjs — tests exhaustivos del demo scatter-chart.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/scatter-chart/scatter-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-scatter-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      return {
        defined: !!customElements.get('is-scatter-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        markClasses: [...marks].map((m) => m.getAttribute('class')),
      };
    });
    assert.equal(info.defined, true, 'is-scatter-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(
      info.markClasses.every((c) => c && c.includes('mark')),
      'cada marca debe tener la clase .mark',
    );
    await screenshot(page, 'scatter-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      return document.querySelector('is-scatter-chart').shadowRoot.querySelectorAll('.mark').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-scatter-chart');
      el.payload = {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Otro dataset',
            data: [
              { x: 10, y: 20 }, { x: 20, y: 40 }, { x: 30, y: 60 },
              { x: 40, y: 80 }, { x: 50, y: 100 },
            ],
          }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      return document.querySelector('is-scatter-chart').shadowRoot.querySelectorAll('.mark').length;
    });
    assert.notEqual(after, before, `re-asignar payload debe cambiar el render (before=${before}, after=${after})`);
    assert.equal(after, 5, 'el nuevo dataset tiene 5 puntos');
  },
});

tests.push({
  name: 'marks: cada punto del dataset se traduce en un .mark-point',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    const data = await page.evaluate(() => {
      const root = document.querySelector('is-scatter-chart').shadowRoot;
      const marks = [...root.querySelectorAll('.mark.mark-point')];
      return {
        total: marks.length,
        cxValues: marks.map((m) => Number(m.getAttribute('cx'))),
        cyValues: marks.map((m) => Number(m.getAttribute('cy'))),
        radii: marks.map((m) => Number(m.getAttribute('r'))),
      };
    });
    assert.equal(data.total, 9, 'el dataset original tiene 9 puntos, deben renderizarse 9 marcas');
    assert.ok(data.cxValues.every((v) => Number.isFinite(v)), 'todas las marcas deben tener cx numérico');
    assert.ok(data.cyValues.every((v) => Number.isFinite(v)), 'todas las marcas deben tener cy numérico');
    assert.ok(data.radii.every((v) => v > 0), 'todas las marcas deben tener r > 0');
  },
});

tests.push({
  name: 'axes: el eje X muestra etiquetas de edad (rango 20–60)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    const info = await page.evaluate(() => {
      const root = document.querySelector('is-scatter-chart').shadowRoot;
      // Buscamos cualquier tick del eje X: chart.ts usa .tick-label o <text>
      const texts = [...root.querySelectorAll('text')].map((t) => (t.textContent ?? '').trim());
      return {
        texts,
        hasXLabel: texts.some((t) => /20|30|40|50|60/.test(t)),
      };
    });
    assert.ok(info.texts.length > 0, 'debe haber etiquetas <text> en el shadow DOM');
    assert.equal(info.hasXLabel, true, 'alguna etiqueta debe coincidir con valores del rango X (20–60)');
  },
});

tests.push({
  name: 'axes: x-label e y-label aparecen como títulos en el DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    const info = await page.evaluate(() => {
      const root = document.querySelector('is-scatter-chart').shadowRoot;
      const texts = [...root.querySelectorAll('text')].map((t) => (t.textContent ?? '').trim());
      return {
        xAxisLabel: texts.includes('Edad (años)'),
        yAxisLabel: texts.includes('Ingresos (k$)'),
      };
    });
    assert.equal(info.xAxisLabel, true, 'x-label "Edad (años)" debe estar presente');
    assert.equal(info.yAxisLabel, true, 'y-label "Ingresos (k$)" debe estar presente');
  },
});

tests.push({
  name: 'multi-dataset: dos datasets producen marcas sumadas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const el = document.querySelector('is-scatter-chart');
      el.payload = {
        type: 'scatter',
        data: {
          datasets: [
            { label: 'Grupo A', data: [{ x: 1, y: 1 }, { x: 2, y: 4 }] },
            { label: 'Grupo B', data: [{ x: 3, y: 9 }, { x: 4, y: 16 }, { x: 5, y: 25 }] },
          ],
        },
      };
    });
    await page.waitForTimeout(200);
    const total = await page.evaluate(() => {
      return document.querySelector('is-scatter-chart').shadowRoot.querySelectorAll('.mark.mark-point').length;
    });
    assert.equal(total, 5, '5 puntos totales (2 + 3) deben renderizarse');
  },
});

tests.push({
  name: 'no-FOUC: el elemento queda visible al definirlo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scatter-chart-ready');
    const visible = await page.evaluate(() => {
      const el = document.querySelector('is-scatter-chart');
      const cs = getComputedStyle(el);
      return { defined: !!customElements.get('is-scatter-chart'), visibility: cs.visibility };
    });
    assert.equal(visible.defined, true, 'el elemento debe estar definido');
    assert.notEqual(visible.visibility, 'hidden', 'el elemento no debe quedar visibility:hidden tras definir');
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

report('scatter-chart', failures === 0, { total: tests.length, failures });
