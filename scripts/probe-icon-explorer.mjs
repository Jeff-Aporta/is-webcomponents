// Scratch: trazar is-input nav
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8491';
const B64 = (s) => Buffer.from(s, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const urlFor = (tag) => `${BASE}/?s=${B64(JSON.stringify({ component: tag }))}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const requests = [];
page.on('request', (req) => {
  if (req.url().includes('picsum') || req.url().includes('googleapis') || req.url().includes('is-input')) {
    requests.push({ url: req.url(), resourceType: req.resourceType() });
  }
});
const responses = [];
page.on('response', (resp) => {
  if (resp.url().includes('picsum') || resp.url().includes('googleapis') || resp.url().includes('is-input')) {
    if (resp.status() >= 400) responses.push(`${resp.status()} ${resp.url()}`);
  }
});

await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.locator(`#shellNav .shell-nav__item[data-tag="is-input"]`).first().click({ timeout: 5000 });
await page.waitForTimeout(5000);

console.log('=== requests involving picsum/googleapis/is-input ===');
requests.forEach(r => console.log(`  ${r.resourceType.padEnd(10)} ${r.url.slice(0, 150)}`));
console.log('\n=== 4xx ===');
responses.forEach(r => console.log(`  ${r}`));

await browser.close();
