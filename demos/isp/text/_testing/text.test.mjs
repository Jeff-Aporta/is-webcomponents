// text.test.mjs — tests exhaustivos del demo <is-text>.
// Cobertura: smoke + funcional (color semántico/CSS/current, mix, lines)
// + clamp real en el browser + colorKind.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/text/text.html`;

const tests = [];

tests.push({
  name: 'smoke: texts renderizan con slot content',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-text-ready');
    const info = await page.evaluate(() => {
      const texts = [...document.querySelectorAll('is-text')];
      const hasPart = texts.every((t) => {
        const sr = t.shadowRoot;
        return !!sr?.querySelector('slot[part="content"]');
      });
      return {
        defined: !!customElements.get('is-text'),
        count: texts.length,
        allHaveContentSlot: hasPart,
      };
    });
    assert.equal(info.defined, true);
    assert.ok(info.count >= 15, `esperaba >=15 textos, hay ${info.count}`);
    assert.equal(info.allHaveContentSlot, true, 'cada <is-text> debe tener slot[part=content]');
    await screenshot(page, 'text-smoke');
  },
});

tests.push({
  name: 'funcional: color semántico activa colorKind=semantic; CSS arbitrario → css',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-text-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const t1 = document.createElement('is-text');
      t1.color = 'success';
      document.body.appendChild(t1);
      const t2 = document.createElement('is-text');
      t2.color = '#abcdef';
      document.body.appendChild(t2);
      const t3 = document.createElement('is-text');
      t3.color = 'current';
      document.body.appendChild(t3);
      const r = {
        kind1: t1.colorKind,
        kind2: t2.colorKind,
        kind3: t3.colorKind,
      };
      [t1, t2, t3].forEach((t) => t.remove());
      return r;
    });
    assert.equal(result.kind1, 'semantic');
    assert.equal(result.kind2, 'css');
    assert.equal(result.kind3, 'current');
  },
});

tests.push({
  name: 'funcional: mix se traduce a --is-text-mix y data-has-mix',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-text-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const t = document.createElement('is-text');
      t.color = 'brand';
      t.mix = '30%';
      document.body.appendChild(t);
      const r = {
        mixVar: t.style.getPropertyValue('--is-text-mix'),
        hasMixAttr: t.hasAttribute('data-has-mix'),
        attr: t.getAttribute('mix'),
      };
      // Limpiar mix → debe quitar var y quitar attr
      t.mix = '';
      const after = {
        mixVar: t.style.getPropertyValue('--is-text-mix'),
        hasMixAttr: t.hasAttribute('data-has-mix'),
        attr: t.getAttribute('mix'),
      };
      t.remove();
      return { withMix: r, withoutMix: after };
    });
    assert.equal(result.withMix.mixVar, '30%', `--is-text-mix debe ser '30%'`);
    assert.equal(result.withMix.attr, '30%');
    assert.equal(result.withMix.hasMixAttr, true, 'data-has-mix debe estar presente');
    assert.equal(result.withoutMix.mixVar, '', 'mix var debe limpiarse al quitar mix');
    assert.equal(result.withoutMix.hasMixAttr, false, 'data-has-mix debe quitarse al limpiar mix');
  },
});

tests.push({
  name: 'funcional: lines=N activa clamp real (-webkit-line-clamp)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-text-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      // Crear un contenedor con ancho fijo y un is-text con lines=2.
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width: 12rem; padding: 0; background: rgba(255,255,255,0.04);';
      const t = document.createElement('is-text');
      t.textContent = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.';
      t.lines = 2;
      wrap.appendChild(t);
      document.body.appendChild(wrap);
      const cs = getComputedStyle(t);
      const lns = t.style.getPropertyValue('--mx-lns');
      const r = {
        display: cs.display,
        webkitLineClamp: cs.webkitLineClamp,
        webkitBoxOrient: cs.webkitBoxOrient,
        lns,
        rectH: wrap.getBoundingClientRect().height,
        lines: t.lines,
      };
      wrap.remove();
      return r;
    });
    assert.equal(result.lns, '2', `--mx-lns debe ser '2'`);
    assert.equal(result.lines, 2);
    // Debe tener display:-webkit-box y -webkit-line-clamp:2.
    assert.equal(result.display, '-webkit-box');
    assert.ok(/2/.test(result.webkitLineClamp || ''), `webkitLineClamp debe contener '2', es '${result.webkitLineClamp}'`);
  },
});

tests.push({
  name: 'funcional: lines=0 quita el clamp (sin --mx-lns)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-text-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const t = document.createElement('is-text');
      t.lines = 3;
      document.body.appendChild(t);
      const hasMx = t.style.getPropertyValue('--mx-lns');
      t.lines = 0;
      const afterHasMx = t.style.getPropertyValue('--mx-lns');
      const attr = t.getAttribute('lines');
      t.remove();
      return { hasMx, afterHasMx, attr };
    });
    assert.equal(result.hasMx, '3', `con lines=3, --mx-lns debe ser '3'`);
    assert.equal(result.afterHasMx, '', `con lines=0, --mx-lns debe limpiarse`);
    assert.equal(result.attr, null, 'lines=0 debe quitar el atributo');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('text', failures === 0, { total: tests.length, failures });
