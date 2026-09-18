// year-calendar.test.mjs — tests funcionales del demo year-calendar.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con N botones year
//     según min/max
//   - funcional: click en un año emite is-change con detail.value/yr; cambiar
//     value por propiedad selecciona el año
//   - accesibilidad: role=radiogroup, cada botón es radio con aria-checked
//   - edge cases: click en un año disabled no emite is-change; min/max
//     delimitan el rango; Home/End saltan a los extremos
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/year-calendar/year-calendar.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta N años según min/max',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const data = await page.evaluate(() => {
      const cals = [...document.querySelectorAll('is-year-calendar')];
      return cals.map((c) => {
        const sr = c.shadowRoot;
        return {
          defined: !!customElements.get('is-year-calendar'),
          hasShadow: !!sr,
          hasBase: !!sr?.querySelector('.base'),
          yearsCount: sr?.querySelectorAll('button.year').length,
          radiogroup: sr?.querySelector('.base')?.getAttribute('role'),
          min: c.min, max: c.max, year: c.year, value: c.value,
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 year-calendars');
    assert.equal(data[0].defined, true, 'is-year-calendar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root presente');
    assert.equal(data[0].hasBase, true, '.base presente');
    assert.equal(data[0].yearsCount, 13, '#basico 2020–2032 = 13 años');
    assert.equal(data[1].yearsCount, 21, '#historico 1990–2010 = 21 años');
    assert.equal(data[0].radiogroup, 'radiogroup', 'role=radiogroup');
    assert.equal(data[0].value, '2026', '#basico value=2026');
    assert.equal(data[1].year, 2005, '#historico year=2005');
    await screenshot(page, 'year-calendar-smoke');
  },
});

tests.push({
  name: 'funcional: click en un año emite is-change con detail.value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const c = document.querySelector('#basico');
        c.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
        const btn = c.shadowRoot.querySelector('button.year[data-year="2030"]');
        btn.click();
      });
    });
    assert.equal(result.value, '2030', `value="2030" (${result.value})`);
    assert.equal(result.year, 2030, 'detail.year=2030');
  },
});

tests.push({
  name: 'funcional: cambiar value por propiedad selecciona el año y mueve scroll',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#basico');
      const before = c.shadowRoot.querySelector('button.year[data-selected]')?.dataset?.year;
      c.value = '2028';
      const after = c.shadowRoot.querySelector('button.year[data-selected]')?.dataset?.year;
      return { before, after, value: c.value };
    });
    assert.equal(result.before, '2026', 'antes 2026');
    assert.equal(result.after, '2028', 'después 2028');
    assert.equal(result.value, '2028', 'value=2028');
  },
});

tests.push({
  name: 'accesibilidad: cada botón año es radio con aria-checked',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const a11y = await page.evaluate(() => {
      const c = document.querySelector('#basico');
      const buttons = [...c.shadowRoot.querySelectorAll('button.year')];
      return buttons.map((b) => ({
        role: b.getAttribute('role'),
        ariaChecked: b.getAttribute('aria-checked'),
        year: b.dataset.year,
      }));
    });
    assert.equal(a11y.length, 13, '13 botones');
    for (const b of a11y) {
      assert.equal(b.role, 'radio', `${b.year} role=radio`);
      assert.ok(b.ariaChecked === 'true' || b.ariaChecked === 'false', `${b.year} aria-checked válido`);
    }
    const sel = a11y.find((b) => b.ariaChecked === 'true');
    assert.ok(sel, 'al menos un botón con aria-checked=true');
    assert.equal(sel.year, '2026', '2026 aria-checked=true');
  },
});

tests.push({
  name: 'edge case: click en año fuera del rango no es posible (no se renderiza)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#basico'); // 2020-2032
      const buttons = [...c.shadowRoot.querySelectorAll('button.year')];
      const years = buttons.map((b) => Number(b.dataset.year));
      return {
        minYear: Math.min(...years),
        maxYear: Math.max(...years),
        includes2032: years.includes(2032),
        includes2033: years.includes(2033),
        includes2019: years.includes(2019),
      };
    });
    assert.equal(result.minYear, 2020, 'mínimo 2020');
    assert.equal(result.maxYear, 2032, 'máximo 2032');
    assert.equal(result.includes2032, true, 'incluye 2032');
    assert.equal(result.includes2033, false, 'no incluye 2033');
    assert.equal(result.includes2019, false, 'no incluye 2019');
  },
});

tests.push({
  name: 'edge case: keyboard nav — ArrowRight mueve el foco al año siguiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#basico');
      c.focus();
      // el primer tabindex=0 está sobre el value (2026) o el current
      const active = c.shadowRoot.querySelector('button.year[tabindex="0"]');
      active.focus();
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
      const after = c.shadowRoot.querySelector('button.year[tabindex="0"]');
      return { beforeYear: active?.dataset?.year, afterYear: after?.dataset?.year };
    });
    // antes: 2026, después: 2027
    assert.equal(result.beforeYear, '2026', 'inicio 2026');
    assert.equal(result.afterYear, '2027', 'ArrowRight → 2027');
  },
});

tests.push({
  name: 'edge case: keyboard nav — Home/End saltan a los extremos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#basico');
      const active = c.shadowRoot.querySelector('button.year[tabindex="0"]');
      active.focus();
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
      const afterEnd = c.shadowRoot.querySelector('button.year[tabindex="0"]')?.dataset?.year;
      active.focus();
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }));
      const afterHome = c.shadowRoot.querySelector('button.year[tabindex="0"]')?.dataset?.year;
      return { afterEnd, afterHome };
    });
    assert.equal(result.afterEnd, '2032', 'End → 2032 (max)');
    assert.equal(result.afterHome, '2020', 'Home → 2020 (min)');
  },
});

tests.push({
  name: 'edge case: disabled bloquea el click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#bloqueado');
      const before = c.value;
      // buscar un botón habilitado (que no esté disabled)
      const buttons = [...c.shadowRoot.querySelectorAll('button.year')];
      const allDisabled = buttons.every((b) => b.disabled);
      const sampleBtn = buttons[0];
      sampleBtn.click();
      const after = c.value;
      return { before, after, allDisabled };
    });
    assert.equal(result.allDisabled, true, 'todos los botones disabled');
    assert.equal(result.after, result.before, 'click no muta value');
  },
});

tests.push({
  name: 'edge case: readonly bloquea el click pero permite lectura',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-year-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#readonly');
      const before = c.value;
      const btn = c.shadowRoot.querySelector('button.year[data-year="2025"]');
      btn.click();
      return { before, after: c.value, readonly: c.hasAttribute('readonly') };
    });
    assert.equal(result.readonly, true, 'readonly attr presente');
    assert.equal(result.after, result.before, 'click no muta value (readonly)');
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

report('year-calendar', failures === 0, { total: tests.length, failures });
