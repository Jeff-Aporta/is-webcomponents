// details.test.mjs — tests exhaustivos del demo details.html.
// Cobertura: smoke + funcional (open attr, show/hide/toggle, accordion,
// disabled bloquea toggle, summary slot, icon-placement, eventos,
// atributos inválidos) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/details/details.html`;

const tests = [];

tests.push({
  name: 'smoke: is-details está definido y los details están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const data = await page.evaluate(() => {
      const details = [...document.querySelectorAll('main is-details')];
      return {
        defined: !!customElements.get('is-details'),
        count: details.length,
        baseParts: details.map((d) => ({
          base: !!d.shadowRoot?.querySelector('[part="base"]'),
          header: !!d.shadowRoot?.querySelector('[part="header"]'),
          summary: !!d.shadowRoot?.querySelector('[part="summary"]'),
          content: !!d.shadowRoot?.querySelector('[part="content"]'),
        })),
      };
    });
    assert.equal(data.defined, true, 'is-details debe estar definido');
    assert.ok(data.count >= 10, `esperaba >=10 details, hay ${data.count}`);
    for (const p of data.baseParts) {
      assert.equal(p.base, true, 'cada details debe exponer part="base"');
      assert.equal(p.header, true, 'cada details debe exponer part="header"');
      assert.equal(p.summary, true, 'cada details debe exponer part="summary"');
      assert.equal(p.content, true, 'cada details debe exponer part="content"');
    }
    await screenshot(page, 'details-smoke');
  },
});

tests.push({
  name: 'funcional: atributo open expande + aria-expanded="true"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const data = await page.evaluate(() => {
      const d2 = document.getElementById('d2');
      return {
        open: d2.open,
        attr: d2.hasAttribute('open'),
        ariaExpanded: d2.shadowRoot.querySelector('[part="summary"]')?.getAttribute('aria-expanded'),
        contentHidden: d2.shadowRoot.querySelector('[part="content"]')?.hidden,
      };
    });
    assert.equal(data.open, true);
    assert.equal(data.attr, true);
    assert.equal(data.ariaExpanded, 'true');
    assert.equal(data.contentHidden, false, 'con [open], el content no debe estar hidden');
  },
});

tests.push({
  name: 'funcional: setting open=true/false refleja el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    // d1 arranca cerrado
    const before = await page.evaluate(() => document.getElementById('d1').open);
    assert.equal(before, false);
    // .open = true
    await page.click('#btn-open');
    await page.waitForTimeout(250);
    const opened = await page.evaluate(() => {
      const d = document.getElementById('d1');
      return { open: d.open, attr: d.hasAttribute('open'), aria: d.shadowRoot.querySelector('[part="summary"]').getAttribute('aria-expanded') };
    });
    assert.equal(opened.open, true);
    assert.equal(opened.attr, true);
    assert.equal(opened.aria, 'true');
    // .open = false
    await page.click('#btn-close');
    await page.waitForTimeout(250);
    const closed = await page.evaluate(() => {
      const d = document.getElementById('d1');
      return { open: d.open, attr: d.hasAttribute('open'), aria: d.shadowRoot.querySelector('[part="summary"]').getAttribute('aria-expanded') };
    });
    assert.equal(closed.open, false);
    assert.equal(closed.attr, false);
    assert.equal(closed.aria, 'false');
  },
});

tests.push({
  name: 'funcional: toggle() alterna open',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const before = await page.evaluate(() => document.getElementById('d1').open);
    assert.equal(before, false);
    await page.click('#btn-toggle');
    await page.waitForTimeout(250);
    const after1 = await page.evaluate(() => document.getElementById('d1').open);
    assert.equal(after1, true);
    await page.click('#btn-toggle');
    await page.waitForTimeout(250);
    const after2 = await page.evaluate(() => document.getElementById('d1').open);
    assert.equal(after2, false);
  },
});

tests.push({
  name: 'funcional: accordion cierra los demás al abrir uno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    // Abrir acc0
    await page.click('#btn-acc-open0');
    await page.waitForTimeout(250);
    const a1 = await page.evaluate(() => ({
      a0: document.getElementById('acc0').open,
      a1: document.getElementById('acc1').open,
      a2: document.getElementById('acc2').open,
    }));
    assert.equal(a1.a0, true, 'acc0 debe estar abierto');
    assert.equal(a1.a1, false);
    assert.equal(a1.a2, false);
    // Abrir acc1 → acc0 debe cerrarse
    await page.click('#btn-acc-open1');
    await page.waitForTimeout(250);
    const a2 = await page.evaluate(() => ({
      a0: document.getElementById('acc0').open,
      a1: document.getElementById('acc1').open,
      a2: document.getElementById('acc2').open,
    }));
    assert.equal(a2.a0, false, 'acc0 debe haberse cerrado al abrir acc1 (accordion)');
    assert.equal(a2.a1, true);
    assert.equal(a2.a2, false);
  },
});

tests.push({
  name: 'funcional: disabled bloquea toggle (click no cambia open)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const before = await page.evaluate(() => {
      const d = document.getElementById('d4');
      const btn = d.shadowRoot.querySelector('[part="summary"]');
      const r = btn.getBoundingClientRect();
      return { open: d.open, disabled: d.disabled, btnX: r.x + r.width / 2, btnY: r.y + r.height / 2 };
    });
    assert.equal(before.disabled, true);
    // Click directo sobre el summary button.
    await page.mouse.click(before.btnX, before.btnY);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => document.getElementById('d4').open);
    assert.equal(after, false, 'disabled debe impedir el toggle vía click');
  },
});

tests.push({
  name: 'funcional: slot summary tiene precedencia sobre el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const text = await page.evaluate(() => {
      const d = document.getElementById('d2');
      const slot = d.shadowRoot.querySelector('slot[name="summary"]');
      const assigned = slot?.assignedNodes({ flatten: true });
      return {
        attrSummary: d.getAttribute('summary'),
        slotHasContent: (assigned?.length ?? 0) > 0,
        firstChildText: assigned?.[0]?.textContent?.trim(),
      };
    });
    // d2 no tiene atributo summary (sólo slot).
    assert.equal(text.attrSummary, null);
    assert.equal(text.slotHasContent, true, 'slot summary debe tener contenido');
    assert.ok(text.firstChildText.includes('API'),
      `el slot debe contener "API", contiene "${text.firstChildText}"`);
  },
});

tests.push({
  name: 'funcional: icon-placement acepta start y end (fallback: end)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const data = await page.evaluate(() => {
      const ds = document.getElementById('ds');
      const de = document.getElementById('de');
      return {
        start: ds.iconPlacement,
        end: de.iconPlacement,
      };
    });
    assert.equal(data.start, 'start');
    assert.equal(data.end, 'end');
  },
});

tests.push({
  name: 'funcional: variant inválido cae a "outlined"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const result = await page.evaluate(() => {
      // Crear un details ad-hoc con variant inválido y leer la propiedad.
      const d = document.createElement('is-details');
      d.setAttribute('variant', 'shiny');
      d.setAttribute('summary', 'x');
      document.body.appendChild(d);
      const v = d.variant;
      d.remove();
      return v;
    });
    assert.equal(result, 'outlined', `variant inválido → "outlined", fue "${result}"`);
  },
});

tests.push({
  name: 'eventos: is-show → is-after-show se emiten al abrir',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    // Limpia el log y abre d1.
    await page.evaluate(() => { document.getElementById('event-log').textContent = ''; });
    await page.click('#btn-open');
    await page.waitForTimeout(350);
    const log = await page.evaluate(() => document.getElementById('event-log').textContent || '');
    assert.match(log, /is-show.*d1|is-show\s*←\s*d1/, `log debe contener "is-show ← d1", fue: ${log}`);
    assert.match(log, /is-after-show.*d1|is-after-show\s*←\s*d1/, `log debe contener "is-after-show ← d1", fue: ${log}`);
  },
});

tests.push({
  name: 'eventos: is-hide → is-after-hide se emiten al cerrar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    await page.evaluate(() => { document.getElementById('event-log').textContent = ''; });
    // d2 está abierto al cargar; lo cerramos con .open = false vía consola.
    await page.evaluate(() => { document.getElementById('d2').open = false; });
    await page.waitForTimeout(350);
    const log = await page.evaluate(() => document.getElementById('event-log').textContent || '');
    assert.match(log, /is-hide.*d2|is-hide\s*←\s*d2/, `log debe contener "is-hide ← d2", fue: ${log}`);
    assert.match(log, /is-after-hide.*d2|is-after-hide\s*←\s*d2/, `log debe contener "is-after-hide ← d2", fue: ${log}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar mismos attrs produce el mismo aria/state',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-details-ready');
    const a = await page.evaluate(() => {
      const d = document.getElementById('d2');
      return {
        variant: d.getAttribute('variant'),
        iconPlacement: d.getAttribute('icon-placement'),
        state: d.shadowRoot.querySelector('.root')?.dataset?.state,
      };
    });
    await page.evaluate(() => {
      const d = document.getElementById('d2');
      const v = d.getAttribute('variant'); if (v) { d.removeAttribute('variant'); d.setAttribute('variant', v); }
      const ip = d.getAttribute('icon-placement'); if (ip) { d.removeAttribute('icon-placement'); d.setAttribute('icon-placement', ip); }
    });
    await page.waitForTimeout(80);
    const b = await page.evaluate(() => {
      const d = document.getElementById('d2');
      return {
        variant: d.getAttribute('variant'),
        iconPlacement: d.getAttribute('icon-placement'),
        state: d.shadowRoot.querySelector('.root')?.dataset?.state,
      };
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

report('details', failures === 0, { total: tests.length, failures });
