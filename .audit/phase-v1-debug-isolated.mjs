// Debug: instantiate iswc-color-picker in isolation.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'load' });
await page.waitForTimeout(2000);

console.log('Page errors:', logs);

// Check actual hex input value via getAttribute/property
const info = await page.evaluate(() => {
  const el = document.querySelectorAll('iswc-color-picker');
  return Array.from(el).map((cp, i) => {
    const hex = cp.shadowRoot?.querySelector('.hex');
    return {
        i,
        hexTag: hex?.tagName,
        hexValue: hex?.value,
        hexValueType: typeof hex?.value,
      };
  });
});
console.log('Hex element info:', JSON.stringify(info, null, 2));

await browser.close();