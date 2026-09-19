// Scratch: correr EXACTAMENTE lo que hace el tour (3 URL visits + nav home)
// y registrar el selfBase del loader después de cada paso + cada request 4xx
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8491';
const B64 = (s) => Buffer.from(s, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const urlFor = (tag) => `${BASE}/?s=${B64(JSON.stringify({ component: tag }))}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const requests = [];
const responses = [];
page.on('request', (req) => {
  const url = req.url();
  if (!url.startsWith(BASE)) return;
  requests.push({ url: url.replace(BASE, ''), resourceType: req.resourceType() });
});
page.on('response', (resp) => {
  const url = resp.url();
  if (!url.startsWith(BASE)) return;
  if (resp.status() >= 400) responses.push({ status: resp.status(), url: url.replace(BASE, '') });
});

const inspectLoader = async (label) => {
  const s = await page.evaluate(() => {
    const L = globalThis.ISWebComponentsLoader;
    if (!L) return { error: 'no loader' };
    return {
      selfBase: L.selfBase,
      host: L.host,
    };
  });
  console.log(`  [loader @ ${label}] selfBase=${s.selfBase} host=${s.host}`);
};

// ── Step 1: boot ──
console.log('=== Step 1: boot index.html ===');
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(2000);
await inspectLoader('boot');

// ── Step 2: visitar 3 URL (incluyendo home) ──
console.log('\n=== Step 2: URL visits (subset) ===');
for (const t of ['is-button', 'is-icon', 'home']) {
  requests.length = 0;
  responses.length = 0;
  await page.goto(urlFor(t), { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await inspectLoader(`url:${t}`);
  if (responses.length) {
    console.log(`  ! URL ${t} produced ${responses.length} 4xx:`);
    responses.slice(0, 5).forEach(r => console.log(`    ${r.status} ${r.url}`));
  }
}

// ── Step 3: nav-click home ──
console.log('\n=== Step 3: re-boot y nav-click home ===');
requests.length = 0;
responses.length = 0;
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(2000);
await inspectLoader('re-boot');
requests.length = 0;
responses.length = 0;
await page.locator(`#shellNav .shell-nav__item[data-tag="home"]`).first().click({ timeout: 5000 });
await page.waitForTimeout(5000);
await inspectLoader('post-nav-home');
console.log(`  nav-click requests: ${requests.length}, 4xx: ${responses.length}`);
if (responses.length) responses.slice(0, 10).forEach(r => console.log(`    ${r.status} ${r.url}`));

await browser.close();
