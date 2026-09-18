// tooltip.test.mjs — tests exhaustivos del demo is-tooltip.
// Cobertura: smoke + funcional (hover, focus, click, manual triggers,
// show/hide, Escape/click-fuera en modos interactivos) + aria-describedby
// se aplica al target + eventos is-show/is-hide.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/tooltip/tooltip.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta y el tooltip inicial está oculto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-tooltip');
      return {
        defined: !!customElements.get('is-tooltip'),
        count: all.length,
        allClosed: [...all].every((t) => !t.hasAttribute('open')),
      };
    });
    assert.equal(data.defined, true, 'is-tooltip debe estar definido');
    assert.ok(data.count >= 5, `esperaba >=5 tooltips, hay ${data.count}`);
    assert.equal(data.allClosed, true, 'todos los tooltips deben iniciar cerrados');
    await screenshot(page, 'tooltip-smoke');
  },
});

tests.push({
  name: 'funcional: trigger hover + pointerenter abre el tooltip',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const opened = await page.evaluate(async () => {
      const t = document.getElementById('t1');
      const tip = document.querySelectorAll('is-tooltip')[0];
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
      // showDelay default 150ms
      await new Promise((r) => setTimeout(r, 250));
      return tip.hasAttribute('open');
    });
    assert.equal(opened, true, 'pointerenter debe abrir el tooltip tras showDelay');
  },
});

tests.push({
  name: 'funcional: trigger focus: foco en target abre el tooltip',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('t3').focus());
    await page.waitForTimeout(200);
    const opened = await page.evaluate(() => {
      const tip = document.querySelectorAll('is-tooltip')[2]; // t3
      return tip.hasAttribute('open');
    });
    assert.equal(opened, true, 'focus debe abrir el tooltip (trigger=focus)');
  },
});

tests.push({
  name: 'funcional: trigger focus: blur cierra el tooltip',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('t3').focus());
    await page.waitForTimeout(200);
    const opened = await page.evaluate(() => {
      return document.querySelectorAll('is-tooltip')[2].hasAttribute('open');
    });
    assert.equal(opened, true, 'precondición: focus debe abrir');
    await page.evaluate(() => document.getElementById('t3').blur());
    await page.waitForTimeout(150);
    const closed = await page.evaluate(() => {
      return document.querySelectorAll('is-tooltip')[2].hasAttribute('open');
    });
    assert.equal(closed, false, 'blur debe cerrar el tooltip');
  },
});

tests.push({
  name: 'funcional: trigger click toggle abre/cierra',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const states = await page.evaluate(async () => {
      const t = document.getElementById('t4');
      const tip = document.querySelectorAll('is-tooltip')[3];
      const get = () => tip.hasAttribute('open');
      t.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const a = get();
      t.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const b = get();
      return [a, b];
    });
    assert.equal(states[0], true, 'primer click debe abrir (toggle)');
    assert.equal(states[1], false, 'segundo click debe cerrar (toggle)');
  },
});

tests.push({
  name: 'funcional: trigger manual responde solo a show()/hide()',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const states = await page.evaluate(async () => {
      const tt = document.getElementById('tt5');
      const target = document.getElementById('t5');
      // hover NO debe abrirlo en manual
      target.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 250));
      const afterHover = tt.hasAttribute('open');
      // show() programático
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const afterShow = tt.hasAttribute('open');
      // hide()
      tt.hide();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const afterHide = tt.hasAttribute('open');
      return [afterHover, afterShow, afterHide];
    });
    assert.equal(states[0], false, 'hover NO debe abrir tooltip manual');
    assert.equal(states[1], true, 'show() debe abrir tooltip manual');
    assert.equal(states[2], false, 'hide() debe cerrar tooltip manual');
  },
});

tests.push({
  name: 'eventos: is-show / is-after-show se disparan al abrir',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const seen = await page.evaluate(async () => {
      // Los eventos is-show/is-after-show son bubbles: false (ver tooltip.ts).
      // Hay que escuchar DIRECTAMENTE en el elemento, no en document.
      const tt = document.getElementById('tt5');
      const events = [];
      for (const ev of ['is-show', 'is-after-show', 'is-hide', 'is-after-hide']) {
        tt.addEventListener(ev, () => events.push(ev));
      }
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      tt.hide();
      await new Promise((r) => requestAnimationFrame(() => r()));
      return events;
    });
    assert.ok(seen.includes('is-show'), `esperaba is-show, vi ${JSON.stringify(seen)}`);
    assert.ok(seen.includes('is-after-show'), `esperaba is-after-show, vi ${JSON.stringify(seen)}`);
    assert.ok(seen.includes('is-hide'), `esperaba is-hide, vi ${JSON.stringify(seen)}`);
    assert.ok(seen.includes('is-after-hide'), `esperaba is-after-hide, vi ${JSON.stringify(seen)}`);
  },
});

tests.push({
  name: 'accesibilidad: el target recibe aria-describedby apuntando al tooltip',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const tip = document.querySelectorAll('is-tooltip')[0];
      const t = document.getElementById('t1');
      return {
        tipId: tip.id || tip.shadowRoot?.querySelector('.tooltip')?.id,
        describedBy: t.getAttribute('aria-describedby'),
      };
    });
    assert.ok(info.tipId, `tooltip debe tener id (vimos "${info.tipId}")`);
    assert.ok(info.describedBy, `target debe tener aria-describedby (vimos "${info.describedBy}")`);
    assert.ok(info.describedBy.includes(info.tipId),
      `aria-describedby debe incluir el id del tooltip (describedBy="${info.describedBy}", tipId="${info.tipId}")`);
  },
});

tests.push({
  name: 'funcional: trigger manual cierra con Escape',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const closed = await page.evaluate(async () => {
      const tt = document.getElementById('tt5');
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      // Disparar Escape desde document (createPopupDismiss escucha keydown)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 100));
      return tt.hasAttribute('open');
    });
    assert.equal(closed, false, `Escape debe cerrar el tooltip manual (vimos open=${closed})`);
  },
});

let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('tooltip', failures === 0, { total: tests.length, failures });
