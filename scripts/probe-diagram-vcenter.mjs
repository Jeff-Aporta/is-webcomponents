// scripts/probe-diagram-vcenter.mjs
// Verifica centrado horizontal Y vertical de los nodos en diagramas SVG.
// Reproduce el bug vertical que el usuario reportó (texto en cuadrante superior del óvalo).
import { chromium } from 'playwright';

const TAG = process.argv[2] || 'is-use-case-diagram';
const state = Buffer.from(JSON.stringify({ component: TAG }), 'utf8').toString('base64url');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:8491/?s=${state}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const data = await page.evaluate((tag) => {
  const host = document.getElementById('previewHost');
  const main = host?.querySelector('is-main.main');
  const comp = main?.querySelector(tag);
  const svg = comp?.shadowRoot?.querySelector('svg');
  if (!svg) return { error: 'no svg' };
  const texts = Array.from(svg.querySelectorAll('text'));
  const result = [];
  for (const t of texts) {
    if (t.querySelectorAll('tspan').length === 0) continue;
    const textRect = t.getBoundingClientRect();
    if (textRect.width === 0) continue;
    const textCenterX = textRect.x + textRect.width / 2;
    const textCenterY = textRect.y + textRect.height / 2;
    let parent = t.parentElement;
    let boxCenterX = null, boxCenterY = null;
    while (parent && parent !== svg && boxCenterX == null) {
      const box = parent.querySelector('rect, path, ellipse');
      if (box) {
        const r = box.getBoundingClientRect();
        if (r.width > 20 && r.height > 10 && r.width < 1000) {
          boxCenterX = r.x + r.width / 2;
          boxCenterY = r.y + r.height / 2;
        }
      }
      parent = parent.parentElement;
    }
    if (boxCenterX == null) continue;
    result.push({
      text: (t.textContent || '').slice(0, 30),
      offX: Math.abs(textCenterX - boxCenterX),
      offY: Math.abs(textCenterY - boxCenterY),
      hOffset: textCenterY - boxCenterY,
    });
  }
  return result.slice(0, 8);
}, TAG);

if (data.error) {
  console.log('ERROR:', data.error);
} else {
  console.log(`${TAG}:`);
  for (const r of data) {
    console.log(`  "${r.text}"  offX=${r.offX.toFixed(1)}  offY=${r.offY.toFixed(1)}  (vertical hOffset: ${r.hOffset.toFixed(1)}px, ${r.hOffset < 0 ? 'ARRIBA' : 'ABAJO'} del centro)`);
  }
}
await browser.close();
