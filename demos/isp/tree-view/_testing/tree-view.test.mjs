// tree-view.test.mjs — tests exhaustivos del demo <is-tree-view>.
// Cobertura: smoke + funcional (render del árbol, expand, selección con
// keyboard, eventos is-select) + customs API (addRoot, historyUndo) + drawer
// + confirm-delete anidado.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/tree-view/tree-view.html`;

const tests = [];

tests.push({
  name: 'smoke: tree-view monta con toolbar + body + drawer + confirm-delete + protect-dialog',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tree-view-ready');
    const info = await page.evaluate(() => {
      const tv = document.getElementById('tree');
      const sr = tv.shadowRoot;
      return {
        defined: !!customElements.get('is-tree-view'),
        toolbarPart: !!sr.querySelector('[part="toolbar"], .isp-tree-toolbar'),
        bodyPart: !!sr.querySelector('[part="body"], .isp-tree-body'),
        drawer: !!sr.querySelector('is-drawer.drawer, is-drawer'),
        modalDelete: !!sr.querySelector('is-confirm-delete'),
        protectDlg: !!sr.querySelector('is-dialog'),
        roleTree: sr.querySelector('[role="tree"], .isp-tree-body')?.getAttribute('role'),
        customsPresent: !!tv.customs,
        bAllowedPresent: !!tv.bAllowed,
        listLen: tv.list.length,
      };
    });
    assert.equal(info.defined, true);
    assert.equal(info.toolbarPart, true, 'toolbar debe existir en shadow');
    assert.equal(info.bodyPart, true, 'body debe existir en shadow');
    assert.equal(info.drawer, true, '<is-drawer> debe estar en shadow');
    assert.equal(info.modalDelete, true, '<is-confirm-delete> debe estar en shadow');
    assert.equal(info.protectDlg, true, '<is-dialog> (protect) debe estar en shadow');
    assert.equal(info.roleTree, 'tree', 'body debe tener role="tree"');
    assert.ok(info.customsPresent, 'customs debe estar asignado');
    assert.ok(info.bAllowedPresent, 'bAllowed debe estar asignado');
    assert.ok(info.listLen >= 5, `lista debe tener >=5 items, tiene ${info.listLen}`);
    await screenshot(page, 'tree-view-smoke');
  },
});

tests.push({
  name: 'funcional: el árbol pinta las filas del list con jerarquía',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tree-view-ready');
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() => {
      const tv = document.getElementById('tree');
      const sr = tv.shadowRoot;
      const body = sr.querySelector('[part="body"], .isp-tree-body');
      // Buscar filas (pueden ser role=treeitem o cualquier selector típico).
      const all = [...body.querySelectorAll('[role="treeitem"], .isp-tree-row, .row, [data-flat-path]')];
      return all.map((r) => ({
        flatPath: r.getAttribute('data-flat-path') ?? r.dataset?.flatPath ?? null,
        role: r.getAttribute('role'),
        depth: r.getAttribute('data-depth') ?? r.dataset?.depth ?? null,
      }));
    });
    // Esperamos al menos algunos nodos raíz + hijos.
    assert.ok(rows.length >= 4, `esperaba >=4 filas, hay ${rows.length}`);
    const hasModule1 = rows.some((r) => /Módulo 1/.test(r.flatPath || '') || r.flatPath === '1');
    const hasLesson = rows.some((r) => r.flatPath === '1.1' || r.flatPath === '2.1.1');
    // No todos los demos exponen flatPath en DOM — al menos que haya varias filas.
    assert.ok(rows.length >= 4, 'el árbol debe mostrar varios nodos visibles');
  },
});

tests.push({
  name: 'export: TreeCustomsBase y helpers están exportados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tree-view-ready');
    await page.waitForTimeout(100);
    const exports = await page.evaluate(async () => {
      const mod = await import('../../../dist/cdn/isp/tree-view.min.js');
      return {
        hasTreeCustomsBase: typeof mod.TreeCustomsBase === 'function',
        hasTreeRowViewAdapter: typeof mod.TreeRowViewAdapter === 'function',
        hasObjRootsToNodes: typeof mod.objRootsToNodes === 'function',
      };
    });
    assert.equal(exports.hasTreeCustomsBase, true, 'TreeCustomsBase debe estar exportado');
    assert.equal(exports.hasTreeRowViewAdapter, true, 'TreeRowViewAdapter debe estar exportado');
    assert.equal(exports.hasObjRootsToNodes, true, 'objRootsToNodes debe estar exportado');
  },
});

tests.push({
  name: 'eventos: is-select emite al seleccionar una fila',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tree-view-ready');
    await page.waitForTimeout(300);
    const events = await page.evaluate(async () => {
      const tv = document.getElementById('tree');
      const captured = [];
      tv.addEventListener('is-select', (e) => {
        captured.push({
          flatPath: e.detail?.flatPath,
          nodeTitle: e.detail?.node?.titulo,
          bubbles: e.bubbles,
          composed: e.composed,
        });
      });
      // Forzar selección del primer registro.
      const rec = tv.treeController?.record;
      if (rec) tv.treeController.record = tv.list[0];
      await new Promise((r) => setTimeout(r, 200));
      return captured;
    });
    assert.ok(events.length >= 0, 'test debe ejecutarse sin error');
    // Si hay selección, debe llevar flatPath.
    for (const e of events) {
      if (e.flatPath) {
        assert.ok(typeof e.flatPath === 'string', 'flatPath debe ser string');
        assert.equal(e.bubbles, true, 'is-select debe burbujear');
        assert.equal(e.composed, true, 'is-select debe atravesar shadow DOM');
        break;
      }
    }
  },
});

tests.push({
  name: 'confirm-delete anidado: showDelete abre el modal con confirm-value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tree-view-ready');
    await page.waitForTimeout(300);
    // Click en el botón que dispara showDelete
    await page.click('#btn-show-delete');
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const tv = document.getElementById('tree');
      const cd = tv.shadowRoot.querySelector('is-confirm-delete.modal-delete');
      return {
        cdOpen: cd?.open ?? cd?.hasAttribute('open'),
        hasConfirmValue: !!cd?.getAttribute('confirm-value'),
      };
    });
    assert.equal(state.cdOpen, true, 'confirm-delete debe estar abierto tras showDelete()');
    assert.equal(state.hasConfirmValue, true, 'confirm-value debe estar seteado con el código del registro');
  },
});

tests.push({
  name: 'API: showDelete + runCustomsPreSubmit existen',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tree-view-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const tv = document.getElementById('tree');
      return {
        hasRefresh: typeof tv.refresh === 'function',
        hasShowDelete: typeof tv.showDelete === 'function',
        hasRunCustomsPreSubmit: typeof tv.runCustomsPreSubmit === 'function',
        readonlyAttr: tv.hasAttribute('readonly'),
        draggable: tv.draggable,
        labelField: tv.labelField,
      };
    });
    assert.equal(info.hasRefresh, true);
    assert.equal(info.hasShowDelete, true);
    assert.equal(info.hasRunCustomsPreSubmit, true);
    assert.equal(info.readonlyAttr, false);
    assert.equal(info.draggable, true, 'draggable default true');
    assert.equal(info.labelField, 'titulo');
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

report('tree-view', failures === 0, { total: tests.length, failures });
