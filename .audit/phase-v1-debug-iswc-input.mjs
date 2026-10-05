// Debug: check whether iswc-input is defined.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  return {
    iswcInput: !!customElements.get('iswc-input'),
    iswcButton: !!customElements.get('iswc-button'),
    iswcIcon: !!customElements.get('iswc-icon'),
    iswcColorPicker: !!customElements.get('iswc-color-picker'),
  };
});
console.log('component defs:', JSON.stringify(info, null, 2));

const elInfo = await page.evaluate(() => {
  const el = document.querySelector('iswc-color-picker');
  const shadow = el.shadowRoot;
  return {
    hexEl: shadow ? shadow.querySelector('.hex')?.tagName : 'no-shadow',
    hexIsDefined: shadow ? !!customElements.get(shadow.querySelector('.hex')?.tagName.toLowerCase()) : false,
    hexValue: shadow?.querySelector('.hex')?.value,
  };
});
console.log('el info:', JSON.stringify(elInfo, null, 2));

await browser.close();