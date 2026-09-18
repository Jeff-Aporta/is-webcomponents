// dock.test.mjs — tests exhaustivos del demo dock.html.
// Cobertura: smoke + funcional (position attr, items con icon/label/active,
// magnification via --scale, click → is-select, hover sobre item ajusta --scale
// del item cercano) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/dock/dock.html`;

const tests = [];

tests.push({
  name: 'smoke: is-dock + is-dock-item están definidos y los 11 items están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    const data = await page.evaluate(() => {
      const docks = [...document.querySelectorAll('main is-dock')];
      const items = [...document.querySelectorAll('main is-dock-item')];
      return {
        dockDefined: !!customElements.get('is-dock'),
        itemDefined: !!customElements.get('is-dock-item'),
        dockCount: docks.length,
        itemCount: items.length,
        positions: docks.map((d) => d.shadowRoot.querySelector('[part="root"]')?.dataset.position),
        itemsWithLabel: items.filter((i) => i.getAttribute('label')).length,
        itemsWithIcon: items.filter((i) => i.getAttribute('icon')).length,
      };
    });
    assert.equal(data.dockDefined, true, 'is-dock debe estar definido');
    assert.equal(data.itemDefined, true, 'is-dock-item debe estar definido');
    assert.equal(data.dockCount, 3, `esperaba 3 docks, hay ${data.dockCount}`);
    assert.equal(data.itemCount, 11, `esperaba 11 dock-items (5+3+3), hay ${data.itemCount}`);
    assert.deepEqual(data.positions, ['bottom', 'top', 'bottom']);
    assert.equal(data.itemsWithLabel, 11);
    assert.equal(data.itemsWithIcon, 11);
    await screenshot(page, 'dock-smoke');
  },
});

tests.push({
  name: 'funcional: atributo active marca el item activo (.active en el <a>)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    const data = await page.evaluate(() => {
      const home = document.getElementById('item-inicio');
      const search = document.getElementById('item-buscar');
      return {
        homeActive: home.shadowRoot.querySelector('a')?.classList.contains('active'),
        homeHasAttr: home.hasAttribute('active'),
        searchActive: search.shadowRoot.querySelector('a')?.classList.contains('active'),
      };
    });
    assert.equal(data.homeHasAttr, true, 'item-inicio debe tener atributo active');
    assert.equal(data.homeActive, true, 'la <a> interna debe tener clase .active');
    assert.equal(data.searchActive, false, 'item-buscar NO debe estar activo');
  },
});

tests.push({
  name: 'funcional: aria-label + title se reflejan desde el atributo label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    const data = await page.evaluate(() => {
      const item = document.getElementById('item-ajustes');
      const link = item.shadowRoot.querySelector('a');
      return {
        ariaLabel: link?.getAttribute('aria-label'),
        title: link?.getAttribute('title'),
      };
    });
    assert.equal(data.ariaLabel, 'Ajustes', `aria-label debe ser "Ajustes", fue "${data.ariaLabel}"`);
    assert.equal(data.title, 'Ajustes', `title debe ser "Ajustes", fue "${data.title}"`);
  },
});

tests.push({
  name: 'funcional: click en item emite is-select con detail.item',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    await page.evaluate(() => { document.getElementById('log').textContent = ''; });
    await page.evaluate(() => document.getElementById('item-buscar').click());
    await page.waitForTimeout(50);
    const log = await page.evaluate(() => document.getElementById('log').textContent || '');
    assert.match(log, /is-select.*Buscar|is-select\s*←\s*Buscar/,
      `log debe contener "is-select ← Buscar", fue: ${log}`);
  },
});

tests.push({
  name: 'funcional: Enter en item emite click (teclado)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    await page.evaluate(() => { document.getElementById('log').textContent = ''; });
    // El dock-item expone el focus a través del <a> interno (tabindex=0).
    await page.evaluate(() => {
      const item = document.getElementById('item-ayuda');
      item.shadowRoot.querySelector('a').focus();
    });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const log = await page.evaluate(() => document.getElementById('log').textContent || '');
    assert.match(log, /is-select.*Ayuda|is-select\s*←\s*Ayuda/,
      `Enter en item debe emitir is-select, fue: ${log}`);
  },
});

tests.push({
  name: 'funcional: hover sobre un item magnifica (--scale > 1)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    await page.waitForTimeout(200);
    // Hover sobre el item "Mensajes". Movemos el mouse al centro del item
    // y esperamos 2 frames para que requestAnimationFrame del dock dispare.
    const box = await page.evaluate(() => {
      const el = document.getElementById('item-mensajes');
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    // Disparar manualmente pointermove en el dock root por si Playwright no
    // emite pointermove en headless sobre elementos slotted.
    await page.evaluate(() => {
      const dock = document.getElementById('dock-main');
      const r = dock.getBoundingClientRect();
      const item = document.getElementById('item-mensajes');
      const ir = item.getBoundingClientRect();
      dock.shadowRoot.querySelector('[part="root"]').dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: ir.x + ir.width / 2,
          clientY: ir.y + ir.height / 2,
          bubbles: true, composed: true, pointerId: 1,
        }),
      );
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#dock-main is-dock-item')];
      return items.map((i) => parseFloat(i.style.getPropertyValue('--scale')) || 1);
    });
    // Al menos UN item debe tener scale > 1 (la magnificación funciona).
    const maxScale = Math.max(...after);
    assert.ok(maxScale > 1,
      `al menos un item debe tener --scale > 1 (max=${maxScale}, todos: ${after.join(',')})`);
  },
});

tests.push({
  name: 'funcional: pointerleave resetea magnification a 1',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    await page.waitForTimeout(200);
    // Hover sobre un item.
    const box = await page.evaluate(() => {
      const el = document.getElementById('item-buscar');
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(150);
    // Mover el mouse fuera del dock (esquina del viewport).
    await page.mouse.move(10, 10);
    // pointerleave se dispara cuando salimos del host root.
    await page.evaluate(() => {
      const dock = document.getElementById('dock-main');
      dock.shadowRoot.querySelector('[part="root"]').dispatchEvent(
        new PointerEvent('pointerleave', { bubbles: true, composed: true }),
      );
    });
    await page.waitForTimeout(150);
    const scales = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#dock-main is-dock-item')];
      return items.map((i) => i.style.getPropertyValue('--scale'));
    });
    // Después del leave, todos los items deben tener --scale vacío (reset).
    assert.ok(scales.every((s) => !s || s === '' || s === '1'),
      `tras pointerleave, --scale debe estar vacío o "1" para todos, fueron: ${scales.join(', ')}`);
  },
});

tests.push({
  name: 'funcional: position attribute cambia el dataset.position del root',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    const data = await page.evaluate(() => {
      const docks = [...document.querySelectorAll('main is-dock')];
      return docks.map((d) => ({
        attr: d.getAttribute('position'),
        dataPos: d.shadowRoot.querySelector('[part="root"]')?.dataset?.position,
      }));
    });
    for (const d of data) {
      assert.equal(d.attr, d.dataPos,
        `attr(${d.attr}) debe coincidir con data-position(${d.dataPos})`);
    }
  },
});

tests.push({
  name: 'funcional: max-scale / range attributes se leen correctamente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    const data = await page.evaluate(() => {
      const dock = document.getElementById('dock-high');
      return {
        maxScale: dock.getAttribute('max-scale'),
        range: dock.getAttribute('range'),
      };
    });
    assert.equal(data.maxScale, '2.4');
    assert.equal(data.range, '140');
  },
});

tests.push({
  name: 'determinismo: position attribute es reflect y se mantiene',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dock-ready');
    const before = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-dock')].map((d) => ({
        attr: d.getAttribute('position'),
        dataPos: d.shadowRoot.querySelector('[part="root"]')?.dataset?.position,
      }));
    });
    await page.evaluate(() => {
      document.querySelectorAll('main is-dock').forEach((d) => {
        const p = d.getAttribute('position');
        if (p) { d.removeAttribute('position'); d.setAttribute('position', p); }
      });
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-dock')].map((d) => ({
        attr: d.getAttribute('position'),
        dataPos: d.shadowRoot.querySelector('[part="root"]')?.dataset?.position,
      }));
    });
    assert.deepEqual(before, after, 're-asignar position produce el mismo estado');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  let detail = {};
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    detail = { error: String(err?.message ?? err) };
    console.error(`  ✗ ${t.name}\n     ${detail.error}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('dock', failures === 0, { total: tests.length, failures });
