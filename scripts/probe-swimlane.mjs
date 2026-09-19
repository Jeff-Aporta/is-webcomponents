// scripts/probe-swimlane.mjs
// Verifica el centrado del texto en los nodos de is-swimlane-diagram.
// Lee el SVG renderizado y mide la posición X de cada <text> dentro de <g.sw-step>
// contra el centro de la <rect/path> del step.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8491';
const state = Buffer.from(JSON.stringify({ component: 'is-swimlane-diagram' }), 'utf8').toString('base64url');
const URL = `${BASE}/?s=${state}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('is-main.main', { timeout: 15000 });
await page.waitForTimeout(2500);

const data = await page.evaluate(() => {
  const host = document.getElementById('previewHost');
  if (!host) return { error: 'no previewHost' };
  const main = host.querySelector('is-main.main');
  if (!main) return { error: 'no is-main' };
  const sw = main.querySelector('is-swimlane-diagram');
  if (!sw) return { error: 'no is-swimlane-diagram' };
  const svg = sw.shadowRoot?.querySelector('svg.sw-svg') ?? sw.querySelector('svg');
  if (!svg) return { error: 'no svg' };
  const steps = svg.querySelectorAll('g.sw-step');
  const result = [];
  for (const g of steps) {
    const box = g.querySelector('.sw-step__box');
    const text = g.querySelector('text');
    if (!box || !text) continue;
    const boxRect = box.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    const tspans = text.querySelectorAll('tspan');
    const tspanInfo = Array.from(tspans).map(ts => ({
      text: ts.textContent,
      x: ts.getAttribute('x'),
      y: ts.getAttribute('y'),
      rectX: ts.getBoundingClientRect().x,
      rectW: ts.getBoundingClientRect().width,
    }));
    result.push({
      stepId: g.dataset.stepId,
      boxCenterX: (boxRect.x + boxRect.width / 2),
      boxLeft: boxRect.x,
      boxRight: boxRect.x + boxRect.width,
      textRectX: textRect.x,
      textRectWidth: textRect.width,
      textCenterX: (textRect.x + textRect.width / 2),
      offset: (textRect.x + textRect.width / 2) - (boxRect.x + boxRect.width / 2),
      textHasAnchor: text.getAttribute('text-anchor'),
      textHasX: text.getAttribute('x'),
      tspans: tspanInfo,
      labelText: text.textContent?.slice(0, 80),
    });
  }
  return { steps: result, swHasShadow: !!sw.shadowRoot };
});

console.log('swHasShadow:', data.swHasShadow);
if (data.error) {
  console.log('ERROR:', data.error);
  process.exit(1);
}
for (const s of data.steps) {
  console.log(`--- step ${s.stepId} "${s.labelText}" ---`);
  console.log(`  box centerX: ${s.boxCenterX.toFixed(1)}, text centerX: ${s.textCenterX.toFixed(1)}, OFFSET: ${s.offset.toFixed(2)}px (debe ser ~0)`);
  console.log(`  text element: x="${s.textHasX}" text-anchor="${s.textHasAnchor}"`);
  for (const ts of s.tspans) {
    console.log(`    tspan "${ts.text}": x="${ts.x}" y="${ts.y}", renderedX=${ts.rectX.toFixed(1)} w=${ts.rectW.toFixed(1)}`);
  }
}
const maxOffset = Math.max(...data.steps.map((s) => Math.abs(s.offset)));
console.log(`\nMAX |offset|: ${maxOffset.toFixed(2)}px (umbral: 1px)`);
process.exit(maxOffset > 1 ? 1 : 0);

await browser.close();
