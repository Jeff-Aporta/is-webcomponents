// Debug: load color-picker without it importing input.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}`));
page.on('console', (msg) => {
  if (msg.type() === 'log') logs.push(`log: ${msg.text()}`);
});

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

// Inject state-checking code at the right moment
const info = await page.evaluate(async () => {
  // Trigger a sync manually by clicking
  const cp = document.querySelector('iswc-color-picker');
  if (!cp) return { error: 'no cp' };
  const shadow = cp.shadowRoot;
  const hexEl = shadow?.querySelector('.hex');
  return {
    hexTagName: hexEl?.tagName,
      hexProto: hexEl ? Object.getPrototypeOf(hexEl).constructor.name : 'unknown',
      hexDefined: hexEl ? !!customElements.get(hexEl.tagName.toLowerCase()) : false,
      hexValue: hexEl?.value,
      hexValueType: typeof hexEl?.value,
      shadowChildren: Array.from(shadow?.children ?? []).map(c => c.tagName),
    };
});
console.log('Info:', JSON.stringify(info, null, 2));

console.log('Errors during load:', logs);

await browser.close();