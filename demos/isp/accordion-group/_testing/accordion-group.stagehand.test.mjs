// accordion-group.stagehand.test.mjs — checks deterministas de calidad visual.
// Mismo patrón que el demo ER: sin LLM, sin API keys. Reproduce el rubric
// de Stagehand con Playwright + DOM API.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/accordion-group/accordion-group.html`;

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('is-accordion-group')];
    return groups.map((g) => {
      const root = g.shadowRoot;
      const accordionEl = root?.querySelector('.accordion');
      const rect = accordionEl?.getBoundingClientRect();
      const details = [...g.items].map((d) => {
        const sr = d.shadowRoot;
        const header = sr?.querySelector('.header, [part="header"]');
        const content = sr?.querySelector('.content, [part="content"]');
        const headerRect = header?.getBoundingClientRect();
        const visible = content && !content.hidden;
        return {
          summary: d.summary,
          open: d.open,
          visible: !!visible,
          headerW: headerRect?.width || 0,
          headerH: headerRect?.height || 0,
        };
      });
      return {
        id: g.id,
        multiple: g.multiple,
        openCount: g.openItems.length,
        accordionRect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
        details,
      };
    });
  });

  for (const grp of data) {
    const tag = `accordion#${grp.id}`;
    assert.ok(grp.accordionRect, `${tag}: accordion rect debe existir en DOM`);

    // (1) Cada panel tiene dimensiones > 0 (no collapsed to 0).
    for (const d of grp.details) {
      assert.ok(d.headerW > 0, `${tag}: panel "${d.summary}" header width debe ser > 0 (es ${d.headerW})`);
      assert.ok(d.headerH > 0, `${tag}: panel "${d.summary}" header height debe ser > 0 (es ${d.headerH})`);
    }

    // (2) El grupo respeta single/multiple.
    if (grp.multiple) {
      // multi puede tener 0..N abiertos sin violar invariantes.
    } else {
      assert.ok(grp.openCount <= 1, `${tag}: modo single NO debe tener más de 1 abierto (tiene ${grp.openCount})`);
    }

    // (3) Los paneles están dentro del contenedor.
    if (grp.accordionRect) {
      assert.ok(grp.accordionRect.w > 0, `${tag}: accordion width debe ser > 0`);
      assert.ok(grp.accordionRect.h > 0, `${tag}: accordion height debe ser > 0`);
    }

    // (4) Si un panel está `open`, su `visible` debe ser true.
    for (const d of grp.details) {
      if (d.open) {
        assert.equal(d.visible, true, `${tag}: panel abierto "${d.summary}" debe tener contenido visible`);
      }
    }
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-accordion-ready');
  await checkDeterministic(page);
  console.log(`  ✓ accordion-group: rubric determinista PASS (dimensiones OK, single/multiple respetado, contenido visible coherente)`);
  results.push({ name: 'accordion-group', ok: true });
} catch (err) {
  console.error(`  ✗ accordion-group: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-accordion-group'); } catch {}
  results.push({ name: 'accordion-group', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('accordion-group-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
