// heading.test.mjs — tests exhaustivos del demo <is-heading>.
// Cobertura: smoke + funcional (level 1-6 produce h1-h6, color semántico,
// mix y size custom, current hereda color) + computedMix.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/heading/heading.html`;

const tests = [];

tests.push({
  name: 'smoke: headings renderizan con tag hN correcto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heading-ready');
    const info = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('is-heading')];
      const tags = headings.map((h) => {
        const sr = h.shadowRoot;
        const el = sr?.querySelector('h1, h2, h3, h4, h5, h6');
        return { tag: el?.tagName, level: h.level };
      });
      return {
        defined: !!customElements.get('is-heading'),
        count: headings.length,
        tags,
      };
    });
    assert.equal(info.defined, true);
    assert.ok(info.count >= 20, `esperaba >=20 headings, hay ${info.count}`);
    // Verificar que hay al menos un h1-h6.
    const tags = new Set(info.tags.map((t) => t.tag));
    for (const tag of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
      assert.ok(tags.has(tag), `debe haber al menos un ${tag}`);
    }
    await screenshot(page, 'heading-smoke');
  },
});

tests.push({
  name: 'funcional: cambiar level reemplaza el hN del shadow',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heading-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const h = document.createElement('is-heading');
      h.textContent = 'Dinámico';
      document.body.appendChild(h);
      const tag1 = h.shadowRoot.querySelector('h1')?.tagName;
      h.level = '4';
      const tag4 = h.shadowRoot.querySelector('h4')?.tagName;
      h.level = 'invalid';
      const fallback = h.shadowRoot.querySelector('h1')?.tagName; // debe caer a 1
      h.remove();
      return { tag1, tag4, fallback };
    });
    assert.equal(result.tag1, 'H1');
    assert.equal(result.tag4, 'H4');
    assert.equal(result.fallback, 'H1', 'level inválido debe caer a 1');
  },
});

tests.push({
  name: 'funcional: computedMix devuelve default del nivel si no hay mix explícito',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heading-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const h1 = document.createElement('is-heading');
      h1.level = '1';
      document.body.appendChild(h1);
      const h3 = document.createElement('is-heading');
      h3.level = '3';
      h3.mix = '45%';
      document.body.appendChild(h3);
      const r = {
        h1Default: h1.computedMix,
        h3Explicit: h3.computedMix,
        colorKindH1: h1.colorKind,
      };
      h1.remove(); h3.remove();
      return r;
    });
    assert.equal(result.h1Default, '15%', `default level 1 debe ser '15%', es '${result.h1Default}'`);
    assert.equal(result.h3Explicit, '45%');
    assert.equal(result.colorKindH1, 'none', 'sin color, colorKind debe ser none');
  },
});

tests.push({
  name: 'funcional: size custom se aplica como --is-heading-size en host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heading-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const h = document.createElement('is-heading');
      h.size = '2.5rem';
      document.body.appendChild(h);
      const varValue = h.style.getPropertyValue('--is-heading-size');
      const r = { varValue, attrValue: h.getAttribute('size') };
      h.remove();
      return r;
    });
    assert.equal(result.attrValue, '2.5rem');
    assert.equal(result.varValue, '2.5rem');
  },
});

tests.push({
  name: 'funcional: color semántico activa colorKind=semantic; CSS arbitrario → kind=css',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heading-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const h1 = document.createElement('is-heading');
      h1.color = 'success';
      document.body.appendChild(h1);
      const h2 = document.createElement('is-heading');
      h2.color = '#abcdef';
      document.body.appendChild(h2);
      const h3 = document.createElement('is-heading');
      h3.color = 'current';
      document.body.appendChild(h3);
      const r = {
        kind1: h1.colorKind,
        kind2: h2.colorKind,
        kind3: h3.colorKind,
      };
      [h1, h2, h3].forEach((h) => h.remove());
      return r;
    });
    assert.equal(result.kind1, 'semantic');
    assert.equal(result.kind2, 'css');
    assert.equal(result.kind3, 'current');
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

report('heading', failures === 0, { total: tests.length, failures });
