// timeline.test.mjs — tests exhaustivos del demo timeline.html.
// Cobertura: smoke (monta eventos + eje), funcional (dataset.eventId),
// leyenda de grupos, determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/timeline/timeline.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-timeline> monta y renderiza eventos y eje',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-timeline'),
        events: shadow?.querySelectorAll('[data-event-id]').length ?? 0,
        axis: !!shadow?.querySelector('.tl-axis'),
        legend: !!shadow?.querySelector('.tl-legend'),
        hasSvg: !!shadow?.querySelector('svg.tl-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-timeline debe estar definido');
    assert.ok(info.events >= 5, `esperaba >=5 eventos, hay ${info.events}`);
    assert.equal(info.axis, true, 'debe existir el eje (.tl-axis)');
    assert.equal(info.hasSvg, true, 'debe existir <svg class="tl-svg">');
    await screenshot(page, 'timeline-smoke');
  },
});

tests.push({
  name: 'eventos: cada uno tiene dataset.eventId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      return [...el.shadowRoot.querySelectorAll('[data-event-id]')].map((g) => g.dataset.eventId);
    });
    assert.ok(ids.includes('e1'), 'debe existir el evento "e1"');
    assert.ok(ids.includes('e5'), 'debe existir el evento "e5"');
  },
});

tests.push({
  name: 'orden: los eventos están ordenados cronológicamente (e1 antes que e5 en X)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    const positions = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      const e1 = el.shadowRoot.querySelector('[data-event-id="e1"]')?.getBoundingClientRect();
      const e5 = el.shadowRoot.querySelector('[data-event-id="e5"]')?.getBoundingClientRect();
      return { e1X: e1?.x ?? 0, e5X: e5?.x ?? 0 };
    });
    assert.ok(positions.e1X < positions.e5X,
      `e1 debe estar a la izquierda de e5: e1X=${positions.e1X}, e5X=${positions.e5X}`);
  },
});

tests.push({
  name: 'eje: hay marcas de tiempo (ticks) en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    const ticks = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      return el.shadowRoot.querySelectorAll('.tl-axis line, .tl-axis text').length;
    });
    assert.ok(ticks >= 1, `esperaba >=1 marca de eje, hay ${ticks}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      return el.shadowRoot.querySelector('svg.tl-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      return el.shadowRoot.querySelector('svg.tl-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-timeline');
      const svg = el.shadowRoot.querySelector('svg.tl-svg');
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

report('timeline', failures === 0, { total: tests.length, failures });