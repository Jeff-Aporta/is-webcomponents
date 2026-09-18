// rating.test.mjs — tests funcionales del demo rating.html.
// Cobertura: smoke + funcional (value/clearable) + accesibilidad (role=slider,
// aria-valuenow/aria-valuemax) + caso límite (estado vacío).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/rating/rating.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-rating> queda definido y se renderiza con 5 estrellas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rating-ready');
    const data = await page.evaluate(() => {
      const ratings = [...document.querySelectorAll('main is-rating')];
      const basico = ratings.find((r) => r.getAttribute('name') === 'score');
      const starCount = basico.shadowRoot.querySelectorAll('[part="star"]').length;
      const slider = basico.shadowRoot.querySelector('[role="slider"]');
      return {
        defined: !!customElements.get('is-rating'),
        count: ratings.length,
        starCount,
        hasSlider: !!slider,
        tabindex: slider.getAttribute('tabindex'),
      };
    });
    assert.equal(data.defined, true, 'is-rating debe estar definido');
    assert.ok(data.count >= 5, `esperaba >=5 ratings, hay ${data.count}`);
    assert.equal(data.starCount, 5, 'el rating básico debe tener 5 estrellas por defecto');
    assert.ok(data.hasSlider, 'la base debe llevar role="slider"');
    assert.equal(data.tabindex, '0', 'el slider debe ser focusable por defecto');
    await screenshot(page, 'rating-smoke');
  },
});

tests.push({
  name: 'funcional: clic en la 4ª estrella cambia el value a 4 y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rating-ready');
    await page.waitForTimeout(150);

    // Capturar el evento is-change y simular el clic
    const changed = await page.evaluate(async () => {
      const r = document.querySelector('is-rating[name="score"]');
      const promise = new Promise((resolve) => {
        r.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
      });
      const base = r.shadowRoot.querySelector('.base');
      const stars = r.shadowRoot.querySelectorAll('[part="star"]');
      const fourth = stars[3];
      const rect = fourth.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      base.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true,
      }));
      base.dispatchEvent(new PointerEvent('pointerup', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true,
      }));
      // El componente mapea click → #onClick → #commit → is-change
      base.dispatchEvent(new MouseEvent('click', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true,
      }));
      const detail = await Promise.race([
        promise,
        new Promise((res) => setTimeout(() => res(null), 500)),
      ]);
      return { detail, value: r.value, attr: r.getAttribute('value') };
    });
    assert.equal(changed.value, 4, `esperaba value=4 tras click en la 4ª estrella, obtuve ${changed.value}`);
    assert.equal(changed.attr, '4', 'el atributo value debe estar sincronizado');
    assert.ok(changed.detail, 'debe haberse emitido is-change');
    assert.equal(changed.detail.value, 4, 'detail.value del is-change debe ser 4');
  },
});

tests.push({
  name: 'funcional: clearable borra el valor al re-clicar en la misma estrella',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rating-ready');
    await page.waitForTimeout(150);

    const result = await page.evaluate(() => {
      const r = document.querySelector('is-rating[name="quality"]');
      // Estado inicial: value=2
      const first = r.shadowRoot.querySelectorAll('[part="star"]')[0];
      const rect = first.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dispatchClick = () => {
        const base = r.shadowRoot.querySelector('.base');
        base.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true }));
        base.dispatchEvent(new PointerEvent('pointerup', { clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true }));
        base.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true }));
      };
      const before = r.value;
      dispatchClick(); // 2 → 1
      const mid = r.value;
      dispatchClick(); // 1 → 0 (clearable)
      const after = r.value;
      return { before, mid, after };
    });
    assert.equal(result.before, 2, 'estado inicial debe ser 2');
    assert.equal(result.mid, 1, 'click en 1ª estrella debe poner value=1');
    assert.equal(result.after, 0, 'clearable debe permitir volver a 0');
  },
});

tests.push({
  name: 'accesibilidad: el slider expone aria-valuemin/max/now/text',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rating-ready');
    await page.waitForTimeout(150);

    const a11y = await page.evaluate(() => {
      const r = document.querySelector('is-rating[name="score"]');
      const slider = r.shadowRoot.querySelector('[role="slider"]');
      return {
        role: slider.getAttribute('role'),
        min: slider.getAttribute('aria-valuemin'),
        max: slider.getAttribute('aria-valuemax'),
        now: slider.getAttribute('aria-valuenow'),
        text: slider.getAttribute('aria-valuetext'),
        labelledBy: slider.getAttribute('aria-labelledby'),
      };
    });
    assert.equal(a11y.role, 'slider', 'role debe ser "slider"');
    assert.equal(a11y.min, '0', 'aria-valuemin debe ser 0');
    assert.equal(a11y.max, '5', 'aria-valuemax debe ser 5 (max por defecto)');
    assert.equal(a11y.now, '3', `aria-valuenow debe ser 3, obtuve ${a11y.now}`);
    assert.ok(a11y.text && /3/.test(a11y.text), `aria-valuetext debe mencionar el 3, obtuve "${a11y.text}"`);
    assert.ok(a11y.labelledBy, 'debe tener aria-labelledby apuntando al label');
  },
});

tests.push({
  name: 'caso límite: required + value=0 expone valueMissing en form-associated',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rating-ready');
    await page.waitForTimeout(150);

    const edge = await page.evaluate(() => {
      // El required es el 5º (experience)
      const ratings = [...document.querySelectorAll('main is-rating')];
      const req = ratings.find((r) => r.getAttribute('name') === 'experience');
      const internals = req.constructor.formAssociated ? req : null;
      // valueMissing se chequea con checkValidity() (delegado a ElementInternals)
      return {
        required: req.hasAttribute('required'),
        value: req.value,
        blank: req.matches(':state(blank)'),
        valid: req.checkValidity(),
      };
    });
    assert.equal(edge.required, true, 'el rating marcado debe llevar required');
    assert.equal(edge.value, 0, 'el rating requerido inicial debe estar en 0');
    assert.equal(edge.blank, true, 'debe tener custom state :state(blank)');
    assert.equal(edge.valid, false, 'checkValidity() debe devolver false cuando required y value=0');
  },
});

tests.push({
  name: 'caso límite: ratings personalizados (allow-half, readonly) respetan su configuración',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rating-ready');
    await page.waitForTimeout(150);

    const data = await page.evaluate(() => {
      const ratings = [...document.querySelectorAll('main is-rating')];
      const half = ratings.find((r) => r.getAttribute('name') === 'service');
      const ro = ratings.find((r) => r.getAttribute('name') === 'opinion');
      return {
        halfPrecision: half.precision,
        halfValue: half.value,
        readonly: ro.hasAttribute('readonly'),
        readonlyValue: ro.value,
        readonlyLabels: ro.labels,
      };
    });
    assert.equal(data.halfPrecision, 0.5, `precision debe ser 0.5 con allow-half, obtuve ${data.halfPrecision}`);
    assert.equal(data.halfValue, 4.5, 'value inicial 4.5');
    assert.equal(data.readonly, true, 'rating de opinión debe ser readonly');
    assert.equal(data.readonlyValue, 5, 'value inicial 5');
    assert.ok(Array.isArray(data.readonlyLabels) && data.readonlyLabels.length === 5,
      `labels debe tener 5 entradas, obtuve ${JSON.stringify(data.readonlyLabels)}`);
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

report('rating', failures === 0, { total: tests.length, failures });
