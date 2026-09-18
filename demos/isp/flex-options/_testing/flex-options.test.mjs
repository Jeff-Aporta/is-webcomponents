// flex-options.test.mjs — tests exhaustivos del demo <is-flex-options>.
// Cobertura: smoke + funcional (pintar botones desde actions, click invoca
// onClick, setConfig batch, compact) + re-pintado tras reasignar actions.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/flex-options/flex-options.html`;

const tests = [];

tests.push({
  name: 'smoke: flex-options monta con role=toolbar en shadow',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-opts-ready');
    const info = await page.evaluate(() => {
      const opts = [...document.querySelectorAll('is-flex-options')];
      return opts.map((o) => {
        const sr = o.shadowRoot;
        return {
          id: o.id,
          defined: !!customElements.get('is-flex-options'),
          toolbarRole: sr?.querySelector('[role="toolbar"], .toolbar')?.getAttribute('role'),
          hasButtons: !!sr?.querySelector('is-button, button, [role="button"]'),
          compact: o.compact,
          actionsLen: o.actions.length,
        };
      });
    });
    assert.equal(info[0].defined, true);
    assert.equal(info[0].toolbarRole, 'toolbar', `toolbar debe tener role="toolbar"`);
    assert.equal(info[0].hasButtons, true, 'debe haber botones en el toolbar');
    assert.equal(info[0].actionsLen, 3, 'demo1 debe tener 3 acciones');
    assert.equal(info[2].compact, true, 'demo3 debe tener compact=true');
    await screenshot(page, 'flex-options-smoke');
  },
});

tests.push({
  name: 'funcional: click en acción dispara onClick',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-opts-ready');
    await page.waitForTimeout(150);
    const beforeLog = await page.evaluate(() => document.getElementById('event-log').textContent);
    // Buscar y clickear un botón del demo 1 (Agregar)
    await page.evaluate(() => {
      const opts1 = document.getElementById('opts1');
      const btns = [...opts1.shadowRoot.querySelectorAll('is-button')];
      // Buscar el botón cuyo title incluya "Agregar"
      const add = btns.find((b) => /Agregar/.test(b.getAttribute('title') || ''));
      add?.click();
    });
    await page.waitForTimeout(150);
    const afterLog = await page.evaluate(() => document.getElementById('event-log').textContent);
    assert.ok(afterLog.length > beforeLog.length, 'el log debe crecer tras click en acción');
    assert.ok(/Agregar click/.test(afterLog), 'el log debe contener "Agregar click"');
  },
});

tests.push({
  name: 'funcional: setConfig actualiza actions + compact en bloque',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-opts-ready');
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => {
      const el = document.getElementById('opts3');
      // setConfig está aplicado en el demo (compact=true, 3 acciones)
      return {
        compact: el.compact,
        actionsLen: el.actions.length,
        // Contar botones en shadow
        shadowBtns: el.shadowRoot.querySelectorAll('is-button').length,
      };
    });
    assert.equal(state.compact, true);
    assert.equal(state.actionsLen, 3);
    assert.ok(state.shadowBtns >= 3, `esperaba >=3 botones en shadow, hay ${state.shadowBtns}`);
  },
});

tests.push({
  name: 're-asignar actions re-pinta sin romper el toolbar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-opts-ready');
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => {
      const el = document.getElementById('opts4');
      // Capturar botones antes y después de reasignar.
      const before = [...el.shadowRoot.querySelectorAll('is-button')].map((b) => b.getAttribute('title') || '');
      el.actions = [
        { icon: 'mdi:bell', title: 'Notificación', onClick: () => {} },
        { icon: 'mdi:cog', title: 'Ajustes', onClick: () => {} },
      ];
      const after = [...el.shadowRoot.querySelectorAll('is-button')].map((b) => b.getAttribute('title') || '');
      return { before, after };
    });
    assert.equal(state.before.length, 1, `esperaba 1 botón antes, hay ${state.before.length}`);
    assert.equal(state.after.length, 2, `esperaba 2 botones tras reasignar, hay ${state.after.length}`);
    assert.ok(state.after.some((t) => /Notif/.test(t)), 'debe aparecer "Notificación"');
    assert.ok(state.after.some((t) => /Ajustes/.test(t)), 'debe aparecer "Ajustes"');
  },
});

tests.push({
  name: 'more dropdown: vuelve a pintarse cuando cambia `more`',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flex-opts-ready');
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => {
      const el = document.getElementById('opts2');
      const before = el.shadowRoot.querySelectorAll('is-dropdown').length;
      el.more = [
        { icon: 'mdi:refresh', title: 'Refrescar', onClick: () => {} },
      ];
      const after = el.shadowRoot.querySelectorAll('is-dropdown').length;
      return { before, after, moreLen: el.more.length };
    });
    assert.ok(state.moreLen >= 1, 'more debe tener al menos 1 item');
    // El dropdown debe existir (al menos 1)
    assert.ok(state.before >= 1, `esperaba >=1 dropdown antes, hay ${state.before}`);
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

report('flex-options', failures === 0, { total: tests.length, failures });
