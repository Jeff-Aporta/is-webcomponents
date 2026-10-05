// Debug: load color-picker and trace each error's stack.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e['message']}\nstack: ${e['stack']}`));

await page.goto(`${BASE}/demos/forms/color-picker/color-picker.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

logs.forEach((l) => console.log(l, '\n---'));
await browser.close();