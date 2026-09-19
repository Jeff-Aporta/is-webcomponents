// Scratch: trazar el nav-click y ver TODAS las requests network que se disparan
// y el contexto/origen de cada una (page principal vs iframe).
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8491';
const TAG = 'is-flex-options'; // uno de los 48

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const requests = [];
page.on('request', (req) => {
  const url = req.url();
  if (!url.startsWith(BASE)) return;
  const fromFrame = req.frame() !== page.mainFrame();
  requests.push({
    url: url.replace(BASE, ''),
    method: req.method(),
    resourceType: req.resourceType(),
    fromIframe: fromFrame,
    frameUrl: fromFrame ? req.frame()?.url()?.replace(BASE, '') : null,
  });
});

const responses = [];
page.on('response', (resp) => {
  const url = resp.url();
  if (!url.startsWith(BASE)) return;
  if (resp.status() >= 400) {
    const fromFrame = resp.frame() !== page.mainFrame();
    responses.push({
      status: resp.status(),
      url: url.replace(BASE, ''),
      fromIframe: fromFrame,
      frameUrl: fromFrame ? resp.frame()?.url()?.replace(BASE, '') : null,
    });
  }
});

await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(2000);

// Limpiar y disparar nav-click
requests.length = 0;
responses.length = 0;
const sel = `#shellNav .shell-nav__item[data-tag="${TAG}"]`;
const found = await page.locator(sel).count();
console.log(`Nav item count for "${TAG}": ${found}`);
if (found > 0) {
  await page.locator(sel).first().click({ timeout: 5000 });
  await page.waitForTimeout(3000);
}

console.log('\n=== ALL requests during nav-click ===');
requests.forEach((r, i) => {
  const tag = r.fromIframe ? `[iframe ${r.frameUrl}]` : '[main]';
  console.log(`  ${String(i+1).padStart(2)}. ${tag} ${r.method} (${r.resourceType}) ${r.url}`);
});

console.log('\n=== 4xx/5xx RESPONSES ===');
responses.forEach((r) => {
  const tag = r.fromIframe ? `[iframe ${r.frameUrl}]` : '[main]';
  console.log(`  ${r.status} ${tag} ${r.url}`);
});

await browser.close();
