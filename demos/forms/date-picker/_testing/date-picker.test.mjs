// date-picker.test.mjs — tests exhaustivos del demo date-picker.html.
// Cobertura: smoke + funcional (value, click, navegación) + accesibilidad +
// edge cases + teclado (flechas, PageUp/Down).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-picker/date-picker.html`;

const tests = [];

tests.push({
  name: 'smoke: el calendario monta y la rejilla de días se renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    const info = await page.evaluate(() => {
      const pickers = [...document.querySelectorAll('is-date-picker')];
      return {
        defined: !!customElements.get('is-date-picker'),
        count: pickers.length,
        grids: pickers.map((p) => p.shadowRoot.querySelectorAll('button.day').length),
        weekdays: pickers[0].shadowRoot.querySelectorAll('.weekdays .wd').length,
      };
    });
    assert.equal(info.defined, true, 'is-date-picker debe estar definido');
    assert.ok(info.count >= 5, `esperaba >=5 calendarios, hay ${info.count}`);
    assert.ok(info.grids.every((n) => n >= 28), `cada rejilla debe tener >=28 días, hay ${JSON.stringify(info.grids)}`);
    assert.equal(info.weekdays, 7, 'la fila de días de la semana debe tener 7 columnas');
    await screenshot(page, 'date-picker-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja en la rejilla y en aria-selected',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => { document.getElementById('with-value').value = '2026-06-15'; });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-value');
      const selected = el.shadowRoot.querySelector('button.day[aria-selected="true"]');
      return {
        attr: el.getAttribute('value'),
        month: el.getAttribute('month'),
        selectedIso: selected?.dataset.iso,
        selectedText: selected?.textContent.trim(),
      };
    });
    assert.equal(data.attr, '2026-06-15');
    assert.equal(data.month, '2026-06', 'el atributo month debe coincidir con yyyy-mm');
    assert.equal(data.selectedIso, '2026-06-15');
    assert.equal(data.selectedText, '15');
  },
});

tests.push({
  name: 'funcional: clic en un día emite is-change con la ISO',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => {
      window.__changes = [];
      document.getElementById('basic').addEventListener('is-change', (e) => {
        window.__changes.push(e.detail?.value ?? '');
      });
    });
    // Hacer click sobre el día 10 del mes actual visible.
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      const btn = [...el.shadowRoot.querySelectorAll('button.day:not([data-outside])')]
        .find((b) => b.textContent.trim() === '10');
      btn.click();
    });
    await page.waitForTimeout(50);
    const changes = await page.evaluate(() => window.__changes);
    assert.equal(changes.length, 1, 'debe emitirse exactamente un is-change');
    assert.match(changes[0], /^\d{4}-\d{2}-10$/, `el valor debe terminar en -10, es ${changes[0]}`);
  },
});

tests.push({
  name: 'teclado: ArrowRight mueve el foco al día siguiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    // Situar el foco en el día 10 del mes visible.
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.focusDate(`${el.getAttribute('month')}-10`);
    });
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const focused = await page.evaluate(() => {
      const iso = document.activeElement?.dataset?.iso ?? '';
      const month = document.activeElement?.getAttribute('data-iso-month') ?? '';
      return { iso };
    });
    assert.equal(focused.iso.endsWith('-11'), true, `tras ArrowRight el foco debe caer sobre el día 11, es ${focused.iso}`);
  },
});

tests.push({
  name: 'teclado: ArrowLeft mueve el foco al día anterior',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.focusDate(`${el.getAttribute('month')}-10`);
    });
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    const iso = await page.evaluate(() => document.activeElement?.dataset?.iso ?? '');
    assert.equal(iso.endsWith('-09'), true, `tras ArrowLeft el foco debe caer sobre el día 9, es ${iso}`);
  },
});

tests.push({
  name: 'teclado: PageDown salta al mismo día del mes siguiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => {
      const el = document.getElementById('with-value');
      el.focusDate('2026-06-15');
    });
    await page.waitForTimeout(50);
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(100);
    const iso = await page.evaluate(() => document.activeElement?.dataset?.iso ?? '');
    assert.equal(iso, '2026-07-15', `tras PageDown desde 2026-06-15 debe saltar a 2026-07-15, es ${iso}`);
  },
});

tests.push({
  name: 'teclado: PageUp salta al mismo día del mes anterior',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => {
      const el = document.getElementById('with-value');
      el.focusDate('2026-06-15');
    });
    await page.waitForTimeout(50);
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(100);
    const iso = await page.evaluate(() => document.activeElement?.dataset?.iso ?? '');
    assert.equal(iso, '2026-05-15', `tras PageUp desde 2026-06-15 debe saltar a 2026-05-15, es ${iso}`);
  },
});

tests.push({
  name: 'teclado: Shift+PageDown salta al mismo día del año siguiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => {
      const el = document.getElementById('with-value');
      el.focusDate('2026-06-15');
    });
    await page.waitForTimeout(50);
    await page.keyboard.down('Shift');
    await page.keyboard.press('PageDown');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);
    const iso = await page.evaluate(() => document.activeElement?.dataset?.iso ?? '');
    assert.equal(iso, '2027-06-15', `Shift+PageDown debe saltar al año siguiente, es ${iso}`);
  },
});

tests.push({
  name: 'teclado: flechas de navegación cambian el mes visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    const initialMonth = await page.evaluate(() => document.getElementById('basic').month);
    await page.evaluate(() => {
      document.getElementById('basic').shadowRoot.querySelector('[data-nav="1"]').click();
    });
    await page.waitForTimeout(50);
    const nextMonth = await page.evaluate(() => document.getElementById('basic').month);
    assert.notEqual(initialMonth, nextMonth, 'click en "siguiente" debe cambiar el mes visible');
    await page.evaluate(() => {
      document.getElementById('basic').shadowRoot.querySelector('[data-nav="-1"]').click();
    });
    await page.waitForTimeout(50);
    const backMonth = await page.evaluate(() => document.getElementById('basic').month);
    assert.equal(backMonth, initialMonth, 'click en "anterior" desde el mes siguiente debe volver al original');
  },
});

tests.push({
  name: 'accesibilidad: la rejilla tiene role="grid" y los días role="gridcell"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const grid = el.shadowRoot.querySelector('[role="grid"]');
      const days = el.shadowRoot.querySelectorAll('button.day[role="gridcell"]');
      return {
        gridRole: grid?.getAttribute('role'),
        gridCells: days.length,
        ariaSelected: el.shadowRoot.querySelectorAll('button.day[aria-selected]').length,
      };
    });
    assert.equal(info.gridRole, 'grid');
    assert.ok(info.gridCells >= 28, `esperaba >=28 gridcells, hay ${info.gridCells}`);
    assert.ok(info.ariaSelected >= 1, 'al menos un día debe tener aria-selected');
  },
});

tests.push({
  name: 'accesibilidad: el header de mes y año son botones activables',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const nav = el.shadowRoot.querySelector('[part="nav"]');
      const buttons = nav.querySelectorAll('is-button');
      return {
        navButtonCount: buttons.length,
        hasPrev: !!nav.querySelector('[data-nav="-1"]'),
        hasNext: !!nav.querySelector('[data-nav="1"]'),
        hasMonthDropdown: !!nav.querySelector('[data-jump="month"]'),
        hasYearDropdown: !!nav.querySelector('[data-jump="year"]'),
      };
    });
    assert.ok(info.navButtonCount >= 4, `esperaba >=4 botones de navegación, hay ${info.navButtonCount}`);
    assert.equal(info.hasPrev, true, 'debe haber un botón "anterior"');
    assert.equal(info.hasNext, true, 'debe haber un botón "siguiente"');
    assert.equal(info.hasMonthDropdown, true, 'debe haber un dropdown de mes');
    assert.equal(info.hasYearDropdown, true, 'debe haber un dropdown de año');
  },
});

tests.push({
  name: 'edge: clear() elimina el valor y el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    await page.evaluate(() => { document.getElementById('with-value').clear(); });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-value');
      return { attr: el.getAttribute('value'), prop: el.value };
    });
    assert.equal(data.attr, null);
    assert.equal(data.prop, '');
  },
});

tests.push({
  name: 'edge: días bloqueados (disabled-days) tienen atributo disabled',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('no-weekends');
      const days = [...el.shadowRoot.querySelectorAll('button.day:not([data-outside])')];
      return {
        total: days.length,
        disabled: days.filter((d) => d.disabled).length,
        // Domingo=2026-06-14 y sábado=2026-06-20 → en el mes hay 8 fines de semana
        sampleSundays: days.filter((d) => /-06-(0[1-9]|[12][0-9]|30)$/.test(d.dataset.iso)
          && new Date(d.dataset.iso).getDay() === 0).length,
      };
    });
    assert.ok(info.disabled >= 8, `esperaba >=8 días bloqueados (4 dom+4 sáb), hay ${info.disabled}`);
  },
});

tests.push({
  name: 'edge: min/max del componente marcan como disabled los días fuera de rango',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    // Forzamos el mes a uno en el que el límite inferior tenga efecto visible
    // (diciembre 2024 contiene días anteriores al min 2025-01-01).
    await page.evaluate(() => {
      const el = document.getElementById('ranged');
      el.setAttribute('month', '2024-12');
      el.setAttribute('value', '2025-01-15');
    });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('ranged');
      const days = [...el.shadowRoot.querySelectorAll('button.day')];
      return {
        min: el.getAttribute('min'),
        max: el.getAttribute('max'),
        disabledCount: days.filter((d) => d.disabled).length,
        total: days.length,
        hasMinAttr: el.hasAttribute('min'),
      };
    });
    assert.equal(info.hasMinAttr, true, 'el atributo min debe estar presente');
    assert.equal(info.min, '2025-01-01');
    assert.equal(info.max, '2026-12-31');
    assert.ok(info.disabledCount > 0,
      `esperaba al menos 1 día deshabilitado fuera del rango, hay ${info.disabledCount} de ${info.total}`);
  },
});

tests.push({
  name: 'funcional: vista mes renderiza is-month-calendar con 12 meses',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-picker-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('month-view');
      el.setAttribute('view', 'month');
      const monthView = el.shadowRoot.querySelector('is-month-calendar');
      const monthButtons = monthView?.shadowRoot?.querySelectorAll('button').length ?? 0;
      return {
        view: el.view,
        monthViewDefined: !!monthView,
        monthButtons,
      };
    });
    assert.equal(info.view, 'month');
    assert.equal(info.monthViewDefined, true, 'debe haber un is-month-calendar');
    assert.ok(info.monthButtons >= 12, `esperaba >=12 botones de mes, hay ${info.monthButtons}`);
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

report('date-picker', failures === 0, { total: tests.length, failures });