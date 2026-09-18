// bubble-chart.test.mjs — tests exhaustivos del demo bubble-chart.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/bubble-chart/bubble-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-bubble-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      return {
        defined: !!customElements.get('is-bubble-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        markClasses: [...marks].map((m) => m.getAttribute('class')),
      };
    });
    assert.equal(info.defined, true, 'is-bubble-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(
      info.markClasses.every((c) => c && c.includes('mark')),
      'cada marca debe tener la clase .mark',
    );
    await screenshot(page, 'bubble-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      return document.querySelector('is-bubble-chart').shadowRoot.querySelectorAll('.mark.mark-bubble').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-bubble-chart');
      el.payload = {
        type: 'bubble',
        data: {
          datasets: [{
            label: 'Pocos puntos',
            data: [
              { x: 10, y: 20, r: 8 },
              { x: 30, y: 40, r: 16 },
              { x: 50, y: 60, r: 24 },
            ],
          }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      return document.querySelector('is-bubble-chart').shadowRoot.querySelectorAll('.mark.mark-bubble').length;
    });
    assert.notEqual(after, before, `re-asignar payload debe cambiar el render (before=${before}, after=${after})`);
    assert.equal(after, 3, 'el nuevo dataset tiene 3 burbujas');
  },
});

tests.push({
  name: 'marks: cada burbuja tiene un radio r derivado del data',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    const radii = await page.evaluate(() => {
      const root = document.querySelector('is-bubble-chart').shadowRoot;
      return [...root.querySelectorAll('.mark.mark-bubble')].map((m) => Number(m.getAttribute('r')));
    });
    assert.equal(radii.length, 8, 'el dataset original tiene 8 burbujas, deben renderizarse 8');
    assert.ok(radii.every((r) => Number.isFinite(r) && r >= 2), `cada r debe ser finito y >=2, hay ${JSON.stringify(radii)}`);
    // Distintos radios esperados del dataset: [12, 18, 24, 30, 36, 42, 28, 38]
    const uniqueRadii = new Set(radii);
    assert.ok(uniqueRadii.size >= 5, `los radios deben ser heterogéneos (>=5 valores distintos), hay ${uniqueRadii.size}`);
  },
});

tests.push({
  name: 'bubble vs scatter: el radio efectivo NO es constante (diferencia de bubble)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    const radii = await page.evaluate(() => {
      const root = document.querySelector('is-bubble-chart').shadowRoot;
      return [...root.querySelectorAll('.mark.mark-bubble')].map((m) => Number(m.getAttribute('r')));
    });
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);
    assert.ok(maxR > minR, `bubble debe tener radios variables (min=${minR}, max=${maxR})`);
    assert.ok(maxR - minR >= 10, `la diferencia entre radios debe ser >= 10px (got ${maxR - minR})`);
  },
});

tests.push({
  name: 'axes: x-label e y-label aparecen como títulos en el DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    const info = await page.evaluate(() => {
      const root = document.querySelector('is-bubble-chart').shadowRoot;
      const texts = [...root.querySelectorAll('text')].map((t) => (t.textContent ?? '').trim());
      return {
        xAxisLabel: texts.includes('Población (M)'),
        yAxisLabel: texts.includes('PIB per cápita (k$)'),
      };
    });
    assert.equal(info.xAxisLabel, true, 'x-label "Población (M)" debe estar presente');
    assert.equal(info.yAxisLabel, true, 'y-label "PIB per cápita (k$)" debe estar presente');
  },
});

tests.push({
  name: 'multi-dataset: dos datasets producen marcas sumadas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const el = document.querySelector('is-bubble-chart');
      el.payload = {
        type: 'bubble',
        data: {
          datasets: [
            { label: 'Norte', data: [{ x: 1, y: 10, r: 8 }, { x: 2, y: 20, r: 16 }] },
            { label: 'Sur', data: [{ x: 3, y: 30, r: 24 }, { x: 4, y: 40, r: 32 }, { x: 5, y: 50, r: 40 }] },
          ],
        },
      };
    });
    await page.waitForTimeout(200);
    const total = await page.evaluate(() => {
      return document.querySelector('is-bubble-chart').shadowRoot.querySelectorAll('.mark.mark-bubble').length;
    });
    assert.equal(total, 5, '5 burbujas totales (2 + 3) deben renderizarse');
  },
});

tests.push({
  name: 'bubble-shape: cada marca es <circle> con stroke (no relleno plano)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-bubble-chart-ready');
    const info = await page.evaluate(() => {
      const root = document.querySelector('is-bubble-chart').shadowRoot;
      const bubbles = [...root.querySelectorAll('.mark.mark-bubble')];
      return {
        allCircles: bubbles.every((m) => m.tagName.toLowerCase() === 'circle'),
        allHaveStroke: bubbles.every((m) => m.getAttribute('stroke') && m.getAttribute('stroke').length > 0),
        sampleCx: bubbles[0]?.getAttribute('cx') ?? null,
      };
    });
    assert.equal(info.allCircles, true, 'todas las marcas bubble deben ser <circle>');
    assert.equal(info.allHaveStroke, true, 'cada burbuja debe tener stroke definido (borderColor)');
    assert.ok(info.sampleCx, 'cx debe estar definido en la primera burbuja');
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

report('bubble-chart', failures === 0, { total: tests.length, failures });
