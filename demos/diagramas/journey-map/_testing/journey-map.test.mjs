// journey-map.test.mjs — tests exhaustivos del demo journey-map.html.
// Cobertura: smoke (monta y renderiza steps + fases), funcional
// (dataset.stepId), curva de puntajes presente, determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/journey-map/journey-map.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-journey-map> monta y renderiza steps y fases',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-map-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-journey-map'),
        steps: shadow?.querySelectorAll('[data-step-id]').length ?? 0,
        phases: shadow?.querySelectorAll('[data-phase-id]').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.jn-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-journey-map debe estar definido');
    assert.ok(info.steps >= 5, `esperaba >=5 pasos, hay ${info.steps}`);
    assert.ok(info.phases >= 3, `esperaba >=3 fases, hay ${info.phases}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="jn-svg">');
    await screenshot(page, 'journey-map-smoke');
  },
});

tests.push({
  name: 'pasos: cada uno tiene dataset.stepId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-map-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      return [...el.shadowRoot.querySelectorAll('[data-step-id]')].map((g) => g.dataset.stepId);
    });
    assert.ok(ids.includes('s1'), 'debe haber un paso "s1"');
    assert.ok(ids.includes('s5'), 'debe haber un paso "s5"');
  },
});

tests.push({
  name: 'curva: el SVG contiene un path con varios puntos L (curva de puntajes)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-map-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      // Buscar un path con varios comandos (la curva de satisfacción).
      const paths = [...el.shadowRoot.querySelectorAll('svg path')];
      const long = paths.find((p) => {
        const d = p.getAttribute('d') ?? '';
        return d.startsWith('M') && (d.match(/L/g) || []).length >= 4;
      });
      return !!long;
    });
    assert.ok(has, 'debe existir la curva de puntajes con >=4 segmentos L');
  },
});

tests.push({
  name: 'fases: hay bandas horizontales por fase',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-map-ready');
    const phaseIds = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      return [...el.shadowRoot.querySelectorAll('[data-phase-id]')].map((g) => g.dataset.phaseId);
    });
    assert.ok(phaseIds.includes('awareness'), 'debe existir fase "awareness"');
    assert.ok(phaseIds.includes('purchase'), 'debe existir fase "purchase"');
    assert.ok(phaseIds.includes('support'), 'debe existir fase "support"');
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-map-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      return el.shadowRoot.querySelector('svg.jn-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      return el.shadowRoot.querySelector('svg.jn-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-journey-map-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-journey-map');
      const svg = el.shadowRoot.querySelector('svg.jn-svg');
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

report('journey-map', failures === 0, { total: tests.length, failures });