// Verify the fix addresses the documented bugs by comparing.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'load' });
await page.waitForTimeout(1500);

// Check the swatches attribute is correctly set after our fix
const info = await page.evaluate(() => {
  const els = document.querySelectorAll('iswc-color-picker');
  const paletta = els[1]; // second one has swatches
  return {
    palettaAttr: paletta?.getAttribute('swatches'),
    palettaSwatches: paletta?.swatches,
    palettaSwatchesLen: paletta?.swatches?.length,
  };
});
console.log('After fix, paletta state:', JSON.stringify(info, null, 2));
console.log('\nlogs:', logs);
await browser.close();