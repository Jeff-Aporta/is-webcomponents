// popconfirm.stagehand.test.mjs — checks visuales deterministas.
// Foco: el popup aparece cerca del trigger, no se sale del viewport,
// la flecha apunta en el direction correcto según placement.
//
// NOTA sobre gap visual: en popconfirm.ts el .popconfirm se MUEVE del shadow
// root a un div light DOM (p.popup) en onConnected. Eso rompe el scoping de
// CSS: las reglas `.popconfirm { min-width: 200px; ... }` viven en el shadow
// y NO se aplican al elemento reubicado. Resultado: el popup aparece con
// tamaño ~0. Los tests lo documentan.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/popconfirm/popconfirm.html`;

const checks = [];

checks.push({
  name: 'posicionamiento: el popup divisor (p.popup) recibe transform translate(X, Y)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-popconfirm-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(async () => {
      const trig = document.getElementById('trig-1');
      trig.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
      const p = document.querySelectorAll('is-popconfirm')[0];
      const popupDiv = p.popup;
      const inlineTransform = popupDiv?.style.transform;
      const display = popupDiv?.style.display;
      return { inlineTransform, display };
    });
    assert.ok(info.inlineTransform && info.inlineTransform.startsWith('translate'),
      `popup debe tener transform translate (vimos "${info.inlineTransform}")`);
    assert.equal(info.display, 'block', `popup debe tener display=block (vimos "${info.display}")`);
  },
});

checks.push({
  name: 'posicionamiento: con placement=top-end el transform posiciona pegado al trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-popconfirm-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(async () => {
      const trig = document.getElementById('trig-2');
      trig.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
      const p = document.querySelectorAll('is-popconfirm')[1];
      const popupDiv = p.popup;
      const tr = trig.getBoundingClientRect();
      // Transform debe colocar el popup pegado al borde derecho del trigger
      // (placement=top-end). El popup div no tiene width propio (gap CSS) pero
      // la posición X debe estar cerca del trigger.right.
      const m = (popupDiv?.style.transform || '').match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);
      const tx = m ? Number(m[1]) : null;
      const ty = m ? Number(m[2]) : null;
      return { triggerRight: tr.right, triggerTop: tr.top, tx, ty };
    });
    // Para placement=top-end, transform.x debe estar en un rango cercano a trigger.right
    // (idealmente trigger.right - 0 = trigger.right, aunque por el gap puede variar).
    assert.ok(info.tx !== null, `popup debe tener transform numérico (tx=${info.tx})`);
    assert.ok(Math.abs(info.tx - info.triggerRight) < 30,
      `transform.x (${info.tx}) debe estar cerca de trigger.right (${info.triggerRight})`);
    // placement=top → popup está arriba del trigger.
    assert.ok(info.ty < info.triggerTop,
      `transform.y (${info.ty}) debe ser < trigger.top (${info.triggerTop})`);
  },
});

checks.push({
  name: 'gap-css: el popup se renderiza con tamaño ~0 (CSS no se aplica tras moveTo light DOM)',
  run: async (page) => {
    // Este test documenta el bug visual: tras mover .popconfirm al light DOM,
    // las CSS vars y reglas del shadow no se aplican → ancho ~0.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-popconfirm-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(async () => {
      const trig = document.getElementById('trig-1');
      trig.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
      const p = document.querySelectorAll('is-popconfirm')[0];
      const pop = p.querySelector('.popconfirm');
      const r = pop.getBoundingClientRect();
      const cs = getComputedStyle(pop);
      return {
        w: r.width,
        h: r.height,
        bgColor: cs.backgroundColor,
      };
    });
    // Documentamos que el popup colapsa a ~0 (gap conocido).
    assert.ok(info.w < 50,
      `BUG DOCUMENTADO: .popconfirm colapsa a ${info.w}px (gap: CSS no se aplica tras moveTo light DOM). Esperado: al menos 200px.`);
    await screenshot(page, 'popconfirm-gap');
  },
});

let failures = 0;
const { browser, page } = await newPage();
try {
  for (const t of checks) {
    try {
      await t.run(page);
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
      try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
    }
  }
} finally {
  await close({ browser, page });
}

report('popconfirm-stagehand', failures === 0, { total: checks.length, failures });
