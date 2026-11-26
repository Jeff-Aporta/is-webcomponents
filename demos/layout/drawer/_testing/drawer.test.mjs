// @contexto INDICE.md · demos/README.md
// drawer.test.mjs — tests exhaustivos del demo drawer.html.
// Cobertura: smoke + funcional (placement start/end/top/bottom,
// show/hide/Escape/light-dismiss/data-drawer="close"/focus restore,
// without-header, placement inválido) + eventos + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/drawer/drawer.html`;

const tests = [];

tests.push({
  name: 'smoke: iswc-drawer está definido y los 5 drawers están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    const data = await page.evaluate(() => {
      const drawers = [...document.querySelectorAll('body > iswc-drawer')];
      return {
        defined: !!customElements.get('iswc-drawer'),
        count: drawers.length,
        parts: drawers.map((d) => {
          const sr = d.shadowRoot;
          return {
            backdrop: !!sr?.querySelector('[part="backdrop"]'),
            drawer: !!sr?.querySelector('[part="drawer"]'),
            header: !!sr?.querySelector('[part="header"]'),
            close: !!sr?.querySelector('[part="close-button"]'),
            body: !!sr?.querySelector('[part="body"]'),
            footer: !!sr?.querySelector('[part="footer"]'),
          };
        }),
      };
    });
    assert.equal(data.defined, true, 'iswc-drawer debe estar definido');
    assert.equal(data.count, 5, `esperaba 5 drawers, hay ${data.count}`);
    for (const p of data.parts) {
      assert.equal(p.backdrop, true, 'part="backdrop" obligatorio');
      assert.equal(p.drawer, true, 'part="drawer" obligatorio');
      assert.equal(p.header, true, 'part="header" obligatorio');
      assert.equal(p.close, true, 'part="close-button" obligatorio');
      assert.equal(p.body, true, 'part="body" obligatorio');
      assert.equal(p.footer, true, 'part="footer" obligatorio');
    }
    await screenshot(page, 'drawer-smoke');
  },
});

tests.push({
  name: 'funcional: placement end (default) refleja la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    const data = await page.evaluate(() => ({
      end: document.getElementById('d-end').placement,
      start: document.getElementById('d-start').placement,
      top: document.getElementById('d-top').placement,
      bottom: document.getElementById('d-bottom').placement,
    }));
    assert.equal(data.end, 'end');
    assert.equal(data.start, 'start');
    assert.equal(data.top, 'top');
    assert.equal(data.bottom, 'bottom');
  },
});

tests.push({
  name: 'funcional: placement inválido cae a "end"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    const v = await page.evaluate(() => {
      const d = document.createElement('iswc-drawer');
      d.setAttribute('placement', 'diagonal');
      document.body.appendChild(d);
      const r = d.placement;
      d.remove();
      return r;
    });
    assert.equal(v, 'end');
  },
});

tests.push({
  name: 'funcional: show() abre el drawer y refleja data-state="open"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    const before = await page.evaluate(() => document.getElementById('d-end').open);
    assert.equal(before, false);
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      open: document.getElementById('d-end').open,
      state: document.getElementById('d-end').dataset.state,
    }));
    assert.equal(after.open, true);
    assert.equal(after.state, 'open', `data-state="open" tras animación, fue "${after.state}"`);
  },
});

tests.push({
  name: 'a11y: Escape cierra el drawer',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const opened = await page.evaluate(() => document.getElementById('d-end').open);
    assert.equal(opened, true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => document.getElementById('d-end').open);
    assert.equal(closed, false);
  },
});

tests.push({
  name: 'a11y: foco entra al autofocus (input) al abrir',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const focused = await page.evaluate(() => {
      const ae = document.activeElement;
      return { tag: ae?.tagName, id: ae?.id, inDrawer: !!ae.closest?.('iswc-drawer') };
    });
    assert.equal(focused.id, 'd-end-input', `autofocus debe apuntar a #d-end-input, fue "${focused.id}"`);
    assert.ok(focused.inDrawer, 'foco debe estar dentro del drawer');
  },
});

tests.push({
  name: 'a11y: foco vuelve al opener al cerrar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.focus('#btn-end');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const restored = await page.evaluate(() => document.activeElement?.id);
    assert.equal(restored, 'btn-end', `foco debe volver a #btn-end, fue "${restored}"`);
  },
});

tests.push({
  name: 'funcional: light-dismiss cierra al hacer click en el backdrop',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const opened = await page.evaluate(() => document.getElementById('d-end').open);
    assert.equal(opened, true);
    await page.mouse.click(20, 20);
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => document.getElementById('d-end').open);
    assert.equal(closed, false, 'light-dismiss debe cerrar el drawer');
  },
});

tests.push({
  name: 'funcional: click en [data-drawer="close"] cierra',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      // El botón OK está en el light DOM dentro del slot footer.
      const drawer = document.getElementById('d-end');
      drawer.querySelector('[data-drawer="close"]').click();
    });
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => document.getElementById('d-end').open);
    assert.equal(closed, false);
  },
});

tests.push({
  name: 'focus trap: Tab mantiene el foco dentro del drawer',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const tags = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const ae = await page.evaluate(() => {
        const a = document.activeElement;
        return { id: a?.id, tag: a?.tagName, inDrawer: !!a.closest?.('iswc-drawer') };
      });
      tags.push(ae);
    }
    for (const t of tags) {
      assert.ok(t && t.inDrawer, `Tab debe mantener foco dentro del drawer, fue ${JSON.stringify(t)}`);
    }
  },
});

tests.push({
  name: 'funcional: without-header oculta el header',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-noheader');
    await page.waitForTimeout(400);
    const data = await page.evaluate(() => {
      const d = document.getElementById('d-noheader');
      const sr = d.shadowRoot;
      return {
        headerHidden: sr.querySelector('[part="header"]')?.hidden,
        bodyExists: !!sr.querySelector('[part="body"]'),
      };
    });
    assert.equal(data.headerHidden, true, 'header debe estar hidden con without-header');
    assert.equal(data.bodyExists, true, 'body debe seguir visible');
  },
});

tests.push({
  name: 'eventos: iswc-show → iswc-after-show → iswc-hide → iswc-after-hide',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.evaluate(() => { document.getElementById('log').textContent = ''; });
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const log = await page.evaluate(() => document.getElementById('log').textContent || '');
    assert.match(log, /iswc-show\s*←\s*d-end/, `debe emitir iswc-show ← d-end, log:\n${log}`);
    assert.match(log, /iswc-after-show\s*←\s*d-end/, `debe emitir iswc-after-show ← d-end, log:\n${log}`);
    assert.match(log, /iswc-hide\s*←\s*d-end/, `debe emitir iswc-hide ← d-end, log:\n${log}`);
    assert.match(log, /iswc-after-hide\s*←\s*d-end/, `debe emitir iswc-after-hide ← d-end, log:\n${log}`);
  },
});

tests.push({
  name: 'determinismo: cambiar placement en caliente se refleja sin reset',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    const result = await page.evaluate(() => {
      const d = document.getElementById('d-end');
      d.placement = 'start';
      const after = d.placement;
      d.placement = 'end';
      const back = d.placement;
      return { after, back };
    });
    assert.equal(result.after, 'start');
    assert.equal(result.back, 'end');
  },
});

tests.push({
  name: 'funcional: size del atributo fija el ancho del panel',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-start');
    await page.waitForTimeout(400);
    const data = await page.evaluate(() => {
      const d = document.getElementById('d-start');
      return {
        ancho: d.shadowRoot.querySelector('[part="drawer"]').getBoundingClientRect().width,
        ventana: window.innerWidth,
      };
    });
    assert.ok(Math.abs(data.ancho - data.ventana * 0.8) < 3, `80vw esperado, fue ${data.ancho} de ${data.ventana}`);
  },
});

tests.push({
  name: 'funcional: resize muestra el tirador, mueve el ancho con el teclado y lo recuerda',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-start');
    await page.waitForTimeout(400);
    const antes = await page.evaluate(() => {
      const d = document.getElementById('d-start');
      const tirador = d.shadowRoot.querySelector('[part="resize-handle"]');
      tirador.focus();
      return {
        visible: !tirador.hidden,
        ancho: d.shadowRoot.querySelector('[part="drawer"]').getBoundingClientRect().width,
      };
    });
    assert.equal(antes.visible, true, 'el tirador debe verse con resize');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const despues = await page.evaluate(() => {
      const d = document.getElementById('d-start');
      return {
        ancho: d.shadowRoot.querySelector('[part="drawer"]').getBoundingClientRect().width,
        recordado: Number(localStorage.getItem('demo-drawer-ancho')),
        valuenow: Number(d.shadowRoot.querySelector('[part="resize-handle"]').getAttribute('aria-valuenow')),
      };
    });
    assert.ok(despues.ancho > antes.ancho + 20, `ArrowRight debe ensanchar: ${antes.ancho} → ${despues.ancho}`);
    assert.equal(despues.recordado, Math.round(despues.ancho), 'storage-key debe recordar el ancho');
    assert.equal(despues.valuenow, Math.round(despues.ancho), 'el tirador anuncia su ancho');
  },
});

tests.push({
  name: 'funcional: closable=false esconde el boton de cerrar y el header sigue',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-top');
    await page.waitForTimeout(400);
    const data = await page.evaluate(() => {
      const d = document.getElementById('d-top');
      const sr = d.shadowRoot;
      return {
        xOculta: sr.querySelector('[part="close-button"]').hidden,
        headerVisible: !sr.querySelector('[part="header"]').hidden,
      };
    });
    assert.equal(data.xOculta, true, 'closable=false debe esconder la X');
    assert.equal(data.headerVisible, true, 'el header sigue visible');
  },
});

tests.push({
  name: 'a11y: role=dialog, aria-modal y aria-labelledby al titulo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const data = await page.evaluate(() => {
      const d = document.getElementById('d-end');
      const caja = d.shadowRoot.querySelector('[part="drawer"]');
      const id = caja.getAttribute('aria-labelledby');
      const titulo = id ? d.shadowRoot.getElementById(id) : null;
      return {
        role: caja.getAttribute('role'),
        ariaModal: caja.getAttribute('aria-modal'),
        texto: titulo?.textContent?.trim() ?? '',
      };
    });
    assert.equal(data.role, 'dialog');
    assert.equal(data.ariaModal, 'true');
    assert.equal(data.texto, 'Drawer end (default)', 'aria-labelledby debe nombrar la caja con el titulo');
  },
});

tests.push({
  name: 'a11y: el scroll del documento queda bloqueado mientras esta abierto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-drawer-ready');
    const antes = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const abierto = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const cerrado = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    assert.notEqual(abierto, antes, 'abierto debe bloquear el scroll del documento');
    assert.equal(cerrado, antes, 'al cerrar se restaura el overflow del documento');
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

report('drawer', failures === 0, { total: tests.length, failures });
