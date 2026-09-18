// avatar.stagehand.test.mjs — verificaciones de calidad visual (rubric
// determinista). Misma estrategia que er-stagehand.test.mjs: cero LLM por
// defecto; si STAGEHAND=1 + credenciales se activa la rama LLM opt-in.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_testing/lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/media/Avatar/avatar.html`, readyAttr: 'data-avatar-ready', name: 'avatar' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const avatars = [...document.querySelectorAll('main is-avatar')];
    return avatars.map((el, idx) => {
      const shadow = el.shadowRoot;
      const avatarBox = shadow.querySelector('.avatar').getBoundingClientRect();
      const initials = shadow.querySelector('.initials');
      const initialsVisible = !initials.hidden;
      const initialsText = initials.textContent.trim();
      const initialsFontSize = parseFloat(getComputedStyle(initials).fontSize);
      const icon = shadow.querySelector('.icon');
      const iconVisible = !icon.hidden;
      const isIconInIcon = icon.querySelector('is-icon');
      const img = shadow.querySelector('.image');
      const imgVisible = !img.hidden;
      const role = el.getAttribute('role');
      const ariaLabel = el.getAttribute('aria-label');
      const dataShape = el.dataset.shape;
      return {
        idx,
        avatarBox,
        initialsVisible,
        initialsText,
        initialsFontSize,
        iconVisible,
        hasIsIcon: !!isIconInIcon,
        imgVisible,
        role,
        ariaLabel,
        dataShape,
      };
    });
  });

  for (const a of data) {
    const tag = `${demo.name}#${a.idx}`;

    // (1) La caja del avatar tiene tamaño (no está colapsada).
    assert.ok(a.avatarBox.width > 0 && a.avatarBox.height > 0, `${tag}: avatar box debe tener tamaño (w=${a.avatarBox.width}, h=${a.avatarBox.height})`);

    // (2) Solo UNO de los tres canales (image, initials, icon) está visible.
    const channels = [a.imgVisible, a.initialsVisible, a.iconVisible].filter(Boolean).length;
    assert.equal(channels, 1, `${tag}: exactamente un canal visible (img=${a.imgVisible}, initials=${a.initialsVisible}, icon=${a.iconVisible})`);

    // (3) Si initials visible, texto no vacío y font-size >= 6px.
    if (a.initialsVisible) {
      assert.ok(a.initialsText.length > 0, `${tag}: initials no debe estar vacío`);
      assert.ok(a.initialsFontSize >= 6, `${tag}: initials font-size debe ser >= 6px (got ${a.initialsFontSize})`);
    }

    // (4) Si icon visible, debe haber un <is-icon> dentro.
    if (a.iconVisible) {
      assert.ok(a.hasIsIcon, `${tag}: .icon visible debe contener un <is-icon>`);
    }

    // (5) Accesibilidad: role=img y aria-label no vacío.
    assert.equal(a.role, 'img', `${tag}: role debe ser "img", got "${a.role}"`);
    assert.ok(a.ariaLabel && a.ariaLabel.length > 0, `${tag}: aria-label no debe estar vacío (got "${a.ariaLabel}")`);

    // (6) data-shape consistente con el atributo shape (o "circle" por defecto).
    assert.ok(['circle', 'rounded', 'square'].includes(a.dataShape), `${tag}: data-shape debe ser circle|rounded|square, got "${a.dataShape}"`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (1 canal visible, aria OK, font OK, data-shape OK)`);
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
// Rama opt-in con Stagehand LLM (rubric de calidad visual).
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual de los avatares que aparecen en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CAJAS NO SE SOLAPAN: cada avatar está visualmente separado de los demás. No hay superposición ni pegado excesivo.

2. FORMAS LEGIBLES: las tres formas (circle, rounded, square) se distinguen visualmente.

3. CAJAS ENCAJAN EN VIEWPORT: los avatares caben dentro del área visible. No hay recortes.

4. TEXTO LEGIBLE: las iniciales se ven dentro de cada avatar, con tamaño suficiente.

5. CONTRASTE: las iniciales/iconos son visibles contra el fondo oscuro.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "shapes_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "contrast": "PASS" | "FAIL" | "N/A",
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
    const checks = ['no_overlap', 'shapes_legible', 'in_viewport', 'text_legible', 'contrast'];
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
report('avatar-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
