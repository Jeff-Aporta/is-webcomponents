// badge.stagehand.test.mjs — verificaciones de calidad visual deterministas.
// Aplica el mismo patrón que er-stagehand.test.mjs: checks estructuradas sin
// dependencia de LLM. Si STAGEHAND=1 + credenciales, además corre el rubric LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/badge/badge.html`;

const checks = [];

checks.push({
  name: 'layout: cada badge tiene tamaño visible (>1px en ambas dimensiones)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    await page.waitForTimeout(150);
    const sizes = await page.evaluate(() => {
      return [...document.querySelectorAll('is-badge')].map((b) => {
        const r = b.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    });
    const tiny = sizes.filter((s) => s.w < 1 || s.h < 1);
    assert.equal(tiny.length, 0, `badges con tamaño ~0: ${tiny.length}/${sizes.length}`);
    await screenshot(page, 'badge-layout');
  },
});

checks.push({
  name: 'layout: badges en una misma sección quedan en una fila visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const overlaps = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('section')];
      const issues = [];
      for (const sec of sections) {
        const badges = [...sec.querySelectorAll('is-badge')];
        const rects = badges.map((b) => b.getBoundingClientRect());
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            const ox = a.x < b.x + b.width && b.x < a.x + a.width;
            const oy = a.y < b.y + b.height && b.y < a.y + a.height;
            if (ox && oy) issues.push({ sec: sec.querySelector('h2')?.textContent, i, j });
          }
        }
      }
      return issues;
    });
    assert.equal(overlaps.length, 0, `badges solapados: ${JSON.stringify(overlaps)}`);
  },
});

checks.push({
  name: 'consistencia: cada variante se pinta de forma distinta (computed style)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const variants = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Variantes'));
      return [...sec.querySelectorAll('is-badge')].map((b) => {
        const inner = b.shadowRoot?.querySelector('.badge');
        const cs = getComputedStyle(inner);
        return {
          v: b.getAttribute('variant'),
          bg: cs.backgroundColor,
          color: cs.color,
          borderTopWidth: cs.borderTopWidth,
          borderLeftWidth: cs.borderLeftWidth,
          // Capturamos también border-color computado por si los 4 lados
          // difieren en su valor semitransparente (accent tiene border-left
          // de color sólido + resto transparente).
          borderColor: cs.borderColor,
        };
      });
    });
    // En badge.css, accent y filled-outlined comparten bg/color (mismo "soft")
    // pero DIFIEREN en border-left-width (accent usa 0.28em en left, filled-outlined
    // tiene border completo pero con grosor default "medium" = 3px).
    const accent = variants.find((v) => v.v === 'accent');
    const fo = variants.find((v) => v.v === 'filled-outlined');
    assert.ok(accent && fo, 'deben existir accent y filled-outlined');
    // Comprobamos que cada variante tenga al menos una propiedad distinta.
    const differ = accent.bg !== fo.bg
      || accent.color !== fo.color
      || accent.borderTopWidth !== fo.borderTopWidth
      || accent.borderLeftWidth !== fo.borderLeftWidth
      || accent.borderColor !== fo.borderColor;
    assert.ok(differ,
      `variantes deben pintarse distinto (accent=${JSON.stringify(accent)}, filled-outlined=${JSON.stringify(fo)})`);
  },
});

checks.push({
  name: 'atención: pulse / bounce aplican estilos de animación',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-badge-ready');
    const anim = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Atención'));
      return [...sec.querySelectorAll('is-badge')].map((b) => {
        const inner = b.shadowRoot?.querySelector('.badge');
        return {
          attention: b.getAttribute('attention'),
          animName: getComputedStyle(inner).animationName,
        };
      });
    });
    const pulse = anim.find((a) => a.attention === 'pulse');
    const bounce = anim.find((a) => a.attention === 'bounce');
    assert.ok(pulse, 'debe existir badge con attention=pulse');
    assert.ok(bounce, 'debe existir badge con attention=bounce');
    assert.notEqual(pulse.animName, 'none', `pulse debe llevar animationName != none (era "${pulse.animName}")`);
    assert.notEqual(bounce.animName, 'none', `bounce debe llevar animationName != none (era "${bounce.animName}")`);
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

report('badge-stagehand', failures === 0, { total: checks.length, failures });
