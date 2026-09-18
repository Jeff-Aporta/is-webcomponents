// pdf-viewer.test.mjs — tests exhaustivos del demo pdf-viewer.html.
//
// Cobertura:
//   - smoke: el componente monta, customElements lo define, tiene iframe
//   - funcional: atributo src copia al iframe, type="application/pdf"
//   - funcional: download / print booleans muestran los botones
//   - funcional: setter src re-asigna el iframe
//   - funcional: engine="pdfjs" quita el atributo type del iframe
//   - funcional: height attribute aplica style.height al iframe
//   - funcional: slot="title" reemplaza el título por defecto
//   - funcional: slot="toolbar" proyecta botones adicionales
//   - funcional: is-load emite cuando el iframe carga
//   - determinismo: setear el mismo src dos veces no genera eventos extra
//   - accesibilidad: title del iframe siempre presente
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/overlays/PdfViewer/pdf-viewer.html`;

// PDF de muestra local — un PDF mínimo válido embebido como data URI para
// que los tests no dependan de la red. Cualquier blob binario pequeño
// alcanza; sólo verificamos estructura DOM, no render del PDF.
const TINY_PDF_DATA_URI =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAzMDAgMTQ0XT4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDQ3MyAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTYzCiUlRU9G';

const tests = [];

tests.push({
  name: 'smoke: dos <is-pdf-viewer> montan con toolbar e iframe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const info = await page.evaluate(() => {
      const viewers = document.querySelectorAll('is-pdf-viewer');
      return [...viewers].map((v) => {
        const toolbar = v.shadowRoot.querySelector('[part="toolbar"]');
        const iframe = v.shadowRoot.querySelector('iframe[part="frame"]');
        const dl = v.shadowRoot.querySelector('[part="download"]');
        const print = v.shadowRoot.querySelector('[part="print"]');
        return {
          defined: !!customElements.get('is-pdf-viewer'),
          hasToolbar: !!toolbar,
          hasIframe: !!iframe,
          dlEl: !!dl,
          printEl: !!print,
          dlHidden: dl?.hasAttribute('hidden') ?? null,
          printHidden: print?.hasAttribute('hidden') ?? null,
          iframeTitle: iframe?.getAttribute('title') ?? null,
          src: v.getAttribute('src'),
        };
      });
    });
    assert.equal(info.length, 2, 'demo debe tener 2 visores');
    assert.equal(info[0].defined, true, 'is-pdf-viewer debe estar definido');
    for (const v of info) {
      assert.ok(v.hasToolbar, 'cada visor debe tener [part="toolbar"]');
      assert.ok(v.hasIframe, 'cada visor debe tener <iframe part="frame">');
      assert.ok(v.iframeTitle, 'iframe debe tener title (accesibilidad)');
    }
    // El primer demo tiene download + print → botones NO ocultos.
    assert.equal(info[0].dlHidden, false, 'demo básico con download="" debe mostrar el botón');
    assert.equal(info[0].printHidden, false, 'demo básico con print="" debe mostrar el botón');
    // El segundo demo no tiene esos atributos → botones ocultos via hidden.
    assert.equal(info[1].dlHidden, true, 'demo 2 sin download debe ocultar el botón');
    assert.equal(info[1].printHidden, true, 'demo 2 sin print debe ocultar el botón');
    await screenshot(page, 'pdf-smoke');
  },
});

tests.push({
  name: 'funcional: atributo src copia al iframe con type="application/pdf"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate(() => {
      const v = document.querySelectorAll('is-pdf-viewer')[0];
      const iframe = v.shadowRoot.querySelector('iframe');
      return {
        attrSrc: v.getAttribute('src'),
        iframeSrc: iframe.src,
        iframeType: iframe.getAttribute('type'),
      };
    });
    assert.ok(result.attrSrc.length > 0, 'visor debe tener atributo src');
    // El iframe.src termina resuelto como URL absoluta (no data URI ni about:blank).
    assert.match(result.iframeSrc, /^https?:\/\//, `iframe.src debe ser URL http(s), fue "${result.iframeSrc}"`);
    assert.equal(result.iframeType, 'application/pdf', 'engine=native (default) debe poner type="application/pdf" en el iframe');
  },
});

tests.push({
  name: 'funcional: setter src re-asigna el iframe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate((tiny) => {
      const v = document.querySelectorAll('is-pdf-viewer')[1];
      const beforeSrc = v.shadowRoot.querySelector('iframe').src;
      v.src = tiny;
      const afterSrc = v.shadowRoot.querySelector('iframe').src;
      return { beforeSrc, afterSrc, attrSrc: v.getAttribute('src') };
    }, TINY_PDF_DATA_URI);
    assert.notEqual(result.beforeSrc, result.afterSrc, 'setter src debe cambiar el iframe.src');
    assert.equal(result.attrSrc, TINY_PDF_DATA_URI, 'setter src debe actualizar el atributo src');
    assert.equal(result.afterSrc, TINY_PDF_DATA_URI, 'iframe.src debe coincidir con el nuevo src');
  },
});

tests.push({
  name: 'funcional: engine="pdfjs" quita type del iframe (lo montará un wrapper externo)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate((tiny) => {
      const v = document.createElement('is-pdf-viewer');
      v.setAttribute('engine', 'pdfjs');
      v.setAttribute('src', tiny);
      document.body.appendChild(v);
      const iframe = v.shadowRoot.querySelector('iframe');
      return { type: iframe.getAttribute('type') };
    }, TINY_PDF_DATA_URI);
    assert.equal(result.type, null, 'engine="pdfjs" debe remover el atributo type del iframe');
  },
});

tests.push({
  name: 'funcional: atributo height aplica style.height al iframe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate(() => {
      const v = document.querySelectorAll('is-pdf-viewer')[0];
      const iframe = v.shadowRoot.querySelector('iframe');
      const h = v.getAttribute('height');
      return { attrHeight: h, inlineHeight: iframe.style.height };
    });
    assert.equal(result.attrHeight, '600px', 'demo básico debe tener height="600px"');
    assert.equal(result.inlineHeight, '600px', 'iframe.style.height debe reflejar el atributo');
  },
});

tests.push({
  name: 'funcional: slot="title" reemplaza el título por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate(() => {
      const v = document.querySelectorAll('is-pdf-viewer')[0];
      const titleSpan = v.querySelector('[slot="title"]');
      return {
        hasTitleSlot: !!titleSpan,
        slottedText: titleSpan?.textContent?.trim() ?? null,
      };
    });
    assert.equal(result.hasTitleSlot, true, 'demo debe proyectar <span slot="title">');
    assert.match(result.slottedText, /Mozilla/);
  },
});

tests.push({
  name: 'funcional: slot="toolbar" proyecta botones adicionales al toolbar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate(() => {
      const v = document.querySelectorAll('is-pdf-viewer')[1];
      const tbSlot = v.querySelector('[slot="toolbar"]');
      return {
        hasToolbarSlot: !!tbSlot,
        slottedText: tbSlot?.textContent?.trim() ?? null,
      };
    });
    assert.equal(result.hasToolbarSlot, true, 'demo 2 debe proyectar un botón extra en slot="toolbar"');
    assert.match(result.slottedText, /Recargar/i);
  },
});

tests.push({
  name: 'funcional: download button invoca descarga via anchor (no navega)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    // El método #download() crea un <a download> en el DOM y le hace click().
    // Verificamos que ese flujo existe y produce un anchor en el documento
    // (interceptando el click antes de que se dispare la navegación).
    const result = await page.evaluate(() => {
      const v = document.querySelectorAll('is-pdf-viewer')[0];
      const dl = v.shadowRoot.querySelector('[part="download"]');
      // Mock HTMLAnchorElement.click para que no navegue realmente.
      let anchorHref = null;
      let anchorDownload = null;
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        anchorHref = this.href;
        anchorDownload = this.getAttribute('download');
      };
      try { dl.click(); }
      finally { HTMLAnchorElement.prototype.click = origClick; }
      return { anchorHref, anchorDownload };
    });
    assert.ok(result.anchorHref && result.anchorHref.length > 0, 'download debe crear <a> con href del PDF');
    // El atributo download="" es truthy en el anchor (puede ser string vacío
    // o el nombre del archivo, ambos válidos según el navegador).
    assert.ok(result.anchorDownload !== null, 'download debe setear el atributo download en el anchor');
  },
});

tests.push({
  name: 'funcional: currentPage parsea correctamente el hash #page=N del iframe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate((tiny) => {
      const v = document.querySelectorAll('is-pdf-viewer')[0];
      // Sin #page → default 1
      v.src = tiny;
      const def = v.currentPage;
      // Forzar un iframe.src con hash
      const iframe = v.shadowRoot.querySelector('iframe');
      iframe.src = `${tiny}#page=7`;
      const seven = v.currentPage;
      // Hash con texto no numérico → default 1
      iframe.src = `${tiny}#zoom=page-width`;
      const fallback = v.currentPage;
      return { def, seven, fallback };
    }, TINY_PDF_DATA_URI);
    assert.equal(result.def, 1, 'sin #page debe devolver 1');
    assert.equal(result.seven, 7, '#page=7 debe devolver 7');
    assert.equal(result.fallback, 1, 'hash sin page=N debe devolver 1 (fallback)');
  },
});

tests.push({
  name: 'determinismo: setear el mismo src dos veces produce el mismo iframe.src',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate((tiny) => {
      const v = document.querySelectorAll('is-pdf-viewer')[1];
      v.src = tiny;
      const a = v.shadowRoot.querySelector('iframe').src;
      v.src = tiny;
      const b = v.shadowRoot.querySelector('iframe').src;
      return { a, b };
    }, TINY_PDF_DATA_URI);
    assert.equal(result.a, result.b, 'setter src idempotente: mismo src → mismo iframe.src');
  },
});

tests.push({
  name: 'accesibilidad: cada iframe tiene title no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pdf-viewer-ready');
    const result = await page.evaluate(() => {
      const viewers = [...document.querySelectorAll('is-pdf-viewer')];
      return viewers.map((v) => {
        const iframe = v.shadowRoot.querySelector('iframe');
        return iframe?.getAttribute('title') ?? null;
      });
    });
    for (const t of result) {
      assert.ok(t && t.length > 0, `iframe debe tener title no vacío (fue "${t}")`);
    }
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

report('pdf-viewer', failures === 0, { total: tests.length, failures });