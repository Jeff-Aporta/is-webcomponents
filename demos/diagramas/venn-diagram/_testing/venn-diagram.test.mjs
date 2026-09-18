// venn-diagram.test.mjs — tests exhaustivos del demo venn-diagram.html.
// Cobertura: smoke (monta 3 conjuntos + regiones), funcional (dataset.setId,
// dataset.regionId), etiquetas por región, determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/venn-diagram/venn-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-venn-diagram> monta y renderiza 3 conjuntos + regiones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-venn-diagram'),
        sets: shadow?.querySelectorAll('.vn-set').length ?? 0,
        regions: shadow?.querySelectorAll('[data-region-id]').length ?? 0,
        circles: shadow?.querySelectorAll('circle').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.vn-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-venn-diagram debe estar definido');
    assert.equal(info.sets, 3, `esperaba 3 conjuntos, hay ${info.sets}`);
    assert.equal(info.circles, 3, `esperaba 3 círculos, hay ${info.circles}`);
    assert.ok(info.regions >= 5, `esperaba >=5 regiones, hay ${info.regions}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="vn-svg">');
    await screenshot(page, 'venn-diagram-smoke');
  },
});

tests.push({
  name: 'conjuntos: cada uno tiene dataset.setId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      return [...el.shadowRoot.querySelectorAll('.vn-set')].map((g) => g.dataset.setId);
    });
    assert.ok(ids.includes('frontend'), 'debe existir el conjunto "frontend"');
    assert.ok(ids.includes('backend'), 'debe existir el conjunto "backend"');
    assert.ok(ids.includes('devops'), 'debe existir el conjunto "devops"');
  },
});

tests.push({
  name: 'regiones: cada una tiene dataset.regionId',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-region-id]')].map((g) => g.dataset.regionId);
    });
    assert.ok(ids.includes('r-fe'), 'debe existir la región "r-fe"');
    assert.ok(ids.includes('r-all'), 'debe existir la región "r-all"');
  },
});

tests.push({
  name: 'etiquetas: las regiones muestran sus labels (FullStack, All-rounder, …)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const texts = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      return [...el.shadowRoot.querySelectorAll('text')].map((t) => t.textContent.trim()).join(' | ');
    });
    assert.match(texts, /FullStack/, 'debe aparecer la etiqueta "FullStack"');
    assert.match(texts, /All-rounder/, 'debe aparecer la etiqueta "All-rounder"');
  },
});

tests.push({
  name: 'círculos: cada conjunto tiene un <circle> con cx/cy/r',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const circles = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      return [...el.shadowRoot.querySelectorAll('circle')].map((c) => ({
        cx: c.getAttribute('cx'),
        cy: c.getAttribute('cy'),
        r: c.getAttribute('r'),
      }));
    });
    assert.equal(circles.length, 3, `esperaba 3 círculos, hay ${circles.length}`);
    for (const c of circles) {
      assert.ok(c.cx && c.cy && c.r, `círculo sin geometría: ${JSON.stringify(c)}`);
    }
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      return el.shadowRoot.querySelector('svg.vn-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      return el.shadowRoot.querySelector('svg.vn-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-venn-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-venn-diagram');
      const svg = el.shadowRoot.querySelector('svg.vn-svg');
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

report('venn-diagram', failures === 0, { total: tests.length, failures });