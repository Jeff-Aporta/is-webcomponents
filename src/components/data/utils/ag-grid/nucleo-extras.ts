/**
 * nucleo/extras — Plugin de opciones y API menores del nucleo: numeros de fila,
 * tamaños de cabecera, autosize inicial, consultas de columnas y grupos, menus
 * programaticos y eventos de encabezado. Lo que no merece carpeta propia.
 */
import type { Colref } from './nucleo-extras.schemas.js';
import { getCellValue } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/value-formatter.js';
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Desinstalar, GridHost, RendererCelda } from './contrato.schemas.js';
import type { DefAplanada, GrupoCabecera } from './nucleo-opciones.schemas.js';
import type { Menus } from './nucleo-menus.schemas.js';
import type { Motor } from './nucleo-motor.schemas.js';

const idDe = (c: Colref): string => (typeof c === 'string' ? c : c.colId);

function gruposDe(h: GridHost, col: ColumnState): GrupoCabecera[] {
  return (h.defDe(col) as DefAplanada).__grupos ?? [];
}

/** Id de cada grupo de cabecera con sus columnas visibles, por seccion opcional. */
function gruposVisibles(h: GridHost, cols: ColumnState[]): { groupId: string; headerName: string; children: ColumnState[] }[] {
  const mapa = new Map<string, { groupId: string; headerName: string; children: ColumnState[] }>();
  for (const col of cols) {
    for (const g of gruposDe(h, col)) {
      const e = mapa.get(g.id) ?? { groupId: g.id, headerName: g.headerName, children: [] };
      e.children.push(col);
      mapa.set(g.id, e);
    }
  }
  return [...mapa.values()];
}

/** Aplica `columnGroupShow`: visibles segun si el grupo esta abierto o cerrado. */
function aplicarAperturaGrupo(h: GridHost, groupId: string, abierto: boolean): void {
  for (const col of h.columnas()) {
    if (!gruposDe(h, col).some((g) => g.id === groupId)) continue;
    const modo = h.defDe(col)['columnGroupShow'];
    if (modo === 'open') h.modelo()?.hideColumn(col.colId, !abierto);
    if (modo === 'closed') h.modelo()?.hideColumn(col.colId, abierto);
  }
}

function tamanosCabecera(h: GridHost): void {
  const raiz = h.el;
  const altos: [string, string][] = [['headerHeight', '--iswc-grid-header-h'], ['groupHeaderHeight', '--iswc-grid-group-header-h'], ['floatingFiltersHeight', '--iswc-grid-floating-h']];
  for (const [opcion, token] of altos) {
    const v = h.opcion<number | undefined>(opcion);
    if (v) raiz.style.setProperty(token, h.em(v));
    else raiz.style.removeProperty(token);
  }
}

/** `autoSizeStrategy`: ajuste inicial o tras cambiar el tamaño. */
function autoAjustar(h: GridHost, api: Record<string, (...a: unknown[]) => unknown>): void {
  const e = h.opcion<{ type?: string } | undefined>('autoSizeStrategy');
  if (e?.type === 'fitGridWidth') api['sizeColumnsToFit']?.();
  if (e?.type === 'fitCellContents') api['autoSizeAllColumns']?.();
}

const numeroFila: RendererCelda = (ctx) => String(ctx.rowIndex + 1);

export function crearExtras(motor: Motor, menus: Menus) {
  return function instalar(h: GridHost): Desinstalar {
    const api = (): Record<string, (...a: unknown[]) => unknown> => (h.el as unknown as { api: Record<string, (...a: unknown[]) => unknown> }).api;
    const abiertos = new Set<string>();
    const quitar: Desinstalar[] = [];
    h.renderer('__numeroFila', numeroFila);

    quitar.push(h.on('gridReady', () => {
      tamanosCabecera(h);
      autoAjustar(h, api());
    }));
    for (const op of ['headerHeight', 'groupHeaderHeight', 'floatingFiltersHeight']) quitar.push(h.alCambiarOpcion(op, () => tamanosCabecera(h)));
    quitar.push(h.alCambiarOpcion('autoSizeStrategy', () => autoAjustar(h, api())));

    const cabecera = h.shadow.querySelector('.mim-dg__header-row');
    let ultima: Element | null = null;
    const sobre = (e: Event): void => {
      const c = (e.target as Element).closest?.('.mim-dg__head-cell') ?? null;
      if (c === ultima) return;
      if (ultima) h.emitir('columnHeaderMouseLeave', { column: h.columna((ultima as HTMLElement).dataset['colId'] ?? '') });
      ultima = c;
      if (c) h.emitir('columnHeaderMouseOver', { column: h.columna((c as HTMLElement).dataset['colId'] ?? '') });
    };
    cabecera?.addEventListener('pointerover', sobre);
    quitar.push(() => cabecera?.removeEventListener('pointerover', sobre));

    h.exponer({
      getDisplayedColAfter: (c: Colref) => {
        const l = motor.columnasOrdenadas();
        return l[l.findIndex((p) => p.col.colId === idDe(c)) + 1]?.col ?? null;
      },
      getDisplayedColBefore: (c: Colref) => {
        const l = motor.columnasOrdenadas();
        return l[l.findIndex((p) => p.col.colId === idDe(c)) - 1]?.col ?? null;
      },
      getAllDisplayedVirtualColumns: () => motor.columnasOrdenadas().map((p) => p.col),
      getColumnGroup: (id: string) => gruposVisibles(h, h.columnas()).find((g) => g.groupId === id) ?? null,
      getProvidedColumnGroup: (id: string) => gruposVisibles(h, h.columnas()).find((g) => g.groupId === id) ?? null,
      getDisplayNameForColumnGroup: (g: { headerName?: string }) => g.headerName ?? '',
      getAllDisplayedColumnGroups: () => gruposVisibles(h, motor.columnasOrdenadas().map((p) => p.col)),
      getLeftDisplayedColumnGroups: () => gruposVisibles(h, motor.diseno().izq.map((p) => p.col)),
      getCenterDisplayedColumnGroups: () => gruposVisibles(h, motor.diseno().centro.map((p) => p.col)),
      getRightDisplayedColumnGroups: () => gruposVisibles(h, motor.diseno().der.map((p) => p.col)),
      setColumnGroupOpened: (id: string, abierto: boolean) => {
        if (abierto) abiertos.add(id);
        else abiertos.delete(id);
        aplicarAperturaGrupo(h, id, abierto);
        h.emitir('columnGroupOpened', { groupId: id, expanded: abierto });
      },
      getColumnGroupState: () => [...abiertos].map((groupId) => ({ groupId, open: true })),
      setColumnGroupState: (l: { groupId: string; open: boolean }[]) => {
        for (const g of l) {
          if (g.open) abiertos.add(g.groupId);
          else abiertos.delete(g.groupId);
          aplicarAperturaGrupo(h, g.groupId, g.open);
        }
      },
      resetColumnGroupState: () => { abiertos.clear(); },
      getHorizontalPixelRange: () => {
        const v = h.shadow.querySelector<HTMLElement>('.mim-dg__viewport');
        return { left: v?.scrollLeft ?? 0, right: (v?.scrollLeft ?? 0) + (v?.clientWidth ?? 0) };
      },
      getVerticalPixelRange: () => {
        const v = h.shadow.querySelector<HTMLElement>('.mim-dg__viewport');
        return { top: v?.scrollTop ?? 0, bottom: (v?.scrollTop ?? 0) + (v?.clientHeight ?? 0) };
      },
      showColumnMenu: (c: Colref) => {
        const col = h.columna(idDe(c));
        const ancla = h.shadow.querySelector<HTMLElement>(`.mim-dg__head-cell[data-col-id="${CSS.escape(idDe(c))}"]`);
        if (col && ancla) menus.abrirColumna({ tipo: 'columna', col, node: null }, ancla);
      },
      showContextMenu: (p: { x?: number; y?: number; rowNode?: { id: string } | null; column?: Colref | null } = {}) => {
        const col = p.column ? h.columna(idDe(p.column)) : null;
        const node = p.rowNode ? h.nodo(p.rowNode.id) : null;
        menus.abrirContexto({ tipo: 'contexto', col, node, value: col && node ? getCellValue(col, node) : undefined }, p.x ?? 0, p.y ?? 0);
      },
      hidePopupMenu: () => menus.cerrar(),
      showColumnChooser: () => api()['openToolPanel']?.('columns'),
      hideColumnChooser: () => api()['closeToolPanel']?.(),
      setFocusedHeader: (c: Colref) => {
        h.shadow.querySelector<HTMLElement>(`.mim-dg__head-cell[data-col-id="${CSS.escape(idDe(c))}"]`)?.focus();
      },
      addGlobalListener: (fn: (t: string, d: unknown) => void) => { h.on('*', (d) => fn(String(d['type']), d)); },
      expireValueCache: () => motor.refrescar(),
      isAnimationFrameQueueEmpty: () => true,
      isModuleRegistered: () => true,
      getCellRendererInstances: () => [],
      getCellEditorInstances: () => [],
    });
    return () => {
      for (const fn of quitar) fn();
    };
  };
}
