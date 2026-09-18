// inline-edit.test.mjs — tests funcionales del demo inline-edit.html.
// Cobertura: smoke + funcional (clic activa editor, Enter guarda, Esc cancela,
// blur guarda por defecto, cancel-on-blur revierte) + accesibilidad
// (input/textarea en shadow DOM) + caso límite (vacío/required).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/inline-edit/inline-edit.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-inline-edit> queda definido y muestra el valor inicial',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(() => {
      const items = [...document.querySelectorAll('main is-inline-edit')];
      const task = items.find((i) => i.getAttribute('name') === 'task');
      const shadow = task.shadowRoot;
      return {
        defined: !!customElements.get('is-inline-edit'),
        count: items.length,
        value: task.value,
        textContent: shadow.querySelector('[part="display"] .text')?.textContent,
        hasInput: !!shadow.querySelector('input'),
        hasDisplay: !!shadow.querySelector('[part="display"]'),
        mode: task.getAttribute('mode'),
      };
    });
    assert.equal(data.defined, true, 'is-inline-edit debe estar definido');
    assert.ok(data.count >= 5, `esperaba >=5 inline-edits, hay ${data.count}`);
    assert.equal(data.value, 'Comprar pan', 'el value inicial debe ser "Comprar pan"');
    assert.equal(data.textContent, 'Comprar pan', 'el texto visible debe coincidir con el value');
    assert.equal(data.hasInput, true, 'modo texto debe tener <input> en shadow DOM');
    assert.equal(data.hasDisplay, true, 'debe tener part="display"');
    assert.equal(data.mode, null, 'task no debe tener mode (default = text)');
    await screenshot(page, 'inline-edit-smoke');
  },
});

tests.push({
  name: 'funcional: clic activa el modo edición y expone un input editable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(async () => {
      const task = document.querySelector('is-inline-edit[name="task"]');
      const editPromise = new Promise((resolve) => {
        task.addEventListener('is-edit', () => resolve(true), { once: true });
      });
      // Antes del clic no debe haber <input> visible (el root está en is-idle)
      const before = {
        editing: task.editing,
        rootClass: task.shadowRoot.querySelector('.root').className,
      };
      task.click();
      const after = {
        editing: task.editing,
        rootClass: task.shadowRoot.querySelector('.root').className,
        hasInput: !!task.shadowRoot.querySelector('input'),
      };
      const editEmitted = await Promise.race([
        editPromise,
        new Promise((res) => setTimeout(() => res(false), 500)),
      ]);
      return { before, after, editEmitted };
    });
    assert.equal(data.before.editing, false, 'inicialmente NO debe estar en modo edición');
    assert.match(data.before.rootClass, /is-idle/, 'inicialmente debe tener clase is-idle');
    assert.equal(data.after.editing, true, 'tras clic debe estar en modo edición');
    assert.match(data.after.rootClass, /is-editing/, 'tras clic debe tener clase is-editing');
    assert.equal(data.after.hasInput, true, 'tras clic debe existir el input editable');
    assert.equal(data.editEmitted, true, 'debe haberse emitido is-edit');
  },
});

tests.push({
  name: 'funcional: Enter guarda el nuevo valor y emite is-save',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(async () => {
      const task = document.querySelector('is-inline-edit[name="task"]');
      const savePromise = new Promise((resolve) => {
        task.addEventListener('is-save', (e) => resolve(e.detail), { once: true });
      });
      task.click();
      const input = task.shadowRoot.querySelector('input');
      input.value = 'Comprar leche';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Enter → guarda
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      const detail = await Promise.race([
        savePromise,
        new Promise((res) => setTimeout(() => res(null), 500)),
      ]);
      return {
        value: task.value,
        displayedText: task.shadowRoot.querySelector('[part="display"] .text').textContent,
        saveDetail: detail,
      };
    });
    assert.equal(data.value, 'Comprar leche', `value debe ser "Comprar leche", obtuve "${data.value}"`);
    assert.equal(data.displayedText, 'Comprar leche', 'el display debe reflejar el nuevo valor');
    assert.ok(data.saveDetail, 'debe haberse emitido is-save');
    assert.equal(data.saveDetail.value, 'Comprar leche', 'is-save.detail.value debe ser el nuevo valor');
    assert.equal(data.saveDetail.previous, 'Comprar pan', 'is-save.detail.previous debe ser el valor anterior');
  },
});

tests.push({
  name: 'funcional: Esc cancela y revierte al valor anterior',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(async () => {
      const task = document.querySelector('is-inline-edit[name="task"]');
      const cancelPromise = new Promise((resolve) => {
        task.addEventListener('is-cancel', (e) => resolve(e.detail), { once: true });
      });
      const before = task.value;
      task.click();
      const input = task.shadowRoot.querySelector('input');
      input.value = 'No guardar';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Esc → cancela
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      const detail = await Promise.race([
        cancelPromise,
        new Promise((res) => setTimeout(() => res(null), 500)),
      ]);
      return {
        before,
        after: task.value,
        cancelDetail: detail,
      };
    });
    assert.equal(data.before, 'Comprar pan', 'valor inicial');
    assert.equal(data.after, 'Comprar pan', 'tras Esc el value debe volver al inicial');
    assert.ok(data.cancelDetail, 'debe haberse emitido is-cancel');
    assert.equal(data.cancelDetail.value, 'Comprar pan', 'cancel.detail.value debe ser el revertido');
  },
});

tests.push({
  name: 'funcional: blur guarda el valor (comportamiento por defecto)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(async () => {
      const task = document.querySelector('is-inline-edit[name="task"]');
      const savePromise = new Promise((resolve) => {
        task.addEventListener('is-save', (e) => resolve(e.detail?.value), { once: true });
      });
      task.click();
      const input = task.shadowRoot.querySelector('input');
      input.value = 'Nuevo';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // blur → debe guardar
      input.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
      const saved = await Promise.race([
        savePromise,
        new Promise((res) => setTimeout(() => res(null), 500)),
      ]);
      return { value: task.value, saved };
    });
    assert.equal(data.value, 'Nuevo', `blur debe guardar, obtuve "${data.value}"`);
    assert.equal(data.saved, 'Nuevo', 'is-save debe dispararse con el nuevo valor');
  },
});

tests.push({
  name: 'funcional: cancel-on-blur revierte en vez de guardar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(async () => {
      const nick = document.querySelector('is-inline-edit[name="nickname"]');
      const cancelPromise = new Promise((resolve) => {
        nick.addEventListener('is-cancel', (e) => resolve(e.detail?.value), { once: true });
      });
      const before = nick.value;
      nick.click();
      const input = nick.shadowRoot.querySelector('input');
      input.value = 'temporal';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
      const cancelled = await Promise.race([
        cancelPromise,
        new Promise((res) => setTimeout(() => res(null), 500)),
      ]);
      return { before, after: nick.value, cancelled };
    });
    assert.equal(data.before, 'usuario123', 'valor inicial');
    assert.equal(data.after, 'usuario123', 'cancel-on-blur debe revertir, no guardar "temporal"');
    assert.equal(data.cancelled, 'usuario123', 'is-cancel debe dispararse con el valor revertido');
  },
});

tests.push({
  name: 'funcional: mode=textarea crea un <textarea> en lugar de <input>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(() => {
      const desc = document.querySelector('is-inline-edit[name="description"]');
      const shadow = desc.shadowRoot;
      const ta = shadow.querySelector('textarea');
      const inp = shadow.querySelector('input');
      return {
        mode: desc.getAttribute('mode'),
        hasTextarea: !!ta,
        hasInput: !!inp,
        rows: ta?.getAttribute('rows'),
        value: desc.value,
      };
    });
    assert.equal(data.mode, 'textarea', 'mode debe ser textarea');
    assert.equal(data.hasTextarea, true, 'debe existir un <textarea> en shadow DOM');
    assert.equal(data.hasInput, false, 'NO debe existir un <input> en shadow DOM');
    assert.equal(data.rows, '3', 'rows debe ser 3');
    assert.match(data.value, /Notas adicionales/);
  },
});

tests.push({
  name: 'funcional: disabled impide entrar en modo edición al hacer clic',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(() => {
      const locked = document.querySelector('is-inline-edit[name="locked"]');
      const before = locked.editing;
      locked.click();
      const after = locked.editing;
      const input = locked.shadowRoot.querySelector('input,textarea');
      return {
        disabled: locked.hasAttribute('disabled'),
        before,
        after,
        inputDisabled: input?.disabled,
      };
    });
    assert.equal(data.disabled, true, 'el control debe llevar disabled');
    assert.equal(data.before, false, 'inicialmente no está editando');
    assert.equal(data.after, false, 'clic no debe activar edición en disabled');
    assert.equal(data.inputDisabled, true, 'el input interno debe estar disabled');
  },
});

tests.push({
  name: 'caso límite: required y value vacío expone :invalid (form-associated)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(() => {
      const title = document.querySelector('is-inline-edit[name="title"]');
      return {
        required: title.hasAttribute('required'),
        value: title.value,
        valid: title.checkValidity(),
        blank: title.matches(':state(blank)'),
        placeholder: title.getAttribute('placeholder'),
      };
    });
    assert.equal(data.required, true, 'debe llevar required');
    assert.equal(data.value, '', 'value inicial vacío');
    assert.equal(data.blank, true, 'custom state :state(blank)');
    assert.equal(data.valid, false, 'checkValidity() debe devolver false');
    assert.match(data.placeholder, /Título obligatorio/);
  },
});

tests.push({
  name: 'caso límite: el control expone formValue a través del form-associated',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-inline-edit-ready');
    const data = await page.evaluate(() => {
      // Construimos un form con un inline-edit dentro y leemos FormData
      const form = document.createElement('form');
      const ie = document.createElement('is-inline-edit');
      ie.setAttribute('name', 'sample');
      ie.setAttribute('value', 'mi-valor');
      form.appendChild(ie);
      document.body.appendChild(form);
      const fd = new FormData(form);
      const got = fd.get('sample');
      ie.value = '';
      const fd2 = new FormData(form);
      const got2 = fd2.get('sample');
      form.remove();
      return { got, got2 };
    });
    assert.equal(data.got, 'mi-valor', 'FormData debe incluir el value del inline-edit');
    assert.equal(data.got2, '', 'tras vaciar el value, FormData debe devolver string vacío');
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

report('inline-edit', failures === 0, { total: tests.length, failures });
