import { chromium } from 'playwright';

const state = Buffer.from(JSON.stringify({ component: 'is-code' })).toString('base64');
const url = `http://127.0.0.1:5505/apps/is-webcomponents/index.html?s=${state}&_=${Date.now()}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const findings = [];
const ok = (m) => findings.push({ ok: true, m });
const bad = (m) => findings.push({ ok: false, m });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);

  const pageBars = await page.locator('.file-meta-page').count();
  if (pageBars === 1) ok('file-meta-page único');
  else bad(`file-meta-page count=${pageBars} (esperado 1)`);

  const underH2 = await page.locator('.section > h2 + .file-meta').count();
  if (underH2 === 0) ok('sin meta bajo h2');
  else bad(`meta bajo h2: ${underH2}`);

  const inDemos = await page.locator('is-demo > .file-meta, .demo > .file-meta').count();
  if (inDemos === 0) ok('sin meta dentro de demos/papers');
  else bad(`meta en demos: ${inDemos}`);

  const paths = await page.locator('.file-meta-page code.file-meta__path').first().evaluate((el) => el.textContent);
  if (paths?.includes('.min.js')) ok(`path min: ${paths}`);
  else bad(`path no minificado: ${paths}`);

  const bytes = await page.locator('.file-meta-page is-format-bytes[value]').count();
  if (bytes > 0) ok(`format-bytes con value: ${bytes}`);
  else bad('sin pesos (is-format-bytes value)');

  const srcBtns = await page.locator('.file-meta-page .file-meta__src-btn').count();
  if (srcBtns >= 3) ok(`botones src: ${srcBtns}`);
  else bad(`botones src insuficientes: ${srcBtns}`);

  await page.locator('.file-meta-page .file-meta__src-btn[data-kind="js"]').first().click();
  await page.waitForTimeout(800);
  const dlg = await page.locator('is-dialog.is-view-sources').count();
  const open = await page.locator('is-dialog.is-view-sources[open], is-dialog.is-view-sources[data-open]').count()
    || await page.evaluate(() => {
      const d = document.querySelector('is-dialog.is-view-sources');
      return d && (d.open || d.hasAttribute('open') || d.getAttribute('aria-hidden') === 'false') ? 1 : 0;
    });
  if (dlg) ok(`dialog fuentes presente (open≈${open})`);
  else bad('click JS no abrió dialog fuentes');
} catch (e) {
  bad(String(e?.message || e));
} finally {
  await browser.close();
}

console.log(JSON.stringify({ url, findings, failed: findings.filter((f) => !f.ok).length }, null, 2));
process.exit(findings.some((f) => !f.ok) ? 1 : 0);
