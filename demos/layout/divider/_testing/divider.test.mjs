// divider.test.mjs — tests exhaustivos del demo divider.html.
// Cobertura: smoke + funcional (orientation, role/aria, color/opacity,
// range/clamp, fallbacks) + determinismo + CSS Parts.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/divider/divider.html`;

const tests = [];

tests.push({
  name: 'smoke: is-divider está definido y los dividers horizontales/verticales renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const data = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-divider')];
      return {
        defined: !!customElements.get('is-divider'),
        count: all.length,
        // role + aria-orientation siempre en host.
        a11y: all.map((d) => ({
          role: d.getAttribute('role'),
          aria: d.getAttribute('aria-orientation'),
        })),
        // CSS Part "divider" dentro del shadow.
        parts: all.map((d) => ({
          divider: !!d.shadowRoot?.querySelector('[part="divider"]'),
        })),
      };
    });
    assert.equal(data.defined, true, 'is-divider debe estar definido');
    assert.ok(data.count >= 17, `esperaba >=17 dividers en el demo, hay ${data.count}`);
    for (const a of data.a11y) {
      assert.equal(a.role, 'separator', 'cada divider debe tener role="separator"');
      assert.ok(['horizontal', 'vertical'].includes(a.aria),
        `aria-orientation debe ser horizontal|vertical, fue "${a.aria}"`);
    }
    for (const p of data.parts) {
      assert.equal(p.divider, true, 'cada divider debe exponer part="divider"');
    }
    await screenshot(page, 'divider-smoke');
  },
});

tests.push({
  name: 'funcional: divider vertical es más alto que ancho',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const data = await page.evaluate(() => {
      const vd = document.getElementById('vd');
      const r = vd.getBoundingClientRect();
      return { w: r.width, h: r.height, aria: vd.getAttribute('aria-orientation') };
    });
    assert.equal(data.aria, 'vertical');
    assert.ok(data.h > data.w, `vertical debe ser más alto que ancho (h=${data.h}, w=${data.w})`);
  },
});

tests.push({
  name: 'funcional: opacity se mapea a CSS var --opacity',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const opacities = await page.evaluate(() => {
      const set = new Set();
      [...document.querySelectorAll('#host-3 is-divider')].forEach((d) => {
        const val = d.style.getPropertyValue('--opacity');
        set.add(val);
      });
      return [...set].sort();
    });
    // Esperamos 5 opacities distintas (10/100, 25/100, 50/100, 75/100, 100/100 = 1).
    assert.equal(opacities.length, 5, `esperaba 5 opacities distintas, hay ${opacities.length}: ${opacities.join(',')}`);
    assert.equal(opacities[opacities.length - 1], '1', 'la mayor opacity debe mapear a 1');
  },
});

tests.push({
  name: 'funcional: color inválido cae a "text"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    await page.click('#btn-bad');
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => {
      const d = document.getElementById('interactive');
      return { color: d.color, opacity: d.opacity };
    });
    assert.equal(result.color, 'text', `color inválido → "text", fue "${result.color}"`);
    // opacity="banana" → parseFloat es NaN → cae al default 20.
    assert.equal(result.opacity, 20, `opacity inválido → 20, fue ${result.opacity}`);
  },
});

tests.push({
  name: 'funcional: opacity se clampa a [0, 100]',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const data = await page.evaluate(() => {
      // Crear uno con opacity fuera de rango y leer la propiedad.
      const d1 = document.createElement('is-divider');
      d1.setAttribute('opacity', '500');
      document.body.appendChild(d1);
      const high = d1.opacity;

      const d2 = document.createElement('is-divider');
      d2.setAttribute('opacity', '-30');
      document.body.appendChild(d2);
      const low = d2.opacity;

      d1.remove(); d2.remove();
      return { high, low };
    });
    assert.equal(data.high, 100, `opacity 500 debe clamparse a 100, fue ${data.high}`);
    assert.equal(data.low, 0, `opacity -30 debe clamparse a 0, fue ${data.low}`);
  },
});

tests.push({
  name: 'funcional: opacity cicla con btn-op y se refleja en la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const before = await page.evaluate(() => document.getElementById('interactive').opacity);
    assert.equal(before, 30);
    await page.click('#btn-op');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => document.getElementById('interactive').opacity);
    assert.equal(after, 50, `opacity 30 + 20 = 50, fue ${after}`);
  },
});

tests.push({
  name: 'funcional: orientation inválido cae a "horizontal"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const o = await page.evaluate(() => {
      const d = document.createElement('is-divider');
      d.setAttribute('orientation', 'diagonal');
      document.body.appendChild(d);
      const v = d.orientation;
      const aria = d.getAttribute('aria-orientation');
      d.remove();
      return { orientation: v, aria };
    });
    assert.equal(o.orientation, 'horizontal');
    assert.equal(o.aria, 'horizontal');
  },
});

tests.push({
  name: 'determinismo: re-asignar mismos attrs produce el mismo --opacity',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-divider-ready');
    const a = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-divider')].map((d) => ({
        opacity: d.style.getPropertyValue('--opacity'),
        color: d.getAttribute('color'),
        aria: d.getAttribute('aria-orientation'),
      }));
    });
    await page.evaluate(() => {
      document.querySelectorAll('main is-divider').forEach((d) => {
        const op = d.getAttribute('opacity'); if (op) { d.removeAttribute('opacity'); d.setAttribute('opacity', op); }
        const c = d.getAttribute('color'); if (c) { d.removeAttribute('color'); d.setAttribute('color', c); }
        const o = d.getAttribute('orientation'); if (o) { d.removeAttribute('orientation'); d.setAttribute('orientation', o); }
      });
    });
    await page.waitForTimeout(80);
    const b = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-divider')].map((d) => ({
        opacity: d.style.getPropertyValue('--opacity'),
        color: d.getAttribute('color'),
        aria: d.getAttribute('aria-orientation'),
      }));
    });
    assert.deepEqual(a, b, 're-asignar mismos attrs produce el mismo estado');
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

report('divider', failures === 0, { total: tests.length, failures });
