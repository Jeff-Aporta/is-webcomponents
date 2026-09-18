// window.test.mjs — tests exhaustivos del demo window.html.
//
// Cobertura:
//   - smoke: la ventana inicial monta con role=dialog, controles visibles
//   - funcional: minimize / restore alterna el dataset.state
//   - funcional: maximize / unmaximize ocupa el viewport entero
//   - funcional: close() remueve la ventana del DOM y emite is-after-hide
//   - funcional: drag del header reposiciona la ventana
//   - funcional: resizer arrastra cambia las dimensiones (resizable)
//   - funcional: maximizable/minimizable/closable ocultan sus botones si faltan
//   - funcional: slot title proyecta texto y aria-label usa el atributo title
//   - funcional: múltiples ventanas: z-index crece al hacer focus
//   - accesibilidad: role=dialog, aria-label del title, Escape cierra
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/overlays/Window/window.html`;

const tests = [];

tests.push({
  name: 'smoke: ventana inicial monta con role=dialog y controles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const info = await page.evaluate(() => {
      const win = document.querySelector('is-window');
      const root = win.shadowRoot.querySelector('.root[part="root"]');
      const header = win.shadowRoot.querySelector('header[part="header"]');
      const body = win.shadowRoot.querySelector('.body[part="body"]');
      const minBtn = win.shadowRoot.querySelector('[data-act="min"]');
      const maxBtn = win.shadowRoot.querySelector('[data-act="max"]');
      const closeBtn = win.shadowRoot.querySelector('[data-act="close"]');
      return {
        defined: !!customElements.get('is-window'),
        role: win.getAttribute('role'),
        ariaLabel: win.getAttribute('aria-label'),
        hasRoot: !!root,
        hasHeader: !!header,
        hasBody: !!body,
        hasMin: !!minBtn,
        hasMax: !!maxBtn,
        hasClose: !!closeBtn,
        minHidden: minBtn?.hasAttribute('hidden'),
        maxHidden: maxBtn?.hasAttribute('hidden'),
        closeHidden: closeBtn?.hasAttribute('hidden'),
        state: root?.dataset.state,
      };
    });
    assert.equal(info.defined, true, 'is-window debe estar definido');
    assert.equal(info.role, 'dialog', 'debe setear role=dialog automáticamente');
    assert.ok(info.ariaLabel && info.ariaLabel.length > 0,
      `aria-label debe poblarse desde title (fue "${info.ariaLabel}")`);
    assert.ok(info.hasRoot, '.root[part="root"] debe existir');
    assert.ok(info.hasHeader, 'header[part="header"] debe existir');
    assert.ok(info.hasBody, '.body[part="body"] debe existir');
    // La ventana inicial se spawnea con "kind=all" → todos los botones visibles.
    assert.equal(info.minHidden, false, 'con minimizable el botón debe estar visible');
    assert.equal(info.maxHidden, false, 'con maximizable el botón debe estar visible');
    assert.equal(info.closeHidden, false, 'con closable el botón debe estar visible');
    assert.equal(info.state, 'normal', 'estado inicial debe ser "normal"');
    await screenshot(page, 'window-smoke');
  },
});

tests.push({
  name: 'funcional: minimize() cambia dataset.state y emite is-minimize',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const win = document.querySelector('is-window');
      let fired = false;
      win.addEventListener('is-minimize', () => { fired = true; });
      win.minimize();
      return {
        fired,
        state: win.shadowRoot.querySelector('.root').dataset.state,
        // El dock="bottom-right" default reposiciona al minimizar.
        styleRight: win.style.right,
        styleBottom: win.style.bottom,
        isMinimizedClass: win.shadowRoot.querySelector('.root').classList.contains('is-minimized'),
      };
    });
    assert.equal(result.fired, true, 'minimize() debe emitir is-minimize');
    assert.equal(result.state, 'minimized', 'dataset.state debe ser "minimized"');
    assert.equal(result.styleRight, '0px', 'dock=bottom-right debe aplicar right:0');
    assert.equal(result.styleBottom, '0px', 'dock=bottom-right debe aplicar bottom:0');
    assert.equal(result.isMinimizedClass, true, 'clase is-minimized debe estar aplicada');
  },
});

tests.push({
  name: 'funcional: restore() vuelve a estado normal y reaplica lastRect',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const win = document.querySelector('is-window');
      const before = win.getBoundingClientRect();
      win.minimize();
      // Tras minimizar, el dock="bottom-right" posiciona la ventana en la
      // esquina inferior derecha. El estado y la clase deben reflejar esto.
      const minState = win.shadowRoot.querySelector('.root').dataset.state;
      const minDock = win.style.right === '0px' && win.style.bottom === '0px';
      const minRect = win.getBoundingClientRect();
      win.restore();
      const after = win.getBoundingClientRect();
      return {
        beforeW: before.width,
        minW: minRect.width,
        minState,
        minDock,
        afterW: after.width,
        afterY: after.y,
        beforeY: before.y,
        stateAfter: win.shadowRoot.querySelector('.root').dataset.state,
        // Tras restore, el dock styles se limpian
        dockCleared: win.style.right === '' && win.style.bottom === '',
      };
    });
    // La dimensión del HOST no cambia con minimize (el CSS reduce el .root
    // interno a 14rem, pero el host sigue var(--_w)). Lo que sí cambia es
    // la posición y los estilos inline del dock.
    assert.equal(result.minState, 'minimized', 'dataset.state debe ser "minimized" tras minimize');
    assert.equal(result.minDock, true, 'dock=bottom-right debe aplicar style.right=0 y bottom=0');
    assert.equal(result.stateAfter, 'normal', 'state debe volver a "normal" tras restore');
    assert.equal(result.dockCleared, true, 'restore debe limpiar style.right y style.bottom del dock');
    // La posición Y debe volver aproximadamente a la original (lastRect.x/y).
    assert.ok(Math.abs(result.afterY - result.beforeY) <= 1,
      `Y debe volver a ~${result.beforeY} (fue ${result.afterY})`);
  },
});

tests.push({
  name: 'funcional: maximize() ocupa viewport y unmaximize() restaura',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const win = document.querySelector('is-window');
      const before = win.getBoundingClientRect();
      let maxFired = false;
      win.addEventListener('is-maximize', () => { maxFired = true; });
      win.maximize();
      const max = win.getBoundingClientRect();
      win.unmaximize();
      const after = win.getBoundingClientRect();
      return {
        maxFired,
        beforeW: before.width,
        maxW: max.width,
        maxH: max.height,
        afterW: after.width,
        afterH: after.height,
        stateAfter: win.shadowRoot.querySelector('.root').dataset.state,
      };
    });
    assert.equal(result.maxFired, true, 'maximize() debe emitir is-maximize');
    // El viewport del harness es 1400x900.
    assert.equal(Math.round(result.maxW), 1400, `maximizada debe medir 1400px de ancho (mide ${result.maxW})`);
    assert.equal(Math.round(result.maxH), 900, `maximizada debe medir 900px de alto (mide ${result.maxH})`);
    assert.equal(result.stateAfter, 'normal', 'unmaximize debe volver a normal');
    // Tras unmaximize, vuelve al tamaño previo (lastRect).
    assert.equal(Math.round(result.afterW), Math.round(result.beforeW),
      `unmaximize debe volver al ancho original (de ${result.beforeW} a ${result.afterW})`);
  },
});

tests.push({
  name: 'funcional: close() remueve la ventana del DOM y emite is-after-hide',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const win = document.querySelector('is-window');
      let hideFired = false;
      let afterHideFired = false;
      win.addEventListener('is-hide', () => { hideFired = true; });
      win.addEventListener('is-after-hide', () => { afterHideFired = true; });
      const ref = win;
      ref.close();
      // close() llama this.remove(); la referencia sigue viva pero detached.
      await new Promise((r) => requestAnimationFrame(r));
      return {
        hideFired,
        afterHideFired,
        inDom: document.body.contains(ref),
        detached: !ref.isConnected,
      };
    });
    assert.equal(result.hideFired, true, 'close() debe emitir is-hide');
    assert.equal(result.afterHideFired, true, 'close() debe emitir is-after-hide');
    assert.equal(result.inDom, false, 'close() debe quitar la ventana del DOM');
    assert.equal(result.detached, true, 'la ventana debe quedar detached');
  },
});

tests.push({
  name: 'funcional: drag del header reposiciona la ventana',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const win = document.querySelector('is-window');
      const header = win.shadowRoot.querySelector('.header');
      const before = win.getBoundingClientRect();
      const hRect = header.getBoundingClientRect();
      const cx = hRect.x + hRect.width / 2;
      const cy = hRect.y + hRect.height / 2;
      // Disparar pointerdown sobre el header, luego pointermove sobre window.
      header.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        clientX: cx + 80, clientY: cy + 50, bubbles: true, pointerId: 1,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        clientX: cx + 80, clientY: cy + 50, bubbles: true, pointerId: 1,
      }));
      const after = win.getBoundingClientRect();
      return {
        dx: after.x - before.x,
        dy: after.y - before.y,
        // El transform:none se aplica explícitamente al soltar.
        inlineLeft: win.style.left,
        inlineTop: win.style.top,
      };
    });
    // Drag de +80px x / +50px y → debe coincidir (no hay clamp ni snap).
    assert.equal(Math.round(result.dx), 80, `drag debe mover +80px en X (movió ${result.dx})`);
    assert.equal(Math.round(result.dy), 50, `drag debe mover +50px en Y (movió ${result.dy})`);
    assert.ok(result.inlineLeft.endsWith('px'), `style.left debe estar en px, fue "${result.inlineLeft}"`);
    assert.ok(result.inlineTop.endsWith('px'), `style.top debe estar en px, fue "${result.inlineTop}"`);
  },
});

tests.push({
  name: 'funcional: resizer cambia las dimensiones (resizable)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    // Spawn una ventana resizable para tener el resizer visible
    await page.evaluate(() => {
      const win = document.createElement('is-window');
      win.setAttribute('resizable', '');
      win.setAttribute('width', '320');
      win.setAttribute('height', '200');
      win.setAttribute('x', '160');
      win.setAttribute('y', '160');
      win.setAttribute('title', 'Resize test');
      document.getElementById('desktop').appendChild(win);
    });
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => {
      // El último <is-window> es el resizable que acabamos de crear.
      const wins = [...document.querySelectorAll('is-window')];
      const win = wins[wins.length - 1];
      const resizer = win.shadowRoot.querySelector('.resizer');
      const before = win.getBoundingClientRect();
      const rRect = resizer.getBoundingClientRect();
      const cx = rRect.x + rRect.width / 2;
      const cy = rRect.y + rRect.height / 2;
      resizer.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        clientX: cx + 100, clientY: cy + 60, bubbles: true, pointerId: 1,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        clientX: cx + 100, clientY: cy + 60, bubbles: true, pointerId: 1,
      }));
      const after = win.getBoundingClientRect();
      return {
        beforeW: before.width,
        afterW: after.width,
        beforeH: before.height,
        afterH: after.height,
      };
    });
    assert.ok(result.afterW > result.beforeW + 50,
      `resize +100px x debe aumentar width (de ${result.beforeW} a ${result.afterW})`);
    assert.ok(result.afterH > result.beforeH + 30,
      `resize +60px y debe aumentar height (de ${result.beforeH} a ${result.afterH})`);
  },
});

tests.push({
  name: 'funcional: booleans presence-based ocultan sus botones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    // Spawn una ventana sin closable ni minimizable: sólo con maximizable.
    const result = await page.evaluate(() => {
      const win = document.createElement('is-window');
      win.setAttribute('maximizable', '');
      // Sin closable, sin minimizable, sin resizable.
      win.setAttribute('width', '320');
      win.setAttribute('height', '180');
      win.setAttribute('x', '180');
      win.setAttribute('y', '180');
      win.setAttribute('title', 'Solo maximizar');
      document.getElementById('desktop').appendChild(win);
      const min = win.shadowRoot.querySelector('[data-act="min"]');
      const max = win.shadowRoot.querySelector('[data-act="max"]');
      const close = win.shadowRoot.querySelector('[data-act="close"]');
      const resizer = win.shadowRoot.querySelector('.resizer');
      return {
        minHidden: min.hasAttribute('hidden'),
        maxHidden: max.hasAttribute('hidden'),
        closeHidden: close.hasAttribute('hidden'),
        resizerHidden: resizer.hasAttribute('hidden'),
      };
    });
    assert.equal(result.minHidden, true, 'sin minimizable el botón debe estar oculto');
    assert.equal(result.maxHidden, false, 'con maximizable el botón debe estar visible');
    assert.equal(result.closeHidden, true, 'sin closable el botón debe estar oculto');
    assert.equal(result.resizerHidden, true, 'sin resizable el resizer debe estar oculto');
  },
});

tests.push({
  name: 'funcional: slot title coexiste con atributo title (aria-label usa el atributo)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      // La ventana inicial se spawnea con title="Ventana #1 · all" + slot title="#1".
      const win = document.querySelector('is-window');
      const titleSpan = win.shadowRoot.querySelector('.title');
      const slotTitle = win.querySelector('[slot="title"]');
      return {
        titleAttr: win.getAttribute('title'),
        ariaLabel: win.getAttribute('aria-label'),
        titleSpanText: titleSpan?.textContent?.trim() ?? null,
        slotText: slotTitle?.textContent?.trim() ?? null,
      };
    });
    assert.match(result.ariaLabel, /Ventana #1/);
    // El .title span dentro del shadow usa SIEMPRE el atributo title (no el slot).
    assert.match(result.titleSpanText, /Ventana #1/);
    // El slot "title" proyecta contenido (slotted) — está separado del .title.
    assert.equal(result.slotText, '#1');
  },
});

tests.push({
  name: 'funcional: múltiples ventanas — pointerdown eleva la tocada',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    // Spawn 3 ventanas extra y compara z-index tras focus
    const result = await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) {
        const w = document.createElement('is-window');
        w.setAttribute('closable', '');
        w.setAttribute('title', `Layer ${i}`);
        w.setAttribute('x', String(50 + i * 30));
        w.setAttribute('y', String(50 + i * 30));
        document.getElementById('desktop').appendChild(w);
      }
      await new Promise((r) => requestAnimationFrame(r));
      const wins = [...document.querySelectorAll('is-window')];
      // Captura z-index inicial
      const before = wins.map((w) => Number(w.style.zIndex) || 100);
      // Click sobre la primera ventana
      wins[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 }));
      await new Promise((r) => requestAnimationFrame(r));
      const after = wins.map((w) => Number(w.style.zIndex) || 100);
      const maxBefore = Math.max(...before);
      const maxAfter = Math.max(...after);
      return { before, after, maxBefore, maxAfter, raisedIdx: 0 };
    });
    assert.ok(result.maxAfter > result.maxBefore,
      `el z-index máximo debe crecer tras el click (de ${result.maxBefore} a ${result.maxAfter})`);
    // La ventana "raised" (wins[0]) debe tener el z-index más alto.
    assert.equal(result.after[0], result.maxAfter,
      `wins[0] debe tener el z más alto tras click, tiene ${result.after[0]} (max ${result.maxAfter})`);
  },
});

tests.push({
  name: 'accesibilidad: Escape cierra la ventana con closable=""',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    // El handler de Escape (popup-dismiss) sólo actúa si el foco está
    // dentro de la ventana. El .body tiene tabindex="0", así que enfocamos
    // ese nodo vía el shadow root.
    await page.evaluate(() => {
      const win = document.querySelector('is-window');
      const body = win.shadowRoot.querySelector('.body[part="body"]');
      body.focus();
    });
    await page.waitForTimeout(50);
    const focused = await page.evaluate(() => {
      const win = document.querySelector('is-window');
      const body = win.shadowRoot.querySelector('.body[part="body"]');
      return win.shadowRoot.activeElement === body;
    });
    assert.equal(focused, true, 'el .body tabindex="0" debe poder recibir foco');
    const before = await page.evaluate(() => document.querySelectorAll('is-window').length);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => document.querySelectorAll('is-window').length);
    assert.equal(after, before - 1, `Escape con foco dentro debe cerrar 1 ventana (de ${before} a ${after})`);
  },
});

tests.push({
  name: 'accesibilidad: sin atributo closable, Escape NO cierra',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-window-ready');
    await page.waitForTimeout(100);
    // Spawn una ventana sin closable
    await page.evaluate(() => {
      const w = document.createElement('is-window');
      w.setAttribute('title', 'Sin cerrar');
      w.setAttribute('x', '120');
      w.setAttribute('y', '120');
      w.setAttribute('width', '280');
      w.setAttribute('height', '180');
      document.getElementById('desktop').appendChild(w);
    });
    await page.waitForTimeout(50);
    // Foco dentro de la nueva ventana (la última spawneada).
    await page.evaluate(() => {
      const wins = [...document.querySelectorAll('is-window')];
      const target = wins[wins.length - 1];
      const body = target.shadowRoot.querySelector('.body[part="body"]');
      body.focus();
    });
    await page.waitForTimeout(50);
    const before = await page.evaluate(() => document.querySelectorAll('is-window').length);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => document.querySelectorAll('is-window').length);
    assert.equal(after, before, `sin closable Escape no debe cerrar (sigue en ${after}, era ${before})`);
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

report('window', failures === 0, { total: tests.length, failures });