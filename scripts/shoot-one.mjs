// scripts/shoot-one.mjs
// Captura un solo demo.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const TAG = process.argv[2] || 'is-heatmap';
const OUT = process.argv[3] || `./.shot-${TAG}.png`;
mkdirSync('./.shots', { recursive: true });
const state = Buffer.from(JSON.stringify({ component: TAG }), 'utf8').toString('base64url');
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`http://127.0.0.1:8491/?s=${state}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: OUT });
// Inspeccionar las posiciones de los texts.
const positions = await page.evaluate(() => {
  const host = document.getElementById('previewHost');
  const main = host?.querySelector('is-main.main');
  const heatmap = main?.querySelector('is-heatmap');
  const svg = heatmap?.shadowRoot?.querySelector('svg');
  if (!svg) return null;
  const texts = Array.from(svg.querySelectorAll('text'));
  return texts.map((t) => ({
    text: (t.textContent || '').slice(0, 20),
    x: t.getAttribute('x'),
    y: t.getAttribute('y'),
    transform: t.getAttribute('transform'),
    bbox: t.getBoundingClientRect(),
  }));
});
console.log(JSON.stringify(positions, null, 2));
await browser.close();
