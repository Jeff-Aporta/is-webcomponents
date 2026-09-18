// palette-selector.test.mjs — tests exhaustivos del demo is-palette-selector.
// Cobertura: smoke + funcional (default palettes, custom palettes via JSON,
// persistencia localStorage, evento is-palette-change) + focus mgmt +
// accesibilidad básica.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/palette-selector/palette-selector.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con las 3 paletas por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    const data = await page.evaluate(() => {
      const sel = document.querySelector('is-palette-selector');
      const root = sel.shadowRoot;
      const opts = root.querySelectorAll('[role="option"]');
      return {
        defined: !!customElements.get('is-palette-selector'),
        palettes: sel.palettes,
        optionCount: opts.length,
        values: [...opts].map((o) => o.dataset.palette),
      };
    });
    assert.equal(data.defined, true, 'is-palette-selector debe estar definido');
    assert.equal(data.optionCount, 3, `esperaba 3 paletas por defecto, hay ${data.optionCount}`);
    for (const v of ['contapyme', 'insoft', 'agrowin']) {
      assert.ok(data.values.includes(v), `paleta por defecto "${v}" debe estar presente, vi ${JSON.stringify(data.values)}`);
    }
    await screenshot(page, 'palette-selector-smoke');
  },
});

tests.push({
  name: 'funcional: data-palette en <html> refleja la paleta activa',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    const initial = await page.evaluate(() => document.documentElement.dataset.palette);
    assert.ok(initial, `<html> debe tener data-palette al cargar (vimos "${initial}")`);
  },
});

tests.push({
  name: 'funcional: cambiar paleta emite is-palette-change y actualiza <html>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    // Limpia localStorage previo para empezar limpio.
    await page.evaluate(() => localStorage.removeItem('is-palette'));
    const after = await page.evaluate(async () => {
      const sel = document.querySelector('is-palette-selector');
      let captured = null;
      sel.addEventListener('is-palette-change', (e) => { captured = e.detail; });
      sel.value = 'insoft';
      await new Promise((r) => setTimeout(r, 50));
      return {
        captured,
        htmlAttr: document.documentElement.dataset.palette,
        stored: localStorage.getItem('is-palette'),
      };
    });
    assert.equal(after.captured?.value, 'insoft', `evento debe llevar value=insoft (vimos "${after.captured?.value}")`);
    assert.equal(after.htmlAttr, 'insoft', `<html> data-palette debe ser insoft (vimos "${after.htmlAttr}")`);
    assert.equal(after.stored, 'insoft', `localStorage debe guardar insoft (vimos "${after.stored}")`);
  },
});

tests.push({
  name: 'funcional: paleta custom vía atributo palettes reemplaza el set por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    const data = await page.evaluate(() => {
      const sel = document.getElementById('custom');
      const opts = sel.shadowRoot.querySelectorAll('[role="option"]');
      return {
        values: [...opts].map((o) => o.dataset.palette),
        count: opts.length,
      };
    });
    assert.equal(data.count, 2, `selector custom debe tener 2 paletas (vimos ${data.count})`);
    for (const v of ['midnight', 'sand']) {
      assert.ok(data.values.includes(v), `paleta custom "${v}" debe estar presente (vimos ${JSON.stringify(data.values)})`);
    }
  },
});

tests.push({
  name: 'funcional: aria-selected refleja la opción activa',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    const data = await page.evaluate(() => {
      const sel = document.querySelector('is-palette-selector');
      const opts = sel.shadowRoot.querySelectorAll('[role="option"]');
      return [...opts].map((o) => ({ value: o.dataset.palette, sel: o.getAttribute('aria-selected') }));
    });
    const selected = data.filter((d) => d.sel === 'true');
    assert.equal(selected.length, 1, `exactamente una opción debe tener aria-selected=true (vi ${selected.length})`);
  },
});

tests.push({
  name: 'focus: al cerrar con Escape el foco vuelve al trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    const restored = await page.evaluate(async () => {
      const sel = document.querySelector('is-palette-selector');
      const trigger = sel.shadowRoot.querySelector('.trigger');
      trigger.focus();
      trigger.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const open = !sel.shadowRoot.querySelector('.menu').hidden;
      // Disparar Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 50));
      const a = document.activeElement;
      return {
        wasOpen: open,
        activeTag: a?.tagName,
        activeShadowActive: sel.shadowRoot?.activeElement === trigger,
      };
    });
    assert.equal(restored.wasOpen, true, 'menú debe estar abierto tras click en trigger');
    assert.ok(restored.activeShadowActive || restored.activeTag === 'IS-PALETTE-SELECTOR',
      `foco debe volver al trigger al cerrar con Escape (vimos activeShadowActive=${restored.activeShadowActive}, tag=${restored.activeTag})`);
  },
});

tests.push({
  name: 'click-fuera: cierra el menú al click fuera',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const sel = document.querySelector('is-palette-selector');
      const trigger = sel.shadowRoot.querySelector('.trigger');
      trigger.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const wasOpen = !sel.shadowRoot.querySelector('.menu').hidden;
      // Click fuera
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 50));
      const closed = sel.shadowRoot.querySelector('.menu').hidden;
      return { wasOpen, closed };
    });
    assert.equal(result.wasOpen, true, 'menú debe abrirse al click');
    assert.equal(result.closed, true, 'menú debe cerrarse al click fuera');
  },
});

tests.push({
  name: 'persistencia: tras reload el primer selector sigue con la última paleta',
  run: async (page) => {
    // El demo tiene 2 palette-selectors (default + custom). El segundo usa
    // storage-key="is-palette-custom" para no pisar al primero. Verificamos
    // que el PRIMER selector (el que recibe 'agrowin') lo mantiene tras
    // reload. El segundo selector (paleta custom) usa su propio storage-key
    // y no debe interferir.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const sel = document.querySelector('is-palette-selector');
      sel.value = 'agrowin';
    });
    await page.waitForTimeout(100);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const sel = document.querySelector('is-palette-selector');
      return {
        selectorValue: sel.value,
        stored: localStorage.getItem('is-palette'),
      };
    });
    assert.equal(after.selectorValue, 'agrowin', `selector.value debe persistir agrowin (vimos "${after.selectorValue}")`);
    assert.equal(after.stored, 'agrowin', `localStorage debe seguir en agrowin (vimos "${after.stored}")`);
  },
});

tests.push({
  name: 'accesibilidad: el trigger tiene aria-haspopup y aria-expanded',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    const aria = await page.evaluate(() => {
      const sel = document.querySelector('is-palette-selector');
      const t = sel.shadowRoot.querySelector('.trigger');
      return {
        haspopup: t.getAttribute('aria-haspopup'),
        expanded: t.getAttribute('aria-expanded'),
        label: t.getAttribute('aria-label'),
      };
    });
    assert.equal(aria.haspopup, 'listbox', `aria-haspopup debe ser listbox (vimos "${aria.haspopup}")`);
    assert.ok(['true', 'false'].includes(aria.expanded), `aria-expanded debe ser true o false (vimos "${aria.expanded}")`);
    assert.ok(aria.label, 'trigger debe tener aria-label');
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

report('palette-selector', failures === 0, { total: tests.length, failures });
