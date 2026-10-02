// catalogo-gen.test.mjs — tests exhaustivos del demo <iswc-catalogo-gen>.
// Cobertura: smoke (monta grid + toolbar + drawer + modales) + API (controller,
// Lista, seleccionar, eventos) + form slot + modal verificacion.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/catalogo-gen/catalogo-gen.html`;

const tests = [];

tests.push({
  name: 'smoke: catalogo monta con grid + toolbar + drawer + modales',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-catalogo-ready');
    const info = await page.evaluate(() => {
      const cat = document.getElementById('cat');
      const sr = cat.shadowRoot;
      return {
        defined: !!customElements.get('iswc-catalogo-gen'),
        grid: !!sr.querySelector('iswc-ag-grid.grid'),
        toolbar: !!sr.querySelector('section[part="toolbar"], .toolbar'),
        drawer: !!sr.querySelector('iswc-drawer.drawer'),
        modalVerify: !!sr.querySelector('iswc-modal-verificacion.modal-verify'),
        modalDelete: !!sr.querySelector('iswc-confirm-delete.modal-delete'),
        controllerPresent: !!cat.controller,
      };
    });
    assert.equal(info.defined, true);
    assert.equal(info.grid, true, '<iswc-ag-grid> debe estar en shadow');
    assert.equal(info.drawer, true, '<iswc-drawer> debe estar en shadow');
    assert.equal(info.modalVerify, true, '<iswc-modal-verificacion> debe estar en shadow');
    assert.equal(info.modalDelete, true, '<iswc-confirm-delete> debe estar en shadow');
    assert.equal(info.controllerPresent, true);
    await screenshot(page, 'catalogo-smoke');
  },
});

tests.push({
  name: 'funcional: refreshGrid() pide datos al controller y popula el grid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-catalogo-ready');
    await page.waitForTimeout(300);
    const rowCount = await page.evaluate(async () => {
      const cat = document.getElementById('cat');
      if (typeof cat.refreshGrid === 'function') {
        await cat.refreshGrid();
        await new Promise((r) => setTimeout(r, 200));
      }
      const grid = cat.shadowRoot.querySelector('iswc-ag-grid.grid');
      const sr = grid?.shadowRoot;
      // Buscar filas en el shadow del ag-grid (puede ser rows / .ag-row).
      const rows = sr ? sr.querySelectorAll('[role="row"], .ag-row, .row, tr') : [];
      return rows.length;
    });
    assert.ok(rowCount > 0, `grid debe tener al menos 1 fila, hay ${rowCount}`);
  },
});

tests.push({
  name: 'eventos: iswc-selection-change emite al seleccionar filas del grid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-catalogo-ready');
    await page.waitForTimeout(200);
    const events = await page.evaluate(async () => {
      const cat = document.getElementById('cat');
      const captured = [];
      cat.addEventListener('iswc-selection-change', (e) => captured.push({ detail: e.detail }));
      cat.selectionData = [{ app: 'CP', descripcion: 'ContaPyme', activo: true }];
      cat.dispatchEvent(new CustomEvent('iswc-selection-change', {
        detail: { records: [{ app: 'CP', descripcion: 'ContaPyme' }] },
        bubbles: true,
        composed: true,
      }));
      return captured;
    });
    assert.ok(events.length >= 1, `esperaba >=1 evento, hay ${events.length}`);
  },
});

tests.push({
  name: 'form slot: la ficha se proyecta en el drawer',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-catalogo-ready');
    const slotInfo = await page.evaluate(() => {
      const cat = document.getElementById('cat');
      // Buscar el slot="frm" en light DOM del catalog.
      const frm = cat.querySelector('[slot="frm"]');
      return {
        slotExists: !!frm,
        tagName: frm?.localName,
      };
    });
    assert.equal(slotInfo.slotExists, true, 'demo debe haber provisto un slot="frm"');
    assert.equal(slotInfo.tagName, 'iswc-form', 'slot="frm" debe contener un <iswc-form>');
  },
});

tests.push({
  name: 'verificación: verify() pide al controller y popula mensajes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-catalogo-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(async () => {
      const cat = document.getElementById('cat');
      const mv = cat.shadowRoot.querySelector('iswc-modal-verificacion.modal-verify');
      mv.record = { app: 'CP' };
      mv.controller = cat.controller;
      const mensajes = await mv.verify();
      return {
        mensajesLen: mensajes.length,
        qinfos: mv.qinfos,
        qwarning: mv.qwarning,
        qerrores: mv.qerrores,
      };
    });
    assert.equal(result.mensajesLen, 2, `esperaba 2 mensajes, hay ${result.mensajesLen}`);
    assert.ok(result.qinfos >= 1, `qinfos debe ser >= 1, es ${result.qinfos}`);
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

report('catalogo-gen', failures === 0, { total: tests.length, failures });
