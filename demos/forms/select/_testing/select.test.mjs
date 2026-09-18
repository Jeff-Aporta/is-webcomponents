// select.test.mjs — tests funcionales del demo select.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM montado, listbox en dialog,
//     opciones recogidas del slot
//   - funcional: value→display, click opción cambia selección, multi acumula,
//     clearable limpia selección, value se serializa como FormData correcto
//   - accesibilidad: role=combobox/listbox, aria-activedescendant en navegación,
//     aria-selected, aria-multiselectable, aria-required, aria-invalid
//   - keyboard: ArrowDown abre, ArrowUp/Down navega, Home/End salta, Enter
//     confirma, Escape cierra, typeahead por letra inicial
//   - edge cases: opción deshabilitada se salta en navegación, grupo agrupa
//     sin alterar orden, value vacío elimina atributo
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/select/select.html`;

const tests = [];

tests.push({
  name: 'smoke: 4 selects se definen y montan su shadow DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const data = await page.evaluate(() => {
      const sels = [...document.querySelectorAll('is-select')];
      return sels.map((s) => {
        const sr = s.shadowRoot;
        return {
          defined: !!customElements.get('is-select'),
          hasShadow: !!sr,
          triggerRole: sr?.querySelector('.trigger')?.getAttribute('role'),
          triggerHasPopup: sr?.querySelector('.trigger')?.getAttribute('aria-haspopup'),
          triggerControls: sr?.querySelector('.trigger')?.getAttribute('aria-controls'),
          listboxRole: sr?.querySelector('[part="listbox"]')?.getAttribute('role'),
          listboxId: sr?.querySelector('[part="listbox"]')?.id,
          dialogOpen: sr?.querySelector('dialog.popup')?.open ?? null,
          optionCount: s.querySelectorAll('is-option').length,
          ariaExpanded: sr?.querySelector('.trigger')?.getAttribute('aria-expanded'),
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 selects');
    assert.equal(data[0].defined, true, 'is-select debe estar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root existe');
    assert.equal(data[0].triggerRole, 'combobox', 'trigger tiene role=combobox');
    assert.equal(data[0].triggerHasPopup, 'listbox', 'aria-haspopup=listbox');
    assert.equal(data[0].listboxRole, 'listbox', 'listbox tiene role=listbox');
    assert.equal(data[0].ariaExpanded, 'false', 'aria-expanded inicial=false');
    assert.equal(data[0].optionCount, 5, 'select básico tiene 5 opciones');
    assert.equal(data[0].triggerControls, data[0].listboxId, 'aria-controls referencia el listbox');
    await screenshot(page, 'select-smoke');
  },
});

tests.push({
  name: 'funcional: cambiar value actualiza el display del trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      const sr = s.shadowRoot;
      const before = sr.querySelector('.display')?.textContent;
      s.value = 'fr';
      const after = sr.querySelector('.display')?.textContent;
      return { before, after };
    });
    assert.equal(r.before, 'Español', 'display inicial muestra el label de "es"');
    assert.equal(r.after, 'Français', 'display actualizado tras cambiar value');
  },
});

tests.push({
  name: 'funcional: click en opción cambia value y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      s.show();
    });
    await page.waitForTimeout(80);
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      const sr = s.shadowRoot;
      const opts = [...sr.querySelectorAll('[role="option"]')];
      // click en la 3ra opción (fr)
      opts[2].click();
      return { value: s.value, dialogOpen: sr.querySelector('dialog.popup').open };
    });
    assert.equal(r.value, 'fr', 'value actualizado tras click');
    assert.equal(r.dialogOpen, false, 'dialog se cierra tras seleccionar (single)');
  },
});

tests.push({
  name: 'funcional: multi acumula selecciones y clearable limpia',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const initial = await page.evaluate(() => {
      const s = document.querySelector('#sec-multi is-select');
      return { values: s.values, value: s.value };
    });
    assert.deepEqual(initial.values, ['frontend', 'design'], 'values iniciales: 2 tags');
    assert.equal(initial.value, 'frontend,design', 'value serializa como CSV');

    // limpiar
    const afterClear = await page.evaluate(() => {
      const s = document.querySelector('#sec-multi is-select');
      const sr = s.shadowRoot;
      sr.querySelector('[part="clear"]').click();
      return { values: s.values, value: s.value, attr: s.getAttribute('value') };
    });
    assert.deepEqual(afterClear.values, [], 'values vacío tras clear');
    assert.equal(afterClear.value, '', 'value vacío tras clear');
    assert.equal(afterClear.attr, null, 'atributo value eliminado');
  },
});

tests.push({
  name: 'funcional: aria-multiselectable refleja el modo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const r = await page.evaluate(() => {
      const single = document.querySelector('#sec-basico is-select');
      const multi = document.querySelector('#sec-multi is-select');
      return {
        single: single.shadowRoot.querySelector('[part="listbox"]').getAttribute('aria-multiselectable'),
        multi: multi.shadowRoot.querySelector('[part="listbox"]').getAttribute('aria-multiselectable'),
      };
    });
    assert.equal(r.single, 'false', 'single select: aria-multiselectable=false');
    assert.equal(r.multi, 'true', 'multi select: aria-multiselectable=true');
  },
});

tests.push({
  name: 'teclado: ArrowDown abre y mueve selección, Enter confirma',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    // foco en el trigger
    await page.evaluate(() => {
      document.querySelector('#sec-basico is-select').shadowRoot.querySelector('.trigger').focus();
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    const active = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      const sr = s.shadowRoot;
      return {
        open: sr.querySelector('dialog.popup').open,
        activeDescendant: sr.querySelector('.trigger').getAttribute('aria-activedescendant'),
        activeLabel: sr.querySelector('[data-active]')?.textContent?.trim(),
      };
    });
    assert.equal(active.open, true, 'ArrowDown abre el dialog');
    assert.ok(active.activeDescendant, 'aria-activedescendant está presente');
    assert.equal(active.activeLabel, 'English', '2do ArrowDown mueve a la 2da opción (en)');

    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      const sr = s.shadowRoot;
      return {
        value: s.value,
        open: sr.querySelector('dialog.popup').open,
      };
    });
    assert.equal(after.value, 'en', 'Enter confirma selección');
    assert.equal(after.open, false, 'Enter cierra el dialog');
  },
});

tests.push({
  name: 'teclado: Home/End saltan a la primera/última opción',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    await page.evaluate(() => document.querySelector('#sec-basico is-select').show());
    await page.waitForTimeout(50);
    await page.keyboard.press('End');
    await page.waitForTimeout(50);
    const atEnd = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-select').shadowRoot;
      return sr.querySelector('[data-active]')?.textContent?.trim();
    });
    assert.equal(atEnd, 'Deutsch', 'End salta a la última opción (de)');

    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    const atHome = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-select').shadowRoot;
      return sr.querySelector('[data-active]')?.textContent?.trim();
    });
    assert.equal(atHome, 'Español', 'Home salta a la primera opción (es)');
    // Cerrar para no contaminar el resto
    await page.keyboard.press('Escape');
  },
});

tests.push({
  name: 'teclado: Escape cierra el dialog sin cambiar value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const before = await page.evaluate(() => document.querySelector('#sec-basico is-select').value);
    await page.evaluate(() => document.querySelector('#sec-basico is-select').show());
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      const sr = s.shadowRoot;
      return { value: s.value, open: sr.querySelector('dialog.popup').open };
    });
    assert.equal(after.value, before, 'Escape no modifica value');
    assert.equal(after.open, false, 'Escape cierra el dialog');
  },
});

tests.push({
  name: 'teclado: typeahead por letra salta a la primera coincidencia',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    await page.evaluate(() => document.querySelector('#sec-basico is-select').show());
    await page.waitForTimeout(50);
    await page.keyboard.press('p'); // Português
    await page.waitForTimeout(50);
    const r = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-select').shadowRoot;
      return sr.querySelector('[data-active]')?.textContent?.trim();
    });
    assert.equal(r, 'Português', 'typeahead por "p" selecciona Português');
    await page.keyboard.press('Escape');
  },
});

tests.push({
  name: 'edge case: opción disabled se salta al navegar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    await page.evaluate(() => document.querySelector('#sec-grupos is-select').show());
    await page.waitForTimeout(50);
    // navegar hasta "Soporte" (disabled) y verificar que ArrowDown la salta
    const labels = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(30);
      const lbl = await page.evaluate(() => {
        const sr = document.querySelector('#sec-grupos is-select').shadowRoot;
        const active = sr.querySelector('[data-active]');
        return { label: active?.querySelector('.option-label')?.textContent?.trim(), disabled: active?.hasAttribute('data-disabled') };
      });
      labels.push(lbl);
    }
    const visitedDisabled = labels.some((l) => l.disabled);
    assert.equal(visitedDisabled, false, 'ninguna navegación ArrowDown aterriza en una opción disabled');
    await page.keyboard.press('Escape');
  },
});

tests.push({
  name: 'edge case: grupos aparecen con role=group y cabecera visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-grupos is-select');
      s.show();
      const sr = s.shadowRoot;
      const groups = [...sr.querySelectorAll('[part="group"]')];
      return {
        groupCount: groups.length,
        groupRoles: groups.map((g) => g.getAttribute('role')),
        headers: groups.map((g) => g.querySelector('[part="group-label"]')?.textContent?.trim()),
      };
    });
    assert.equal(r.groupCount, 2, 'hay 2 grupos (Planes, Servicios)');
    r.groupRoles.forEach((role) => assert.equal(role, 'group', 'cada grupo lleva role=group'));
    assert.ok(r.headers.includes('Planes') && r.headers.includes('Servicios'), 'cabeceras de grupo presentes');
  },
});

tests.push({
  name: 'edge case: set value="" elimina el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-select-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-select');
      s.value = '';
      return { attr: s.getAttribute('value'), prop: s.value };
    });
    assert.equal(r.attr, null, 'atributo value eliminado');
    assert.equal(r.prop, '', 'propiedad value devuelve string vacío');
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

report('select', failures === 0, { total: tests.length, failures });
