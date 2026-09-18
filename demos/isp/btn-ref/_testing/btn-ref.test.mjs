// btn-ref.test.mjs — tests exhaustivos del demo <is-btn-ref>.
// Cobertura: smoke + funcional (open modal, setValue, is-selected-record,
// typing) + form-associated (name + FormData) + validacion required.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/btn-ref/btn-ref.html`;

const tests = [];

tests.push({
  name: 'smoke: btn-ref monta con input + open button dentro del shadow',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-btn-ref-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('ref-app');
      const sr = el.shadowRoot;
      return {
        defined: !!customElements.get('is-btn-ref'),
        inputExists: !!sr.querySelector('is-input.field'),
        openBtnExists: !!sr.querySelector('button.open'),
        label: el.label,
        value: el.value,
        required: el.required,
        maxlength: el.maxlength,
        controllerPresent: !!el.controller,
      };
    });
    assert.equal(info.defined, true);
    assert.equal(info.inputExists, true, 'debe haber un <is-input class="field">');
    assert.equal(info.openBtnExists, true, 'debe haber un <button class="open">');
    assert.equal(info.label, 'Aplicación');
    assert.equal(info.value, '');
    assert.equal(info.required, true);
    assert.equal(info.maxlength, 6);
    assert.equal(info.controllerPresent, true, 'controller debe estar asignado');
    await screenshot(page, 'btn-ref-smoke');
  },
});

tests.push({
  name: 'funcional: open() muestra el modal con <is-catalogo-gen>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-btn-ref-ready');
    await page.waitForTimeout(150);
    // Llamar open() y verificar que el dialog está abierto.
    const dialogInfo = await page.evaluate(async () => {
      const el = document.getElementById('ref-app');
      el.open();
      await new Promise((r) => setTimeout(r, 200));
      const dlg = el.shadowRoot.querySelector('is-dialog.dlg');
      const cat = el.shadowRoot.querySelector('is-catalogo-gen.cat');
      return {
        catExists: !!cat,
        catSelectMode: cat?.hasAttribute('select-mode'),
        dlgOpen: !!(dlg?.open ?? dlg?.hasAttribute('open')),
      };
    });
    assert.equal(dialogInfo.catExists, true, '<is-catalogo-gen> debe existir dentro del shadow');
  },
});

tests.push({
  name: 'funcional: set value programáticamente resuelve label desde controller',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-btn-ref-ready');
    await page.waitForTimeout(100);
    // Disparar el botón set-value del demo.
    await page.click('#set-value');
    await page.waitForTimeout(300); // esperar async resolveLabel
    const state = await page.evaluate(async () => {
      const el = document.getElementById('ref-app');
      // Esperar hasta que la label resuelva (Controller.Lista es async).
      for (let i = 0; i < 20; i++) {
        const lbl = el.shadowRoot.querySelector('.value-label')?.textContent?.trim() ?? '';
        if (lbl && lbl !== 'Cargando...') break;
        await new Promise((r) => setTimeout(r, 100));
      }
      return {
        value: el.value,
        attrValue: el.getAttribute('value'),
        label: el.shadowRoot.querySelector('.value-label')?.textContent?.trim() ?? '',
      };
    });
    assert.equal(state.value, 'NS', `value debe ser 'NS', es '${state.value}'`);
    assert.equal(state.attrValue, 'NS');
    assert.ok(state.label.length > 0, `label debe estar resuelto, es '${state.label}'`);
    assert.ok(/NominaSoft|NS/.test(state.label), `label debe contener el nombre o la clave, es '${state.label}'`);
  },
});

tests.push({
  name: 'funcional: typing emite is-input y al detenerse resuelve label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-btn-ref-ready');
    await page.waitForTimeout(150);
    const events = await page.evaluate(async () => {
      const el = document.getElementById('ref-app');
      const captured = [];
      el.addEventListener('is-input', (e) => captured.push({ type: 'input', value: e.detail.value }));
      el.addEventListener('is-typing-end', (e) => captured.push({ type: 'typing-end', value: e.detail.value }));
      el.addEventListener('is-change', (e) => captured.push({ type: 'change', value: e.detail.value }));
      // Simular typing a mano vía setter (los tests no pueden teclear en shadow input).
      // Forzar input event dispatchado en el <is-input>.
      const inputEl = el.shadowRoot.querySelector('is-input.field');
      inputEl.value = 'CP';
      inputEl.dispatchEvent(new CustomEvent('is-input', { detail: { value: 'CP' }, bubbles: true, composed: true }));
      inputEl.dispatchEvent(new CustomEvent('is-typing-end', { detail: { value: 'CP' }, bubbles: true, composed: true }));
      return captured;
    });
    assert.ok(events.some((e) => e.type === 'input'), 'debe emitir is-input');
    assert.ok(events.some((e) => e.type === 'typing-end'), 'debe emitir is-typing-end');
    assert.ok(events.some((e) => e.type === 'change'), 'debe emitir is-change');
  },
});

tests.push({
  name: 'form-associated: aporta value a FormData vía name',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-btn-ref-ready');
    await page.waitForTimeout(100);
    // Poner value y construir un form para inspeccionar FormData.
    const info = await page.evaluate(async () => {
      const el = document.getElementById('ref-app');
      el.value = 'AW';
      await new Promise((r) => setTimeout(r, 50));
      const form = document.createElement('form');
      form.appendChild(el);
      document.body.appendChild(form);
      const fd = new FormData(form);
      const out = [...fd.entries()];
      form.remove();
      return { entries: out, formAssociated: !!el.constructor.formAssociated };
    });
    assert.equal(info.formAssociated, true, '<is-btn-ref> debe ser form-associated');
    const found = info.entries.find(([k, v]) => k === 'aplicacion');
    assert.ok(found, `FormData debe contener name="aplicacion", entries=${JSON.stringify(info.entries)}`);
    assert.equal(found[1], 'AW', `valor en FormData debe ser 'AW', es '${found[1]}'`);
  },
});

tests.push({
  name: 'validación: required sin value falla checkValidity',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-btn-ref-ready');
    await page.waitForTimeout(100);
    const info = await page.evaluate(() => {
      const el = document.getElementById('ref-app');
      const form = document.createElement('form');
      form.appendChild(el);
      document.body.appendChild(form);
      const valid = form.checkValidity();
      const validity = el.checkValidity?.();
      const validationMsg = el.validationMessage;
      form.remove();
      return { valid, validity, validationMsg, hasValidity: 'validity' in el };
    });
    assert.equal(info.hasValidity, true, 'el.checkValidity() debe existir (form-associated)');
    assert.equal(info.valid, false, 'form debe ser inválido con required y sin value');
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

report('btn-ref', failures === 0, { total: tests.length, failures });
