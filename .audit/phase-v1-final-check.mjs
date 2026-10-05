// Final check: visual verification that the components render.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8491';
const TARGETS = [
  '/demos/forms/color-picker/color-picker.html',
  '/demos/forms/file-input/file-input.html',
  '/demos/forms/year-calendar/year-calendar.html',
];

const browser = await chromium.launch();
const ctx = await browser.newContext();

for (const path of TARGETS) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`${e['message']}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errs.push(`console.error: ${msg.text()}`);
  });

  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Verify each instance renders
  const status = await page.evaluate((p) => {
    const tag = 'iswc-' + p.split('/').pop().replace('.html', '');
    const els = document.querySelectorAll(tag);
    return {
      tag,
      count: els.length,
      firstConnected: els[0]?.isConnected,
      firstHasShadow: !!els[0]?.shadowRoot,
    };
  }, path);

  console.log(`\n=== ${path} ===`);
  console.log(`  tag: ${status.tag}, count: ${status.count}, firstConnected: ${status.firstConnected}, firstHasShadow: ${status.firstHasShadow}`);
  if (errs.length) {
    console.log(`  errors (${errs.length}):`);
    errs.forEach((m) => console.log(`    ${m}`));
  } else {
    console.log('  no errors');
  }
  await page.close();
}

await browser.close();