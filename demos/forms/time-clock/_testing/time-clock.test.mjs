// time-clock.test.mjs — tests exhaustivos del demo time-clock.html.
// Cobertura: smoke + funcional (rotación de la mano al cambiar valor, horas
// → minutos → segundos) + accesibilidad + edge cases (vacío, min/max,
// readonly, disabled).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/time-clock/time-clock.html`;

const tests = [];

tests.push({
  name: 'smoke: el reloj se monta con header, disco y mano',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const info = await page.evaluate(() => {
      const clocks = [...document.querySelectorAll('is-time-clock')];
      const probe = clocks[0];
      return {
        count: clocks.length,
        defined: !!customElements.get('is-time-clock'),
        hasHeader: !!probe.shadowRoot.querySelector('[part="header"]'),
        hasClock: !!probe.shadowRoot.querySelector('[part="clock"]'),
        hasHand: !!probe.shadowRoot.querySelector('[part="hand"]'),
        hasOuterRing: !!probe.shadowRoot.querySelector('.ring.outer'),
        hasCenter: !!probe.shadowRoot.querySelector('.center'),
        hourButtons: probe.shadowRoot.querySelectorAll('[part="hours"]').length,
        minuteButtons: probe.shadowRoot.querySelectorAll('[part="minutes"]').length,
        view: probe.getAttribute('view'),
      };
    });
    assert.equal(info.defined, true, 'is-time-clock debe estar definido');
    assert.ok(info.count >= 6, `esperaba >=6 relojes en la página, hay ${info.count}`);
    assert.equal(info.hasHeader, true, 'debe existir el header con horas y minutos');
    assert.equal(info.hasClock, true, 'debe existir el disco del reloj');
    assert.equal(info.hasHand, true, 'debe existir la mano del reloj');
    assert.equal(info.hasOuterRing, true, 'debe existir el anillo exterior con números');
    assert.equal(info.hasCenter, true, 'debe existir el punto central');
    assert.equal(info.hourButtons, 1, 'debe haber 1 botón de hora en el header');
    assert.equal(info.minuteButtons, 1, 'debe haber 1 botón de minuto en el header');
    assert.equal(info.view, 'hours', 'vista inicial debe ser hours');
    await screenshot(page, 'time-clock-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja en el reloj y rota la mano',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const hand = el.shadowRoot.querySelector('[part="hand"]');
      const hourBtn = el.shadowRoot.querySelector('[part="hours"]');
      const minuteBtn = el.shadowRoot.querySelector('[part="minutes"]');
      return {
        attr: el.getAttribute('value'),
        prop: el.value,
        handAngle: hand.style.getPropertyValue('--a'),
        hourText: hourBtn.textContent.trim(),
        minuteText: minuteBtn.textContent.trim(),
      };
    });
    assert.equal(data.attr, '14:30');
    assert.equal(data.prop, '14:30');
    // 14h → ángulo (14 % 12) * 30 = 60 grados
    assert.equal(data.handAngle, '60deg', 'la mano debe estar a 60 grados para las 14:00 (vista hours)');
    assert.equal(data.hourText, '14', 'el botón de hora debe mostrar 14');
    assert.equal(data.minuteText, '30', 'el botón de minuto debe mostrar 30');
  },
});

tests.push({
  name: 'funcional: cambiar el view a "minutes" recalcula la mano',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic'); // value=14:30
      el.view = 'minutes';
      const hand = el.shadowRoot.querySelector('[part="hand"]');
      return {
        view: el.getAttribute('view'),
        handAngle: hand.style.getPropertyValue('--a'),
        // En vista minutes el anillo exterior debe tener 12 marcas (60 / step=5).
        outerItems: el.shadowRoot.querySelectorAll('.ring.outer .num').length,
      };
    });
    assert.equal(data.view, 'minutes');
    // 30 minutos → ángulo 30 * 6 = 180 grados
    assert.equal(data.handAngle, '180deg', 'la mano debe estar a 180 grados para el minuto 30');
    assert.equal(data.outerItems, 12, 'en vista minutes el anillo exterior debe tener 12 marcas (0,5,10...55)');
  },
});

tests.push({
  name: 'funcional: con seconds=true aparece el botón de segundos en el header',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-seconds');
      const secs = el.shadowRoot.querySelectorAll('.secs');
      const secBtn = el.shadowRoot.querySelector('[part="seconds"]');
      return {
        secsCount: secs.length,
        secBtnExists: !!secBtn,
        secBtnVisible: secBtn && !secBtn.hidden,
        secBtnText: secBtn?.textContent.trim(),
      };
    });
    assert.equal(data.secsCount >= 1, true, 'debe haber elementos con clase .secs');
    assert.equal(data.secBtnExists, true, 'debe existir el botón de segundos');
    assert.equal(data.secBtnVisible, true, 'el botón de segundos debe estar visible con seconds=true');
    assert.equal(data.secBtnText, '30', 'el botón de segundos debe mostrar 30');
  },
});

tests.push({
  name: 'funcional: con ampm aparece el grupo AM/PM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('ampm');
      const mer = el.shadowRoot.querySelector('.meridiem');
      const am = el.shadowRoot.querySelector('.mer[data-mer="AM"]');
      const pm = el.shadowRoot.querySelector('.mer[data-mer="PM"]');
      return {
        merVisible: mer && !mer.hidden,
        amActive: am?.hasAttribute('data-active'),
        pmActive: pm?.hasAttribute('data-active'),
      };
    });
    assert.equal(data.merVisible, true, 'el grupo AM/PM debe estar visible');
    // 09:30 → AM
    assert.equal(data.amActive, true, 'AM debe estar activo para las 09:30');
    assert.equal(data.pmActive, false, 'PM NO debe estar activo');
  },
});

tests.push({
  name: 'funcional: click en el disco a la altura de las 3 cambia la hora (en ampm)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const initial = await page.evaluate(() => document.getElementById('ampm').value);
    // En ampm con locale en-US, las 3 está en el ángulo 90° (apunta a la derecha).
    // La inicial es 09:30 (AM), click en 3 debe cambiar a 03:30.
    await page.evaluate(() => {
      const el = document.getElementById('ampm');
      const clock = el.shadowRoot.querySelector('[part="clock"]');
      const rect = clock.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2 - 10;
      // 3 en punto: (+r, 0)
      const tx = cx + r;
      const ty = cy;
      clock.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: tx, clientY: ty, button: 0, bubbles: true, composed: true,
      }));
      clock.dispatchEvent(new PointerEvent('pointerup', {
        clientX: tx, clientY: ty, button: 0, bubbles: true, composed: true,
      }));
    });
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => {
      const el = document.getElementById('ampm');
      const hourBtn = el.shadowRoot.querySelector('[part="hours"]');
      return { value: el.value, hourText: hourBtn.textContent.trim() };
    });
    assert.notEqual(after.value, initial, 'el click en el disco debe cambiar el valor');
    assert.equal(after.hourText, '3', 'la hora mostrada debe ser 3');
    assert.match(after.value, /^(?:03|15):30$/, 'el valor debe ser 03:30 (AM) o 15:30 (PM)');
  },
});

tests.push({
  name: 'funcional: teclado (ArrowUp) sobre el disco incrementa la hora',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    // El reloj basic tiene value=14:30, vista hours.
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.shadowRoot.querySelector('[part="clock"]').focus();
    });
    await page.waitForTimeout(40);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(40);
    const data = await page.evaluate(() => document.getElementById('basic').value);
    assert.equal(data, '15:30', 'ArrowUp debe incrementar la hora de 14 a 15');
  },
});

tests.push({
  name: 'funcional: teclado (ArrowDown) sobre el disco decrementa la hora',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.shadowRoot.querySelector('[part="clock"]').focus();
    });
    await page.waitForTimeout(40);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(40);
    const data = await page.evaluate(() => document.getElementById('basic').value);
    assert.equal(data, '13:30', 'ArrowDown debe decrementar la hora de 14 a 13');
  },
});

tests.push({
  name: 'funcional: is-change emite evento al cambiar la hora',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    await page.evaluate(() => {
      window.__changes = [];
      const el = document.getElementById('basic');
      el.addEventListener('is-change', (e) => window.__changes.push(e.detail?.value ?? ''));
      el.shadowRoot.querySelector('[part="clock"]').focus();
    });
    await page.waitForTimeout(40);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(40);
    const changes = await page.evaluate(() => window.__changes);
    assert.deepEqual(changes, ['15:30'], 'is-change debe emitir el nuevo valor tras ArrowUp');
  },
});

tests.push({
  name: 'accesibilidad: el disco es role="slider" con aria-valuemin/max/now y aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const clock = el.shadowRoot.querySelector('[part="clock"]');
      return {
        role: clock.getAttribute('role'),
        ariaMin: clock.getAttribute('aria-valuemin'),
        ariaMax: clock.getAttribute('aria-valuemax'),
        ariaNow: clock.getAttribute('aria-valuenow'),
        ariaLabel: clock.getAttribute('aria-label'),
        ariaValueText: clock.getAttribute('aria-valuetext'),
        orientation: clock.getAttribute('aria-orientation'),
      };
    });
    assert.equal(info.role, 'slider', 'el disco debe tener role="slider"');
    assert.equal(info.ariaMin, '0', 'aria-valuemin en hours 24h debe ser 0');
    assert.equal(info.ariaMax, '23', 'aria-valuemax en hours 24h debe ser 23');
    assert.equal(info.ariaNow, '14', 'aria-valuenow debe ser 14');
    assert.equal(info.ariaLabel, 'Horas', 'aria-label debe ser "Horas" en vista hours');
    assert.ok(info.ariaValueText, 'aria-valuetext debe estar presente');
    assert.equal(info.orientation, 'horizontal');
  },
});

tests.push({
  name: 'accesibilidad: aria-label cambia según la vista (Horas/Minutos/Segundos)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-seconds');
      const labels = {};
      const clock = el.shadowRoot.querySelector('[part="clock"]');
      el.view = 'hours';
      labels.hours = clock.getAttribute('aria-label');
      el.view = 'minutes';
      labels.minutes = clock.getAttribute('aria-label');
      el.view = 'seconds';
      labels.seconds = clock.getAttribute('aria-label');
      return labels;
    });
    assert.equal(data.hours, 'Horas');
    assert.equal(data.minutes, 'Minutos');
    assert.equal(data.seconds, 'Segundos');
  },
});

tests.push({
  name: 'edge: con min-time/max-time los números fuera de rango están data-disabled',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('restricted'); // min-time=08:00, max-time=18:00
      const disabled = [...el.shadowRoot.querySelectorAll('.num[data-disabled]')].map((n) => n.dataset.raw);
      const enabled = [...el.shadowRoot.querySelectorAll('.num:not([data-disabled])')].map((n) => n.dataset.raw);
      return { disabled, enabled };
    });
    // 24h: rango 08..18 (hora exacta) debe estar habilitado; 19..23 y 0..7 deshabilitados.
    assert.ok(data.disabled.includes('7'), 'la hora 7 debe estar deshabilitada (fuera de [08..18])');
    assert.ok(data.disabled.includes('19'), 'la hora 19 debe estar deshabilitada');
    assert.ok(data.enabled.includes('8'), 'la hora 8 debe estar habilitada');
    assert.ok(data.enabled.includes('18'), 'la hora 18 debe estar habilitada');
  },
});

tests.push({
  name: 'edge: readonly no permite editar con teclado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const before = await page.evaluate(() => document.getElementById('readonly').value);
    await page.evaluate(() => {
      document.getElementById('readonly').shadowRoot.querySelector('[part="clock"]').focus();
    });
    await page.waitForTimeout(40);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(40);
    const after = await page.evaluate(() => document.getElementById('readonly').value);
    assert.equal(after, before, 'readonly debe impedir el cambio con ArrowUp');
  },
});

tests.push({
  name: 'edge: disabled expone aria-disabled en el disco',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('disabled');
      const clock = el.shadowRoot.querySelector('[part="clock"]');
      return {
        ariaDisabled: clock.getAttribute('aria-disabled'),
      };
    });
    assert.equal(info.ariaDisabled, 'true', 'el disco debe tener aria-disabled=true cuando disabled');
  },
});

tests.push({
  name: 'edge: minutes-step limita los minutos a múltiplos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('step-15');
      el.view = 'minutes';
      const minutes = [...el.shadowRoot.querySelectorAll('.ring.outer .num .lbl')].map((l) => l.textContent.trim());
      return { minutes };
    });
    // step=15 → 0,15,30,45
    assert.deepEqual(data.minutes, ['00', '15', '30', '45'], 'la vista minutes debe tener solo múltiplos de 15');
  },
});

tests.push({
  name: 'edge: value vacío muestra "sin hora" en aria-valuetext',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-clock-ready');
    const info = await page.evaluate(() => {
      const el = document.createElement('is-time-clock');
      document.body.appendChild(el);
      const clock = el.shadowRoot.querySelector('[part="clock"]');
      const result = {
        attr: el.getAttribute('value'),
        ariaNow: clock.getAttribute('aria-valuenow'),
        ariaValueText: clock.getAttribute('aria-valuetext'),
        hourText: el.shadowRoot.querySelector('[part="hours"]').textContent.trim(),
      };
      document.body.removeChild(el);
      return result;
    });
    assert.equal(info.attr, null);
    assert.equal(info.ariaNow, '', 'aria-valuenow debe estar ausente si no hay valor');
    assert.equal(info.ariaValueText, 'sin hora');
    assert.match(info.hourText, /^-+$|^--/, 'la hora debe mostrar placeholder cuando no hay valor');
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

report('time-clock', failures === 0, { total: tests.length, failures });
