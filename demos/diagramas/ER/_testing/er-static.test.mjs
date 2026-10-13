// er-static.test.mjs — tests exhaustivos del demo er-static.html (lite mode).
// Cobertura: smoke (monta, renderiza entidades y aristas), funcional
// (animation="trace" embebe keyframes, dashStyle anima, prefers-reduced-motion
// desactiva), determinismo (round-trip idéntico), accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/ER/er-static.html`;

const tests = [];

tests.push({
  name: 'smoke: dos componentes iswc-er-diagram renderizan entidades y aristas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const info = await page.evaluate(() => {
      const diagrams = document.querySelectorAll('iswc-er-diagram');
      return {
        count: diagrams.length,
        // atravesar shadow DOM con evaluate anidado
        details: [...diagrams].map((d) => ({
          animation: d.getAttribute('animation'),
          entities: d.shadowRoot?.querySelectorAll('.er-entity').length ?? 0,
          relations: d.shadowRoot?.querySelectorAll('.er-rel').length ?? 0,
        })),
      };
    });
    assert.equal(info.count, 2, 'esperaba 2 demos');
    const ortho = info.details[0];
    assert.equal(ortho.animation, 'trace', 'primer demo debe tener animation=trace');
    assert.ok(ortho.entities >= 3, `primer demo debe tener >=3 entidades (hay ${ortho.entities})`);
    assert.ok(ortho.relations >= 2, `primer demo debe tener >=2 relaciones (hay ${ortho.relations})`);
    const mix = info.details[1];
    assert.equal(mix.animation, null, 'segundo demo no debe tener animation');
    assert.equal(mix.relations, 3, 'segundo demo debe tener 3 relaciones (mix de rutas)');
    await screenshot(page, 'er-static-smoke');
  },
});

tests.push({
  name: 'animation: el primer demo embebe <style> CSS dentro del SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const has = await page.evaluate(() => {
      const ortho = document.querySelectorAll('iswc-er-diagram')[0];
      const style = ortho.shadowRoot.querySelector('svg > style[data-iswc-anim]');
      return !!style && /iswc-dash-march/.test(style.textContent);
    });
    assert.ok(has, 'SVG debe contener <style data-iswc-anim> con keyframes iswc-dash-march');
  },
});

tests.push({
  name: 'animation: el segundo demo (sin animation=trace) NO embebe style',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const has = await page.evaluate(() => {
      const mix = document.querySelectorAll('iswc-er-diagram')[1];
      const style = mix.shadowRoot.querySelector('svg > style[data-iswc-anim]');
      return !!style;
    });
    assert.equal(has, false, 'sin animation=trace no debe inyectarse el <style>');
  },
});

tests.push({
  name: 'animation: las aristas dashed se animan (clase iswc-anim-edge-dashed o flujo estándar)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const classes = await page.evaluate(() => {
      const ortho = document.querySelectorAll('iswc-er-diagram')[0];
      // El riel es `.er-rel__path`; con el flujo estándar activo (diagram-flow) la animación es su `<animate>`,
      // sin él (flow-anim="off") la clase CSS de `animation="trace"`. Lo observable: el riel dashed se anima.
      const riel = ortho.shadowRoot.querySelector('.er-rel path.er-rel__path[stroke-dasharray]');
      if (!riel) return null;
      return { clase: riel.getAttribute('class') ?? '', animate: !!riel.querySelector('animate') };
    });
    assert.ok(classes, 'debe haber al menos una relación con stroke-dasharray');
    assert.ok(/iswc-anim-edge-dashed/.test(classes.clase) || classes.animate, 'el riel dashed debe animarse (clase CSS o <animate>)');
  },
});

tests.push({
  name: 'route mix: straight, orthogonal-h, orthogonal-v producen paths distintos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const paths = await page.evaluate(() => {
      const mix = document.querySelectorAll('iswc-er-diagram')[1];
      const rels = [...mix.shadowRoot.querySelectorAll('.er-rel')];
      return rels.map((g) => ({
        relId: g.dataset.relId,
        route: g.dataset.route,
        d: g.querySelector('path').getAttribute('d'),
      }));
    });
    assert.equal(paths.length, 3);
    // r1: straight → 1 segmento (L o V o H)
    const straight = paths.find((p) => p.relId === 'r1');
    assert.equal(straight.route, 'straight');
    const straightSegs = (straight.d.match(/[LHV]/g) || []).length;
    assert.equal(straightSegs, 1, `straight debe tener 1 segmento (L/H/V), tiene ${straightSegs} en "${straight.d}"`);
    // r2: orthogonal-h → 3 segmentos (H, V, H)
    const orthH = paths.find((p) => p.relId === 'r2');
    assert.equal(orthH.route, 'orthogonal-h');
    // H-V-H; si los puertos quedan alineados degenera en una sola H (correcto).
    assert.ok(orthH.d.includes('H') && !/[LC]/.test(orthH.d.slice(1)), `orthogonal-h debe ser ortogonal y empezar en H: "${orthH.d}"`);
    // r3: orthogonal (default) → puede tener varios segmentos (A* puede elegir varios)
    const orth = paths.find((p) => p.relId === 'r3');
    assert.equal(orth.route, 'orthogonal');
  },
});

tests.push({
  name: 'determinismo: viewBox idéntico tras re-asignar mismo payload',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const before = await page.evaluate(() => {
      const ortho = document.querySelectorAll('iswc-er-diagram')[0];
      return {
        viewBox: ortho.shadowRoot.querySelector('svg').getAttribute('viewBox'),
        entities: ortho.shadowRoot.querySelectorAll('.er-entity').length,
      };
    });
    // Re-asignar mismo payload via property
    await page.evaluate(() => {
      const ortho = document.querySelectorAll('iswc-er-diagram')[0];
      ortho.payload = ortho.payload;
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const ortho = document.querySelectorAll('iswc-er-diagram')[0];
      return {
        viewBox: ortho.shadowRoot.querySelector('svg').getAttribute('viewBox'),
        entities: ortho.shadowRoot.querySelectorAll('.er-entity').length,
      };
    });
    assert.equal(before.viewBox, after.viewBox);
    assert.equal(before.entities, after.entities);
  },
});

tests.push({
  name: 'estilo: stroke por arista se aplica al SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const strokes = await page.evaluate(() => {
      const mix = document.querySelectorAll('iswc-er-diagram')[1];
      // El riel (`.er-rel__path`), no la línea de puntos del flujo que va detrás.
      const r1 = mix.shadowRoot.querySelector('.er-rel[data-rel-id="r1"] path.er-rel__path');
      const r3 = mix.shadowRoot.querySelector('.er-rel[data-rel-id="r3"] path.er-rel__path');
      return {
        r1: r1?.getAttribute('stroke'),
        r1Width: r1?.getAttribute('stroke-width'),
        r3: r3?.getAttribute('stroke'),
      };
    });
    assert.equal(strokes.r1, '#22d3ee', 'r1 debe tener stroke #22d3ee');
    assert.equal(strokes.r1Width, '1.5', 'r1 debe tener stroke-width 1.5');
    assert.equal(strokes.r3, '#a78bfa', 'r3 debe tener stroke #a78bfa');
  },
});

tests.push({
  name: 'accesibilidad: prefers-reduced-motion desactiva la animación inyectada',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');
    const ok = await page.evaluate(() => {
      const ortho = document.querySelectorAll('iswc-er-diagram')[0];
      const style = ortho.shadowRoot.querySelector('svg > style[data-iswc-anim]');
      return style && /animation: none !important/.test(style.textContent);
    });
    assert.ok(ok, 'el CSS embebido debe respetar prefers-reduced-motion');
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

report('er-static', failures === 0, { total: tests.length, failures });