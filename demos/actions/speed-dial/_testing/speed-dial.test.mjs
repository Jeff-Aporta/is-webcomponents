// speed-dial.test.mjs — Nivel 3: smoke + open/close + iswc-toggle + iswc-select.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/speed-dial/speed-dial.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('speed-dial: bundle registra <iswc-speed-dial>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  const defined = await page.evaluate(() => !!customElements.get('iswc-speed-dial'));
  assert.equal(defined, true);
  await page.close();
});

test('speed-dial: isOpen refleja el atributo open', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  await page.evaluate(() => {
    document.getElementById('sd-up').open();
  });
  await page.waitForTimeout(50);
  const isOpen = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(isOpen, true);
  await page.evaluate(() => document.getElementById('sd-up').close());
  await page.waitForTimeout(50);
  const isClosed = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(isClosed, false);
  await page.close();
});

test('speed-dial: open() emite iswc-toggle{open:true} y close() iswc-toggle{open:false}', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  await page.evaluate(() => {
    window.__sdEvts = [];
    document.getElementById('sd-rad').addEventListener('iswc-toggle', (e) => {
      window.__sdEvts.push(e.detail.open);
    });
    document.getElementById('sd-rad').open();
    setTimeout(() => document.getElementById('sd-rad').close(), 30);
  });
  await page.waitForTimeout(150);
  const evts = await page.evaluate(() => window.__sdEvts);
  assert.deepEqual(evts, [true, false]);
  await page.close();
});

test('speed-dial: el trigger interno es un <iswc-check-icon-button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  const info = await page.evaluate(() => {
    const sd = document.getElementById('sd-up');
    return {
      hasTrigger: !!sd.shadowRoot.querySelector('iswc-check-icon-button'),
      hasCheckIcon: !!customElements.get('iswc-check-icon-button'),
    };
  });
  assert.equal(info.hasTrigger, true);
  assert.equal(info.hasCheckIcon, true);
  await page.close();
});

test('speed-dial: click en una acción emite iswc-select y cierra el dial', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  await page.evaluate(() => {
    document.getElementById('sd-up').open();
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    window.__sdSel = null;
    document.getElementById('sd-up').addEventListener('iswc-select', (e) => {
      window.__sdSel = e.detail.action.getAttribute('label');
    });
    const action = document.querySelector('iswc-speed-dial#sd-up iswc-speed-dial-action');
    action.click();
  });
  await page.waitForTimeout(80);
  const sel = await page.evaluate(() => window.__sdSel);
  assert.equal(sel, 'Copiar');
  const isOpen = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(isOpen, false, 'tras seleccionar, el dial debe cerrarse');
  await page.close();
});

test('speed-dial: atributo direction="radial" se aplica al wrapper interno', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  const ds = await page.evaluate(() => {
    return document.getElementById('sd-rad').shadowRoot.querySelector('[part="root"]').dataset.direction;
  });
  assert.equal(ds, 'radial');
  await page.close();
});

test('speed-dial: toggle() invierte open', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  await page.evaluate(() => {
    const sd = document.getElementById('sd-up');
    sd.toggle();
  });
  await page.waitForTimeout(50);
  const after1 = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(after1, true);
  await page.evaluate(() => document.getElementById('sd-up').toggle());
  await page.waitForTimeout(50);
  const after2 = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(after2, false);
  await page.close();
});

test('speed-dial: action con href no cierra el dial al click', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-speed-dial:defined');
  await page.evaluate(() => {
    const sd = document.getElementById('sd-up');
    const a = document.createElement('iswc-speed-dial-action');
    a.setAttribute('icon', 'mdi:open-in-new');
    a.setAttribute('label', 'Abrir');
    a.setAttribute('href', '#externo');
    sd.appendChild(a);
    sd.open();
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    // Acción con href (la última)
    const last = document.querySelector('iswc-speed-dial#sd-up iswc-speed-dial-action[href]');
    last.click();
  });
  await page.waitForTimeout(80);
  const isOpen = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(isOpen, true, 'con href el dial NO debe cerrarse');
  await page.close();
});
