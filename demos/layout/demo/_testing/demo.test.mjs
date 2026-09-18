// demo.test.mjs — tests exhaustivos del demo demo.html.
// Cobertura: smoke (light DOM, clase .demo automática) + funcional
// (heading se sincroniza, removal, evento is-demo-connected).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/demo/demo.html`;

const tests = [];

tests.push({
  name: 'smoke: is-demo está definido y los 4 demos están conectados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    const data = await page.evaluate(() => {
      const demos = [...document.querySelectorAll('main is-demo')];
      return {
        defined: !!customElements.get('is-demo'),
        count: demos.length,
        classes: demos.map((d) => [...d.classList]),
        lightDomText: demos.map((d) => (d.textContent ?? '').trim()),
        // <is-demo> NO usa shadow DOM — el contenido vive en light DOM.
        shadowRoot: demos.map((d) => d.shadowRoot !== null),
      };
    });
    assert.equal(data.defined, true, 'is-demo debe estar definido');
    assert.equal(data.count, 4, `esperaba 4 is-demo, hay ${data.count}`);
    // Cada uno debe tener la clase "demo" auto-aplicada en connectedCallback.
    for (const cls of data.classes) {
      assert.ok(cls.includes('demo'), `cada is-demo debe tener la clase "demo", tiene [${cls.join(',')}]`);
    }
    // El primer demo debe tener además la clase with-heading aplicada por el script.
    assert.ok(data.classes[0].includes('with-heading'),
      `demo[0] debe tener la clase "with-heading" puesta por el usuario`);
    // <is-demo> es light DOM: shadowRoot debe ser null en todos.
    assert.equal(data.shadowRoot.every((s) => s === false), true,
      'is-demo debe ser light DOM (shadowRoot=null) para que el extractor de código vea el markup real');
    await screenshot(page, 'demo-smoke');
  },
});

tests.push({
  name: 'funcional: heading inicial crea un <p class="demo__heading">',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    const data = await page.evaluate(() => {
      const d = document.getElementById('d1');
      const heading = d.querySelector(':scope > .demo__heading');
      return {
        attr: d.getAttribute('heading'),
        hasHeadingEl: !!heading,
        headingText: heading?.textContent?.trim(),
        headingIsFirstChild: d.firstElementChild === heading,
      };
    });
    assert.equal(data.attr, 'Botones primarios');
    assert.equal(data.hasHeadingEl, true, 'demo con heading debe tener un <p class="demo__heading">');
    assert.equal(data.headingText, 'Botones primarios');
    assert.equal(data.headingIsFirstChild, true, 'el heading debe ser el primer hijo');
  },
});

tests.push({
  name: 'funcional: demo sin heading no crea el <p>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    const hasHeading = await page.evaluate(() => {
      const d = document.getElementById('d2');
      return !!d.querySelector(':scope > .demo__heading');
    });
    assert.equal(hasHeading, false, 'demo sin heading no debe crear el <p class="demo__heading">');
  },
});

tests.push({
  name: 'funcional: cambiar heading en caliente reescribe el <p>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    const before = await page.evaluate(() => {
      const d = document.getElementById('d3');
      return d.querySelector(':scope > .demo__heading')?.textContent?.trim();
    });
    assert.equal(before, 'Heading inicial');
    await page.click('#btn-heading');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const d = document.getElementById('d3');
      return {
        text: d.querySelector(':scope > .demo__heading')?.textContent?.trim(),
        attr: d.getAttribute('heading'),
      };
    });
    assert.ok(after.text && after.text.startsWith('Heading '),
      `heading reescrito: "${after.text}"`);
    assert.equal(after.text, after.attr, 'texto del <p> debe coincidir con el atributo');
  },
});

tests.push({
  name: 'funcional: removeAttribute("heading") elimina el <p>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    await page.click('#btn-clear');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const d = document.getElementById('d3');
      return {
        attr: d.getAttribute('heading'),
        hasHeadingEl: !!d.querySelector(':scope > .demo__heading'),
      };
    });
    assert.equal(after.attr, null, 'el atributo heading debe estar ausente');
    assert.equal(after.hasHeadingEl, false, 'el <p class="demo__heading"> debe haber sido removido');
  },
});

tests.push({
  name: 'evento: is-demo-connected se emite al conectar (>= 4 emisiones)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    const count = await page.evaluate(() => window.__demoConnectedFired ?? 0);
    assert.ok(count >= 4, `esperaba >=4 emisiones de is-demo-connected (una por demo conectado), hay ${count}`);
  },
});

tests.push({
  name: 'determinismo: heading sincroniza attr <-> texto de forma idempotente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-demo-ready');
    const before = await page.evaluate(() => ({
      attr: document.getElementById('d1').getAttribute('heading'),
      text: document.getElementById('d1').querySelector(':scope > .demo__heading')?.textContent?.trim(),
    }));
    // Re-set del mismo heading.
    await page.evaluate(() => {
      const d = document.getElementById('d1');
      const v = d.getAttribute('heading');
      d.removeAttribute('heading'); d.setAttribute('heading', v);
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => ({
      attr: document.getElementById('d1').getAttribute('heading'),
      text: document.getElementById('d1').querySelector(':scope > .demo__heading')?.textContent?.trim(),
    }));
    assert.deepEqual(before, after, 're-asignar mismo heading produce el mismo estado');
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

report('demo', failures === 0, { total: tests.length, failures });
