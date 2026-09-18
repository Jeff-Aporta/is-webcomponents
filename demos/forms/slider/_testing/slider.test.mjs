// slider.test.mjs — tests funcionales del demo slider.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con rail, track, marks,
//     thumbs con role=slider
//   - funcional: cambiar value actualiza aria-valuenow y posición, marks
//     personalizados se renderizan, range genera dos thumbs, value-label
//     muestra el formato
//   - accesibilidad: aria-valuemin/max/now/text en cada thumb,
//     aria-orientation, role=slider, aria-disabled
//   - keyboard: ArrowRight/Left incrementa/decrementa step, Home/End salta
//     a min/max, PageUp/PageDown usa shiftStep
//   - edge cases: step=null restringe a los marks, range con disable-swap
//     respeta el orden, disabled bloquea interacción
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/slider/slider.html`;

const tests = [];

tests.push({
  name: 'smoke: 5 sliders se definen y montan shadow DOM con thumbs role=slider',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const data = await page.evaluate(() => {
      const sl = [...document.querySelectorAll('is-slider')];
      return sl.map((s) => {
        const sr = s.shadowRoot;
        const thumbs = [...sr.querySelectorAll('[role="slider"]')];
        return {
          defined: !!customElements.get('is-slider'),
          hasShadow: !!sr,
          thumbCount: thumbs.length,
          firstRole: thumbs[0]?.getAttribute('role'),
          firstTabindex: thumbs[0]?.tabIndex,
          ariaOrient: thumbs[0]?.getAttribute('aria-orientation'),
          ariaMin: thumbs[0]?.getAttribute('aria-valuemin'),
          ariaMax: thumbs[0]?.getAttribute('aria-valuemax'),
          ariaNow: thumbs[0]?.getAttribute('aria-valuenow'),
          markCount: sr.querySelectorAll('[part="mark"]').length,
          markLabelCount: sr.querySelectorAll('[part="mark-label"]').length,
        };
      });
    });
    assert.equal(data.length, 5, 'debe haber 5 sliders');
    assert.equal(data[0].defined, true, 'is-slider definido');
    assert.equal(data[0].hasShadow, true, 'shadow root existe');
    assert.equal(data[0].thumbCount, 1, 'slider single tiene 1 thumb');
    assert.equal(data[0].firstRole, 'slider', 'thumb tiene role=slider');
    assert.equal(data[0].firstTabindex, 0, 'tabindex inicial=0');
    assert.equal(data[0].ariaOrient, 'horizontal', 'orientación por defecto horizontal');
    assert.equal(data[0].ariaMin, '0', 'aria-valuemin del slider básico');
    assert.equal(data[0].ariaMax, '100', 'aria-valuemax del slider básico');
    assert.equal(data[0].ariaNow, '35', 'aria-valuenow del slider básico');

    // El slider de rango tiene 2 thumbs
    assert.equal(data[1].thumbCount, 2, 'slider range tiene 2 thumbs');

    // El slider con marks tiene marcas con label
    assert.equal(data[2].markCount, 5, 'slider con marks tiene 5 puntos');
    assert.equal(data[2].markLabelCount, 5, 'slider con marks tiene 5 etiquetas');
    await screenshot(page, 'slider-smoke');
  },
});

tests.push({
  name: 'funcional: cambiar value actualiza aria-valuenow y bubble',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      const sr = s.shadowRoot;
      // El setter de value en <is-slider> NO refleja al atributo automáticamente,
      // sólo a #values + re-render. Hay que usar setAttribute para persistir
      // el atributo; aquí verificamos que la propiedad sí actualiza el DOM.
      s.value = 70;
      const thumb = sr.querySelector('[role="slider"]');
      return {
        prop: s.value,
        ariaNow: thumb.getAttribute('aria-valuenow'),
        bubbleText: thumb.querySelector('[part="value-label"]')?.textContent,
      };
    });
    assert.equal(r.prop, 70, 'propiedad value=70');
    assert.equal(r.ariaNow, '70', 'aria-valuenow=70');
    assert.equal(r.bubbleText, '70%', 'bubble muestra formato {v}%');

    // Verificar que setAttribute sí refleja el atributo
    const afterSetAttr = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      s.setAttribute('value', '85');
      return { prop: s.value, attr: s.getAttribute('value'), ariaNow: s.shadowRoot.querySelector('[role="slider"]').getAttribute('aria-valuenow') };
    });
    assert.equal(afterSetAttr.prop, 85, 'value=85 tras setAttribute');
    assert.equal(afterSetAttr.attr, '85', 'atributo value=85 tras setAttribute');
    assert.equal(afterSetAttr.ariaNow, '85', 'aria-valuenow=85');
  },
});

tests.push({
  name: 'funcional: range genera values=[min, max] como array ordenado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-rango is-slider');
      const sr = s.shadowRoot;
      const thumbs = [...sr.querySelectorAll('[role="slider"]')];
      return {
        values: s.values,
        value: s.value,
        thumb0Now: thumbs[0]?.getAttribute('aria-valuenow'),
        thumb1Now: thumbs[1]?.getAttribute('aria-valuenow'),
      };
    });
    assert.deepEqual(r.values, [50, 250], 'values=[50,250]');
    assert.deepEqual(r.value, [50, 250], 'value getter como array');
    assert.equal(r.thumb0Now, '50', 'thumb 0 = 50');
    assert.equal(r.thumb1Now, '250', 'thumb 1 = 250');
  },
});

tests.push({
  name: 'funcional: marks con labels renderizan texto bajo el rail',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-marks is-slider');
      const sr = s.shadowRoot;
      const labels = [...sr.querySelectorAll('[part="mark-label"]')];
      return labels.map((l) => l.textContent.trim());
    });
    assert.deepEqual(r, ['baja', 'media', 'buena', 'alta', 'excelente'], 'etiquetas en orden');
  },
});

tests.push({
  name: 'accesibilidad: aria-valuetext refleja el format',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-rango is-slider');
      const sr = s.shadowRoot;
      const thumbs = [...sr.querySelectorAll('[role="slider"]')];
      return thumbs.map((t) => t.getAttribute('aria-valuetext'));
    });
    assert.equal(r[0], '$50', 'aria-valuetext thumb0 = $50');
    assert.equal(r[1], '$250', 'aria-valuetext thumb1 = $250');
  },
});

tests.push({
  name: 'teclado: ArrowRight incrementa step, ArrowLeft decrementa',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      s.shadowRoot.querySelector('[role="slider"]').focus();
    });
    const before = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(before, 35, 'valor inicial 35');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const up = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(up, 40, 'ArrowRight: 35 + step(5) = 40');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    const down = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(down, 30, 'ArrowLeft x2: 40 - 5 - 5 = 30');
  },
});

tests.push({
  name: 'teclado: Home/End saltan a min/max',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      s.shadowRoot.querySelector('[role="slider"]').focus();
    });
    await page.keyboard.press('End');
    await page.waitForTimeout(50);
    const atMax = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(atMax, 100, 'End → max=100');

    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    const atMin = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(atMin, 0, 'Home → min=0');
  },
});

tests.push({
  name: 'teclado: PageUp/PageDown usan shiftStep',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      s.shadowRoot.querySelector('[role="slider"]').focus();
    });
    // valor inicial 35, step=5, shiftStep default = step*10 = 50
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(50);
    const up = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(up, 85, `PageUp: 35 + shiftStep(50) = 85 (got ${up})`);

    await page.keyboard.press('PageDown');
    await page.waitForTimeout(50);
    const down = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(down, 35, `PageDown: 85 - 50 = 35 (got ${down})`);
  },
});

tests.push({
  name: 'accesibilidad: required=true sin value expone valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-required is-slider');
      // quitar value para que sea "valueMissing"
      s.removeAttribute('value');
      return { required: s.required, valid: s.checkValidity() };
    });
    assert.equal(r.required, true, 'es required');
    assert.equal(r.valid, false, 'sin value NO es válido');
  },
});

tests.push({
  name: 'accesibilidad: disabled=true bloquea thumbs',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-disabled is-slider');
      const sr = s.shadowRoot;
      const thumb = sr.querySelector('[role="slider"]');
      return {
        ariaDisabled: thumb.getAttribute('aria-disabled'),
        tabindex: thumb.tabIndex,
        stateDisabled: s.matches(':state(disabled)'),
      };
    });
    assert.equal(r.ariaDisabled, 'true', 'aria-disabled=true');
    assert.equal(r.tabindex, -1, 'tabindex=-1 (no focusable)');
    assert.equal(r.stateDisabled, true, 'custom state :state(disabled) presente');
  },
});

tests.push({
  name: 'edge case: range con disable-swap mantiene el orden de thumbs',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-rango is-slider');
      s.disableSwap = true;
      s.value = [300, 100]; // intento swap
      return s.values;
    });
    assert.deepEqual(r, [100, 300], 'disableSwap=true ordena ascendente');
    // Sin disableSwap, podría reordenarse; limpiamos
    await page.evaluate(() => {
      const s = document.querySelector('#sec-rango is-slider');
      s.disableSwap = false;
      s.value = [50, 250];
    });
  },
});

tests.push({
  name: 'edge case: step=null restringe a los marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    const r = await page.evaluate(() => {
      const s = document.querySelector('#sec-marks is-slider');
      s.step = 'null';
      s.value = 17; // no es un mark
      return { value: s.value, markValues: s.marks.map((m) => m.value) };
    });
    // step=null → snap al mark más cercano; los marks son 0,25,50,75,100
    // 17 está entre 0 y 25; el más cercano es 25 (distancia 8) vs 0 (17)
    assert.equal(r.value, 25, `step=null snap al mark más cercano (got ${r.value})`);
  },
});

tests.push({
  name: 'edge case: shift+ArrowRight usa shiftStep (no step normal)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-slider-ready');
    await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      s.shadowRoot.querySelector('[role="slider"]').focus();
    });
    const before = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      return s.value;
    });
    assert.equal(after - before, 50, `Shift+ArrowRight suma shiftStep(50): ${before}→${after}`);
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

report('slider', failures === 0, { total: tests.length, failures });
