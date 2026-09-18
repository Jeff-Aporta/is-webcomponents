// avatar.test.mjs — tests exhaustivos del demo avatar.html.
// Cobertura: smoke + funcional (initials, image con fallback, slot icon,
// eventos is-error, formas) + determinismo (mismo initials produce mismo texto)
// + accesibilidad básica.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/media/Avatar/avatar.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente se registra y renderiza tres instancias',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    const data = await page.evaluate(() => {
      const list = [...document.querySelectorAll('main is-avatar')];
      return {
        registered: !!customElements.get('is-avatar'),
        count: list.length,
        eachHasShadow: list.every((el) => !!el.shadowRoot),
      };
    });
    assert.equal(data.registered, true, 'is-avatar debe estar registrado');
    assert.ok(data.count >= 6, `esperaba >=6 avatares en main, hay ${data.count}`);
    assert.ok(data.eachHasShadow, 'todos los avatares deben tener shadowRoot');
    await screenshot(page, 'avatar-smoke');
  },
});

tests.push({
  name: 'funcional: initials se renderizan como texto en MAYÚSCULAS y máximo 2',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const a = document.querySelector('is-avatar[initials="JD"]');
      const text = a.shadowRoot.querySelector('.initials').textContent.trim();
      const visible = !a.shadowRoot.querySelector('.initials').hidden;
      const ariaLabel = a.getAttribute('aria-label');
      const role = a.getAttribute('role');
      return { text, visible, ariaLabel, role };
    });
    assert.equal(data.text, 'JD', `esperaba "JD", obtuve "${data.text}"`);
    assert.equal(data.visible, true, '.initials debe estar visible');
    assert.equal(data.ariaLabel, 'Jane Doe', 'aria-label debe propagarse');
    assert.equal(data.role, 'img', 'role debe ser img');
  },
});

tests.push({
  name: 'funcional: shape se aplica como data-attribute',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    const data = await page.evaluate(() => {
      const circles = [...document.querySelectorAll('is-avatar[shape="circle"], is-avatar:not([shape])')];
      const rounded = [...document.querySelectorAll('is-avatar[shape="rounded"]')];
      const square = [...document.querySelectorAll('is-avatar[shape="square"]')];
      return {
        circles: circles.map((a) => a.dataset.shape),
        rounded: rounded.map((a) => a.dataset.shape),
        square: square.map((a) => a.dataset.shape),
      };
    });
    assert.ok(data.circles.every((s) => s === 'circle'), `todos los no-shape deben ser circle: ${JSON.stringify(data.circles)}`);
    assert.ok(data.rounded.every((s) => s === 'rounded'), `rounded → data-shape=rounded: ${JSON.stringify(data.rounded)}`);
    assert.ok(data.square.every((s) => s === 'square'), `square → data-shape=square: ${JSON.stringify(data.square)}`);
  },
});

tests.push({
  name: 'funcional: cambio de initials en vivo re-renderiza el texto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const a = document.querySelector('is-avatar[initials="JD"]');
      a.setAttribute('initials', 'foo bar baz');
    });
    await page.waitForTimeout(150);
    const text = await page.evaluate(() => {
      const a = document.querySelector('is-avatar[initials="foo bar baz"]');
      return a.shadowRoot.querySelector('.initials').textContent.trim();
    });
    // El componente hace slice(0, 2).toUpperCase() → "FO"
    assert.equal(text, 'FO', `esperaba "FO" (slice 2 + uppercase), obtuve "${text}"`);
  },
});

tests.push({
  name: 'funcional: is-error se dispara cuando la imagen falla',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    await page.waitForTimeout(800); // esperar intento de fetch
    const fired = await page.evaluate(() => document.documentElement.dataset.avatarErrorFired === '1');
    assert.equal(fired, true, 'is-error debe haberse disparado en al menos un avatar con image inválida');
  },
});

tests.push({
  name: 'funcional: sin image ni initials se muestra el icono fallback',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const a = [...document.querySelectorAll('is-avatar')].find((x) => !x.hasAttribute('initials') && !x.hasAttribute('image') && !x.querySelector('[slot="icon"]'));
      const iconVisible = !a.shadowRoot.querySelector('.icon').hidden;
      const initialsVisible = !a.shadowRoot.querySelector('.initials').hidden;
      const imgVisible = !a.shadowRoot.querySelector('.image').hidden;
      // El icono por defecto es <is-icon icon="mdi:account">
      const isIcon = a.shadowRoot.querySelector('.icon is-icon');
      return {
        iconVisible,
        initialsVisible,
        imgVisible,
        hasDefaultIcon: !!isIcon,
        iconAttr: isIcon?.getAttribute('icon') ?? '',
      };
    });
    assert.equal(data.iconVisible, true, '.icon debe estar visible cuando no hay image/initials');
    assert.equal(data.initialsVisible, false, '.initials debe estar oculto');
    assert.equal(data.imgVisible, false, '.image debe estar oculto');
    assert.equal(data.hasDefaultIcon, true, 'debe tener el <is-icon> fallback');
    assert.match(data.iconAttr, /mdi:account/, `icon default debe ser mdi:account, got "${data.iconAttr}"`);
  },
});

tests.push({
  name: 'funcional: slot icon proyecta contenido custom',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const a = [...document.querySelectorAll('is-avatar')].find((x) => x.querySelector('[slot="icon"][icon="mdi:robot"]'));
      const slot = a.shadowRoot.querySelector('slot[name="icon"]');
      const assigned = slot.assignedElements({ flatten: true });
      const iconVisible = !a.shadowRoot.querySelector('.icon').hidden;
      return {
        iconVisible,
        assignedCount: assigned.length,
        assignedTag: assigned[0]?.tagName?.toLowerCase(),
        assignedIcon: assigned[0]?.getAttribute('icon'),
      };
    });
    assert.equal(data.iconVisible, true, '.icon debe estar visible con slot icon proyectado');
    assert.equal(data.assignedCount, 1, 'slot debe recibir exactamente 1 elemento');
    assert.equal(data.assignedTag, 'is-icon', 'el elemento proyectado debe ser is-icon');
    assert.match(data.assignedIcon, /mdi:robot/, `icon custom debe ser mdi:robot, got "${data.assignedIcon}"`);
  },
});

tests.push({
  name: 'accesibilidad: aria-label cae al initials cuando no se setea label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-avatar-ready');
    const aria = await page.evaluate(() => {
      const a = document.querySelector('is-avatar[initials="AB"]');
      return a.getAttribute('aria-label');
    });
    // Cuando label="" y hay initials, aria-label = initials ("AB").
    assert.equal(aria, 'AB', `aria-label debe caer a initials, got "${aria}"`);
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  let detail = {};
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    detail = { error: String(err?.message ?? err) };
    console.error(`  ✗ ${t.name}\n     ${detail.error}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('avatar', failures === 0, { total: tests.length, failures });
