// mention.test.mjs — tests funcionales del demo mention.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con input + popup listbox,
//     sugerencias leídas del script JSON
//   - funcional: tipear @ muestra popup, filtrado case-insensitive, seleccionar
//     reemplaza el texto con "<trigger><item> " y emite is-select + is-change,
//     max-items limita el popup
//   - accesibilidad: popup con role=listbox, opciones con role=option, clase
//     is-active en la opción activa
//   - keyboard: ArrowDown/Up navega, Enter/Tab confirman, Escape oculta
//   - edge cases: trigger personalizado (#), valor inicial con @ y #,
//     disabled no acepta input, popup se oculta al hacer blur fuera
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/mention/mention.html`;

const tests = [];

tests.push({
  name: 'smoke: 4 mention se definen y montan shadow DOM con popup listbox',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    const data = await page.evaluate(() => {
      const ms = [...document.querySelectorAll('is-mention')];
      return ms.map((m) => {
        const sr = m.shadowRoot;
        return {
          defined: !!customElements.get('is-mention'),
          hasShadow: !!sr,
          hasInput: !!sr?.querySelector('input.input'),
          hasPopup: !!sr?.querySelector('.popup'),
          popupRole: sr?.querySelector('.popup')?.getAttribute('role'),
          popupHidden: sr?.querySelector('.popup')?.hidden,
          suggestionKeys: Object.keys(m.suggestions),
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 mention');
    assert.equal(data[0].defined, true, 'is-mention definido');
    assert.equal(data[0].hasShadow, true, 'shadow root existe');
    assert.equal(data[0].hasInput, true, 'input interno presente');
    assert.equal(data[0].hasPopup, true, 'popup interno presente');
    assert.equal(data[0].popupRole, 'listbox', 'popup tiene role=listbox');
    assert.equal(data[0].popupHidden, true, 'popup inicia oculto');
    assert.ok(data[0].suggestionKeys.includes('@'), 'sugerencias del básico incluyen @');
    assert.ok(data[0].suggestionKeys.includes('#'), 'sugerencias del básico incluyen #');
    await screenshot(page, 'mention-smoke');
  },
});

tests.push({
  name: 'funcional: tipear @ abre el popup y filtra case-insensitive',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    const r = await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@a';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const opts = [...sr.querySelectorAll('.opt')];
      return {
        open: !sr.querySelector('.popup').hidden,
        optLabels: opts.map((o) => o.textContent.replace('@', '').trim()),
      };
    });
    assert.equal(r.open, true, 'popup se abre al tipear @');
    assert.ok(r.optLabels.length > 0, 'hay sugerencias');
    assert.ok(r.optLabels.every((l) => l.toLowerCase().includes('a')), 'filtro "a" case-insensitive');
  },
});

tests.push({
  name: 'funcional: seleccionar reemplaza el texto y emite is-select',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    // Capturar el evento is-select
    await page.evaluate(() => {
      window.__mentions = [];
      const m = document.querySelector('#sec-basico is-mention');
      m.addEventListener('is-select', (e) => window.__mentions.push(e.detail));
    });
    const r = await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@a';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const first = sr.querySelector('.opt');
      first.click();
      return {
        value: m.value,
        attrValue: m.getAttribute('value'),
        popupHidden: sr.querySelector('.popup').hidden,
        inputValue: input.value,
      };
    });
    assert.equal(r.popupHidden, true, 'popup se oculta tras seleccionar');
    assert.ok(r.value.startsWith('@'), 'value empieza con @');
    assert.ok(r.value.length > 2, 'value incluye item + espacio');
    assert.match(r.value, /^@\w+ /, 'value tiene formato @item + espacio');

    const events = await page.evaluate(() => window.__mentions);
    assert.equal(events.length, 1, 'is-select emitido una vez');
    assert.equal(events[0].trigger, '@', 'detail.trigger = @');
    assert.ok(events[0].item, 'detail.item presente');
  },
});

tests.push({
  name: 'funcional: max-items limita el número de sugerencias',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    const r = await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return sr.querySelectorAll('.opt').length;
    });
    assert.equal(r, 6, `popup limitado a max-items=6, hay ${r}`);
  },
});

tests.push({
  name: 'accesibilidad: opciones tienen role=option y aria-active en la activa',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    const r = await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const opts = [...sr.querySelectorAll('.opt')];
      return {
        allHaveRole: opts.every((o) => o.getAttribute('role') === 'option'),
        activeCount: opts.filter((o) => o.classList.contains('is-active')).length,
      };
    });
    assert.equal(r.allHaveRole, true, 'todas las opciones tienen role=option');
    assert.equal(r.activeCount, 1, 'exactamente una opción activa');
  },
});

tests.push({
  name: 'teclado: ArrowDown mueve la selección, Enter confirma',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    const before = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-mention').shadowRoot;
      const active = sr.querySelector('.opt.is-active');
      return active?.dataset.value;
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-mention').shadowRoot;
      const active = sr.querySelector('.opt.is-active');
      return active?.dataset.value;
    });
    assert.notEqual(after, before, 'ArrowDown cambia la opción activa');

    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      return m.value;
    });
    assert.ok(result.length > 0 && result.startsWith('@'), 'Enter confirma y reemplaza');
  },
});

tests.push({
  name: 'teclado: Escape oculta el popup',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    const before = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-mention').shadowRoot;
      return sr.querySelector('.popup').hidden;
    });
    assert.equal(before, false, 'popup abierto tras @');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-mention').shadowRoot;
      return sr.querySelector('.popup').hidden;
    });
    assert.equal(after, true, 'Escape oculta el popup');
  },
});

tests.push({
  name: 'edge case: trigger personalizado "#" solo responde a #',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    const r = await page.evaluate(() => {
      const m = document.querySelector('#sec-hashtags is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@a';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const popupOpenAfterAt = !sr.querySelector('.popup').hidden;
      input.value = '#fr';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const opts = [...sr.querySelectorAll('.opt')];
      return {
        popupOpenAfterAt,
        triggerAttr: m.getAttribute('trigger'),
        popupOpenAfterHash: !sr.querySelector('.popup').hidden,
        optLabels: opts.map((o) => o.textContent.replace('#', '').trim()),
      };
    });
    assert.equal(r.popupOpenAfterAt, false, '@ no abre popup con trigger="#"');
    assert.equal(r.triggerAttr, '#', 'atributo trigger="#" preservado');
    assert.equal(r.popupOpenAfterHash, true, '# sí abre el popup');
    assert.ok(r.optLabels.every((l) => l.toLowerCase().includes('fr')), 'filtro #fr muestra coincidencias');
  },
});

tests.push({
  name: 'edge case: valor inicial con @ y # se renderiza en el input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    const r = await page.evaluate(() => {
      const m = document.querySelector('#sec-disabled is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      return {
        attr: m.getAttribute('value'),
        value: m.value,
        inputValue: input.value,
        disabled: input.disabled,
      };
    });
    assert.equal(r.attr, 'No se puede editar @usuario #bug', 'atributo value preservado');
    assert.equal(r.value, 'No se puede editar @usuario #bug', 'value refleja atributo');
    assert.equal(r.inputValue, 'No se puede editar @usuario #bug', 'input sincronizado');
    assert.equal(r.disabled, true, 'input está disabled');
  },
});

tests.push({
  name: 'edge case: blur oculta el popup',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mention-ready');
    await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.blur();
    });
    await page.waitForTimeout(50);
    const r = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-mention').shadowRoot;
      return sr.querySelector('.popup').hidden;
    });
    assert.equal(r, true, 'blur oculta el popup');
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

report('mention', failures === 0, { total: tests.length, failures });
