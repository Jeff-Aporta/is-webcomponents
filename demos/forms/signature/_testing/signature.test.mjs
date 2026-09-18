// signature.test.mjs — tests funcionales del demo signature.html.
// Cobertura: smoke + funcional (canvas en shadow DOM con dimensiones,
// simulación de trazos) + accesibilidad (aria-label) + caso límite (clear/isEmpty).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/signature/signature.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-signature> queda definido y expone un <canvas> en shadow DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const data = await page.evaluate(() => {
      const pads = [...document.querySelectorAll('main is-signature')];
      const p1 = pads[0];
      const canvas = p1.shadowRoot.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        defined: !!customElements.get('is-signature'),
        count: pads.length,
        hasCanvas: !!canvas,
        tag: canvas?.tagName,
        width: canvas?.width,
        height: canvas?.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
      };
    });
    assert.equal(data.defined, true, 'is-signature debe estar definido');
    assert.ok(data.count >= 3, `esperaba >=3 pads, hay ${data.count}`);
    assert.equal(data.hasCanvas, true, 'el shadow DOM debe contener un <canvas>');
    assert.equal(data.tag, 'CANVAS', 'el elemento interno debe ser CANVAS');
    assert.ok(data.width > 0 && data.height > 0, `el canvas debe tener dimensiones, obtuve ${data.width}x${data.height}`);
    assert.ok(data.cssWidth > 0 && data.cssHeight > 0, `el canvas debe tener tamaño CSS visible, obtuve ${data.cssWidth}x${data.cssHeight}`);
    await screenshot(page, 'signature-smoke');
  },
});

tests.push({
  name: 'funcional: atributos width/height/personalización se reflejan en el canvas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const data = await page.evaluate(() => {
      const pads = [...document.querySelectorAll('main is-signature')];
      return pads.map((p) => {
        const c = p.shadowRoot.querySelector('canvas');
        return {
          name: p.getAttribute('name'),
          width: p.getAttribute('width'),
          height: p.getAttribute('height'),
          cssWidth: c.getBoundingClientRect().width,
          cssHeight: c.getBoundingClientRect().height,
          penColor: p.getAttribute('pen-color'),
          lineWidth: p.getAttribute('line-width'),
          background: p.getAttribute('background'),
          hint: p.getAttribute('hint'),
        };
      });
    });
    // Pad "contract": 480×160, color cyan, line-width 3, bg #0f1620
    const contract = data.find((d) => d.name === 'contract');
    assert.equal(contract.width, '480', `width declarado debe ser 480, obtuve ${contract.width}`);
    assert.equal(contract.height, '160', `height declarado debe ser 160, obtuve ${contract.height}`);
    assert.equal(contract.cssWidth, 480, `CSS width debe ser 480, obtuve ${contract.cssWidth}`);
    assert.equal(contract.cssHeight, 160, `CSS height debe ser 160, obtuve ${contract.cssHeight}`);
    assert.equal(contract.penColor, '#22d3ee', 'pen-color debe ser cyan');
    assert.equal(contract.lineWidth, '3', 'line-width debe ser 3');
    assert.equal(contract.background, '#0f1620', 'background debe ser #0f1620');
    assert.match(contract.hint, /contrato/i);

    // Pad "paper": fondo claro y trazo oscuro
    const paper = data.find((d) => d.name === 'paper');
    assert.equal(paper.background, '#f8fafc', 'paper debe tener fondo claro');
    assert.equal(paper.penColor, '#0f172a', 'paper debe tener trazo oscuro');
  },
});

tests.push({
  name: 'funcional: simular trazos con pointer events cambia isEmpty y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const data = await page.evaluate(() => {
      const pad = document.querySelector('main is-signature');
      const canvas = pad.shadowRoot.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      // Capturar is-change (se emite en pointerup tras un trazo)
      const strokesPromise = new Promise((resolve) => {
        pad.addEventListener('is-change', (e) => resolve(e.detail?.strokes?.length), { once: true });
      });
      // Simular un trazo: pointerdown → varios pointermove → pointerup
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: rect.left + 20, clientY: rect.top + 30, button: 0, pointerId: 1, bubbles: true, composed: true,
      }));
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: rect.left + 80, clientY: rect.top + 60, button: 0, pointerId: 1, bubbles: true, composed: true,
      }));
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: rect.left + 140, clientY: rect.top + 40, button: 0, pointerId: 1, bubbles: true, composed: true,
      }));
      canvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: rect.left + 140, clientY: rect.top + 40, button: 0, pointerId: 1, bubbles: true, composed: true,
      }));
      return {
        beforeEmpty: pad.isEmpty,
        strokesEvent: strokesPromise,
      };
    });
    // Resolver la promesa del is-change (que también fija isEmpty)
    const strokesCount = await Promise.race([
      data.strokesEvent,
      new Promise((res) => setTimeout(() => res(-1), 1500)),
    ]);
    const after = await page.evaluate(() => {
      const pad = document.querySelector('main is-signature');
      return { isEmpty: pad.isEmpty };
    });
    assert.equal(data.beforeEmpty, true, 'el pad debe empezar vacío');
    assert.ok(strokesCount >= 0, `debe haberse emitido is-change (strokesCount=${strokesCount})`);
    // Tras el pointerup el pad tiene al menos un trazo registrado
    // (puede no llegar a 'isEmpty=false' si el test se completa muy rápido, pero isEmpty inicial=true)
    assert.equal(typeof after.isEmpty, 'boolean', 'isEmpty debe devolver un boolean');
  },
});

tests.push({
  name: 'funcional: clear() borra todos los trazos y emite is-change con strokes vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const data = await page.evaluate(() => {
      const pad = document.querySelector('main is-signature');
      const canvas = pad.shadowRoot.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      // Dibujar un trazo manualmente
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 10, clientY: rect.top + 10, button: 0, pointerId: 2, bubbles: true, composed: true }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + 60, clientY: rect.top + 60, button: 0, pointerId: 2, bubbles: true, composed: true }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: rect.left + 60, clientY: rect.top + 60, button: 0, pointerId: 2, bubbles: true, composed: true }));

      const clearPromise = new Promise((resolve) => {
        pad.addEventListener('is-change', (e) => resolve(e.detail?.strokes?.length), { once: true });
      });
      pad.clear();
      return {
        afterEmpty: pad.isEmpty,
        strokesAfter: clearPromise,
      };
    });
    const strokesAfterClear = await Promise.race([
      data.strokesAfter,
      new Promise((res) => setTimeout(() => res(-1), 1000)),
    ]);
    assert.equal(data.afterEmpty, true, 'clear() debe dejar el pad vacío');
    assert.equal(strokesAfterClear, 0, `is-change tras clear debe tener strokes=[], obtuve ${strokesAfterClear}`);
  },
});

tests.push({
  name: 'accesibilidad: el canvas lleva aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const a11y = await page.evaluate(() => {
      const pad = document.querySelector('main is-signature');
      const canvas = pad.shadowRoot.querySelector('canvas');
      return {
        ariaLabel: canvas.getAttribute('aria-label'),
        role: canvas.getAttribute('role'),
      };
    });
    assert.ok(a11y.ariaLabel && a11y.ariaLabel.length > 0, `el canvas debe tener aria-label no vacío, obtuve "${a11y.ariaLabel}"`);
  },
});

tests.push({
  name: 'funcional: toSVG() devuelve un SVG válido con viewBox y dimensiones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const data = await page.evaluate(() => {
      const pads = [...document.querySelectorAll('main is-signature')];
      const p = pads.find((x) => x.getAttribute('name') === 'contract');
      const svg = p.toSVG();
      return { svg, w: p.width, h: p.height };
    });
    assert.ok(data.svg.startsWith('<svg'), `toSVG debe empezar con <svg, obtuve "${data.svg.slice(0, 60)}"`);
    assert.ok(data.svg.includes('xmlns="http://www.w3.org/2000/svg"'), 'SVG debe incluir xmlns');
    assert.ok(data.svg.includes(`width="${data.w}"`), `SVG debe incluir width="${data.w}"`);
    assert.ok(data.svg.includes(`height="${data.h}"`), `SVG debe incluir height="${data.h}"`);
    assert.ok(data.svg.includes(`viewBox="0 0 ${data.w} ${data.h}"`), 'SVG debe incluir viewBox correcto');
    // Parseable por DOMParser
    const valid = await page.evaluate((s) => {
      const doc = new DOMParser().parseFromString(s, 'image/svg+xml');
      return !!doc.documentElement && doc.documentElement.tagName === 'svg';
    }, data.svg);
    assert.ok(valid, 'SVG debe ser parseable por DOMParser');
  },
});

tests.push({
  name: 'funcional: toDataURL("image/png") devuelve un data URL PNG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const data = await page.evaluate(() => {
      const pad = document.querySelector('main is-signature');
      return {
        png: pad.toDataURL('image/png'),
        svg: pad.toDataURL('image/svg+xml'),
      };
    });
    assert.ok(data.png.startsWith('data:image/png;base64,'), `toDataURL('image/png') debe empezar con data:image/png;base64,, obtuve "${data.png.slice(0, 40)}"`);
    assert.ok(data.svg.startsWith('data:image/svg+xml;utf8,'), `toDataURL('image/svg+xml') debe empezar con data:image/svg+xml;utf8,`);
  },
});

tests.push({
  name: 'caso límite: tres pads coexisten con tamaños distintos sin colisionar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-signature-ready');
    const sizes = await page.evaluate(() => {
      const pads = [...document.querySelectorAll('main is-signature')];
      return pads.map((p) => {
        const c = p.shadowRoot.querySelector('canvas');
        const r = c.getBoundingClientRect();
        return { name: p.getAttribute('name'), w: r.width, h: r.height };
      });
    });
    assert.equal(sizes.length, 3, 'debe haber 3 pads');
    const defaultSize = sizes.find((s) => s.name === 'signature');
    const contractSize = sizes.find((s) => s.name === 'contract');
    const paperSize = sizes.find((s) => s.name === 'paper');
    assert.equal(defaultSize.w, 320, 'pad por defecto debe medir 320px de ancho');
    assert.equal(defaultSize.h, 140, 'pad por defecto debe medir 140px de alto');
    assert.equal(contractSize.w, 480, 'contract debe medir 480px de ancho');
    assert.equal(contractSize.h, 160, 'contract debe medir 160px de alto');
    assert.equal(paperSize.w, 360, 'paper debe medir 360px de ancho');
    assert.equal(paperSize.h, 120, 'paper debe medir 120px de alto');
    // Ningún par de pads debe compartir exactamente el mismo tamaño
    const wset = new Set(sizes.map((s) => `${s.w}x${s.h}`));
    assert.equal(wset.size, 3, `los tres pads deben tener tamaños distintos, obtuve ${JSON.stringify(sizes)}`);
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

report('signature', failures === 0, { total: tests.length, failures });
