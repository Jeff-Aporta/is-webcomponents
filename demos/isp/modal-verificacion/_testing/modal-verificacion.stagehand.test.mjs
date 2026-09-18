// modal-verificacion.stagehand.test.mjs — checks deterministas visuales.
// Verifica: el dialog se monta, los mensajes de verificación se pintan con
// colores por severidad, el focus-trap está activo (gap 5/8 del handoff).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/modal-verificacion/modal-verificacion.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-verif-ready');
  await page.waitForTimeout(200);

  // (1) Verificar la estructura del shadow.
  const mounted = await page.evaluate(() => {
    const m = document.getElementById('verif');
    const sr = m.shadowRoot;
    return {
      dlg: !!sr.querySelector('is-dialog.dlg'),
      headingText: sr.querySelector('.heading-text')?.textContent?.trim() || '',
      titleIcon: !!sr.querySelector('.title-icon'),
      resultsPart: !!sr.querySelector('[part="results"]'),
      statsPart: !!sr.querySelector('[part="stats"]'),
      closeBtn: !!sr.querySelector('button.close'),
    };
  });
  assert.equal(mounted.dlg, true);
  assert.equal(mounted.titleIcon, true);
  assert.equal(mounted.resultsPart, true);
  assert.equal(mounted.statsPart, true);
  assert.equal(mounted.closeBtn, true);
  assert.match(mounted.headingText, /verificación de comprobante/i, `heading debe incluir 'comprobante', es '${mounted.headingText}'`);

  // (2) Show + verify + verificar render de mensajes por severidad.
  await page.evaluate(() => document.getElementById('verif').show());
  await page.waitForTimeout(700); // esperar verify async (200ms del controller)

  const msgsRendered = await page.evaluate(() => {
    const m = document.getElementById('verif');
    const sr = m.shadowRoot;
    const resultsEl = sr.querySelector('[part="results"]');
    const blocks = [...resultsEl.querySelectorAll('.msg-block')];
    const colors = blocks.map((b) => {
      const text = b.querySelector('is-text');
      return text?.getAttribute('color');
    });
    return {
      blockCount: blocks.length,
      colors,
      qinfos: m.qinfos,
      qwarning: m.qwarning,
      qerrores: m.qerrores,
    };
  });
  assert.ok(msgsRendered.blockCount >= 3, `esperaba >=3 bloques de mensaje, hay ${msgsRendered.blockCount}`);
  assert.ok(msgsRendered.colors.includes('info'), `debe haber al menos un mensaje info, colors=${JSON.stringify(msgsRendered.colors)}`);
  assert.ok(msgsRendered.colors.includes('warning'), `debe haber al menos un mensaje warning`);
  assert.ok(msgsRendered.colors.includes('danger'), `debe haber al menos un mensaje danger (itdmensaje=error → danger)`);

  // (3) Focus-trap: tras show, el foco debe estar dentro del modal.
  const focus = await page.evaluate(() => {
    const ae = document.activeElement;
    return {
      tag: ae?.localName,
      inModal: !!ae?.closest('is-modal-verificacion'),
    };
  });
  assert.equal(focus.inModal, true, 'foco debe estar atrapado dentro del modal');

  console.log(`  ✓ modal-verificacion: rubric determinista PASS (estructura OK, mensajes por severidad, focus-trap activo)`);
  results.push({ name: 'modal-verificacion', ok: true });
} catch (err) {
  console.error(`  ✗ modal-verificacion: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-modal-verificacion'); } catch {}
  results.push({ name: 'modal-verificacion', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('modal-verificacion-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
