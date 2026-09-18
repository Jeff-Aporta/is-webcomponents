// quadrant-chart.test.mjs — tests exhaustivos del demo quadrant-chart.html.
// Cobertura: smoke (monta y renderiza puntos + ejes), funcional
// (dataset.pointId, leyenda), determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/quadrant-chart/quadrant-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-quadrant-chart> monta y renderiza puntos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-quadrant-chart'),
        points: shadow?.querySelectorAll('[data-point-id]').length ?? 0,
        legend: !!shadow?.querySelector('.qd-legend'),
        hasSvg: !!shadow?.querySelector('svg.qd-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-quadrant-chart debe estar definido');
    assert.ok(info.points >= 5, `esperaba >=5 puntos, hay ${info.points}`);
    assert.equal(info.legend, true, 'debe existir la leyenda');
    assert.equal(info.hasSvg, true, 'debe existir <svg class="qd-svg">');
    await screenshot(page, 'quadrant-chart-smoke');
  },
});

tests.push({
  name: 'puntos: cada uno tiene dataset.pointId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      return [...el.shadowRoot.querySelectorAll('[data-point-id]')].map((g) => g.dataset.pointId);
    });
    assert.ok(ids.includes('p1'), 'debe existir punto "p1"');
    assert.ok(ids.includes('p5'), 'debe existir punto "p5"');
  },
});

tests.push({
  name: 'ejes: hay etiquetas para xAxis e yAxis',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => t.textContent.trim());
      return {
        x: texts.some((t) => /esfuerzo/i.test(t)),
        y: texts.some((t) => /impacto/i.test(t)),
      };
    });
    assert.equal(has.x, true, 'debe haber una etiqueta con "esfuerzo"');
    assert.equal(has.y, true, 'debe haber una etiqueta con "impacto"');
  },
});

tests.push({
  name: 'cuadrantes: el SVG contiene 4 etiquetas de cuadrante (en mayúsculas)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const labels = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => t.textContent.trim());
      // El renderer pone el nombre en mayúsculas (`.toUpperCase()`).
      return texts.filter((t) => /QUICK WINS|PROYECTOS|RELLENO|THANKLESS/.test(t));
    });
    assert.equal(labels.length, 4, `esperaba 4 etiquetas de cuadrante, hay ${labels.length}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      return el.shadowRoot.querySelector('svg.qd-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      return el.shadowRoot.querySelector('svg.qd-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-quadrant-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-quadrant-chart');
      const svg = el.shadowRoot.querySelector('svg.qd-svg');
      return { aria: svg.getAttribute('aria-label'), role: svg.getAttribute('role') };
    });
    assert.ok(meta.aria && meta.aria.length > 0, 'debe llevar aria-label');
    assert.equal(meta.role, 'img', 'role debe ser img');
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

report('quadrant-chart', failures === 0, { total: tests.length, failures });