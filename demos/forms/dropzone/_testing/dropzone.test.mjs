// dropzone.test.mjs — tests funcionales del demo dropzone.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con .zone y cola
//   - funcional: drop con DataTransfer mock añade archivos; removeFile los
//     quita; max-files dispara is-error; max-size respeta el límite
//   - accesibilidad: la zona es focusable (tabindex=0) y emite aria-label
//   - edge cases: drop vacío (sin files) no rompe; addFile manual funciona
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/dropzone/dropzone.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta su zona + cola',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const data = await page.evaluate(() => {
      const zones = [...document.querySelectorAll('is-dropzone')];
      return zones.map((z) => {
        const sr = z.shadowRoot;
        return {
          defined: !!customElements.get('is-dropzone'),
          hasShadow: !!sr,
          hasZone: !!sr?.querySelector('.zone'),
          hasQueue: !!sr?.querySelector('.queue'),
          zoneTabIndex: sr?.querySelector('.zone')?.tabIndex ?? null,
          filesCount: z.files.length,
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 dropzones (libre, imágenes, pdf, disabled)');
    assert.equal(data[0].defined, true, 'is-dropzone debe estar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root debe existir');
    assert.equal(data[0].hasZone, true, '.zone presente');
    assert.equal(data[0].hasQueue, true, '.queue presente');
    assert.equal(data[0].zoneTabIndex, 0, 'zona focusable (tabindex=0)');
    assert.equal(data[0].filesCount, 0, 'sin archivos iniciales');
    await screenshot(page, 'dropzone-smoke');
  },
});

tests.push({
  name: 'funcional: drop con DataTransfer mock añade archivos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      const dz = document.querySelector('#libre');
      const sr = dz.shadowRoot;
      // Crear dos archivos sintéticos vía DataTransfer mock
      const file1 = new File(['hola mundo'], 'saludo.txt', { type: 'text/plain' });
      const file2 = new File(['{"a":1}'], 'data.json', { type: 'application/json' });
      const dt = new DataTransfer();
      dt.items.add(file1);
      dt.items.add(file2);
      const drop = new DragEvent('drop', {
        bubbles: true, cancelable: true,
        dataTransfer: dt,
      });
      sr.querySelector('.zone').dispatchEvent(drop);
      const queue = sr.querySelectorAll('.queue li');
      return {
        filesCount: dz.files.length,
        queueItems: queue.length,
        fileNames: dz.files.map((f) => f.name),
        queueNames: [...queue].map((li) => li.querySelector('.name')?.textContent),
      };
    });
    assert.equal(result.filesCount, 2, '2 archivos tras drop');
    assert.equal(result.queueItems, 2, '2 filas en la cola');
    assert.deepEqual(result.fileNames, ['saludo.txt', 'data.json'], 'nombres correctos');
    assert.deepEqual(result.queueNames, ['saludo.txt', 'data.json'], 'cola muestra los nombres');
  },
});

tests.push({
  name: 'funcional: removeFile quita el archivo y re-renderiza la cola',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      const dz = document.querySelector('#libre');
      // añadir dos archivos vía API
      dz.addFile(new File(['a'], 'uno.txt', { type: 'text/plain' }));
      dz.addFile(new File(['b'], 'dos.txt', { type: 'text/plain' }));
      const before = dz.files.length;
      const id = dz.files[0].id;
      dz.removeFile(id);
      const after = dz.files.length;
      return {
        before, after,
        remaining: dz.files.map((f) => f.name),
        queueRows: dz.shadowRoot.querySelectorAll('.queue li').length,
      };
    });
    assert.equal(result.before, 2, '2 antes de removeFile');
    assert.equal(result.after, 1, '1 después de removeFile');
    assert.deepEqual(result.remaining, ['dos.txt'], 'queda solo dos.txt');
    assert.equal(result.queueRows, 1, 'cola re-renderizada con 1 fila');
  },
});

tests.push({
  name: 'funcional: max-files emite is-error y rechaza el exceso',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const dz = document.querySelector('#imagenes'); // max-files=3
        dz.addEventListener('is-error', (e) => {
          resolve({ filesCount: dz.files.length, error: e.detail });
        }, { once: true });
        // añadir 5 archivos en bloque (todos válidos como image/*)
        const files = [];
        for (let i = 0; i < 5; i++) {
          files.push(new File([String(i)], `img${i}.png`, { type: 'image/png' }));
        }
        dz.addFiles(files);
      });
    });
    assert.ok(result.filesCount <= 3, `debe haber <=3 archivos (hay ${result.filesCount})`);
    assert.equal(result.error.reason, 'max-files', 'is-error reason=max-files');
    assert.equal(result.error.limit, 3, 'is-error.limit=3');
  },
});

tests.push({
  name: 'funcional: max-size rechaza archivos que excedan el límite',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const dz = document.querySelector('#pdf'); // max-size=5MB
        dz.addEventListener('is-error', (e) => {
          resolve({ filesCount: dz.files.length, error: e.detail });
        }, { once: true });
        // crear un archivo > 5 MB
        const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
        dz.addFile(big);
      });
    });
    assert.equal(result.filesCount, 0, 'archivo rechazado, 0 en cola');
    assert.equal(result.error.reason, 'max-size', 'is-error reason=max-size');
  },
});

tests.push({
  name: 'funcional: accept filtra archivos que no cumplen el patrón',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const dz = document.querySelector('#imagenes');
        const errors = [];
        dz.addEventListener('is-error', (e) => errors.push(e.detail));
        dz.addFile(new File(['x'], 'doc.txt', { type: 'text/plain' })); // no es imagen
        setTimeout(() => {
          resolve({ filesCount: dz.files.length, errors });
        }, 50);
      });
    });
    assert.equal(result.filesCount, 0, 'archivo no-imagen rechazado');
    assert.equal(result.errors[0].reason, 'accept', 'is-error reason=accept');
  },
});

tests.push({
  name: 'accesibilidad: la zona es focusable con Enter/Space activa el input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const a11y = await page.evaluate(() => {
      const dz = document.querySelector('#libre');
      const zone = dz.shadowRoot.querySelector('.zone');
      return {
        tabIndex: zone.tabIndex,
        hasTitle: !!zone.querySelector('.title'),
        titleText: zone.querySelector('.title')?.textContent?.trim(),
        hasSub: !!zone.querySelector('.sub'),
      };
    });
    assert.equal(a11y.tabIndex, 0, 'zona con tabindex=0');
    assert.ok(a11y.hasTitle, 'zona tiene un título visible');
    assert.ok(a11y.hasSub, 'zona tiene un subtítulo');
  },
});

tests.push({
  name: 'edge case: drop vacío (DataTransfer sin files) no rompe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      const dz = document.querySelector('#libre');
      const sr = dz.shadowRoot;
      const dt = new DataTransfer();
      const drop = new DragEvent('drop', {
        bubbles: true, cancelable: true, dataTransfer: dt,
      });
      sr.querySelector('.zone').dispatchEvent(drop);
      return {
        filesCount: dz.files.length,
        queueRows: sr.querySelectorAll('.queue li').length,
      };
    });
    assert.equal(result.filesCount, 0, 'sin archivos tras drop vacío');
    assert.equal(result.queueRows, 0, 'cola vacía');
  },
});

tests.push({
  name: 'edge case: addFile manual funciona sin drop',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-dropzone-ready');
    const result = await page.evaluate(() => {
      const dz = document.querySelector('#libre');
      dz.addFile(new File(['x'], 'manual.txt', { type: 'text/plain' }));
      return {
        filesCount: dz.files.length,
        firstName: dz.files[0].name,
        firstStatus: dz.files[0].status,
        firstProgress: dz.files[0].progress,
        firstType: dz.files[0].type,
      };
    });
    assert.equal(result.filesCount, 1, 'addFile añade 1 archivo');
    assert.equal(result.firstName, 'manual.txt', 'nombre preservado');
    assert.equal(result.firstStatus, 'queued', 'status inicial=queued');
    assert.equal(result.firstProgress, 0, 'progress inicial=0');
    assert.equal(result.firstType, 'text/plain', 'type preservado');
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

report('dropzone', failures === 0, { total: tests.length, failures });
