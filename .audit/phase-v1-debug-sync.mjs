// Trace the failing call by patching normalizeHex
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}\nstack: ${e['stack']}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'load' });
await page.waitForTimeout(2000);

// Try to access things after load to see actual state
const state = await page.evaluate(() => {
  const cps = document.querySelectorAll('iswc-color-picker');
  const input = document.querySelector('iswc-input');
  return {
    cpCount: cps.length,
    firstCpConnected: cps[0]?.isConnected,
    inputDefined: !!customElements.get('iswc-input'),
    inputConnected: input?.isConnected,
    firstCpShadow: !!cps[0]?.shadowRoot,
    firstCpHexEl: cps[0]?.shadowRoot?.querySelector('.hex')?.tagName,
    firstCpHexValue: cps[0]?.shadowRoot?.querySelector('.hex')?.value,
  };
});
console.log('state after load:', JSON.stringify(state, null, 2));
console.log('\nerrors:');
logs.forEach((l) => console.log(l, '\n---'));

await browser.close();