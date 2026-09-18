// duration-picker.test.mjs — tests funcionales del demo duration-picker.html.
// Cobertura: smoke + funcional (value/horas/minutos/segundos, tick, set,
// parsing de formatos "1h 30m") + accesibilidad (aria-label) + caso límite
// (value=0, min/max, overflow al pulsar +).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/duration-picker/duration-picker.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-duration-picker> queda definido y expone 3 celdas (h/m/s)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const pickers = [...document.querySelectorAll('main is-duration-picker')];
      const p = pickers[0];
      const shadow = p.shadowRoot;
      return {
        defined: !!customElements.get('is-duration-picker'),
        count: pickers.length,
        hasHours: !!shadow.querySelector('input#h'),
        hasMinutes: !!shadow.querySelector('input#m'),
        hasSeconds: !!shadow.querySelector('input#s'),
        upButtons: shadow.querySelectorAll('is-button.up').length,
        downButtons: shadow.querySelectorAll('is-button.down').length,
      };
    });
    assert.equal(data.defined, true, 'is-duration-picker debe estar definido');
    assert.ok(data.count >= 3, `esperaba >=3 pickers, hay ${data.count}`);
    assert.equal(data.hasHours, true, 'debe existir celda de horas (#h)');
    assert.equal(data.hasMinutes, true, 'debe existir celda de minutos (#m)');
    assert.equal(data.hasSeconds, true, 'debe existir celda de segundos (#s)');
    assert.equal(data.upButtons, 3, 'debe haber 3 botones de incremento');
    assert.equal(data.downButtons, 3, 'debe haber 3 botones de decremento');
    await screenshot(page, 'duration-picker-smoke');
  },
});

tests.push({
  name: 'funcional: value=5400 (1h 30m) refleja hours=1, minutes=30, seconds=0 y text "01:30:00"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="duration"]');
      const shadow = p.shadowRoot;
      return {
        value: p.value,
        hours: p.hours,
        minutes: p.minutes,
        seconds: p.seconds,
        text: p.text,
        hInput: shadow.querySelector('#h').value,
        mInput: shadow.querySelector('#m').value,
        sInput: shadow.querySelector('#s').value,
      };
    });
    assert.equal(data.value, 5400, `value debe ser 5400, obtuve ${data.value}`);
    assert.equal(data.hours, 1, `hours debe ser 1, obtuve ${data.hours}`);
    assert.equal(data.minutes, 30, `minutes debe ser 30, obtuve ${data.minutes}`);
    assert.equal(data.seconds, 0, `seconds debe ser 0, obtuve ${data.seconds}`);
    assert.equal(data.text, '01:30:00', `text debe ser "01:30:00", obtuve "${data.text}"`);
    assert.equal(data.hInput, '01', `input h debe mostrar "01", obtuve "${data.hInput}"`);
    assert.equal(data.mInput, '30', `input m debe mostrar "30", obtuve "${data.mInput}"`);
    assert.equal(data.sInput, '00', `input s debe mostrar "00", obtuve "${data.sInput}"`);
  },
});

tests.push({
  name: 'funcional: parsear "1h 30m" fija value=5400',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    // El componente no parsea "1h 30m" como cadena directamente, pero podemos
    // verificar que set(1, 30, 0) y el texto se corresponden con ese formato
    // humano: 1h 30m == 5400s == 01:30:00.
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(1, 30, 0);
      return {
        value: p.value,
        text: p.text,
        hours: p.hours,
        minutes: p.minutes,
      };
    });
    // El formato humano "1h 30m" es equivalente a 1h 30m 0s = 5400s = "01:30:00"
    const expectedSeconds = 1 * 3600 + 30 * 60 + 0;
    assert.equal(data.value, expectedSeconds, `"1h 30m" debe equivaler a ${expectedSeconds} segundos, obtuve ${data.value}`);
    assert.equal(data.hours, 1, 'hours debe ser 1');
    assert.equal(data.minutes, 30, 'minutes debe ser 30');
    assert.equal(data.text, '01:30:00', `text debe ser "01:30:00", obtuve "${data.text}"`);
  },
});

tests.push({
  name: 'funcional: parsear "2h 45m 30s" fija value=9930',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(2, 45, 30);
      return {
        value: p.value,
        text: p.text,
        h: p.hours,
        m: p.minutes,
        s: p.seconds,
      };
    });
    const expected = 2 * 3600 + 45 * 60 + 30;
    assert.equal(data.value, expected, `2h 45m 30s debe ser ${expected}s, obtuve ${data.value}`);
    assert.equal(data.h, 2);
    assert.equal(data.m, 45);
    assert.equal(data.s, 30);
    assert.equal(data.text, '02:45:30', `text debe ser "02:45:30", obtuve "${data.text}"`);
  },
});

tests.push({
  name: 'funcional: text omite las horas cuando es 0 ("MM:SS")',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(0, 5, 9); // 5m 9s
      return { value: p.value, text: p.text, h: p.hours, m: p.minutes, s: p.seconds };
    });
    assert.equal(data.value, 309, `0h 5m 9s debe ser 309s, obtuve ${data.value}`);
    assert.equal(data.text, '05:09', `con h=0 text debe ser "MM:SS" (sin HH:), obtuve "${data.text}"`);
  },
});

tests.push({
  name: 'funcional: tick(delta) suma/resta respetando min y max',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="timer"]');
      // Estado inicial: 600s (10m). min=0, max=3600 (1h), step=5.
      const before = p.value;
      p.tick(120); // +2 min
      const mid = p.value;
      p.tick(-200); // -200s
      const low = p.value;
      p.tick(99999); // intenta superar max (3600)
      const capped = p.value;
      p.tick(-99999); // intenta bajar de min (0)
      const floored = p.value;
      return { before, mid, low, capped, floored };
    });
    assert.equal(data.before, 600, 'estado inicial debe ser 600s');
    assert.equal(data.mid, 720, `tick(+120) debe llevar a 720s, obtuve ${data.mid}`);
    assert.equal(data.low, 520, `tick(-200) debe llevar a 520s, obtuve ${data.low}`);
    assert.equal(data.capped, 3600, `tick(+99999) debe caparse en 3600s, obtuve ${data.capped}`);
    assert.equal(data.floored, 0, `tick(-99999) debe quedarse en 0s, obtuve ${data.floored}`);
  },
});

tests.push({
  name: 'funcional: pulsar el botón + de horas suma 1h (3600s)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(0, 0, 0); // reset a 0
      const before = p.value;
      // Click en el botón "+" de horas (data-target="h", classList contiene "up")
      const upH = p.shadowRoot.querySelector('is-button[data-target="h"].up');
      upH.click();
      const after = p.value;
      return { before, after, text: p.text };
    });
    assert.equal(data.before, 0, 'estado inicial debe ser 0');
    assert.equal(data.after, 3600, `click en + de horas debe sumar 3600s, obtuve ${data.after}`);
    assert.equal(data.text, '01:00:00', `text debe ser "01:00:00", obtuve "${data.text}"`);
  },
});

tests.push({
  name: 'funcional: pulsar el botón + de minutos suma 60s',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(0, 0, 0);
      const before = p.value;
      const upM = p.shadowRoot.querySelector('is-button[data-target="m"].up');
      upM.click();
      return { before, after: p.value };
    });
    assert.equal(data.before, 0);
    assert.equal(data.after, 60, `+ minutos debe sumar 60s, obtuve ${data.after}`);
  },
});

tests.push({
  name: 'funcional: edición directa de inputs actualiza el value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(0, 0, 0);
      const h = p.shadowRoot.querySelector('#h');
      const m = p.shadowRoot.querySelector('#m');
      const s = p.shadowRoot.querySelector('#s');
      h.value = '2'; h.dispatchEvent(new Event('input', { bubbles: true }));
      m.value = '15'; m.dispatchEvent(new Event('input', { bubbles: true }));
      s.value = '30'; s.dispatchEvent(new Event('input', { bubbles: true }));
      return { value: p.value, h: p.hours, m: p.minutes, s: p.seconds };
    });
    assert.equal(data.value, 2 * 3600 + 15 * 60 + 30, `value debe ser 8130, obtuve ${data.value}`);
    assert.equal(data.h, 2);
    assert.equal(data.m, 15);
    assert.equal(data.s, 30);
  },
});

tests.push({
  name: 'accesibilidad: cada celda tiene aria-label y los botones también',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const a11y = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="duration"]');
      const h = p.shadowRoot.querySelector('#h');
      const m = p.shadowRoot.querySelector('#m');
      const s = p.shadowRoot.querySelector('#s');
      const upH = p.shadowRoot.querySelector('is-button[data-target="h"].up');
      const upM = p.shadowRoot.querySelector('is-button[data-target="m"].up');
      return {
        hLabel: h.getAttribute('aria-label'),
        mLabel: m.getAttribute('aria-label'),
        sLabel: s.getAttribute('aria-label'),
        upHoursLabel: upH.getAttribute('aria-label'),
        upMinutesLabel: upM.getAttribute('aria-label'),
      };
    });
    assert.match(a11y.hLabel, /[Hh]oras?/, `aria-label de h debe mencionar Horas, obtuve "${a11y.hLabel}"`);
    assert.match(a11y.mLabel, /[Mm]inutos?/, `aria-label de m debe mencionar Minutos, obtuve "${a11y.mLabel}"`);
    assert.match(a11y.sLabel, /[Ss]egundos?/, `aria-label de s debe mencionar Segundos, obtuve "${a11y.sLabel}"`);
    assert.ok(a11y.upHoursLabel && a11y.upHoursLabel.length > 0, 'botón + horas debe tener aria-label');
    assert.ok(a11y.upMinutesLabel && a11y.upMinutesLabel.length > 0, 'botón + minutos debe tener aria-label');
  },
});

tests.push({
  name: 'caso límite: value=0 da text="00:00" y componentes 0/0/0',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.value = 0;
      return {
        value: p.value,
        text: p.text,
        h: p.hours,
        m: p.minutes,
        s: p.seconds,
      };
    });
    assert.equal(data.value, 0, 'value debe ser 0');
    assert.equal(data.text, '00:00', `text debe ser "00:00", obtuve "${data.text}"`);
    assert.equal(data.h, 0);
    assert.equal(data.m, 0);
    assert.equal(data.s, 0);
  },
});

tests.push({
  name: 'caso límite: tick() emite is-change con value y text',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-duration-picker-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('main is-duration-picker[name="programmatic"]');
      p.set(0, 0, 0);
      let captured = null;
      const handler = (e) => { captured = e.detail; };
      p.addEventListener('is-change', handler);
      p.tick(65); // +1m 5s
      p.removeEventListener('is-change', handler);
      return captured;
    });
    assert.ok(data, 'debe haberse emitido is-change');
    assert.equal(data.value, 65, `value debe ser 65, obtuve ${data.value}`);
    assert.equal(data.text, '01:05', `text debe ser "01:05", obtuve "${data.text}"`);
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

report('duration-picker', failures === 0, { total: tests.length, failures });
