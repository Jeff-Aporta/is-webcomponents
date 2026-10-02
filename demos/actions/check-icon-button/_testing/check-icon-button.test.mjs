// check-icon-button.test.mjs — Nivel 3: smoke + props reactivas + eventos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/check-icon-button/check-icon-button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('check-icon-button: bundle registra <iswc-check-icon-button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  const defined = await page.evaluate(() => !!customElements.get('iswc-check-icon-button'));
  assert.equal(defined, true);
  await page.close();
});

test('check-icon-button: atributo role=button se aplica al host', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  const role = await page.evaluate(() => {
    return document.querySelector('iswc-check-icon-button#play').getAttribute('role');
  });
  assert.equal(role, 'button');
  await page.close();
});

test('check-icon-button: aria-label cambia con checked', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  await page.evaluate(() => {
    document.querySelector('iswc-check-icon-button#play').click();
  });
  await page.waitForTimeout(50);
  const info = await page.evaluate(() => {
    const b = document.querySelector('iswc-check-icon-button#play');
    return {
      ariaLabel: b.getAttribute('aria-label'),
      ariaPressed: b.getAttribute('aria-pressed'),
    };
  });
  assert.equal(info.ariaPressed, 'true');
  assert.match(info.ariaLabel, /Pausar/i, `aria-label tras click debe ser "Pausar…", fue "${info.ariaLabel}"`);
  await page.close();
});

test('check-icon-button: click emite iswc-change con detail.checked', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  await page.evaluate(() => {
    window.__ciEvents = [];
    document.querySelector('iswc-check-icon-button#mute').addEventListener('iswc-change', (e) => {
      window.__ciEvents.push(e.detail);
    });
  });
  await page.evaluate(() => document.querySelector('iswc-check-icon-button#mute').click());
  await page.waitForTimeout(50);
  const detail = await page.evaluate(() => window.__ciEvents);
  assert.equal(detail.length, 1);
  assert.equal(detail[0].checked, true);
  await page.close();
});

test('check-icon-button: icono cambia entre icon y checked-icon', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  const icons = await page.evaluate(() => {
    const b = document.querySelector('iswc-check-icon-button#play');
    const off = b.shadowRoot.querySelector('iswc-icon').getAttribute('icon');
    b.click();
    const on = b.shadowRoot.querySelector('iswc-icon').getAttribute('icon');
    return { off, on };
  });
  assert.match(icons.off, /play/, `icon unchecked debe incluir "play", fue ${icons.off}`);
  assert.match(icons.on, /pause/, `icon checked debe incluir "pause", fue ${icons.on}`);
  await page.close();
});

test('check-icon-button: tabindex 0 por defecto; -1 cuando disabled', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  const tabindex = await page.evaluate(() => {
    const play = document.querySelector('iswc-check-icon-button#play');
    const dis = document.querySelector('iswc-check-icon-button[disabled]');
    return {
      play: play.getAttribute('tabindex'),
      dis: dis.getAttribute('tabindex'),
    };
  });
  assert.equal(tabindex.play, '0');
  assert.equal(tabindex.dis, '-1');
  await page.close();
});

test('check-icon-button: Enter dispara iswc-change', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iswc-check-icon-button:defined');
  await page.evaluate(() => {
    window.__ciKey = [];
    document.querySelector('iswc-check-icon-button#play').addEventListener('iswc-change', (e) => {
      window.__ciKey.push(e.detail.checked);
    });
  });
  await page.focus('iswc-check-icon-button#play');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  const key = await page.evaluate(() => window.__ciKey);
  assert.deepEqual(key, [true]);
  await page.close();
});
