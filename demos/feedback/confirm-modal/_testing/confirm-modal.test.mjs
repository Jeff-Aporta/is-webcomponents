// confirm-modal.test.mjs — tests exhaustivos del demo is-confirm-modal.
// Foco: focus management (focus al abrir + restoration al cerrar), aria-modal,
// eventos is-confirm-* y cierre por backdrop / Escape.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/confirm-modal/confirm-modal.html`;

const tests = [];

tests.push({
  name: 'smoke: el modal monta y el backdrop está oculto al inicio',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    const data = await page.evaluate(() => {
      const modals = document.querySelectorAll('is-confirm-modal');
      return {
        defined: !!customElements.get('is-confirm-modal'),
        count: modals.length,
        backdropsHidden: [...modals].every((m) => m.shadowRoot.querySelector('.backdrop').hidden),
      };
    });
    assert.equal(data.defined, true, 'is-confirm-modal debe estar definido');
    assert.ok(data.count >= 3, `esperaba >=3 modales, hay ${data.count}`);
    assert.equal(data.backdropsHidden, true, 'backdrops deben estar hidden al inicio');
    await screenshot(page, 'confirm-modal-smoke');
  },
});

tests.push({
  name: 'funcional: click en el disparador abre el modal (for=)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    const opened = await page.evaluate(() => {
      document.getElementById('btn-open-1').click();
      const modals = document.querySelectorAll('is-confirm-modal');
      return [...modals].map((m) => ({
        open: m.hasAttribute('open'),
        visible: !m.shadowRoot.querySelector('.backdrop').hidden,
      }));
    });
    assert.ok(opened[0].open, 'primer modal debe abrirse (open=true)');
    assert.ok(opened[0].visible, 'backdrop del primer modal debe verse');
  },
});

tests.push({
  name: 'focus: al abrir, el foco se mueve al botón confirm',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    // Enfocar el disparador y simular click real con teclado.
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.waitForTimeout(50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const focused = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const a = document.activeElement;
      // ¿Foco dentro del modal (light DOM)? -> slot confirm
      // ¿Foco dentro del shadow root? -> botón confirm default
      const inSlot = m.contains(a) && a.hasAttribute('slot');
      const inShadow = m.shadowRoot?.activeElement?.classList?.contains('confirm');
      return { inSlot, inShadow, tag: a?.tagName };
    });
    assert.ok(focused.inShadow || focused.inSlot, `foco al abrir debe caer en el botón confirm (vimos inShadow=${focused.inShadow}, inSlot=${focused.inSlot}, tag=${focused.tag})`);
  },
});

tests.push({
  name: 'focus: al cerrar, el foco vuelve al disparador original',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    // Cerrar via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const restored = await page.evaluate(() => {
      const a = document.activeElement;
      return { id: a?.id, tag: a?.tagName };
    });
    assert.equal(restored.id, 'btn-open-1', `foco debe volver al disparador original (vimos id="${restored.id}")`);
  },
});

tests.push({
  name: 'aria: el modal usa role="alertdialog" y aria-modal="true"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    const aria = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const dlg = m.shadowRoot.querySelector('.modal');
      return {
        role: dlg.getAttribute('role'),
        ariaModal: dlg.getAttribute('aria-modal'),
      };
    });
    assert.equal(aria.role, 'alertdialog', `role debe ser alertdialog (vimos "${aria.role}")`);
    assert.equal(aria.ariaModal, 'true', `aria-modal debe ser true (vimos "${aria.ariaModal}")`);
  },
});

tests.push({
  name: 'eventos: is-confirm-show y is-confirm-cancel se disparan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    const events = await page.evaluate(async () => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const seen = [];
      for (const ev of ['is-confirm-show', 'is-confirm-cancel', 'is-confirm-confirm', 'is-confirm-hide']) {
        m.addEventListener(ev, (e) => seen.push(ev));
      }
      m.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      // Para disparar is-confirm-cancel hay que clickear el botón cancel
      // (o el backdrop). hide() solo emite is-confirm-hide.
      const cancelBtn = m.shadowRoot.querySelector('[data-confirm-cancel]');
      cancelBtn.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      return seen;
    });
    assert.ok(events.includes('is-confirm-show'), `esperaba is-confirm-show, vi ${JSON.stringify(events)}`);
    assert.ok(events.includes('is-confirm-cancel'), `esperaba is-confirm-cancel, vi ${JSON.stringify(events)}`);
    assert.ok(events.includes('is-confirm-hide'), `esperaba is-confirm-hide tras cancel, vi ${JSON.stringify(events)}`);
  },
});

tests.push({
  name: 'escape: la tecla Escape cierra el modal (open=false)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const open = await page.evaluate(() => {
      return document.querySelectorAll('is-confirm-modal')[0].hasAttribute('open');
    });
    assert.equal(open, false, 'modal debe cerrarse con Escape');
  },
});

tests.push({
  name: 'slots: confirm y cancel personalizados funcionan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-2').click());
    await page.waitForTimeout(200);
    const slotInfo = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[1];
      const cancel = m.querySelector('[slot="cancel"]');
      const confirm = m.querySelector('[slot="confirm"]');
      return {
        cancelText: cancel?.textContent?.trim(),
        confirmText: confirm?.textContent?.trim(),
        open: m.hasAttribute('open'),
      };
    });
    assert.equal(slotInfo.open, true, 'modal #2 debe estar abierto');
    assert.equal(slotInfo.cancelText, 'Atrás', `slot cancel debe mostrar "Atrás" (vimos "${slotInfo.cancelText}")`);
    assert.equal(slotInfo.confirmText, 'Sí, publicar', `slot confirm debe mostrar "Sí, publicar" (vimos "${slotInfo.confirmText}")`);
  },
});

tests.push({
  name: 'backdrop: click fuera del modal cancela',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      m.shadowRoot.querySelector('.backdrop').click();
    });
    await page.waitForTimeout(150);
    const open = await page.evaluate(() => {
      return document.querySelectorAll('is-confirm-modal')[0].hasAttribute('open');
    });
    assert.equal(open, false, 'modal debe cerrarse al click en backdrop');
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

report('confirm-modal', failures === 0, { total: tests.length, failures });
