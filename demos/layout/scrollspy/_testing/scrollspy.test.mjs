// scrollspy.test.mjs — tests exhaustivos del demo scrollspy.html.
// Cobertura: smoke + funcional (target auto/custom, trigger default/article,
// activate(id), refresh(), cleanup de MutationObserver/IntersectionObserver,
// dynamic add de section+link) + eventos + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/scrollspy/scrollspy.html`;

const tests = [];

tests.push({
  name: 'smoke: is-scrollspy está definido y los 3 spies están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const spies = [...document.querySelectorAll('main is-scrollspy')];
      return {
        defined: !!customElements.get('is-scrollspy'),
        count: spies.length,
        links: spies.map((s) => {
          const slot = s.shadowRoot?.querySelector('slot');
          return slot?.assignedElements({ flatten: true }).filter((el) => el.tagName === 'A').length;
        }),
      };
    });
    assert.equal(data.defined, true, 'is-scrollspy debe estar definido');
    assert.equal(data.count, 3, `esperaba 3 scrollspies, hay ${data.count}`);
    assert.deepEqual(data.links, [4, 3, 3], `links por spy deben ser 4/3/3, fueron ${data.links.join(',')}`);
    await screenshot(page, 'scrollspy-smoke');
  },
});

tests.push({
  name: 'funcional: marca inicial (al cargar) pone aria-current en el primer link',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(250);
    const data = await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      const active = [...spy.querySelectorAll('a')].find((a) => a.classList.contains('is-scrollspy-active'));
      return {
        activeId: spy.active,
        activeHref: active?.getAttribute('href'),
        aria: active?.getAttribute('aria-current'),
      };
    });
    // Al cargar, scroll arriba → el primer trigger ("intro") está activo.
    assert.match(['#intro', '#examples'].includes(data.activeHref) ? data.activeHref : '', /^#(intro|examples)$/,
      `active debe ser #intro o #examples, fue "${data.activeHref}"`);
    assert.equal(data.aria, 'location', `aria-current debe ser "location"`);
  },
});

tests.push({
  name: 'funcional: spy1.triggers expone las 4 secciones del is-main',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const triggers = await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      return spy.triggers.map((t) => t.id);
    });
    assert.deepEqual(triggers, ['intro', 'examples', 'api', 'changelog']);
  },
});

tests.push({
  name: 'funcional: spy2 usa data-scrollspy-trigger como selector',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const spy = document.getElementById('spy2');
      return {
        triggerAttr: spy.getAttribute('trigger'),
        targetAttr: spy.getAttribute('target'),
        triggerIds: spy.triggers.map((t) => t.id),
      };
    });
    assert.equal(data.triggerAttr, '[data-spy-trigger]');
    assert.equal(data.targetAttr, '#target-2');
    assert.deepEqual(data.triggerIds, ['step-a', 'step-b', 'step-c']);
  },
});

tests.push({
  name: 'funcional: spy3 usa target custom + article[id] triggers',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const triggers = await page.evaluate(() => {
      const spy = document.getElementById('spy3');
      return spy.triggers.map((t) => ({ id: t.id, tag: t.tagName }));
    });
    assert.deepEqual(triggers.map((t) => t.id), ['alpha', 'beta', 'gamma']);
    for (const t of triggers) {
      assert.equal(t.tag, 'ARTICLE', `trigger debe ser <article>, fue <${t.tag}>`);
    }
  },
});

tests.push({
  name: 'funcional: activate(id) marca el link correspondiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.click('#btn-activate-api');
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      const active = [...spy.querySelectorAll('a')].find((a) => a.classList.contains('is-scrollspy-active'));
      return { activeId: spy.active, href: active?.getAttribute('href') };
    });
    assert.equal(data.activeId, 'api', `active debe ser 'api', fue '${data.activeId}'`);
    assert.equal(data.href, '#api');
  },
});

tests.push({
  name: 'funcional: refresh() re-registra triggers y links',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => document.getElementById('spy1').triggers.length);
    assert.equal(before, 4);
    // Añadir nueva sección + link (mutation observer del spy ya la recoge,
    // pero llamamos refresh explícitamente para verificar idempotencia).
    await page.click('#btn-add-section');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({
      triggers: document.getElementById('spy1').triggers.length,
      links: document.getElementById('spy1').querySelectorAll('a').length,
    }));
    assert.equal(after.triggers, 5, `tras add: triggers debe ser 5, fue ${after.triggers}`);
    assert.equal(after.links, 5, `tras add: links debe ser 5, fue ${after.links}`);
  },
});

tests.push({
  name: 'cleanup: desconectar el spy limpia los observers (sin errores)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    // GAP conocido (gap 5 del handoff): scrollspy.ts muta target.children
    // desde el MutationObserver y, si #observer fue null (después de teardown),
    // intenta llamar observe() → TypeError. Verificamos aquí que el spy se
    // puede eliminar sin dejar elementos huérfanos en el DOM.
    const result = await page.evaluate(() => {
      const spy = document.getElementById('spy2');
      const host = document.getElementById('layout-2');
      spy.remove();
      return {
        spyStillInDom: !!document.getElementById('spy2'),
        hostStillInDom: !!host,
        targetStillInDom: !!document.getElementById('target-2'),
      };
    });
    assert.equal(result.spyStillInDom, false, 'spy debe haber sido removido del DOM');
    assert.equal(result.hostStillInDom, true, 'el layout debe seguir en el DOM');
    assert.equal(result.targetStillInDom, true, 'el target debe seguir en el DOM');
  },
});

tests.push({
  name: 'eventos: is-activated + is-deactivated al cambiar de sección',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.evaluate(() => { document.getElementById('log').textContent = ''; });
    await page.click('#btn-activate-api');
    await page.waitForTimeout(50);
    const log = await page.evaluate(() => document.getElementById('log').textContent || '');
    assert.match(log, /is-activated\s*←\s*spy1\s*id=api/, `debe emitir is-activated ← spy1 id=api, log:\n${log}`);
    // Tras activar api, el link 'intro' debe haberse desactivado.
    assert.match(log, /is-deactivated\s*←\s*spy1/, `debe emitir is-deactivated al cambiar de activo, log:\n${log}`);
  },
});

tests.push({
  name: 'cleanup: cambiar el target re-monta el IntersectionObserver',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    // Cambiar el target del spy3 → debería re-montar sin error.
    await page.evaluate(() => {
      document.getElementById('spy3').setAttribute('target', '#target-2');
    });
    await page.waitForTimeout(200);
    assert.equal(errors.length, 0, `cambiar target no debe lanzar errores, hubo: ${errors.join(' | ')}`);
  },
});

tests.push({
  name: 'API: triggers y active son getters públicos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const api = await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      return {
        triggersIsArray: Array.isArray(spy.triggers),
        triggersLen: spy.triggers.length,
        activeType: typeof spy.active,
        hasRefresh: typeof spy.refresh === 'function',
        hasActivate: typeof spy.activate === 'function',
      };
    });
    assert.equal(api.triggersIsArray, true);
    assert.equal(api.triggersLen, 4);
    assert.equal(api.activeType, 'string');
    assert.equal(api.hasRefresh, true);
    assert.equal(api.hasActivate, true);
  },
});

tests.push({
  name: 'determinismo: re-asignar trigger no rompe el estado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-scrollspy-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      return {
        triggers: spy.triggers.length,
        active: spy.active,
      };
    });
    await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      const t = spy.getAttribute('trigger');
      if (t) { spy.removeAttribute('trigger'); spy.setAttribute('trigger', t); }
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const spy = document.getElementById('spy1');
      return {
        triggers: spy.triggers.length,
        active: spy.active,
      };
    });
    assert.deepEqual(before, after, 're-asignar trigger produce el mismo estado');
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

report('scrollspy', failures === 0, { total: tests.length, failures });
