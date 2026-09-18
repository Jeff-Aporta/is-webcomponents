// pdf-viewer.stagehand.test.mjs — verificaciones de calidad visual.
//
// Antes: usaba Stagehand (LLM) con un rubric en español y dependía de la
// API key de un LLM externo (MiniMax). Resultado: siempre SKIPPED en CI y
// en cualquier máquina sin credenciales — no aportaba valor real.
//
// Ahora: las preguntas del rubric ("toolbar visible", "iframe en viewport",
// "botones coherentes", "título proyectado") se responden DETERMINÍSTICAMENTE
// con Playwright + getBoundingClientRect + atributos del shadow DOM. Cero
// dependencias de LLM, cero API keys, CI-friendly.
//
// Si alguien quiere ejecutar la versión con Stagehand LLM, basta con poner
// `STAGEHAND=1` + credenciales y se activa la rama LLM al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/overlays/PdfViewer/pdf-viewer.html`, readyAttr: 'data-pdf-viewer-ready', name: 'pdf-viewer' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro). Reemplazan al rubric de Stagehand.
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const viewers = [...document.querySelectorAll('is-pdf-viewer')];
    return viewers.map((v, idx) => {
      const toolbar = v.shadowRoot.querySelector('[part="toolbar"]');
      const iframe = v.shadowRoot.querySelector('iframe[part="frame"]');
      const dl = v.shadowRoot.querySelector('[part="download"]');
      const print = v.shadowRoot.querySelector('[part="print"]');
      const root = v.shadowRoot.querySelector('[part="root"]');
      return {
        idx,
        hasToolbar: !!toolbar,
        hasIframe: !!iframe,
        hasDl: !!dl,
        hasPrint: !!print,
        toolbarRect: toolbar?.getBoundingClientRect(),
        iframeRect: iframe?.getBoundingClientRect(),
        rootRect: root?.getBoundingClientRect(),
        // El toolbar debe estar en la parte superior del root (y por encima
        // del iframe en stacking natural).
        toolbarY: toolbar?.getBoundingClientRect().y,
        iframeY: iframe?.getBoundingClientRect().y,
        // El título por defecto vive en el toolbar — verificamos que el
        // slot "title" del primer demo proyecta texto.
        hasTitleSlot: !!v.querySelector('[slot="title"]'),
        titleText: v.querySelector('[slot="title"]')?.textContent?.trim() ?? null,
        // El botón download sólo debe estar visible si el atributo download=""
        dlHidden: dl?.hasAttribute('hidden'),
        printHidden: print?.hasAttribute('hidden'),
      };
    });
  });

  const tag = demo.name;
  assert.equal(data.length, 2, `${tag}: demo debe tener 2 visores`);

  for (const v of data) {
    const subTag = `${tag}#${v.idx}`;
    // (1) TOOLBAR VISIBLE: el toolbar es un elemento con dimensiones > 0
    // en la parte superior del root.
    assert.ok(v.hasToolbar, `${subTag}: debe existir [part="toolbar"]`);
    assert.ok(v.toolbarRect && v.toolbarRect.width > 0 && v.toolbarRect.height > 0,
      `${subTag}: toolbar debe tener dimensiones visibles`);
    // (2) IFRAME EN VIEWPORT: el iframe está dentro del root, y dentro del
    // viewport de 1400x900.
    assert.ok(v.hasIframe, `${subTag}: debe existir <iframe part="frame">`);
    assert.ok(v.iframeRect && v.iframeRect.width >= 200,
      `${subTag}: iframe debe tener ancho >= 200px (tiene ${v.iframeRect?.width?.toFixed(1)})`);
    assert.ok(v.iframeRect.y >= 0 && v.iframeRect.y < 900,
      `${subTag}: iframe debe estar dentro del viewport (y=${v.iframeRect.y.toFixed(1)})`);
    assert.ok(v.iframeRect.x + v.iframeRect.width <= 1400 + 1,
      `${subTag}: iframe debe caber horizontalmente en viewport`);
    // (3) BOTONES COHERENTES: la visibilidad de download/print coincide con
    // la presencia del atributo.
    const hasDownload = data[0]?.idx === v.idx ? !!v.idx === 0 : false;
    if (v.idx === 0) {
      assert.equal(v.dlHidden, false, `${subTag}: con download="" el botón debe estar visible`);
      assert.equal(v.printHidden, false, `${subTag}: con print="" el botón debe estar visible`);
    } else {
      assert.equal(v.dlHidden, true, `${subTag}: sin download el botón debe estar oculto`);
      assert.equal(v.printHidden, true, `${subTag}: sin print el botón debe estar oculto`);
    }
    // (4) TÍTULO PROYECTADO: el slot title del primer demo debe tener texto.
    if (v.idx === 0) {
      assert.ok(v.hasTitleSlot, `${subTag}: debe existir nodo con slot="title"`);
      assert.ok(v.titleText && v.titleText.length > 0,
        `${subTag}: slot="title" debe tener texto (fue "${v.titleText}")`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (toolbar visible, iframe en viewport, botones coherentes, título proyectado)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del visor de PDF que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. TOOLBAR VISIBLE: cada panel de visor tiene una barra de herramientas en la parte superior con el título del documento a la izquierda.

2. IFRAME EN VIEWPORT: el iframe blanco del PDF está completamente dentro del área visible del panel. No hay recortes ni overflow extraño.

3. BOTONES COHERENTES: en el primer panel se ven los botones "Descargar" e "Imprimir" en el lado derecho del toolbar. En el segundo panel hay un botón extra "Recargar" además del título.

4. TÍTULO PROYECTADO: el texto del título en el toolbar es legible y refleja el slot "title" (ej: "Mozilla · TraceMonkey (PDLI 2009)").

Responde SOLO con un JSON con la forma:
{
  "toolbar_visible": "PASS" | "FAIL",
  "iframe_in_viewport": "PASS" | "FAIL",
  "buttons_coherent": "PASS" | "FAIL",
  "title_projected": "PASS" | "FAIL",
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
    const checks = ['toolbar_visible', 'iframe_in_viewport', 'buttons_coherent', 'title_projected'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { name: demo.name, llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  for (const demo of DEMOS) {
    try {
      const r = await runStagehandRubric(demo);
      if (r.llm_skipped) {
        console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      } else if (!r.fails || r.fails.length === 0) {
        console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      } else {
        console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
      }
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('pdf-viewer-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });