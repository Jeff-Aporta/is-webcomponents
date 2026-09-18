// card.test.mjs — tests exhaustivos del demo card.html.
// Cobertura: smoke + funcional (variants, orientation, slots vacíos se
// ocultan, fallbacks) + determinismo + CSS Parts.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/card/card.html`;

const tests = [];

tests.push({
  name: 'smoke: is-card está definido y los 3 cards verticales están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    const data = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#vertical-all is-card')];
      return {
        defined: !!customElements.get('is-card'),
        count: cards.length,
        details: cards.map((c) => {
          const sr = c.shadowRoot;
          return {
            hasBase: !!sr?.querySelector('[part="base"], .layout'),
            hasMedia: !!sr?.querySelector('[part="media"]'),
            hasHeader: !!sr?.querySelector('[part="header"]'),
            hasBody: !!sr?.querySelector('[part="body"]'),
            hasFooter: !!sr?.querySelector('[part="footer"]'),
            hasActions: !!sr?.querySelector('[part="actions"]'),
            mediaEmpty: sr?.querySelector('[part="media"]')?.classList.contains('is-empty'),
            headerEmpty: sr?.querySelector('[part="header"]')?.classList.contains('is-empty'),
            footerEmpty: sr?.querySelector('[part="footer"]')?.classList.contains('is-empty'),
          };
        }),
      };
    });
    assert.equal(data.defined, true, 'is-card debe estar definido');
    assert.equal(data.count, 3, `esperaba 3 cards verticales, hay ${data.count}`);
    // card 0: con media + header + footer → no vacíos
    assert.equal(data.details[0].mediaEmpty, false, 'card[0].media no debe estar vacío');
    assert.equal(data.details[0].headerEmpty, false, 'card[0].header no debe estar vacío');
    assert.equal(data.details[0].footerEmpty, false, 'card[0].footer no debe estar vacío');
    // card 2: sólo body → media/header/footer vacíos
    assert.equal(data.details[2].mediaEmpty, true, 'card[2].media debe estar vacío');
    assert.equal(data.details[2].headerEmpty, true, 'card[2].header debe estar vacío');
    assert.equal(data.details[2].footerEmpty, true, 'card[2].footer debe estar vacío');
    await screenshot(page, 'card-smoke');
  },
});

tests.push({
  name: 'funcional: 5 variants están expuestos como atributos válidos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    const data = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#variants is-card')];
      return cards.map((c) => ({
        attr: c.getAttribute('variant'),
        prop: c.variant,
      }));
    });
    assert.equal(data.length, 5, `esperaba 5 variants, hay ${data.length}`);
    for (const d of data) {
      assert.equal(d.attr, d.prop, `attr(${d.attr}) debe coincidir con prop(${d.prop})`);
      assert.ok(['accent', 'filled', 'outlined', 'filled-outlined', 'plain'].includes(d.attr));
    }
  },
});

tests.push({
  name: 'funcional: orientación horizontal pone media/actions a los lados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    const data = await page.evaluate(() => {
      const card = document.querySelector('#horizontal-host is-card');
      const sr = card.shadowRoot;
      const mediaRect = sr.querySelector('[part="media"]')?.getBoundingClientRect();
      const actionsRect = sr.querySelector('[part="actions"]')?.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return {
        orientation: card.getAttribute('orientation'),
        hasMedia: !!mediaRect,
        hasActions: !!actionsRect,
        mediaLeft: mediaRect?.x ?? 0,
        actionsLeft: actionsRect?.x ?? 0,
        cardLeft: cardRect.x,
        cardRight: cardRect.x + cardRect.width,
        actionsAtRightEdge: actionsRect ? Math.abs((actionsRect.x + actionsRect.width) - cardRect.x + cardRect.width > 0) : false,
      };
    });
    assert.equal(data.orientation, 'horizontal', 'orientación debe ser horizontal');
    assert.ok(data.hasMedia, 'la slot media debe tener rect');
    assert.ok(data.hasActions, 'la slot actions debe tener rect');
    // En horizontal, media debe estar antes que actions (izquierda → derecha)
    assert.ok(data.mediaLeft < data.actionsLeft,
      `media(${data.mediaLeft}) debe estar a la izquierda de actions(${data.actionsLeft})`);
  },
});

tests.push({
  name: 'funcional: cambiar variant en caliente refleja el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    const before = await page.evaluate(() => document.getElementById('interactive').variant);
    assert.equal(before, 'filled-outlined');
    await page.click('#btn-variant');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => document.getElementById('interactive').variant);
    assert.notEqual(after, before, `variant cycled: ${before} → ${after}`);
    assert.ok(['accent', 'filled', 'outlined', 'filled-outlined', 'plain'].includes(after));
  },
});

tests.push({
  name: 'funcional: cambiar orientation togglea vertical/horizontal',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    const before = await page.evaluate(() => document.getElementById('interactive').orientation);
    assert.equal(before, 'vertical');
    await page.click('#btn-orientation');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => document.getElementById('interactive').orientation);
    assert.equal(after, 'horizontal');
    await page.click('#btn-orientation');
    await page.waitForTimeout(50);
    const final = await page.evaluate(() => document.getElementById('interactive').orientation);
    assert.equal(final, 'vertical');
  },
});

tests.push({
  name: 'funcional: atributos inválidos caen al fallback documentado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    await page.click('#btn-bad');
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => {
      const c = document.getElementById('interactive');
      return { variant: c.variant, orientation: c.orientation };
    });
    assert.equal(result.variant, 'outlined', `variant inválido → "outlined", fue "${result.variant}"`);
    assert.equal(result.orientation, 'vertical', `orientation inválido → "vertical", fue "${result.orientation}"`);
  },
});

tests.push({
  name: 'smoke: cada card expone las CSS Parts documentadas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    const parts = await page.evaluate(() => {
      const card = document.querySelector('main is-card');
      const sr = card.shadowRoot;
      return {
        media: !!sr.querySelector('[part="media"]'),
        header: !!sr.querySelector('[part="header"]'),
        body: !!sr.querySelector('[part="body"]'),
        footer: !!sr.querySelector('[part="footer"]'),
        actions: !!sr.querySelector('[part="actions"]'),
      };
    });
    assert.equal(parts.media, true, 'part="media"');
    assert.equal(parts.header, true, 'part="header"');
    assert.equal(parts.body, true, 'part="body"');
    assert.equal(parts.footer, true, 'part="footer"');
    assert.equal(parts.actions, true, 'part="actions"');
  },
});

tests.push({
  name: 'determinismo: re-asignar mismos attrs produce el mismo DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-card-ready');
    await page.waitForTimeout(100);
    const snap = (sel) => sel ? [...document.querySelectorAll(sel)].map((c) => ({
      v: c.getAttribute('variant'),
      o: c.getAttribute('orientation'),
      parts: [...c.shadowRoot.querySelectorAll('[part]')].map((p) => p.getAttribute('part') + ':' + (p.classList.contains('is-empty') ? 'empty' : 'filled')),
    })) : [];
    const a = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('main is-card')];
      return cards.map((c) => ({
        v: c.getAttribute('variant'),
        o: c.getAttribute('orientation'),
        empty: [...c.shadowRoot.querySelectorAll('[part]')].map((p) => p.getAttribute('part') + ':' + p.classList.contains('is-empty')),
      }));
    });
    await page.evaluate(() => {
      document.querySelectorAll('main is-card').forEach((c) => {
        const v = c.getAttribute('variant'); if (v) { c.removeAttribute('variant'); c.setAttribute('variant', v); }
        const o = c.getAttribute('orientation'); if (o) { c.removeAttribute('orientation'); c.setAttribute('orientation', o); }
      });
    });
    await page.waitForTimeout(100);
    const b = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('main is-card')];
      return cards.map((c) => ({
        v: c.getAttribute('variant'),
        o: c.getAttribute('orientation'),
        empty: [...c.shadowRoot.querySelectorAll('[part]')].map((p) => p.getAttribute('part') + ':' + p.classList.contains('is-empty')),
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

report('card', failures === 0, { total: tests.length, failures });
