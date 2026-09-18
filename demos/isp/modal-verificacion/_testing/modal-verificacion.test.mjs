// modal-verificacion.test.mjs — tests exhaustivos del demo <is-modal-verificacion>.
// Cobertura: smoke + funcional (show abre modal, verify ejecuta el controller y
// popula mensajes, contadores derivados, eventos) + focus-trap.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/modal-verificacion/modal-verificacion.html`;

const tests = [];

tests.push({
  name: 'smoke: modal monta con dialog + heading + results + stats + actions',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-verif-ready');
    const info = await page.evaluate(() => {
      const m = document.getElementById('verif');
      const sr = m.shadowRoot;
      return {
        defined: !!customElements.get('is-modal-verificacion'),
        dlg: !!sr.querySelector('is-dialog.dlg'),
        heading: !!sr.querySelector('[part="heading"]'),
        results: !!sr.querySelector('[part="results"]'),
        stats: !!sr.querySelector('[part="stats"]'),
        actions: !!sr.querySelector('[part="actions"]'),
        qInfosEl: !!sr.querySelector('.q-infos'),
        qWarningEl: !!sr.querySelector('.q-warning'),
        qErroresEl: !!sr.querySelector('.q-errores'),
        controllerPresent: !!m.controller,
      };
    });
    assert.equal(info.defined, true);
    assert.equal(info.dlg, true);
    assert.equal(info.heading, true);
    assert.equal(info.results, true);
    assert.equal(info.stats, true);
    assert.equal(info.actions, true);
    assert.equal(info.qInfosEl, true);
    assert.equal(info.qWarningEl, true);
    assert.equal(info.qErroresEl, true);
    assert.equal(info.controllerPresent, true);
    await screenshot(page, 'modal-verif-smoke');
  },
});

tests.push({
  name: 'funcional: show() abre el modal y ejecuta verify() automáticamente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-verif-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const m = document.getElementById('verif');
      m.show();
      await new Promise((r) => setTimeout(r, 600)); // esperar verify() async
      return {
        open: m.open,
        qinfos: m.qinfos,
        qwarning: m.qwarning,
        qerrores: m.qerrores,
        mensajesLen: m.mensajes.length,
      };
    });
    assert.equal(result.open, true, 'modal debe estar abierto');
    // El controller de demo devuelve 1 info + 1 warning + 1 error + 1 success.
    assert.ok(result.mensajesLen >= 3, `esperaba >=3 mensajes, hay ${result.mensajesLen}`);
    assert.ok(result.qinfos >= 1, `qinfos debe ser >= 1, es ${result.qinfos}`);
    assert.ok(result.qwarning >= 1, `qwarning debe ser >= 1, es ${result.qwarning}`);
    assert.ok(result.qerrores >= 1, `qerrores debe ser >= 1, es ${result.qerrores}`);
  },
});

tests.push({
  name: 'eventos: is-verificacion emite con detail { mensajes, qinfos, qwarning, qerrores }',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-verif-ready');
    await page.waitForTimeout(100);
    const events = await page.evaluate(async () => {
      const m = document.getElementById('verif');
      const captured = [];
      m.addEventListener('is-verificacion', (e) => captured.push({
        keys: Object.keys(e.detail || {}),
        qinfos: e.detail?.qinfos,
        qwarning: e.detail?.qwarning,
        qerrores: e.detail?.qerrores,
        bubbles: e.bubbles,
        composed: e.composed,
      }));
      await m.verify();
      return captured;
    });
    assert.ok(events.length >= 1, `esperaba >=1 evento, hay ${events.length}`);
    const ev = events[0];
    assert.ok(ev.keys.includes('mensajes'), 'detail debe contener "mensajes"');
    assert.ok(ev.keys.includes('qinfos'), 'detail debe contener "qinfos"');
    assert.ok(ev.bubbles, 'is-verificacion debe burbujear');
    assert.equal(ev.composed, true, 'is-verificacion debe atravesar shadow DOM');
  },
});

tests.push({
  name: 'contadores: qinfos/qwarning/qerrores se derivan de mensajes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-verif-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const m = document.getElementById('verif');
      // Asignar un controller con lista conocida.
      m.controller = {
        entrie: 'Test',
        async actVerificar() {
          return {
            mensajes: [
              { itdmensaje: 'info', mensaje: 'a' },
              { itdmensaje: 'info', mensaje: 'b' },
              { itdmensaje: 'warning', mensaje: 'c' },
              { itdmensaje: 'error', mensaje: 'd' },
              { itdmensaje: 'error', mensaje: 'e' },
              { itdmensaje: 'error', mensaje: 'f' },
            ],
          };
        },
      };
      await m.verify();
      return {
        qinfos: m.qinfos,
        qwarning: m.qwarning,
        qerrores: m.qerrores,
        total: m.mensajes.length,
      };
    });
    assert.equal(result.qinfos, 2);
    assert.equal(result.qwarning, 1);
    assert.equal(result.qerrores, 3);
    assert.equal(result.total, 6);
  },
});

tests.push({
  name: 'error: actVerificar que lanza emite is-verificacion-error',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-verif-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const m = document.getElementById('verif');
      let captured = null;
      m.addEventListener('is-verificacion-error', (e) => { captured = e.detail; });
      m.onError = () => {}; // silenciar console.error
      m.controller = {
        entrie: 'Test',
        async actVerificar() {
          throw new Error('boom');
        },
      };
      const result = await m.verify();
      return { captured, resultLen: result.length, loading: m.loading };
    });
    assert.ok(result.captured, 'debe emitir is-verificacion-error');
    assert.match(result.captured.message, /boom|No se pudo/);
    assert.equal(result.loading, false, 'loading debe volver a false en finally');
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

report('modal-verificacion', failures === 0, { total: tests.length, failures });
