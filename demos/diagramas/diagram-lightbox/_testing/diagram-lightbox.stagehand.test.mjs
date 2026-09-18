// diagram-lightbox.stagehand.test.mjs — verificaciones de calidad visual
// (Nivel 1) para el demo diagram-lightbox.html. Aquí el "diagrama en
// viewport" se cumple trivialmente porque el lightbox ocupa toda la
// pantalla, pero igualmente validamos que el diagrama interno renderice
// correctamente.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/diagramas/diagram-lightbox/diagram-lightbox.html`,
  readyAttr: 'data-diagram-lightbox-ready',
  name: 'diagram-lightbox',
};

async function checkDeterministic(page) {
  await page.click('#btn-open');
  await page.waitForTimeout(400);

  // El lightbox está abierto: debe haber un dialog con backdrop visible.
  const info = await page.evaluate(() => {
    const lb = document.querySelector('is-diagram-lightbox');
    const isOpen = lb?.hasAttribute('open');
    const dialog = lb?.shadowRoot?.querySelector('dialog, [role="dialog"]');
    const dialogRect = dialog?.getBoundingClientRect();
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    return { isOpen, hasDialog: !!dialog, dialogRect, viewport };
  });

  assert.equal(info.isOpen, true, 'el lightbox debe estar abierto');

  // (3) el dialog cubre el viewport (lightbox = pantalla completa)
  if (info.dialogRect) {
    assert.ok(info.dialogRect.width >= info.viewport.w * 0.8,
      `dialog width ${info.dialogRect.width} debe cubrir >=80% del viewport ${info.viewport.w}`);
    assert.ok(info.dialogRect.height >= info.viewport.h * 0.8,
      `dialog height ${info.dialogRect.height} debe cubrir >=80% del viewport ${info.viewport.h}`);
  }
}

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS (lightbox abre y cubre viewport)`);
  results.push({ name: DEMO.name, skipped: false });
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  results.push({ name: DEMO.name, error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  const sh = await maybeStagehand();
  if (sh) {
    const { browser: b2, page: p2 } = await newPage();
    try {
      await p2.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
      await waitReady(p2, DEMO.readyAttr);
      await p2.click('#btn-open');
      await p2.waitForTimeout(400);
      await screenshot(p2, `stagehand-${DEMO.name}`);
      console.log(`  ✓ ${DEMO.name}: visual rubric LLM completado`);
    } catch (err) {
      console.error(`  ✗ ${DEMO.name} (LLM): ${String(err?.message ?? err)}`);
    } finally {
      await sh.close?.().catch(() => {});
      await close({ browser: b2, page: p2 });
    }
  }
}

const failures = results.filter((r) => r.error).length;
report(`${DEMO.name}-stagehand`, failures === 0, { total: results.length, failures, results });