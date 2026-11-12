// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filtros-ui-barra-avanzada — Input del Advanced Filter y constructor visual del modelo.
 */
import { avanzadoATexto, parsearAvanzado } from './filtros-avanzado.js';
import { OPCIONES_DEFECTO } from './filtros-condiciones.js';
import { TEXTOS } from './filtros-textos.js';
import { boton, botonIcono, crear, inputDe, selectDe } from './filtros-ui-controles.js';
import type { ColumnaAvanzada, CondicionAvanzada, GrupoAvanzado, ModeloAvanzado } from './filtros.schemas.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { Flotante, GridHost } from './contrato.schemas.js';

function tipoDeColumna(tipo: unknown): string {
  if (tipo === 'number' || tipo === 'boolean') return tipo;
  if (tipo === 'date' || tipo === 'dateTime' || tipo === 'dateString') return 'date';
  return 'text';
}

export class BarraAvanzada {
  #motor: MotorFiltros;
  #grid: GridHost;
  #raiz = crear('div', 'iswc-ag-avanzado');
  #entrada: HTMLElement & { value: string };
  #error = crear('div', 'iswc-ag-avanzado__error');
  #flotante: Flotante | null = null;
  #borrador: GrupoAvanzado = { filterType: 'join', type: 'AND', conditions: [] };

  constructor(motor: MotorFiltros) {
    this.#motor = motor;
    this.#grid = motor.grid;
    this.#entrada = inputDe({ placeholder: this.#t('advancedFilterPlaceholder'), aria: this.#t('advancedFilterPlaceholder'), limpiable: true }, () => this.#validar());
    this.#entrada.addEventListener('iswc-enter', () => this.#aplicar());
    this.#error.hidden = true;
    this.#error.setAttribute('role', 'alert');
    this.#raiz.append(this.#entrada, boton(this.#t('advancedFilterApply'), () => this.#aplicar(), 'soft'), boton(this.#t('advancedFilterBuilder'), () => this.mostrarConstructor(), 'text', 'mdi:filter-cog-outline'), this.#error);
  }

  #t(clave: string): string {
    return this.#grid.texto(clave, TEXTOS[clave] ?? clave);
  }

  #columnas(): ColumnaAvanzada[] {
    return this.#grid.columnas().filter((c) => this.#grid.defDe(c)['filter'] !== false).map((c) => ({ colId: c.colId, nombre: c.headerName, tipo: tipoDeColumna(c.type) }));
  }

  configurar(activo: boolean): void {
    if (!activo) {
      this.#raiz.remove();
      return;
    }
    const zona = this.#grid.zona('cabecera');
    if (this.#raiz.parentElement !== zona) zona.prepend(this.#raiz);
    this.refrescar();
  }

  #validar(): void {
    const { error } = parsearAvanzado(this.#entrada.value, this.#columnas());
    this.#error.hidden = !error;
    this.#error.textContent = error ? this.#t(error.mensaje) : '';
  }

  #aplicar(): void {
    const r = parsearAvanzado(this.#entrada.value, this.#columnas());
    this.#validar();
    if (!r.error) this.#motor.setAvanzado(r.modelo);
  }

  refrescar(): void {
    if (!this.#raiz.isConnected) return;
    const actual = parsearAvanzado(this.#entrada.value, this.#columnas());
    if (JSON.stringify(actual.modelo) === JSON.stringify(this.#motor.avanzado)) return;
    this.#entrada.value = avanzadoATexto(this.#motor.avanzado, this.#columnas());
  }

  /* ── constructor visual ─────────────────────────────────────────────── */

  mostrarConstructor(): void {
    const actual = this.#motor.avanzado;
    this.#borrador = actual?.filterType === 'join' ? structuredClone(actual as GrupoAvanzado) : { filterType: 'join', type: 'AND', conditions: actual ? [structuredClone(actual)] : [] };
    this.#flotante ??= this.#grid.flotante('filtro-avanzado');
    this.#pintarConstructor();
    this.#flotante.abrir(this.#raiz.isConnected ? this.#raiz : this.#grid.el);
  }

  ocultarConstructor(): void {
    this.#flotante?.cerrar();
  }

  #pintarConstructor(): void {
    const caja = crear('div', 'iswc-ag-constructor');
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', this.#t('advancedFilterBuilderTitle'));
    caja.append(crear('div', 'iswc-ag-constructor__titulo', this.#t('advancedFilterBuilderTitle')), this.#grupo(this.#borrador, null));
    const pie = crear('div', 'iswc-ag-filtro__botones');
    pie.append(boton(this.#t('advancedFilterCancel'), () => this.ocultarConstructor()), boton(this.#t('advancedFilterApply'), () => this.#confirmar(), 'filled'));
    caja.append(pie);
    this.#flotante?.el.replaceChildren(caja);
  }

  #confirmar(): void {
    const limpio = this.#podar(this.#borrador);
    this.#motor.setAvanzado(limpio);
    this.#entrada.value = avanzadoATexto(limpio, this.#columnas());
    this.ocultarConstructor();
  }

  /** Quita grupos vacios y colapsa el grupo raiz de un solo hijo. */
  #podar(g: GrupoAvanzado): ModeloAvanzado | null {
    const conditions = g.conditions.flatMap((c) => {
      if (c.filterType !== 'join') return (c as CondicionAvanzada).colId ? [c] : [];
      const dentro = this.#podar(c as GrupoAvanzado);
      return dentro ? [dentro] : [];
    });
    if (!conditions.length) return null;
    return conditions.length === 1 ? conditions[0] as ModeloAvanzado : { ...g, conditions };
  }

  #grupo(g: GrupoAvanzado, padre: GrupoAvanzado | null): HTMLElement {
    const caja = crear('div', 'iswc-ag-constructor__grupo');
    const cabeza = crear('div', 'iswc-ag-constructor__fila');
    cabeza.append(selectDe([['AND', this.#t('advancedFilterJoinAnd')], ['OR', this.#t('advancedFilterJoinOr')]], g.type, this.#t('ariaFilteringOperator'), (v) => {
      g.type = v as 'AND' | 'OR';
    }));
    cabeza.append(boton(this.#t('advancedFilterAddCondition'), () => this.#agregar(g, { filterType: 'text', colId: '', type: 'contains' }), 'text', 'mdi:plus'));
    cabeza.append(boton(this.#t('advancedFilterAddGroup'), () => this.#agregar(g, { filterType: 'join', type: 'AND', conditions: [] }), 'text', 'mdi:plus-box-multiple-outline'));
    if (padre) cabeza.append(this.#quitar(padre, g));
    caja.append(cabeza);
    for (const c of g.conditions) caja.append(c.filterType === 'join' ? this.#grupo(c as GrupoAvanzado, g) : this.#condicion(c as CondicionAvanzada, g));
    return caja;
  }

  #agregar(g: GrupoAvanzado, c: ModeloAvanzado): void {
    g.conditions.push(c);
    this.#pintarConstructor();
  }

  #quitar(g: GrupoAvanzado, c: ModeloAvanzado): HTMLElement {
    return botonIcono('mdi:close', this.#t('advancedFilterRemove'), () => {
      g.conditions = g.conditions.filter((x) => x !== c);
      this.#pintarConstructor();
    });
  }

  #mover(g: GrupoAvanzado, c: ModeloAvanzado, delta: number): void {
    const i = g.conditions.indexOf(c);
    const j = i + delta;
    if (j < 0 || j >= g.conditions.length) return;
    g.conditions.splice(i, 1);
    g.conditions.splice(j, 0, c);
    this.#pintarConstructor();
  }

  #opciones(tipo: string): Array<[string, string]> {
    if (tipo === 'boolean') return [['true', this.#t('advancedFilterTrue')], ['false', this.#t('advancedFilterFalse')], ['blank', this.#t('blank')], ['notBlank', this.#t('notBlank')]];
    const claves = OPCIONES_DEFECTO[tipo === 'number' || tipo === 'date' ? tipo : 'text'].filter((o) => o !== 'inRange');
    return claves.map((o) => [o, this.#t(o)]);
  }

  #condicion(c: CondicionAvanzada, g: GrupoAvanzado): HTMLElement {
    const fila = crear('div', 'iswc-ag-constructor__fila');
    const cols = this.#columnas();
    const colSel = selectDe(cols.map((x) => [x.colId, x.nombre]), c.colId, this.#t('advancedFilterSelectColumn'), (v) => {
      c.colId = v;
      const tipo = cols.find((x) => x.colId === v)?.tipo ?? 'text';
      if (tipo !== c.filterType) {
        c.filterType = tipo;
        c.type = this.#opciones(tipo)[0]?.[0] ?? 'equals';
        c.filter = null;
      }
      this.#pintarConstructor();
    });
    const opSel = selectDe(this.#opciones(c.filterType), c.type, this.#t('advancedFilterSelectOption'), (v) => {
      c.type = v;
      this.#pintarConstructor();
    });
    fila.append(colSel, opSel);
    if (!['blank', 'notBlank', 'true', 'false'].includes(c.type)) fila.append(this.#valor(c));
    fila.append(botonIcono('mdi:arrow-up', this.#t('previousPage'), () => this.#mover(g, c, -1)), botonIcono('mdi:arrow-down', this.#t('nextPage'), () => this.#mover(g, c, 1)), this.#quitar(g, c));
    return fila;
  }

  #valor(c: CondicionAvanzada): HTMLElement {
    const tipo = c.filterType === 'number' ? 'number' : c.filterType === 'date' ? 'date' : 'text';
    return inputDe({ tipo, valor: c.filter == null ? '' : String(c.filter), aria: this.#t('advancedFilterValue'), placeholder: this.#t('advancedFilterValue') }, (v) => {
      c.filter = c.filterType === 'number' ? (v === '' ? null : Number(v)) : v;
    });
  }

  destruir(): void {
    this.#raiz.remove();
    this.#flotante?.cerrar();
  }
}
