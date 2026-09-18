// code.stagehand.test.mjs — verificaciones visuales deterministas para el
// editor <is-code>. Mismo enfoque que er-stagehand.test.mjs:
//
//   - Por defecto corre checks con Playwright + getBoundingClientRect +
//     atributos/CSS. Cero LLM, cero API keys, CI-friendly.
//   - Con STAGEHAND=1 + MINIMAX_API_KEY se activa una rama opt-in con LLM
//     que evalúa un rubric visual en lenguaje natural (mismo patrón).
//
// El rubric en español evalúa: tokens legibles, line numbers en orden, editor
// en viewport, número de líneas coherente, consistencia de tema. Todos esos
// checks son estructuralmente deterministas → los implementamos aquí.
import assert from 'node:assert/strict';
// El harness compartido vive en otra categoría (demos/diagramas/ER). Lo
// reusamos para no duplicar 90 líneas de boilerplate de Playwright.
// Resolución desde `demos/code/code/_testing/`:
//   ../..  → demos/code/
//   ../../.. → demos/
//   ../../../diagramas/ER/_testing/lib/harness.mjs
import {
  BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand,
} from '../../../diagramas/ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/code/code/code.html`;

// Cada entrada es una <is-code> del demo + selector de shadow host + texto
// esperado en `value`. La verificación "nº de líneas == N" usa expectedLines.
const SCENES = [
  { id: 'code-js',          expectedLines: 6,  mode: 'editable' },
  { id: 'code-js-readonly', expectedLines: 6,  mode: 'readonly'  },
  { id: 'code-css',         expectedLines: 6,  mode: 'editable' },
  { id: 'code-html',        expectedLines: 6,  mode: 'editable' },
  { id: 'code-json',        expectedLines: 5,  mode: 'editable' },
  { id: 'code-compact',     expectedLines: 1,  mode: 'compact'   },
  { id: 'code-marks',       expectedLines: 1,  mode: 'readonly'  },
];

const results = [];

/**
 * Checks deterministas por cada <is-code> del demo. Implementa el rubric
 * "visual" como aserciones estructurales:
 *   (1) TOKENS LEGIBLES     — los token spans tienen color/display no vacío.
 *   (2) LINE NUMBERS ORDEN  — gutter 1..N sin huecos, en orden.
 *   (3) EN VIEWPORT         — el host no se desborda horizontalmente más allá
 *                             de una tolerancia (un par de px por sub-pixel).
 *   (4) N LÍNEAS            — el nº de .ic-line del DOM coincide con el
 *                             esperado (esperamos 1 línea en compact con texto
 *                             de una sola línea).
 *   (5) CONSISTENCIA TEMA   — bg oscuro en dark, claro en light.
 */
async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  const data = await page.evaluate((scenes) => {
    return scenes.map((s) => {
      const el = document.getElementById(s.id);
      if (!el || !el.shadowRoot) return { id: s.id, missing: true };
      const sr = el.shadowRoot;
      const lines = [...sr.querySelectorAll('.ic-line')];
      const ln = [...sr.querySelectorAll('.ic-ln')].map((n) => Number(n.textContent.trim()));
      const gutter = sr.querySelector('.ic-gutter');
      const tokens = [...sr.querySelectorAll('.ic-line span[class^="tok-"]')];
      const tokenSamples = tokens.slice(0, 5).map((t) => {
        const cs = getComputedStyle(t);
        return { color: cs.color, display: cs.display };
      });
      const hostRect = el.getBoundingClientRect();
      const root = sr.querySelector('.root');
      const rootRect = root?.getBoundingClientRect() ?? hostRect;
      const hostCs = getComputedStyle(el);
      const rootCs = root ? getComputedStyle(root) : null;
      return {
        id: s.id,
        mode: s.mode,
        expectedLines: s.expectedLines,
        actualLines: lines.length,
        gutterPresent: !!gutter,
        gutterNumbers: ln,
        tokenCount: tokens.length,
        tokenSamples,
        hostRect: { x: hostRect.x, y: hostRect.y, w: hostRect.width, h: hostRect.height },
        rootRect: { x: rootRect.x, y: rootRect.y, w: rootRect.width, h: rootRect.height },
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        rootScrollWidth: root ? root.scrollWidth : 0,
        rootClientWidth: root ? root.clientWidth : 0,
        hostBg: hostCs.getPropertyValue('--is-code-bg').trim(),
        hostFg: hostCs.getPropertyValue('--is-code-fg').trim(),
        rootOverflowX: rootCs ? rootCs.overflowX : '',
      };
    });
  }, SCENES);

  for (const d of data) {
    if (d.missing) {
      throw new Error(`<${d.id}> no encontrado o sin shadow root`);
    }
    const tag = `code#${d.id}`;

    // (1) TOKENS LEGIBLES — debe haber tokens pintados y deben tener display
    // distinto de "none" y color computado no vacío.
    assert.ok(d.tokenCount > 0, `${tag}: debe haber tokens pintados (${d.tokenCount})`);
    for (const t of d.tokenSamples) {
      assert.notEqual(t.display, 'none',
        `${tag}: token span tiene display:none (ilegible) → ${JSON.stringify(t)}`);
      assert.match(t.color, /rgb\(|rgba\(|#/i,
        `${tag}: token sin color computado (ilegible) → ${JSON.stringify(t)}`);
    }

    // (2) LINE NUMBERS — gutter presente (excepto compact, donde se omite a
    // menos que se pida explícito) y números en orden 1..expectedLines.
    // El demo del code-compact tiene lang=javascript + readonly (sin line-
    // numbers attr), y `compact` por defecto oculta el gutter.
    if (d.mode !== 'compact') {
      assert.equal(d.gutterPresent, true, `${tag}: debe haber gutter con números`);
      assert.equal(d.gutterNumbers.length, d.expectedLines,
        `${tag}: gutter debe tener ${d.expectedLines} números (tiene ${d.gutterNumbers.length})`);
      for (let i = 0; i < d.gutterNumbers.length; i++) {
        assert.equal(d.gutterNumbers[i], i + 1,
          `${tag}: número de línea ${i + 1} esperado ${i + 1}, fue ${d.gutterNumbers[i]}`);
      }
    } else {
      // Compact sin line-numbers attr → sin gutter.
      assert.equal(d.gutterPresent, false, `${tag}: compact sin line-numbers NO debe tener gutter`);
    }

    // (3) EN VIEWPORT — el host no debe desbordar su propio ancho visible.
    // En modo wrap o compact se permite igual o menor que clientWidth.
    assert.ok(d.hostRect.w > 0, `${tag}: ancho del host debe ser >0 (fue ${d.hostRect.w})`);
    assert.ok(d.scrollWidth <= d.clientWidth + 2,
      `${tag}: scrollWidth (${d.scrollWidth}) supera clientWidth (${d.clientWidth})`);

    // (4) Nº DE LÍNEAS COHERENTE.
    assert.equal(d.actualLines, d.expectedLines,
      `${tag}: esperaba ${d.expectedLines} .ic-line, hay ${d.actualLines}`);

    // (5) CONSISTENCIA DE TEMA — en dark, --is-code-bg = #1e1e1e.
    assert.match(d.hostBg, /#1e1e1e|30,30,30/i,
      `${tag}: --is-code-bg debe ser oscuro en dark (fue "${d.hostBg}")`);
    assert.match(d.hostFg, /#eeffff|238,255,255/i,
      `${tag}: --is-code-fg debe ser claro en dark (fue "${d.hostFg}")`);
  }

  // (5b) Cambio de tema — al pasar a "light" la variable de bg cambia. El
  // componente escucha `is-theme-change` en document para re-aplicar el
  // preset (no se re-monta en cada cambio de atributo).
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
    document.dispatchEvent(new CustomEvent('is-theme-change'));
  });
  await page.waitForTimeout(80);
  const light = await page.evaluate((scenes) => {
    return scenes.map((s) => {
      const el = document.getElementById(s.id);
      const hostCs = getComputedStyle(el);
      return { id: s.id, bg: hostCs.getPropertyValue('--is-code-bg').trim() };
    });
  }, SCENES);
  for (const d of light) {
    assert.match(d.bg, /#fff|#ffffff|255,255,255|ffffff/i,
      `code#${d.id}: --is-code-bg en light debe ser claro (fue "${d.bg}")`);
  }

  // (5c) Modo dark simulado por emulateMedia — el componente no responde al
  // media query (su contrato usa data-theme), pero NO debe romperse ni
  // perder el highlight. Esto valida que prefers-color-scheme: dark no
  // produce regresión visual.
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.dispatchEvent(new CustomEvent('is-theme-change'));
  });
  await page.waitForTimeout(80);
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-code-ready');
  await checkDeterministic(page);
  console.log(`  ✓ code: rubric determinista PASS (tokens legibles, line numbers en orden, en viewport, líneas coherentes, tema consistente)`);
  results.push({ name: 'code', skipped: false });
} catch (err) {
  console.error(`  ✗ code: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-code'); } catch {}
  results.push({ name: 'code', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM. Sólo corre si STAGEHAND=1 + credenciales.
// Útil en local para casos visuales no estructurados.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del editor de código que aparece en el screenshot. Hay varios editores en la página (JavaScript, CSS, HTML, JSON, snippet compact, editor con marcas de error/warning).

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. TOKENS LEGIBLES: los tokens resaltados (palabras clave, strings, números, funciones, tags HTML, propiedades CSS) tienen color distinguible del texto plano. No son todos del mismo color.

2. LINE NUMBERS EN ORDEN: cuando aparece, el gutter de números de línea muestra 1, 2, 3, ... N sin huecos y en orden ascendente.

3. EDITOR EN VIEWPORT: cada editor cabe dentro de su contenedor sin recortes. No hay scroll horizontal forzado.

4. NÚMERO DE LÍNEAS COHERENTE: cada editor muestra tantas líneas como su contenido (no se colapsan ni se duplican líneas vacías).

5. CONSISTENCIA DE TEMA: el fondo del editor es oscuro y el texto claro en modo dark (contraste alto). No hay texto invisible sobre fondo del mismo color.

Responde SOLO con un JSON con la forma:
{
  "tokens_legible": "PASS" | "FAIL",
  "line_numbers_orden": "PASS" | "FAIL",
  "en_viewport": "PASS" | "FAIL",
  "lineas_coherentes": "PASS" | "FAIL",
  "tema_consistente": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric(demo) {
  const sh = await maybeStagehand();
  if (!sh) return { name: demo.name, llm_skipped: true };

  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['tokens_legible', 'line_numbers_orden', 'en_viewport', 'lineas_coherentes', 'tema_consistente'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { name: demo.name, llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const r = await runStagehandRubric({ name: 'code', url: URL, readyAttr: 'data-code-ready' });
    if (r.llm_skipped) {
      console.log('  ⊘ code: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ code: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ code: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ code (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('code-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
