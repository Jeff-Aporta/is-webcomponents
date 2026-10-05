// Debug: load color-picker and trace what fails.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}`));
page.on('console', (msg) => logs.push(`${msg.type()}: ${msg.text()}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Get element state
const info = await page.evaluate(() => {
  const els = document.querySelectorAll('iswc-color-picker');
  return Array.from(els).map((el, i) => ({
    index: i,
    hasSwatchesAttr: el.hasAttribute('swatches'),
    swatchesAttr: el.getAttribute('swatches'),
    value: el.value,
    swatchesGetter: (() => {
      try { return el.swatches; } catch (e) { return `error: ${e['message']}`; }
    })(),
  }));
});
console.log('element info:', JSON.stringify(info, null, 2));
console.log('logs:');
logs.forEach((l) => console.log('  ', l));

await browser.close();