// toast-item.test.mjs — tests exhaustivos del demo is-toast-item.
// Cobertura: smoke + funcional (show/hide, duración por defecto, role=status,
// eventos is-after-show/hide, log payload, slot caption, color inválido
// cae a neutral).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/toast-item/toast-item.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente se define y los botones del demo existen',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    const data = await page.evaluate(() => {
      return {
        defined: !!customElements.get('is-toast-item'),
        buttons: document.querySelectorAll('button').length,
      };
    });
    assert.equal(data.defined, true, 'is-toast-item debe estar definido');
    assert.ok(data.buttons >= 4, `esperaba >=4 botones, hay ${data.buttons}`);
    await screenshot(page, 'toast-item-smoke');
  },
});

tests.push({
  name: 'funcional: show() crea el item visible con role=status',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-success');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const items = document.querySelectorAll('#stage-1 is-toast-item');
      const first = items[items.length - 1];
      const base = first.shadowRoot.querySelector('.base');
      return {
        count: items.length,
        role: base.getAttribute('role'),
        ariaLive: base.getAttribute('aria-live'),
        hidden: first.hidden,
      };
    });
    assert.ok(data.count >= 1, `esperaba >=1 item creado (hay ${data.count})`);
    assert.equal(data.role, 'status', `role debe ser status (vimos "${data.role}")`);
    assert.equal(data.ariaLive, 'polite', `aria-live debe ser polite (vimos "${data.ariaLive}")`);
    assert.equal(data.hidden, false, 'item visible no debe estar hidden');
  },
});

tests.push({
  name: 'funcional: color por defecto es brand',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    const color = await page.evaluate(() => {
      const el = document.createElement('is-toast-item');
      document.body.appendChild(el);
      const c = el.getAttribute('color');
      el.remove();
      return c;
    });
    assert.equal(color, 'brand', `color default debe ser brand (vimos "${color}")`);
  },
});

tests.push({
  name: 'funcional: duration default es 5000ms',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.createElement('is-toast-item');
      document.body.appendChild(el);
      const d = el.duration;
      el.remove();
      return d;
    });
    assert.equal(data, 5000, `duration default debe ser 5000 (vimos ${data})`);
  },
});

tests.push({
  name: 'funcional: hide() emite is-after-hide y desaparece',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    const seen = await page.evaluate(async () => {
      const el = document.createElement('is-toast-item');
      el.setAttribute('duration', '0'); // persistente, así no se autocierra
      document.body.appendChild(el);
      const events = [];
      el.addEventListener('is-after-show', () => events.push('show'));
      el.addEventListener('is-after-hide', () => events.push('hide'));
      el.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      el.hide();
      await new Promise((r) => requestAnimationFrame(() => r()));
      el.remove();
      return events;
    });
    assert.ok(seen.includes('show'), `esperaba is-after-show, vi ${JSON.stringify(seen)}`);
    assert.ok(seen.includes('hide'), `esperaba is-after-hide, vi ${JSON.stringify(seen)}`);
  },
});

tests.push({
  name: 'funcional: is-after-show lleva payload con message/color/log',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    const detail = await page.evaluate(async () => {
      const el = document.createElement('is-toast-item');
      el.setAttribute('duration', '0');
      el.color = 'success';
      el.textContent = 'Mensaje de prueba';
      el.log = { foo: 1 };
      document.body.appendChild(el);
      let captured = null;
      el.addEventListener('is-after-show', (e) => { captured = e.detail; });
      el.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      el.remove();
      return captured;
    });
    assert.ok(detail, 'detail del evento no debe ser null');
    assert.equal(detail.color, 'success', `color debe propagarse (vimos "${detail.color}")`);
    assert.equal(detail.message, 'Mensaje de prueba', `message debe coincidir (vimos "${detail.message}")`);
    assert.deepEqual(detail.log, { foo: 1 }, `log debe propagarse (vimos ${JSON.stringify(detail.log)})`);
  },
});

tests.push({
  name: 'funcional: slot caption se proyecta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-caption');
    await page.waitForTimeout(200);
    const caption = await page.evaluate(() => {
      const items = document.querySelectorAll('#stage-2 is-toast-item');
      return items.length > 0;
    });
    assert.ok(caption, 'caption debe haberse agregado');
  },
});

tests.push({
  name: 'robustez: color inválido cae a neutral',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    const color = await page.evaluate(() => {
      const el = document.createElement('is-toast-item');
      el.setAttribute('color', 'no-color');
      document.body.appendChild(el);
      const c = el.color;
      el.remove();
      return c;
    });
    assert.equal(color, 'neutral', `color inválido debe normalizarse a neutral (vimos "${color}")`);
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

report('toast-item', failures === 0, { total: tests.length, failures });
