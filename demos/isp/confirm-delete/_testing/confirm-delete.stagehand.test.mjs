// confirm-delete.stagehand.test.mjs — checks deterministas visuales.
// Verifica: el dialog se monta, los campos e inputs son visibles, el botón
// "Eliminar" carga con el icono, y el focus-trap funciona (gap 5/8 del handoff).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/confirm-delete/confirm-delete.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-confirm-delete-ready');
  await page.waitForTimeout(200);

  // (1) El shadow contiene la estructura esperada.
  const mounted = await page.evaluate(() => {
    const cd = document.getElementById('cd');
    const sr = cd.shadowRoot;
    const dlg = sr.querySelector('is-dialog.dlg');
    const dlgSr = dlg?.shadowRoot;
    return {
      hasDialog: !!dlg,
      hasDialogShadow: !!dlgSr,
      headingPart: !!sr.querySelector('[part="heading"]'),
      fieldsPart: !!sr.querySelector('[part="fields"]'),
      actionsPart: !!sr.querySelector('[part="actions"]'),
      confirmInput: !!sr.querySelector('is-input.confirm'),
      currentInput: !!sr.querySelector('is-input.current'),
      deleteBtn: !!sr.querySelector('button.delete'),
      cancelBtn: !!sr.querySelector('button.cancel'),
      hasIconInHeading: !!sr.querySelector('[part="heading"] is-icon'),
    };
  });
  assert.equal(mounted.hasDialog, true, 'debe componer un <is-dialog>');
  assert.equal(mounted.headingPart, true, '::part(heading) debe existir');
  assert.equal(mounted.fieldsPart, true, '::part(fields) debe existir');
  assert.equal(mounted.actionsPart, true, '::part(actions) debe existir');
  assert.equal(mounted.confirmInput, true, 'is-input.confirm debe existir');
  assert.equal(mounted.currentInput, true, 'is-input.current debe existir');
  assert.equal(mounted.deleteBtn, true);
  assert.equal(mounted.cancelBtn, true);
  assert.equal(mounted.hasIconInHeading, true, 'heading debe tener <is-icon>');

  // (2) Abrir y verificar que el dialog es visible.
  await page.evaluate(async () => {
    const cd = document.getElementById('cd');
    cd.show();
    await new Promise((r) => setTimeout(r, 300));
  });
  const opened = await page.evaluate(() => {
    const cd = document.getElementById('cd');
    const dlg = cd.shadowRoot.querySelector('is-dialog.dlg');
    const dlgSr = dlg?.shadowRoot;
    const dialogEl = dlgSr?.querySelector('[part="dialog"], .dialog, [part="base"]') || dlg;
    const r = dialogEl?.getBoundingClientRect?.();
    return {
      open: cd.open,
      dlgOpen: dlg?.open ?? dlg?.hasAttribute('open'),
      dialogW: r?.width || 0,
      dialogH: r?.height || 0,
    };
  });
  assert.equal(opened.open, true, 'modal debe estar abierto');
  assert.ok(opened.dialogW > 100, `dialog width > 100 (${opened.dialogW})`);
  assert.ok(opened.dialogH > 100, `dialog height > 100 (${opened.dialogH})`);

  // (3) Focus-trap: el primer focuseable debe recibir foco.
  const focus = await page.evaluate(async () => {
    const cd = document.getElementById('cd');
    // Disparar focus-trap manualmente si existe.
    const dlg = cd.shadowRoot.querySelector('is-dialog.dlg');
    // El <is-dialog> ya expone open=true; el trap se ejecuta en su lifecycle.
    await new Promise((r) => setTimeout(r, 200));
    const active = document.activeElement;
    return {
      activeTag: active?.localName,
      activeInShadow: !!active?.closest('is-confirm-delete'),
    };
  });
  // No verificamos el elemento exacto (depende del trap de is-dialog), pero sí que
  // el foco quedó dentro del modal.
  assert.equal(focus.activeInShadow, true, 'foco debe estar atrapado dentro del modal');

  console.log(`  ✓ confirm-delete: rubric determinista PASS (estructura OK, dialog visible, focus-trap activo)`);
  results.push({ name: 'confirm-delete', ok: true });
} catch (err) {
  console.error(`  ✗ confirm-delete: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-confirm-delete'); } catch {}
  results.push({ name: 'confirm-delete', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('confirm-delete-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
