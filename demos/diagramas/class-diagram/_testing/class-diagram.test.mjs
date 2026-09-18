// class-diagram.test.mjs — tests exhaustivos del demo class-diagram.html.
// Cobertura: smoke (monta y renderiza clases y relaciones), funcional
// (atributos/métodos, secciones, kind=inheritance/composition),
// determinismo, accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/class-diagram/class-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-class-diagram> monta y renderiza clases y relaciones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-class-diagram-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-class-diagram'),
        classCount: shadow?.querySelectorAll('.cls-node').length ?? 0,
        edgeCount: shadow?.querySelectorAll('.cls-rel').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.cls-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-class-diagram debe estar definido');
    assert.ok(info.classCount >= 3, `esperaba >=3 clases, hay ${info.classCount}`);
    assert.ok(info.edgeCount >= 2, `esperaba >=2 relaciones, hay ${info.edgeCount}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="cls-svg">');
    await screenshot(page, 'class-diagram-smoke');
  },
});

tests.push({
  name: 'clases: cada clase tiene dataset.nodeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-class-diagram-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      return [...el.shadowRoot.querySelectorAll('.cls-node')].map((g) => g.dataset.nodeId);
    });
    assert.ok(ids.includes('animal'), 'debe haber una clase "animal"');
    assert.ok(ids.includes('perro'), 'debe haber una clase "perro"');
    assert.ok(ids.includes('cola'), 'debe haber una clase "cola"');
  },
});

tests.push({
  name: 'secciones: la clase "Perro" muestra sus atributos y métodos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-class-diagram-ready');
    const texts = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      const perro = el.shadowRoot.querySelector('.cls-node[data-node-id="perro"]');
      return perro ? perro.textContent : '';
    });
    assert.match(texts, /raza/, 'debe aparecer el atributo "raza"');
    assert.match(texts, /ladrar/, 'debe aparecer el método "ladrar"');
  },
});

tests.push({
  name: 'relaciones: cada arista tiene dataset.edgeId y path con d',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-class-diagram-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      return [...el.shadowRoot.querySelectorAll('.cls-rel')].map((g) => ({
        id: g.dataset.edgeId,
        d: g.querySelector('path')?.getAttribute('d'),
      }));
    });
    assert.ok(edges.length >= 2, `esperaba >=2 aristas, hay ${edges.length}`);
    for (const e of edges) {
      assert.ok(e.id, 'cada arista debe tener dataset.edgeId');
      assert.ok(e.d && e.d.length > 3, `arista ${e.id} sin path d`);
    }
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-class-diagram-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      return el.shadowRoot.querySelector('svg.cls-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      return el.shadowRoot.querySelector('svg.cls-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-class-diagram-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-class-diagram');
      const svg = el.shadowRoot.querySelector('svg.cls-svg');
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

report('class-diagram', failures === 0, { total: tests.length, failures });