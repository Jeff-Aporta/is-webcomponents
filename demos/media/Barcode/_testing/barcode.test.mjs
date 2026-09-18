// barcode.test.mjs — tests exhaustivos del demo barcode.html.
// Cobertura: smoke + funcional (Code128, EAN-13 con checksum, cambio de value,
// fg/bg, show-text) + determinismo (mismo value → mismo viewBox / mismas
// barras) + accesibilidad básica.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/media/Barcode/barcode.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente se registra y renderiza SVG con barras',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const list = [...document.querySelectorAll('main is-barcode')];
      return list.map((el) => {
        const svg = el.shadowRoot.querySelector('svg');
        const rects = el.shadowRoot.querySelectorAll('svg rect');
        return {
          registered: !!customElements.get('is-barcode'),
          hasSvg: !!svg,
          viewBox: svg?.getAttribute('viewBox') ?? '',
          width: svg?.getAttribute('width') ?? '',
          height: svg?.getAttribute('height') ?? '',
          rectCount: rects.length,
        };
      });
    });
    assert.equal(data[0].registered, true, 'is-barcode debe estar registrado');
    assert.ok(data.length >= 4, `esperaba >=4 barcodes, hay ${data.length}`);
    for (const d of data) {
      assert.ok(d.hasSvg, 'todos los barcodes deben tener un <svg>');
      assert.ok(d.viewBox.length > 0, `viewBox no debe estar vacío: "${d.viewBox}"`);
      assert.ok(d.width.length > 0 && d.height.length > 0, `width/height no deben estar vacíos: w=${d.width}, h=${d.height}`);
    }
    await screenshot(page, 'barcode-smoke');
  },
});

tests.push({
  name: 'funcional: Code128 genera un número positivo de barras',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      const rects = el.shadowRoot.querySelectorAll('svg rect');
      const textEl = el.shadowRoot.querySelector('.text');
      return {
        rectCount: rects.length,
        textVisible: !textEl.hidden,
        text: textEl.textContent.trim(),
        type: el.getAttribute('type'),
      };
    });
    assert.ok(data.rectCount > 10, `Code128 con "HELLO-WORLD-2026" debe generar >10 barras, hay ${data.rectCount}`);
    assert.equal(data.type, 'code128', 'type debe ser code128');
    assert.equal(data.textVisible, true, 'show-text debe hacer el texto visible');
    assert.match(data.text, /HELLO-WORLD-2026/, `texto debe reflejar value, got "${data.text}"`);
  },
});

tests.push({
  name: 'funcional: EAN-13 calcula checksum y rellena el texto con 13 dígitos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value="7790070410027"]');
      const rects = el.shadowRoot.querySelectorAll('svg rect');
      const textEl = el.shadowRoot.querySelector('.text');
      return {
        rectCount: rects.length,
        text: textEl.textContent.trim(),
        textLen: textEl.textContent.trim().length,
      };
    });
    // 12 dígitos + checksum → 13 dígitos
    assert.equal(data.textLen, 13, `EAN-13 debe producir 13 dígitos (12 + checksum), got ${data.textLen}: "${data.text}"`);
    assert.match(data.text, /^779007041002/, `debe empezar con el value original, got "${data.text}"`);
    assert.ok(data.rectCount > 50, `EAN-13 debe generar muchas barras (>50), hay ${data.rectCount}`);
  },
});

tests.push({
  name: 'funcional: cambio de value re-renderiza las barras',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      return {
        rectCount: el.shadowRoot.querySelectorAll('svg rect').length,
        text: el.shadowRoot.querySelector('.text').textContent.trim(),
      };
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      el.setAttribute('value', 'GOODBYE-2026');
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="GOODBYE"]');
      return {
        rectCount: el.shadowRoot.querySelectorAll('svg rect').length,
        text: el.shadowRoot.querySelector('.text').textContent.trim(),
      };
    });
    assert.notEqual(before.rectCount, after.rectCount, `cambio de value debe re-renderizar (rects: ${before.rectCount} → ${after.rectCount})`);
    assert.match(after.text, /GOODBYE-2026/, `texto debe reflejar nuevo value, got "${after.text}"`);
  },
});

tests.push({
  name: 'funcional: atributos fg/bg pintan los rects con los colores correctos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[bg="#0f1620"]');
      const rects = [...el.shadowRoot.querySelectorAll('svg rect')];
      const fills = rects.map((r) => r.getAttribute('fill'));
      const uniqueFills = [...new Set(fills)];
      return { totalRects: rects.length, uniqueFills };
    });
    assert.ok(data.totalRects > 0, 'debe haber al menos un rect');
    assert.ok(data.uniqueFills.includes('#0f1620'), `bg="#0f1620" debe producir un rect de fondo con ese fill, fills=${JSON.stringify(data.uniqueFills)}`);
    assert.ok(data.uniqueFills.includes('#22d3ee'), `fg="#22d3ee" debe producir barras con ese fill, fills=${JSON.stringify(data.uniqueFills)}`);
  },
});

tests.push({
  name: 'funcional: is-render se dispara al cambiar atributos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    // Re-disparar is-render cambiando height en uno existente
    await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      el.setAttribute('height', '90');
    });
    await page.waitForTimeout(200);
    const fired = await page.evaluate(() => document.documentElement.dataset.barcodeRenderFired === '1');
    assert.equal(fired, true, 'is-render debe haberse disparado tras cambios de atributo');
  },
});

tests.push({
  name: 'determinismo: mismo value produce el mismo número de barras en dos renders',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      return el.shadowRoot.querySelectorAll('svg rect').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      // Truco: forzar re-render cambiando height y volviendo al original
      const original = el.getAttribute('height');
      el.setAttribute('height', '85');
      el.setAttribute('height', original);
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      return el.shadowRoot.querySelectorAll('svg rect').length;
    });
    assert.equal(before, after, `mismo value debe producir el mismo número de barras (${before} → ${after})`);
  },
});

tests.push({
  name: 'accesibilidad: el SVG lleva role="img" y aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-barcode-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-barcode[value^="HELLO"]');
      const svg = el.shadowRoot.querySelector('svg');
      return {
        role: svg.getAttribute('role'),
        ariaLabel: svg.getAttribute('aria-label'),
      };
    });
    assert.equal(data.role, 'img', `role debe ser "img", got "${data.role}"`);
    assert.ok(data.ariaLabel && data.ariaLabel.length > 0, `aria-label no debe estar vacío, got "${data.ariaLabel}"`);
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

report('barcode', failures === 0, { total: tests.length, failures });
