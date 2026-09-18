// badge.test.mjs — tests exhaustivos del demo is-badge.
// Cobertura: smoke + funcional (color/variant/pill/attention) +
// slots + atributos inválidos caen a default + accesibilidad básica.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/badge/badge.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta y refleja color/variant por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-badge');
      return {
        count: all.length,
        defined: !!customElements.get('is-badge'),
        first: all[0]?.getAttribute('color'),
        second: all[0]?.getAttribute('variant'),
      };
    });
    assert.equal(data.defined, true, 'is-badge debe estar definido');
    assert.ok(data.count >= 5, `esperaba >=5 badges en la página, hay ${data.count}`);
    assert.equal(data.first, 'brand', 'primer badge debe tener color=brand');
    assert.equal(data.second, 'accent', 'variant por defecto debe ser accent');
    await screenshot(page, 'badge-smoke');
  },
});

tests.push({
  name: 'funcional: cada badge refleja color explícito',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const colors = await page.evaluate(() => {
      return [...document.querySelectorAll('section')].flatMap((sec) =>
        [...sec.querySelectorAll('is-badge')].map((b) => b.getAttribute('color')),
      );
    });
    // Confirmar presencia de los 5 colores canónicos en la sección "Colores"
    for (const expected of ['brand', 'neutral', 'success', 'warning', 'danger']) {
      assert.ok(colors.includes(expected), `esperaba ver color=${expected} en la página`);
    }
  },
});

tests.push({
  name: 'funcional: variant filled-outlined se aplica al atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const variants = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Variantes'));
      if (!sec) return [];
      return [...sec.querySelectorAll('is-badge')].map((b) => b.getAttribute('variant'));
    });
    assert.deepEqual(
      variants,
      ['accent', 'filled', 'outlined', 'filled-outlined'],
      `variants deben ser exactamente [accent, filled, outlined, filled-outlined], se vio ${JSON.stringify(variants)}`,
    );
  },
});

tests.push({
  name: 'funcional: atributo pill se aplica sin error',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const has = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Pill'));
      return [...sec.querySelectorAll('is-badge')].map((b) => b.hasAttribute('pill'));
    });
    assert.ok(has.length >= 3, 'sección Pill debe tener >=3 badges');
    assert.ok(has.every(Boolean), 'todos los badges de la sección Pill deben llevar atributo pill');
  },
});

tests.push({
  name: 'funcional: attention pulse / bounce se reflejan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const attentions = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Atención'));
      return [...sec.querySelectorAll('is-badge')].map((b) => b.getAttribute('attention'));
    });
    assert.deepEqual(attentions, ['pulse', 'bounce'], `attentions deben ser [pulse, bounce], se vio ${JSON.stringify(attentions)}`);
  },
});

tests.push({
  name: 'funcional: slots start y end proyectan contenido',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const slotCount = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Slots'));
      const badges = sec.querySelectorAll('is-badge');
      let start = 0;
      let end = 0;
      for (const b of badges) {
        start += b.querySelectorAll('[slot="start"]').length;
        end += b.querySelectorAll('[slot="end"]').length;
      }
      return { start, end, badges: badges.length };
    });
    assert.ok(slotCount.start >= 2, `esperaba >=2 elementos con slot=start, hay ${slotCount.start}`);
    assert.ok(slotCount.end >= 1, `esperaba >=1 elemento con slot=end, hay ${slotCount.end}`);
  },
});

tests.push({
  name: 'robustez: color inválido cae a "brand"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const fallback = await page.evaluate(() => {
      const el = document.createElement('is-badge');
      el.setAttribute('color', 'no-existe-este-color');
      document.body.appendChild(el);
      const got = el.getAttribute('color');
      el.remove();
      return got;
    });
    assert.equal(fallback, 'brand', `color inválido debe caer a "brand", se vio "${fallback}"`);
  },
});

tests.push({
  name: 'robustez: variant inválido cae a "accent"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const fallback = await page.evaluate(() => {
      const el = document.createElement('is-badge');
      el.setAttribute('variant', 'no-existe');
      document.body.appendChild(el);
      const got = el.getAttribute('variant');
      el.remove();
      return got;
    });
    assert.equal(fallback, 'accent', `variant inválido debe caer a "accent", se vio "${fallback}"`);
  },
});

tests.push({
  name: 'accesibilidad: el badge expone su texto al AT',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const visibleText = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Colores'));
      return [...sec.querySelectorAll('is-badge')].map((b) => b.textContent.trim());
    });
    for (const expected of ['Brand', 'Neutral', 'Success', 'Warning', 'Danger']) {
      assert.ok(visibleText.includes(expected), `esperaba ver texto "${expected}" en los badges`);
    }
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

report('badge', failures === 0, { total: tests.length, failures });
