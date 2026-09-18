// swimlane-diagram.test.mjs — tests exhaustivos del demo swimlane-diagram.html.
// Cobertura: smoke (monta lanes + steps + links), funcional
// (dataset.laneId, dataset.stepId, dataset.linkId), determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/swimlane-diagram/swimlane-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-swimlane-diagram> monta y renderiza lanes, steps y links',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-swimlane-diagram'),
        lanes: shadow?.querySelectorAll('[data-lane-id]').length ?? 0,
        steps: shadow?.querySelectorAll('[data-step-id]').length ?? 0,
        links: shadow?.querySelectorAll('[data-link-id]').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.sw-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-swimlane-diagram debe estar definido');
    assert.ok(info.lanes >= 3, `esperaba >=3 carriles, hay ${info.lanes}`);
    assert.ok(info.steps >= 5, `esperaba >=5 pasos, hay ${info.steps}`);
    assert.ok(info.links >= 5, `esperaba >=5 enlaces, hay ${info.links}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="sw-svg">');
    await screenshot(page, 'swimlane-diagram-smoke');
  },
});

tests.push({
  name: 'lanes: cada uno tiene dataset.laneId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-lane-id]')].map((g) => g.dataset.laneId);
    });
    assert.ok(ids.includes('cliente'), 'debe existir el carril "cliente"');
    assert.ok(ids.includes('soporte'), 'debe existir el carril "soporte"');
    assert.ok(ids.includes('sistema'), 'debe existir el carril "sistema"');
  },
});

tests.push({
  name: 'steps: cada uno tiene dataset.stepId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-step-id]')].map((g) => g.dataset.stepId);
    });
    assert.ok(ids.includes('s1'), 'debe existir el paso "s1"');
    assert.ok(ids.includes('s5'), 'debe existir el paso "s5"');
  },
});

tests.push({
  name: 'links: cada uno tiene dataset.linkId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-link-id]')].map((g) => g.dataset.linkId);
    });
    assert.ok(ids.includes('l1'), 'debe existir el enlace "l1"');
    assert.ok(ids.includes('l5'), 'debe existir el enlace "l5"');
  },
});

tests.push({
  name: 'aristas: cada [data-link-id] tiene path con d no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-link-id] path')].map((p) => p.getAttribute('d'));
    });
    assert.ok(edges.length >= 5, `esperaba >=5 aristas, hay ${edges.length}`);
    for (const d of edges) {
      assert.ok(d && d.length > 5, `path sin d: "${d}"`);
    }
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      return el.shadowRoot.querySelector('svg.sw-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      return el.shadowRoot.querySelector('svg.sw-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-swimlane-diagram');
      const svg = el.shadowRoot.querySelector('svg.sw-svg');
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

report('swimlane-diagram', failures === 0, { total: tests.length, failures });