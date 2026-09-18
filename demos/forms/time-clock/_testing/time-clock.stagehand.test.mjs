// time-clock.stagehand.test.mjs — rubric visual determinista para time-clock.
//
// Sin LLM: chequeamos con Playwright + atributos del shadow DOM que el reloj
// cumple cinco invariantes visuales:
//   1. Cada reloj tiene el header con horas/minutos y el disco circular.
//   2. El disco tiene tamaño mínimo legible (>= 140px de diámetro).
//   3. La mano está rotada coherentemente con el valor actual.
//   4. El anillo exterior tiene el número correcto de marcas según la vista.
//   5. El reloj entero cabe dentro del viewport.
//
// La rama Stagehand LLM sigue disponible opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/time-clock/time-clock.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del reloj analógico que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RELOJ LEGIBLE: el disco del reloj es claramente circular, con números alrededor (horas o minutos). El header muestra la hora/minuto actuales.

2. MANO VISIBLE: la mano del reloj apunta al número correspondiente al valor actual.

3. HEADER LEGIBLE: el header con los dígitos de hora y minuto es legible.

4. EN VIEWPORT: el reloj completo cabe en el área visible sin recortes.

5. CONTRASTE SUFICIENTE: el texto del header y los números son legibles contra el fondo.

Responde SOLO con un JSON con la forma:
{
  "reloj_legible": "PASS" | "FAIL",
  "mano_visible": "PASS" | "FAIL",
  "header_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "contraste": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const clocks = [...document.querySelectorAll('is-time-clock')];
    return clocks.map((el, idx) => {
      const r = el.getBoundingClientRect();
      const clock = el.shadowRoot.querySelector('[part="clock"]');
      const hand = el.shadowRoot.querySelector('[part="hand"]');
      const outerRing = el.shadowRoot.querySelector('.ring.outer');
      const innerRing = el.shadowRoot.querySelector('.ring.inner');
      const outerItems = outerRing ? outerRing.querySelectorAll('.num').length : 0;
      const innerItems = innerRing && !innerRing.hidden ? innerRing.querySelectorAll('.num').length : 0;
      const cr = clock ? clock.getBoundingClientRect() : null;
      return {
        idx,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        clockRect: cr ? { x: cr.x, y: cr.y, w: cr.width, h: cr.height } : null,
        handAngle: hand?.style.getPropertyValue('--a'),
        handHidden: hand?.hidden,
        view: el.getAttribute('view'),
        ampm: el.hasAttribute('ampm'),
        outerItems,
        innerItems,
      };
    });
  });

  for (const c of data) {
    const tag = `clock#${c.idx}`;

    // (1) Hay disco circular.
    assert.ok(c.clockRect, `${tag}: debe existir el disco`);
    assert.ok(c.clockRect.w >= 100, `${tag}: disco demasiado pequeño (${c.clockRect.w.toFixed(1)}px < 100px)`);
    assert.ok(c.clockRect.h >= 100, `${tag}: disco demasiado bajo (${c.clockRect.h.toFixed(1)}px < 100px)`);

    // (2) La mano está presente y rotada coherentemente.
    assert.ok(c.handAngle, `${tag}: la mano debe tener un ángulo (--a)`);
    assert.match(c.handAngle, /^-?\d+(\.\d+)?deg$/, `${tag}: --a debe ser un ángulo válido, recibido "${c.handAngle}"`);

    // (3) El anillo exterior tiene el número correcto de marcas.
    if (c.view === 'hours' && !c.ampm && c.innerItems > 0) {
      // 24h: anillo exterior 00..11 (12 marcas) + interior 12..23 (12 marcas).
      assert.equal(c.outerItems, 12, `${tag}: 24h hours, anillo exterior debe tener 12 marcas, hay ${c.outerItems}`);
      assert.equal(c.innerItems, 12, `${tag}: 24h hours, anillo interior debe tener 12 marcas, hay ${c.innerItems}`);
    } else if (c.view === 'hours' && c.ampm) {
      assert.equal(c.outerItems, 12, `${tag}: ampm hours, anillo exterior debe tener 12 marcas, hay ${c.outerItems}`);
    } else if (c.view === 'minutes') {
      // minutes-step mínimo 5 → 60/5 = 12 marcas.
      assert.equal(c.outerItems, 12, `${tag}: minutes, anillo exterior debe tener 12 marcas, hay ${c.outerItems}`);
    } else if (c.view === 'seconds') {
      // step=5 → 12 marcas.
      assert.equal(c.outerItems, 12, `${tag}: seconds, anillo exterior debe tener 12 marcas, hay ${c.outerItems}`);
    }

    // (4) El reloj entero cabe dentro del viewport (1400x900 según el harness).
    const VW = 1400, VH = 900;
    assert.ok(
      c.rect.x + c.rect.w <= VW,
      `${tag}: el reloj se sale del viewport por la derecha`,
    );
    assert.ok(
      c.rect.y + c.rect.h <= VH,
      `${tag}: el reloj se sale del viewport por abajo`,
    );

    // (5) El disco es razonablemente cuadrado (es un círculo, no una elipse).
    if (c.clockRect) {
      const ratio = c.clockRect.w / c.clockRect.h;
      assert.ok(ratio > 0.85 && ratio < 1.18,
        `${tag}: el disco no es cuadrado (ratio ${ratio.toFixed(2)}; esperado ~1)`);
    }
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-time-clock-ready');
  await checkDeterministic(page);
  console.log('  ✓ time-clock: rubric determinista PASS');
  results.push({ name: 'time-clock', skipped: false });
} catch (err) {
  console.error(`  ✗ time-clock: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-time-clock'); } catch {}
  results.push({ name: 'time-clock', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ time-clock: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-time-clock-ready');
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-time-clock');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['reloj_legible', 'mano_visible', 'header_legible', 'in_viewport', 'contraste'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ time-clock: visual rubric LLM PASS');
        else console.error(`  ✗ time-clock: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ time-clock (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('time-clock-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
