// prefs-clear.test.mjs — tests exhaustivos del demo is-prefs-clear.
// Cobertura: smoke + funcional (peek, clear sin reload emite evento,
// confirm/reload flags, atributos forwarded al button interno).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/prefs-clear/prefs-clear.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta y expone un botón interno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-prefs-clear');
      return {
        defined: !!customElements.get('is-prefs-clear'),
        count: all.length,
        eachHasButton: [...all].every((p) => !!p.shadowRoot?.querySelector('is-button')),
      };
    });
    assert.equal(data.defined, true, 'is-prefs-clear debe estar definido');
    assert.ok(data.count >= 2, `esperaba >=2 prefs-clear, hay ${data.count}`);
    assert.equal(data.eachHasButton, true, 'cada prefs-clear debe contener un is-button en su shadow');
    await screenshot(page, 'prefs-clear-smoke');
  },
});

tests.push({
  name: 'funcional: peek() devuelve el contenido del root de prefs',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    // Sembrar una key en el root esperado.
    await page.evaluate(() => {
      localStorage.setItem('is-webcomponents:__test__', JSON.stringify({ foo: 1 }));
    });
    const peek = await page.evaluate(() => {
      const silent = document.getElementById('silent');
      const out = silent.peek();
      // Debe ser un objeto (posiblemente vacío o con keys)
      return out;
    });
    assert.ok(peek && typeof peek === 'object', `peek debe devolver un objeto (vimos "${typeof peek}")`);
  },
});

tests.push({
  name: 'funcional: clear() con reload=false NO recarga y emite is-prefs-clear',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    await page.waitForTimeout(150);
    // Sembrar prefs en el ROOT_KEY ('is-webcomponents') con la estructura
    // esperada por parseRoot: un objeto con keys que son tags. clearAllComponentPrefs
    // solo borra ROOT_KEY (no otros prefijos).
    await page.evaluate(() => {
      localStorage.setItem('is-webcomponents', JSON.stringify({
        'is-split-panel:size': { v: 200 },
        'is-grid:scroll': { v: 100 },
      }));
    });
    const before = await page.evaluate(() => {
      return localStorage.getItem('is-webcomponents');
    });
    assert.ok(before, `esperaba prefs sembradas en ROOT_KEY, vi ${before}`);

    const urlBefore = page.url();
    const result = await page.evaluate(async () => {
      const silent = document.getElementById('silent');
      const events = [];
      silent.addEventListener('is-prefs-clear', (e) => events.push(e.detail));
      const out = await silent.clear();
      await new Promise((r) => setTimeout(r, 100));
      return { events, out };
    });
    await page.waitForTimeout(200);
    const urlAfter = page.url();
    assert.equal(urlBefore, urlAfter, `reload=false NO debe recargar (url antes=${urlBefore}, después=${urlAfter})`);
    assert.ok(result.events.length >= 1, `esperaba evento is-prefs-clear, vi ${result.events.length}`);
    assert.ok(Array.isArray(result.events[0].tags), `evento debe llevar detail.tags array (vimos ${JSON.stringify(result.events[0].tags)})`);
    assert.ok(result.events[0].tags.length >= 2,
      `evento.tags debe listar los tags limpiados (esperaba >=2, vi ${JSON.stringify(result.events[0].tags)})`);
    const after = await page.evaluate(() => {
      return localStorage.getItem('is-webcomponents');
    });
    assert.equal(after, null, `ROOT_KEY debe haber sido borrada por clear (vimos "${after}")`);
  },
});

tests.push({
  name: 'funcional: atributo confirm=false permite limpiar sin prompt',
  run: async (page) => {
    // Sobrescribir window.confirm para detectar si se llamó.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(async () => {
      let called = 0;
      window.confirm = () => { called++; return true; };
      const silent = document.getElementById('silent'); // confirm="false"
      await silent.clear();
      return { called };
    });
    assert.equal(result.called, 0, `confirm=false NO debe llamar a window.confirm (se llamó ${result.called} veces)`);
  },
});

tests.push({
  name: 'funcional: atributo confirm=true SÍ llama a window.confirm',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(async () => {
      let called = 0;
      window.confirm = () => { called++; return false; };
      const asking = document.querySelectorAll('is-prefs-clear')[0]; // confirm default true
      await asking.clear();
      return { called };
    });
    assert.ok(result.called >= 1, `confirm default true debe llamar a window.confirm (se llamó ${result.called} veces)`);
  },
});

tests.push({
  name: 'funcional: atributos variant/color se reenvían al botón interno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    await page.waitForTimeout(150);
    const forwarded = await page.evaluate(async () => {
      const el = document.createElement('is-prefs-clear');
      el.setAttribute('variant', 'filled');
      el.setAttribute('color', 'danger');
      el.setAttribute('shape', 'pill');
      el.setAttribute('aria-label', 'Reset memoria');
      document.body.appendChild(el);
      await new Promise((r) => requestAnimationFrame(() => r()));
      const btn = el.shadowRoot.querySelector('is-button');
      const got = {
        variant: btn.getAttribute('variant'),
        color: btn.getAttribute('color'),
        shape: btn.getAttribute('shape'),
        aria: btn.getAttribute('aria-label'),
      };
      el.remove();
      return got;
    });
    assert.equal(forwarded.variant, 'filled', `variant debe reenviarse (vimos "${forwarded.variant}")`);
    assert.equal(forwarded.color, 'danger', `color debe reenviarse (vimos "${forwarded.color}")`);
    assert.equal(forwarded.shape, 'pill', `shape debe reenviarse (vimos "${forwarded.shape}")`);
    assert.equal(forwarded.aria, 'Reset memoria', `aria-label debe reenviarse (vimos "${forwarded.aria}")`);
  },
});

tests.push({
  name: 'accesibilidad: el botón interno tiene title y aria-label por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    const info = await page.evaluate(() => {
      const btn = document.querySelector('is-prefs-clear').shadowRoot.querySelector('is-button');
      return {
        aria: btn.getAttribute('aria-label'),
        title: btn.getAttribute('title'),
      };
    });
    assert.ok(info.aria, 'aria-label por defecto debe existir');
    assert.match(info.aria, /limpiar|memoria/i, `aria-label debe mencionar limpiar/memoria (vimos "${info.aria}")`);
  },
});

let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('prefs-clear', failures === 0, { total: tests.length, failures });
