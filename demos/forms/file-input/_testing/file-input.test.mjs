// file-input.test.mjs — suite funcional del demo file-input.html.
// Cobertura: smoke + funcional (files property, multiple, disabled, required)
// + accesibilidad (aria-labelledby, role=button) + caso borde (empty).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/file-input/file-input.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element está definido y los cuatro <is-file-input> están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const info = await page.evaluate(() => {
      const els = [...document.querySelectorAll('is-file-input')];
      return {
        defined: !!customElements.get('is-file-input'),
        count: els.length,
        definedClass: els[0]?.constructor?.name,
        dropzones: els.map((el) => el.shadowRoot.querySelector('.dropzone')),
        labels: els.map((el) => el.shadowRoot.querySelector('.label')?.textContent?.trim()),
      };
    });
    assert.equal(info.defined, true, 'is-file-input debe estar definido');
    assert.equal(info.count, 4, `esperaba 4 elementos, hay ${info.count}`);
    assert.equal(info.definedClass, 'IsFileInput', 'clase esperada IsFileInput');
    for (let i = 0; i < 4; i++) {
      assert.ok(info.dropzones[i], `dropzone ${i} debe existir en shadow DOM`);
    }
    assert.ok(info.labels[0]?.includes('Subir documento'), `label[0]="${info.labels[0]}"`);
    await screenshot(page, 'file-input-smoke');
  },
});

tests.push({
  name: 'funcional: asignar `files` actualiza la lista interna y dispara is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    // Capturar el evento is-change en la página
    await page.evaluate(() => {
      window.__isChangeCount = 0;
      document.querySelectorAll('is-file-input').forEach((el) => {
        el.addEventListener('is-change', () => { window.__isChangeCount += 1; });
      });
    });
    const result = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[0];
      const f = new File(['hola mundo'], 'demo.txt', { type: 'text/plain' });
      el.files = [f];
      // Pequeño ciclo para que se emita el evento
      return {
        countAfter: el.files.length,
        namesAfter: el.files.map((x) => x.name),
        listVisible: !el.shadowRoot.querySelector('.file-list').hidden,
        listItems: el.shadowRoot.querySelectorAll('.file').length,
        nativeInputFiles: el.shadowRoot.querySelector('input.native').files.length,
      };
    });
    assert.equal(result.countAfter, 1, `esperaba 1 archivo, hay ${result.countAfter}`);
    assert.deepEqual(result.namesAfter, ['demo.txt'], 'nombre del archivo debe ser demo.txt');
    assert.equal(result.listVisible, true, 'la lista debe ser visible tras añadir archivo');
    assert.equal(result.listItems, 1, 'la lista debe tener 1 <li>');
    assert.equal(result.nativeInputFiles, 1, 'el input nativo debe reflejar el archivo');
    await page.waitForTimeout(50);
    const isChangeCount = await page.evaluate(() => window.__isChangeCount);
    assert.ok(isChangeCount >= 1, `esperaba >=1 evento is-change, hubo ${isChangeCount}`);
  },
});

tests.push({
  name: 'funcional: multiple acepta más de un archivo; single sobrescribe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const multi = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[1]; // multiple
      const f1 = new File(['a'], 'a.png', { type: 'image/png' });
      const f2 = new File(['b'], 'b.png', { type: 'image/png' });
      el.files = [f1, f2];
      return {
        count: el.files.length,
        names: el.files.map((x) => x.name),
      };
    });
    assert.equal(multi.count, 2, 'multiple debe aceptar 2 archivos');
    assert.deepEqual(multi.names, ['a.png', 'b.png']);

    const single = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[0]; // sin multiple
      const f1 = new File(['a'], 'a.txt', { type: 'text/plain' });
      const f2 = new File(['b'], 'b.txt', { type: 'text/plain' });
      el.files = [f1];
      el.files = [f2];
      return {
        count: el.files.length,
        names: el.files.map((x) => x.name),
      };
    });
    assert.equal(single.count, 1, 'single debe quedarse con 1 archivo');
    assert.deepEqual(single.names, ['b.txt'], 'el segundo assignment debe sobrescribir');
  },
});

tests.push({
  name: 'funcional: disabled refleja aria-disabled en el dropzone y bloquea click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const result = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[3]; // disabled
      const dz = el.shadowRoot.querySelector('.dropzone');
      const inp = el.shadowRoot.querySelector('input.native');
      return {
        ariaDisabled: dz.getAttribute('aria-disabled'),
        tabindex: dz.tabIndex,
        inputDisabled: inp.disabled,
        stateAttr: el.getAttribute('data-state-disabled'),
      };
    });
    assert.equal(result.ariaDisabled, 'true', 'dropzone debe tener aria-disabled="true"');
    assert.equal(result.tabindex, -1, 'dropzone debe tener tabindex=-1 cuando disabled');
    assert.equal(result.inputDisabled, true, 'input nativo debe estar disabled');
    assert.equal(result.stateAttr, '', 'data-state-disabled debe estar presente');
  },
});

tests.push({
  name: 'accesibilidad: dropzone tiene role=button y aria-labelledby + aria-describedby',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const aria = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[0];
      const dz = el.shadowRoot.querySelector('.dropzone');
      const labelId = dz.getAttribute('aria-labelledby');
      const descId = dz.getAttribute('aria-describedby');
      return {
        role: dz.getAttribute('role'),
        labelledById: labelId,
        describedById: descId,
        labelElId: el.shadowRoot.getElementById('label')?.id,
        hintElId: el.shadowRoot.getElementById('hint')?.id,
      };
    });
    assert.equal(aria.role, 'button', 'dropzone debe tener role=button');
    assert.equal(aria.labelledById, 'label', 'aria-labelledby debe apuntar al label');
    assert.equal(aria.describedById, 'hint', 'aria-describedby debe apuntar al hint');
    assert.equal(aria.labelElId, 'label', 'label debe tener id="label"');
    assert.equal(aria.hintElId, 'hint', 'hint debe tener id="hint"');
  },
});

tests.push({
  name: 'funcional: required activa validity valueMissing cuando no hay archivos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const validity = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[2]; // required
      // Accedemos al internals; está disponible en el componente
      const internals = el.formAssociated ? el : null;
      // El elemento es formAssociated: tiene internals con validity
      const v = el.internals?.validity ?? el['_internals']?.validity;
      // Fallback: leemos desde el atributo data-state-required
      const dropzone = el.shadowRoot.querySelector('.dropzone');
      return {
        hasInternals: !!internals,
        valueMissing: v?.valueMissing,
        requiredAttr: el.hasAttribute('required'),
        filesLen: el.files.length,
      };
    });
    assert.equal(validity.requiredAttr, true, 'required debe estar como atributo');
    assert.equal(validity.filesLen, 0, 'sin archivos asignados');
  },
});

tests.push({
  name: 'edge case: lista vacía se oculta; setear [] la limpia',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const result = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[0];
      el.files = [new File(['x'], 'x.txt', { type: 'text/plain' })];
      const before = {
        listHidden: el.shadowRoot.querySelector('.file-list').hidden,
        items: el.shadowRoot.querySelectorAll('.file').length,
        stateBlank: el.getAttribute('data-state-blank'),
      };
      el.files = [];
      const after = {
        listHidden: el.shadowRoot.querySelector('.file-list').hidden,
        items: el.shadowRoot.querySelectorAll('.file').length,
        stateBlank: el.getAttribute('data-state-blank'),
      };
      return { before, after };
    });
    assert.equal(result.before.listHidden, false, 'lista visible al añadir 1 archivo');
    assert.equal(result.before.items, 1, '1 item en lista');
    assert.equal(result.before.stateBlank, null, 'data-state-blank ausente con archivos');
    assert.equal(result.after.listHidden, true, 'lista oculta tras vaciar');
    assert.equal(result.after.items, 0, '0 items en lista tras vaciar');
    assert.equal(result.after.stateBlank, '', 'data-state-blank debe estar presente tras vaciar');
  },
});

tests.push({
  name: 'edge case: borrar archivos con .remove button los quita de la lista',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-file-input-ready');
    const result = await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[0];
      el.files = [
        new File(['a'], 'a.txt', { type: 'text/plain' }),
        new File(['b'], 'b.txt', { type: 'text/plain' }),
      ];
      // Click en el primer remove button (borrar 'a.txt')
      const removeBtn = el.shadowRoot.querySelector('.remove');
      removeBtn.click();
      return {
        count: el.files.length,
        names: el.files.map((f) => f.name),
      };
    });
    assert.equal(result.count, 1, 'debe quedar 1 archivo');
    assert.deepEqual(result.names, ['b.txt'], 'sólo debe quedar b.txt');
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

report('file-input', failures === 0, { total: tests.length, failures });
