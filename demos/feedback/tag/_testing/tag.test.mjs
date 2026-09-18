// tag.test.mjs — tests exhaustivos del demo is-tag.
// Cobertura: smoke + funcional (color/variant/pill, with-remove emite
// is-remove, remove-label, slots start/end, valores inválidos caen a default).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/tag/tag.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con color=brand, variant=filled-outlined por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-tag');
      const picks = all[0];
      return {
        defined: !!customElements.get('is-tag'),
        count: all.length,
        color: picks.getAttribute('color'),
        variant: picks.getAttribute('variant'),
      };
    });
    assert.equal(data.defined, true, 'is-tag debe estar definido');
    assert.ok(data.count >= 10, `esperaba >=10 tags, hay ${data.count}`);
    assert.equal(data.color, 'brand', `default color debe ser brand (vimos "${data.color}")`);
    assert.equal(data.variant, 'filled-outlined', `default variant debe ser filled-outlined (vimos "${data.variant}")`);
    await screenshot(page, 'tag-smoke');
  },
});

tests.push({
  name: 'funcional: la sección colores expone los 6 colores canónicos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const colors = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Colores'));
      return [...sec.querySelectorAll('is-tag')].map((t) => t.getAttribute('color'));
    });
    for (const expected of ['brand', 'neutral', 'info', 'success', 'warning', 'danger']) {
      assert.ok(colors.includes(expected), `esperaba ver color=${expected} (vi ${JSON.stringify(colors)})`);
    }
  },
});

tests.push({
  name: 'funcional: variant inválido cae a filled-outlined',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const got = await page.evaluate(async () => {
      const el = document.createElement('is-tag');
      // Hay que conectar ANTES de setear el atributo inválido: la clase base
      // (ElementBase) silencia attributeChangedCallback hasta que mounted=true.
      // mounted se setea en connectedCallback.
      document.body.appendChild(el);
      el.setAttribute('variant', 'invalid-variant');
      await new Promise((r) => requestAnimationFrame(() => r()));
      const v = el.getAttribute('variant');
      el.remove();
      return v;
    });
    assert.equal(got, 'filled-outlined', `variant inválido debe caer a filled-outlined (vimos "${got}")`);
  },
});

tests.push({
  name: 'funcional: color inválido cae a neutral',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const got = await page.evaluate(async () => {
      const el = document.createElement('is-tag');
      document.body.appendChild(el);
      el.setAttribute('color', 'no-color');
      await new Promise((r) => requestAnimationFrame(() => r()));
      const c = el.getAttribute('color');
      el.remove();
      return c;
    });
    assert.equal(got, 'neutral', `color inválido debe caer a neutral (vimos "${got}")`);
  },
});

tests.push({
  name: 'funcional: with-remove expone el botón de quitar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const data = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('with-remove'));
      const tags = [...sec.querySelectorAll('is-tag[with-remove]')];
      return tags.map((t) => {
        const remove = t.shadowRoot.querySelector('.remove');
        return {
          withRemove: t.hasAttribute('with-remove'),
          removeVisible: remove && !remove.hidden,
          removeLabel: remove?.getAttribute('aria-label'),
        };
      });
    });
    assert.ok(data.length >= 4, `esperaba >=4 tags removibles, hay ${data.length}`);
    assert.ok(data.every((d) => d.withRemove && d.removeVisible), 'todos deben tener with-remove y botón visible');
    assert.ok(data.every((d) => d.removeLabel === 'Quitar'), `remove label debe ser "Quitar" (vi ${JSON.stringify(data.map((d) => d.removeLabel))})`);
  },
});

tests.push({
  name: 'eventos: is-remove se dispara al click en el botón de quitar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    await page.waitForTimeout(150);
    const seen = await page.evaluate(async () => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('with-remove'));
      const t = sec.querySelector('is-tag[with-remove]');
      const events = [];
      t.addEventListener('is-remove', () => events.push('is-remove'));
      const btn = t.shadowRoot.querySelector('.remove');
      btn.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      return events;
    });
    assert.ok(seen.includes('is-remove'), `esperaba is-remove, vi ${JSON.stringify(seen)}`);
  },
});

tests.push({
  name: 'funcional: remove-label custom se aplica al aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const label = await page.evaluate(() => {
      const el = document.createElement('is-tag');
      el.setAttribute('with-remove', '');
      el.setAttribute('remove-label', 'Borrar este tag');
      document.body.appendChild(el);
      const got = el.shadowRoot.querySelector('.remove').getAttribute('aria-label');
      el.remove();
      return got;
    });
    assert.equal(label, 'Borrar este tag', `remove-label debe reflejarse (vimos "${label}")`);
  },
});

tests.push({
  name: 'slots: start y end se proyectan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const slotCount = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Slots'));
      const t = sec.querySelector('is-tag');
      return {
        start: t.querySelectorAll('[slot="start"]').length,
        end: t.querySelectorAll('[slot="end"]').length,
      };
    });
    assert.ok(slotCount.start >= 1, `slot=start debe existir (vimos ${slotCount.start})`);
    assert.ok(slotCount.end >= 1, `slot=end debe existir (vimos ${slotCount.end})`);
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

report('tag', failures === 0, { total: tests.length, failures });
