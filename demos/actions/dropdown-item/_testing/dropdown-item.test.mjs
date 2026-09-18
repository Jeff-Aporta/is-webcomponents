// dropdown-item.test.mjs — Nivel 3: smoke + type=checkbox + submenu + a11y.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/dropdown-item/dropdown-item.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('dropdown-item: bundle registra <is-dropdown-item>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-dropdown-item'));
  assert.equal(defined, true);
  await page.close();
});

test('dropdown-item: type=checkbox pinta el checkmark y pone aria-checked', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  const info = await page.evaluate(() => {
    const c1 = document.getElementById('c1');
    return {
      hasCheckmark: !c1.shadowRoot.querySelector('.checkmark').hidden,
      role: c1.shadowRoot.querySelector('.item').getAttribute('role'),
      ariaChecked: c1.shadowRoot.querySelector('.item').getAttribute('aria-checked'),
      type: c1.type,
      checked: c1.checked,
    };
  });
  assert.equal(info.hasCheckmark, true, 'checkmark debe estar visible');
  assert.equal(info.role, 'menuitemcheckbox');
  assert.equal(info.ariaChecked, 'true', 'aria-checked=true cuando checked');
  assert.equal(info.type, 'checkbox');
  assert.equal(info.checked, true);
  await page.close();
});

test('dropdown-item: click en checkbox togglea checked', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  await page.evaluate(() => {
    document.getElementById('c2').click();
  });
  await page.waitForTimeout(50);
  const info = await page.evaluate(() => {
    const c2 = document.getElementById('c2');
    return { checked: c2.checked, ariaChecked: c2.shadowRoot.querySelector('.item').getAttribute('aria-checked') };
  });
  assert.equal(info.checked, true);
  assert.equal(info.ariaChecked, 'true');
  await page.close();
});

test('dropdown-item: item normal emite is-dropdown-item-select al click', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  await page.evaluate(() => {
    window.__diSel = null;
    document.getElementById('i1').addEventListener('is-dropdown-item-select', (e) => {
      window.__diSel = { value: e.detail.item.value };
    });
  });
  await page.evaluate(() => document.getElementById('i1').click());
  await page.waitForTimeout(30);
  const detail = await page.evaluate(() => window.__diSel);
  assert.equal(detail?.value, 'edit');
  await page.close();
});

test('dropdown-item: color=danger aplica clase danger al .item', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  const info = await page.evaluate(() => {
    const it = document.getElementById('i3');
    return { color: it.color, dangerClass: it.shadowRoot.querySelector('.item').classList.contains('danger') };
  });
  assert.equal(info.color, 'danger');
  assert.equal(info.dangerClass, true);
  await page.close();
});

test('dropdown-item: item con submenú tiene aria-haspopup=menu', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  const info = await page.evaluate(() => {
    const it = document.getElementById('sub1');
    return {
      hasSubmenu: it.hasSubmenu,
      aria: it.shadowRoot.querySelector('.item').getAttribute('aria-haspopup'),
      chevronVisible: !it.shadowRoot.querySelector('.submenu-icon').hidden,
    };
  });
  assert.equal(info.hasSubmenu, true);
  assert.equal(info.aria, 'menu');
  assert.equal(info.chevronVisible, true);
  await page.close();
});

test('dropdown-item: openSubmenu() muestra el submenú y closeSubmenu() lo oculta', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  await page.evaluate(() => {
    document.getElementById('sub1').openSubmenu();
  });
  await page.waitForTimeout(80);
  const opened = await page.evaluate(() => document.getElementById('sub1').submenuOpen);
  assert.equal(opened, true);
  await page.evaluate(() => document.getElementById('sub1').closeSubmenu());
  await page.waitForTimeout(30);
  const closed = await page.evaluate(() => document.getElementById('sub1').submenuOpen);
  assert.equal(closed, false);
  await page.close();
});
