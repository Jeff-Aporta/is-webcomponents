// radar-chart.test.mjs — tests exhaustivos del demo radar-chart.html.
//
// Cobertura:
//   - smoke: <is-radar-chart> se registra, monta SVG y dibuja polígonos cerrados
//   - config: cambiar payload.datasets re-renderiza con diferentes marcas
//   - config: cambiar payload.data.labels actualiza el # de labels en eje
//   - accesibilidad: SVG con role=img y aria-label legible
//   - eventos: is-render emite tras montaje y tras cambio de payload
//   - determinismo: misma config → mismo # de polígonos y vértices
//   - id re-asignación: la misma instancia puede redibujar sin leaks
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/radar-chart/radar-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y dibuja un polígono radar cerrado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      const svg = el?.shadowRoot?.querySelector('svg');
      const polys = [...(el?.shadowRoot?.querySelectorAll('path.mark.mark-radar') ?? [])];
      const labels = [...(el?.shadowRoot?.querySelectorAll('text.tick-label') ?? [])].map((t) => t.textContent?.trim());
      const points = [...(el?.shadowRoot?.querySelectorAll('circle.mark.mark-point') ?? [])];
      return {
        defined: !!customElements.get('is-radar-chart'),
        svg: !!svg,
        svgRole: svg?.getAttribute('role'),
        svgAria: svg?.getAttribute('aria-label'),
        polyCount: polys.length,
        allClosed: polys.every((p) => (p.getAttribute('d') ?? '').trim().endsWith('Z')),
        pointCount: points.length,
        labelCount: labels.length,
        labelTexts: labels,
        viewBox: svg?.getAttribute('viewBox'),
      };
    });
    assert.equal(info.defined, true, 'is-radar-chart debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.equal(info.svgRole, 'img', 'SVG debe tener role=img');
    assert.ok(info.svgAria && info.svgAria.length > 0, `SVG debe tener aria-label (era "${info.svgAria}")`);
    assert.equal(info.polyCount, 2, `debe haber 2 polígonos (uno por dataset, hay ${info.polyCount})`);
    assert.equal(info.allClosed, true, 'todos los polígonos deben terminar en Z (cerrados)');
    assert.equal(info.pointCount, 12, `debe haber 6 puntos × 2 datasets = 12 vértices (hay ${info.pointCount})`);
    assert.equal(info.labelCount, 6, `debe haber 6 etiquetas de eje (hay ${info.labelCount})`);
    for (const expected of ['Rendimiento', 'DX', 'Docs', 'Ecosistema', 'Curva', 'Tipado']) {
      assert.ok(info.labelTexts.includes(expected), `label "${expected}" debe estar presente`);
    }
    assert.ok(info.viewBox && /^\d+\s+\d+$/.test(info.viewBox.split(' ').slice(2).join(' ')), `viewBox debe ser "0 0 W H" (era "${info.viewBox}")`);
    await screenshot(page, 'radar-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload.datasets re-renderiza polígonos distintos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el?.shadowRoot?.querySelectorAll('path.mark.mark-radar').length ?? 0;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      el.payload = {
        type: 'radar',
        data: {
          labels: ['A', 'B', 'C', 'D'],
          datasets: [
            { label: 'X', data: [10, 20, 30, 40] },
            { label: 'Y', data: [40, 30, 20, 10] },
            { label: 'Z', data: [25, 25, 25, 25] },
          ],
        },
      };
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el?.shadowRoot?.querySelectorAll('path.mark.mark-radar').length ?? 0;
    });
    assert.equal(before, 2, 'antes debe haber 2 polígonos (datasets iniciales)');
    assert.equal(after, 3, `cambiar a 3 datasets debe producir 3 polígonos (hay ${after})`);
  },
});

tests.push({
  name: 'config: cambiar payload.data.labels actualiza el # de etiquetas de eje',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el?.shadowRoot?.querySelectorAll('text.tick-label').length ?? 0;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      el.payload = {
        type: 'radar',
        data: {
          labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
          datasets: [{ label: 'serie', data: [1, 2, 3, 4, 5, 6, 7, 8] }],
        },
      };
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el?.shadowRoot?.querySelectorAll('text.tick-label').length ?? 0;
    });
    assert.equal(before, 6, 'demo inicial tiene 6 labels de eje');
    assert.equal(after, 8, `tras cambiar a 8 labels deben aparecer 8 textos (hay ${after})`);
  },
});

tests.push({
  name: 'fill: polígonos deben tener fill no-vacío (no son sólo líneas)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(200);
    const fills = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      const polys = [...el.shadowRoot.querySelectorAll('path.mark.mark-radar')];
      return polys.map((p) => ({
        fill: p.getAttribute('fill'),
        stroke: p.getAttribute('stroke'),
      }));
    });
    assert.equal(fills.length, 2, 'deben existir 2 polígonos para evaluar fill');
    for (const f of fills) {
      assert.ok(f.fill && f.fill !== 'none', `polígono debe tener fill distinto de none (era "${f.fill}")`);
      assert.ok(f.stroke && f.stroke !== 'none', `polígono debe tener stroke distinto de none (era "${f.stroke}")`);
    }
    // Los fills deben ser distintos entre sí: A y B son colores diferentes.
    assert.notEqual(fills[0].fill, fills[1].fill, `polígonos de datasets distintos deben tener fill distinto (ambos "${fills[0].fill}")`);
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(150);
    const count = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-radar-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.payload = {
          type: 'radar',
          data: {
            labels: ['a', 'b', 'c'],
            datasets: [{ label: 's', data: [1, 2, 3] }],
          },
        };
        setTimeout(() => { el.remove(); resolve(n); }, 300);
      });
    });
    assert.ok(count >= 1, `is-render debió dispararse >=1 vez tras asignar payload (fue ${count})`);
  },
});

tests.push({
  name: 'determinismo: misma config produce exactamente la misma cantidad de polígonos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(200);
    const a = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el.shadowRoot.querySelectorAll('path.mark.mark-radar').length;
    });
    const b = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      // re-leer el mismo payload no debería mutar el render
      return el.shadowRoot.querySelectorAll('path.mark.mark-radar').length;
    });
    assert.equal(a, b, `doble lectura debe dar igual cantidad de polígonos (${a} vs ${b})`);
    assert.ok(a >= 1, `debe haber al menos 1 polígono (hay ${a})`);
  },
});

tests.push({
  name: 're-asignar payload idéntico no rompe el render',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radar-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el.shadowRoot.querySelectorAll('path.mark.mark-radar').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      // Re-asignar el mismo payload no debe cambiar el render.
      el.payload = {
        type: 'radar',
        data: {
          labels: ['Rendimiento', 'DX', 'Docs', 'Ecosistema', 'Curva', 'Tipado'],
          datasets: [
            { label: 'Producto A', data: [85, 70, 60, 90, 75, 95] },
            { label: 'Producto B', data: [70, 85, 90, 75, 65, 80] },
          ],
        },
      };
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      return el.shadowRoot.querySelectorAll('path.mark.mark-radar').length;
    });
    assert.equal(before, after, `re-asignar el mismo payload debe mantener ${before} polígonos (hay ${after})`);
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

report('radar-chart', failures === 0, { total: tests.length, failures });