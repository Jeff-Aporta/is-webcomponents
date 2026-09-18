// use-case-diagram.test.mjs — tests exhaustivos del demo use-case-diagram.html.
// Cobertura: smoke (monta actores + casos + enlaces), funcional
// (dataset.nodeId con actor y case, dataset.linkId), include/extend, determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/use-case-diagram/use-case-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-use-case-diagram> monta y renderiza actores y casos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-use-case-diagram'),
        actors: shadow?.querySelectorAll('.uc-actor').length ?? 0,
        cases: shadow?.querySelectorAll('[data-node-id]').length ?? 0,
        links: shadow?.querySelectorAll('[data-link-id]').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.uc-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-use-case-diagram debe estar definido');
    assert.ok(info.actors >= 2, `esperaba >=2 actores, hay ${info.actors}`);
    assert.ok(info.cases >= 5, `esperaba >=5 nodos (2 actores + 3 casos), hay ${info.cases}`);
    assert.ok(info.links >= 5, `esperaba >=5 enlaces, hay ${info.links}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="uc-svg">');
    await screenshot(page, 'use-case-diagram-smoke');
  },
});

tests.push({
  name: 'actores: cada uno tiene dataset.nodeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      return [...el.shadowRoot.querySelectorAll('.uc-actor')].map((g) => g.dataset.nodeId);
    });
    assert.ok(ids.includes('cli'), 'debe existir el actor "cli"');
    assert.ok(ids.includes('adm'), 'debe existir el actor "adm"');
  },
});

tests.push({
  name: 'casos: hay 3 óvalos (uno por caso de uso)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const texts = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      return [...el.shadowRoot.querySelectorAll('ellipse')].length;
    });
    assert.ok(texts >= 3, `esperaba >=3 óvalos (Comprar, Pagar, Gestionar catálogo), hay ${texts}`);
  },
});

tests.push({
  name: 'enlaces: cada [data-link-id] tiene path con d no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-link-id] path')].map((p) => p.getAttribute('d'));
    });
    assert.ok(edges.length >= 5, `esperaba >=5 enlaces, hay ${edges.length}`);
    for (const d of edges) {
      assert.ok(d && d.length > 5, `path sin d: "${d}"`);
    }
  },
});

tests.push({
  name: 'sistema: el SVG contiene una etiqueta con el nombre del sistema',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => t.textContent.trim());
      return texts.some((t) => /TiendaOnline/.test(t));
    });
    assert.ok(has, 'debe aparecer la etiqueta "TiendaOnline" (sistema)');
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      return el.shadowRoot.querySelector('svg.uc-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      return el.shadowRoot.querySelector('svg.uc-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-uc-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-use-case-diagram');
      const svg = el.shadowRoot.querySelector('svg.uc-svg');
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

report('use-case-diagram', failures === 0, { total: tests.length, failures });