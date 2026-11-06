/**
 * nucleo/cabecera — Encabezados: grupos de columnas, ordenar, resize, reorder.
 *
 * Tiene pocas celdas, asi que repinta completo por string; las tres secciones
 * replican las del cuerpo (izquierda y derecha sticky).
 */
import type { AccionesCabecera } from './nucleo-cabecera.schemas.js';
import { ANCHO_SELECCION } from './nucleo-motor.js';
import type { ColPos, Motor } from './nucleo-motor.schemas.js';
import type { DefAplanada, GrupoCabecera } from './nucleo-opciones.schemas.js';
import type { GridHost } from './contrato.schemas.js';

const TIPO_ARRASTRE = 'application/x-is-col-id';

function celdaCabecera(h: GridHost, pos: ColPos, a: AccionesCabecera): string {
  const { col } = pos;
  const estado = h.estado();
  const def = h.defDe(col);
  const idx = estado?.sortModel.findIndex((s) => s.colId === col.colId) ?? -1;
  const dir = idx >= 0 ? estado?.sortModel[idx]?.dir ?? null : null;
  const filtrada = estado?.filterModel[col.colId] != null;
  const clases = [
    'mim-dg__head-cell',
    col.align === 'right' ? 'mim-dg__cell--right' : col.align === 'center' ? 'mim-dg__cell--center' : '',
    col.sortable ? 'iswc-sortable' : '',
    dir ? 'iswc-sorted' : '',
    filtrada ? 'iswc-filtered' : '',
    col.pinned ? `iswc-pinned iswc-pinned-${col.pinned}` : '',
    def['wrapHeaderText'] === true ? 'iswc-wrap' : '',
    typeof def['headerClass'] === 'string' ? def['headerClass'] : '',
  ].filter(Boolean).join(' ');
  const movible = def['suppressMovable'] !== true && def['lockPosition'] == null;
  const titulo = typeof def['headerTooltip'] === 'string' ? ` title="${h.escapar(def['headerTooltip'])}"` : '';
  const orden = estado && idx >= 0 && estado.sortModel.length > 1 ? `<span class="mim-dg__sort-order">${idx + 1}</span>` : '';
  const flecha = dir ? `<iswc-icon icon="mdi:arrow-${dir === 'asc' ? 'up' : 'down'}" class="mim-dg__sort-icon"></iswc-icon>` : '';
  const filtro = col.filterType && def['suppressHeaderFilterButton'] !== true
    ? `<button class="mim-dg__head-btn mim-dg__head-filter-btn${filtrada ? ' iswc-active' : ''}" type="button" part="header-filter" aria-label="${h.escapar(h.texto('filterOoo', 'Filtrar'))}" data-act="header-filter" data-col-id="${h.escapar(col.colId)}"><iswc-icon icon="mdi:filter${filtrada ? '' : '-outline'}"></iswc-icon></button>`
    : '';
  const menu = def['suppressHeaderMenuButton'] === true ? '' : `<button class="mim-dg__head-btn mim-dg__head-menu-btn" type="button" part="header-menu" aria-label="${h.escapar(h.texto('columnMenu', 'Menú de columna'))}" data-act="header-menu" data-col-id="${h.escapar(col.colId)}"><iswc-icon icon="mdi:menu"></iswc-icon></button>`;
  const resizer = col.resizable ? `<span class="mim-dg__resizer" role="separator" aria-orientation="vertical" data-col-id="${h.escapar(col.colId)}"></span>` : '';
  const aria = dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none';
  return `<div class="${clases}" part="header-cell" role="columnheader" tabindex="-1" data-col-id="${h.escapar(col.colId)}" aria-colindex="${pos.aria}" aria-sort="${aria}" draggable="${movible}"${titulo} style="inset-inline-start:${pos.x / 16}em;inline-size:${pos.ancho / 16}em"><span class="mim-dg__head-label">${h.escapar(col.headerName)}</span>${orden}${flecha}${filtro}${menu}${resizer}</div>`;
}

function seccion(clase: string, ancho: number, html: string): string {
  return `<div class="mim-dg__sec mim-dg__sec--${clase}" role="presentation" style="inline-size:${ancho / 16}em">${html}</div>`;
}

/** Tramos contiguos del mismo grupo en un nivel; los huecos son tramos vacios. */
function filaGrupos(h: GridHost, lista: ColPos[], nivel: number): string {
  let html = '';
  let i = 0;
  while (i < lista.length) {
    const grupo = (h.defDe(lista[i]!.col) as DefAplanada).__grupos?.[nivel];
    let j = i;
    let ancho = 0;
    while (j < lista.length && (h.defDe(lista[j]!.col) as DefAplanada).__grupos?.[nivel]?.id === grupo?.id) {
      ancho += lista[j]!.ancho;
      j += 1;
    }
    if (grupo) html += `<div class="mim-dg__head-group${grupo.headerClass ? ` ${h.escapar(grupo.headerClass)}` : ''}" part="header-group" role="columnheader" aria-colspan="${j - i}" data-group-id="${h.escapar(grupo.id)}" style="inset-inline-start:${lista[i]!.x / 16}em;inline-size:${ancho / 16}em"><span class="mim-dg__head-label">${h.escapar(grupo.headerName)}</span></div>`;
    i = j;
  }
  return html;
}

export function crearCabecera(h: GridHost, motor: Motor, zona: { grupos: HTMLElement; fila: HTMLElement }, a: AccionesCabecera) {
  function profundidad(): number {
    let n = 0;
    for (const c of motor.columnasOrdenadas()) {
      const g = (h.defDe(c.col) as DefAplanada).__grupos as GrupoCabecera[] | undefined;
      n = Math.max(n, g?.length ?? 0);
    }
    return n;
  }

  function celdaTodo(): string {
    if (!a.columnaSeleccion()) return '';
    const estado = a.estadoTodo();
    const caja = a.multiple() ? `<button class="mim-dg__checkbox mim-dg__checkbox--${estado}" type="button" aria-label="${h.escapar(h.texto('selectAll', 'Seleccionar todo'))}" data-act="toggle-all"></button>` : '';
    return `<div class="mim-dg__head-cell mim-dg__cell--check iswc-pinned iswc-pinned-left" role="columnheader" aria-colindex="1" aria-sort="none" data-col-id="__seleccion" style="inset-inline-start:0;inline-size:${ANCHO_SELECCION / 16}em">${caja}</div>`;
  }

  function pintar(): void {
    const d = motor.diseno();
    const niveles = profundidad();
    let grupos = '';
    for (let n = 0; n < niveles; n++) {
      grupos += `<div class="mim-dg__group-row-head" role="row" aria-rowindex="${n + 1}">${seccion('izq', d.anchoIzq, filaGrupos(h, d.izq, n))}${seccion('centro', d.anchoCentro, filaGrupos(h, d.centro, n))}${seccion('der', d.anchoDer, filaGrupos(h, d.der, n))}</div>`;
    }
    zona.grupos.innerHTML = grupos;
    const celdas = (l: ColPos[]): string => l.map((c) => celdaCabecera(h, c, a)).join('');
    zona.fila.innerHTML = seccion('izq', d.anchoIzq, celdaTodo() + celdas(d.izq)) + seccion('centro', d.anchoCentro, celdas(d.centro)) + seccion('der', d.anchoDer, celdas(d.der));
  }

  function alClic(e: Event): void {
    const ev = e as MouseEvent;
    const t = ev.target as Element;
    const btn = t.closest<HTMLElement>('[data-act]');
    const colId = btn?.dataset['colId'];
    const col = colId ? h.columna(colId) : null;
    if (btn?.dataset['act'] === 'header-menu' && col) {
      ev.stopPropagation();
      a.abrirMenu(col, btn);
      return;
    }
    if (btn?.dataset['act'] === 'header-filter' && col) {
      ev.stopPropagation();
      a.abrirFiltro(col, btn);
      return;
    }
    if (btn?.dataset['act'] === 'toggle-all') {
      ev.stopPropagation();
      a.alternarTodo();
      return;
    }
    if (t.closest('.mim-dg__resizer')) return;
    const head = t.closest<HTMLElement>('.mim-dg__head-cell');
    const id = head?.dataset['colId'];
    if (!id || id === '__seleccion') return;
    h.emitir('columnHeaderClicked', { column: h.columna(id) });
    if (h.columna(id)?.sortable) a.ordenar(id, ev);
  }

  function alPunteroAbajo(e: Event): void {
    const ev = e as PointerEvent;
    const r = (ev.target as Element).closest<HTMLElement>('.mim-dg__resizer');
    const colId = r?.dataset['colId'];
    const col = colId ? h.columna(colId) : null;
    if (!r || !col || !colId) return;
    ev.preventDefault();
    ev.stopPropagation();
    const inicio = ev.clientX;
    const ancho = motor.diseno().izq.concat(motor.diseno().centro, motor.diseno().der).find((c) => c.col.colId === colId)?.ancho ?? col.width;
    const signo = col.pinned === 'right' ? -1 : 1;
    h.emitir('columnResized', { column: col, finished: false, source: 'uiColumnResized' });
    const mover = (m: PointerEvent): void => {
      h.modelo()?.resizeColumn(colId, ancho + signo * (m.clientX - inicio) / motor.pxU());
    };
    const soltar = (): void => {
      removeEventListener('pointermove', mover);
      removeEventListener('pointerup', soltar);
      const w = h.columna(colId)?.width;
      if (w != null) {
        h.emitir('columnResized', { column: h.columna(colId), finished: true, source: 'uiColumnResized' });
        h.el.dispatchEvent(new CustomEvent('iswc-column-resize', { bubbles: true, composed: true, detail: { colId, width: w } }));
      }
    };
    addEventListener('pointermove', mover);
    addEventListener('pointerup', soltar);
  }

  function alDobleClic(e: Event): void {
    const r = (e.target as Element).closest<HTMLElement>('.mim-dg__resizer');
    const colId = r?.dataset['colId'];
    if (!colId) return;
    const auto = (h.el as unknown as { api: { autoSizeColumns: (c: string[]) => void } }).api;
    auto.autoSizeColumns([colId]);
  }

  function alArrastrar(e: Event): void {
    const ev = e as DragEvent;
    const head = (ev.target as Element).closest?.('.mim-dg__head-cell');
    const colId = (head as HTMLElement | null)?.dataset['colId'];
    if (!colId || !ev.dataTransfer) return;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData(TIPO_ARRASTRE, colId);
    ev.dataTransfer.setData('text/plain', colId);
  }

  function alSobre(e: Event): void {
    const ev = e as DragEvent;
    if (!(ev.target as Element).closest?.('.mim-dg__head-cell')) return;
    if (ev.dataTransfer?.types.includes(TIPO_ARRASTRE)) ev.preventDefault();
  }

  function alSoltar(e: Event): void {
    const ev = e as DragEvent;
    const head = (ev.target as Element).closest?.('.mim-dg__head-cell') as HTMLElement | null;
    const origen = ev.dataTransfer?.getData(TIPO_ARRASTRE);
    const destino = head?.dataset['colId'];
    const modelo = h.modelo();
    if (!origen || !destino || origen === destino || !modelo) return;
    ev.preventDefault();
    const toIndex = modelo.getColumns().findIndex((c) => c.colId === destino);
    if (toIndex < 0) return;
    modelo.reorderColumn(origen, toIndex);
    h.emitir('columnMoved', { column: h.columna(origen), toIndex, finished: true });
    h.el.dispatchEvent(new CustomEvent('iswc-column-reorder', { bubbles: true, composed: true, detail: { colId: origen, toIndex } }));
  }

  zona.fila.addEventListener('click', alClic);
  zona.fila.addEventListener('pointerdown', alPunteroAbajo);
  zona.fila.addEventListener('dblclick', alDobleClic);
  zona.fila.addEventListener('dragstart', alArrastrar);
  zona.fila.addEventListener('dragover', alSobre);
  zona.fila.addEventListener('drop', alSoltar);

  return { pintar };
}
