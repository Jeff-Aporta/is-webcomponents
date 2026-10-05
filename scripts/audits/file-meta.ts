import { chromium } from 'playwright';

const state = Buffer.from(JSON.stringify({ component: 'iswc-code' })).toString('base64');
const url = `http://127.0.0.1:8391/?s=${state}&_=${Date.now()}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const findings = [];
const ok = (m) => findings.push({ ok: true, m });
const bad = (m) => findings.push({ ok: false, m });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);

  // Contrato actual: no hay barra JS/CSS/MD + CDN en demos.
  const pageBars = await page.locator('.file-meta-page, .file-meta').count();
  if (pageBars === 0) ok('sin file-meta en la página');
  else bad(`file-meta residual count=${pageBars} (esperado 0)`);

  const underH2 = await page.locator('.section > h2 + .file-meta').count();
  if (underH2 === 0) ok('sin meta bajo h2');
  else bad(`meta bajo h2: ${underH2}`);

  const inDemos = await page.locator('iswc-demo > .file-meta, .demo > .file-meta').count();
  if (inDemos === 0) ok('sin meta dentro de demos/papers');
  else bad(`meta en demos: ${inDemos}`);
} catch (e) {
  bad(String(e?.message || e));
} finally {
  await browser.close();
}

console.log(JSON.stringify({ url, findings, failed: findings.filter((f) => !f.ok).length }, null, 2));
process.exit(findings.some((f) => !f.ok) ? 1 : 0);
