// time-field.stagehand.test.mjs — rubric visual determinista para time-field.
//
// Sin LLM: chequeamos con Playwright + atributos del shadow DOM que el campo
// cumple cinco invariantes visuales:
//   1. Cada campo tiene al menos 2 secciones (h/M) formadas como spinbutton.
//   2. Las secciones tienen tamaño mínimo legible (>= 14px de alto).
//   3. La label, si está, no se solapa con las secciones.
//   4. La pista (hint), si está, está dentro del card.
//   5. El campo entero cabe dentro del viewport.
//
// La rama Stagehand LLM sigue disponible opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/time-field/time-field.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del campo de hora que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. SECCIONES LEGIBLES: el campo de hora muestra secciones claramente separadas (hora, minuto, opcionalmente segundo y AM/PM). Cada sección es legible.

2. LABEL VISIBLE: si el campo tiene label, está visible y no se solapa con las secciones.

3. HINT VISIBLE: si hay texto de ayuda, está visible debajo del campo y no se corta.

4. EN VIEWPORT: el campo completo (incluyendo label y hint si existen) cabe en el área visible sin recortes.

5. CONTRASTE SUFICIENTE: el texto del campo es legible contra el fondo (no es invisible ni casi transparente).

Responde SOLO con un JSON con la forma:
{
  "sections_legible": "PASS" | "FAIL",
  "label_visible": "PASS" | "FAIL" | "N/A",
  "hint_visible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "contraste": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const fields = [...document.querySelectorAll('is-time-field')];
    return fields.map((f, idx) => {
      const r = f.getBoundingClientRect();
      const secs = [...f.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      const sections = secs.map((s) => {
        const sr = s.getBoundingClientRect();
        return { x: sr.x, y: sr.y, w: sr.width, h: sr.height };
      });
      const label = f.shadowRoot.querySelector('[part="label"]');
      const hint = f.shadowRoot.querySelector('[part="hint"]');
      const labelRect = label && !label.hidden ? label.getBoundingClientRect() : null;
      const hintRect = hint && !hint.hidden ? hint.getBoundingClientRect() : null;
      const cs = secs[0] ? getComputedStyle(secs[0]) : null;
      return {
        idx,
        fieldRect: { x: r.x, y: r.y, w: r.width, h: r.height },
        sections,
        labelRect,
        hintRect,
        fontSize: cs?.fontSize,
        color: cs?.color,
      };
    });
  });

  for (const f of data) {
    const tag = `field#${f.idx}`;

    // (1) Hay al menos 2 secciones.
    assert.ok(f.sections.length >= 2, `${tag}: debe haber >=2 spinbutton (h/M), hay ${f.sections.length}`);

    // (2) Cada sección tiene tamaño mínimo legible.
    for (let i = 0; i < f.sections.length; i++) {
      const s = f.sections[i];
      assert.ok(s.h >= 14, `${tag}: sección ${i} muy baja (${s.h.toFixed(1)}px < 14px)`);
      assert.ok(s.w >= 10, `${tag}: sección ${i} muy estrecha (${s.w.toFixed(1)}px < 10px)`);
    }

    // (3) Label no se solapa con secciones.
    if (f.labelRect) {
      const overlaps = f.sections.some((s) => {
        const ox = f.labelRect.x < s.x + s.w && s.x < f.labelRect.x + f.labelRect.width;
        const oy = f.labelRect.y < s.y + s.h && s.y < f.labelRect.y + f.labelRect.height;
        return ox && oy;
      });
      assert.equal(overlaps, false, `${tag}: el label se solapa con alguna sección`);
    }

    // (4) Hint cabe dentro del card (no se sale horizontalmente).
    if (f.hintRect) {
      assert.ok(f.hintRect.x >= f.fieldRect.x - 1, `${tag}: hint se sale por la izquierda`);
      assert.ok(
        f.hintRect.x + f.hintRect.width <= f.fieldRect.x + f.fieldRect.width + 1,
        `${tag}: hint se sale por la derecha`,
      );
    }

    // (5) El campo cabe dentro del viewport (1400x900 según el harness).
    const VW = 1400, VH = 900;
    assert.ok(
      f.fieldRect.x + f.fieldRect.width <= VW,
      `${tag}: el campo se sale del viewport por la derecha (${(f.fieldRect.x + f.fieldRect.width).toFixed(1)} > ${VW})`,
    );
    assert.ok(
      f.fieldRect.y + f.fieldRect.height <= VH,
      `${tag}: el campo se sale del viewport por abajo (${(f.fieldRect.y + f.fieldRect.height).toFixed(1)} > ${VH})`,
    );
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-time-field-ready');
  await checkDeterministic(page);
  console.log('  ✓ time-field: rubric determinista PASS');
  results.push({ name: 'time-field', skipped: false });
} catch (err) {
  console.error(`  ✗ time-field: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-time-field'); } catch {}
  results.push({ name: 'time-field', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ time-field: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-time-field-ready');
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-time-field');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['sections_legible', 'label_visible', 'hint_visible', 'in_viewport', 'contraste'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ time-field: visual rubric LLM PASS');
        else console.error(`  ✗ time-field: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ time-field (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('time-field-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
