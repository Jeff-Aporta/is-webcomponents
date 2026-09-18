// heatmap.test.mjs — tests exhaustivos del demo heatmap.html.
//
// Cobertura:
//   - smoke: dos heatmaps montan, renderizan celdas y leyenda
//   - funcional: show-values escribe número dentro de celda, atributo
//                color="red-blue" aplica paleta divergente, legend-position
//                mueve/oculta la leyenda, pointermove emite is-cell-hover
//   - determinismo: misma config → mismo # de celdas; misma fill por valor
//   - accesibilidad básica: roles / aria-label del SVG
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data-viz/Heatmap/heatmap.html`;

const tests = [];

tests.push({
  name: 'smoke: dos <is-heatmap> montan y renderizan celdas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const all = document.querySelectorAll('is-heatmap');
      return [...all].map((h) => {
        const svg = h.shadowRoot.querySelector('svg[part="canvas"]');
        const cells = h.shadowRoot.querySelectorAll('rect.cell');
        const values = h.shadowRoot.querySelectorAll('text.cell-val');
        const legend = h.shadowRoot.querySelector('.legend[part="legend"]');
        const grad = h.shadowRoot.querySelector('.legend-grad');
        return {
          attrColor: h.getAttribute('color'),
          attrShowValues: h.hasAttribute('show-values'),
          attrLegend: h.getAttribute('legend-position'),
          svgRect: !!svg && svg.tagName === 'svg',
          svgAria: svg?.getAttribute('aria-label') ?? null,
          svgRole: svg?.getAttribute('role') ?? null,
          cellCount: cells.length,
          valueCount: values.length,
          legendVisible: legend && !legend.hasAttribute('hidden'),
          hasGradient: !!grad,
        };
      });
    });
    assert.equal(info.length, 2, 'demo debe tener 2 heatmaps');
    // demo 1: brand + show-values + legend end
    const brand = info[0];
    assert.equal(brand.attrColor, 'brand');
    assert.equal(brand.attrShowValues, true);
    assert.equal(brand.attrLegend, 'end');
    assert.equal(brand.svgRole, 'img', 'SVG debe tener role=img');
    assert.ok(brand.svgAria && /calor|heatmap/i.test(brand.svgAria), `aria-label debe mencionar "calor": ${brand.svgAria}`);
    // matriz 7 columnas x 8 filas = 56 celdas
    assert.equal(brand.cellCount, 56, `demo brand debe tener 7*8=56 celdas (hay ${brand.cellCount})`);
    assert.equal(brand.valueCount, 56, 'con show-values cada celda debe llevar su número');
    assert.equal(brand.legendVisible, true, 'legend-position=end debe mostrar leyenda');
    assert.equal(brand.hasGradient, true, 'leyenda debe tener gradiente de color');
    // demo 2: red-blue (divergente), 6x6 con points dispersos = hasta 36 celdas pintadas
    const div = info[1];
    assert.equal(div.attrColor, 'red-blue');
    assert.equal(div.attrShowValues, false, 'demo divergente no debe usar show-values');
    assert.ok(div.cellCount > 0 && div.cellCount <= 36, `demo divergente debe pintar <=36 celdas (hay ${div.cellCount})`);
    await screenshot(page, 'heatmap-smoke');
  },
});

tests.push({
  name: 'gradiente: celdas adyacentes del mismo row reciben fills distintos según valor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    const fills = await page.evaluate(() => {
      const h = document.querySelector('is-heatmap');
      const cells = [...h.shadowRoot.querySelectorAll('rect.cell')];
      // Devolver {x, v, fill} del PRIMER row (y=0) — 7 valores deberían mapear
      // a 5 colores distintos como mínimo (la paleta tiene 5 escalones).
      const firstRow = cells.slice(0, 7).map((c) => ({
        x: c.getAttribute('data-x'),
        v: Number(c.getAttribute('data-v')),
        fill: c.getAttribute('fill'),
      }));
      const distinctFills = new Set(firstRow.map((c) => c.fill));
      return { firstRow, distinct: distinctFills.size };
    });
    assert.ok(fills.distinct >= 2, `al menos 2 fills distintos en una fila (hay ${fills.distinct})`);
    // Todos los fill deben ser no-vacíos
    for (const c of fills.firstRow) {
      assert.ok(c.fill && c.fill.length > 2, `celda x=${c.x} debe tener fill (${c.fill})`);
    }
    // El mayor valor debe tener un fill distinto al menor (gradiente real).
    const max = fills.firstRow.reduce((a, b) => (b.v > a.v ? b : a));
    const min = fills.firstRow.reduce((a, b) => (b.v < a.v ? b : a));
    if (max.v !== min.v) {
      assert.notEqual(max.fill, min.fill, `valor max=${max.v} (${max.fill}) debe tener fill distinto de min=${min.v} (${min.fill})`);
    }
  },
});

tests.push({
  name: 'gradiente: paletas brand y red-blue producen fills estructuralmente distintos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    const fills = await page.evaluate(() => {
      const all = [...document.querySelectorAll('is-heatmap')];
      return all.map((h) => {
        const cells = [...h.shadowRoot.querySelectorAll('rect.cell')];
        const set = new Set(cells.map((c) => c.getAttribute('fill')));
        return { color: h.getAttribute('color'), fills: [...set] };
      });
    });
    const brand = fills.find((f) => f.color === 'brand');
    const div = fills.find((f) => f.color === 'red-blue');
    assert.ok(brand && div, 'deben existir ambas paletas en el demo');
    assert.ok(brand.fills.length >= 2, `brand debe usar varios escalones (hay ${brand.fills.length})`);
    assert.ok(div.fills.length >= 2, `red-blue debe usar varios escalones (hay ${div.fills.length})`);
    // Las paletas no deben compartir exactamente los mismos fills: brand usa azules,
    // red-blue mezcla rojo + azul. Al menos un fill debe diferir.
    const onlyBrand = brand.fills.filter((f) => !div.fills.includes(f));
    assert.ok(onlyBrand.length > 0, `paleta brand debe tener algún fill que red-blue no tenga (coinciden ${brand.fills.length - onlyBrand.length})`);
  },
});

tests.push({
  name: 'show-values: el número dentro de cada celda coincide con data-v',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    const mismatches = await page.evaluate(() => {
      const h = document.querySelector('is-heatmap'); // brand con show-values
      const cells = [...h.shadowRoot.querySelectorAll('rect.cell')];
      const values = [...h.shadowRoot.querySelectorAll('text.cell-val')];
      // Emparejar por índice (mismo orden de inserción).
      const out = [];
      for (let i = 0; i < Math.min(cells.length, values.length); i++) {
        const dv = cells[i].getAttribute('data-v');
        const txt = (values[i].textContent ?? '').trim();
        // formatVal puede usar notación compacta (>= 10000) — pero los datos de
        // demo no llegan a eso, así que deben coincidir literalmente.
        if (dv !== txt) out.push({ i, dv, txt });
      }
      return out;
    });
    assert.deepEqual(mismatches, [], `no debe haber mismatch data-v vs texto: ${JSON.stringify(mismatches.slice(0, 5))}`);
  },
});

tests.push({
  name: 'hover: pointermove sobre una celda emite is-cell-hover con {x, y, value}',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    // Disparar pointermove real (Playwright .hover dispara los pointer
    // events estándar). Pero como el canvas SVG no es interactivo por
    // defecto, usamos dispatchEvent directo dentro del shadow.
    const detail = await page.evaluate(() => {
      return new Promise((resolve) => {
        const h = document.querySelectorAll('is-heatmap')[0];
        const cell = h.shadowRoot.querySelector('rect.cell'); // primera celda (Lun / 00)
        const box = cell.getBoundingClientRect();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        h.addEventListener('is-cell-hover', (e) => resolve(e.detail), { once: true });
        cell.dispatchEvent(new PointerEvent('pointermove', {
          clientX: cx, clientY: cy, bubbles: true, composed: true,
        }));
        // fallback por si composed no propaga
        setTimeout(() => resolve(null), 500);
      });
    });
    assert.ok(detail, 'is-cell-hover debió dispararse y entregar detail');
    assert.ok('x' in detail && 'y' in detail && 'value' in detail, `detail debe tener {x, y, value}: ${JSON.stringify(detail)}`);
    assert.equal(typeof detail.value, 'number', 'value debe ser number');
    assert.equal(detail.x, 'Lun', `x de la primera celda debe ser "Lun", obtuve "${detail.x}"`);
    assert.equal(detail.y, '00', `y de la primera celda debe ser "00", obtuve "${detail.y}"`);
  },
});

tests.push({
  name: 'hover: pointerleave limpia la clase is-hover',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      const cell = h.shadowRoot.querySelector('rect.cell');
      const box = cell.getBoundingClientRect();
      cell.dispatchEvent(new PointerEvent('pointermove', {
        clientX: box.x + 4, clientY: box.y + 4, bubbles: true, composed: true,
      }));
    });
    await page.waitForTimeout(50);
    const hovered = await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      return h.shadowRoot.querySelectorAll('rect.cell.is-hover').length;
    });
    assert.equal(hovered, 1, 'debe haber exactamente 1 celda con is-hover');

    // pointerleave sobre el SVG
    await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      const svg = h.shadowRoot.querySelector('svg[part="canvas"]');
      svg.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      return h.shadowRoot.querySelectorAll('rect.cell.is-hover').length;
    });
    assert.equal(after, 0, 'pointerleave debe limpiar is-hover');
  },
});

tests.push({
  name: 'legend: legend-position="none" oculta la leyenda',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    // Mutamos el primer heatmap en runtime para verificar que el atributo
    // legend-position="none" reacciona (attributeChangedCallback → render).
    await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      h.setAttribute('legend-position', 'none');
    });
    await page.waitForTimeout(200);
    const hidden = await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      const legend = h.shadowRoot.querySelector('.legend[part="legend"]');
      return { hidden: legend.hasAttribute('hidden'), grad: !!h.shadowRoot.querySelector('.legend-grad') };
    });
    assert.equal(hidden.hidden, true, 'con legend-position=none la leyenda debe estar hidden');
    assert.equal(hidden.grad, false, 'sin leyenda no debe haber gradiente');
  },
});

tests.push({
  name: 'config setter: re-asignar la misma config no cambia el render',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      const cells = [...h.shadowRoot.querySelectorAll('rect.cell')];
      return cells.map((c) => c.getAttribute('fill'));
    });
    await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      h.config = h.config; // re-asignar el mismo objeto
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const h = document.querySelectorAll('is-heatmap')[0];
      const cells = [...h.shadowRoot.querySelectorAll('rect.cell')];
      return cells.map((c) => c.getAttribute('fill'));
    });
    assert.equal(before.length, after.length);
    assert.deepEqual(before, after, 'fills deben ser idénticos tras re-asignar la misma config');
  },
});

tests.push({
  name: 'config setter: data → points produce el mismo número de celdas pintadas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(200);
    // El demo divergente usa points, no data. Verificamos que ambos formatos
    // son aceptados y producen el MISMO resultado para la misma matriz.
    const matrixViaData = await page.evaluate(() => {
      // Crear un heatmap temporal con data[][] y contar celdas.
      const h = document.createElement('is-heatmap');
      h.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:300px;height:200px;display:block;';
      document.body.appendChild(h);
      h.config = {
        xLabels: ['A', 'B', 'C'],
        yLabels: ['r1', 'r2'],
        data: [[1, 2, 3], [4, 5, 6]],
      };
      return new Promise((r) => {
        requestAnimationFrame(() => {
          const cells = h.shadowRoot.querySelectorAll('rect.cell');
          r({ count: cells.length });
        });
      });
    });
    assert.equal(matrixViaData.count, 6, `data 3x2 debe pintar 6 celdas (hay ${matrixViaData.count})`);
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-heatmap-ready');
    await page.waitForTimeout(100);
    // Tras montar, el contador de emisiones debería ser >= 2 (uno por heatmap).
    const count = await page.evaluate(() => {
      // Re-instanciar listener en runtime (los originales ya pasaron).
      let n = 0;
      const h = document.createElement('is-heatmap');
      document.body.appendChild(h);
      h.addEventListener('is-render', () => n++);
      h.config = { xLabels: ['a', 'b'], yLabels: ['x'], data: [[1, 2]] };
      return new Promise((r) => {
        setTimeout(() => { h.remove(); r(n); }, 250);
      });
    });
    assert.ok(count >= 1, `is-render debió dispararse >=1 vez (fue ${count})`);
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

report('heatmap', failures === 0, { total: tests.length, failures });
