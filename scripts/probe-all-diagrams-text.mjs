// scripts/probe-all-diagrams-text.mjs
// Reproduce el bug de text-anchor en TODOS los diagramas.
// Devuelve la lista de demos con offset > 1px entre el centro del box y el centro del texto.
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://127.0.0.1:8491';
const PREVIEWS = 'dist/previews';
const DEMOS = ['flowchart', 'class-diagram', 'state-diagram', 'sequence-diagram', 'gantt', 'mindmap', 'sankey-diagram', 'use-case-diagram', 'block-diagram', 'venn-diagram', 'journey-map', 'quadrant-chart', 'org-chart'];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

let totalFails = 0;
for (const demo of DEMOS) {
  const tag = `is-${demo}`;
  const state = Buffer.from(JSON.stringify({ component: tag }), 'utf8').toString('base64url');
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?s=${state}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
    const data = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      if (!host) return null;
      const main = host.querySelector('is-main.main');
      if (!main) return null;
      // Buscar el custom element que renderiza el diagrama (cualquier is-*svg*).
      const candidates = main.querySelectorAll('*');
      let diagramRoot = null;
      for (const el of candidates) {
        if (el.tagName && el.tagName.startsWith('IS-') && el.tagName !== 'IS-MAIN' && el.shadowRoot) {
          const svg = el.shadowRoot.querySelector('svg');
          if (svg && svg.querySelectorAll('text').length > 1) {
            diagramRoot = el.shadowRoot;
            break;
          }
        }
      }
      if (!diagramRoot) {
        // Buscar SVG directo en el light DOM del preview.
        const svgs = main.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.querySelectorAll('text').length > 1) {
            diagramRoot = svg;
            break;
          }
        }
      }
      if (!diagramRoot) return null;
      const texts = Array.from(diagramRoot.querySelectorAll('text'));
      const result = [];
      for (const t of texts) {
        const tspans = t.querySelectorAll('tspan');
        if (tspans.length === 0) continue;
        const textRect = t.getBoundingClientRect();
        if (textRect.width === 0 || textRect.width > 600) continue;
        const textCenterX = textRect.x + textRect.width / 2;
        let parent = t.parentElement;
        let boxCenterX = null;
        while (parent && parent !== diagramRoot && boxCenterX == null) {
          const box = parent.querySelector('rect, path');
          if (box) {
            const r = box.getBoundingClientRect();
            if (r.width > 20 && r.height > 10 && r.width < 1000) {
              boxCenterX = r.x + r.width / 2;
            }
          }
          parent = parent.parentElement;
        }
        if (boxCenterX == null) continue;
        result.push({ offset: Math.abs(textCenterX - boxCenterX), text: (t.textContent || '').slice(0, 30) });
      }
      return result.slice(0, 5);
    });
    if (!data) continue;
    const maxOffset = Math.max(...data.map((d) => d.offset), 0);
    const status = maxOffset > 1.5 ? '❌' : '✅';
    console.log(`${status} ${tag}: maxOffset=${maxOffset.toFixed(1)}px`);
    if (maxOffset > 1.5) totalFails++;
    await page.close();
  } catch (e) {
    console.log(`?? ${tag}: error ${e.message.slice(0, 60)}`);
    await page.close();
  }
}
await browser.close();
console.log(`\n${totalFails}/${DEMOS.length} demos con texto descentrado`);
process.exit(totalFails > 0 ? 1 : 0);
