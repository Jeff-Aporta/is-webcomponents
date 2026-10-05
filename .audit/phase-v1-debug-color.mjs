// Debug: load color-picker and trace what fails.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}\n${e.stack}`));
page.on('console', (msg) => logs.push(`${msg.type()}: ${msg.text()}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Get element state
const info = await page.evaluate(() => {
  const el = document.querySelector('iswc-color-picker');
  // Try to access swatches setter manually
  return {
    hasSwatchesAttr: el?.hasAttribute('swatches'),
    swatchesAttr: el?.getAttribute('swatches'),
    swatchesGetter: (() => {
      try { return el?.swatches; } catch (e) { return `error: ${e.message}`; }
    })(),
  };
});
console.log('element info:', JSON.stringify(info, null, 2));
console.log('logs:');
logs.forEach((l) => console.log('  ', l));

await browser.close();