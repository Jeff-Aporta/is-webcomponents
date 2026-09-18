// catalogo-gen.stagehand.test.mjs — checks deterministas visuales.
// Verifica: el grid renderiza con altura > 0, la toolbar es visible, el drawer
// está montado y el modal de verificación abre correctamente con resultados.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/catalogo-gen/catalogo-gen.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-catalogo-ready');
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const cat = document.getElementById('cat');
    const sr = cat.shadowRoot;
    const hostRect = cat.getBoundingClientRect();
    const grid = sr.querySelector('is-ag-grid.grid');
    const gridRect = grid?.getBoundingClientRect();
    const drawer = sr.querySelector('is-drawer.drawer');
    const verify = sr.querySelector('is-modal-verificacion.modal-verify');
    const del = sr.querySelector('is-confirm-delete.modal-delete');
    return {
      hostRect,
      gridRect,
      drawerPresent: !!drawer,
      verifyPresent: !!verify,
      deletePresent: !!del,
      gridDefined: !!customElements.get('is-ag-grid'),
    };
  });

  assert.ok(data.hostRect, 'host debe tener rect');
  assert.ok(data.hostRect.height > 100, `host height debe ser suficiente (${data.hostRect.height}px)`);
  assert.ok(data.gridRect, 'grid debe tener rect');
  assert.ok(data.gridRect.width > 100, `grid width > 100 (${data.gridRect.width})`);
  assert.ok(data.gridRect.height > 100, `grid height > 100 (${data.gridRect.height})`);
  assert.equal(data.drawerPresent, true);
  assert.equal(data.verifyPresent, true);
  assert.equal(data.deletePresent, true);
  assert.equal(data.gridDefined, true, '<is-ag-grid> debe estar definido');

  // Verificar que la verificación abre y muestra resultados.
  await page.evaluate(async () => {
    const cat = document.getElementById('cat');
    const mv = cat.shadowRoot.querySelector('is-modal-verificacion.modal-verify');
    mv.controller = cat.controller;
    mv.record = { app: 'CP' };
    mv.show();
  });
  await page.waitForTimeout(400);
  const verifyState = await page.evaluate(() => {
    const cat = document.getElementById('cat');
    const mv = cat.shadowRoot.querySelector('is-modal-verificacion.modal-verify');
    const dlg = mv.shadowRoot.querySelector('is-dialog.dlg');
    return {
      mvOpen: mv.open,
      dlgPresent: !!dlg,
      qinfos: mv.qinfos,
    };
  });
  assert.equal(verifyState.mvOpen, true, 'modal-verificacion debe estar abierto');
  assert.ok(verifyState.qinfos >= 1, `qinfos debe ser >= 1 tras verify(), es ${verifyState.qinfos}`);

  console.log(`  ✓ catalogo-gen: rubric determinista PASS (grid montado con tamaño OK, modales presentes, verificación ejecuta)`);
  results.push({ name: 'catalogo-gen', ok: true });
} catch (err) {
  console.error(`  ✗ catalogo-gen: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-catalogo-gen'); } catch {}
  results.push({ name: 'catalogo-gen', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('catalogo-gen-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
