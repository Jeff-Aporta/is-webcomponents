/**
 * ag-grid/celdas — Celdas y apariencia de <iswc-ag-grid>: renderers, valores,
 * reglas de estilo, tooltips, flash, alturas de fila y temas.
 *
 * `instalar(grid)` registra los renderers y expone en la api: presentarCelda,
 * presentarFila, flashCells, showTooltip, hideTooltip, resetRowHeights,
 * setRowHeight, onRowHeightChanged, getThemeMetrics. Lo puro se importa tal cual
 * de cada modulo y no exige un grid montado.
 */

import type { ColDefAg, ContextoCelda, Desinstalar, EventoCelda, GridHost, RendererCelda, RendererMontable } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import { AlturasFilas } from './celdas-alturas.js';
import { contextoCelda, pintarCelda, resolverRenderer } from './contexto.js';
import { Destello } from './flash.js';
import { unirClases } from './html.js';
import { clasesCelda, clasesColumna, clasesPosicionFila, estiloCelda, opcionesAClasesFila, opcionesAEstiloFila } from './reglas.js';
import { RENDERERS } from './renderers.js';
import type { AccionCelda, ParamsCelda, ParamsFlash, PresentacionCelda, PresentacionFila } from './schemas.js';
import { AplicadorTema } from './temas/index.js';
import { TooltipsGrid, contenidoTooltip } from './tooltips.js';
import { paramsCelda, textoDeContexto } from './celdas-valores.js';


/** Estos no leen el texto formateado: se ahorran formatear en cada repintado. */
const SIN_TEXTO = new Set<RendererCelda>([RENDERERS['sparkline'] as RendererCelda, RENDERERS['rating'] as RendererCelda, RENDERERS['booleano'] as RendererCelda, RENDERERS['acciones'] as RendererCelda]);

function idColumna(c: unknown): string {
  if (typeof c === 'string') return c;
  const col = c as { colId?: string; getColId?: () => string };
  return col.getColId?.() ?? col.colId ?? '';
}

function requiereParams(def: ColDefAg): boolean {
  return def['cellClass'] != null || def['cellClassRules'] != null || def['cellStyle'] != null;
}

function sinCambio(def: ColDefAg, a: unknown, b: unknown): boolean {
  const iguales = def['equals'];
  if (typeof iguales === 'function') return Boolean(iguales(a, b));
  return Object.is(a, b);
}

/** Destello con la diferencia en la fila de datos, sea por edicion o por transaccion. */
class VigilanteCambios {
  #grid: GridHost;
  #destello: Destello;
  #ultimos = new Map<string, Map<string, unknown>>();

  constructor(grid: GridHost, destello: Destello) {
    this.#grid = grid;
    this.#destello = destello;
  }

  #columnas() {
    const grid = this.#grid;
    return grid.columnas().filter((c) => {
      const def = grid.defDe(c);
      const renderer = def['cellRenderer'];
      return def['enableCellChangeFlash'] === true || renderer === 'animarCambio' || renderer === 'animarDeslizar' || renderer === 'agAnimateShowChangeCellRenderer' || renderer === 'agAnimateSlideCellRenderer';
    });
  }

  comparar(): void {
    const grid = this.#grid;
    const columnas = this.#columnas();
    if (!columnas.length) return;
    // Solo lo visible: fuera de la ventana no hay nada que destellar, y recorrer
    // 100.000 filas en cada tick no es viable. Una fila que entra toma su foto al pintarse.
    const api = (grid.el as unknown as { api?: { getFirstDisplayedRowIndex?: () => number; getLastDisplayedRowIndex?: () => number } }).api;
    const desde = Math.max(0, api?.getFirstDisplayedRowIndex?.() ?? 0);
    const hasta = Math.min(grid.totalFilas(), (api?.getLastDisplayedRowIndex?.() ?? grid.totalFilas()) + 2);
    const cambiadas: Array<[string, string]> = [];
    for (let i = desde; i < hasta; i++) {
      const fila = grid.filaEn(i);
      const node = fila && 'node' in fila ? fila.node : undefined;
      if (!node) continue;
      let previos = this.#ultimos.get(node.id);
      const primera = !previos;
      previos ??= new Map();
      for (const col of columnas) {
        const def = grid.defDe(col);
        const valor = grid.valor(col, node);
        const anterior = previos.get(col.colId);
        if (!primera && previos.has(col.colId) && !sinCambio(def, anterior, valor)) {
          this.notificar(node, col.colId, anterior, valor);
          cambiadas.push([node.id, col.colId]);
        }
        previos.set(col.colId, valor);
      }
      this.#ultimos.set(node.id, previos);
    }
    if (cambiadas.length) grid.refrescarCeldas([...new Set(cambiadas.map((c) => c[0]))], [...new Set(cambiadas.map((c) => c[1]))]);
  }

  /** Un cambio por edicion actualiza la foto para que `comparar` no lo cuente dos veces. */
  alCambiarValor(node: RowNode, colId: string, anterior: unknown, nuevo: unknown): void {
    const grid = this.#grid;
    const col = grid.columna(colId);
    if (!col || !this.#columnas().some((c) => c.colId === colId)) return;
    if (sinCambio(grid.defDe(col), anterior, nuevo)) return;
    let previos = this.#ultimos.get(node.id);
    if (!previos) {
      previos = new Map();
      this.#ultimos.set(node.id, previos);
    }
    previos.set(colId, nuevo);
    this.notificar(node, colId, anterior, nuevo);
    grid.refrescarCeldas([node.id], [colId]);
  }

  notificar(node: RowNode, colId: string, anterior: unknown, nuevo: unknown): void {
    const grid = this.#grid;
    this.#destello.registrarCambio(node.id, colId, anterior, nuevo);
    const col = grid.columna(colId);
    if (!col || grid.defDe(col)['enableCellChangeFlash'] !== true) return;
    const direccional = grid.opcion<boolean>('cellFlashDirectional', false) && typeof anterior === 'number' && typeof nuevo === 'number';
    const direccion = direccional ? ((nuevo as number) >= (anterior as number) ? 'up' : 'down') : undefined;
    this.#destello.destellar([node.id], [colId], grid.opcion('cellFlashDuration', undefined), grid.opcion('cellFadeDuration', undefined), direccion);
  }
}

function conCambio(destello: Destello, ctx: ContextoCelda): ContextoCelda {
  if (!ctx.node) return ctx;
  const cambio = destello.cambioDe(ctx.node.id, ctx.col.colId);
  return cambio ? { ...ctx, params: { ...ctx.params, cambio } } : ctx;
}

/** Suma `cellRendererParams` y el cambio reciente: el host solo llama al renderer con su ctx. */
function envolver(destello: Destello, base: RendererCelda, usaTexto: boolean): RendererCelda {
  return (ctx) => {
    const conTexto = usaTexto ? { ...ctx, texto: textoDeContexto(ctx) } : ctx;
    return pintarCelda(base, conCambio(destello, resolverRenderer(ctx.def, conTexto, () => base)?.ctx ?? conTexto));
  };
}

function alternarCasilla(grid: GridHost, ev: EventoCelda): boolean | void {
  const objetivo = ev.evento.target;
  if (!(objetivo instanceof Element) || !objetivo.closest('.iswc-ag-check-editable') || !ev.node) return;
  grid.fijarValor(ev.node, ev.colId, grid.valor(ev.col, ev.node) !== true, 'edit');
  return true;
}

function dispararAccion(grid: GridHost, ev: EventoCelda): boolean | void {
  const objetivo = ev.evento.target;
  const boton = objetivo instanceof Element ? objetivo.closest<HTMLButtonElement>('.iswc-ag-accion') : null;
  if (!boton || boton.disabled || !ev.node) return;
  const id = boton.dataset['accion'] ?? '';
  const ctx = contextoCelda(grid, ev.col, ev.node, ev.indice);
  const resuelto = resolverRenderer(ctx.def, ctx, (n) => (n ? (RENDERERS[n] as RendererCelda) : undefined));
  const lista = (resuelto?.ctx.params['acciones'] ?? []) as AccionCelda[] | ((p: ParamsCelda) => AccionCelda[]);
  const params = paramsCelda(ctx);
  const acciones = typeof lista === 'function' ? lista(params) : lista;
  const accion = acciones.find((a) => a.id === id);
  if (typeof accion?.onClick === 'function') (accion.onClick as (p: ParamsCelda) => void)(params);
  grid.emitir('cellAction', { accion: id, data: ev.node.data, node: ev.node, colId: ev.colId, rowIndex: ev.indice });
  return true;
}

/** Oculta el logo que no cargo para dejar ver las iniciales. `error` no burbujea: va en captura. */
function vigilarLogos(grid: GridHost): Desinstalar {
  const alError = (e: Event) => {
    if (e.target instanceof HTMLImageElement && e.target.parentElement?.classList.contains('iswc-ag-logo')) e.target.remove();
  };
  grid.shadow.addEventListener('error', alError, true);
  return () => grid.shadow.removeEventListener('error', alError, true);
}

/** `columnHoverHighlight`: una sola regla dinamica, sin tocar cada celda. */
function resaltarColumna(grid: GridHost): Desinstalar {
  const raiz = grid.shadow;
  let estilo: HTMLStyleElement | null = null;
  let actual = '';
  const fijar = (colId: string) => {
    if (colId === actual) return;
    actual = colId;
    if (!estilo) {
      estilo = document.createElement('style');
      raiz.appendChild(estilo);
    }
    estilo.textContent = colId ? `[data-col-id="${CSS.escape(colId)}"]{background-color:var(--iswc-grid-column-hover)}` : '';
  };
  const sobre = (e: Event) => {
    if (!grid.opcion<boolean>('columnHoverHighlight', false)) return;
    const celda = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-col-id]') : null;
    fijar(celda?.dataset['colId'] ?? '');
  };
  const salir = () => fijar('');
  raiz.addEventListener('pointerover', sobre);
  grid.el.addEventListener('pointerleave', salir);
  return () => {
    raiz.removeEventListener('pointerover', sobre);
    grid.el.removeEventListener('pointerleave', salir);
    estilo?.remove();
  };
}

export function instalar(grid: GridHost): Desinstalar {
  const destello = new Destello({
    alVencer: ({ filas, columnas }) => {
      if (filas) grid.refrescarCeldas(filas, columnas ?? undefined);
      else grid.refrescarCeldas();
    },
  });
  const vigilante = new VigilanteCambios(grid, destello);
  const alturas = new AlturasFilas(grid);
  const tema = new AplicadorTema(grid);
  const tooltips = new TooltipsGrid(grid);

  for (const [nombre, renderer] of Object.entries(RENDERERS)) grid.renderer(nombre, envolver(destello, renderer, !SIN_TEXTO.has(renderer)));

  const presentarCelda = (ctx: ContextoCelda): PresentacionCelda => {
    const def = ctx.def;
    const params = requiereParams(def) || grid.opcion<boolean>('enableBrowserTooltips', false) ? paramsCelda(ctx) : null;
    const filaId = ctx.node?.id ?? '';
    const colId = ctx.col.colId;
    const clases = unirClases(clasesColumna(def), params && clasesCelda(def, params), destello.clases(filaId, colId));
    const estilo = (params ? estiloCelda(def, params) : '') + destello.estilo(filaId, colId);
    if (!params || !grid.opcion<boolean>('enableBrowserTooltips', false)) return { clases, estilo };
    const titulo = contenidoTooltip(def, params);
    return titulo == null ? { clases, estilo } : { clases, estilo, titulo: String(titulo) };
  };

  const presentarFila = (node: RowNode, indice: number): PresentacionFila => {
    const params: ParamsCelda = { value: undefined, data: node?.data, node, colDef: undefined, column: undefined, rowIndex: indice, api: grid.modelo(), context: grid.opcion('context') };
    const reglas = opcionesAClasesFila(grid.opcion('rowClass'), grid.opcion('getRowClass'), grid.opcion('rowClassRules'), params);
    const sinHover = grid.opcion<boolean>('suppressRowHoverHighlight', false) && 'iswc-ag-row-sin-hover';
    return { clases: unirClases(clasesPosicionFila(indice, grid.totalFilas()), reglas, sinHover), estilo: opcionesAEstiloFila(grid.opcion('rowStyle'), grid.opcion('getRowStyle'), params) };
  };

  const flashCells = (p: ParamsFlash = {}): void => {
    const filas = p.rowNodes ? p.rowNodes.map((n) => (n as RowNode).id) : null;
    const columnas = p.columns ? p.columns.map(idColumna) : null;
    destello.destellar(filas, columnas, p.flashDuration ?? grid.opcion('cellFlashDuration', undefined), p.fadeDuration ?? grid.opcion('cellFadeDuration', undefined), p.direccion);
    if (filas) grid.refrescarCeldas(filas, columnas ?? undefined);
    else grid.refrescarCeldas(undefined, columnas ?? undefined);
  };

  grid.exponer({
    presentarCelda,
    presentarFila,
    flashCells,
    showTooltip: (ref: { indice: number; colId: string }) => tooltips.alFoco(ref),
    hideTooltip: () => tooltips.ocultar(),
    resetRowHeights: () => alturas.reiniciar(),
    setRowHeight: (node: RowNode, alto: number | null) => alturas.fijar(node.id, alto),
    onRowHeightChanged: () => grid.recomputar('alturas'),
    getThemeMetrics: () => tema.medidas(),
  });

  const limpiezas: Desinstalar[] = [
    tema.conectar(),
    tooltips.conectar(),
    vigilarLogos(grid),
    resaltarColumna(grid),
    grid.celdaClic((ev) => alternarCasilla(grid, ev) ?? dispararAccion(grid, ev)),
    grid.on('cellValueChanged', (d) => {
      const node = d['node'] as RowNode | undefined;
      const colId = (d['colId'] as string | undefined) ?? idColumna(d['column']);
      if (node && colId) vigilante.alCambiarValor(node, colId, d['oldValue'], d['newValue']);
    }),
    grid.on('rowDataUpdated', () => {
      vigilante.comparar();
      alturas.aplicar();
    }),
    grid.on('modelUpdated', () => {
      vigilante.comparar();
      alturas.aplicar();
    }),
    grid.on('pintado', () => {
      vigilante.comparar();
      alturas.programarMedicion();
    }),
    grid.on('cellFocused', (d) => {
      const colId = d['colId'] as string | undefined;
      const indice = d['indice'] as number | undefined;
      if (grid.opcion('tooltipTrigger') === 'focus' && colId != null && indice != null) tooltips.alFoco({ indice, colId });
    }),
  ];

  return () => {
    for (const limpiar of limpiezas) limpiar();
    destello.destruir();
    alturas.destruir();
  };
}

