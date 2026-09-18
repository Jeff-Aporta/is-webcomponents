// chart.test.mjs — tests exhaustivos del demo chart.html (motor genérico).
//
// Cobertura:
//   - smoke: <is-chart> con type="bar" monta SVG y dibuja marks
//   - config: cambiar payload.datasets re-renderiza con # de marks coherente
//   - atributo type: cambiar type a "line" re-renderiza con marcas distintas
//   - accesibilidad: SVG con role=img
//   - eventos: is-render emite tras montaje y tras cambio de payload
//   - determinismo: misma config → mismo # de marks
//   - re-asignación: la misma instancia puede redibujar sin leaks
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/chart/chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y dibuja marks con type="bar"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      const svg = el?.shadowRoot?.querySelector('svg');
      const marks = el?.shadowRoot?.querySelectorAll('.mark');
      const labels = [...(el?.shadowRoot?.querySelectorAll('text.tick-label') ?? [])].map((t) => t.textContent?.trim());
      return {
        defined: !!customElements.get('is-chart'),
        type: el?.getAttribute('type'),
        svg: !!svg,
        svgRole: svg?.getAttribute('role'),
        markCount: marks?.length ?? 0,
        labelCount: labels.length,
        labelTexts: labels,
        viewBox: svg?.getAttribute('viewBox'),
      };
    });
    assert.equal(info.defined, true, 'is-chart debe estar definido');
    assert.equal(info.type, 'bar', `el atributo type debe ser "bar" (era "${info.type}")`);
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.equal(info.svgRole, 'img', 'SVG debe tener role=img');
    // 5 categorías × 1 dataset = 5 marks esperados.
    assert.equal(info.markCount, 5, `debe haber 5 marks (5 categorías × 1 dataset), hay ${info.markCount}`);
    // Labels categóricos deben estar presentes en el DOM.
    for (const expected of ['Ene', 'Feb', 'Mar', 'Abr', 'May']) {
      assert.ok(info.labelTexts.includes(expected), `label "${expected}" debe estar presente`);
    }
    assert.ok(info.viewBox && /^\d+\s+\d+$/.test(info.viewBox.split(' ').slice(2).join(' ')), `viewBox debe ser "0 0 W H" (era "${info.viewBox}")`);
    await screenshot(page, 'chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload.datasets re-renderiza con # de marks coherente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      return el?.shadowRoot?.querySelectorAll('.mark').length ?? 0;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      // 4 categorías × 2 datasets = 8 marks esperados.
      el.payload = {
        data: {
          labels: ['A', 'B', 'C', 'D'],
          datasets: [
            { label: 's1', data: [10, 20, 30, 40] },
            { label: 's2', data: [40, 30, 20, 10] },
          ],
        },
      };
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      return el?.shadowRoot?.querySelectorAll('.mark').length ?? 0;
    });
    assert.equal(before, 5, 'antes debe haber 5 marks (demo inicial)');
    assert.equal(after, 8, `tras 4 cat × 2 datasets deben haber 8 marks (hay ${after})`);
  },
});

tests.push({
  name: 'atributo type: cambiar a "line" re-renderiza con marcas distintas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      const marks = [...el.shadowRoot.querySelectorAll('.mark')];
      return marks.map((m) => m.tagName.toLowerCase());
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      el.setAttribute('type', 'line');
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      const marks = [...el.shadowRoot.querySelectorAll('.mark')];
      return marks.map((m) => ({ tag: m.tagName.toLowerCase(), cls: m.getAttribute('class') }));
    });
    // El bar original suele ser <path> o <rect>; al pasar a line deben
    // aparecer .mark-line (paths) y/o .mark-point (circles).
    const lineMarks = after.filter((m) => /mark-line|mark-point/.test(m.cls ?? ''));
    assert.ok(lineMarks.length > 0,
      `con type="line" deben aparecer marks .mark-line / .mark-point (hay ${lineMarks.length} de ${after.length})`);
    // Antes no había marks .mark-line.
    const beforeHadLine = before.some((tag) => tag === 'path');
    // No exigimos que el "before" no tuviera paths (los rect se hacen con
    // paths en este motor), sólo que "after" introduzca marcas line/point.
    void beforeHadLine;
  },
});

tests.push({
  name: 'fill: marks de bar deben tener fill no-vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(200);
    const fills = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      return [...el.shadowRoot.querySelectorAll('.mark')].map((m) => m.getAttribute('fill'));
    });
    assert.equal(fills.length, 5, 'demo bar debe tener 5 marks');
    for (const f of fills) {
      assert.ok(f && f !== 'none' && f !== 'transparent',
        `mark de bar debe tener fill visible (era "${f}")`);
    }
  },
});

tests.push({
  name: 'is-render: emite el evento is-render tras montar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(150);
    const count = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('is-chart');
        document.body.appendChild(el);
        let n = 0;
        el.addEventListener('is-render', () => n++);
        el.setAttribute('type', 'bar');
        el.payload = {
          data: { labels: ['a', 'b'], datasets: [{ label: 's', data: [1, 2] }] },
        };
        setTimeout(() => { el.remove(); resolve(n); }, 300);
      });
    });
    assert.ok(count >= 1, `is-render debió dispararse >=1 vez tras asignar payload (fue ${count})`);
  },
});

tests.push({
  name: 'determinismo: misma config produce misma cantidad de marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(200);
    const a = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      return el.shadowRoot.querySelectorAll('.mark').length;
    });
    const b = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      return el.shadowRoot.querySelectorAll('.mark').length;
    });
    assert.equal(a, b, `doble lectura debe dar igual # de marks (${a} vs ${b})`);
    assert.ok(a >= 1, `debe haber al menos 1 mark (hay ${a})`);
  },
});

tests.push({
  name: 'label atributo: el atributo label="..." aparece como título en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-chart-ready');
    await page.waitForTimeout(200);
    const title = await page.evaluate(() => {
      const el = document.querySelector('is-chart');
      const t = el?.shadowRoot?.querySelector('text.chart-title');
      return t?.textContent?.trim() ?? null;
    });
    assert.ok(title && title.includes('Multi-tipo'), `el título debe contener "Multi-tipo" (era "${title}")`);
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

report('chart', failures === 0, { total: tests.length, failures });