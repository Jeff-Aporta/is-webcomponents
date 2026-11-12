// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filtros-ui-panel-filtros — Filters Tool Panel: un acordeon con el filtro de cada columna.
 */
import { arbolColumnas, filtrarArbolColumnas, hojasColumna } from './filtros-resumen.js';
import { TEXTOS } from './filtros-textos.js';
import { botonIcono, crear, icono, inputDe } from './filtros-ui-controles.js';
import { PanelFiltro } from './filtros-ui-panel-filtro.js';
import type { EntradaPanelFiltros, NodoColumna } from './filtros.schemas.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

export class PanelFiltros {
  el = crear('div', 'iswc-ag-panel iswc-ag-filtros');
  #motor: MotorFiltros;
  #p: Record<string, unknown>;
  #busca = '';
  #lista = crear('div', 'iswc-ag-filtros__lista');
  #entradas = new Map<string, EntradaPanelFiltros>();
  #abiertos = new Set<string>();
  #diseno: NodoColumna[] | null = null;
  #firma = '';

  constructor(motor: MotorFiltros, parametros: Record<string, unknown> = {}) {
    this.#motor = motor;
    this.#p = parametros;
    const barra = crear('div', 'iswc-ag-panel__barra');
    if (parametros['suppressExpandAll'] !== true) barra.append(botonIcono('mdi:unfold-more-horizontal', this.#t('expandAllColumns'), () => this.expandFilters()), botonIcono('mdi:unfold-less-horizontal', this.#t('collapseAllColumns'), () => this.collapseFilters()));
    if (parametros['suppressFilterSearch'] !== true) {
      barra.append(inputDe({ tipo: 'search', placeholder: this.#t('filterColumnsOoo'), aria: this.#t('filterColumnsOoo'), limpiable: true }, (v) => {
        this.#busca = v;
        this.#pintar();
      }));
    }
    if (barra.childElementCount) this.el.append(barra);
    this.el.append(this.#lista);
    this.refrescar();
  }

  #t(clave: string): string {
    return this.#motor.texto(clave, TEXTOS[clave] ?? clave);
  }

  #cols(): ColumnState[] {
    const grid = this.#motor.grid;
    return grid.columnas().filter((c) => this.#motor.tipoDe(c) !== null && grid.defDe(c)['suppressFiltersToolPanel'] !== true);
  }

  #ids(): string[] {
    const cols = this.#cols();
    const validas = new Set(cols.map((c) => c.colId));
    const arbol = this.#diseno ?? cols.map((c) => ({ id: c.colId, etiqueta: c.headerName, colId: c.colId, hijos: [] }));
    const etiquetado = this.#diseno ? this.#conEtiquetas(arbol) : arbol;
    return hojasColumna(filtrarArbolColumnas(etiquetado, this.#busca)).filter((id) => validas.has(id));
  }

  #conEtiquetas(nodos: NodoColumna[]): NodoColumna[] {
    return nodos.map((n) => ({ ...n, etiqueta: n.colId ? this.#motor.grid.columna(n.colId)?.headerName ?? n.etiqueta : n.etiqueta, hijos: this.#conEtiquetas(n.hijos) }));
  }

  #entrada(col: ColumnState): EntradaPanelFiltros {
    const guardada = this.#entradas.get(col.colId);
    if (guardada) return guardada;
    const caja = crear('section', 'iswc-ag-filtros__item');
    const boton = crear('button', 'iswc-ag-filtro__acordeon-boton');
    boton.setAttribute('type', 'button');
    const flecha = icono('mdi:chevron-right');
    const punto = icono('mdi:filter');
    punto.classList.add('iswc-ag-filtros__punto');
    boton.append(flecha, crear('span', 'iswc-ag-filtros__nombre', col.headerName), punto);
    const cuerpo = crear('div', 'iswc-ag-filtros__cuerpo');
    const e: EntradaPanelFiltros = { col, caja, panel: null, cuerpo, flecha, boton, punto };
    boton.addEventListener('click', () => this.#fijarAbierto(e, !this.#abiertos.has(col.colId)));
    caja.append(boton, cuerpo);
    this.#entradas.set(col.colId, e);
    this.#sincronizar(e);
    return e;
  }

  /** El PanelFiltro nace al abrir: leer el set de miles de filas por columna de golpe no escala. */
  #fijarAbierto(e: EntradaPanelFiltros, abierto: boolean): void {
    if (abierto) this.#abiertos.add(e.col.colId);
    else this.#abiertos.delete(e.col.colId);
    if (abierto && !e.panel) {
      e.panel = new PanelFiltro(this.#motor, e.col);
      e.cuerpo.replaceChildren(e.panel.el);
    }
    this.#sincronizar(e);
    if (abierto) e.panel?.alAbrir();
  }

  #sincronizar(e: EntradaPanelFiltros): void {
    const abierto = this.#abiertos.has(e.col.colId);
    e.cuerpo.hidden = !abierto;
    e.boton.setAttribute('aria-expanded', String(abierto));
    e.flecha.setAttribute('icon', abierto ? 'mdi:chevron-down' : 'mdi:chevron-right');
    e.punto.hidden = this.#motor.modeloDe(e.col.colId) === null;
  }

  #pintar(): void {
    const ids = this.#ids();
    if (!ids.length) {
      this.#lista.replaceChildren(crear('div', 'iswc-ag-seccion__vacio', this.#t('noFiltersToolPanel')));
      return;
    }
    const cols = ids.flatMap((id) => this.#motor.grid.columna(id) ?? []);
    this.#lista.replaceChildren(...cols.map((c) => this.#entrada(c).caja));
  }

  refrescar(colIds?: string[]): void {
    const firma = this.#cols().map((c) => `${c.colId}:${c.headerName}`).join('|');
    if (firma !== this.#firma) {
      this.#firma = firma;
      this.#entradas.clear();
      this.#pintar();
    }
    for (const e of this.#entradas.values()) {
      if (colIds && !colIds.includes(e.col.colId)) continue;
      this.#sincronizar(e);
      e.panel?.fijar(this.#motor.modeloDe(e.col.colId));
    }
  }

  /* ── api de instancia ───────────────────────────────────────────────── */

  expandFilters(ids?: string[]): void {
    for (const c of this.#cols()) {
      if (ids && !ids.includes(c.colId)) continue;
      this.#fijarAbierto(this.#entrada(c), true);
    }
  }

  collapseFilters(ids?: string[]): void {
    for (const c of this.#cols()) {
      if (ids && !ids.includes(c.colId)) continue;
      this.#fijarAbierto(this.#entrada(c), false);
    }
  }

  setFilterLayout(defs: unknown[]): void {
    this.#diseno = arbolColumnas(defs);
    this.#pintar();
  }
}
