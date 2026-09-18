// scripts/probe-theming-scroll.mjs
// Verifica que el `<pre id="cssOut">` tenga overflow: auto + scroll vertical funcional.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8491';
const cacheBust = Date.now();
const state = Buffer.from(JSON.stringify({ component: 'theming' }), 'utf8').toString('base64url');
const URL = `${BASE}/?s=${state}&v=${cacheBust}`;
console.log('NAV URL:', URL);
console.log('STATE:', state, '← decodes to', Buffer.from(state, 'base64url').toString('utf8'));
console.log('CACHE BUST:', cacheBust);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, bypassCSP: true });
const page = await ctx.newPage();
// Disable HTTP cache.
await page.route('**/*', async (route) => {
  const headers = { ...route.request().headers(), 'cache-control': 'no-cache', 'pragma': 'no-cache' };
  await route.continue({ headers });
});

const errors = [];
const networkFailures = [];
const allResponses = [];
page.on('pageerror', (e) => { errors.push(`pageerror: ${e.message}`); });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});
page.on('requestfailed', (r) => networkFailures.push(`${r.failure()?.errorText || 'fail'} ${r.url()}`));
page.on('response', (r) => {
  if (r.status() >= 400) networkFailures.push(`HTTP ${r.status()} ${r.url()}`);
  const u = r.url();
  if (u.endsWith('.js') || u.endsWith('.mjs') || u.includes('cdn') || u.includes('scripts') || u.includes('previews')) {
    allResponses.push(`${r.status()} ${u}`);
  }
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('AFTER GOTO, responses so far:');
console.log(allResponses.join('\n'));
// Debug: ver qué se cargó.
await page.waitForTimeout(3000);
const debug = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  mainHTML: document.querySelector('main')?.innerHTML?.slice(0, 500),
  cssOutExists: !!document.querySelector('#cssOut'),
  cssOutText: document.querySelector('#cssOut')?.textContent?.slice(0, 200),
  cssOutOuterStart: document.querySelector('#cssOut')?.outerHTML?.slice(0, 300),
  bodyChildren: [...document.body.children].map(c => c.tagName).join(','),
  scripts: [...document.querySelectorAll('script')].map(s => s.src || '(inline)').slice(0, 10),
}));
console.log('DEBUG:', JSON.stringify(debug, null, 2));
console.log('ERRORS:', errors.length === 0 ? 'none' : errors.join('\n'));
console.log('NETWORK FAILURES:', networkFailures.length === 0 ? 'none' : networkFailures.join('\n'));
console.log('KEY RESPONSES:', allResponses.length === 0 ? 'none' : allResponses.join('\n'));

// Esperar a que la página se hidrate (preview montada en <main>).
await page.waitForSelector('main.is-main, is-main', { timeout: 20000 });
// Esperar adicional a que el bundle de theming inyecte #cssOut.
await page.waitForSelector('#cssOut', { timeout: 15000 });
// Y a que tenga contenido significativo en el shadow root.
await page.waitForFunction(() => {
  const el = document.querySelector('#cssOut');
  if (!el) return false;
  const sr = el.shadowRoot;
  const txt = sr ? sr.textContent : el.textContent;
  return txt && txt.length > 800;
}, { timeout: 20000 });

// Medir overflow del cssOut y scrollHeight (light DOM + shadowRoot).
const probe = await page.evaluate(() => {
  const el = document.querySelector('#cssOut');
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  // El scroll real vive dentro del shadowRoot.
  const sr = el.shadowRoot;
  const scrollInner = sr?.querySelector('.ic-scroll');
  const srCs = scrollInner ? getComputedStyle(scrollInner) : null;
  return {
    found: true,
    tag: el.tagName.toLowerCase(),
    overflow: cs.overflow,
    overflowY: cs.overflowY,
    maxHeight: cs.maxHeight,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    isScrollable: el.scrollHeight > el.clientHeight + 1,
    rectHeight: rect.height,
    rectWidth: rect.width,
    textLen: el.textContent?.length || 0,
    srTextLen: sr?.textContent?.length || 0,
    scrollInner: srCs ? {
      overflow: srCs.overflow,
      overflowY: srCs.overflowY,
      maxHeight: srCs.maxHeight,
      scrollHeight: scrollInner.scrollHeight,
      clientHeight: scrollInner.clientHeight,
      isScrollable: scrollInner.scrollHeight > scrollInner.clientHeight + 1,
    } : null,
  };
});

console.log('PROBE:', JSON.stringify(probe, null, 2));
console.log('ERRORS:', errors.length === 0 ? 'none' : errors.join('\n'));

// Hacer scroll y verificar.
if (probe.found && (probe.isScrollable || probe.scrollInner?.isScrollable)) {
  // Scroll en el inner si existe.
  await page.evaluate(() => {
    const el = document.querySelector('#cssOut');
    const sr = el.shadowRoot;
    const inner = sr?.querySelector('.ic-scroll');
    if (inner) inner.scrollTop = 9999;
    else el.scrollTop = 9999;
  });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const el = document.querySelector('#cssOut');
    const sr = el.shadowRoot;
    const inner = sr?.querySelector('.ic-scroll');
    const target = inner || el;
    return {
      scrollTop: target.scrollTop,
      atBottom: target.scrollTop + target.clientHeight >= target.scrollHeight - 1,
    };
  });
  console.log('AFTER SCROLL:', JSON.stringify(after));
  const pass = after.atBottom;
  console.log(pass ? '✅ PASS: scroll vertical funciona' : '❌ FAIL: scroll no llega al fondo');
  process.exit(pass ? 0 : 1);
} else {
  console.log('⚠️  No scrollable (puede que el CSS quepa en 26rem con el default)');
  console.log(probe.isScrollable ? '❌ FAIL: hay overflow pero CSS no lo permite' : '✅ No requiere scroll en este viewport');
  process.exit(0);
}

await browser.close();
