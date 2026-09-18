// switch.test.mjs — tests exhaustivos del demo switch.html.
// Cobertura: smoke + funcional (toggle via click y via atributo)
// + accesibilidad (role=switch, aria-checked) + edge case (disabled, required).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/switch/switch.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-switch> definido, shadow DOM y role=switch',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    const data = await page.evaluate(() => {
      const sw = document.querySelector('is-switch#demo');
      const sr = sw.shadowRoot;
      const control = sr.querySelector('.control');
      const track = sr.querySelector('.thumb')?.parentElement;
      const label = sr.querySelector('#label');
      return {
        defined: !!customElements.get('is-switch'),
        hasShadow: !!sr,
        hasControl: !!control,
        hasLabel: !!label,
        role: sw.getAttribute('role'),
        ariaChecked: sw.getAttribute('aria-checked'),
        ariaDisabled: sw.getAttribute('aria-disabled'),
        tabindex: sw.getAttribute('tabindex'),
        text: sr.querySelector('slot')?.assignedNodes({ flatten: true })
          .map((n) => n.textContent || '').join('').trim(),
      };
    });
    assert.equal(data.defined, true, 'is-switch debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.hasControl, true, 'debe tener .control');
    assert.equal(data.hasLabel, true, 'debe tener label');
    assert.equal(data.role, 'switch', 'role debe ser switch');
    assert.equal(data.ariaChecked, 'false', 'aria-checked inicial debe ser false');
    assert.equal(data.ariaDisabled, 'false', 'aria-disabled inicial debe ser false');
    assert.equal(data.tabindex, '0', 'tabindex inicial debe ser 0');
    assert.match(data.text, /Notificaciones/, 'el slot debe contener la etiqueta');
    await screenshot(page, 'switch-smoke');
  },
});

tests.push({
  name: 'funcional: click togglea checked y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    const data = await page.evaluate(async () => {
      const sw = document.querySelector('is-switch#demo');
      // Esperar al primer click con un listener { once }.
      const evt = await new Promise((resolve) => {
        sw.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
        sw.click();
      });
      // Esperar a que el estado se asiente.
      await new Promise((r) => setTimeout(r, 20));
      return {
        checkedAfterClick: sw.checked,
        ariaChecked: sw.getAttribute('aria-checked'),
        eventDetail: evt,
      };
    });
    assert.equal(data.checkedAfterClick, true, 'click debe poner checked=true');
    assert.equal(data.ariaChecked, 'true', 'aria-checked debe ser true');
    assert.equal(data.eventDetail.checked, true, 'is-change.detail.checked debe ser true');
    assert.equal(data.eventDetail.value, 'yes', 'is-change.detail.value debe ser el value');
  },
});

tests.push({
  name: 'accesibilidad: checked refleja aria-checked y el estado visual',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    const data = await page.evaluate(() => {
      const sw = document.querySelector('is-checkbox, is-switch#demo')?.matches?.('is-switch')
        ? document.querySelector('is-switch#demo')
        : document.querySelector('is-switch');
      sw.checked = true;
      const ariaChecked = sw.getAttribute('aria-checked');
      // Estado custom :state(checked) debe estar presente.
      const isCheckedState = sw.matches(':state(checked)');
      return { ariaChecked, isCheckedState };
    });
    assert.equal(data.ariaChecked, 'true', 'aria-checked debe ser true');
    assert.equal(data.isCheckedState, true, 'debe tener :state(checked)');
  },
});

tests.push({
  name: 'edge case: disabled bloquea toggle y refleja aria-disabled',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    const data = await page.evaluate(() => {
      const sw = document.querySelector('is-switch#demo');
      sw.disabled = true;
      const before = sw.checked;
      sw.click();
      return {
        ariaDisabled: sw.getAttribute('aria-disabled'),
        tabindex: sw.getAttribute('tabindex'),
        before,
        after: sw.checked,
      };
    });
    assert.equal(data.ariaDisabled, 'true', 'aria-disabled debe ser true');
    assert.equal(data.tabindex, '-1', 'tabindex debe ser -1 cuando disabled');
    assert.equal(data.after, data.before, 'click en disabled no debe togglear');
  },
});

tests.push({
  name: 'edge case: required sin checked → validity.valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    const data = await page.evaluate(() => {
      const sw = document.querySelector('is-switch[required][error]');
      sw.checked = false;
      return {
        valueMissing: sw.validity?.valueMissing,
        ariaRequired: sw.getAttribute('aria-required'),
      };
    });
    assert.equal(data.valueMissing, true, 'valueMissing debe ser true');
    assert.equal(data.ariaRequired, 'true', 'aria-required debe ser true');
  },
});

tests.push({
  name: 'edge case: Enter y Space (teclado) togglean el switch',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    // Focus + Space.
    await page.focus('is-switch#demo');
    await page.keyboard.press('Space');
    let checked = await page.evaluate(() => document.querySelector('is-switch#demo').checked);
    assert.equal(checked, true, 'Space debe poner checked=true');
    // Enter → vuelve a false.
    await page.keyboard.press('Enter');
    checked = await page.evaluate(() => document.querySelector('is-switch#demo').checked);
    assert.equal(checked, false, 'Enter debe poner checked=false');
  },
});

tests.push({
  name: 'funcional: on-label y off-label aparecen como texto en el track',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-switch-ready');
    const data = await page.evaluate(() => {
      const sw = [...document.querySelectorAll('is-switch[on-label]')][0];
      const sr = sw.shadowRoot;
      const onLabel = sr.getElementById('onLabel');
      const offLabel = sr.getElementById('offLabel');
      return {
        onText: onLabel?.textContent?.trim(),
        offText: offLabel?.textContent?.trim(),
        onVisible: onLabel && !onLabel.hidden,
        offVisible: offLabel && !offLabel.hidden,
      };
    });
    assert.equal(data.onText, 'ON', 'on-label debe ser ON');
    assert.equal(data.offText, 'OFF', 'off-label debe ser OFF');
    assert.equal(data.onVisible, true, 'on-label debe verse cuando checked');
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

report('switch', failures === 0, { total: tests.length, failures });
