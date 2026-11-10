// @contexto INDICE.md · src/components/data/README.md
/**
 * ui/flotantes — Fila de filtros flotantes bajo el encabezado y popup del filtro de columna.
 */
import { condicionesDe, esCondicional, resumenCondicion } from './filtros-condiciones.js';
import { TEXTOS } from './filtros-textos.js';
import { botonIcono, crear, inputDe, retardo } from './filtros-ui-controles.js';
import { PanelFiltro } from './filtros-ui-panel-filtro.js';
import type { CeldaFlotante, Condicion, ConValor, ModeloColumna, ModeloMulti, ModeloSet, TipoCondicion } from './filtros.schemas.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Desinstalar, Flotante, GridHost } from './contrato.schemas.js';

/** Popup unico: abrir el de otra columna cierra el anterior. */
export class PopupFiltro {
  #motor: MotorFiltros;
  #flotante: Flotante | null = null;
  #panel: PanelFiltro | null = null;
  #colId = '';

  constructor(motor: MotorFiltros) {
    this.#motor = motor;
  }

  #ancla(colId: string): Element {
    const grid = this.#motor.grid;
    return grid.shadow.querySelector(`[role="columnheader"][data-col-id="${CSS.escape(colId)}"]`) ?? grid.el;
  }

  abrir(colId: string, ancla?: Element): void {
    const col = this.#motor.grid.columna(colId);
    if (!col || !this.#motor.tipoDe(col)) return;
    this.cerrar();
    this.#flotante ??= this.#motor.grid.flotante('filtro');
    this.#colId = colId;
    this.#panel = new PanelFiltro(this.#motor, col, { alCerrar: () => this.cerrar() });
    this.#flotante.el.replaceChildren(this.#panel.el);
    this.#flotante.abrir(ancla ?? this.#ancla(colId));
    this.#panel.alAbrir();
    this.#motor.grid.emitir('filterOpened', { column: col, source: 'COLUMN_MENU', eGui: this.#panel.el });
    this.#motor.grid.emitir('columnMenuVisibleChanged', { visible: true, key: 'columnFilter', column: col });
  }

  cerrar(): void {
    if (!this.#panel) return;
    this.#flotante?.cerrar();
    this.#panel = null;
    this.#motor.grid.emitir('columnMenuVisibleChanged', { visible: false, key: 'columnFilter', column: this.#motor.grid.columna(this.#colId) });
  }

  /** Mantiene el popup al dia si el filtro cambia por fuera (flotante, api). */
  refrescar(colIds: string[]): void {
    if (this.#panel && colIds.includes(this.#colId)) this.#panel.fijar(this.#motor.modeloDe(this.#colId));
  }
}

export class FilaFlotante {
  #motor: MotorFiltros;
  #popup: PopupFiltro;
  #grid: GridHost;
  #fila = crear('div', 'iswc-ag-flotantes');
  #celdas = new Map<string, CeldaFlotante>();
  #firma = '';
  /** Posiciones de la ultima vez que hubo filas: `rectCelda` no responde con cero filas. */
  #rectos = new Map<string, { x: number; ancho: number }>();

  constructor(motor: MotorFiltros, popup: PopupFiltro) {
    this.#motor = motor;
    this.#popup = popup;
    this.#grid = motor.grid;
    this.#fila.setAttribute('role', 'row');
  }

  #conFlotante(col: ColumnState): boolean {
    if (!this.#motor.tipoDe(col)) return false;
    const propio = this.#grid.defDe(col)['floatingFilter'];
    return propio === true || (propio === undefined && this.#grid.opcion('floatingFilters') === true);
  }

  #geometria(col: ColumnState): { x: number; ancho: number } {
    const r = this.#grid.rectCelda({ indice: 0, colId: col.colId });
    if (r) this.#rectos.set(col.colId, { x: r.izquierda, ancho: r.ancho });
    return this.#rectos.get(col.colId) ?? { x: 0, ancho: col.width };
  }

  /** Reconstruye solo si cambian columnas; si no, solo ajusta anchos y valores. */
  pintar(): void {
    const cols = this.#grid.columnas().filter((c) => !c.hide);
    const hay = cols.some((c) => this.#conFlotante(c));
    this.#fila.hidden = !hay;
    if (!hay) {
      this.#fila.remove();
      return;
    }
    if (!this.#fila.isConnected) this.#grid.zona('cabecera').append(this.#fila);
    const orden = [...cols.filter((c) => c.pinned === 'left'), ...cols.filter((c) => !c.pinned), ...cols.filter((c) => c.pinned === 'right')];
    const firma = orden.map((c) => `${c.colId}:${String(c.pinned)}`).join('|');
    if (firma !== this.#firma) {
      this.#firma = firma;
      this.#celdas = new Map(orden.map((c) => [c.colId, this.#celda(c)]));
      this.#fila.replaceChildren(...[...this.#celdas.values()].map((c) => c.el));
    }
    let derecha = orden.filter((c) => c.pinned === 'right').reduce((s, c) => s + this.#geometria(c).ancho, 0);
    // La columna de seleccion del host no es de usuario: se reserva su espacio.
    const seleccion = this.#grid.shadow.querySelector('.mim-dg__header-row .mim-dg__cell--check') ? 44 : 0;
    this.#fila.style.paddingInlineStart = this.#grid.em(seleccion);
    let izquierda = seleccion;
    let total = seleccion;
    for (const col of orden) {
      const celda = this.#celdas.get(col.colId) as CeldaFlotante;
      const { ancho } = this.#geometria(col);
      total += ancho;
      celda.el.style.inlineSize = this.#grid.em(ancho);
      if (col.pinned === 'left') {
        celda.el.style.insetInlineStart = this.#grid.em(izquierda);
        izquierda += ancho;
      }
      if (col.pinned === 'right') {
        derecha -= ancho;
        celda.el.style.insetInlineEnd = this.#grid.em(derecha);
      }
    }
    this.#fila.style.inlineSize = this.#grid.em(total);
    this.refrescar();
  }

  #celda(col: ColumnState): CeldaFlotante {
    const el = crear('div', 'iswc-ag-flotantes__celda');
    if (col.pinned) el.classList.add('iswc-ag-flotantes__celda--fija');
    el.setAttribute('role', 'columnheader');
    if (!this.#conFlotante(col)) return { col, el, entrada: null };
    const entrada = this.#entrada(col);
    el.append(entrada);
    if (this.#grid.defDe(col)['suppressFloatingFilterButton'] !== true) {
      el.append(botonIcono('mdi:filter-outline', this.#motor.texto('ariaColumnFilter', TEXTOS['ariaColumnFilter'] as string), () => this.#popup.abrir(col.colId, el)));
    }
    return { col, el, entrada };
  }

  #entrada(col: ColumnState): ConValor {
    const tipo = this.#motor.tipoDe(col);
    const editable = tipo !== null && esCondicional(tipo);
    const debounce = retardo(typeof this.#motor.paramsDe(col)['debounceMs'] === 'number' ? this.#motor.paramsDe(col)['debounceMs'] as number : 500);
    const tipoHtml = tipo === 'date' ? 'date' : tipo === 'number' ? 'number' : 'text';
    return inputDe({ tipo: tipoHtml, aria: `${this.#motor.texto('ariaColumnFilter', TEXTOS['ariaColumnFilter'] as string)} ${col.headerName}`, soloLectura: !editable }, (v) => {
      if (this.#soloLectura(col)) return;
      debounce(() => this.#escribir(col, v));
    });
  }

  /** Solo se escribe sobre una condicion simple con una entrada; lo demas se edita en el popup. */
  #soloLectura(col: ColumnState): boolean {
    const m = this.#motor.modeloDe(col.colId);
    const conds = condicionesDe(m);
    return conds.length > 1 || conds[0]?.type === 'inRange' || conds[0]?.type === 'blank' || conds[0]?.type === 'notBlank';
  }

  #escribir(col: ColumnState, v: string): void {
    const tipo = this.#motor.tipoDe(col) as TipoCondicion;
    if (v === '') {
      this.#motor.setColumna(col.colId, null);
      return;
    }
    const previa = condicionesDe(this.#motor.modeloDe(col.colId))[0];
    const type = previa?.type ?? (tipo === 'text' ? 'contains' : 'equals');
    if (tipo === 'date') this.#motor.setColumna(col.colId, { filterType: 'date', type, dateFrom: v, dateTo: null });
    else if (tipo === 'number') this.#motor.setColumna(col.colId, { filterType: 'number', type, filter: Number(v) });
    else this.#motor.setColumna(col.colId, { filterType: 'text', type, filter: v });
  }

  #resumen(col: ColumnState, modelo: ModeloColumna | null): string {
    if (!modelo) return '';
    const tipo = (modelo as { filterType?: string }).filterType ?? this.#motor.tipoDe(col);
    if (tipo === 'set') return this.#resumenSet(modelo as ModeloSet);
    if (tipo === 'multi') {
      const activo = (modelo as ModeloMulti).filterModels.filter(Boolean).pop() as ModeloColumna | undefined;
      return activo ? this.#resumen(col, activo) : '';
    }
    const etiqueta = (c: string): string => this.#motor.texto(c, TEXTOS[c] ?? c);
    const conds = condicionesDe(modelo);
    return conds.map((c: Condicion) => resumenCondicion(tipo as TipoCondicion, c, etiqueta)).join(` ${etiqueta((modelo as { operator?: string }).operator === 'OR' ? 'orCondition' : 'andCondition')} `);
  }

  #resumenSet(m: ModeloSet): string {
    const nombres = m.values.map((v) => v ?? this.#motor.texto('blanks', TEXTOS['blanks'] as string));
    return `(${nombres.length}) ${nombres.join(', ')}`;
  }

  /** Lleva el modelo a los campos; el que tiene el foco no se toca. */
  refrescar(): void {
    for (const c of this.#celdas.values()) {
      if (!c.entrada) continue;
      const editando = this.#grid.shadow.activeElement === c.entrada;
      if (editando) continue;
      const m = this.#motor.modeloDe(c.col.colId);
      const unico = condicionesDe(m).length === 1 && !this.#soloLectura(c.col);
      const tipo = this.#motor.tipoDe(c.col);
      const crudo = unico && tipo === 'date' ? condicionesDe(m)[0]?.dateFrom ?? '' : this.#resumen(c.col, m);
      c.entrada.toggleAttribute('readonly', !(tipo !== null && esCondicional(tipo)) || this.#soloLectura(c.col));
      const base = tipo === 'date' || tipo === 'number' ? tipo : 'text';
      const tipoHtml = !m || unico ? base : 'text';
      if (c.entrada.getAttribute('type') !== tipoHtml) c.entrada.setAttribute('type', tipoHtml);
      if (c.entrada.value !== crudo) c.entrada.value = crudo;
    }
  }

  destruir: Desinstalar = () => {
    this.#fila.remove();
  };
}
