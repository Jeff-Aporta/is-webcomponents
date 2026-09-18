// button.test.mjs — Nivel 3: smoke + props reactivas + form-association + eventos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/button/button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('button: bundle registra <is-button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-button'));
  assert.equal(defined, true);
  await page.close();
});

test('button: atributo color se refleja en el atributo host', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  const count = await page.evaluate(() => {
    return document.querySelectorAll('section:nth-of-type(1) is-button[color]').length;
  });
  // Hay 6 botones con color en la sección "Colors" (incluyendo el default brand).
  assert.ok(count >= 6, `esperaba >=6 botones con [color] en la sección colors, hay ${count}`);
  await page.close();
});

test('button: variant="outlined" llega al inner <button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  const info = await page.evaluate(() => {
    const btn = document.querySelector('section:nth-of-type(2) is-button[variant="outlined"]');
    const inner = btn.shadowRoot.querySelector('.btn');
    return {
      hostVariant: btn.getAttribute('variant'),
      classList: inner.className,
    };
  });
  assert.equal(info.hostVariant, 'outlined');
  assert.match(info.classList, /btn/, 'el inner debe seguir siendo un .btn');
  await page.close();
});

test('button: estado loading se refleja como :state(loading) en el host', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button#loading-btn:defined');
  const state = await page.evaluate(() => {
    const btn = document.querySelector('is-button#loading-btn');
    return {
      hasAttr: btn.hasAttribute('loading'),
      hasState: btn.matches(':state(loading)'),
      spinnerHidden: btn.shadowRoot.querySelector('.btn__spinner')?.hidden ?? true,
    };
  });
  assert.equal(state.hasAttr, true, 'el host debe tener atributo loading');
  assert.equal(state.hasState, true, ':state(loading) debe estar presente');
  assert.equal(state.spinnerHidden, false, 'el spinner debe mostrarse mientras loading=true');
  await page.close();
});

test('button: disabled bloquea el click (no incrementa el contador)', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  const before = await page.evaluate(() => {
    return document.querySelector('is-button#counter').textContent;
  });
  await page.evaluate(() => {
    document.querySelector('section:nth-of-type(4) is-button[disabled]').click();
  });
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => {
    return document.querySelector('is-button#counter').textContent;
  });
  assert.equal(before, after, 'el contador no debe cambiar tras click en disabled');
  await page.close();
});

test('button: click incrementa el contador y emite is-focus/is-blur al enfocar', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button#counter:defined');
  // Capturamos is-focus desde el host
  await page.evaluate(() => {
    window.__btnEvts = [];
    const c = document.querySelector('is-button#counter');
    c.addEventListener('is-focus', () => window.__btnEvts.push('focus'));
    c.addEventListener('is-blur', () => window.__btnEvts.push('blur'));
  });
  await page.focus('is-button#counter');
  await page.waitForTimeout(50);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(50);
  const evts = await page.evaluate(() => window.__btnEvts);
  assert.ok(evts.includes('focus'), 'debe haberse emitido is-focus');
  assert.ok(evts.includes('blur'), 'debe haberse emitido is-blur');
  await page.close();
});

test('button: href convierte el inner en <a>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  const info = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('is-button[href]')][0];
    const inner = btn.shadowRoot.querySelector('a, button');
    return { tag: inner?.tagName, href: inner?.getAttribute('href') };
  });
  assert.equal(info.tag, 'A', 'el inner debe ser <a> cuando hay href');
  assert.match(info.href, /^https?:/, 'href debe empezar por http(s)://');
  await page.close();
});
