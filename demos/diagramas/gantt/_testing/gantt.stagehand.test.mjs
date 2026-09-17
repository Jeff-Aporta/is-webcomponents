// gantt.stagehand.test.mjs — render + a11y + prefers-reduced-motion.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/gantt/gantt.html`;
const tests = [];

tests.push({
  name: 'render: 6 tareas + 5 flechas en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const info = await page.evaluate(() => {
      const g = document.querySelector('is-gantt-diagram');
      const sr = g?.shadowRoot;
      const tasks = sr?.querySelectorAll('[data-task-id]').length ?? 0;
      const arrows = sr?.querySelectorAll('[data-arrow-id]').length ?? 0;
      return { tasks, arrows, svg: !!sr?.querySelector('svg') };
    });
    assert.ok(info.svg, 'debe haber SVG');
    assert.ok(info.tasks >= 6, `esperaba >=6 tareas (hay ${info.tasks})`);
    assert.ok(info.arrows >= 5, `esperaba >=5 flechas (hay ${info.arrows})`);
    await screenshot(page, 'gantt-render');
  },
});

tests.push({
  name: 'a11y: SVG con role o aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const a11y = await page.evaluate(() => {
      const svg = document.querySelector('is-gantt-diagram')?.shadowRoot?.querySelector('svg');
      return { role: svg?.getAttribute('role'), ariaLabel: svg?.getAttribute('aria-label') };
    });
    assert.ok(a11y.role || a11y.ariaLabel, 'SVG debe ser accesible');
  },
});

tests.push({
  name: 'reduced-motion: render estable con prefers-reduced-motion',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const tasks = await page.evaluate(() => {
      return document.querySelector('is-gantt-diagram')?.shadowRoot?.querySelectorAll('[data-task-id]').length ?? 0;
    });
    assert.ok(tasks >= 6, 'debe renderizar igual');
  },
});

tests.push({
  name: 'stagehand: rubric (skip si no disponible)',
  run: async () => {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('    ⊘ stagehand no disponible, skipping');
      return;
    }
    const { browser, page } = await newPage();
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await waitReady(page, 'data-gantt-ready');
      await page.waitForTimeout(400);
      const shot = await screenshot(page, 'gantt-stagehand');
      const result = await sh.act(`
Evalúa este Gantt. Checklist:
1. Cada tarea tiene una barra visible con etiqueta legible.
2. Las flechas de dependencia conectan predecesor y sucesor correctamente.
3. Los milestones son identificables (forma distinta).
4. El diagrama cabe en el viewport sin recortes.
Responde SOLO con JSON: { "bars_visible": "PASS|FAIL", "arrows_correct": "PASS|FAIL", "milestones_visible": "PASS|FAIL", "in_viewport": "PASS|FAIL", "summary": "..." }
      `.trim(), { image: shot });
      console.log('    stagehand:', JSON.parse(result?.output ?? result?.text ?? '{}').summary ?? '(sin summary)');
    } finally {
      await sh.close?.().catch(() => {});
      await close({ browser, page });
    }
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('gantt-stagehand', failures === 0, { total: tests.length, failures });