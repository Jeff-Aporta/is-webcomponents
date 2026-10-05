// Capture timing: what's the value of #hex.value at the moment of j() call?
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}\nstack: ${e['stack']}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

// Read internal state
const info = await page.evaluate(() => {
  const cp = document.querySelector('iswc-color-picker');
  const hex = cp.shadowRoot?.querySelector('.hex');
  // Find the private field via WeakMap (tricky in compiled code)
  const hexProto = Object.getPrototypeOf(hex);
  const props = Object.getOwnPropertyNames(hexProto);
  return {
    hexProps: props,
    hexHasValue: 'value' in hex,
    hexValue: hex.value,
    hexInternalHTML: hex.shadowRoot?.innerHTML?.slice(0, 200),
    hexInputEl: hex.shadowRoot?.querySelector('#input')?.value,
  };
});
console.log('hex info:', JSON.stringify(info, null, 2));
console.log('\nlogs:');
logs.forEach((l) => console.log(l));
await browser.close();