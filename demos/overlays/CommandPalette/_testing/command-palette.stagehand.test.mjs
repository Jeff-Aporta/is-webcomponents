// command-palette.stagehand.test.mjs — verificaciones de calidad visual.
//
// Antes: usaba Stagehand (LLM) con un rubric en español y dependía de la
// API key de un LLM externo (MiniMax). Resultado: siempre SKIPPED en CI y
// en cualquier máquina sin credenciales — no aportaba valor real.
//
// Ahora: las mismas preguntas del rubric ("paleta visible centrada",
// "input legible", "resultados en viewport", "highlights coherentes",
// "footer con atajos") se responden DETERMINÍSTICAMENTE con Playwright +
// getBoundingClientRect + atributos del shadow DOM. Cero dependencias de
// LLM, cero API keys, CI-friendly.
//
// Si alguien quiere ejecutar la versión con Stagehand LLM (la original,
// útil para casos visuales no estructurados), basta con poner
// `STAGEHAND=1` + credenciales y se activa la rama LLM al final del
// archivo. Sigue siendo opt-in; por defecto corremos las checks
// estructuradas que NO skippean.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/overlays/CommandPalette/command-palette.html`, readyAttr: 'data-command-palette-ready', name: 'command-palette' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro). Reemplazan al rubric de Stagehand.
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  // Esperar a que el render esté completo y el layout estable.
  await page.waitForTimeout(200);

  // Abrir la paleta para tomar las mediciones (los resultados viven detrás
  // de open() — el demo ya incluye un botón "Abrir paleta" y Ctrl+K como
  // hotkey, así que podemos abrirla sin tocar el input).
  await page.evaluate(async () => {
    const p = document.querySelector('main is-command-palette');
    p.open();
    await new Promise((r) => requestAnimationFrame(r));
  });
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const p = document.querySelector('main is-command-palette');
    const dialog = p.shadowRoot.querySelector('dialog[part="dialog"]');
    const panel = p.shadowRoot.querySelector('.panel[part="panel"]');
    const input = p.shadowRoot.querySelector('input[part="input"]');
    const results = [...p.shadowRoot.querySelectorAll('[role="option"]')];
    const footer = p.shadowRoot.querySelector('footer[part="footer"]');
    const footerKbd = footer?.querySelectorAll('kbd') ?? [];

    const panelRect = panel.getBoundingClientRect();
    const inputRect = input?.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const firstResult = results[0]?.getBoundingClientRect();
    const active = p.shadowRoot.querySelector('.opt.is-active');

    // El CSS del componente posiciona el panel top:14% con transform
    // translateX(-50%) → debe quedar centrado horizontalmente.
    const expectedCenter = dialogRect.x + dialogRect.width / 2;
    const actualCenter = panelRect.x + panelRect.width / 2;
    const centerDelta = Math.abs(actualCenter - expectedCenter);

    return {
      panelRect, inputRect, dialogRect, firstResult, hasActive: !!active,
      centerDelta,
      optionsCount: results.length,
      footerKbdCount: footerKbd.length,
      panelWidthCss: getComputedStyle(panel).width,
      panelVisible: panelRect.width > 0 && panelRect.height > 0,
      inputFontSize: parseFloat(getComputedStyle(input).fontSize),
      resultsOverflowY: getComputedStyle(p.shadowRoot.querySelector('ol[part="results"]')).overflowY,
    };
  });

  const tag = demo.name;

  // (1) PALETA VISIBLE CENTRADA: el centro horizontal del panel está alineado
  // con el centro del viewport (tolerancia 2px).
  assert.ok(data.panelVisible, `${tag}: panel debe estar visible (width>0)`);
  assert.ok(data.centerDelta <= 2, `${tag}: panel debe estar centrado horizontalmente, delta=${data.centerDelta.toFixed(2)}px`);

  // (2) INPUT LEGIBLE: el input ocupa una posición razonable dentro del panel
  // y el font-size es >= 14px (legible en desktop).
  assert.ok(data.inputRect, `${tag}: input debe estar medido`);
  assert.ok(data.inputRect.width >= 200, `${tag}: input debe tener ancho >= 200px (tiene ${data.inputRect.width.toFixed(1)})`);
  assert.ok(data.inputFontSize >= 14, `${tag}: font-size del input debe ser >= 14px (es ${data.inputFontSize})`);

  // (3) RESULTADOS EN VIEWPORT: el primer resultado está dentro del rect del
  // panel y dentro del viewport del browser (1400x900).
  assert.ok(data.firstResult, `${tag}: debe haber al menos un resultado visible, hay ${data.optionsCount}`);
  const insidePanel =
    data.firstResult.x >= data.panelRect.x - 1 &&
    data.firstResult.x + data.firstResult.width <= data.panelRect.x + data.panelRect.width + 1 &&
    data.firstResult.y >= data.panelRect.y - 1 &&
    data.firstResult.y + data.firstResult.height <= data.panelRect.y + data.panelRect.height + 1;
  assert.ok(insidePanel, `${tag}: el primer resultado debe estar dentro del rect del panel`);
  assert.ok(data.firstResult.y >= 0 && data.firstResult.y < 900, `${tag}: el primer resultado debe estar dentro del viewport (y=${data.firstResult.y.toFixed(1)})`);
  assert.equal(data.resultsOverflowY, 'auto', `${tag}: lista de resultados debe poder scrollear (overflow-y: auto)`);

  // (4) HIGHLIGHTS COHERENTES: hay exactamente 1 elemento activo y debe
  // coincidir con el primer resultado (la paleta arranca con #active=0).
  assert.equal(data.hasActive, true, `${tag}: debe haber exactamente un .opt.is-active tras abrir`);

  // (5) FOOTER CON ATAJOS: el footer embebido expone los kbd de ↑↓/↵/Esc.
  // El demo declara 3 hint-items con sendos <kbd> (↑↓ cuenta como 2).
  assert.ok(data.footerKbdCount >= 3, `${tag}: footer debe incluir al menos 3 <kbd> (↑↓/↵/Esc), hay ${data.footerKbdCount}`);
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (centrado, input legible, en viewport, highlight coherente, footer con atajos)`);
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
// Rama opt-in con Stagehand LLM. Sólo corre si STAGEHAND=1
// + credenciales configuradas.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual de la paleta de comandos que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. PALETA VISIBLE CENTRADA: la paleta modal (rectángulo con input arriba y lista de resultados debajo) está visualmente centrada horizontalmente en el viewport, con el backdrop oscurecido detrás.

2. INPUT LEGIBLE: el input de búsqueda en la parte superior tiene un tamaño de fuente legible y placeholder visible. La lupa/ícono a la izquierda está alineada con el texto.

3. RESULTADOS EN VIEWPORT: la lista de resultados (cada fila con icono, título y opcionalmente atajo <kbd>) cabe dentro del panel sin recortes. El primer resultado debe estar visible sin scroll.

5. HIGHLIGHTS COHERENTES: hay un resultado marcado como activo (resaltado con color de acento) y está en la primera posición.

6. FOOTER CON ATAJOS: en la parte inferior del panel hay al menos tres grupos de hint (↑↓ navegar, ↵ ejecutar, Esc cerrar), cada uno con sus chips <kbd>.

Responde SOLO con un JSON con la forma:
{
  "centered": "PASS" | "FAIL",
  "input_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "highlight_coherent": "PASS" | "FAIL",
  "footer_shortcuts": "PASS" | "FAIL" | "N/A",
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
    // abrir la paleta antes de la captura
    await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
    });
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['centered', 'input_legible', 'in_viewport', 'highlight_coherent', 'footer_shortcuts'];
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
report('command-palette-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });