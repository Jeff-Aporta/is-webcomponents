// toast.test.mjs — tests exhaustivos del demo is-toast.
// Cobertura: smoke + funcional (create, placements, success/error/loading,
// promise) + gap 18: el modo seguro (allowHtml=false) trata el mensaje como
// texto plano y NO interpreta HTML; el modo inseguro (allowHtml=true) SÍ lo
// inserta como HTML (documentando la regresión cuando se arregle el gap).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/toast/toast.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con placement bottom-end por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-toast');
      return {
        defined: !!customElements.get('is-toast'),
        count: all.length,
        placements: [...all].map((t) => t.getAttribute('placement')),
      };
    });
    assert.equal(data.defined, true, 'is-toast debe estar definido');
    assert.ok(data.count >= 4, `esperaba >=4 toasts, hay ${data.count}`);
    assert.ok(data.placements.includes('bottom-end'), `placement bottom-end debe estar presente, vi ${JSON.stringify(data.placements)}`);
    await screenshot(page, 'toast-smoke');
  },
});

tests.push({
  name: 'funcional: create() añade un is-toast-item visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const t = document.querySelector('is-toast');
      const initial = t.querySelectorAll('is-toast-item').length;
      const item = await t.create('Hola mundo', { variant: 'brand', duration: 3000 });
      await new Promise((r) => requestAnimationFrame(() => r()));
      const after = t.querySelectorAll('is-toast-item').length;
      return {
        initial, after,
        itemText: item.textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    assert.equal(data.after, data.initial + 1, `create() debe añadir 1 item (antes=${data.initial}, después=${data.after})`);
    assert.match(data.itemText, /Hola mundo/, `item debe contener el mensaje (vimos "${data.itemText}")`);
  },
});

tests.push({
  name: 'API estática: IsToast.success() lanza un toast success',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const item = await IsToast.success('¡Bien!');
      await new Promise((r) => requestAnimationFrame(() => r()));
      const t = IsToast.host();
      const all = [...t.querySelectorAll('is-toast-item')];
      const success = all.find((i) => i.textContent.includes('¡Bien!'));
      return {
        hostOk: !!t,
        itemColor: success?.getAttribute('color') || success?.color,
      };
    });
    assert.ok(data.hostOk, 'IsToast.host() debe devolver un toaster');
    assert.equal(data.itemColor, 'success', `toast.success debe tener color=success (vimos "${data.itemColor}")`);
  },
});

tests.push({
  name: 'API estática: IsToast.error() crea un toast danger con duración 5000ms',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const item = await IsToast.error('Boom!');
      await new Promise((r) => requestAnimationFrame(() => r()));
      return {
        color: item.color,
        duration: item.duration,
      };
    });
    assert.equal(data.color, 'danger', `error debe ser color=danger (vimos "${data.color}")`);
    assert.equal(data.duration, 5000, `error default duration debe ser 5000 (vimos ${data.duration})`);
  },
});

tests.push({
  name: 'API estática: IsToast.loading() crea un toast persistente (duration=0)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const item = await IsToast.loading('Cargando…');
      await new Promise((r) => requestAnimationFrame(() => r()));
      return { duration: item.duration };
    }).catch((e) => ({ duration: null, err: String(e) }));
    assert.notEqual(data.duration, null, `loading no debe fallar (err=${data.err})`);
    assert.equal(data.duration, 0, `loading debe tener duration=0 (vimos ${data.duration})`);
  },
});

tests.push({
  name: 'funcional: placement inválido cae a bottom-end',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const p = await page.evaluate(() => {
      const t = document.createElement('is-toast');
      t.setAttribute('placement', 'invalid-placement');
      document.body.appendChild(t);
      const got = t.placement;
      t.remove();
      return got;
    });
    assert.equal(p, 'bottom-end', `placement inválido debe normalizarse a bottom-end (vimos "${p}")`);
  },
});

tests.push({
  name: 'gap-18 (sanitización): con allowHtml=false el mensaje es texto plano',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(async () => {
      window.__xssFired = false;
      const t = IsToast.host();
      const item = await t.create('<img src=x onerror="window.__xssFired=true">PWN', { duration: 0 });
      await new Promise((r) => requestAnimationFrame(() => r()));
      // Verificar:
      //  1) NO se creó un <img> dentro del toast
      const imgsInToast = item.querySelectorAll('img').length;
      //  2) El texto literal aparece como texto
      const text = item.textContent;
      //  3) No se ejecutó el onerror
      const xssFired = window.__xssFired;
      IsToast.remove(item);
      return { imgsInToast, textIncludesLiteral: text.includes('<img'), xssFired };
    });
    assert.equal(result.imgsInToast, 0, `modo seguro NO debe crear <img> dentro del item (creó ${result.imgsInToast})`);
    assert.equal(result.xssFired, false, `modo seguro NO debe disparar onerror (xssFired=${result.xssFired})`);
  },
});

tests.push({
  name: 'gap-18 (sanitización): con allowHtml=true el HTML se inserta literal (documenta el gap)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(async () => {
      window.__xssFired = false;
      const t = IsToast.host();
      // Usamos un tag inocuo que NO dispare eventos, sólo para verificar que
      // el HTML se inserta como nodo (NO como texto).
      const item = await t.create('<b data-xss="1">safe-mark</b>', { duration: 0, allowHtml: true });
      await new Promise((r) => requestAnimationFrame(() => r()));
      const bold = item.querySelector('b[data-xss]');
      const text = item.textContent;
      IsToast.remove(item);
      return { boldFound: !!bold, text };
    });
    // Documenta el comportamiento actual (gap 18): allowHtml=true permite HTML.
    // Si en el futuro se arregla el gap (sanitización), este test debería
    // empezar a fallar → indica que hay que actualizar el test al nuevo
    // comportamiento esperado (boldFound=false, text contiene el HTML literal).
    assert.ok(result.boldFound, `con allowHtml=true el HTML debe insertarse como nodo (bold=${result.boldFound}) — gap 18 aún abierto`);
    assert.ok(result.text.includes('safe-mark'), 'texto del HTML debe seguir presente');
  },
});

tests.push({
  name: 'funcional: slot caption se proyecta cuando se pasa vía options',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const hasCaption = await page.evaluate(async () => {
      const t = IsToast.host();
      const item = await t.create('Título', { duration: 0, caption: 'detalle menor' });
      await new Promise((r) => requestAnimationFrame(() => r()));
      const cap = item.querySelector('[slot="caption"]');
      const got = !!cap && cap.textContent.includes('detalle menor');
      IsToast.remove(item);
      return got;
    });
    assert.ok(hasCaption, 'caption debe aparecer como slot caption en el item');
  },
});

tests.push({
  name: 'funcional: IsToast.promise() reusa el mismo item en success',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const t = IsToast.host();
      const before = t.querySelectorAll('is-toast-item').length;
      await IsToast.promise(
        new Promise((r) => setTimeout(() => r(42), 50)),
        {
          loading: 'Cargando',
          success: (v) => `Resultado ${v}`,
        },
      );
      // Esperar un poco más que la promise para que se actualice.
      await new Promise((r) => setTimeout(r, 200));
      const items = [...t.querySelectorAll('is-toast-item')];
      const last = items[items.length - 1];
      const after = items.length;
      const txt = last?.textContent || '';
      const color = last?.color;
      return { before, after, txt, color };
    });
    assert.equal(data.after, data.before + 1, `promise debe crear 1 solo item (antes=${data.before}, después=${data.after})`);
    assert.match(data.txt, /Resultado 42/, `tras success el item debe mostrar "Resultado 42" (vimos "${data.txt}")`);
    assert.equal(data.color, 'success', `tras success el color debe ser success (vimos "${data.color}")`);
  },
});

let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('toast', failures === 0, { total: tests.length, failures });
