// time-input.test.mjs — tests exhaustivos del demo time-input.html.
// Cobertura: smoke + funcional (open/close dialog, paneles sections/list/clock,
// cambio de valor) + accesibilidad + edge cases (vacío, inválido, disabled).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/time-input/time-input.html`;

const tests = [];

tests.push({
  name: 'smoke: el input se monta, contiene un is-time-field y un trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const info = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('is-time-input')];
      return {
        count: inputs.length,
        defined: !!customElements.get('is-time-input'),
        fieldsByInput: inputs.map((i) => i.shadowRoot.querySelectorAll('is-time-field').length),
        triggersByInput: inputs.map((i) => i.shadowRoot.querySelectorAll('.trigger').length),
        hasFormAssociated: 'formAssociated' in inputs[0],
      };
    });
    assert.equal(info.defined, true, 'is-time-input debe estar definido');
    assert.ok(info.count >= 6, `esperaba >=6 inputs en la página, hay ${info.count}`);
    assert.ok(info.fieldsByInput.every((n) => n >= 1),
      `cada input debe contener >=1 is-time-field, hay ${JSON.stringify(info.fieldsByInput)}`);
    assert.ok(info.triggersByInput.every((n) => n >= 1),
      `cada input debe tener >=1 trigger, hay ${JSON.stringify(info.triggersByInput)}`);
    assert.equal(info.hasFormAssociated, true, 'el input debe ser form-associated');
    await screenshot(page, 'time-input-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja en shadow DOM y en el host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.setAttribute('value', '15:45');
    });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const field = el.shadowRoot.querySelector('is-time-field');
      const secs = [...field.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        attr: el.getAttribute('value'),
        prop: el.value,
        fieldValue: field.getAttribute('value'),
        sectionValues: secs.map((s) => s.getAttribute('aria-valuenow')),
      };
    });
    assert.equal(data.attr, '15:45', 'value debe reflejarse en el atributo');
    assert.equal(data.prop, '15:45', 'value debe reflejarse en la propiedad');
    assert.equal(data.fieldValue, '15:45', 'el field interno debe tener el valor');
    assert.deepEqual(data.sectionValues, ['15', '45'], 'secciones h/M = 15/45');
  },
});

tests.push({
  name: 'funcional: setear value por propiedad también refleja en el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.value = '09:30';
    });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      return { attr: el.getAttribute('value'), prop: el.value };
    });
    assert.equal(data.attr, '09:30');
    assert.equal(data.prop, '09:30');
  },
});

tests.push({
  name: 'funcional: show() abre el dialog con panel digital-clock (sections por defecto)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const result = await page.evaluate(async () => {
      const el = document.getElementById('basic');
      el.show();
      await new Promise((r) => setTimeout(r, 100));
      const dialog = el.shadowRoot.querySelector('dialog.popup');
      return {
        dialogOpen: dialog.open,
        hasClock: !!el.shadowRoot.querySelector('is-digital-clock'),
        clockLayout: el.shadowRoot.querySelector('is-digital-clock')?.getAttribute('layout'),
      };
    });
    assert.equal(result.dialogOpen, true, 'show() debe abrir el <dialog>');
    assert.equal(result.hasClock, true, 'el panel debe contener un <is-digital-clock>');
    assert.equal(result.clockLayout, 'sections', 'panel por defecto debe ser sections');
  },
});

tests.push({
  name: 'funcional: panel=list usa layout list en el digital-clock',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const result = await page.evaluate(async () => {
      const el = document.getElementById('list');
      el.show();
      await new Promise((r) => setTimeout(r, 100));
      const clock = el.shadowRoot.querySelector('is-digital-clock');
      const list = el.shadowRoot.querySelector('is-digital-clock')?.shadowRoot.querySelector('[role="listbox"]');
      return {
        dialogOpen: el.shadowRoot.querySelector('dialog.popup').open,
        clockLayout: clock?.getAttribute('layout'),
        hasListbox: !!list,
      };
    });
    assert.equal(result.dialogOpen, true, 'show() debe abrir el <dialog>');
    assert.equal(result.clockLayout, 'list', 'panel=list debe fijar layout=list en el clock');
    assert.equal(result.hasListbox, true, 'el clock debe renderizar un role=listbox');
  },
});

tests.push({
  name: 'funcional: panel=clock usa un is-time-clock analógico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const result = await page.evaluate(async () => {
      const el = document.getElementById('clock');
      el.show();
      await new Promise((r) => setTimeout(r, 100));
      return {
        dialogOpen: el.shadowRoot.querySelector('dialog.popup').open,
        hasTimeClock: !!el.shadowRoot.querySelector('is-time-clock'),
        hasDigitalClock: !!el.shadowRoot.querySelector('is-digital-clock'),
      };
    });
    assert.equal(result.dialogOpen, true, 'show() debe abrir el <dialog>');
    assert.equal(result.hasTimeClock, true, 'panel=clock debe contener un <is-time-clock>');
    assert.equal(result.hasDigitalClock, false, 'panel=clock NO debe contener un <is-digital-clock>');
    await screenshot(page, 'time-input-clock-panel');
  },
});

tests.push({
  name: 'funcional: hide() cierra el dialog',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const result = await page.evaluate(async () => {
      const el = document.getElementById('basic');
      el.show();
      await new Promise((r) => setTimeout(r, 50));
      el.hide();
      await new Promise((r) => setTimeout(r, 50));
      return {
        dialogOpen: el.shadowRoot.querySelector('dialog.popup').open,
      };
    });
    assert.equal(result.dialogOpen, false, 'hide() debe cerrar el <dialog>');
  },
});

tests.push({
  name: 'funcional: el trigger abre el panel al hacer click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      const trigger = el.shadowRoot.querySelector('.trigger');
      trigger.click();
    });
    await page.waitForTimeout(80);
    const open = await page.evaluate(() => {
      return document.getElementById('basic').shadowRoot.querySelector('dialog.popup').open;
    });
    assert.equal(open, true, 'click en el trigger debe abrir el dialog');
  },
});

tests.push({
  name: 'funcional: is-change emite evento al cambiar el valor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    await page.evaluate(() => {
      window.__changes = [];
      document.getElementById('basic').addEventListener('is-change', (e) => {
        window.__changes.push(e.detail?.value ?? '');
      });
    });
    await page.evaluate(() => { document.getElementById('basic').value = '10:30'; });
    await page.waitForTimeout(50);
    const changes = await page.evaluate(() => window.__changes);
    assert.deepEqual(changes, ['10:30'], 'is-change debe emitir el nuevo valor');
  },
});

tests.push({
  name: 'accesibilidad: el trigger tiene aria-haspopup y aria-expanded',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const trigger = el.shadowRoot.querySelector('.trigger');
      return {
        hasPopup: trigger.getAttribute('aria-haspopup'),
        expanded: trigger.getAttribute('aria-expanded'),
        label: trigger.getAttribute('aria-label'),
      };
    });
    assert.equal(info.hasPopup, 'dialog', 'trigger debe tener aria-haspopup="dialog"');
    assert.equal(info.expanded, 'false', 'trigger debe tener aria-expanded="false" antes de abrir');
    assert.ok(info.label, 'trigger debe tener aria-label');
  },
});

tests.push({
  name: 'accesibilidad: aria-expanded pasa a "true" al abrir el panel',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const expanded = await page.evaluate(async () => {
      const el = document.getElementById('basic');
      el.show();
      await new Promise((r) => setTimeout(r, 80));
      return el.shadowRoot.querySelector('.trigger').getAttribute('aria-expanded');
    });
    assert.equal(expanded, 'true', 'aria-expanded debe ser "true" cuando el dialog está abierto');
  },
});

tests.push({
  name: 'accesibilidad: las secciones del field interno tienen aria-label y role',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const field = el.shadowRoot.querySelector('is-time-field');
      const secs = [...field.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        count: secs.length,
        labels: secs.map((s) => s.getAttribute('aria-label')),
      };
    });
    assert.ok(info.count >= 2, `esperaba >=2 secciones, hay ${info.count}`);
    assert.ok(info.labels.every(Boolean), 'todas las secciones deben tener aria-label');
    assert.ok(info.labels.some((l) => /hora|hour/i.test(l)), 'debe haber aria-label de hora');
    assert.ok(info.labels.some((l) => /minuto|minute/i.test(l)), 'debe haber aria-label de minuto');
  },
});

tests.push({
  name: 'edge: input vacío expone valor vacío y no falla checkValidity',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      return {
        prop: el.value,
        attr: el.getAttribute('value'),
        valid: el.checkValidity(),
      };
    });
    assert.equal(info.prop, '');
    assert.equal(info.attr, null);
    assert.equal(info.valid, true, 'sin required, un input vacío debe pasar checkValidity');
  },
});

tests.push({
  name: 'edge: disabled no permite abrir el panel al pulsar el trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('disabled-field');
      const trigger = el.shadowRoot.querySelector('.trigger');
      const dialog = el.shadowRoot.querySelector('dialog.popup');
      return {
        triggerDisabled: trigger.disabled,
        dialogOpen: dialog.open,
      };
    });
    assert.equal(info.triggerDisabled, true, 'el trigger debe estar disabled');
    assert.equal(info.dialogOpen, false, 'el dialog debe estar cerrado');
  },
});

tests.push({
  name: 'edge: el panel móvil expone la barra de acciones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('mobile');
      el.show();
      const actions = el.shadowRoot.querySelector('.actions');
      return {
        visible: actions && !actions.hidden,
        buttons: [...el.shadowRoot.querySelectorAll('[data-act]')].map((b) => b.dataset.act),
      };
    });
    assert.equal(info.visible, true, 'la barra de acciones debe estar visible en modo móvil');
    assert.deepEqual(info.buttons.sort(), ['accept', 'cancel', 'clear', 'now'],
      'la barra debe tener 4 botones: accept, cancel, clear, now');
  },
});

tests.push({
  name: 'funcional: cambiar el valor en el field interno se refleja en el host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-input-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      const field = el.shadowRoot.querySelector('is-time-field');
      field.setAttribute('value', '11:11');
    });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      return { attr: el.getAttribute('value'), prop: el.value };
    });
    assert.equal(data.attr, '11:11');
    assert.equal(data.prop, '11:11');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  let detail = {};
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    detail = { error: String(err?.message ?? err) };
    console.error(`  ✗ ${t.name}\n     ${detail.error}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('time-input', failures === 0, { total: tests.length, failures });
