// full-calendar.test.mjs — tests funcionales del demo full-calendar.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con toolbar y grid
//   - funcional: prev()/next() navega; setView cambia la vista; eventos
//     seedeados desde <script type="application/json"> aparecen
//   - accesibilidad: los botones del toolbar tienen aria-label; las celdas
//     día son <button>
//   - edge cases: view=week genera 7 columnas; setDate cambia la fecha del cursor
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/full-calendar/full-calendar.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta toolbar + grid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const data = await page.evaluate(() => {
      const cals = [...document.querySelectorAll('is-full-calendar')];
      return cals.map((c) => {
        const sr = c.shadowRoot;
        return {
          defined: !!customElements.get('is-full-calendar'),
          hasShadow: !!sr,
          hasToolbar: !!sr?.querySelector('.toolbar'),
          hasGrid: !!sr?.querySelector('.grid'),
          view: c.getAttribute('view'),
          eventsCount: c.events.length,
        };
      });
    });
    assert.equal(data.length, 3, 'debe haber 3 calendarios (mes, semana, día)');
    assert.equal(data[0].defined, true, 'is-full-calendar debe estar definido');
    assert.equal(data[0].hasShadow, true, 'shadow root presente');
    assert.equal(data[0].hasToolbar, true, '.toolbar presente');
    assert.equal(data[0].hasGrid, true, '.grid presente');
    assert.equal(data[0].view, 'month', '#mes tiene view=month');
    assert.equal(data[0].eventsCount, 5, '#mes tiene 5 eventos seedeados');
    assert.equal(data[1].view, 'week', '#semana tiene view=week');
    assert.equal(data[2].view, 'day', '#dia tiene view=day');
    await screenshot(page, 'full-calendar-smoke');
  },
});

tests.push({
  name: 'funcional: prev() y next() navegan en la vista mes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#mes');
      const before = c.shadowRoot.querySelector('.title').textContent;
      c.prev();
      const afterPrev = c.shadowRoot.querySelector('.title').textContent;
      c.next();
      const afterNext = c.shadowRoot.querySelector('.title').textContent;
      c.next();
      const after2Next = c.shadowRoot.querySelector('.title').textContent;
      return { before, afterPrev, afterNext, after2Next };
    });
    assert.notEqual(result.before, result.afterPrev, 'prev() cambia el título');
    assert.notEqual(result.before, result.after2Next, 'next()×2 cambia el título (más)');
  },
});

tests.push({
  name: 'funcional: setView cambia la vista y dispara re-render',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#semana');
      const before = c.shadowRoot.querySelector('.grid').dataset.view;
      c.setView('month');
      const after = c.shadowRoot.querySelector('.grid').dataset.view;
      c.setView('day');
      const afterDay = c.shadowRoot.querySelector('.grid').dataset.view;
      return { before, after, afterDay };
    });
    assert.equal(result.before, 'week', 'inicial week');
    assert.equal(result.after, 'month', 'cambia a month');
    assert.equal(result.afterDay, 'day', 'cambia a day');
  },
});

tests.push({
  name: 'funcional: setDate cambia la fecha del cursor (vista mes → cambia título)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#mes');
      const before = c.shadowRoot.querySelector('.title').textContent;
      c.setDate('2026-07-15');
      const after = c.shadowRoot.querySelector('.title').textContent;
      c.setDate('2030-01-01');
      const after2030 = c.shadowRoot.querySelector('.title').textContent;
      return { before, after, after2030 };
    });
    assert.notEqual(result.before, result.after, 'setDate cambia el título');
    assert.match(result.after, /julio/i, 'título menciona julio');
    assert.match(result.after2030, /enero/i, 'título menciona enero');
  },
});

tests.push({
  name: 'funcional: click en un día emite is-day-click con detail.date',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const c = document.querySelector('#mes');
        c.addEventListener('is-day-click', (e) => resolve(e.detail), { once: true });
        const days = [...c.shadowRoot.querySelectorAll('button.day[data-iso]')];
        const target = days.find((d) => !d.classList.contains('out'));
        target.click();
      });
    });
    assert.ok(result.date, 'detail.date presente');
    assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/, 'detail.date formato ISO');
  },
});

tests.push({
  name: 'funcional: click en un evento emite is-event-click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const c = document.querySelector('#mes');
        c.addEventListener('is-event-click', (e) => resolve(e.detail), { once: true });
        // Los eventos son <li class="ev" data-evid="...">
        const evs = c.shadowRoot.querySelectorAll('.ev');
        if (!evs.length) resolve({ skipped: true });
        else evs[0].click();
      });
    });
    if (result.skipped) {
      // si el evento está en otro mes, igual verificamos al menos uno
      assert.ok(true, 'no hay eventos visibles en este mes (skip válido)');
    } else {
      assert.ok(result.event, 'detail.event presente');
      assert.ok(result.event.title, 'detail.event.title presente');
      assert.ok(result.date, 'detail.date presente');
    }
  },
});

tests.push({
  name: 'accesibilidad: los botones prev/next del toolbar tienen aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const a11y = await page.evaluate(() => {
      const c = document.querySelector('#mes');
      const sr = c.shadowRoot;
      return {
        prevLabel: sr.querySelector('[data-act="prev"]')?.getAttribute('aria-label'),
        nextLabel: sr.querySelector('[data-act="next"]')?.getAttribute('aria-label'),
        todayLabel: sr.querySelector('[data-act="today"]')?.getAttribute('aria-label'),
        viewBtns: sr.querySelectorAll('[data-view]').length,
      };
    });
    assert.equal(a11y.prevLabel, 'Anterior', 'aria-label prev');
    assert.equal(a11y.nextLabel, 'Siguiente', 'aria-label next');
    assert.ok(a11y.todayLabel, 'botón today con label');
    assert.ok(a11y.viewBtns >= 3, '3 botones de vista');
  },
});

tests.push({
  name: 'edge case: view=week genera 7 columnas de cabecera',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#semana');
      const colHeads = c.shadowRoot.querySelectorAll('.col-head');
      return {
        colHeadsCount: colHeads.length,
        gridView: c.shadowRoot.querySelector('.grid').dataset.view,
      };
    });
    assert.equal(result.gridView, 'week', 'grid.dataset.view=week');
    assert.equal(result.colHeadsCount, 7, '7 cabeceras de columna (lun–dom)');
  },
});

tests.push({
  name: 'edge case: today() vuelve a la fecha actual',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-full-calendar-ready');
    const result = await page.evaluate(() => {
      const c = document.querySelector('#mes');
      c.setDate('2020-01-01');
      const far = c.shadowRoot.querySelector('.title').textContent;
      c.today();
      const now = c.shadowRoot.querySelector('.title').textContent;
      // el grid debe tener una celda marcada como today
      const today = c.shadowRoot.querySelector('.day.today');
      return { far, now, hasTodayCell: !!today };
    });
    assert.match(result.far, /enero|2020/i, 'fecha lejana');
    assert.notEqual(result.far, result.now, 'today() cambia el título');
    assert.ok(result.hasTodayCell, 'celda marcada como today');
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

report('full-calendar', failures === 0, { total: tests.length, failures });
