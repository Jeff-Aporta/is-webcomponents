/**
 * ag-grid/filas/panel-agrupacion — Panel lateral de agrupacion, valores y pivote.
 *
 * Zonas de soltar con drag & drop nativo: Grupos de fila, Valores y Etiquetas de
 * columna, mas el interruptor de modo pivote. La franja superior de
 * `rowGroupPanelShow` la pinta el host.
 */
import type { EnlacesPanel } from './filas.schemas.js';
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

const MIME = 'application/x-iswc-col';

export function moverEn(lista: readonly string[], id: string, destino: number): string[] {
  const sin = lista.filter((x) => x !== id);
  const previo = lista.indexOf(id);
  const ajuste = previo >= 0 && previo < destino ? destino - 1 : destino;
  const pos = Math.max(0, Math.min(ajuste, sin.length));
  sin.splice(pos, 0, id);
  return sin;
}

function crearZona(grid: GridHost, clave: string, titulo: string, icono: string, leer: () => string[], escribir: (ids: string[]) => void): HTMLElement {
  const doc = grid.el.ownerDocument;
  const zona = doc.createElement('section');
  zona.className = 'iswc-ag-zona';
  zona.dataset['zona'] = clave;
  const pintar = (): void => {
    const ids = leer();
    const vacio = grid.escapar(grid.texto('dragHereToSet', 'Arrastra columnas aquí'));
    const chips = ids.map((id) => chip(grid, grid.columna(id), id)).join('');
    zona.innerHTML = `<header class="iswc-ag-zona__titulo"><iswc-icon icon="${icono}"></iswc-icon>${grid.escapar(titulo)}</header><div class="iswc-ag-zona__lista">${chips || `<span class="iswc-ag-zona__vacio">${vacio}</span>`}</div>`;
  };
  zona.addEventListener('dragstart', (e: DragEvent) => {
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-col-id]') : null;
    if (el?.dataset['colId']) e.dataTransfer?.setData(MIME, el.dataset['colId']);
  });
  zona.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    zona.classList.add('iswc-ag-zona--sobre');
  });
  zona.addEventListener('dragleave', () => zona.classList.remove('iswc-ag-zona--sobre'));
  zona.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    zona.classList.remove('iswc-ag-zona--sobre');
    const id = e.dataTransfer?.getData(MIME);
    if (!id) return;
    const chipDestino = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-col-id]') : null;
    const ids = leer();
    const destino = chipDestino?.dataset['colId'] ? ids.indexOf(chipDestino.dataset['colId']) : ids.length;
    escribir(moverEn(ids, id, destino));
    pintar();
  });
  zona.addEventListener('click', (e: Event) => {
    const boton = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-quitar]') : null;
    if (!boton?.dataset['quitar']) return;
    escribir(leer().filter((x) => x !== boton.dataset['quitar']));
    pintar();
  });
  pintar();
  (zona as HTMLElement & { pintar?: () => void }).pintar = pintar;
  return zona;
}

function chip(grid: GridHost, col: ColumnState | null, id: string): string {
  const nombre = grid.escapar(col?.headerName ?? id);
  const quitar = grid.escapar(grid.texto('remove', 'Quitar'));
  const cid = grid.escapar(id);
  return `<span class="iswc-ag-chip" draggable="true" data-col-id="${cid}">${nombre}<button type="button" class="iswc-ag-chip__x" data-quitar="${cid}" aria-label="${quitar}"><iswc-icon icon="mdi:close"></iswc-icon></button></span>`;
}

export function crearPanelAgrupacion(grid: GridHost, enlaces: EnlacesPanel): HTMLElement {
  const doc = grid.el.ownerDocument;
  const raiz = doc.createElement('div');
  raiz.className = 'iswc-ag-panel-agrupacion';
  const etiqueta = doc.createElement('label');
  etiqueta.className = 'iswc-ag-panel-agrupacion__modo';
  const caja = doc.createElement('input');
  caja.type = 'checkbox';
  caja.checked = enlaces.modoPivote();
  caja.addEventListener('change', () => enlaces.fijarModoPivote(caja.checked));
  etiqueta.append(caja, doc.createTextNode(grid.texto('pivotMode', 'Modo pivote')));
  const zonas = [
    crearZona(grid, 'grupos', grid.texto('rowGroupColumnsEmptyMessage', 'Grupos de fila'), 'mdi:file-tree-outline', enlaces.grupos, enlaces.fijarGrupos),
    crearZona(grid, 'valores', grid.texto('valueColumns', 'Valores'), 'mdi:sigma', enlaces.valores, enlaces.fijarValores),
    crearZona(grid, 'pivotes', grid.texto('pivotColumns', 'Etiquetas de columna'), 'mdi:table-pivot', enlaces.pivotes, enlaces.fijarPivotes),
  ];
  raiz.append(etiqueta, ...zonas);
  (raiz as HTMLElement & { refrescar?: () => void }).refrescar = () => {
    caja.checked = enlaces.modoPivote();
    for (const z of zonas) (z as HTMLElement & { pintar?: () => void }).pintar?.();
  };
  return raiz;
}
