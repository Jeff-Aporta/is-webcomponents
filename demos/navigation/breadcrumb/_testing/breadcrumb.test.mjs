// breadcrumb.test.mjs — tests exhaustivos del demo breadcrumb.html.
// Cobertura: smoke (render + custom elements), funcional (href, current,
// aria-current, target, separator override, label), accesibilidad, determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/navigation/breadcrumb/breadcrumb.html`;

const tests = [];

tests.push({
  name: 'smoke: ambos custom elements están definidos y renderizan los 5 breadcrumbs',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const info = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      return {
        breadcrumbDefined: !!customElements.get('is-breadcrumb'),
        itemDefined: !!customElements.get('is-breadcrumb-item'),
        breadcrumbs: sections.length,
        items: document.querySelectorAll('is-breadcrumb-item').length,
        navs: document.querySelectorAll('is-breadcrumb').length,
      };
    });
    assert.equal(info.breadcrumbDefined, true, 'is-breadcrumb debe estar definido');
    assert.equal(info.itemDefined, true, 'is-breadcrumb-item debe estar definido');
    assert.equal(info.navs, 5, `esperaba 5 <is-breadcrumb>, hay ${info.navs}`);
    assert.equal(info.breadcrumbs, 5, 'esperaba 5 <section> contenedores');
    // Items: basic=4, en=3, spa=3, separator=3, target=3 → 16 totales
    assert.ok(info.items >= 15, `esperaba >=15 <is-breadcrumb-item>, hay ${info.items}`);
    await screenshot(page, 'breadcrumb-smoke');
  },
});

tests.push({
  name: 'funcional: cada breadcrumb expone un <nav part="breadcrumb"> con aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const labels = await page.evaluate(() => {
      return [...document.querySelectorAll('is-breadcrumb')].map((bc) => {
        const nav = bc.shadowRoot.querySelector('nav');
        return {
          tag: nav?.tagName.toLowerCase(),
          part: nav?.getAttribute('part'),
          ariaLabel: nav?.getAttribute('aria-label'),
        };
      });
    });
    assert.equal(labels.length, 5);
    for (const l of labels) {
      assert.equal(l.tag, 'nav', 'el shadow root debe contener un <nav>');
      assert.equal(l.part, 'breadcrumb', 'CSS part debe ser "breadcrumb"');
      assert.ok(l.ariaLabel && l.ariaLabel.length > 0, 'aria-label debe estar presente');
    }
    // El primer breadcrumb tiene label="Ruta de página".
    assert.equal(labels[0].ariaLabel, 'Ruta de página', 'label custom debe propagarse al aria-label');
    // El segundo tiene label="Breadcrumb".
    assert.equal(labels[1].ariaLabel, 'Breadcrumb', 'label custom en inglés debe reflejarse');
  },
});

tests.push({
  name: 'funcional: item con href se renderiza como <a> y sin href como <span>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const info = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      // Section 0 = basic: 3 con href + 1 current (href="")
      const basic = sections[0].querySelectorAll('is-breadcrumb-item');
      // Section 2 = spa: 3 sin href
      const spa = sections[2].querySelectorAll('is-breadcrumb-item');
      const inspect = (item) => {
        const label = item.shadowRoot.querySelector('.label');
        return {
          tag: label?.tagName.toLowerCase(),
          href: label?.getAttribute('href'),
          isCurrent: label?.getAttribute('aria-current'),
          attrHref: item.getAttribute('href'),
        };
      };
      return {
        basic: [...basic].map(inspect),
        spa: [...spa].map(inspect),
      };
    });
    // Basic[0..2]: con href → <a href>
    for (let i = 0; i < 3; i++) {
      assert.equal(info.basic[i].tag, 'a', `basic[${i}] debe ser <a>, fue ${info.basic[i].tag}`);
      assert.ok(info.basic[i].href, `basic[${i}] debe tener href`);
      assert.notEqual(info.basic[i].isCurrent, 'page', `basic[${i}] NO debe ser aria-current=page`);
    }
    // Basic[3]: current → href="", aria-current=page
    assert.equal(info.basic[3].tag, 'a', 'basic[3] debe ser <a>');
    assert.equal(info.basic[3].attrHref, '', 'basic[3] href="" → current');
    assert.equal(info.basic[3].isCurrent, 'page', 'basic[3] debe llevar aria-current="page"');
    // SPA: 3 items sin href → <span>
    for (let i = 0; i < info.spa.length; i++) {
      assert.equal(info.spa[i].tag, 'span', `spa[${i}] sin href debe ser <span>, fue ${info.spa[i].tag}`);
      assert.equal(info.spa[i].attrHref, null, `spa[${i}] no debe tener atributo href`);
    }
  },
});

tests.push({
  name: 'funcional: atributo target se refleja como target en el <a>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const target = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const targetSection = sections[4].querySelector('is-breadcrumb-item:nth-of-type(2)');
      const label = targetSection.shadowRoot.querySelector('.label');
      return {
        attrTarget: targetSection.getAttribute('target'),
        attrRel: targetSection.getAttribute('rel'),
        aTarget: label?.getAttribute('target'),
        aRel: label?.getAttribute('rel'),
      };
    });
    assert.equal(target.attrTarget, '_blank');
    assert.equal(target.attrRel, 'noopener');
    assert.equal(target.aTarget, '_blank', 'target debe propagarse al <a>');
    assert.equal(target.aRel, 'noopener', 'rel debe propagarse al <a>');
  },
});

tests.push({
  name: 'funcional: item con icon y sin slot start genera un <is-icon>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const info = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const firstItem = sections[0].querySelector('is-breadcrumb-item'); // tiene icon="mdi:home"
      const start = firstItem.shadowRoot.querySelector('.start');
      return {
        attrIcon: firstItem.getAttribute('icon'),
        hasIconEl: !!start?.querySelector('is-icon'),
        iconAttr: start?.querySelector('is-icon')?.getAttribute('icon'),
        // El segundo item del basic no tiene icon → debe estar vacío.
        secondItem: (() => {
          const second = sections[0].querySelectorAll('is-breadcrumb-item')[1];
          const s = second.shadowRoot.querySelector('.start');
          return {
            attrIcon: second.getAttribute('icon'),
            hasIconEl: !!s?.querySelector('is-icon'),
          };
        })(),
      };
    });
    assert.equal(info.attrIcon, 'mdi:home');
    assert.equal(info.hasIconEl, true, 'icon attr debe inyectar <is-icon>');
    assert.equal(info.iconAttr, 'mdi:home', 'icon debe propagarse al is-icon');
    assert.equal(info.secondItem.attrIcon, null);
    assert.equal(info.secondItem.hasIconEl, false, 'sin icon no debe inyectar <is-icon>');
  },
});

tests.push({
  name: 'funcional: separator override reemplaza el chevron por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const info = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const sepSection = sections[3].querySelector('is-breadcrumb');
      const firstItem = sepSection.querySelector('is-breadcrumb-item');
      const sepEl = firstItem.shadowRoot.querySelector('.separator');
      const slot = sepEl?.querySelector('slot[name="separator"]');
      const assigned = slot ? slot.assignedNodes({ flatten: true }) : [];
      return {
        separatorText: assigned.length > 0 ? assigned[0].textContent : null,
        defaultFirst: (() => {
          const basicItem = sections[0].querySelector('is-breadcrumb-item');
          const defSep = basicItem.shadowRoot.querySelector('.separator');
          const defSlot = defSep?.querySelector('slot[name="separator"]');
          const defAssigned = defSlot ? defSlot.assignedNodes({ flatten: true }) : [];
          return defAssigned.length > 0 ? defAssigned[0].tagName : null;
        })(),
      };
    });
    assert.equal(info.separatorText, '/', 'separator override debe ser "/"');
    assert.equal(info.defaultFirst, 'IS-ICON', 'separator por defecto debe ser un <is-icon>');
  },
});

tests.push({
  name: 'accesibilidad: el landmark <nav> tiene aria-label no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const labels = await page.evaluate(() => {
      return [...document.querySelectorAll('is-breadcrumb')].map((bc) => {
        const nav = bc.shadowRoot.querySelector('nav');
        return nav?.getAttribute('aria-label')?.length ?? 0;
      });
    });
    assert.equal(labels.length, 5);
    for (let i = 0; i < labels.length; i++) {
      assert.ok(labels[i] > 0, `breadcrumb[${i}] debe tener aria-label no vacío`);
    }
  },
});

tests.push({
  name: 'accesibilidad: el item current lleva aria-current="page" y atributo current',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const currents = await page.evaluate(() => {
      return [...document.querySelectorAll('is-breadcrumb-item')].map((it) => {
        const label = it.shadowRoot.querySelector('.label');
        return {
          attrHref: it.getAttribute('href'),
          currentAttr: it.hasAttribute('current'),
          ariaCurrent: label?.getAttribute('aria-current'),
        };
      });
    });
    // Hay 5 breadcrumbs con 1 current cada uno (basic, en, separator, target) + 0 en spa (sin current).
    const currentItems = currents.filter((c) => c.attrHref === '');
    assert.ok(currentItems.length >= 4, `esperaba >=4 items current, hay ${currentItems.length}`);
    for (const c of currentItems) {
      assert.equal(c.ariaCurrent, 'page', 'item current debe llevar aria-current="page"');
      assert.equal(c.currentAttr, true, 'item current debe llevar atributo current');
    }
  },
});

tests.push({
  name: 'determinismo: cambiar el label actualiza aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const before = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      return sections[0].querySelector('is-breadcrumb').shadowRoot.querySelector('nav').getAttribute('aria-label');
    });
    assert.equal(before, 'Ruta de página');
    await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const bc = sections[0].querySelector('is-breadcrumb');
      bc.setAttribute('label', 'Ruta actualizada');
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      return sections[0].querySelector('is-breadcrumb').shadowRoot.querySelector('nav').getAttribute('aria-label');
    });
    assert.equal(after, 'Ruta actualizada', 'label debe reflejarse en aria-label del nav');
  },
});

tests.push({
  name: 'CSS parts: breadcrumb expone ::part(breadcrumb) y cada item expone label/separator/start/end',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-breadcrumb-ready');
    const parts = await page.evaluate(() => {
      const bc = document.querySelector('is-breadcrumb');
      const item = bc.querySelector('is-breadcrumb-item');
      return {
        breadcrumb: !!bc.shadowRoot.querySelector('[part="breadcrumb"]'),
        label: !!item.shadowRoot.querySelector('[part="label"]'),
        separator: !!item.shadowRoot.querySelector('[part="separator"]'),
        start: !!item.shadowRoot.querySelector('[part="start"]'),
        end: !!item.shadowRoot.querySelector('[part="end"]'),
      };
    });
    assert.equal(parts.breadcrumb, true, '::part(breadcrumb)');
    assert.equal(parts.label, true, '::part(label)');
    assert.equal(parts.separator, true, '::part(separator)');
    assert.equal(parts.start, true, '::part(start)');
    assert.equal(parts.end, true, '::part(end)');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('breadcrumb', failures === 0, { total: tests.length, failures });
