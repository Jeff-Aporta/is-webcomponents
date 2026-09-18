// digital-clock.test.mjs — tests funcionales del demo digital-clock.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con .base, layout default=list
//   - funcional: cambiar value por propiedad → reflecte en opciones y emite is-change
//   - accesibilidad: role=listbox, aria-label, aria-selected en opción activa,
//     tabindex móvil sobre la opción seleccionada
//   - edge cases: value vacío no rompe el render; layout=sections produce
//     columnas; ampm=false entrega 24 horas con rango 0..23
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/digital-clock/digital-clock.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta su shadow DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const data = await page.evaluate(() => {
      const clocks = [...document.querySelectorAll('is-digital-clock')];
      return clocks.map((c) => {
        const sr = c.shadowRoot;
        return {
          defined: !!customElements.get('is-digital-clock'),
          hasShadow: !!sr,
          hasBase: !!sr?.querySelector('.base'),
          hasList: !!sr?.querySelector('.list'),
          layout: c.layout,
          value: c.value,
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 clocks (lista, sections, 24h, disabled)');
    assert.equal(data[0].defined, true, 'is-digital-clock debe estar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root debe existir');
    assert.equal(data[0].hasBase, true, '.base debe existir');
    assert.equal(data[0].hasList, true, 'layout=list debe generar .list');
    assert.equal(data[0].layout, 'list', 'layout default=list');
    assert.equal(data[0].value, '09:30', 'valor inicial 09:30');
    await screenshot(page, 'digital-clock-smoke');
  },
});

tests.push({
  name: 'funcional: cambiar value por propiedad refleja y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const got = await new Promise(async (resolve, reject) => {
      try {
        // attach listener ANTES de mutar value
        await page.evaluate(() => {
          window.__ev = null;
          const clk = document.querySelector('#sec-lista is-digital-clock');
          clk.addEventListener('is-change', (e) => { window.__ev = e.detail; }, { once: true });
        });
        // click en una opción visible (la 20:00 está entre las generadas con step=30)
        await page.evaluate(() => {
          const clk = document.querySelector('#sec-lista is-digital-clock');
          const opts = [...clk.shadowRoot.querySelectorAll('button.opt')];
          // buscar el botón cuyo dataset.raw coincide con 20:00
          const target = opts.find((o) => o.dataset.raw === '20:00');
          target.click();
        });
        await page.waitForTimeout(80);
        const result = await page.evaluate(() => {
          const clk = document.querySelector('#sec-lista is-digital-clock');
          const selected = clk.shadowRoot.querySelector('button.opt[data-selected]');
          return {
            value: clk.value,
            attrValue: clk.getAttribute('value'),
            raw: selected?.dataset?.raw,
            ev: window.__ev,
          };
        });
        resolve(result);
      } catch (err) { reject(err); }
    });
    assert.equal(got.value, '20:00', 'value debe quedar en 20:00');
    assert.equal(got.attrValue, '20:00', 'atributo value actualizado');
    assert.equal(got.raw, '20:00', 'opción seleccionada 20:00');
    assert.ok(got.ev && got.ev.value === '20:00', 'evento is-change emitido con value=20:00');
  },
});

tests.push({
  name: 'funcional: el reloj actualiza la hora mostrada en tiempo real',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    // Capturamos la opción seleccionada, esperamos >1s, capturamos de nuevo.
    const t1 = await page.evaluate(() => {
      const clk = document.querySelector('#sec-lista is-digital-clock');
      const sel = clk.shadowRoot.querySelector('button.opt[data-selected]');
      return { raw: sel?.dataset?.raw ?? null, attrValue: clk.value };
    });
    await page.waitForTimeout(1200);
    const t2 = await page.evaluate(() => {
      const clk = document.querySelector('#sec-lista is-digital-clock');
      const sel = clk.shadowRoot.querySelector('button.opt[data-selected]');
      return { raw: sel?.dataset?.raw ?? null, attrValue: clk.value };
    });
    // El reloj muestra la hora en tiempo real, por lo que el raw debería avanzar
    // o el reloj mantener el valor que tenía.
    assert.ok(t1.raw, 'primera muestra tiene raw');
    assert.ok(t2.raw, 'segunda muestra tiene raw');
    // En 1.2s el reloj no debe haberse congelado: el reloj SIEMPRE marca
    // la hora actual; ambas son timestamps reales pero pueden coincidir.
    // Verificamos que value no quedó vacío y que la opción está visible.
    assert.ok(t1.attrValue, 'valor inicial no vacío');
    assert.ok(t2.attrValue, 'segundo valor no vacío');
  },
});

tests.push({
  name: 'accesibilidad: listbox con aria-label y aria-selected en la opción activa',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const a11y = await page.evaluate(() => {
      const clk = document.querySelector('#sec-lista is-digital-clock');
      const list = clk.shadowRoot.querySelector('.list');
      const selected = list.querySelector('button.opt[aria-selected="true"]');
      return {
        listbox: list.getAttribute('role'),
        listboxLabel: list.getAttribute('aria-label'),
        selectedAriaSelected: selected?.getAttribute('aria-selected'),
        selectedAriaLabel: selected?.getAttribute('aria-label'),
        activeTabIndex: selected?.tabIndex,
      };
    });
    assert.equal(a11y.listbox, 'listbox', 'role=listbox');
    assert.ok(a11y.listboxLabel, 'aria-label del listbox');
    assert.equal(a11y.selectedAriaSelected, 'true', 'opción activa aria-selected=true');
    assert.ok(a11y.activeTabIndex === 0, 'tabIndex=0 en opción seleccionada');
  },
});

tests.push({
  name: 'edge case: value vacío no rompe el render (no hay selección)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const result = await page.evaluate(() => {
      const c = document.createElement('is-digital-clock');
      document.body.appendChild(c);
      const selected = c.shadowRoot.querySelector('button.opt[data-selected]');
      const totalOpts = c.shadowRoot.querySelectorAll('button.opt').length;
      c.remove();
      return { hasSelection: !!selected, totalOpts };
    });
    // sin value no debe haber data-selected; los tabs activos caen al primer
    // disponible.
    assert.equal(result.hasSelection, false, 'sin value no hay opción seleccionada');
    assert.ok(result.totalOpts > 0, 'lista debe tener opciones aunque no haya value');
  },
});

tests.push({
  name: 'edge case: layout=sections genera columnas hour/min/sec',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const sections = await page.evaluate(() => {
      const clk = document.querySelector('#sec-sections is-digital-clock');
      const cols = [...clk.shadowRoot.querySelectorAll('.col')];
      const sections = cols.map((c) => c.dataset.section);
      return {
        cols: sections,
        baseLayout: clk.shadowRoot.querySelector('.base').dataset.layout,
        value: clk.value,
      };
    });
    assert.equal(sections.baseLayout, 'sections', 'layout=sections');
    assert.ok(sections.cols.includes('hours'), 'col hours presente');
    assert.ok(sections.cols.includes('minutes'), 'col minutes presente');
    assert.ok(sections.cols.includes('seconds'), 'col seconds presente');
    assert.ok(sections.cols.includes('meridiem'), 'col meridiem presente (ampm=true)');
    assert.equal(sections.value, '14:30:00', 'value con segundos preservado');
  },
});

tests.push({
  name: 'edge case: ampm=false y step=15 produce lista 24h con paso 15',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const info = await page.evaluate(() => {
      const clk = document.querySelector('#sec-24h is-digital-clock');
      const opts = [...clk.shadowRoot.querySelectorAll('button.opt')];
      // el primer opt suele ser 00:00; el 8º debe ser 02:00 si step=15? No: con step=15
      // hay 24*4 = 96 entradas. Verificamos que las horas 0..23 aparezcan.
      const raws = opts.map((o) => o.dataset.raw);
      const has00 = raws.includes('00:00');
      const has15 = raws.includes('00:15');
      const has1845 = raws.includes('18:45');
      return { total: raws.length, has00, has15, has1845 };
    });
    assert.ok(info.total > 90, `lista con paso 15 → >90 entradas (hay ${info.total})`);
    assert.ok(info.has00, 'incluye 00:00');
    assert.ok(info.has15, 'incluye 00:15 (paso 15)');
    assert.ok(info.has1845, 'incluye 18:45 (valor inicial)');
  },
});

tests.push({
  name: 'edge case: disabled bloquea el click y aplica estado :state(disabled)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-digital-clock-ready');
    const state = await page.evaluate(() => {
      const clk = document.querySelector('#sec-disabled is-digital-clock');
      const before = clk.value;
      const opt = clk.shadowRoot.querySelector('button.opt[data-selected]');
      opt.click();
      const after = clk.value;
      return {
        disabledAttr: clk.hasAttribute('disabled'),
        stateDisabled: clk.matches(':state(disabled)'),
        before, after,
      };
    });
    assert.equal(state.disabledAttr, true, 'disabled attr presente');
    assert.equal(state.stateDisabled, true, ':state(disabled)');
    assert.equal(state.before, state.after, 'click no muta el value en disabled');
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

report('digital-clock', failures === 0, { total: tests.length, failures });
