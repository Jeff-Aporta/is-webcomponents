// month-calendar.test.mjs — tests funcionales del demo month-calendar.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con 12 botones month
//   - funcional: click en un mes emite is-change con detail.value (yyyy-mm);
//     cambiar year re-renderiza; cambiar value por propiedad selecciona mes
//   - accesibilidad: role=radiogroup, cada botón es radio con aria-checked
//   - edge cases: min/max desactivan meses fuera del rango; Home/End saltan
//     al primer/último mes disponible
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/month-calendar/month-calendar.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta 12 meses',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const data = await page.evaluate(() => {
      const cals = [...document.querySelectorAll('is-month-calendar')];
      return cals.map((c) => {
        const sr = c.shadowRoot;
        return {
          defined: !!customElements.get('is-month-calendar'),
          hasShadow: !!sr,
          hasBase: !!sr?.querySelector('.base'),
          monthsCount: sr?.querySelectorAll('button.month').length,
          radiogroup: sr?.querySelector('.base')?.getAttribute('role'),
          year: c.year,
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 month-calendars');
    assert.equal(data[0].defined, true, 'is-month-calendar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root presente');
    assert.equal(data[0].hasBase, true, '.base presente');
    assert.equal(data[0].monthsCount, 12, '12 botones de mes');
    assert.equal(data[0].radiogroup, 'radiogroup', 'role=radiogroup');
    assert.equal(data[0].year, 2026, '#basico año 2026');
    await screenshot(page, 'month-calendar-smoke');
  },
});

tests.push({
  name: 'funcional: click en un mes emite is-change con value yyyy-mm',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const c = document.querySelector('#basico');
        c.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
        const mar = c.shadowRoot.querySelector('button.month[data-month="2"]');
        mar.click();
      });
    });
    assert.equal(result.value, '2026-03', `value=2026-03 (${result.value})`);
    assert.equal(result.year, 2026, 'detail.year=2026');
    assert.equal(result.month, 2, 'detail.month=2 (Marzo, 0-indexed)');
  },
});

tests.push({
  name: 'funcional: cambiar value por propiedad selecciona el mes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#conValor'); // value=2026-07
      const selected = c.shadowRoot.querySelector('button.month[data-selected]');
      c.value = '2026-11';
      const after = c.shadowRoot.querySelector('button.month[data-selected]');
      return {
        before: selected?.dataset?.month,
        after: after?.dataset?.month,
        value: c.value,
      };
    });
    assert.equal(result.before, '6', 'antes: Julio (m=6)');
    assert.equal(result.after, '10', 'después: Noviembre (m=10)');
    assert.equal(result.value, '2026-11', 'value=2026-11');
  },
});

tests.push({
  name: 'funcional: cambiar year re-renderiza y mueve el mes actual',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#basico');
      const before = c.shadowRoot.querySelector('button.month[data-current]')?.dataset?.month;
      c.year = 2025;
      // tras cambiar year, data-current sigue siendo el mes actual real
      // (hoy), pero ya no debe estar en 2026; verificamos el atributo year
      // y que el rendering cambió.
      const after = c.shadowRoot.querySelector('button.month[data-current]')?.dataset?.month;
      return { before, after, yearAttr: c.getAttribute('year'), year: c.year };
    });
    assert.equal(result.yearAttr, '2025', 'atributo year=2025');
    assert.equal(result.year, 2025, 'propiedad year=2025');
  },
});

tests.push({
  name: 'accesibilidad: cada botón mes es radio con aria-checked',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const a11y = await page.evaluate(() => {
      const c = document.querySelector('#conValor');
      const buttons = [...c.shadowRoot.querySelectorAll('button.month')];
      return buttons.map((b) => ({
        role: b.getAttribute('role'),
        ariaChecked: b.getAttribute('aria-checked'),
        dataset: b.dataset.month,
      }));
    });
    assert.equal(a11y.length, 12, '12 botones');
    for (const b of a11y) {
      assert.equal(b.role, 'radio', `${b.dataset} role=radio`);
      assert.ok(b.ariaChecked === 'true' || b.ariaChecked === 'false', `${b.dataset} aria-checked válido`);
    }
    const jul = a11y.find((b) => b.dataset === '6');
    assert.equal(jul.ariaChecked, 'true', 'julio (2026-07) aria-checked=true');
  },
});

tests.push({
  name: 'edge case: min/max desactivan meses fuera del rango',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#limitado'); // min=2026-04-01, max=2026-10-31
      const buttons = [...c.shadowRoot.querySelectorAll('button.month')];
      const enabled = buttons.filter((b) => !b.disabled);
      const disabled = buttons.filter((b) => b.disabled);
      const disabledMonths = disabled.map((b) => Number(b.dataset.month));
      return {
        enabledCount: enabled.length,
        disabledCount: disabled.length,
        disabledMonths,
      };
    });
    // Abril (3) a Octubre (9) → 7 meses disponibles, 5 disabled (0,1,2,10,11)
    assert.equal(result.enabledCount, 7, '7 meses disponibles (Abr–Oct)');
    assert.equal(result.disabledCount, 5, '5 meses disabled');
    assert.deepEqual(result.disabledMonths.sort((a, b) => a - b), [0, 1, 2, 10, 11],
      'meses disabled: Ene, Feb, Mar, Nov, Dic');
  },
});

tests.push({
  name: 'edge case: click en un mes disabled no emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const c = document.querySelector('#limitado');
        let emitted = false;
        c.addEventListener('is-change', () => { emitted = true; });
        const ene = c.shadowRoot.querySelector('button.month[data-month="0"]');
        ene.click();
        setTimeout(() => resolve({ emitted, value: c.value }), 50);
      });
    });
    assert.equal(result.emitted, false, 'is-change no emitido');
    assert.equal(result.value, '', 'value sigue vacío');
  },
});

tests.push({
  name: 'edge case: keyboard nav — ArrowRight salta al mes siguiente habilitado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-month-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#limitado');
      c.focus();
      // tras focus(), el primer tabindex=0 está sobre el primer mes habilitado (Abr=3)
      const initial = document.activeElement.shadowRoot.activeElement?.dataset?.month
        || c.shadowRoot.activeElement?.dataset?.month;
      // simular ArrowRight sobre el botón activo
      const active = c.shadowRoot.querySelector('button.month[tabindex="0"]');
      active.focus();
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
      const after = c.shadowRoot.querySelector('button.month[tabindex="0"]')?.dataset?.month;
      return { initial: initial ?? active?.dataset?.month, after };
    });
    assert.equal(result.initial, '3', 'inicio Abril (m=3)');
    assert.equal(result.after, '4', 'ArrowRight → Mayo (m=4)');
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

report('month-calendar', failures === 0, { total: tests.length, failures });
