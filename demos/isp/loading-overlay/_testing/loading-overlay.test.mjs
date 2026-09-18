// loading-overlay.test.mjs — tests exhaustivos del demo <is-loading-overlay>.
// Cobertura: smoke + funcional (show/hide/toggle, message visible, scroll-lock,
// is-show/is-hide events) + no dismissable (Escape y backdrop no cierran).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/loading-overlay/loading-overlay.html`;

const tests = [];

tests.push({
  name: 'smoke: overlay monta con backdrop + spinner + message',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-loading-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('overlay');
      const sr = el.shadowRoot;
      return {
        defined: !!customElements.get('is-loading-overlay'),
        backdropPart: !!sr.querySelector('[part="backdrop"]'),
        panelPart: !!sr.querySelector('[part="panel"]'),
        indicatorPart: !!sr.querySelector('[part="indicator"]'),
        messagePart: !!sr.querySelector('[part="message"]'),
        spinner: !!sr.querySelector('is-spinner'),
        backdropHidden: sr.querySelector('[part="backdrop"]')?.hidden,
        ariaModal: sr.querySelector('[part="backdrop"]')?.getAttribute('aria-modal'),
      };
    });
    assert.equal(info.defined, true);
    assert.equal(info.backdropPart, true, '::part(backdrop) debe existir');
    assert.equal(info.panelPart, true, '::part(panel) debe existir');
    assert.equal(info.indicatorPart, true, '::part(indicator) debe existir');
    assert.equal(info.messagePart, true, '::part(message) debe existir');
    assert.equal(info.spinner, true, 'debe haber un <is-spinner> por defecto');
    assert.equal(info.backdropHidden, true, 'backdrop debe estar oculto inicialmente');
    assert.equal(info.ariaModal, 'true', 'backdrop debe tener aria-modal="true"');
    await screenshot(page, 'loading-overlay-smoke');
  },
});

tests.push({
  name: 'funcional: show() muestra el backdrop y emite is-show',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-loading-ready');
    await page.waitForTimeout(150);
    const events = await page.evaluate(async () => {
      const el = document.getElementById('overlay');
      const captured = [];
      el.addEventListener('is-show', (e) => captured.push({ type: 'show', bubbles: e.bubbles, composed: e.composed }));
      el.addEventListener('is-hide', (e) => captured.push({ type: 'hide' }));
      el.show();
      await new Promise((r) => setTimeout(r, 100));
      const after = {
        open: el.open,
        backdropHidden: el.shadowRoot.querySelector('[part="backdrop"]')?.hidden,
        messageText: el.shadowRoot.querySelector('.message-text')?.textContent?.trim(),
      };
      el.hide();
      await new Promise((r) => setTimeout(r, 100));
      const afterHide = {
        open: el.open,
        backdropHidden: el.shadowRoot.querySelector('[part="backdrop"]')?.hidden,
      };
      return { captured, after, afterHide };
    });
    assert.equal(events.after.open, true, 'open debe ser true tras show()');
    assert.equal(events.after.backdropHidden, false, 'backdrop debe estar visible');
    assert.ok(/Guardando/.test(events.after.messageText || ''), `message debe contener 'Guardando', es '${events.after.messageText}'`);
    assert.equal(events.afterHide.open, false);
    assert.equal(events.afterHide.backdropHidden, true, 'backdrop debe ocultarse tras hide()');

    // Eventos
    const showEvents = events.captured.filter((e) => e.type === 'show');
    const hideEvents = events.captured.filter((e) => e.type === 'hide');
    assert.ok(showEvents.length >= 1, 'debe emitir is-show al menos una vez');
    assert.ok(hideEvents.length >= 1, 'debe emitir is-hide al menos una vez');
    assert.equal(showEvents[0].bubbles, true, 'is-show debe burbujear');
    assert.equal(showEvents[0].composed, true, 'is-show debe atravesar shadow DOM');
  },
});

tests.push({
  name: 'no-dismissable: Escape y backdrop no cierran el overlay',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-loading-ready');
    await page.waitForTimeout(100);
    await page.evaluate(() => document.getElementById('overlay').show());
    await page.waitForTimeout(150);
    // Pulsar Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const afterEsc = await page.evaluate(() => ({
      open: document.getElementById('overlay').open,
    }));
    assert.equal(afterEsc.open, true, 'overlay NO debe cerrarse con Escape');
    // Click en el backdrop directamente.
    await page.evaluate(() => {
      const bd = document.getElementById('overlay').shadowRoot.querySelector('[part="backdrop"]');
      bd?.click();
    });
    await page.waitForTimeout(150);
    const afterClick = await page.evaluate(() => ({
      open: document.getElementById('overlay').open,
    }));
    assert.equal(afterClick.open, true, 'overlay NO debe cerrarse con click en backdrop');
    // Limpiar
    await page.evaluate(() => document.getElementById('overlay').hide());
  },
});

tests.push({
  name: 'scroll-lock: open=true bloquea el scroll del documento',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-loading-ready');
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => document.documentElement.style.overflow);
    await page.evaluate(() => {
      const el = document.getElementById('overlay');
      el.scrollLock = true;
      el.show();
    });
    await page.waitForTimeout(150);
    const locked = await page.evaluate(() => document.documentElement.style.overflow);
    assert.equal(locked, 'hidden', `scroll-lock debe poner overflow:hidden en documentElement (era '${before}', ahora '${locked}')`);
    await page.evaluate(() => {
      const el = document.getElementById('overlay');
      el.hide();
    });
    await page.waitForTimeout(150);
    const released = await page.evaluate(() => document.documentElement.style.overflow);
    assert.equal(released, before, `tras hide() debe restaurar overflow (era '${before}', ahora '${released}')`);
  },
});

tests.push({
  name: 'toggle() invierte el estado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-loading-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const el = document.getElementById('overlay');
      const start = el.open;
      el.toggle();
      await new Promise((r) => setTimeout(r, 50));
      const after1 = el.open;
      el.toggle();
      await new Promise((r) => setTimeout(r, 50));
      const after2 = el.open;
      return { start, after1, after2 };
    });
    assert.equal(result.start, false);
    assert.equal(result.after1, !result.start);
    assert.equal(result.after2, result.start);
  });
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

report('loading-overlay', failures === 0, { total: tests.length, failures });
