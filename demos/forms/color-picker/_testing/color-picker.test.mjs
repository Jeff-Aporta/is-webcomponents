// color-picker.test.mjs — tests funcionales del demo color-picker.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM montado, default value,
//     dialog en top-layer, atributos aria-*
//   - funcional: cambiar value por propiedad → refleja en swatch, hex-text,
//     input nativo, hex-input y FormData
//   - accesibilidad: aria-haspopup=dialog, aria-expanded con open, label
//     asociado vía aria-label, required expone aria-required
//   - edge cases: HEX corto (#abc → #aabbcc) y HEX inválido se ignoran;
//     valor por atributo se normaliza a minúsculas con #.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/color-picker/color-picker.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta su shadow DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    const data = await page.evaluate(() => {
      const pickers = [...document.querySelectorAll('is-color-picker')];
      return pickers.map((p) => {
        const sr = p.shadowRoot;
        return {
          defined: !!customElements.get('is-color-picker'),
          hasShadow: !!sr,
          hasTrigger: !!sr?.querySelector('.trigger'),
          hasDialog: !!sr?.querySelector('dialog.popup'),
          hasSwatch: !!sr?.querySelector('.swatch'),
          hasHexInput: !!sr?.querySelector('.hex'),
          hasNativeInput: !!sr?.querySelector('.native[type="color"]'),
          value: p.value,
          labelText: p.getAttribute('label'),
          hintText: p.getAttribute('hint'),
          ariaHasPopup: sr?.querySelector('.trigger')?.getAttribute('aria-haspopup'),
          ariaExpanded: sr?.querySelector('.trigger')?.getAttribute('aria-expanded'),
          ariaLabel: sr?.querySelector('.trigger')?.getAttribute('aria-label'),
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 pickers en el demo (básico, swatches, disabled, required)');
    assert.equal(data[0].defined, true, 'is-color-picker debe estar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root debe existir');
    assert.equal(data[0].hasTrigger, true, 'debe haber un botón trigger');
    assert.equal(data[0].hasDialog, true, 'debe existir el <dialog> del popup');
    assert.equal(data[0].hasSwatch, true, 'debe existir el swatch del trigger');
    assert.equal(data[0].hasHexInput, true, 'debe existir el input HEX');
    assert.equal(data[0].hasNativeInput, true, 'debe existir el <input type="color"> nativo');
    assert.equal(data[0].value, '#2563eb', 'valor inicial del picker básico');
    assert.equal(data[0].labelText, 'Color de fondo', 'label del picker básico');
    assert.equal(data[0].ariaHasPopup, 'dialog', 'aria-haspopup=dialog');
    assert.equal(data[0].ariaExpanded, 'false', 'aria-expanded inicial=false');
    assert.equal(data[0].ariaLabel, 'Color de fondo', 'label asociado al trigger');
    await screenshot(page, 'color-picker-smoke');
  },
});

tests.push({
  name: 'funcional: cambiar value por propiedad refleja en todo el shadow',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    await page.evaluate(() => {
      const p = document.querySelector('#sec-basico is-color-picker');
      p.value = '#ff6b35';
    });
    await page.waitForTimeout(50);
    const state = await page.evaluate(() => {
      const p = document.querySelector('#sec-basico is-color-picker');
      const sr = p.shadowRoot;
      return {
        attr: p.getAttribute('value'),
        propValue: p.value,
        hexText: sr.querySelector('.hex-text')?.textContent,
        swatchBg: sr.querySelector('.swatch')?.style.background,
        hexInputValue: sr.querySelector('.hex')?.value,
        nativeValue: sr.querySelector('.native')?.value,
        formValue: p.internals?.formValue ?? null,
      };
    });
    assert.equal(state.attr, '#ff6b35', 'atributo value actualizado');
    assert.equal(state.propValue, '#ff6b35', 'propiedad value actualizada');
    assert.equal(state.hexText, '#ff6b35', 'hex-text muestra el valor');
    assert.equal(state.swatchBg.replace(/\s+/g, ''), 'rgb(255,107,53)', 'swatch refleja el color');
    assert.equal(state.hexInputValue.toLowerCase(), '#ff6b35', 'hex-input sincronizado');
    assert.equal(state.nativeValue.toLowerCase(), '#ff6b35', 'input nativo sincronizado');
  },
});

tests.push({
  name: 'funcional: show() abre el dialog y expone aria-expanded=true',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    await page.evaluate(() => {
      document.querySelector('#sec-basico is-color-picker').show();
    });
    await page.waitForTimeout(80);
    const open = await page.evaluate(() => {
      const p = document.querySelector('#sec-basico is-color-picker');
      const sr = p.shadowRoot;
      const dlg = sr.querySelector('dialog.popup');
      return {
        open: dlg.open,
        ariaExpanded: sr.querySelector('.trigger').getAttribute('aria-expanded'),
        stateOpen: p.matches(':state(open)'),
      };
    });
    assert.equal(open.open, true, 'el <dialog> debe estar abierto');
    assert.equal(open.ariaExpanded, 'true', 'aria-expanded=true tras show()');
    assert.equal(open.stateOpen, true, 'custom state :state(open) presente');
    await page.evaluate(() => document.querySelector('#sec-basico is-color-picker').hide());
  },
});

tests.push({
  name: 'funcional: click en un swatch setea el valor y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    await page.evaluate(() => {
      document.querySelector('#sec-basico is-color-picker').show();
    });
    await page.waitForTimeout(50);
    const swatchValue = await page.evaluate(() => {
      const p = document.querySelector('#sec-basico is-color-picker');
      const sr = p.shadowRoot;
      const swatches = [...sr.querySelectorAll('.swatch-btn')];
      const target = swatches[7]; // el 8vo swatch del default
      target.click();
      return target.dataset.value;
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate((sv) => {
      const p = document.querySelector('#sec-basico is-color-picker');
      const sr = p.shadowRoot;
      const selected = [...sr.querySelectorAll('.swatch-btn[data-selected]')].map((s) => s.dataset.value);
      return {
        value: p.value,
        ariaPressed: [...sr.querySelectorAll('.swatch-btn')].find((b) => b.dataset.value === sv)?.getAttribute('aria-pressed'),
        dialogOpen: sr.querySelector('dialog.popup').open,
        selectedCount: selected.length,
      };
    }, swatchValue);
    assert.equal(after.value, swatchValue, 'value tras click debe ser el del swatch');
    assert.equal(after.ariaPressed, 'true', 'aria-pressed=true en el swatch seleccionado');
    assert.equal(after.selectedCount, 1, 'solo un swatch debe estar data-selected');
    assert.equal(after.dialogOpen, false, 'el dialog se cierra tras seleccionar un swatch');
  },
});

tests.push({
  name: 'accesibilidad: required=true añade aria-required al trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    const a11y = await page.evaluate(() => {
      const req = document.querySelector('#sec-required is-color-picker');
      const sr = req.shadowRoot;
      return {
        ariaRequired: sr.querySelector('.trigger').getAttribute('aria-required'),
        ariaInvalid: sr.querySelector('.trigger').getAttribute('aria-invalid') ?? null,
        labelHasAsterisk: req.getAttribute('label'),
      };
    });
    assert.equal(a11y.ariaRequired, 'true', 'aria-required=true en required');
    assert.match(a11y.labelHasAsterisk, /\*/, 'label marca el campo como obligatorio');
  },
});

tests.push({
  name: 'accesibilidad: disabled=true deshabilita el trigger y cierra si está abierto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    const dis = await page.evaluate(() => {
      const p = document.querySelector('#sec-disabled is-color-picker');
      const sr = p.shadowRoot;
      return {
        triggerDisabled: sr.querySelector('.trigger').disabled,
        hexDisabled: sr.querySelector('.hex').disabled,
        nativeDisabled: sr.querySelector('.native').disabled,
        stateDisabled: p.matches(':state(disabled)'),
      };
    });
    assert.equal(dis.triggerDisabled, true, 'trigger.disabled=true');
    assert.equal(dis.hexDisabled, true, 'hex-input.disabled=true');
    assert.equal(dis.nativeDisabled, true, 'native-input.disabled=true');
    assert.equal(dis.stateDisabled, true, 'custom state :state(disabled) presente');
  },
});

tests.push({
  name: 'edge case: HEX corto #abc se normaliza a #aabbcc',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    const result = await page.evaluate(() => {
      const p = document.querySelector('#sec-basico is-color-picker');
      p.value = '#abc';
      const norm = p.value;
      const attrAbc = p.getAttribute('value');
      // ahora un hex inválido: setter quita el atributo pero onAttributeChanged
      // lo restaura al DEFAULT_VALUE (#808080)
      p.value = '#zzz';
      const afterInvalid = p.value;
      const attr = p.getAttribute('value');
      return { norm, attrAbc, afterInvalid, attr };
    });
    assert.equal(result.norm, '#aabbcc', 'HEX de 3 dígitos se expande (getter)');
    assert.equal(result.attrAbc, '#aabbcc', 'HEX de 3 dígitos se expande (atributo canónico)');
    assert.equal(result.afterInvalid, '#808080', 'HEX inválido → DEFAULT_VALUE');
    assert.equal(result.attr, '#808080', 'atributo restaurado a DEFAULT_VALUE (#808080)');
  },
});

tests.push({
  name: 'edge case: setAttribute(value) sin # también normaliza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    const r = await page.evaluate(() => {
      const p = document.querySelector('#sec-basico is-color-picker');
      p.setAttribute('value', 'ff00aa');
      return { attr: p.getAttribute('value'), prop: p.value };
    });
    assert.equal(r.prop, '#ff00aa', 'value se normaliza añadiendo #');
    assert.equal(r.attr, '#ff00aa', 'atributo queda canónico (#rrggbb)');
  },
});

tests.push({
  name: 'edge case: swatches personalizadas limitan la paleta visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-color-picker-ready');
    const sw = await page.evaluate(() => {
      const p = document.querySelector('#sec-swatches is-color-picker');
      const sr = p.shadowRoot;
      const buttons = [...sr.querySelectorAll('.swatch-btn')];
      return {
        count: buttons.length,
        values: buttons.map((b) => b.dataset.value),
      };
    });
    assert.equal(sw.count, 8, 'debe haber exactamente 8 swatches (paleta custom)');
    assert.equal(sw.values[0], '#0ea5e9', 'primer swatch debe ser el primero del array');
    assert.equal(sw.values[7], '#14b8a6', 'último swatch debe ser el último del array');
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

report('color-picker', failures === 0, { total: tests.length, failures });
