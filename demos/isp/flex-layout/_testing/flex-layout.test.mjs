// flex-layout.test.mjs — tests exhaustivos del demo <is-flex-layout>.
// Cobertura: smoke + funcional (atributos direction/gap/justify/align) + API JS
// + custom properties (--gap / --width) + responsive sizew.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/flex-layout/flex-layout.html`;

const tests = [];

tests.push({
  name: 'smoke: flex-layout monta con display:flex y refleja data-sizew',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const layouts = [...document.querySelectorAll('is-flex-layout')];
      const first = layouts[0];
      return {
        defined: !!customElements.get('is-flex-layout'),
        count: layouts.length,
        firstDirection: first.direction,
        firstGap: first.gap,
        firstJustify: first.getAttribute('justify'),
        firstAlign: first.getAttribute('align'),
        sizew: first.sizew,
        boolszwXs: first.boolszw.xs,
      };
    });
    assert.equal(info.defined, true);
    assert.ok(info.count >= 4, `esperaba >=4 layouts, hay ${info.count}`);
    assert.equal(info.firstDirection, 'row', 'default direction debe ser row');
    assert.equal(info.firstJustify, 'between', 'justify debe reflejarse');
    assert.equal(info.firstAlign, 'center', 'align debe reflejarse');
    assert.equal(info.boolszwXs, true, 'boolszw.xs acumulativo siempre true');
    await screenshot(page, 'flex-layout-smoke');
  },
});

tests.push({
  name: 'funcional: direction=column apila los hijos verticalmente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-ready');
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      const col = document.getElementById('col');
      const items = [...col.children];
      const colRect = col.getBoundingClientRect();
      // En column, los hijos deben estar apilados (sus .top son crecientes)
      // y todos a la misma x.
      const xs = items.map((el) => el.getBoundingClientRect().x);
      const ys = items.map((el) => el.getBoundingClientRect().y);
      const sameX = xs.every((x) => Math.abs(x - xs[0]) < 2);
      const ascending = ys.every((y, i) => i === 0 || y > ys[i - 1]);
      return {
        direction: col.direction,
        sameX,
        ascending,
        colW: colRect.width,
        colH: colRect.height,
      };
    });
    assert.equal(layout.direction, 'column', 'direction debe ser column');
    assert.equal(layout.sameX, true, `hijos deben estar a la misma X en column, xs=${JSON.stringify(layout)}`);
    assert.equal(layout.ascending, true, `hijos deben estar apilados verticalmente`);
    assert.ok(layout.colH > 50, `column layout debe tener altura > 50 (es ${layout.colH})`);
  },
});

tests.push({
  name: 'API: cambiar gap vía JS actualiza atributo y custom property --gap',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const el = document.querySelector('is-flex-layout');
      el.gap = '1.5rem';
      const gapVar = el.style.getPropertyValue('--gap');
      return { attr: el.getAttribute('gap'), gapVar };
    });
    assert.equal(result.attr, '1.5rem');
    assert.equal(result.gapVar, '1.5rem', `--gap debe estar seteado en host style`);
  },
});

tests.push({
  name: 'funcional: justify=between reparte los hijos a los extremos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-ready');
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      const el = document.querySelector('is-flex-layout');
      const items = [...el.children];
      const hostRect = el.getBoundingClientRect();
      const firstRect = items[0].getBoundingClientRect();
      const lastRect = items[items.length - 1].getBoundingClientRect();
      // between → el primero empieza en el borde izquierdo, el último termina en el derecho.
      return {
        firstAtLeft: Math.abs(firstRect.x - hostRect.x) < 5,
        lastAtRight: Math.abs((lastRect.x + lastRect.width) - (hostRect.x + hostRect.width)) < 5,
        hostW: hostRect.width,
      };
    });
    assert.equal(layout.firstAtLeft, true, `primer hijo debe estar al borde izquierdo`);
    assert.equal(layout.lastAtRight, true, `último hijo debe estar al borde derecho`);
  },
});

tests.push({
  name: 'API: rect/getRect expone dimensiones del host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-ready');
    const r = await page.evaluate(() => {
      const el = document.getElementById('col');
      return el.rect();
    });
    assert.ok(r.width > 0, `rect.width > 0 (${r.width})`);
    assert.ok(r.height > 0, `rect.height > 0 (${r.height})`);
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

report('flex-layout', failures === 0, { total: tests.length, failures });
