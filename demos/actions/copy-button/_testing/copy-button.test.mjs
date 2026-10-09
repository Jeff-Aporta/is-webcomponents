// copy-button.test.mjs — Nivel 3: smoke + props + flujo de copia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/copy-button/copy-button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); await browser.contexts()[0]?.grantPermissions?.(['clipboard-read', 'clipboard-write']); });
test.after(async () => { await browser?.close(); });

test('copy-button: bundle registra <iswc-copy-button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-copy-button:defined');
  const defined = await page.evaluate(() => !!customElements.get('iswc-copy-button'));
  assert.equal(defined, true);
  await page.close();
});

test('copy-button: atributo value queda en la propiedad', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-copy-button:defined');
  const val = await page.evaluate(() => {
    return document.querySelector('iswc-copy-button[value]').value;
  });
  assert.match(val, /npm install/);
  await page.close();
});

test('copy-button: click en el botón dispara la copia y emite iswc-copy', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-copy-button:defined');
  await page.evaluate(() => {
    window.__cpEvt = null;
    document.querySelector('iswc-copy-button').addEventListener('iswc-copy', (e) => {
      window.__cpEvt = e.detail;
    });
  });
  // Click en el <iswc-button> interno (trigger)
  await page.evaluate(() => {
    const cb = document.querySelector('iswc-copy-button');
    cb.shadowRoot.querySelector('iswc-button').click();
  });
  await page.waitForTimeout(150);
  const detail = await page.evaluate(() => window.__cpEvt);
  assert.ok(detail, 'iswc-copy debe haberse emitido');
  assert.match(detail.value, /npm install/);
  // Clipboard contiene lo mismo
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clip, /npm install/);
  await ctx.close();
});

test('copy-button: from="snippet" copia el texto del elemento referenciado', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-copy-button:defined');
  await page.evaluate(() => {
    const cb = document.querySelector('iswc-copy-button[from]');
    cb.shadowRoot.querySelector('iswc-button').click();
  });
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clip, /require\('iswc-root'\)/);
  await ctx.close();
});

test('copy-button: atributo disabled bloquea la copia', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-copy-button[disabled]:defined');
  await page.evaluate(() => {
    window.__cpDisabled = 0;
    document.querySelector('iswc-copy-button[disabled]').addEventListener('iswc-copy', () => {
      window.__cpDisabled += 1;
    });
  });
  await page.evaluate(() => {
    const cb = document.querySelector('iswc-copy-button[disabled]');
    cb.shadowRoot.querySelector('iswc-button').click();
  });
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => window.__cpDisabled);
  assert.equal(n, 0, 'click sobre disabled no debe disparar iswc-copy');
  await ctx.close();
});

test('copy-button: feedback state visible tras copiar', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-copy-button:defined');
  await page.evaluate(() => {
    document.querySelector('iswc-copy-button').shadowRoot.querySelector('iswc-button').click();
  });
  await page.waitForTimeout(80);
  const state = await page.evaluate(() => {
    const cb = document.querySelector('iswc-copy-button');
    const successIcon = cb.shadowRoot.querySelector('[data-state="success"]');
    const copyIcon = cb.shadowRoot.querySelector('[data-state="copy"]');
    return {
      hasSuccessState: cb.matches(':state(success)'),
      successHidden: successIcon?.hidden,
      copyHidden: copyIcon?.hidden,
    };
  });
  assert.equal(state.hasSuccessState, true, ':state(success) debe estar presente');
  assert.equal(state.successHidden, false, 'icon success debe mostrarse');
  assert.equal(state.copyHidden, true, 'icon copy debe ocultarse');
  await ctx.close();
});
