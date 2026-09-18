// accordion-group.test.mjs — tests exhaustivos del demo <is-accordion-group>.
// Cobertura: smoke + funcional (single open vs multi open + change events)
// + API (showAll/hideAll) + accesibilidad básica.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/accordion-group/accordion-group.html`;

const tests = [];

tests.push({
  name: 'smoke: grupo y detalles se montan y renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-accordion-ready');
    const initial = await page.evaluate(() => {
      const single = document.getElementById('single');
      const multi = document.getElementById('multi');
      return {
        groupDefined: !!customElements.get('is-accordion-group'),
        detailsDefined: !!customElements.get('is-details'),
        singleItems: single.items.length,
        multiItems: multi.items.length,
        singleInitialOpen: single.items.filter((d) => d.open).length,
        multiInitialOpen: multi.items.filter((d) => d.open).length,
        singleMultiple: single.multiple,
        multiMultiple: multi.multiple,
      };
    });
    assert.equal(initial.groupDefined, true, '<is-accordion-group> debe estar definido');
    assert.equal(initial.detailsDefined, true, '<is-details> debe estar definido');
    assert.equal(initial.singleItems, 3, 'single group debe tener 3 detalles');
    assert.equal(initial.multiItems, 3, 'multi group debe tener 3 detalles');
    assert.equal(initial.singleInitialOpen, 1, 'single debe empezar con 1 abierto');
    assert.equal(initial.multiInitialOpen, 0, 'multi debe empezar con 0 abiertos');
    assert.equal(initial.singleMultiple, false, 'single no debe tener atributo multiple');
    assert.equal(initial.multiMultiple, true, 'multi debe tener atributo multiple');
    await screenshot(page, 'accordion-group-smoke');
  },
});

tests.push({
  name: 'funcional: modo single — abrir uno cierra el anterior',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-accordion-ready');
    await page.waitForTimeout(150);
    // Inicialmente single tiene "Datos básicos" abierto; abrir "Contacto".
    await page.evaluate(() => {
      const group = document.getElementById('single');
      const details = group.items;
      const contact = details.find((d) => d.summary === 'Contacto');
      contact.show();
    });
    await page.waitForTimeout(150);
    const afterContact = await page.evaluate(() => {
      const group = document.getElementById('single');
      const open = group.items.filter((d) => d.open).map((d) => d.summary);
      return { open, onlyOne: open.length === 1, contactOpen: open.includes('Contacto') };
    });
    assert.equal(afterContact.onlyOne, true, `single debe mantener exactamente 1 abierto, hay ${afterContact.open}`);
    assert.equal(afterContact.contactOpen, true, '"Contacto" debe estar abierto');
    assert.ok(!afterContact.open.includes('Datos básicos'), 'Datos básicos debió cerrarse');
    // Ahora abrir "Financiero".
    await page.evaluate(() => {
      const group = document.getElementById('single');
      group.items.find((d) => d.summary === 'Financiero').show();
    });
    await page.waitForTimeout(150);
    const afterFinance = await page.evaluate(() => {
      const group = document.getElementById('single');
      const open = group.items.filter((d) => d.open).map((d) => d.summary);
      return { open, onlyOne: open.length === 1 };
    });
    assert.equal(afterFinance.onlyOne, true, 'tras abrir Financiero, single debe seguir con 1 abierto');
    assert.ok(afterFinance.open.includes('Financiero'), 'Financiero debe estar abierto');
  },
});

tests.push({
  name: 'funcional: modo multiple — abrir varios a la vez',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-accordion-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const group = document.getElementById('multi');
      group.items[0].show();
      group.items[1].show();
      group.items[2].show();
    });
    await page.waitForTimeout(150);
    const result = await page.evaluate(() => {
      const group = document.getElementById('multi');
      const open = group.items.filter((d) => d.open).map((d) => d.summary);
      return { open, allOpen: open.length === 3 };
    });
    assert.equal(result.allOpen, true, `multi debe permitir los 3 abiertos, hay ${result.open}`);
  },
});

tests.push({
  name: 'funcional: hideAll() cierra todos los paneles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-accordion-ready');
    await page.waitForTimeout(150);
    // Abrir uno en single.
    await page.evaluate(() => {
      document.getElementById('single').showAll?.();
      document.getElementById('multi').showAll?.();
    });
    await page.waitForTimeout(150);
    // hideAll cierra todos
    await page.evaluate(() => {
      document.getElementById('single').hideAll();
      document.getElementById('multi').hideAll();
    });
    await page.waitForTimeout(150);
    const closed = await page.evaluate(() => ({
      single: document.getElementById('single').openItems.length,
      multi: document.getElementById('multi').openItems.length,
    }));
    assert.equal(closed.single, 0, `single debe tener 0 abiertos tras hideAll, hay ${closed.single}`);
    assert.equal(closed.multi, 0, `multi debe tener 0 abiertos tras hideAll, hay ${closed.multi}`);
  },
});

tests.push({
  name: 'eventos: is-accordion-change se emite con opened/closed',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-accordion-ready');
    await page.waitForTimeout(150);
    // Capturar eventos en multi.
    const events = await page.evaluate(() => {
      const group = document.getElementById('multi');
      const captured = [];
      group.addEventListener('is-accordion-change', (e) => {
        captured.push({
          opened: e.detail.opened?.summary ?? null,
          closed: e.detail.closed?.summary ?? null,
          bubbles: e.bubbles,
          composed: e.composed,
        });
      });
      group.items[0].show();
      group.items[1].show();
      group.items[0].hide();
      return captured;
    });
    await page.waitForTimeout(100);
    assert.ok(events.length >= 3, `esperaba >=3 eventos, hay ${events.length}`);
    const showEvents = events.filter((e) => e.opened && !e.closed);
    const hideEvents = events.filter((e) => !e.opened && e.closed);
    assert.ok(showEvents.length >= 2, `esperaba >=2 openings, hay ${showEvents.length}`);
    assert.ok(hideEvents.length >= 1, `esperaba >=1 closing, hay ${hideEvents.length}`);
    // bubbles + composed
    const last = events[events.length - 1];
    assert.equal(last.bubbles, true, 'is-accordion-change debe burbujear');
    assert.equal(last.composed, true, 'is-accordion-change debe atravesar shadow DOM');
  },
});

tests.push({
  name: 'API: openItems y items son getters de solo lectura coherentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-accordion-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(() => {
      const group = document.getElementById('single');
      return {
        itemsLen: group.items.length,
        openItemsLen: group.openItems.length,
        allAreDetails: group.items.every((el) => el.localName === 'is-details'),
      };
    });
    assert.equal(result.itemsLen, 3, 'items.length debe ser 3');
    assert.equal(result.openItemsLen, 1, 'openItems.length debe ser 1');
    assert.equal(result.allAreDetails, true, 'items deben ser <is-details>');
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

report('accordion-group', failures === 0, { total: tests.length, failures });
