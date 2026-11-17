// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/grid-modales — Los tres modales del grid: columnas, filtros y exportar.
 *
 *   columnas  qué columnas se ven y en qué orden (se puede arrastrar para reordenar).
 *   filtros   las reglas activas: búsqueda rápida, agrupación y filtros por columna.
 *   exportar  de qué página a qué página, con qué columnas, con qué filtros y con qué orden.
 *
 * Por defecto, los tres modales vienen con lo que ya está aplicado en la tabla; el
 * usuario puede cambiar cualquiera de esos campos antes de exportar.
 */

import { TEXTOS } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/filtros-textos.js';
import { crearEstilos, entradasLibro, hojaAXml, libroABlob, nombreHoja } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/filas-exportar-excel.js';
import type { CtxModales, DatosExportacion, ExportadorGrid } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/grid-modales.schemas.js';
import type { ColExport, FilaExport } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/filas.schemas.js';

/** Escapa un valor para CSV (con comillas si hace falta). */
function aCsv(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** El exportador de CSV que trae el grid. */
export const EXPORTADOR_CSV: ExportadorGrid = {
  id: 'csv',
  etiqueta: 'Exportar CSV',
  extension: 'csv',
  construir: (datos) => {
    const lineas = [datos.columnas.map((c) => aCsv(c.headerName)).join(',')];
    for (const fila of datos.filas) lineas.push(fila.map((v) => aCsv(v)).join(','));
    return new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  },
};

/** El exportador de Excel que trae el grid: un .xlsx real, con el mismo escritor que `exportDataAsExcel` del api. */
export const EXPORTADOR_XLSX: ExportadorGrid = {
  id: 'xlsx',
  etiqueta: 'Exportar Excel',
  extension: 'xlsx',
  construir: (datos) => {
    const columnas: ColExport[] = datos.columnas.map((c) => ({ colId: c.colId, encabezado: c.headerName, ancho: 120, tipo: 'texto', fijada: false }));
    const filas: FilaExport[] = datos.filas.map((valores) => ({ tipo: 'hoja', nivel: 0, valores, textos: valores.map((v) => String(v ?? '')), contraida: false }));
    const estilos = crearEstilos();
    const hoja = hojaAXml({ nombre: nombreHoja('Datos', 0), columnas, filas, antes: [], despues: [], opciones: {} }, estilos.indice);
    return libroABlob(entradasLibro([nombreHoja('Datos', 0)], [hoja], estilos.xml));
  },
};

/** Compara dos valores para ordenar (números, fechas o texto). */
function comparar(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const na = typeof a === 'number' ? a : Number(a);
  const nb = typeof b === 'number' ? b : Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
  return String(a).localeCompare(String(b), 'es');
}

/** Los operadores que tiene sentido para el tipo de la columna. */
function opsDe(tipo: string): { v: string; t: string }[] {
  if (tipo === 'number') {
    return [
      { v: 'eq', t: 'es' }, { v: 'neq', t: 'no es' }, { v: 'gt', t: 'mayor que' },
      { v: 'gte', t: 'mayor o igual' }, { v: 'lt', t: 'menor que' }, { v: 'lte', t: 'menor o igual' },
    ];
  }
  if (tipo === 'date') return [{ v: 'eq', t: 'es' }, { v: 'before', t: 'antes de' }, { v: 'after', t: 'después de' }];
  return [
    { v: 'contains', t: 'contiene' }, { v: 'notContains', t: 'no contiene' }, { v: 'equals', t: 'es' },
    { v: 'notEqual', t: 'no es' }, { v: 'startsWith', t: 'empieza por' }, { v: 'endsWith', t: 'termina en' },
  ];
}

/** Los modales del grid. */
export class ModalesGrid {
  #ctx: CtxModales;
  /** Borrador de la exportación: columnas (en orden), rango de páginas y orden. */
  #cols: string[] = [];
  #desde = 1;
  #hasta = 1;
  #sortCol = '';
  #sortDir: 'asc' | 'desc' = 'asc';
  /** La columna que se está arrastrando (id). */
  #arrastrando = '';

  constructor(ctx: CtxModales) {
    this.#ctx = ctx;
  }

  /** Un texto del grid por su clave (el español de TEXTOS si la app no lo cambia). */
  #t(clave: string): string {
    const porDefecto = TEXTOS[clave] ?? clave;
    return this.#ctx.texto ? this.#ctx.texto(clave, porDefecto) : porDefecto;
  }

  /** El diálogo pedido (columnas, filtros o exportar), si está en la plantilla. */
  #dlg(nombre: string): (HTMLElement & { open: boolean }) | null {
    return this.#ctx.root.querySelector('[data-dlg="' + nombre + '"]') as (HTMLElement & { open: boolean }) | null;
  }

  /** Escapa un texto para poder meterlo en el HTML de un modal. */
  #esc(s: unknown): string {
    const mapa: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s ?? '').replace(/[&<>"']/g, (c) => mapa[c] ?? c);
  }

  /** Las columnas de datos (sin la de selección ni las internas del grid). */
  #columnas(): any[] {
    const api = this.#ctx.api();
    const cols = api ? api.getState().columns : [];
    return cols.filter((c: any) => c.colId !== '__seleccion' && c.colId !== '__menu' && c.colId !== '__numeroFila');
  }

  /** Los exportadores que ofrece el grid (el CSV siempre está). */
  #exportadores(): ExportadorGrid[] {
    const propios = this.#ctx.exportadores?.() ?? [];
    const lista = [EXPORTADOR_CSV, EXPORTADOR_XLSX, ...propios.filter((e) => e && e.id !== 'csv' && e.id !== 'xlsx')];
    return lista;
  }

  /** Abre el modal de columnas. */
  abrirCols(): void {
    const dlg = this.#dlg('cols');
    if (!dlg) return;
    this.#pintarCols(dlg);
    dlg.open = true;
  }

  /** Abre el modal de filtros. */
  abrirFiltros(): void {
    const dlg = this.#dlg('filtros');
    if (!dlg) return;
    this.#pintarFiltros(dlg);
    dlg.open = true;
  }

  /** Abre el modal de exportar (con todo prellenado desde la tabla). */
  abrirExport(): void {
    const dlg = this.#dlg('export');
    const api = this.#ctx.api();
    if (!dlg || !api) return;
    const state = api.getState();
    const cols = this.#columnas();
    this.#cols = cols.filter((c: any) => !c.hide).map((c: any) => c.colId);
    if (!this.#cols.length) this.#cols = cols.map((c: any) => c.colId);
    this.#desde = state.page + 1;
    this.#hasta = state.page + 1;
    const orden = (state.sortModel ?? [])[0];
    this.#sortCol = orden?.colId ?? '';
    this.#sortDir = orden?.dir === 'desc' ? 'desc' : 'asc';
    this.#pintarExport(dlg);
    dlg.open = true;
  }

  /** El cuerpo del modal de columnas. */
  #pintarCols(dlg: HTMLElement): void {
    const body = dlg.querySelector('[data-dlg-body="cols"]');
    if (!body) return;
    const cols = this.#columnas();
    if (!cols.length) {
      body.innerHTML = '<p class="mim-dg__dlg-empty">No hay columnas.</p>';
      return;
    }
    body.innerHTML = cols.map((c: any, i: number) => [
      '<div class="mim-dg__dlg-row" data-drag-row="' + this.#esc(c.colId) + '">',
      '<span class="mim-dg__dlg-grip" draggable="true" data-drag="' + this.#esc(c.colId) + '" title="' + this.#t('modalArrastrar') + '" aria-label="' + this.#t('modalArrastrar') + '"><iswc-icon icon="mdi:drag"></iswc-icon></span>',
      '<span class="mim-dg__dlg-label">',
      '<iswc-check-icon-button data-act="col-vis" data-col="' + this.#esc(c.colId) + '"' + (c.hide ? '' : ' checked') + ' icon="mdi:eye-off-outline" checked-icon="mdi:eye" label="Oculta" checked-label="Visible"></iswc-check-icon-button>',
      '<span class="mim-dg__dlg-name">' + this.#esc(c.headerName) + '</span>',
      '</span>',
      '<span class="mim-dg__dlg-tools">',
      '<button type="button" class="mim-dg__dlg-btn" data-act="col-up" data-col="' + this.#esc(c.colId) + '"' + (i === 0 ? ' disabled' : '') + ' title="' + this.#t('modalSubir') + '" aria-label="' + this.#t('modalSubir') + '"><iswc-icon icon="mdi:chevron-up"></iswc-icon></button>',
      '<button type="button" class="mim-dg__dlg-btn" data-act="col-down" data-col="' + this.#esc(c.colId) + '"' + (i === cols.length - 1 ? ' disabled' : '') + ' title="' + this.#t('modalBajar') + '" aria-label="' + this.#t('modalBajar') + '"><iswc-icon icon="mdi:chevron-down"></iswc-icon></button>',
      '</span>',
      '</div>',
    ].join('')).join('');
  }

  /** Las reglas activas (búsqueda, agrupación y filtros por columna), en HTML. */
  #reglasHTML(): string {
    const api = this.#ctx.api();
    const state = api ? api.getState() : { rowGroupCols: [], filterModel: {} };
    const cols = this.#columnas();
    const qf = this.#ctx.root.querySelector('.mim-dg__quick-input') as HTMLInputElement | null;
    const texto = qf?.value ?? '';
    const filas: string[] = [];
    if (texto) {
      filas.push([
        '<div class="mim-dg__dlg-row"><span class="mim-dg__dlg-label">Búsqueda rápida: <b>' + this.#esc(texto) + '</b></span>',
        '<button type="button" class="mim-dg__dlg-btn" data-act="qf-clear" title="' + this.#t('modalQuitar') + '" aria-label="' + this.#t('modalQuitar') + '"><iswc-icon icon="mdi:close"></iswc-icon></button></div>',
      ].join(''));
    }
    for (const colId of state.rowGroupCols ?? []) {
      const col = cols.find((c: any) => c.colId === colId);
      filas.push([
        '<div class="mim-dg__dlg-row"><span class="mim-dg__dlg-label">Agrupar por: <b>' + this.#esc(col?.headerName ?? colId) + '</b></span>',
        '<button type="button" class="mim-dg__dlg-btn" data-act="ungroup" data-col="' + this.#esc(colId) + '" title="' + this.#t('modalQuitar') + '" aria-label="' + this.#t('modalQuitar') + '"><iswc-icon icon="mdi:close"></iswc-icon></button></div>',
      ].join(''));
    }
    for (const [colId, filtro] of Object.entries(state.filterModel ?? {})) {
      const col = cols.find((c: any) => c.colId === colId);
      const op = (filtro as any)?.op ?? '';
      const valor = (filtro as any)?.value ?? '';
      filas.push([
        '<div class="mim-dg__dlg-row"><span class="mim-dg__dlg-label">Filtro: <b>' + this.#esc(col?.headerName ?? colId) + '</b> ' + this.#esc(op) + ' ' + this.#esc(valor) + '</span>',
        '<button type="button" class="mim-dg__dlg-btn" data-act="clear-filter" data-col="' + this.#esc(colId) + '" title="' + this.#t('modalQuitar') + '" aria-label="' + this.#t('modalQuitar') + '"><iswc-icon icon="mdi:close"></iswc-icon></button></div>',
      ].join(''));
    }
    return filas.length ? filas.join('') : '<p class="mim-dg__dlg-empty">Sin reglas: se ve todo.</p>';
  }

  /** El cuerpo del modal de filtros: las reglas activas y el alta de una nueva. */
  #pintarFiltros(dlg: HTMLElement): void {
    const body = dlg.querySelector('[data-dlg-body="filtros"]');
    if (!body) return;
    const cols = this.#columnas();
    const ops = cols.length ? opsDe(String(cols[0].type ?? '')) : [];
    body.innerHTML = [
      '<div class="mim-dg__dlg-sec">Reglas activas</div>',
      '<div data-reglas>' + this.#reglasHTML() + '</div>',
      '<div class="mim-dg__dlg-sec">Añadir un filtro</div>',
      '<div class="mim-dg__dlg-add">',
      '<select class="mim-dg__dlg-select" data-add="col" aria-label="' + this.#t('modalColumna') + '">' +
        cols.map((c: any) => '<option value="' + this.#esc(c.colId) + '">' + this.#esc(c.headerName) + '</option>').join('') +
        '</select>',
      '<select class="mim-dg__dlg-select" data-add="op" aria-label="' + this.#t('modalCondicion') + '">' +
        ops.map((o) => '<option value="' + o.v + '">' + o.t + '</option>').join('') +
        '</select>',
      '<input class="mim-dg__dlg-input" type="text" data-add="value" placeholder="valor" aria-label="' + this.#t('modalValor') + '">',
      '<button type="button" class="mim-dg__dlg-btn mim-dg__dlg-btn-primary" data-act="add-filter">Añadir</button>',
      '</div>',
      '<p class="mim-dg__dlg-hint">Tip: arrastra una columna del header a la fila del buscador para agrupar.</p>',
    ].join('');
  }

  /** El cuerpo del modal de exportar. */
  #pintarExport(dlg: HTMLElement): void {
    const body = dlg.querySelector('[data-dlg-body="export"]');
    const api = this.#ctx.api();
    if (!body || !api) return;
    const state = api.getState();
    const cols = this.#columnas();
    const paginas = Math.max(1, Math.ceil((state.displayRows?.length ?? 0) / Math.max(1, state.pageSize)));
    const opciones = cols.map((c: any) =>
      '<option value="' + this.#esc(c.colId) + '"' + (c.colId === this.#sortCol ? ' selected' : '') + '>' + this.#esc(c.headerName) + '</option>',
    ).join('');
    body.innerHTML = [
      '<div class="mim-dg__dlg-sec">Páginas</div>',
      '<div class="mim-dg__dlg-add">',
      '<label class="mim-dg__dlg-label">De <input class="mim-dg__dlg-input mim-dg__dlg-num" type="number" min="1" max="' + paginas + '" data-export="desde" value="' + this.#desde + '"></label>',
      '<label class="mim-dg__dlg-label">a <input class="mim-dg__dlg-input mim-dg__dlg-num" type="number" min="1" max="' + paginas + '" data-export="hasta" value="' + this.#hasta + '"></label>',
      '<span class="mim-dg__dlg-hint">de ' + paginas + ' página(s)</span>',
      '</div>',
      '<div class="mim-dg__dlg-sec">Columnas (visibles y orden)</div>',
      '<div data-export-cols>' + this.#listaColsExport() + '</div>',
      '<div class="mim-dg__dlg-sec">Filtros aplicados</div>',
      '<div data-reglas>' + this.#reglasHTML() + '</div>',
      '<div class="mim-dg__dlg-sec">Orden</div>',
      '<div class="mim-dg__dlg-add">',
      '<select class="mim-dg__dlg-select" data-export="sort-col" aria-label="' + this.#t('modalColumnaOrden') + '"><option value="">— sin orden —</option>' + opciones + '</select>',
      '<select class="mim-dg__dlg-select" data-export="sort-dir" aria-label="' + this.#t('modalSentidoOrden') + '">',
      '<option value="asc"' + (this.#sortDir === 'asc' ? ' selected' : '') + '>Ascendente</option>',
      '<option value="desc"' + (this.#sortDir === 'desc' ? ' selected' : '') + '>Descendente</option>',
      '</select>',
      '</div>',
    ].join('');
    this.#pintarBotonesExport(dlg);
  }

  /** Los botones del pie del modal de exportar: uno por exportador. */
  #pintarBotonesExport(dlg: HTMLElement): void {
    const pie = dlg.querySelector('[slot="footer"]');
    if (!pie) return;
    const botones = this.#exportadores().map((e) =>
      '<iswc-button color="brand" variant="filled" data-act="export-go" data-exp="' + this.#esc(e.id) + '">' + this.#esc(e.etiqueta) + '</iswc-button>',
    ).join('');
    pie.innerHTML = '<iswc-button variant="plain" data-dialog="close">Cancelar</iswc-button>' + botones;
  }

  /** La lista de columnas del modal de exportar (borrador: no cambia la tabla). */
  #listaColsExport(): string {
    const cols = this.#columnas();
    const orden = this.#listaVisual();
    return orden.map((colId, i) => {
      const col = cols.find((c: any) => c.colId === colId);
      const elegida = this.#cols.includes(colId);
      return [
        '<div class="mim-dg__dlg-row" data-drag-row="' + this.#esc(colId) + '">',
        '<span class="mim-dg__dlg-grip" draggable="true" data-drag="' + this.#esc(colId) + '" title="' + this.#t('modalArrastrar') + '" aria-label="' + this.#t('modalArrastrar') + '"><iswc-icon icon="mdi:drag"></iswc-icon></span>',
        '<span class="mim-dg__dlg-label">',
        '<iswc-check-icon-button data-act="exp-vis" data-col="' + this.#esc(colId) + '"' + (elegida ? ' checked' : '') + ' icon="mdi:checkbox-blank-outline" checked-icon="mdi:checkbox-marked" label="Incluir" checked-label="Incluida"></iswc-check-icon-button>',
        '<span class="mim-dg__dlg-name">' + this.#esc(col?.headerName ?? colId) + '</span>',
        '</span>',
        '<span class="mim-dg__dlg-tools">',
        '<button type="button" class="mim-dg__dlg-btn" data-act="exp-up" data-col="' + this.#esc(colId) + '"' + (i === 0 ? ' disabled' : '') + ' title="' + this.#t('modalSubir') + '" aria-label="' + this.#t('modalSubir') + '"><iswc-icon icon="mdi:chevron-up"></iswc-icon></button>',
        '<button type="button" class="mim-dg__dlg-btn" data-act="exp-down" data-col="' + this.#esc(colId) + '"' + (i === orden.length - 1 ? ' disabled' : '') + ' title="' + this.#t('modalBajar') + '" aria-label="' + this.#t('modalBajar') + '"><iswc-icon icon="mdi:chevron-down"></iswc-icon></button>',
        '</span>',
        '</div>',
      ].join('');
    }).join('');
  }

  /** El orden visual de las columnas del modal de exportar: primero las elegidas. */
  #listaVisual(): string[] {
    const cols = this.#columnas();
    const elegidas = this.#cols;
    return [...elegidas, ...cols.filter((c: any) => !elegidas.includes(c.colId)).map((c: any) => c.colId)];
  }

  /** Un clic dentro de un modal (columnas, filtros o exportar). */
  click(nombre: string, e: Event): void {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const btn = target.closest('[data-act]');
    if (!(btn instanceof HTMLElement)) return;
    const act = btn.dataset['act'] ?? '';
    const colId = btn.dataset['col'] ?? '';
    const api = this.#ctx.api();
    if (!api) return;
    if (act === 'col-up' || act === 'col-down') {
      const cols = this.#columnas();
      const i = cols.findIndex((c: any) => c.colId === colId);
      const j = act === 'col-up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= cols.length) return;
      api.reorderColumn(colId, j);
      this.#pintarModal(nombre);
      return;
    }
    if (act === 'qf-clear') {
      const input = this.#ctx.root.querySelector('.mim-dg__quick-input') as HTMLInputElement | null;
      if (input) input.value = '';
      api.setQuickFilter('');
      this.#pintarModal(nombre);
      return;
    }
    if (act === 'ungroup') {
      api.removeRowGroupCol(colId);
      this.#pintarModal(nombre);
      return;
    }
    if (act === 'clear-filter') {
      api.setFilter(colId, null);
      this.#pintarModal(nombre);
      return;
    }
    if (act === 'add-filter') {
      const dlg = this.#dlg('filtros');
      const col = dlg?.querySelector('[data-add="col"]') as HTMLSelectElement | null;
      const op = dlg?.querySelector('[data-add="op"]') as HTMLSelectElement | null;
      const valor = dlg?.querySelector('[data-add="value"]') as HTMLInputElement | null;
      if (!col?.value) return;
      // El filtro lleva su tipo (discrimina el motor: texto, número o fecha).
      const def = this.#columnas().find((c: any) => c.colId === col.value);
      const tipo = String(def?.type ?? 'text');
      const type = tipo === 'number' ? 'number' : (tipo === 'date' || tipo === 'dateTime') ? 'date' : 'text';
      api.setFilter(col.value, { type, op: op?.value ?? 'contains', value: valor?.value ?? '' });
      if (valor) valor.value = '';
      this.#pintarModal(nombre);
      return;
    }
    if (act === 'exp-up' || act === 'exp-down') {
      const i = this.#cols.indexOf(colId);
      if (i < 0) return;
      const j = act === 'exp-up' ? i - 1 : i + 1;
      if (j < 0 || j >= this.#cols.length) return;
      const arr = this.#cols.slice();
      arr.splice(i, 1);
      arr.splice(j, 0, colId);
      this.#cols = arr;
      this.#pintarModal(nombre);
      return;
    }
    if (act === 'export-go') {
      this.exportar(btn.dataset['exp'] ?? 'csv');
      const dlg = this.#dlg('export');
      if (dlg) dlg.open = false;
    }
  }

  /** Un cambio dentro de un modal (iconos de estado, selects y números). */
  change(nombre: string, e: Event): void {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const el = target.closest('[data-act], [data-add], [data-export]') as HTMLElement | null;
    if (!el) return;
    const act = el.dataset['act'] ?? '';
    const add = el.dataset['add'] ?? '';
    const exp = el.dataset['export'] ?? '';
    const api = this.#ctx.api();
    if (!api) return;
    const marcado = (el as any).checked === true;
    if (act === 'col-vis') {
      const colId = el.dataset['col'] ?? '';
      api.hideColumn(colId, !marcado);
      return;
    }
    if (act === 'exp-vis') {
      const colId = el.dataset['col'] ?? '';
      if (marcado && !this.#cols.includes(colId)) this.#cols = [...this.#cols, colId];
      if (!marcado) this.#cols = this.#cols.filter((c) => c !== colId);
      return;
    }
    if (add === 'col') {
      // Al cambiar de columna, la lista de condiciones cambia (texto, número o fecha).
      const dlg = this.#dlg('filtros');
      const opSel = dlg?.querySelector('[data-add="op"]') as HTMLSelectElement | null;
      const col = this.#columnas().find((c: any) => c.colId === (el as HTMLSelectElement).value);
      if (!opSel || !col) return;
      opSel.innerHTML = opsDe(String(col.type ?? '')).map((o) => '<option value="' + o.v + '">' + o.t + '</option>').join('');
      return;
    }
    if (exp === 'desde') this.#desde = Number((el as HTMLInputElement).value) || 1;
    if (exp === 'hasta') this.#hasta = Number((el as HTMLInputElement).value) || 1;
    if (exp === 'sort-col') this.#sortCol = (el as HTMLSelectElement).value;
    if (exp === 'sort-dir') this.#sortDir = (el as HTMLSelectElement).value === 'desc' ? 'desc' : 'asc';
  }

  /* ── Arrastrar para reordenar ─────────────────────────────────────── */

  /** Empieza el arrastre de una fila del modal. */
  dragStart(nombre: string, e: DragEvent): void {
    const grip = (e.target as Element | null)?.closest?.('[data-drag]') as HTMLElement | null;
    if (!grip) return;
    const id = grip.dataset['drag'] ?? '';
    if (!id) return;
    this.#arrastrando = id;
    const fila = grip.closest('[data-drag-row]') as HTMLElement | null;
    fila?.classList.add('iswc-arrastrando');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      if (fila && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(fila, 16, 16);
    }
  }

  /** Marca dónde caería la fila que se arrastra. */
  dragOver(nombre: string, e: DragEvent): void {
    if (!this.#arrastrando) return;
    const fila = (e.target as Element | null)?.closest?.('[data-drag-row]') as HTMLElement | null;
    this.#limpiarMarcas();
    if (!fila || fila.dataset['dragRow'] === this.#arrastrando) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const r = fila.getBoundingClientRect();
    fila.classList.add(e.clientY > r.top + r.height / 2 ? 'iswc-soltar-despues' : 'iswc-soltar-antes');
  }

  /** Suelta la fila: la deja en el lugar marcado. */
  drop(nombre: string, e: DragEvent): void {
    const id = this.#arrastrando;
    const fila = (e.target as Element | null)?.closest?.('[data-drag-row]') as HTMLElement | null;
    const despues = fila?.classList.contains('iswc-soltar-despues') ?? false;
    this.#arrastrando = '';
    this.#limpiarMarcas();
    if (!id || !fila) return;
    const destino = fila.dataset['dragRow'] ?? '';
    if (!destino || destino === id) return;
    e.preventDefault();
    if (nombre === 'export') this.#moverEnBorrador(id, destino, despues);
    else this.#moverColumna(id, destino, despues);
    this.#pintarModal(nombre);
  }

  /** Se acabó el arrastre (se soltó o se canceló). */
  dragEnd(): void {
    this.#arrastrando = '';
    this.#limpiarMarcas();
  }

  /** Quita las marcas de soltar. */
  #limpiarMarcas(): void {
    for (const el of this.#ctx.root.querySelectorAll('.iswc-soltar-antes, .iswc-soltar-despues, .iswc-arrastrando')) {
      el.classList.remove('iswc-soltar-antes', 'iswc-soltar-despues', 'iswc-arrastrando');
    }
  }

  /** Mueve una columna del grid a la posición de otra (arrastrando). */
  #moverColumna(id: string, destino: string, despues: boolean): void {
    const api = this.#ctx.api();
    if (!api) return;
    const todas = api.getState().columns ?? [];
    const ids = this.#columnas().map((c: any) => c.colId);
    const sin = ids.filter((x) => x !== id);
    const i = sin.indexOf(destino);
    if (i < 0) return;
    sin.splice(despues ? i + 1 : i, 0, id);
    const p = sin.indexOf(id);
    const resto = todas.filter((c: any) => c.colId !== id);
    const previo = p > 0 ? sin[p - 1] : '';
    const siguiente = sin[p + 1] ?? '';
    const toIndex = previo
      ? resto.findIndex((c: any) => c.colId === previo) + 1
      : (siguiente ? resto.findIndex((c: any) => c.colId === siguiente) : resto.length);
    if (toIndex < 0) return;
    api.reorderColumn(id, toIndex);
  }

  /** Mueve una columna en el borrador del modal de exportar. */
  #moverEnBorrador(id: string, destino: string, despues: boolean): void {
    const visual = this.#listaVisual();
    const sin = visual.filter((x) => x !== id);
    const i = sin.indexOf(destino);
    if (i < 0) return;
    sin.splice(despues ? i + 1 : i, 0, id);
    // La que se arrastra queda incluida en la exportación.
    const incluidas = new Set([...this.#cols, id]);
    this.#cols = sin.filter((x) => incluidas.has(x));
  }

  /** Repinta el cuerpo del modal que se pida (las reglas cambian al quitar o añadir). */
  #pintarModal(nombre: string): void {
    const dlg = this.#dlg(nombre);
    if (!dlg) return;
    if (nombre === 'cols') this.#pintarCols(dlg);
    if (nombre === 'filtros') this.#pintarFiltros(dlg);
    if (nombre === 'export') this.#pintarExport(dlg);
  }

  /** Prepara los datos a exportar: rango de páginas, columnas, filtros y orden. */
  #preparar(): DatosExportacion | null {
    const api = this.#ctx.api();
    if (!api) return null;
    const state = api.getState();
    const cols = this.#columnas();
    const filasApi = api.getDisplayedRows() ?? [];
    const elegidas = this.#cols
      .map((colId) => cols.find((c: any) => c.colId === colId))
      .filter(Boolean);
    if (!elegidas.length) return null;
    const pageSize = Math.max(1, state.pageSize);
    const total = filasApi.length;
    const desde = (Math.max(1, this.#desde) - 1) * pageSize;
    const hasta = Math.min(total, Math.max(1, this.#hasta) * pageSize);
    let filas = filasApi.slice(desde, hasta);
    // El orden pedido; si no hay, el que ya tiene la tabla.
    const colOrden = this.#sortCol || (state.sortModel ?? [])[0]?.colId || '';
    const dir = this.#sortCol ? this.#sortDir : ((state.sortModel ?? [])[0]?.dir === 'desc' ? 'desc' : 'asc');
    if (colOrden) {
      const def = cols.find((c: any) => c.colId === colOrden);
      const campo = def?.field ?? colOrden;
      const signo = dir === 'desc' ? -1 : 1;
      filas = [...filas].sort((a: any, b: any) => signo * comparar(a?.data?.[campo], b?.data?.[campo]));
    }
    return {
      columnas: elegidas.map((c: any) => ({ colId: c.colId, headerName: c.headerName, field: c.field ?? c.colId })),
      filas: filas.map((n: any) => elegidas.map((c: any) => {
        const v = n?.data?.[c.field ?? c.colId];
        return typeof v === 'number' ? v : (v === null || v === undefined ? '' : String(v));
      })),
    };
  }

  /** Exporta con el exportador pedido (CSV de serie; la app puede añadir otros). */
  exportar(expId = 'csv'): void {
    const datos = this.#preparar();
    if (!datos) return;
    const exportador = this.#exportadores().find((e) => e.id === expId) ?? this.#exportadores()[0];
    if (!exportador) return;
    const blob = exportador.construir(datos);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.' + exportador.extension;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
