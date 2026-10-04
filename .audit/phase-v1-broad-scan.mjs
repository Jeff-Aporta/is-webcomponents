// Broad scan: load every demo in demos/forms/ and capture page errors.
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:8491';
const ROOT = 'C:/ContaPyme/Personal/apps/is-webcomponents/demos/forms';

const forms = readdirSync(ROOT).filter((n) => {
  const full = join(ROOT, n);
  if (!statSync(full).isDirectory()) return false;
  if (n === '_testing') return false;
  return true;
});

const targets = [];
for (const f of forms) {
  const html = join(ROOT, f, `${f}.html`);
  try { statSync(html); targets.push(`/demos/forms/${f}/${f}.html`); }
  catch { /* skip missing */ }
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const results = [];

for (const path of targets) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (ev) => errs.push(`pageerror: ${ev.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errs.push(`console.error: ${msg.text()}`);
  });
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.waitForTimeout(300);
    const tag = 'iswc-' + path.split('/').pop().replace('.html', '');
    const defined = await page.evaluate((t) => Boolean(customElements.get(t)), tag);
    results.push({ path, errs, defined });
  } catch (e) {
    results.push({ path, errs: [`navigation: ${e.message}`], defined: false });
  }
  await page.close();
}

await browser.close();

const broken = results.filter((r) => r.errs.length > 0);
console.log(`Scanned ${results.length} demos; ${broken.length} broken.`);
for (const r of broken) {
  console.log(`\n=== ${r.path} ===`);
  console.log(`  defined: ${r.defined}`);
  r.errs.forEach((m) => console.log(`  ${m}`));
}

console.log('\n--- All defined status ---');
for (const r of results) {
  if (!r.defined) console.log(`  NOT defined: ${r.path} (${'iswc-' + r.path.split('/').pop().replace('.html', '')})`);
}