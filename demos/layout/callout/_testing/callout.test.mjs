// callout.test.mjs — tests exhaustivos del demo callout.html.
// Cobertura: smoke + funcional (color, variant, icon, slot icon, fallbacks
// para valores inválidos) + determinismo + CSS Parts.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/callout/callout.html`;

const tests = [];

tests.push({
  name: 'smoke: is-callout está definido y los 5 colores renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    const initial = await page.evaluate(() => {
      const callouts = [...document.querySelectorAll('#colors is-callout')];
      return {
        defined: !!customElements.get('is-callout'),
        count: callouts.length,
        colors: callouts.map((c) => c.getAttribute('color')),
        rendered: callouts.map((c) => {
          const sr = c.shadowRoot;
          const base = sr?.querySelector('[part="base"]');
          return {
            hasBase: !!base,
            // Texto visible: usamos el textContent del host (light DOM) que es
            // lo que el consumidor asignó y lo que se ve a través del slot.
            text: (c.textContent ?? '').trim(),
            hasIcon: !!sr?.querySelector('[part="icon"]'),
            hasMessage: !!sr?.querySelector('[part="message"]'),
          };
        }),
      };
    });
    assert.equal(initial.defined, true, 'is-callout debe estar definido');
    assert.equal(initial.count, 5, `esperaba 5 callouts (uno por color), hay ${initial.count}`);
    assert.deepEqual(initial.colors, ['brand', 'neutral', 'success', 'warning', 'danger']);
    for (const r of initial.rendered) {
      assert.equal(r.hasBase, true, 'cada callout debe exponer part="base"');
      assert.equal(r.hasIcon, true, 'cada callout debe exponer part="icon"');
      assert.equal(r.hasMessage, true, 'cada callout debe exponer part="message"');
      assert.ok(r.text.length > 0, `cada callout debe tener texto visible, fue "${r.text}"`);
    }
    await screenshot(page, 'callout-smoke');
  },
});

tests.push({
  name: 'funcional: los 5 variants renderizan y se reflejan en el DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    const data = await page.evaluate(() => {
      const variants = [...document.querySelectorAll('#variants is-callout')];
      return variants.map((v) => ({
        attr: v.getAttribute('variant'),
        valid: ['accent', 'filled', 'outlined', 'filled-outlined', 'plain'].includes(v.variant),
      }));
    });
    assert.equal(data.length, 5, `esperaba 5 variants, hay ${data.length}`);
    for (const d of data) {
      assert.equal(d.valid, true, `variant="${d.attr}" debería ser válido (la propiedad refleja el atributo)`);
    }
  },
});

tests.push({
  name: 'funcional: el atributo icon="..." se aplica al is-icon interno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    await page.waitForTimeout(100);
    const iconName = await page.evaluate(() => {
      const callouts = [...document.querySelectorAll('#icons is-callout')];
      const withAttr = callouts.find((c) => c.getAttribute('icon') === 'mdi:rocket-launch-outline');
      if (!withAttr) return null;
      const defaultIcon = withAttr.shadowRoot.querySelector('.default-icon');
      // El componente aplica el icon vía .icon property en queueMicrotask.
      return defaultIcon ? defaultIcon.icon : null;
    });
    assert.equal(iconName, 'mdi:rocket-launch-outline',
      `el atributo icon debe propagarse al is-icon (.icon property), fue "${iconName}"`);
  },
});

tests.push({
  name: 'funcional: slotted icon (slot="icon") gana sobre el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    const slotted = await page.evaluate(() => {
      const callouts = [...document.querySelectorAll('#icons is-callout')];
      const slotted = callouts.find((c) => c.querySelector('[slot="icon"]'));
      if (!slotted) return null;
      const sr = slotted.shadowRoot;
      const defaultIcon = sr.querySelector('.default-icon');
      const customSlot = slotted.querySelector('[slot="icon"]');
      return {
        defaultHidden: !!defaultIcon?.hidden,
        customText: customSlot?.textContent?.trim(),
      };
    });
    assert.ok(slotted, 'debe existir un callout con slot icon');
    assert.equal(slotted.defaultHidden, true, 'el default icon debe ocultarse cuando hay slot="icon"');
    assert.equal(slotted.customText, '★', 'el contenido del slot debe ser "★"');
  },
});

tests.push({
  name: 'funcional: cambiar color en caliente actualiza la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    const before = await page.evaluate(() => {
      const c = document.getElementById('interactive');
      return { color: c.color, attr: c.getAttribute('color') };
    });
    assert.equal(before.attr, 'warning', 'precondición: arranca en warning');
    await page.click('#btn-color');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const c = document.getElementById('interactive');
      return { color: c.color, attr: c.getAttribute('color') };
    });
    assert.equal(after.attr, 'danger', 'tras btn-color: color → danger');
    assert.equal(after.color, 'danger', 'la propiedad refleja el atributo');
  },
});

tests.push({
  name: 'funcional: variant cycla correctamente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    const before = await page.evaluate(() => document.getElementById('interactive').variant);
    assert.equal(before, 'outlined');
    await page.click('#btn-variant');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => document.getElementById('interactive').variant);
    assert.equal(after, 'filled-outlined', `variant cycled: ${before} → ${after}`);
  },
});

tests.push({
  name: 'funcional: atributos inválidos caen al fallback documentado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    await page.click('#btn-bad');
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => {
      const c = document.getElementById('interactive');
      return { color: c.color, variant: c.variant };
    });
    assert.equal(result.color, 'neutral', `color inválido debe caer a "neutral", fue "${result.color}"`);
    assert.equal(result.variant, 'filled-outlined',
      `variant inválido debe caer a "filled-outlined", fue "${result.variant}"`);
  },
});

tests.push({
  name: 'determinismo: re-asignar mismos attrs no cambia el render',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-callout-ready');
    await page.waitForTimeout(100);
    const a = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-callout')].map((c) => ({
        attr: c.getAttribute('color'),
        part: c.shadowRoot.querySelector('[part="base"]')?.getAttribute('class') ?? '',
      }));
    });
    await page.evaluate(() => {
      document.querySelectorAll('main is-callout').forEach((c) => {
        const v = c.getAttribute('color'); if (v) { c.removeAttribute('color'); c.setAttribute('color', v); }
        const x = c.getAttribute('variant'); if (x) { c.removeAttribute('variant'); c.setAttribute('variant', x); }
      });
    });
    await page.waitForTimeout(100);
    const b = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-callout')].map((c) => ({
        attr: c.getAttribute('color'),
        part: c.shadowRoot.querySelector('[part="base"]')?.getAttribute('class') ?? '',
      }));
    });
    assert.deepEqual(a, b, 're-asignar mismos attrs produce el mismo render');
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

report('callout', failures === 0, { total: tests.length, failures });
