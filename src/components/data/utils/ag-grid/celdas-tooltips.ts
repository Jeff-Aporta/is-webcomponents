// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/celdas/tooltips — Tooltips de celda y de cabecera.
 *
 * `<iswc-tooltip>` se ancla a un elemento con `for`, uno por disparador; en una
 * grilla virtualizada eso seria una instancia por celda. Aqui hay un solo
 * flotante del host y un listener delegado, con los tokens del kit para verse igual.
 */
import type { Funcion, Reloj, Fase } from './celdas-tooltips.schemas.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ColDefAg, Flotante, GridHost, Rect, RefCelda } from './contrato.schemas.js';
import { escaparHtml } from './celdas-html.js';
import type { ParamsCelda } from './celdas.schemas.js';
import { contextoCelda } from './celdas-contexto.js';
import { leerRuta, paramsCelda } from './celdas-valores.js';

const SHOW_MS = 2000;
const SWITCH_MS = 200;
const HIDE_MS = 10000;
const GRACIA_MS = 300;

/** Contenido segun precedencia de AG: `tooltip`, luego `tooltipValueGetter`, luego `tooltipField`. */
export function contenidoTooltip(def: ColDefAg, params: ParamsCelda): unknown {
  const tooltip = def['tooltip'];
  if (tooltip === false) return undefined;
  if (tooltip === true) return params.valueFormatted ?? params.value;
  if (typeof tooltip === 'function') return (tooltip as Funcion)(params);
  if (tooltip != null) return tooltip;
  const getter = def['tooltipValueGetter'];
  if (typeof getter === 'function') return (getter as Funcion)(params);
  const campo = def['tooltipField'];
  if (typeof campo === 'string') return leerRuta(params.data, campo);
  return undefined;
}

export function contenidoCabecera(def: ColDefAg, params: ParamsCelda): unknown {
  const tooltip = def['headerTooltip'];
  if (tooltip === false || tooltip == null) return undefined;
  if (tooltip === true) return def.headerName ?? def.field;
  if (typeof tooltip === 'function') return (tooltip as Funcion)(params);
  return tooltip;
}

/** Decide cuanto esperar y cuando cerrar. Sin DOM: se prueba con un reloj falso. */
export class AgendaTooltip {
  #fase: Fase = 'oculto';
  #espera: unknown = null;
  #cierre: unknown = null;
  #reloj: Reloj;
  #mostrar: () => void;
  #ocultar: () => void;

  constructor(reloj: Reloj, mostrar: () => void, ocultar: () => void) {
    this.#reloj = reloj;
    this.#mostrar = mostrar;
    this.#ocultar = ocultar;
  }

  get fase(): Fase {
    return this.#fase;
  }

  #limpiar(): void {
    if (this.#espera != null) this.#reloj.cancelar(this.#espera);
    if (this.#cierre != null) this.#reloj.cancelar(this.#cierre);
    this.#espera = null;
    this.#cierre = null;
  }

  /** Entrar a otra celda: con un tooltip ya abierto se usa la espera corta de cambio. */
  entrar(showMs: number, switchMs: number, hideMs: number): void {
    const eraVisible = this.#fase === 'visible';
    this.#limpiar();
    this.#fase = 'esperando';
    this.#espera = this.#reloj.programar(() => {
      this.#espera = null;
      this.#fase = 'visible';
      this.#mostrar();
      if (hideMs > 0) this.#cierre = this.#reloj.programar(() => this.cerrar(), hideMs);
    }, eraVisible ? switchMs : showMs);
  }

  /** Salir de la celda. `graciaMs` deja llegar el puntero al tooltip si es interactivo. */
  salir(graciaMs = 0): void {
    if (this.#fase !== 'visible' || graciaMs <= 0) {
      this.cerrar();
      return;
    }
    if (this.#cierre != null) this.#reloj.cancelar(this.#cierre);
    this.#cierre = this.#reloj.programar(() => this.cerrar(), graciaMs);
  }

  /** El puntero entro al tooltip interactivo: no se cierra mientras siga adentro. */
  sostener(): void {
    if (this.#cierre != null) this.#reloj.cancelar(this.#cierre);
    this.#cierre = null;
  }

  cerrar(): void {
    const eraVisible = this.#fase === 'visible';
    this.#limpiar();
    this.#fase = 'oculto';
    if (eraVisible) this.#ocultar();
  }
}

function esTruncado(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
}

export class TooltipsGrid {
  #grid: GridHost;
  #agenda: AgendaTooltip;
  #flotante: Flotante | null = null;
  #ancla: HTMLElement | null = null;
  #html = '';
  #texto = '';
  #params: ParamsCelda | null = null;
  #raton = { x: 0, y: 0 };

  constructor(grid: GridHost) {
    this.#grid = grid;
    const reloj: Reloj = { programar: (fn, ms) => setTimeout(fn, ms), cancelar: (id) => clearTimeout(id as number) };
    this.#agenda = new AgendaTooltip(reloj, () => this.#abrir(), () => this.#cerrar());
  }

  conectar(): () => void {
    const raiz = this.#grid.shadow;
    const sobre = (e: Event) => this.#alEntrar(e as PointerEvent);
    const fuera = (e: Event) => this.#alSalir(e as PointerEvent);
    const mover = (e: Event) => this.#alMover(e as PointerEvent);
    const tecla = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') this.#agenda.cerrar();
    };
    const bajar = () => this.#agenda.cerrar();
    raiz.addEventListener('pointerover', sobre);
    raiz.addEventListener('pointerout', fuera);
    raiz.addEventListener('pointermove', mover);
    raiz.addEventListener('keydown', tecla);
    raiz.addEventListener('pointerdown', bajar);
    return () => {
      raiz.removeEventListener('pointerover', sobre);
      raiz.removeEventListener('pointerout', fuera);
      raiz.removeEventListener('pointermove', mover);
      raiz.removeEventListener('keydown', tecla);
      raiz.removeEventListener('pointerdown', bajar);
      this.#agenda.cerrar();
    };
  }

  #objetivo(destino: EventTarget | null): HTMLElement | null {
    if (!(destino instanceof Element)) return null;
    if (destino.closest('.iswc-ag-tooltip')) return null;
    return destino.closest<HTMLElement>('[data-col-id]');
  }

  #alEntrar(e: PointerEvent): void {
    this.#raton = { x: e.clientX, y: e.clientY };
    if (e.target instanceof Element && e.target.closest('.iswc-ag-tooltip')) {
      this.#agenda.sostener();
      return;
    }
    const celda = this.#objetivo(e.target);
    if (!celda || celda === this.#ancla) return;
    this.mostrarEn(celda);
  }

  #alSalir(e: PointerEvent): void {
    const celda = this.#objetivo(e.target);
    const interactivo = this.#grid.opcion<boolean>('tooltipInteraction', false);
    if (e.target instanceof Element && e.target.closest('.iswc-ag-tooltip')) {
      this.#agenda.salir(GRACIA_MS);
      return;
    }
    if (!celda || celda !== this.#ancla) return;
    if (this.#objetivo(e.relatedTarget) === celda) return;
    this.#ancla = null;
    this.#agenda.salir(interactivo ? GRACIA_MS : 0);
  }

  #alMover(e: PointerEvent): void {
    this.#raton = { x: e.clientX, y: e.clientY };
    if (this.#agenda.fase === 'visible' && this.#grid.opcion<boolean>('tooltipMouseTrack', false)) this.#flotante?.abrir(this.#rectRaton());
  }

  /** El contrato pide Rect en unidades logicas y relativo a la capa; el raton llega en px de pantalla. */
  #rectRaton(): Rect {
    const capa = this.#grid.capa('rango').getBoundingClientRect();
    const escala = 16 / (Number.parseFloat(getComputedStyle(this.#grid.el).fontSize) || 16);
    return { arriba: (this.#raton.y - capa.top + 14) * escala, izquierda: (this.#raton.x - capa.left + 10) * escala, ancho: 0, alto: 0 };
  }

  #resolver(celda: HTMLElement): { params: ParamsCelda; contenido: unknown; def: ColDefAg } | null {
    const grid = this.#grid;
    const colId = celda.dataset['colId'];
    if (!colId) return null;
    const col = grid.columna(colId);
    if (!col) return null;
    const def = grid.defDe(col);
    const filaId = celda.closest<HTMLElement>('[data-row-id]')?.dataset['rowId'];
    if (filaId == null) {
      const params = this.#paramsCabecera(col, def);
      return { params, contenido: contenidoCabecera(def, params), def };
    }
    const node = grid.nodo(filaId);
    if (!node) return null;
    const params = this.#paramsFila(col, node, celda);
    return { params, contenido: contenidoTooltip(def, params), def };
  }

  #paramsCabecera(col: ColumnState, def: ColDefAg): ParamsCelda {
    const grid = this.#grid;
    return { location: 'header', value: def.headerName, valueFormatted: def.headerName ?? null, data: undefined, node: undefined, colDef: def, column: col, api: grid.modelo(), context: grid.opcion('context') };
  }

  #paramsFila(col: ColumnState, node: RowNode, celda: HTMLElement): ParamsCelda {
    const indice = Number(celda.closest<HTMLElement>('[data-row-index]')?.dataset['rowIndex'] ?? node.index);
    return { ...paramsCelda(contextoCelda(this.#grid, col, node, indice)), location: 'cell' };
  }

  /** Programa el tooltip de `celda`. Tambien lo usa el disparador por foco. */
  mostrarEn(celda: HTMLElement): void {
    const grid = this.#grid;
    if (grid.opcion<boolean>('enableBrowserTooltips', false)) return;
    const r = this.#resolver(celda);
    if (!r || r.contenido == null || r.contenido === '') {
      if (this.#agenda.fase !== 'oculto') this.#agenda.cerrar();
      return;
    }
    if (grid.opcion('tooltipShowMode') === 'whenTruncated' && !esTruncado(celda)) return;
    this.#ancla = celda;
    this.#params = r.params;
    this.#texto = String(r.contenido);
    this.#html = this.#contenidoHtml(r.def, r.params, r.contenido);
    this.#agenda.entrar(grid.opcion('tooltipShowDelay', SHOW_MS), grid.opcion('tooltipSwitchShowDelay', SWITCH_MS), grid.opcion('tooltipHideDelay', HIDE_MS));
  }

  #contenidoHtml(def: ColDefAg, params: ParamsCelda, contenido: unknown): string {
    const componente = def['tooltipComponent'];
    if (typeof componente !== 'function') return escaparHtml(contenido);
    const extra = def['tooltipComponentParams'] as Record<string, unknown> | undefined;
    const salida = (componente as Funcion)({ ...params, ...extra, value: contenido, hideTooltipCallback: () => this.#agenda.cerrar() });
    return typeof salida === 'string' ? salida : escaparHtml(contenido);
  }

  #abrir(): void {
    const grid = this.#grid;
    this.#flotante ??= grid.flotante('tooltip');
    const el = this.#flotante.el;
    el.classList.add('iswc-ag-tooltip');
    el.classList.toggle('iswc-ag-tooltip-interactivo', grid.opcion<boolean>('tooltipInteraction', false));
    el.innerHTML = this.#html;
    const seguir = grid.opcion<boolean>('tooltipMouseTrack', false);
    if (seguir || !this.#ancla) this.#flotante.abrir(this.#rectRaton());
    else this.#flotante.abrir(this.#ancla);
    grid.emitir('tooltipShow', { texto: this.#texto, params: this.#params });
  }

  #cerrar(): void {
    this.#flotante?.cerrar();
    this.#ancla = null;
    this.#grid.emitir('tooltipHide', { params: this.#params });
  }

  ocultar(): void {
    this.#agenda.cerrar();
  }

  /** Disparador por foco (`tooltipTrigger: 'focus'`). */
  alFoco(ref: RefCelda): void {
    const celda = this.#grid.celdaDe(ref);
    if (celda) this.mostrarEn(celda);
  }
}
