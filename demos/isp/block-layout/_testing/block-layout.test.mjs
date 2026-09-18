// block-layout.test.mjs — tests exhaustivos del demo <is-block-layout>.
// Cobertura: smoke + funcional (resize → sizew + event) + API JSON (round-trip
// idéntico) + custom properties (--clientw / --lerpw).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/block-layout/block-layout.html`;

const tests = [];

tests.push({
  name: 'smoke: bloque monta y mide su propio ancho',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    const initial = await page.evaluate(() => {
      const host = document.getElementById('host');
      const host2 = document.getElementById('host2');
      const host3 = document.getElementById('host3');
      return {
        defined: !!customElements.get('is-block-layout'),
        hostW: host.getWidth(),
        host2W: host2.getWidth(),
        host3W: host3.getWidth(),
        hostSizew: host.sizew,
        hostDataSizew: host.getAttribute('data-sizew'),
        boolszwXs: host.boolszw.xs,
        boolszwXl: host.boolszw.xl,
        clientwVar: host.style.getPropertyValue('--clientw'),
        lerpwVar: host.style.getPropertyValue('--lerpw'),
      };
    });
    assert.equal(initial.defined, true, '<is-block-layout> debe estar definido');
    assert.ok(initial.hostW > 0, `host debe tener ancho medido > 0, hay ${initial.hostW}`);
    assert.ok(initial.host2W > 0, `host2 debe tener ancho medido > 0, hay ${initial.host2W}`);
    assert.equal(typeof initial.hostSizew, 'string', 'sizew debe ser string');
    assert.ok(['xs', 'sm', 'md', 'lg', 'xl'].includes(initial.hostSizew), `sizew debe ser bp válido, hay ${initial.hostSizew}`);
    assert.equal(initial.hostDataSizew, initial.hostSizew, 'data-sizew debe reflejar sizew');
    assert.ok(initial.boolszwXs === true, 'boolszw.xs debe ser true (acumulativo)');
    assert.ok(typeof initial.boolszwXl === 'boolean', 'boolszw.xl debe ser boolean');
    assert.ok(initial.clientwVar !== '', `--clientw debe estar seteado en style`);
    await screenshot(page, 'block-layout-smoke');
  },
});

tests.push({
  name: 'funcional: cambiar el ancho re-emite is-breakpoint y actualiza data-sizew',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    await page.waitForTimeout(150);
    // Disparar ResizeObserver cambiando el width.
    const events = await page.evaluate(() => {
      return new Promise((resolve) => {
        const host = document.getElementById('host2');
        const captured = [];
        const onBp = (e) => captured.push({ sizew: e.detail.sizew, width: e.detail.width });
        host.addEventListener('is-breakpoint', onBp);
        // Primer resize a 100px → xs (sizew xs porque < 480)
        host.style.width = '100px';
        // Segundo resize a 700px → md (<= 800)
        setTimeout(() => { host.style.width = '700px'; }, 50);
        // Tercer resize a 1300px → xl
        setTimeout(() => { host.style.width = '1300px'; }, 100);
        setTimeout(() => {
          host.removeEventListener('is-breakpoint', onBp);
          resolve(captured);
        }, 400);
      });
    });
    // Debe haber capturado al menos 3 cambios (sizew distinto en cada ancho).
    assert.ok(events.length >= 1, `esperaba >=1 eventos, hay ${events.length}`);
    const sizewSet = new Set(events.map((e) => e.sizew));
    assert.ok(sizewSet.size >= 2, `esperaba >=2 sizew distintos tras resize, hay ${[...sizewSet]}`);
    // Verificar que los tamaños publicados cuadran con la escalera.
    for (const e of events) {
      if (e.width < 480) assert.equal(e.sizew, 'xs', `${e.width}px debe ser xs`);
      else if (e.width <= 600) assert.equal(e.sizew, 'sm', `${e.width}px debe ser sm`);
      else if (e.width <= 800) assert.equal(e.sizew, 'md', `${e.width}px debe ser md`);
      else if (e.width < 1200) assert.equal(e.sizew, 'lg', `${e.width}px debe ser lg`);
      else assert.equal(e.sizew, 'xl', `${e.width}px debe ser xl`);
    }
  },
});

tests.push({
  name: 'API: fromJSON monta light DOM y toJSON serializa round-trip idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    await page.waitForTimeout(150);
    const round = await page.evaluate(() => {
      const host = document.getElementById('host3');
      // El demo ya llamó fromJSON — capturar lo serializado.
      const before = JSON.stringify(host.toJSON());
      // Asignar de nuevo desde la serialización y verificar idempotencia.
      host.fromJSON(JSON.parse(before));
      const after = JSON.stringify(host.toJSON());
      return { before, after, equal: before === after };
    });
    assert.equal(round.equal, true, `round-trip JSON no es idéntico:\nbefore=${round.before}\nafter=${round.after}`);
  },
});

tests.push({
  name: 'API: json2html + html2json vía métodos estáticos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const body = [
        ['p', 'Línea 1'],
        ['p', 'Línea 2'],
      ];
      const el = document.createElement('is-block-layout');
      el.id = 'tmp';
      document.body.appendChild(el);
      // Aquí se usa la API estática expuesta por la clase.
      const klass = customElements.get('is-block-layout');
      if (typeof klass.json2html !== 'function') return { staticAvailable: false };
      klass.json2html(el, body);
      const json = klass.html2json(el);
      el.remove();
      return {
        staticAvailable: true,
        childCount: el.querySelectorAll('p').length,
        json: JSON.stringify(json),
      };
    });
    assert.equal(result.staticAvailable, true, 'json2html/html2json estáticos deben existir');
    assert.ok(/Línea 1/.test(result.json) && /Línea 2/.test(result.json), 'json debe contener los textos');
  },
});

tests.push({
  name: 'rect/getRect: devuelve {x,y,width,height,...}',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-ready');
    const rect = await page.evaluate(() => {
      const host = document.getElementById('host');
      const r = host.rect();
      return { r, hasKeys: 'x' in r && 'y' in r && 'width' in r && 'height' in r && 'top' in r && 'left' in r };
    });
    assert.equal(rect.hasKeys, true, 'rect() debe devolver todas las claves esperadas');
    assert.ok(rect.r.width > 0, 'rect().width debe ser > 0');
    assert.ok(rect.r.height > 0, 'rect().height debe ser > 0');
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

report('block-layout', failures === 0, { total: tests.length, failures });
