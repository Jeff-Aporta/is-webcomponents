// kanban.test.mjs — tests exhaustivos del demo kanban.html.
// Cobertura: smoke + funcional (rendering, badges, accents, click event,
// drag & drop simulation, orientation row) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/kanban/kanban.html`;

const tests = [];

tests.push({
  name: 'smoke: is-kanban/column/card están definidos y los 3 tableros renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const initial = await page.evaluate(() => {
      const boards = [...document.querySelectorAll('main is-kanban')];
      return {
        boardDefined: !!customElements.get('is-kanban'),
        columnDefined: !!customElements.get('is-kanban-column'),
        cardDefined: !!customElements.get('is-kanban-card'),
        boardCount: boards.length,
        columnCounts: boards.map((b) => b.querySelectorAll(':scope > is-kanban-column').length),
        cardCounts: boards.map((b) => b.querySelectorAll(':scope > is-kanban-column > is-kanban-card').length),
      };
    });
    assert.equal(initial.boardDefined, true, 'is-kanban debe estar definido');
    assert.equal(initial.columnDefined, true, 'is-kanban-column debe estar definido');
    assert.equal(initial.cardDefined, true, 'is-kanban-card debe estar definido');
    assert.equal(initial.boardCount, 3, `esperaba 3 tableros, hay ${initial.boardCount}`);
    // El primer tablero debe tener 3 columnas, segundo 1, tercero 2
    assert.deepEqual(initial.columnCounts, [3, 1, 2], `columnCounts ${initial.columnCounts}`);
    // Suma total de cards: 3+2+3 = 8 en el basic, 2 en styled, 3 en row = 13
    const total = initial.cardCounts.reduce((s, n) => s + n, 0);
    assert.equal(total, 13, `total cards debe ser 13, hay ${total}`);
    await screenshot(page, 'kanban-smoke');
  },
});

tests.push({
  name: 'funcional: badges se actualizan según el conteo de cards (o valor explícito)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const badges = await page.evaluate(() => {
      const basic = document.querySelector('main is-kanban');
      const cols = [...basic.querySelectorAll(':scope > is-kanban-column')];
      return cols.map((c) => {
        const title = c.getAttribute('title');
        const explicit = c.getAttribute('badge');
        const badgeEl = c.shadowRoot.querySelector('[part="badge"]');
        const badgeText = badgeEl?.textContent?.trim() || '';
        const cardCount = c.querySelectorAll(':scope > is-kanban-card').length;
        return { title, explicit, badgeText, cardCount };
      });
    });
    // Pendiente: 3 cards → badge = "3" (auto)
    // En curso: 2 cards, accent sin badge explícito → badge = "2" (auto)
    // Hecho: 3 cards → badge = "3" (auto)
    const pendiente = badges.find((b) => b.title === 'Pendiente');
    const enCurso = badges.find((b) => b.title === 'En curso');
    const hecho = badges.find((b) => b.title === 'Hecho');
    assert.equal(pendiente.badgeText, '3', `Pendiente badge debe ser "3", fue "${pendiente.badgeText}"`);
    assert.equal(enCurso.badgeText, '2', `En curso badge debe ser "2", fue "${enCurso.badgeText}"`);
    assert.equal(hecho.badgeText, '3', `Hecho badge debe ser "3", fue "${hecho.badgeText}"`);
    // Backlog: badge="0" explícito
    const backlog = await page.evaluate(() => {
      const allCols = [...document.querySelectorAll('main is-kanban is-kanban-column')];
      const bg = allCols.find((c) => c.getAttribute('title') === 'Backlog');
      return {
        explicit: bg.getAttribute('badge'),
        badgeText: bg.shadowRoot.querySelector('[part="badge"]').textContent.trim(),
      };
    });
    assert.equal(backlog.explicit, '0');
    assert.equal(backlog.badgeText, '0', 'badge explícito debe tener precedencia');
  },
});

tests.push({
  name: 'funcional: accent se aplica como CSS custom property --accent',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const accents = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('main is-kanban is-kanban-column')];
      return cols.map((c) => {
        const accent = c.getAttribute('accent');
        const root = c.shadowRoot.querySelector('[part="column"]');
        const style = root?.getAttribute('style') || '';
        return { title: c.getAttribute('title'), accent, style, hasAccent: style.includes('--accent') };
      });
    });
    const enCurso = accents.find((a) => a.title === 'En curso');
    const hecho = accents.find((a) => a.title === 'Hecho');
    const pendiente = accents.find((a) => a.title === 'Pendiente');
    assert.equal(enCurso.accent, '#0bb783');
    assert.equal(enCurso.hasAccent, true, 'En curso debe tener --accent en style');
    assert.match(enCurso.style, /--accent:\s*#0bb783/);
    assert.equal(hecho.hasAccent, true);
    assert.equal(pendiente.accent, null);
    assert.equal(pendiente.hasAccent, false, 'Pendiente sin accent no debe tocar style');
  },
});

tests.push({
  name: 'funcional: click en card emite is-kanban-card-click con detail { card, column }',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const basic = document.querySelector('main is-kanban');
        let detail = null;
        basic.addEventListener('is-kanban-card-click', (e) => { detail = e.detail; });
        // Click en la primera card del primer column
        const firstCard = basic.querySelector('is-kanban-column > is-kanban-card');
        const root = firstCard.shadowRoot.querySelector('[part="card"]');
        root.click();
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            hasCard: !!(detail && detail.card),
            hasColumn: !!(detail && detail.column),
            cardHeading: detail?.card?.getAttribute('heading') ?? null,
            columnTitle: detail?.column?.getAttribute('title') ?? null,
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['card', 'column'],
      `detail debe tener keys [card, column], tuvo ${JSON.stringify(captured.detailKeys)}`);
    assert.equal(captured.hasCard, true);
    assert.equal(captured.hasColumn, true);
    assert.equal(captured.cardHeading, 'Diseñar API REST', `heading debería ser "Diseñar API REST", fue "${captured.cardHeading}"`);
    assert.equal(captured.columnTitle, 'Pendiente');
  },
});

tests.push({
  name: 'funcional: tag-color se aplica como data-color en la tag',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const tags = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('main is-kanban is-kanban-card')];
      return cards.slice(0, 4).map((c) => {
        const tagEl = c.shadowRoot.querySelector('[part="tag"]');
        return {
          heading: c.getAttribute('heading'),
          tag: c.getAttribute('tag'),
          tagColor: c.getAttribute('tag-color'),
          tagVisible: tagEl && !tagEl.hidden,
          dataColor: tagEl?.dataset?.color ?? null,
          tagText: tagEl?.textContent?.trim() ?? null,
        };
      });
    });
    const expected = [
      { heading: 'Diseñar API REST', tag: 'back', tagColor: 'brand' },
      { heading: 'Configurar CI', tag: 'ops', tagColor: 'warning' },
      { heading: 'Reunión cliente', tag: 'meet', tagColor: 'neutral' },
      { heading: 'Refactor auth', tag: 'wip', tagColor: 'success' },
    ];
    for (const ex of expected) {
      const got = tags.find((t) => t.heading === ex.heading);
      assert.ok(got, `no se encontró card con heading="${ex.heading}"`);
      assert.equal(got.tag, ex.tag);
      assert.equal(got.tagColor, ex.tagColor);
      assert.equal(got.tagVisible, true);
      assert.equal(got.dataColor, ex.tagColor, `data-color debe ser "${ex.tagColor}", fue "${got.dataColor}"`);
    }
  },
});

tests.push({
  name: 'funcional: card con cover muestra la imagen, sin cover la oculta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const covers = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('main is-kanban is-kanban-card')];
      return cards.map((c) => {
        const cover = c.shadowRoot.querySelector('[part="cover"]');
        const heading = c.getAttribute('heading');
        return {
          heading,
          coverAttr: c.getAttribute('cover'),
          coverHidden: cover?.hidden ?? true,
          bgImage: cover?.style?.backgroundImage || '',
        };
      });
    });
    const withCover = covers.find((c) => c.heading === 'Cover image');
    const noCover = covers.find((c) => c.heading === 'Sin sombra');
    assert.ok(withCover);
    assert.ok(withCover.coverAttr && withCover.coverAttr.length > 0);
    assert.equal(withCover.coverHidden, false, 'card con cover debe mostrar el cover');
    assert.ok(withCover.bgImage.includes('url'), 'background-image debe llevar url()');
    assert.equal(noCover.coverAttr, null);
    assert.equal(noCover.coverHidden, true, 'card sin cover debe tener el cover hidden');
  },
});

tests.push({
  name: 'funcional: orientation="row" propaga data-orientation="row" a las columnas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const orientations = await page.evaluate(() => {
      const boards = [...document.querySelectorAll('main is-kanban')];
      const rowBoard = boards[2];
      return {
        attr: rowBoard.getAttribute('orientation'),
        columns: [...rowBoard.querySelectorAll(':scope > is-kanban-column')].map((c) => c.getAttribute('data-orientation')),
        // El primer tablero debe seguir sin data-orientation (orientation default).
        defaultBoardColumns: [...boards[0].querySelectorAll(':scope > is-kanban-column')].map((c) => c.getAttribute('data-orientation')),
      };
    });
    assert.equal(orientations.attr, 'row');
    assert.deepEqual(orientations.columns, ['row', 'row'], 'ambas columnas deben tener data-orientation="row"');
    // El primer tablero (orientation default) no debe propagar data-orientation.
    assert.deepEqual(orientations.defaultBoardColumns, [null, null]);
  },
});

tests.push({
  name: 'funcional: drag & drop mueve la card entre columnas y emite is-kanban-move',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    await page.waitForTimeout(100);
    // Simular drag & drop usando el API HTML5 directo sobre shadow DOM.
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const basic = document.querySelector('main is-kanban');
        let moveDetail = null;
        basic.addEventListener('is-kanban-move', (e) => { moveDetail = e.detail; });

        const cols = [...basic.querySelectorAll(':scope > is-kanban-column')];
        const sourceCol = cols[0]; // Pendiente
        const targetCol = cols[1]; // En curso
        const cardToMove = sourceCol.querySelector('is-kanban-card');
        const heading = cardToMove.getAttribute('heading');

        // 1. dragstart
        const dt = new DataTransfer();
        const dragStart = new DragEvent('dragstart', {
          bubbles: true, cancelable: true, dataTransfer: dt,
        });
        cardToMove.dispatchEvent(dragStart);

        // 2. dragover en el lane target
        const targetLane = targetCol.shadowRoot.querySelector('.lane');
        const dragOver = new DragEvent('dragover', {
          bubbles: true, cancelable: true, dataTransfer: dt,
        });
        targetLane.dispatchEvent(dragOver);

        // 3. drop
        const drop = new DragEvent('drop', {
          bubbles: true, cancelable: true, dataTransfer: dt, clientX: 9999, clientY: 9999,
        });
        targetLane.dispatchEvent(drop);

        // 4. dragend
        const dragEnd = new DragEvent('dragend', { bubbles: true, dataTransfer: dt });
        cardToMove.dispatchEvent(dragEnd);

        setTimeout(() => {
          resolve({
            moveFired: !!moveDetail,
            heading: moveDetail?.card?.getAttribute('heading') ?? null,
            fromTitle: moveDetail?.from?.getAttribute?.('title') ?? null,
            toTitle: moveDetail?.to?.getAttribute?.('title') ?? null,
            cardMoved: targetCol.querySelector('is-kanban-card')?.getAttribute('heading') ?? null,
            sourceCount: sourceCol.querySelectorAll('is-kanban-card').length,
            targetCount: targetCol.querySelectorAll('is-kanban-card').length,
          });
        }, 120);
      });
    });
    assert.equal(captured.moveFired, true, 'el evento is-kanban-move debió dispararse');
    assert.equal(captured.heading, 'Diseñar API REST');
    assert.equal(captured.fromTitle, 'Pendiente');
    assert.equal(captured.toTitle, 'En curso');
    assert.equal(captured.cardMoved, 'Diseñar API REST', 'la card debe estar ahora en la columna destino');
    assert.equal(captured.sourceCount, 2, `source debe tener 2 cards, tiene ${captured.sourceCount}`);
    assert.equal(captured.targetCount, 3, `target debe tener 3 cards, tiene ${captured.targetCount}`);
  },
});

tests.push({
  name: 'accesibilidad: board tiene role="list", columns role="listitem", cards role="article"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-kanban-ready');
    const aria = await page.evaluate(() => {
      const basic = document.querySelector('main is-kanban');
      return {
        boardRole: basic.getAttribute('role'),
        colRole: basic.querySelector('is-kanban-column').getAttribute('role'),
        cardRole: basic.querySelector('is-kanban-card').getAttribute('role'),
        cardDraggable: basic.querySelector('is-kanban-card').getAttribute('draggable'),
      };
    });
    assert.equal(aria.boardRole, 'list', `board role debe ser "list", fue "${aria.boardRole}"`);
    assert.equal(aria.colRole, 'listitem', `col role debe ser "listitem", fue "${aria.colRole}"`);
    assert.equal(aria.cardRole, 'article', `card role debe ser "article", fue "${aria.cardRole}"`);
    assert.equal(aria.cardDraggable, 'true', `cards deben ser draggable="true"`);
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

report('kanban', failures === 0, { total: tests.length, failures });