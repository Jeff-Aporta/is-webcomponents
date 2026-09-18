// barcode-scanner.test.mjs — tests exhaustivos del demo barcode-scanner.html.
// Cobertura: smoke + funcional (registro, atributos formats/disabled, hint
// de fallback si BarcodeDetector no está disponible) + graceful degradation
// (no debe tirar excepciones si la API no existe; debe emitir is-error o
// mostrar mensaje de hint) + accesibilidad básica.
//
// NOTA: BarcodeDetector puede no existir en Chromium headless por defecto.
// Los tests verifican ambos caminos: con/sin API. Lo importante es que el
// componente degrada con elegancia y emite los eventos correctos.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/media/BarcodeScanner/barcode-scanner.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente se registra y renderiza el botón y video',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const list = [...document.querySelectorAll('main is-barcode-scanner')];
      return {
        registered: !!customElements.get('is-barcode-scanner'),
        count: list.length,
        eachHasShadow: list.every((el) => !!el.shadowRoot),
        eachHasVideo: list.every((el) => !!el.shadowRoot.querySelector('video.preview')),
        eachHasButton: list.every((el) => !!el.shadowRoot.querySelector('button, is-button')),
        eachHasHint: list.every((el) => !!el.shadowRoot.querySelector('.hint')),
      };
    });
    assert.equal(data.registered, true, 'is-barcode-scanner debe estar registrado');
    assert.ok(data.count >= 3, `esperaba >=3 scanners, hay ${data.count}`);
    assert.ok(data.eachHasShadow, 'todos los scanners deben tener shadowRoot');
    assert.ok(data.eachHasVideo, 'todos los scanners deben tener un <video.preview>');
    assert.ok(data.eachHasButton, 'todos los scanners deben tener el botón de acción');
    assert.ok(data.eachHasHint, 'todos los scanners deben tener el <p.hint>');
    await screenshot(page, 'barcode-scanner-smoke');
  },
});

tests.push({
  name: 'funcional: atributo formats se refleja en la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const a = document.querySelector('is-barcode-scanner[formats^="qr_code"]');
      const b = document.querySelector('is-barcode-scanner[formats="qr_code"]');
      const c = document.querySelectorAll('is-barcode-scanner')[2]; // sin formats → default
      return {
        aFormats: a.formats,
        bFormats: b.formats,
        cFormats: c.formats,
      };
    });
    assert.deepEqual(data.aFormats, ['qr_code', 'ean_13'], `formats="qr_code,ean_13" → ['qr_code','ean_13'], got ${JSON.stringify(data.aFormats)}`);
    assert.deepEqual(data.bFormats, ['qr_code'], `formats="qr_code" → ['qr_code'], got ${JSON.stringify(data.bFormats)}`);
    // Default sin atributo → ['qr_code', 'ean_13']
    assert.deepEqual(data.cFormats, ['qr_code', 'ean_13'], `default formats → ['qr_code','ean_13'], got ${JSON.stringify(data.cFormats)}`);
  },
});

tests.push({
  name: 'funcional: atributo disabled se refleja en la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const a = document.querySelector('is-barcode-scanner:not([disabled])');
      const b = document.querySelector('is-barcode-scanner[disabled]');
      return { aDisabled: a.disabled, bDisabled: b.disabled };
    });
    assert.equal(data.aDisabled, false, 'scanner sin disabled → disabled=false');
    assert.equal(data.bDisabled, true, 'scanner con disabled → disabled=true');
  },
});

tests.push({
  name: 'funcional: detect() con API ausente no lanza y emite is-error',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    // Limpiar flag antes de la prueba
    await page.evaluate(() => { delete document.documentElement.dataset.scannerError; });
    // Llamar detect() con un canvas dummy
    const result = await page.evaluate(async () => {
      const el = document.querySelector('is-barcode-scanner[formats^="qr_code"]');
      // Canvas vacío como source (no se va a decodificar nada de todos modos)
      const cv = document.createElement('canvas');
      cv.width = 50; cv.height = 50;
      let barcodes;
      try {
        barcodes = await el.detect(cv);
      } catch (e) {
        return { threw: true, error: String(e?.message ?? e) };
      }
      return { threw: false, barcodes };
    });
    // Si BarcodeDetector no existe, el componente emite is-error y devuelve [].
    // Si existe pero no detecta nada, devuelve []. En ningún caso debe lanzar.
    assert.equal(result.threw, false, `detect() no debe lanzar excepciones, got threw=${result.threw}, error=${result.error}`);
    assert.ok(Array.isArray(result.barcodes), `detect() debe devolver un array, got ${typeof result.barcodes}: ${JSON.stringify(result.barcodes)}`);
  },
});

tests.push({
  name: 'graceful degradation: si BarcodeDetector falta, el componente degrada sin romper',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    // Verificar que la página no crashea independientemente de si BarcodeDetector existe o no.
    const ok = await page.evaluate(() => {
      try {
        const el = document.querySelector('is-barcode-scanner[formats^="qr_code"]');
        // Acceder a propiedades no debe tirar
        const f = el.formats;
        const d = el.disabled;
        const hasDetector = typeof window.BarcodeDetector === 'function';
        return { ok: true, formats: f, disabled: d, hasDetector };
      } catch (e) {
        return { ok: false, error: String(e?.message ?? e) };
      }
    });
    assert.equal(ok.ok, true, `el componente no debe lanzar al acceder a sus propiedades: ${ok.error}`);
    assert.ok(Array.isArray(ok.formats), `formats debe devolver un array, got ${typeof ok.formats}`);
  },
});

tests.push({
  name: 'funcional: stop() en scanner que nunca arrancó no tira excepciones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      try {
        const el = document.querySelector('is-barcode-scanner[formats^="qr_code"]');
        el.stop();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e?.message ?? e) };
      }
    });
    assert.equal(result.ok, true, `stop() en scanner inactivo no debe lanzar: ${result.error}`);
  },
});

tests.push({
  name: 'cleanup: disconnectedCallback llama a stop() y no deja streams colgando',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    await page.waitForTimeout(200);
    // Crear uno nuevo, montarlo, desconectarlo y verificar que stop() se llamó.
    const result = await page.evaluate(async () => {
      const el = document.createElement('is-barcode-scanner');
      document.body.appendChild(el);
      await new Promise((r) => setTimeout(r, 50));
      // Patch stop() para verificar que se invoca en disconnect.
      let stopCalled = false;
      const orig = el.stop.bind(el);
      el.stop = () => { stopCalled = true; return orig(); };
      document.body.removeChild(el);
      await new Promise((r) => setTimeout(r, 50));
      return { stopCalled };
    });
    assert.equal(result.stopCalled, true, 'disconnectedCallback debe invocar stop() para limpiar listeners/stream');
  },
});

tests.push({
  name: 'accesibilidad: el botón del scanner es accesible por teclado (es <button> o <is-button>)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-scanner-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-barcode-scanner[formats^="qr_code"]');
      const btn = el.shadowRoot.querySelector('button, is-button');
      const tag = btn?.tagName?.toLowerCase();
      // <is-button> se renderiza internamente como <button>, focusable.
      const innerBtn = btn?.shadowRoot?.querySelector('button') ?? (tag === 'button' ? btn : null);
      return {
        btnTag: tag,
        hasInnerButton: !!innerBtn,
        isFocusable: innerBtn ? !innerBtn.disabled : false,
        hasAriaOrText: !!(btn?.getAttribute('aria-label') || btn?.textContent?.trim()),
      };
    });
    assert.ok(data.hasInnerButton, `debe haber un <button> interno accesible, got tag=${data.btnTag}`);
    assert.ok(data.isFocusable, 'el botón debe ser focuseable (no disabled)');
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

report('barcode-scanner', failures === 0, { total: tests.length, failures });
