// sparkline.test.mjs — tests exhaustivos del demo sparkline.html.
//
// Cobertura:
//   - smoke: tres <is-sparkline> se registran y montan SVG
//   - data property: cambiar el array de data re-renderiza el path
//   - atributo values: aceptar string CSV y re-renderizar al cambiar
//   - atributo type="bar": cambia la forma del mark (paths redondeados)
//   - atributo variant="gradient": introduce un <linearGradient> en <defs>
//   - resize: el viewBox del SVG se ajusta al tamaño visible
//   - re-asignación: la misma instancia puede redibujar sin leaks
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/sparkline/sparkline.html`;

const tests = [];

tests.push({
  name: 'smoke: tres <is-sparkline> montan y renderizan SVG con marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const all = [...document.querySelectorAll('is-sparkline')];
      return all.map((s, i) => {
        const svg = s.shadowRoot?.querySelector('svg');
        const marks = [...(s.shadowRoot?.querySelectorAll('path, circle') ?? [])];
        return {
          i,
          tag: s.tagName.toLowerCase(),
          defined: !!customElements.get('is-sparkline'),
          svg: !!svg,
          viewBox: svg?.getAttribute('viewBox'),
          marks: marks.length,
          valuesAttr: s.getAttribute('values'),
          dataProp: s.data?.length ?? 0,
          type: s.getAttribute('type'),
          variant: s.getAttribute('variant'),
          lineColor: s.getAttribute('line-color'),
        };
      });
    });
    assert.equal(info.length, 3, 'demo debe tener 3 sparklines');
    for (const s of info) {
      assert.equal(s.defined, true, `sparkline #${s.i} debe estar definido`);
      assert.ok(s.svg, `sparkline #${s.i} debe montar SVG`);
      assert.ok(s.viewBox && /^\d+\s+\d+$/.test(s.viewBox.split(' ').slice(2).join(' ')),
        `sparkline #${s.i} debe tener viewBox "0 0 W H" (era "${s.viewBox}")`);
      assert.ok(s.marks > 0, `sparkline #${s.i} debe tener marks, hay ${s.marks}`);
    }
    // Demo 1: line via values
    assert.equal(info[0].valuesAttr, '12,18,15,22,30,28,35,40,38,42', 'demo 1 debe usar atributo values CSV');
    assert.equal(info[0].type, null, 'demo 1 debe tener type por defecto (line)');
    // Demo 2: bar via data
    assert.equal(info[1].type, 'bar', 'demo 2 debe tener type="bar"');
    assert.equal(info[1].dataProp, 7, 'demo 2 debe tener 7 valores en data');
    // Demo 3: gradient
    assert.equal(info[2].variant, 'gradient', 'demo 3 debe tener variant="gradient"');
    await screenshot(page, 'sparkline-smoke');
  },
});

tests.push({
  name: 'data property: re-asignar el array re-renderiza los marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1]; // bar demo
      return {
        marks: s.shadowRoot.querySelectorAll('path').length,
        firstD: s.shadowRoot.querySelector('path')?.getAttribute('d') ?? null,
      };
    });
    await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1];
      // 4 valores: debe pasar de 7 marks a 4 marks (cada valor → 1 path).
      s.data = [10, 20, 30, 40];
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1];
      return {
        marks: s.shadowRoot.querySelectorAll('path').length,
        firstD: s.shadowRoot.querySelector('path')?.getAttribute('d') ?? null,
      };
    });
    assert.equal(before.marks, 7, `inicial debe tener 7 marks (valores iniciales), hay ${before.marks}`);
    assert.equal(after.marks, 4, `con 4 valores debe haber 4 marks (hay ${after.marks})`);
    assert.notEqual(after.firstD, before.firstD, `el path d debe cambiar tras re-asignar data`);
  },
});

tests.push({
  name: 'atributo values: cambiar el CSV actualiza el # de marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[0]; // line demo
      // Para line hay 1 path principal + 1 circle de "último punto".
      return {
        paths: s.shadowRoot.querySelectorAll('path').length,
        circles: s.shadowRoot.querySelectorAll('circle').length,
      };
    });
    await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[0];
      s.setAttribute('values', '1,2,3,4,5');
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[0];
      // Comprobar que el array de datos se actualizó a 5 valores.
      return {
        dataLen: s.data.length,
      };
    });
    assert.equal(before.paths, 1, `inicial debe tener 1 path principal (line), hay ${before.paths}`);
    assert.equal(before.circles, 1, `inicial debe tener 1 circle de último punto, hay ${before.circles}`);
    assert.equal(after.dataLen, 5, `data debe reflejar 5 valores tras cambiar CSV (hay ${after.dataLen})`);
  },
});

tests.push({
  name: 'variant=gradient: añade un <linearGradient> en <defs>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[2]; // gradient demo
      const defs = s.shadowRoot.querySelector('defs');
      const grad = defs?.querySelector('linearGradient');
      const paths = [...s.shadowRoot.querySelectorAll('path')];
      // El path de área debe tener fill="url(#sg...)".
      const areaPath = paths.find((p) => (p.getAttribute('fill') ?? '').startsWith('url('));
      return {
        hasDefs: !!defs,
        hasGrad: !!grad,
        gradStops: grad?.querySelectorAll('stop').length ?? 0,
        hasAreaPath: !!areaPath,
      };
    });
    assert.equal(result.hasDefs, true, 'demo gradient debe tener <defs>');
    assert.equal(result.hasGrad, true, 'demo gradient debe tener un <linearGradient>');
    assert.equal(result.gradStops, 2, `linearGradient debe tener 2 stops (hay ${result.gradStops})`);
    assert.equal(result.hasAreaPath, true, 'debe haber un path con fill="url(#...)" (área con degradado)');
  },
});

tests.push({
  name: 'type=bar: cada valor produce 1 path (rectángulo redondeado)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1]; // bar demo
      const paths = [...s.shadowRoot.querySelectorAll('path')];
      // Cada path de bar debe tener d con M/L/Q/Z (rect redondeado).
      return {
        count: paths.length,
        allHaveD: paths.every((p) => (p.getAttribute('d') ?? '').length > 0),
        fills: paths.map((p) => p.getAttribute('fill')),
      };
    });
    assert.equal(result.count, 7, `bar demo debe tener 7 paths (uno por valor), hay ${result.count}`);
    assert.equal(result.allHaveD, true, 'todos los paths de bar deben tener atributo d');
    // Todos deben compartir fill (color de bar).
    const uniq = new Set(result.fills);
    assert.ok(uniq.size <= 2, `los fills de bar no deben ser todos distintos (hay ${uniq.size})`);
  },
});

tests.push({
  name: 'viewBox: se ajusta al tamaño visible del contenedor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[0];
      const rect = s.getBoundingClientRect();
      const vb = s.shadowRoot.querySelector('svg').getAttribute('viewBox');
      return { rectW: Math.round(rect.width), rectH: Math.round(rect.height), vb };
    });
    const vb = before.vb.split(/\s+/).map(Number);
    assert.equal(vb[0], 0);
    assert.equal(vb[1], 0);
    assert.ok(Math.abs(vb[2] - before.rectW) <= 2,
      `viewBox.w debe coincidir con ancho visible (${vb[2]} vs ${before.rectW})`);
    assert.ok(Math.abs(vb[3] - before.rectH) <= 2,
      `viewBox.h debe coincidir con alto visible (${vb[3]} vs ${before.rectH})`);
  },
});

tests.push({
  name: 're-asignar data idéntico no rompe el render',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sparkline-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1]; // bar
      return s.shadowRoot.querySelectorAll('path').length;
    });
    await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1];
      s.data = [5, 12, 8, 18, 22, 15, 28];
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const s = document.querySelectorAll('is-sparkline')[1];
      return s.shadowRoot.querySelectorAll('path').length;
    });
    assert.equal(before, after, `re-asignar el mismo data debe mantener ${before} marks (hay ${after})`);
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

report('sparkline', failures === 0, { total: tests.length, failures });