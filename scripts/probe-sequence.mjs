// scripts/probe-sequence.mjs
// Probe específico para sequence-diagram: verifica mensajes centrados en su chip.
import { chromium } from 'playwright';

const state = Buffer.from(JSON.stringify({ component: 'is-sequence-diagram' }), 'utf8').toString('base64url');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:8491/?s=${state}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const data = await page.evaluate(() => {
  const host = document.getElementById('previewHost');
  const main = host.querySelector('is-main.main');
  const seq = main.querySelector('is-sequence-diagram');
  const svg = seq.shadowRoot?.querySelector('svg');
  const labels = svg.querySelectorAll('text.seq-label-text');
  return Array.from(labels).slice(0, 5).map((t) => {
    const tspans = t.querySelectorAll('tspan');
    const textRect = t.getBoundingClientRect();
    const textCenterX = textRect.x + textRect.width / 2;
    const firstTspanX = tspans[0]?.getAttribute('x');
    const firstTspanAnchor = tspans[0]?.getAttribute('text-anchor');
    const textElementAnchor = t.getAttribute('text-anchor');
    return {
      text: t.textContent.slice(0, 30),
      textCenterX,
      firstTspanX,
      firstTspanAnchor,
      textElementAnchor,
      tspansCount: tspans.length,
    };
  });
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
