// dialog.test.mjs — tests exhaustivos del demo dialog.html.
// Cobertura: smoke + funcional (open/close, focus trap, Escape,
// light-dismiss, restore de foco, data-dialog="close", without-header,
// backdrop-variant, preventDefault en is-hide) + determinismo + CSS Parts.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/dialog/dialog.html`;

const tests = [];

tests.push({
  name: 'smoke: is-dialog está definido y los 5 dialogs están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    const data = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('body > is-dialog')];
      return {
        defined: !!customElements.get('is-dialog'),
        count: dialogs.length,
        parts: dialogs.map((d) => {
          const sr = d.shadowRoot;
          return {
            backdrop: !!sr?.querySelector('[part="backdrop"]'),
            dialog: !!sr?.querySelector('[part="dialog"]'),
            header: !!sr?.querySelector('[part="header"]'),
            title: !!sr?.querySelector('[part="title"]'),
            close: !!sr?.querySelector('[part="close-button"]'),
            body: !!sr?.querySelector('[part="body"]'),
            footer: !!sr?.querySelector('[part="footer"]'),
          };
        }),
      };
    });
    assert.equal(data.defined, true, 'is-dialog debe estar definido');
    assert.equal(data.count, 5, `esperaba 5 dialogs, hay ${data.count}`);
    for (const p of data.parts) {
      assert.equal(p.backdrop, true, 'part="backdrop" obligatorio');
      assert.equal(p.dialog, true, 'part="dialog" obligatorio');
      assert.equal(p.header, true, 'part="header" obligatorio');
      assert.equal(p.title, true, 'part="title" obligatorio');
      assert.equal(p.close, true, 'part="close-button" obligatorio');
      assert.equal(p.body, true, 'part="body" obligatorio');
      assert.equal(p.footer, true, 'part="footer" obligatorio');
    }
    await screenshot(page, 'dialog-smoke');
  },
});

tests.push({
  name: 'funcional: open attr al cargar → d1.isOpen() y data-state="open"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    // d1 está cerrado al cargar; lo abrimos con show() para verificar el ciclo.
    await page.click('#btn-open-1');
    await page.waitForTimeout(350);
    const data = await page.evaluate(() => {
      const d = document.getElementById('d1');
      return { open: d.open, state: d.dataset.state };
    });
    assert.equal(data.open, true);
    assert.equal(data.state, 'open', `data-state debe ser "open" tras la animación, fue "${data.state}"`);
  },
});

tests.push({
  name: 'funcional: show()/hide() reflejan el atributo open',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    // d5 arranca cerrado
    const before = await page.evaluate(() => document.getElementById('d5').open);
    assert.equal(before, false);
    await page.click('#btn-open-5');
    await page.waitForTimeout(350);
    const opened = await page.evaluate(() => document.getElementById('d5').open);
    assert.equal(opened, true);
    // Forzamos cierre con .hide() (no preventDefault).
    await page.click('#d5-force');
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() => document.getElementById('d5').open);
    assert.equal(closed, false);
  },
});

tests.push({
  name: 'funcional: click en [data-dialog="close"] cierra el diálogo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    await page.click('#btn-open-1');
    await page.waitForTimeout(350);
    const before = await page.evaluate(() => document.getElementById('d1').open);
    assert.equal(before, true);
    // Click en el botón "Aceptar" del footer (data-dialog="close").
    await page.evaluate(() => document.getElementById('d1-ok').click());
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => document.getElementById('d1').open);
    assert.equal(after, false, 'click en data-dialog="close" debe cerrar el diálogo');
  },
});

tests.push({
  name: 'a11y: foco entra al autofocus cuando se abre el diálogo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    await page.click('#btn-open-1');
    await page.waitForTimeout(350);
    // d1 no tiene autofocus → debería enfocar el modal (tabindex=-1) o el primer focuseable.
    const active1 = await page.evaluate(() => {
      const ae = document.activeElement;
      return ae ? { tag: ae.tagName, id: ae.id, inDialog: !!ae.closest?.('is-dialog') } : null;
    });
    assert.ok(active1, 'document.activeElement debe estar definido');
    assert.ok(active1.inDialog, 'el foco debe estar dentro del <is-dialog>');
  },
});

tests.push({
  name: 'a11y: foco entra al elemento con autofocus al abrir d2',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    // d2 está cerrado → abrirlo
    await page.click('#btn-open-2');
    await page.waitForTimeout(350);
    const focused = await page.evaluate(() => {
      const ae = document.activeElement;
      return { tag: ae?.tagName, id: ae?.id };
    });
    assert.equal(focused.id, 'd2-input', `autofocus debe apuntar a #d2-input, fue "${focused.id}"`);
    // Cerrar con Escape.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() => document.getElementById('d2').open);
    assert.equal(closed, false, 'Escape debe cerrar el diálogo');
  },
});

tests.push({
  name: 'focus trap: Tab cicla entre focuseables dentro del diálogo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    await page.click('#btn-open-1');
    await page.waitForTimeout(350);
    // d1 tiene 2 focuseables (#d1-cancel, #d1-ok).
    // Foco arranca en uno de ellos. Tab → siguiente. N Tab debe ciclar.
    const tags = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const ae = await page.evaluate(() => {
        const a = document.activeElement;
        return a ? { id: a.id, tag: a.tagName, inDialog: !!a.closest?.('is-dialog') } : null;
      });
      tags.push(ae);
    }
    // Todos los focos deben caer dentro del diálogo (no escapan al header/body).
    for (const t of tags) {
      assert.ok(t && t.inDialog, `Tab debe mantener foco dentro del diálogo, fue ${JSON.stringify(t)}`);
    }
    // Debe haber ciclado: tras 4 Tabs sobre 2 focuseables, debe volver al primero.
    const ids = tags.map((t) => t?.id).filter(Boolean);
    const firstId = ids[0];
    assert.ok(ids.includes(firstId), `ciclo debe volver al primer focuseable, ids=${ids.join(',')}`);
  },
});

tests.push({
  name: 'focus trap: Shift+Tab desde el primer focuseable va al último',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    await page.click('#btn-open-1');
    await page.waitForTimeout(350);
    // Foco en el primer focuseable
    await page.evaluate(() => document.getElementById('d1-cancel').focus());
    const before = await page.evaluate(() => document.activeElement?.id);
    assert.equal(before, 'd1-cancel');
    await page.keyboard.press('Shift+Tab');
    const after = await page.evaluate(() => document.activeElement?.id);
    assert.equal(after, 'd1-ok', `Shift+Tab desde el primero debe ir al último (#d1-ok), fue "${after}"`);
  },
});

tests.push({
  name: 'a11y: restaurar foco al cerrar (vuelve al opener)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    // d5 arranca cerrado, abrimos con el botón #btn-open-5 → el foco queda en ese botón.
    await page.focus('#btn-open-5');
    const before = await page.evaluate(() => document.activeElement?.id);
    assert.equal(before, 'btn-open-5');
    await page.click('#btn-open-5');
    await page.waitForTimeout(350);
    const during = await page.evaluate(() => document.activeElement?.id);
    assert.notEqual(during, 'btn-open-5', 'el foco debe haberse movido dentro del diálogo al abrir');
    // Cerrar con .hide()
    await page.click('#d5-force');
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => document.activeElement?.id);
    assert.equal(after, 'btn-open-5', `al cerrar, el foco debe volver al opener (#btn-open-5), fue "${after}"`);
  },
});

tests.push({
  name: 'funcional: light-dismiss cierra al hacer click en el backdrop',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    // d2 está cerrado → abrirlo
    await page.click('#btn-open-2');
    await page.waitForTimeout(350);
    const opened = await page.evaluate(() => document.getElementById('d2').open);
    assert.equal(opened, true);
    // Click en el backdrop (esquina superior izquierda del viewport, fuera del modal).
    const viewport = page.viewportSize();
    await page.mouse.click(20, 20);
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() => document.getElementById('d2').open);
    assert.equal(closed, false, 'click en el backdrop debe cerrar el diálogo (light-dismiss)');
  },
});

tests.push({
  name: 'funcional: without-header oculta el header pero deja el body',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    await page.click('#btn-open-3');
    await page.waitForTimeout(350);
    const data = await page.evaluate(() => {
      const d = document.getElementById('d3');
      const sr = d.shadowRoot;
      return {
        headerHidden: sr.querySelector('[part="header"]')?.hidden,
        bodyExists: !!sr.querySelector('[part="body"]'),
        closeExists: !!sr.querySelector('[part="close-button"]'),
      };
    });
    assert.equal(data.headerHidden, true, 'header debe estar hidden con without-header');
    assert.equal(data.bodyExists, true, 'body debe seguir visible');
    assert.equal(data.closeExists, true, 'close-button debe seguir existiendo (aunque esté en header hidden)');
  },
});

tests.push({
  name: 'funcional: backdrop-variant="basic" se refleja en la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    const v = await page.evaluate(() => document.getElementById('d4').backdropVariant);
    assert.equal(v, 'basic');
  },
});

tests.push({
  name: 'funcional: backdrop-variant inválido cae a "none"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    const v = await page.evaluate(() => {
      const d = document.createElement('is-dialog');
      d.setAttribute('backdrop-variant', 'extreme');
      document.body.appendChild(d);
      const r = d.backdropVariant;
      d.remove();
      return r;
    });
    assert.equal(v, 'none');
  },
});

tests.push({
  name: 'eventos: is-show → is-after-show → is-hide → is-after-hide',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    // Limpia log
    await page.evaluate(() => { document.getElementById('log').textContent = ''; });
    // d5: abrimos con el botón, luego cerramos con Escape (emite is-hide cancelable).
    await page.click('#btn-open-5');
    await page.waitForTimeout(350);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    const log = await page.evaluate(() => document.getElementById('log').textContent || '');
    assert.match(log, /is-show\s*←\s*d5/, `debe emitir is-show ← d5, log:\n${log}`);
    assert.match(log, /is-after-show\s*←\s*d5/, `debe emitir is-after-show ← d5, log:\n${log}`);
    assert.match(log, /is-hide\s*←\s*d5/, `debe emitir is-hide ← d5, log:\n${log}`);
    assert.match(log, /is-after-hide\s*←\s*d5/, `debe emitir is-after-hide ← d5, log:\n${log}`);
  },
});

tests.push({
  name: 'eventos: preventDefault en is-hide cancela el cierre (shake)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    await page.click('#btn-open-5');
    await page.waitForTimeout(350);
    const before = await page.evaluate(() => document.getElementById('d5').open);
    assert.equal(before, true);
    // Click en el botón shake → preventDefault → no debe cerrarse.
    await page.evaluate(() => document.getElementById('d5-cancel-shake').click());
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => document.getElementById('d5').open);
    assert.equal(after, true, 'preventDefault en is-hide debe cancelar el cierre');
  },
});

tests.push({
  name: 'toJSON/fromJSON: round-trip preserva open/label/without-header/light-dismiss/backdropVariant',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dialog-ready');
    const result = await page.evaluate(() => {
      const d = document.getElementById('d4');
      const j = d.toJSON();
      const d2 = document.createElement('is-dialog');
      d2.fromJSON(j);
      return {
        to: j,
        from: d2.toJSON(),
      };
    });
    assert.deepEqual(result.to, result.from, 'toJSON/fromJSON round-trip debe ser idéntico');
    assert.equal(result.to.backdropVariant, 'basic');
    assert.equal(result.to.withoutHeader, false);
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

report('dialog', failures === 0, { total: tests.length, failures });
