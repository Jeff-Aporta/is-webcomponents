/**
 * nucleo/menus — Menu de columna y menu contextual sobre <iswc-context-menu>.
 *
 * Reune items base + los que aportan los plugins (`grid.menu`), respeta
 * mainMenuItems / columnMenuItems / getMainMenuItems / getContextMenuItems y
 * pinta submenus anidando otro <iswc-context-menu>.
 */

import type { MenuKit } from './menus.schemas.js';
export type * from './menus.schemas.js';
import '../../../../actions/context-menu.js';
import '../../../../media/icon.js';
import type { ContextoMenu, GridHost, ItemMenu, ProveedorMenu } from '../contrato.js';


function fusionarPorId(base: ItemMenu[], extra: ItemMenu[]): ItemMenu[] {
  const salida = base.slice();
  for (const item of extra) {
    const i = item.id ? salida.findIndex((b) => b.id === item.id) : -1;
    if (i >= 0) salida[i] = item;
    else salida.push(item);
  }
  return salida;
}

/** Aplica una lista de AG: claves conocidas, objetos propios y 'separator'. */
function aplicarLista(lista: unknown[], items: ItemMenu[]): ItemMenu[] {
  return lista.map((e): ItemMenu | null => {
    if (e === 'separator') return { separador: true };
    if (typeof e === 'string') return items.find((i) => i.id === e) ?? null;
    const o = e as { name?: string; icon?: string; action?: () => void; disabled?: boolean; checked?: boolean; shortcut?: string; subMenu?: unknown[] };
    return { texto: o.name, icono: o.icon, accion: o.action, deshabilitado: o.disabled, marcado: o.checked, atajo: o.shortcut, hijos: o.subMenu ? aplicarLista(o.subMenu, items) : undefined };
  }).filter((i): i is ItemMenu => i != null);
}

export function crearMenus(h: GridHost, proveedores: ProveedorMenu[]) {
  let raiz: MenuKit | null = null;

  function cerrar(): void {
    raiz?.close();
    raiz?.remove();
    raiz = null;
  }

  function construir(items: ItemMenu[]): MenuKit {
    const menu = document.createElement('iswc-context-menu') as MenuKit;
    menu.setAttribute('class', 'mim-dg__menu');
    menu.setAttribute('part', 'menu');
    menu.setAttribute('role', 'menu');
    for (const item of items) {
      if (item.separador) {
        const sep = document.createElement('div');
        sep.className = 'mim-dg__menu-sep';
        sep.setAttribute('role', 'separator');
        menu.append(sep);
        continue;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mim-dg__menu-item item';
      b.setAttribute('role', item.marcado === undefined ? 'menuitem' : 'menuitemcheckbox');
      if (item.marcado !== undefined) b.setAttribute('aria-checked', String(item.marcado));
      if (item.id) b.dataset['menuId'] = item.id;
      b.disabled = item.deshabilitado === true;
      const icono = item.marcado ? 'mdi:check' : item.icono;
      b.innerHTML = `<span class="mim-dg__menu-icon">${icono ? `<iswc-icon icon="${h.escapar(icono)}"></iswc-icon>` : ''}</span><span class="mim-dg__menu-label">${h.escapar(item.texto ?? '')}</span>${item.atajo ? `<kbd class="mim-dg__menu-kbd">${h.escapar(item.atajo)}</kbd>` : ''}${item.hijos ? '<iswc-icon icon="mdi:chevron-right"></iswc-icon>' : ''}`;
      if (item.hijos) {
        const hijos = item.hijos;
        const abrirHijo = (): void => {
          const sub = construir(hijos);
          sub.classList.add('mim-dg__submenu');
          h.shadow.append(sub);
          const r = b.getBoundingClientRect();
          sub.openAt(r.right, r.top);
          menu.addEventListener('iswc-close', () => sub.remove(), { once: true });
        };
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          abrirHijo();
        });
      } else {
        b.addEventListener('click', () => {
          cerrar();
          item.accion?.();
        });
      }
      menu.append(b);
    }
    return menu;
  }

  function reunir(ctx: ContextoMenu): ItemMenu[] {
    let items = base(ctx);
    for (const p of proveedores) items = fusionarPorId(items, p(ctx));
    return ajustar(ctx, items);
  }

  function ajustar(ctx: ContextoMenu, items: ItemMenu[]): ItemMenu[] {
    const def = ctx.col ? h.defDe(ctx.col) : null;
    const params = { api: (h.el as unknown as { api: unknown }).api, column: ctx.col, node: ctx.node, value: ctx.value, defaultItems: items.map((i) => i.id).filter(Boolean) };
    if (ctx.tipo === 'columna') {
      const propia = def?.['mainMenuItems'] ?? def?.['columnMenuItems'];
      if (Array.isArray(propia)) return aplicarLista(propia, items);
      const fn = h.opcion<((p: unknown) => unknown[]) | undefined>('getMainMenuItems') ?? h.opcion<((p: unknown) => unknown[]) | undefined>('getColumnMenuItems');
      if (fn) return aplicarLista(fn(params), items);
      return items;
    }
    const propia = def?.['contextMenuItems'];
    if (Array.isArray(propia)) return aplicarLista(propia, items);
    const fn = h.opcion<((p: unknown) => unknown[]) | undefined>('getContextMenuItems');
    if (fn) return aplicarLista(fn(params), items);
    return items;
  }

  function base(ctx: ContextoMenu): ItemMenu[] {
    return ctx.tipo === 'columna' ? baseColumna(ctx) : baseContexto();
  }

  function baseColumna(ctx: ContextoMenu): ItemMenu[] {
    const col = ctx.col;
    const m = h.modelo();
    const api = (h.el as unknown as { api: Record<string, (...a: unknown[]) => void> }).api;
    if (!col || !m) return [];
    const estado = h.estado();
    const dir = estado?.sortModel.find((s) => s.colId === col.colId)?.dir ?? null;
    const agrupada = estado?.rowGroupCols.includes(col.colId) ?? false;
    const ponerOrden = (d: 'asc' | 'desc' | null): void => {
      const otros = (estado?.sortModel ?? []).filter((s) => s.colId !== col.colId);
      m.setSortModel(d ? [...otros, { colId: col.colId, dir: d }] : otros);
      h.emitir('sortChanged', { source: 'columnMenu' });
      h.el.dispatchEvent(new CustomEvent('iswc-sort-change', { bubbles: true, composed: true, detail: { column: col.colId, direction: d } }));
    };
    const fijar = (lado: 'left' | 'right' | null): void => {
      m.pinColumn(col.colId, lado);
      h.emitir('columnPinned', { column: col, pinned: lado });
      h.el.dispatchEvent(new CustomEvent('iswc-column-pin', { bubbles: true, composed: true, detail: { colId: col.colId, side: lado } }));
    };
    const items: ItemMenu[] = [];
    if (col.sortable) {
      items.push({ id: 'sortAscending', texto: h.texto('sortAscending', 'Orden ascendente'), icono: 'mdi:sort-ascending', accion: () => ponerOrden('asc') });
      items.push({ id: 'sortDescending', texto: h.texto('sortDescending', 'Orden descendente'), icono: 'mdi:sort-descending', accion: () => ponerOrden('desc') });
      if (dir) items.push({ id: 'sortUnSort', texto: h.texto('sortUnSort', 'Quitar orden'), icono: 'mdi:sort-variant-remove', accion: () => ponerOrden(null) });
      items.push({ separador: true });
    }
    if (col.filterType) {
      items.push({ id: 'columnFilter', texto: h.texto('columnFilter', 'Filtro de columna'), icono: 'mdi:filter-outline', accion: () => api['showColumnFilter']?.(col.colId) });
      items.push({ separador: true });
    }
    items.push({
      id: 'pinSubMenu', texto: h.texto('pinColumn', 'Fijar columna'), icono: 'mdi:pin-outline',
      hijos: [
        { id: 'pinLeft', texto: h.texto('pinLeft', 'A la izquierda'), marcado: col.pinned === 'left', accion: () => fijar('left') },
        { id: 'pinRight', texto: h.texto('pinRight', 'A la derecha'), marcado: col.pinned === 'right', accion: () => fijar('right') },
        { id: 'clearPinned', texto: h.texto('noPin', 'Sin fijar'), marcado: !col.pinned, accion: () => fijar(null) },
      ],
    });
    items.push({ separador: true });
    items.push({ id: 'autoSizeThis', texto: h.texto('autosizeThisColumn', 'Autoajustar esta columna'), icono: 'mdi:arrow-expand-horizontal', accion: () => api['autoSizeColumns']?.([col.colId]) });
    items.push({ id: 'autoSizeAll', texto: h.texto('autosizeAllColumns', 'Autoajustar todas'), accion: () => api['autoSizeAllColumns']?.() });
    if (col.enableRowGroup) {
      items.push({ separador: true });
      items.push({ id: agrupada ? 'rowUnGroup' : 'rowGroup', texto: agrupada ? h.texto('ungroupBy', 'Quitar agrupación') : h.texto('groupBy', 'Agrupar por esta columna'), icono: agrupada ? 'mdi:ungroup' : 'mdi:group', accion: () => (agrupada ? m.removeRowGroupCol(col.colId) : m.addRowGroupCol(col.colId)) });
    }
    items.push({ separador: true });
    items.push({ id: 'columnChooser', texto: h.texto('chooseColumns', 'Elegir columnas'), icono: 'mdi:view-column-outline', accion: () => api['openToolPanel']?.('columns') });
    items.push({ id: 'hideColumn', texto: h.texto('hideColumn', 'Ocultar columna'), icono: 'mdi:eye-off-outline', accion: () => {
      m.hideColumn(col.colId, true);
      h.emitir('columnVisible', { column: col, visible: false });
      h.el.dispatchEvent(new CustomEvent('iswc-column-hide', { bubbles: true, composed: true, detail: { colId: col.colId } }));
    } });
    items.push({ id: 'resetColumns', texto: h.texto('resetColumns', 'Restablecer columnas'), icono: 'mdi:backup-restore', accion: () => api['resetColumnState']?.() });
    return items;
  }

  function baseContexto(): ItemMenu[] {
    const api = (h.el as unknown as { api: Record<string, (...a: unknown[]) => void> }).api;
    return [
      { id: 'csvExport', texto: h.texto('csvExport', 'Exportar a CSV'), icono: 'mdi:file-delimited-outline', accion: () => api['exportDataAsCsv']?.() },
    ];
  }

  function abrirColumna(ctx: ContextoMenu, ancla: HTMLElement): void {
    cerrar();
    raiz = construir(reunir(ctx));
    h.shadow.append(raiz);
    raiz.openAtElement(ancla);
  }

  function abrirContexto(ctx: ContextoMenu, x: number, y: number): void {
    cerrar();
    const items = reunir(ctx);
    if (!items.length) return;
    raiz = construir(items);
    h.shadow.append(raiz);
    raiz.openAt(x, y);
  }

  return { abrirColumna, abrirContexto, cerrar };
}

