// @contexto INDICE.md · src/components/data/README.md
/**
 * nucleo/interaccion — Raton y teclado por delegacion sobre el viewport.
 *
 * Primero corren los manejadores de plugins; si uno devuelve true, el host no
 * hace su comportamiento por defecto. La grilla sigue el patron ARIA grid con
 * aria-activedescendant: el foco real queda en el viewport.
 */
import type { PuertosInteraccion, Manejadores } from './nucleo-interaccion.schemas.js';
import { clearSelection, selectAll, toggleRowSelection } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/selection.js';
import type { Menus } from './nucleo-menus.schemas.js';
import type { Motor } from './nucleo-motor.schemas.js';
import type { EventoCelda, ManejadorCelda, RefCelda } from './contrato.schemas.js';
import type { GridHost } from './nucleo-tipos.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

function emitirDom(h: GridHost, tipo: string, detail: unknown): void {
  h.el.dispatchEvent(new CustomEvent(tipo, { bubbles: true, composed: true, detail }));
}

export function crearInteraccion(h: GridHost, motor: Motor, menus: Menus, viewport: HTMLElement, m: Manejadores, p: PuertosInteraccion) {
  let rangoDesde: string | null = null;
  let cabeceraFoco = -1;

  const lista = (): RowNode[] => h.estado()?.displayedRows ?? [];

  function eventoCelda(e: Event): EventoCelda | null {
    const t = e.target as Element;
    const celda = t.closest?.<HTMLElement>('.mim-dg__cell[data-col-id]');
    const fila = t.closest?.<HTMLElement>('.mim-dg__row');
    if (!celda || !fila) return null;
    const colId = celda.dataset['colId'] ?? '';
    const indice = Number(fila.dataset['rowIndex']);
    const node = h.nodo(fila.dataset['rowId'] ?? '');
    const col = h.columna(colId);
    return { indice, colId, evento: e, node, col: col as EventoCelda['col'] };
  }

  function correr(lista2: ManejadorCelda[], ev: EventoCelda): boolean {
    for (const fn of lista2) if (fn(ev) === true) return true;
    return false;
  }

  function avisarSeleccion(): void {
    const rows = (h.el as unknown as { api: { getSelectedRows: () => unknown[] } }).api.getSelectedRows();
    emitirDom(h, 'iswc-row-select', { rows });
    h.emitir('selectionChanged', { rows, source: 'ui' });
  }

  function seleccionar(node: RowNode, e: MouseEvent, forzarAditivo: boolean): void {
    const modelo = h.modelo();
    const estado = h.estado();
    if (!modelo || !estado) return;
    const next = toggleRowSelection(estado.selection, node.id, p.modo(), {
      additive: forzarAditivo || e.ctrlKey || e.metaKey,
      range: e.shiftKey,
      rangeFrom: rangoDesde ?? undefined,
      orderedIds: e.shiftKey ? lista().map((n) => n.id) : undefined,
    });
    if (!e.shiftKey) rangoDesde = node.id;
    modelo.setSelection(next);
    avisarSeleccion();
  }

  function alAbajo(e: Event): void {
    const ev = eventoCelda(e);
    if (ev) correr(m.abajo, ev);
  }

  function alClic(e: Event): void {
    const ev0 = e as MouseEvent;
    const t = ev0.target as Element;
    const modelo = h.modelo();
    if (!modelo) return;
    const grupo = t.closest<HTMLElement>('.mim-dg__group-row');
    if (grupo) {
      const id = grupo.dataset['rowId'];
      if (id) {
        modelo.toggleGroup(id);
        h.emitir('rowGroupOpened', { id });
      }
      return;
    }
    const ev = eventoCelda(e);
    if (!ev) return;
    h.enfocarSinScroll?.({ indice: ev.indice, colId: ev.colId });
    if (ev.colId === '__seleccion') {
      if (correr(m.clic, ev)) return;
      if (ev.node && !p.seleccionPropia()) seleccionar(ev.node, ev0, true);
      return;
    }
    const accion = t.closest<HTMLElement>('[data-action]');
    if (accion && ev.node) {
      const def = ev.col ? h.defDe(ev.col) : null;
      const actos = (def?.['actions'] ?? []) as { value: string }[];
      emitirDom(h, 'iswc-action', { row: ev.node.data, column: ev.col, action: actos.find((a) => a.value === accion.dataset['action'])?.value ?? accion.dataset['action'] });
      return;
    }
    if (correr(m.clic, ev)) return;
    if (ev.node) {
      const value = ev.col ? h.valor(ev.col, ev.node) : undefined;
      if (p.modo() !== 'none' && !p.seleccionPropia()) seleccionar(ev.node, ev0, false);
      emitirDom(h, 'iswc-cell-click', { row: ev.node.data, column: ev.col ?? null, value });
      h.emitir('cellClicked', { data: ev.node.data, node: ev.node, column: ev.col, colDef: ev.col ? h.defDe(ev.col) : null, value, rowIndex: ev.indice, event: e });
      h.emitir('rowClicked', { data: ev.node.data, node: ev.node, rowIndex: ev.indice, event: e });
    }
  }

  function alDobleClic(e: Event): void {
    const ev = eventoCelda(e);
    if (!ev) return;
    if (correr(m.dobleClic, ev)) return;
    if (!ev.node) return;
    h.emitir('cellDoubleClicked', { data: ev.node.data, node: ev.node, column: ev.col, value: ev.col ? h.valor(ev.col, ev.node) : undefined, rowIndex: ev.indice, event: e });
    h.emitir('rowDoubleClicked', { data: ev.node.data, node: ev.node, rowIndex: ev.indice, event: e });
  }

  function alContexto(e: Event): void {
    const me = e as MouseEvent;
    if (h.opcion('suppressContextMenu') === true) return;
    if (me.ctrlKey && h.opcion('allowContextMenuWithControlKey') === true) return;
    const cab = (e.target as Element).closest<HTMLElement>('.mim-dg__head-cell[data-col-id]');
    if (cab) {
      const col = h.columna(cab.dataset['colId'] ?? '');
      if (!col) return;
      e.preventDefault();
      h.emitir('columnHeaderContextMenu', { column: col, event: e });
      menus.abrirColumna({ tipo: 'columna', col, node: null }, cab);
      return;
    }
    const ev = eventoCelda(e);
    if (!ev) return;
    e.preventDefault();
    h.emitir('cellContextMenu', { node: ev.node, column: ev.col, rowIndex: ev.indice, event: e });
    menus.abrirContexto({ tipo: 'contexto', col: ev.col, node: ev.node, value: ev.col && ev.node ? h.valor(ev.col, ev.node) : undefined }, me.clientX, me.clientY);
  }

  let ultimaCelda: Element | null = null;
  function alSobre(e: Event): void {
    const c = (e.target as Element).closest?.('.mim-dg__cell[data-col-id]') ?? null;
    if (c === ultimaCelda) return;
    if (ultimaCelda) h.emitir('cellMouseOut', { celda: ultimaCelda });
    ultimaCelda = c;
    if (!c) return;
    const ev = eventoCelda(e);
    if (ev?.node) h.emitir('cellMouseOver', { node: ev.node, column: ev.col, rowIndex: ev.indice, event: e });
  }

  /* ── Teclado ─────────────────────────────────────────────────────────── */

  function colsNavegables(): string[] {
    return motor.columnasOrdenadas().filter((c) => h.defDe(c.col)['suppressNavigable'] !== true).map((c) => c.col.colId);
  }

  function mover(foco: RefCelda, df: number, dc: number): void {
    const cols = colsNavegables();
    const c = Math.max(0, Math.min(cols.length - 1, cols.indexOf(foco.colId) + dc));
    const f = Math.max(0, Math.min(h.totalFilas() - 1, foco.indice + df));
    h.enfocar({ indice: f, colId: cols[c] ?? foco.colId });
  }

  function focoCabecera(i: number): void {
    const celdas = [...viewport.querySelectorAll<HTMLElement>('.mim-dg__header-row .mim-dg__head-cell')];
    cabeceraFoco = Math.max(0, Math.min(celdas.length - 1, i));
    const c = celdas[cabeceraFoco];
    if (!c) return;
    c.focus();
    h.emitir('headerFocused', { column: h.columna(c.dataset['colId'] ?? '') });
  }

  function tecladoCabecera(e: KeyboardEvent): boolean {
    const cel = (e.composedPath()[0] as Element).closest?.<HTMLElement>('.mim-dg__head-cell');
    if (!cel) return false;
    const colId = cel.dataset['colId'] ?? '';
    const col = h.columna(colId);
    if (e.key === 'ArrowRight') focoCabecera(cabeceraFoco + 1);
    else if (e.key === 'ArrowLeft') focoCabecera(cabeceraFoco - 1);
    else if (e.key === 'ArrowDown' && !e.altKey) {
      viewport.focus();
      h.enfocar({ indice: 0, colId: col ? colId : colsNavegables()[0] ?? '' });
    } else if (e.key === 'Enter' && col?.sortable) p.ordenar(colId, e as unknown as MouseEvent);
    else if ((e.key === 'ArrowDown' && e.altKey) || (e.key === 'Enter' && e.ctrlKey)) {
      if (col) menus.abrirColumna({ tipo: 'columna', col, node: null }, cel);
    } else if (e.key === 'f' && e.ctrlKey && col) p.abrirFiltro(colId, cel);
    else return false;
    e.preventDefault();
    return true;
  }

  function alTeclado(e: Event): void {
    const k = e as KeyboardEvent;
    if (tecladoCabecera(k)) return;
    const foco = motor.foco();
    h.emitir('cellKeyDown', { event: e, foco });
    for (const fn of m.teclado) if (fn(k, foco) === true) return;
    const n = h.totalFilas();
    const cols = colsNavegables();
    if (!n || !cols.length) return;
    const actual: RefCelda = foco ?? { indice: 0, colId: cols[0]! };
    const pagina = Math.max(1, Math.floor(viewport.clientHeight / motor.altoBase()) - 2);
    const ctrl = k.ctrlKey || k.metaKey;
    if (k.key === 'ArrowDown') mover(actual, foco ? 1 : 0, 0);
    else if (k.key === 'ArrowUp') {
      if (actual.indice === 0 && foco) {
        h.enfocar(null);
        focoCabecera(cols.indexOf(actual.colId) + (viewport.querySelector('.mim-dg__header-row .mim-dg__cell--check') ? 1 : 0));
      } else mover(actual, -1, 0);
    } else if (k.key === 'ArrowRight') mover(actual, 0, 1);
    else if (k.key === 'ArrowLeft') mover(actual, 0, -1);
    else if (k.key === 'PageDown') mover(actual, pagina, 0);
    else if (k.key === 'PageUp') mover(actual, -pagina, 0);
    else if (k.key === 'Home') h.enfocar({ indice: ctrl ? 0 : actual.indice, colId: cols[0]! });
    else if (k.key === 'End') h.enfocar({ indice: ctrl ? n - 1 : actual.indice, colId: cols[cols.length - 1]! });
    else if (k.key === ' ' || k.key === 'Enter') {
      const f = h.filaEn(actual.indice);
      if (f?.kind === 'group') h.modelo()?.toggleGroup((f as { id: string }).id);
      else if (f?.kind === 'leaf' && p.modo() !== 'none' && !p.seleccionPropia()) {
        const node = (f as { node: RowNode }).node;
        rangoDesde = node.id;
        const estado = h.estado();
        if (estado) h.modelo()?.setSelection(toggleRowSelection(estado.selection, node.id, p.modo(), { additive: true }));
        avisarSeleccion();
      }
    } else if (ctrl && k.key.toLowerCase() === 'a' && p.modo() === 'multiple') {
      h.modelo()?.setSelection(selectAll(lista()));
      avisarSeleccion();
    } else if (k.key === 'Escape' && h.estado()?.selection.size) {
      h.modelo()?.setSelection(clearSelection());
      avisarSeleccion();
    } else return;
    k.preventDefault();
  }

  viewport.addEventListener('pointerdown', alAbajo);
  viewport.addEventListener('click', alClic);
  viewport.addEventListener('dblclick', alDobleClic);
  viewport.addEventListener('contextmenu', alContexto);
  viewport.addEventListener('pointerover', alSobre);
  viewport.addEventListener('keydown', alTeclado);
}
