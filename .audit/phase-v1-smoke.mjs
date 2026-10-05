/**
 * Smoke test for 4 broken demos:
 * - color-picker
 * - file-input
 * - year-calendar
 * Logs any pageerror / console errors that fire during load.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const TARGETS = [
  '/demos/forms/color-picker/color-picker.html',
  '/demos/forms/file-input/file-input.html',
  '/demos/forms/year-calendar/year-calendar.html',
];

const browser = await chromium.launch();
const ctx = await browser.newContext();
const errors = {};

for (const path of TARGETS) {
  errors[path] = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors[path].push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors[path].push(`console.error: ${msg.text()}`);
  });
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    // Verify custom element is defined
    const tag = path.split('/').pop().replace('.html', '').replace(/^[a-z-]+-/, 'iswc-');
    const defined = await page.evaluate((t) => !!customElements.get(t), tag);
    errors[path].push(`customElements.get('${tag}'): ${defined}`);
  } catch (e) {
    errors[path].push(`navigation error: ${e.message}`);
  }
  await page.close();
}

await browser.close();
for (const [path, errs] of Object.entries(errors)) {
  console.log(`\n=== ${path} ===`);
  errs.forEach((e) => console.log(`  ${e}`));
}