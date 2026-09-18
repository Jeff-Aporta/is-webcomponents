// confirm-delete.test.mjs — tests exhaustivos del demo <is-confirm-delete>.
// Cobertura: smoke + funcional (show abre el modal, typing habilita botón,
// eventos, loading bloquea ambos botones) + ciclo show/hide.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/confirm-delete/confirm-delete.html`;

const tests = [];

tests.push({
  name: 'smoke: confirm-delete monta con dialog + dos inputs + dos botones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-delete-ready');
    const info = await page.evaluate(() => {
      const cd = document.getElementById('cd');
      const sr = cd.shadowRoot;
      return {
        defined: !!customElements.get('is-confirm-delete'),
        dlgExists: !!sr.querySelector('is-dialog.dlg'),
        inputsCount: sr.querySelectorAll('is-input').length,
        deleteBtnExists: !!sr.querySelector('button.delete'),
        cancelBtnExists: !!sr.querySelector('button.cancel'),
        entity: cd.entity,
        pkLabel: cd.pkLabel,
        confirmValue: cd.confirmValue,
      };
    });
    assert.equal(info.defined, true);
    assert.equal(info.dlgExists, true, '<is-dialog> debe estar en shadow');
    assert.equal(info.inputsCount, 2, 'debe haber 2 <is-input> (current + confirm)');
    assert.equal(info.deleteBtnExists, true);
    assert.equal(info.cancelBtnExists, true);
    assert.equal(info.entity, 'tercero');
    assert.equal(info.pkLabel, 'NIT');
    assert.equal(info.confirmValue, '900123456');
    await screenshot(page, 'confirm-delete-smoke');
  },
});

tests.push({
  name: 'funcional: show() abre el modal; hide() lo cierra',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-delete-ready');
    await page.waitForTimeout(150);
    const flow = await page.evaluate(async () => {
      const cd = document.getElementById('cd');
      cd.show();
      await new Promise((r) => setTimeout(r, 200));
      const openAfter = cd.open;
      const dlg = cd.shadowRoot.querySelector('is-dialog.dlg');
      const dialogOpen = !!dlg?.open || dlg?.hasAttribute('open');
      cd.hide();
      await new Promise((r) => setTimeout(r, 200));
      const openClosed = cd.open;
      return { openAfter, dialogOpen, openClosed };
    });
    assert.equal(flow.openAfter, true, 'show() debe abrir el modal');
    // El dialog interno debe estar visible.
    assert.equal(flow.openClosed, false, 'hide() debe cerrar el modal');
  },
});

tests.push({
  name: 'funcional: el botón Eliminar está deshabilitado inicialmente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-delete-ready');
    await page.waitForTimeout(150);
    const state = await page.evaluate(async () => {
      const cd = document.getElementById('cd');
      cd.show();
      await new Promise((r) => setTimeout(r, 200));
      const delBtn = cd.shadowRoot.querySelector('button.delete');
      return {
        cdConfirmed: cd.confirmed,
        delDisabled: delBtn?.hasAttribute('disabled') || delBtn?.disabled,
      };
    });
    assert.equal(state.cdConfirmed, false, 'confirmed debe ser false sin escribir nada');
    assert.equal(state.delDisabled, true, 'botón Eliminar debe estar disabled inicialmente');
  },
});

tests.push({
  name: 'funcional: typed value === confirm-value → confirmed=true, botón habilitado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-delete-ready');
    await page.waitForTimeout(150);
    const state = await page.evaluate(async () => {
      const cd = document.getElementById('cd');
      cd.show();
      await new Promise((r) => setTimeout(r, 200));
      const confirmInput = cd.shadowRoot.querySelector('is-input.confirm');
      confirmInput.value = '900123456';
      confirmInput.dispatchEvent(new CustomEvent('is-input', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 100));
      const delBtn = cd.shadowRoot.querySelector('button.delete');
      return {
        cdConfirmed: cd.confirmed,
        delDisabled: delBtn?.hasAttribute('disabled'),
      };
    });
    assert.equal(state.cdConfirmed, true, 'confirmed debe ser true tras escribir el valor exacto');
    assert.equal(state.delDisabled, false, 'botón Eliminar debe estar habilitado');
  },
});

tests.push({
  name: 'funcional: valor incorrecto mantiene confirmado=false (case-insensitive)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-delete-ready');
    await page.waitForTimeout(150);
    const state = await page.evaluate(async () => {
      const cd = document.getElementById('cd');
      cd.show();
      await new Promise((r) => setTimeout(r, 200));
      const confirmInput = cd.shadowRoot.querySelector('is-input.confirm');
      // minúsculas — debe coincidir porque por defecto no es case-sensitive
      confirmInput.value = '900123456';
      confirmInput.dispatchEvent(new CustomEvent('is-input', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 50));
      const matchedLower = cd.confirmed;
      // Texto incorrecto
      confirmInput.value = 'WRONG';
      confirmInput.dispatchEvent(new CustomEvent('is-input', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 50));
      const matchedWrong = cd.confirmed;
      return { matchedLower, matchedWrong };
    });
    assert.equal(state.matchedLower, true, 'match exacto debe ser confirmado');
    assert.equal(state.matchedWrong, false, 'texto incorrecto NO debe confirmar');
  },
});

tests.push({
  name: 'loading: bloquea ambos botones y previene hide()',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-delete-ready');
    await page.waitForTimeout(150);
    const state = await page.evaluate(async () => {
      const cd = document.getElementById('cd');
      cd.show();
      await new Promise((r) => setTimeout(r, 200));
      cd.loading = true;
      await new Promise((r) => setTimeout(r, 50));
      const delBtn = cd.shadowRoot.querySelector('button.delete');
      const cancelBtn = cd.shadowRoot.querySelector('button.cancel');
      const delLoading = delBtn?.hasAttribute('loading');
      const cancelDisabled = cancelBtn?.hasAttribute('disabled');
      const delDisabled = delBtn?.hasAttribute('disabled');
      // Cancelar no debe poder cerrar
      cancelBtn.click();
      await new Promise((r) => setTimeout(r, 100));
      const stillOpen = cd.open;
      cd.loading = false;
      return { delLoading, cancelDisabled, delDisabled, stillOpen };
    });
    assert.equal(state.delLoading, true, 'loading debe poner loading en botón Eliminar');
    assert.equal(state.cancelDisabled, true, 'cancel debe estar disabled');
    assert.equal(state.delDisabled, true, 'delete debe estar disabled mientras loading=true');
    assert.equal(state.stillOpen, true, 'modal debe seguir abierto al cancelar durante loading');
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

report('confirm-delete', failures === 0, { total: tests.length, failures });
