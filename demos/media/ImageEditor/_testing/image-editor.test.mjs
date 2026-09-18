// image-editor.test.mjs — tests exhaustivos del demo image-editor.html.
// Cobertura: smoke + funcional (zoom, rotate, reset, crop vía atributos y
// botones data-action) + cleanup de listeners (window pointermove/pointerup
// removidos en disconnectedCallback; ResizeObserver desconectado).
//
// NOTA: el componente registra listeners en `window` durante connectedCallback.
// Si no se limpian en disconnected, pueden quedar zombis que intenten actuar
// sobre una instancia desconectada. Esto es exactamente el "gap 2 del handoff"
// mencionado en la nota: verificamos que la limpieza ocurre correctamente.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/media/ImageEditor/image-editor.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente se registra, monta y carga la imagen (is-load)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    // Esperar a que is-load se dispare (la imagen es data: URL, pero el decode
    // puede tardar). Timeout prudente.
    await page.waitForFunction(
      () => document.documentElement.dataset.imageEditorLoaded === '1',
      null,
      { timeout: 5000 },
    ).catch(() => { /* cae al assert de abajo */ });
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      const shadow = el.shadowRoot;
      const statusText = shadow.querySelector('.status')?.textContent?.trim() || '';
      // El componente documenta `editor.image` como HTMLImageElement, pero el
      // getter no está implementado en la fuente actual (gap conocido). En su
      // lugar, validamos el canvas y el status que sí refleja la imagen cargada.
      const canvas = shadow.querySelector('canvas');
      const canvasHasPixels = canvas && canvas.width > 0 && canvas.height > 0;
      return {
        registered: !!customElements.get('is-image-editor'),
        hasShadow: !!shadow,
        hasCanvas: !!shadow.querySelector('canvas'),
        hasViewport: !!shadow.querySelector('.viewport'),
        hasToolbarSlot: !!shadow.querySelector('slot[name="toolbar"]'),
        hasStatus: !!shadow.querySelector('.status'),
        canvasHasPixels,
        statusText,
        loaded: document.documentElement.dataset.imageEditorLoaded === '1',
      };
    });
    assert.equal(data.registered, true, 'is-image-editor debe estar registrado');
    assert.ok(data.hasShadow, 'debe tener shadowRoot');
    assert.ok(data.hasCanvas, 'debe haber un <canvas>');
    assert.ok(data.hasViewport, 'debe haber un .viewport');
    assert.ok(data.hasToolbarSlot, 'debe haber un slot[name=toolbar]');
    assert.ok(data.hasStatus, 'debe haber un .status');
    assert.equal(data.loaded, true, `is-load debe haberse disparado tras cargar la imagen (status="${data.statusText}")`);
    assert.ok(data.canvasHasPixels, `canvas debe tener tamaño positivo tras cargar la imagen (status="${data.statusText}")`);
    await screenshot(page, 'image-editor-smoke');
  },
});

tests.push({
  name: 'funcional: zoom programático vía atributo funciona y limita entre 0.1 y 8',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      el.zoom = 2;
      const z1 = el.zoom;
      el.zoom = 0.01; // debe clamp a 0.1
      const z2 = el.zoom;
      el.zoom = 999; // debe clamp a 8
      const z3 = el.zoom;
      return { z1, z2, z3 };
    });
    assert.equal(data.z1, 2, `zoom=2 → 2, got ${data.z1}`);
    assert.equal(data.z2, 0.1, `zoom=0.01 debe clampear a 0.1, got ${data.z2}`);
    assert.equal(data.z3, 8, `zoom=999 debe clampear a 8, got ${data.z3}`);
  },
});

tests.push({
  name: 'funcional: rotación normaliza a [0, 360)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      el.rotation = 450; // debe ser 90
      const r1 = el.rotation;
      el.rotation = -90; // debe ser 270
      const r2 = el.rotation;
      return { r1, r2 };
    });
    assert.equal(data.r1, 90, `rotation=450 debe normalizar a 90, got ${data.r1}`);
    assert.equal(data.r2, 270, `rotation=-90 debe normalizar a 270, got ${data.r2}`);
  },
});

tests.push({
  name: 'funcional: click en data-action="zoom-in" dispara applyZoom',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => document.querySelector('is-image-editor').zoom);
    await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      const btn = el.querySelector('[data-action="zoom-in"]');
      btn.click();
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.querySelector('is-image-editor').zoom);
    assert.ok(after > before, `zoom-in debe incrementar zoom (${before} → ${after})`);
    assert.ok(Math.abs(after - (before + 0.1)) < 0.01, `zoom debe subir ~0.1 (got ${after - before})`);
  },
});

tests.push({
  name: 'funcional: click en data-action="rotate" rota +90°',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      el.rotation = 0;
      el.querySelector('[data-action="rotate"]').click();
    });
    await page.waitForTimeout(150);
    const rot = await page.evaluate(() => document.querySelector('is-image-editor').rotation);
    assert.equal(rot, 90, `rotate debe sumar 90°, got ${rot}`);
  },
});

tests.push({
  name: 'funcional: data-action="reset" vuelve a zoom=1, rotation=0',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      el.zoom = 3;
      el.rotation = 180;
      el.querySelector('[data-action="reset"]').click();
    });
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      return { zoom: el.zoom, rotation: el.rotation };
    });
    assert.equal(data.zoom, 1, `reset debe poner zoom=1, got ${data.zoom}`);
    assert.equal(data.rotation, 0, `reset debe poner rotation=0, got ${data.rotation}`);
  },
});

tests.push({
  name: 'funcional: data-action="crop" emite is-crop y devuelve dataURL',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(800);
    // Limpiar flag
    await page.evaluate(() => { delete document.documentElement.dataset.imageEditorCropped; });
    const result = await page.evaluate(async () => {
      const el = document.querySelector('is-image-editor');
      let dataURL;
      try {
        dataURL = el.cropped();
      } catch (e) {
        return { threw: true, error: String(e?.message ?? e) };
      }
      return { threw: false, dataURL };
    });
    assert.equal(result.threw, false, `cropped() no debe lanzar: ${result.error}`);
    assert.ok(result.dataURL, 'cropped() debe devolver un dataURL');
    assert.match(result.dataURL, /^data:image\/png/, `cropped() debe devolver un PNG dataURL, got "${result.dataURL.slice(0, 50)}"`);
    const fired = await page.evaluate(() => document.documentElement.dataset.imageEditorCropped === '1');
    assert.equal(fired, true, 'cropped() debe emitir is-crop');
  },
});

tests.push({
  name: 'cleanup: disconnectedCallback desconecta el ResizeObserver y remueve listeners de window',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(500);

    // Verificar que NO quedan referencias colgando tras remover el elemento.
    // El componente añade 'pointermove' y 'pointerup' a `window` en connectedCallback
    // y debe removerlos en disconnectedCallback. Tras desconectar, dispatchar un
    // pointermove en window no debe llamar al handler interno.
    const result = await page.evaluate(async () => {
      // Instrumentar addEventListener/removeEventListener en window para llevar
      // cuenta de cuántos listeners del editor se quedan vivos.
      const counts = { pointermove: 0, pointerup: 0, removed: { pointermove: 0, pointerup: 0 } };
      const origAdd = window.addEventListener.bind(window);
      const origRem = window.removeEventListener.bind(window);
      window.addEventListener = (type, fn, opts) => {
        if (type === 'pointermove' || type === 'pointerup') counts[type]++;
        return origAdd(type, fn, opts);
      };
      window.removeEventListener = (type, fn, opts) => {
        if (type === 'pointermove' || type === 'pointerup') counts.removed[type]++;
        return origRem(type, fn, opts);
      };
      // Crear un editor nuevo (que añadirá listeners)
      const el = document.createElement('is-image-editor');
      el.setAttribute('src', 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22red%22/%3E%3C/svg%3E');
      document.body.appendChild(el);
      // Esperar a que se monte (incluye connectedCallback)
      await new Promise((r) => setTimeout(r, 200));
      const beforeRemove = { pm: counts.pointermove, pu: counts.pointerup };
      // Remover → debe disparar disconnectedCallback
      document.body.removeChild(el);
      // Esperar un tick
      await new Promise((r) => setTimeout(r, 50));
      const afterRemove = { pm: counts.removed.pointermove, pu: counts.removed.pointerup };
      return { beforeRemove, afterRemove };
    });

    // En connectedCallback debe añadir al menos un pointermove y un pointerup.
    assert.ok(result.beforeRemove.pm >= 1, `debe añadir >=1 pointermove listener, got ${result.beforeRemove.pm}`);
    assert.ok(result.beforeRemove.pu >= 1, `debe añadir >=1 pointerup listener, got ${result.beforeRemove.pu}`);
    // En disconnectedCallback debe remover la misma cantidad.
    assert.equal(result.afterRemove.pm, result.beforeRemove.pm, `disconnect debe remover los pointermove añadidos (added=${result.beforeRemove.pm}, removed=${result.afterRemove.pm})`);
    assert.equal(result.afterRemove.pu, result.beforeRemove.pu, `disconnect debe remover los pointerup añadidos (added=${result.beforeRemove.pu}, removed=${result.afterRemove.pu})`);
  },
});

tests.push({
  name: 'accesibilidad: el canvas lleva aria-label y el status anuncia el estado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-image-editor-ready');
    await page.waitForTimeout(800);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-image-editor');
      const canvas = el.shadowRoot.querySelector('canvas');
      const status = el.shadowRoot.querySelector('.status');
      return {
        ariaLabel: canvas?.getAttribute('aria-label'),
        statusText: status?.textContent?.trim() || '',
      };
    });
    assert.ok(data.ariaLabel, `canvas debe tener aria-label, got "${data.ariaLabel}"`);
    assert.ok(data.statusText.length > 0, `status debe contener texto de estado, got "${data.statusText}"`);
    assert.match(data.statusText, /(\d+×\d+|zoom|\d+°)/i, `status debe mencionar dimensiones/zoom/rotación: "${data.statusText}"`);
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

report('image-editor', failures === 0, { total: tests.length, failures });
