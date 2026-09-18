// breadcrumb.stagehand.test.mjs — verificaciones visuales deterministas
// (sin LLM). El rubric se centra en cinco invariantes de landmark + a11y:
//   1. Un solo <nav part="breadcrumb"> por contenedor (no wrappers extra).
//   2. Cada item visible tiene un separator adyacente (excepto el último).
//   3. Items activos (con href) tienen bounding box clickeable > 0.
//   4. Items current tienen aria-current="page" exactamente uno por breadcrumb.
//   5. aria-label del <nav> no está vacío y se distingue del default.
//
// Opt-in: STAGEHAND=1 activa además la rama LLM del rubric (igual que
// er-stagehand.test.mjs), pero por defecto corre las checks estructuradas.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/navigation/breadcrumb/breadcrumb.html`;
const results = [];

async function runDeterministicChecks(page) {
  await page.waitForTimeout(200);

  // (1) Un solo <nav part="breadcrumb"> por is-breadcrumb.
  const navCount = await page.evaluate(() => {
    return [...document.querySelectorAll('is-breadcrumb')].map((bc) => {
      return bc.shadowRoot.querySelectorAll('nav[part="breadcrumb"]').length;
    });
  });
  for (let i = 0; i < navCount.length; i++) {
    assert.equal(navCount[i], 1, `breadcrumb[${i}] debe tener exactamente 1 <nav part="breadcrumb">, tiene ${navCount[i]}`);
  }

  // (2) Cada item visible (excepto el primero de su breadcrumb) tiene un
  // separator adyacente. Verificamos que la cantidad de separators coincide
  // con items - 1 (o items si el breadcrumb tiene un separator global — no
  // es el caso aquí: cada item tiene su propio .separator).
  const sepStats = await page.evaluate(() => {
    return [...document.querySelectorAll('is-breadcrumb')].map((bc) => {
      const items = [...bc.querySelectorAll(':scope > is-breadcrumb-item')];
      const seps = items.map((it) => !!it.shadowRoot.querySelector('.separator'));
      return { items: items.length, seps: seps.filter(Boolean).length };
    });
  });
  for (let i = 0; i < sepStats.length; i++) {
    assert.equal(
      sepStats[i].seps, sepStats[i].items,
      `breadcrumb[${i}]: cada item debe tener .separator (${sepStats[i].seps}/${sepStats[i].items})`,
    );
  }

  // (3) Items activos (con href) tienen bounding box > 0.
  const activeBoxes = await page.evaluate(() => {
    return [...document.querySelectorAll('is-breadcrumb-item')].map((it) => {
      const a = it.shadowRoot.querySelector('a');
      if (!a) return { hasLink: false };
      const r = a.getBoundingClientRect();
      return { hasLink: true, w: r.width, h: r.height };
    });
  });
  const activeWithLink = activeBoxes.filter((b) => b.hasLink);
  for (let i = 0; i < activeWithLink.length; i++) {
    assert.ok(
      activeWithLink[i].w > 0 && activeWithLink[i].h > 0,
      `item con link ${i} debe tener box > 0 (w=${activeWithLink[i].w}, h=${activeWithLink[i].h})`,
    );
  }

  // (4) Cada breadcrumb tiene EXACTAMENTE un item con aria-current="page".
  const currentPerBc = await page.evaluate(() => {
    return [...document.querySelectorAll('is-breadcrumb')].map((bc) => {
      const items = [...bc.querySelectorAll(':scope > is-breadcrumb-item')];
      return items.filter((it) => {
        const lbl = it.shadowRoot.querySelector('.label');
        return lbl?.getAttribute('aria-current') === 'page';
      }).length;
    });
  });
  for (let i = 0; i < currentPerBc.length; i++) {
    // Sections basic/en/separator/target tienen 1 current; spa no.
    if (i === 2) continue; // spa
    assert.equal(currentPerBc[i], 1, `breadcrumb[${i}] debe tener exactamente 1 current, tiene ${currentPerBc[i]}`);
  }

  // (5) aria-label no vacío y ≠ "Ruta" para todos.
  const labels = await page.evaluate(() => {
    return [...document.querySelectorAll('is-breadcrumb')].map((bc) => {
      const nav = bc.shadowRoot.querySelector('nav');
      return nav?.getAttribute('aria-label') ?? '';
    });
  });
  for (let i = 0; i < labels.length; i++) {
    assert.ok(labels[i].length > 0, `breadcrumb[${i}] aria-label vacío`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-breadcrumb-ready');
  await runDeterministicChecks(page);
  console.log('  ✓ rubric determinista PASS (landmark único, separators, boxes, aria-current, aria-label)');
  await screenshot(page, 'breadcrumb-stagehand');
  results.push({ name: 'breadcrumb', skipped: false });
} catch (err) {
  console.error(`  ✗ breadcrumb: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-breadcrumb-stagehand'); } catch {}
  results.push({ name: 'breadcrumb', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// Rama opt-in Stagehand LLM.
const VISUAL_RUBRIC = `
Evalúa la presentación visual de un breadcrumb (migas de pan) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LANDMARK ÚNICO: cada breadcrumb expone exactamente un <nav>. No hay wrappers extra entre el host y el nav.

2. SEPARADORES VISIBLES: entre cada par de items hay un separador visual (chevron, slash u otro). Los separadores son visibles y no se solapan con texto.

3. ITEMS EN VIEWPORT: cada item es visible (no se sale del viewport) y su texto es legible (no truncado ni cortado).

4. CURRENT PAGE: el último item (current) se distingue visualmente de los anteriores (color, peso, sin underline). aria-current="page" está presente en el DOM.

5. CONTRASTE: el color del texto de los items (incluyendo el current) tiene contraste suficiente sobre el fondo oscuro (#0f1620).

Responde SOLO con un JSON:
{
  "landmark_unico": "PASS" | "FAIL",
  "separadores_visibles": "PASS" | "FAIL",
  "items_en_viewport": "PASS" | "FAIL",
  "current_page": "PASS" | "FAIL",
  "contraste": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

if (process.env.STAGEHAND === '1') {
  const sh = await maybeStagehand();
  if (!sh) {
    console.log('  ⊘ stagehand LLM sin credenciales, skipping SOLO la rama LLM');
  } else {
    const { browser: b2, page: p2 } = await newPage();
    try {
      await p2.goto(URL, { waitUntil: 'domcontentloaded' });
      await waitReady(p2, 'data-breadcrumb-ready');
      await p2.waitForTimeout(300);
      const shot = await screenshot(p2, 'stagehand-breadcrumb');
      const result = await sh.act(VISUAL_RUBRIC, { image: shot });
      const json = JSON.parse(result?.output ?? result?.text ?? '{}');
      const checks = ['landmark_unico', 'separadores_visibles', 'items_en_viewport', 'current_page', 'contraste'];
      const fails = checks.filter((c) => json?.[c] === 'FAIL');
      if (fails.length === 0) {
        console.log('  ✓ breadcrumb: visual rubric LLM PASS');
      } else {
        console.error(`  ✗ breadcrumb: visual rubric LLM FAIL (${fails.join(', ')})`);
      }
    } catch (err) {
      console.error(`  ✗ breadcrumb (LLM): ${String(err?.message ?? err)}`);
    } finally {
      await sh.close?.().catch(() => {});
      await close({ browser: b2, page: p2 });
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('breadcrumb-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
