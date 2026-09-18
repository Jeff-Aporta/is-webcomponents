// fab.test.mjs — Nivel 3: smoke + props reactivas + posición + is-fab-click.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/fab/fab.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('fab: bundle registra <is-fab>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-fab'));
  assert.equal(defined, true);
  await page.close();
});

test('fab: atributo position se refleja en dataset.position', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const positions = await page.evaluate(() => {
    return [...document.querySelectorAll('is-fab')].map((f) => ({
      attr: f.getAttribute('position'),
      ds: f.dataset.position,
      color: f.color,
    }));
  });
  // fab1 sin position → debe resolver a bottom-end
  const fab1 = positions.find((p) => p.ds === 'bottom-end');
  assert.ok(fab1, 'fab1 debe tener data-position=bottom-end (default)');
  assert.equal(positions.find((p) => p.attr === 'top-start').ds, 'top-start');
  assert.equal(positions.find((p) => p.attr === 'top-end').ds, 'top-end');
  await page.close();
});

test('fab: color="warning" llega al <is-button> interno', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const innerColor = await page.evaluate(() => {
    const fab = document.getElementById('fab3');
    return fab.shadowRoot.querySelector('is-button').getAttribute('color');
  });
  assert.equal(innerColor, 'warning');
  await page.close();
});

test('fab: atributo extended → clase .extended en el inner', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const hasExtended = await page.evaluate(() => {
    const fab = document.getElementById('fab4');
    return fab.shadowRoot.querySelector('is-button').classList.contains('extended');
  });
  assert.equal(hasExtended, true);
  await page.close();
});

test('fab: atributo pulse → clase .pulse en el inner', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const hasPulse = await page.evaluate(() => {
    const fab = document.getElementById('fab3');
    return fab.shadowRoot.querySelector('is-button').classList.contains('pulse');
  });
  assert.equal(hasPulse, true);
  await page.close();
});

test('fab: click emite is-fab-click', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  await page.evaluate(() => {
    window.__fabEvts = 0;
    document.getElementById('fab1').addEventListener('is-fab-click', () => { window.__fabEvts += 1; });
  });
  await page.evaluate(() => document.getElementById('fab1').click());
  await page.waitForTimeout(50);
  const n = await page.evaluate(() => window.__fabEvts);
  assert.equal(n, 1);
  await page.close();
});

test('fab: role=button por defecto; role=link si tiene href', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const roles = await page.evaluate(() => {
    const btn = document.getElementById('fab1').getAttribute('role');
    const fabWithHref = document.createElement('is-fab');
    fabWithHref.setAttribute('href', '#');
    document.body.appendChild(fabWithHref);
    return { btn, link: fabWithHref.getAttribute('role') };
  });
  assert.equal(roles.btn, 'button');
  assert.equal(roles.link, 'link');
  await page.close();
});

test('fab: aria-label llega al <is-button> interno', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const aria = await page.evaluate(() => {
    return document.getElementById('fab3').shadowRoot.querySelector('is-button').getAttribute('aria-label');
  });
  assert.equal(aria, 'Notificaciones');
  await page.close();
});
