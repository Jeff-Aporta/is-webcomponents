/**
 * ui/panel-filtro — Contenido de un filtro de columna: condiciones, set o multi. Es el
 * mismo en el popup y en el panel lateral; solo cambia quien lo aloja.
 */
import { combinarCondiciones, condicionActiva, condicionesDe, opcionInicial, opcionesDe } from './filtros-condiciones.js';
import { arbolSet, filtrarMini, hojasDe, itemsSet, marcaDeTodo, modeloSet, seleccionDe } from './filtros-set.js';
import { TEXTOS } from './filtros-textos.js';
import { boton, casilla, crear, fijarCasilla, icono, inputDe, retardo, selectDe } from './filtros-ui-controles.js';
import type { Condicion, FilaSet, ItemSet, ModeloColumna, ModeloMulti, ModeloSet, NodoArbolSet, OpcionesPanelFiltro, OperadorUnion, ParamsFiltro, TipoCondicion, TipoFiltro } from './filtros.schemas.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

const ALTO_FILA_EM = 1.875;
const COLCHON_FILAS = 6;

export class PanelFiltro {
  el = crear('div', 'iswc-ag-filtro');
  #motor: MotorFiltros;
  #col: ColumnState;
  #tipo: TipoFiltro;
  #params: ParamsFiltro;
  #op: OpcionesPanelFiltro;
  #aplicado: ModeloColumna | null;
  #cuerpo = crear('div', 'iswc-ag-filtro__cuerpo');
  #debounce: (fn: () => void) => void;
  /* condiciones */
  #conds: Condicion[] = [];
  #operador: OperadorUnion = 'AND';
  /* set */
  #universo: ItemSet[] = [];
  #seleccion = new Set<string | null>();
  #mini = '';
  #abiertos = new Set<string>();
  #lista = crear('div', 'iswc-ag-set__lista');
  #hueco = crear('div', 'iswc-ag-set__hueco');
  #ventana = crear('div', 'iswc-ag-set__ventana');
  #todo: HTMLElement | null = null;
  #filas: FilaSet[] = [];
  /* multi */
  #hijos: PanelFiltro[] = [];

  constructor(motor: MotorFiltros, col: ColumnState, op: OpcionesPanelFiltro = {}) {
    this.#motor = motor;
    this.#col = col;
    this.#op = op;
    this.#tipo = op.tipo ?? motor.tipoDe(col) ?? 'text';
    this.#params = op.params ?? motor.paramsDe(col);
    this.#aplicado = op.modelo !== undefined ? op.modelo : motor.modeloDe(col.colId);
    this.#debounce = retardo(this.#debounceMs());
    this.#lista.addEventListener('scroll', () => this.#pintarVentana(), { passive: true });
    this.#armar();
    this.el.append(this.#cuerpo);
    const botones = this.#barraBotones();
    if (botones) this.el.append(botones);
  }

  /* ── comun ──────────────────────────────────────────────────────────── */

  #t(clave: string): string {
    return this.#motor.texto(clave, TEXTOS[clave] ?? clave);
  }

  #botones(): string[] {
    if (this.#op.sinBotones) return [];
    const b = this.#params['buttons'];
    return Array.isArray(b) ? b as string[] : [];
  }

  get #difiere(): boolean { return this.#botones().includes('apply'); }

  #debounceMs(): number {
    const propio = this.#params['debounceMs'];
    if (typeof propio === 'number') return propio;
    if (this.#botones().includes('apply')) return 0;
    return this.#tipo === 'text' || this.#tipo === 'number' ? 500 : 0;
  }

  #soloLectura(): boolean {
    return this.#params['readOnly'] === true;
  }

  #armar(): void {
    this.#cuerpo.replaceChildren();
    if (this.#tipo === 'set') this.#armarSet();
    else if (this.#tipo === 'multi') this.#armarMulti();
    else this.#armarCondiciones();
  }

  /** Modelo que representa lo que hay en pantalla. */
  modelo(): ModeloColumna | null {
    if (this.#tipo === 'set') return modeloSet(this.#seleccion, this.#universo);
    if (this.#tipo === 'multi') return this.#modeloMulti();
    const tipo = this.#tipo as TipoCondicion;
    return combinarCondiciones(tipo, this.#conds.map((c) => this.#recortar(c)), this.#operador, this.#params);
  }

  #recortar(c: Condicion): Condicion {
    if (this.#params['trimInput'] === true && typeof c.filter === 'string') return { ...c, filter: c.filter.trim() };
    return c;
  }

  /** Repinta desde un modelo externo sin disparar cambios. */
  fijar(modelo: ModeloColumna | null): void {
    const firma = JSON.stringify(modelo);
    if (firma === JSON.stringify(this.#aplicado) || firma === JSON.stringify(this.modelo())) {
      this.#aplicado = modelo;
      return;
    }
    this.#reponer(modelo);
  }

  /** Repinta aunque coincida con lo aplicado; descarta lo que estuviera sin aplicar. */
  #reponer(modelo: ModeloColumna | null): void {
    this.#aplicado = modelo;
    if (this.#tipo === 'multi') {
      const lista = (modelo as ModeloMulti | null)?.filterModels ?? [];
      this.#hijos.forEach((h, i) => h.#reponer((lista[i] ?? null) as ModeloColumna | null));
      return;
    }
    this.#armar();
  }

  #cambio(): void {
    this.#motor.grid.emitir('filterModified', { column: this.#col, filterInstance: this });
    if (this.#difiere) return;
    this.#debounce(() => this.#aplicar());
  }

  #aplicar(): void {
    const m = this.modelo();
    this.#aplicado = m;
    if (this.#op.alCambiar) {
      this.#op.alCambiar(m);
      return;
    }
    this.#motor.setColumna(this.#col.colId, m);
  }

  #barraBotones(): HTMLElement | null {
    const claves = this.#botones();
    if (!claves.length) return null;
    const barra = crear('div', 'iswc-ag-filtro__botones');
    for (const clave of claves) barra.append(this.#botonDe(clave));
    return barra;
  }

  #botonDe(clave: string): HTMLElement {
    if (clave === 'apply') return boton(this.#t('applyFilter'), () => this.#clicAplicar(), 'filled');
    if (clave === 'clear') return boton(this.#t('clearFilter'), () => this.#clicLimpiar());
    if (clave === 'reset') return boton(this.#t('resetFilter'), () => this.#clicRestablecer());
    return boton(this.#t('cancelFilter'), () => this.#clicCancelar());
  }

  #clicAplicar(): void {
    this.#aplicar();
    if (this.#params['closeOnApply'] === true) this.#op.alCerrar?.();
  }

  #clicLimpiar(): void {
    const vigente = this.#aplicado;
    this.#reponer(null);
    this.#aplicado = vigente;
  }

  #clicRestablecer(): void {
    this.#reponer(null);
    this.#aplicar();
    if (this.#params['closeOnApply'] === true) this.#op.alCerrar?.();
  }

  #clicCancelar(): void {
    this.#reponer(this.#aplicado);
    if (this.#params['closeOnApply'] === true) this.#op.alCerrar?.();
  }

  /** La UI queda con el estado aplicado, p.ej. al reabrir sin haber aplicado. */
  alAbrir(): void {
    if (this.#tipo === 'set' && this.#params['refreshValuesOnOpen'] === true) this.#cargarUniverso();
    if (this.#tipo === 'set') this.#pintarVentana();
    if (this.#difiere) this.#reponer(this.#motor.modeloDe(this.#col.colId));
    this.el.querySelector<HTMLElement>('iswc-input')?.focus();
  }

  /* ── condiciones ────────────────────────────────────────────────────── */

  #armarCondiciones(): void {
    const tipo = this.#tipo as TipoCondicion;
    const existentes = condicionesDe(this.#aplicado);
    this.#operador = ((this.#aplicado as { operator?: OperadorUnion } | null)?.operator) ?? (this.#params['defaultJoinOperator'] as OperadorUnion | undefined) ?? 'AND';
    this.#conds = existentes.length ? existentes.map((c) => ({ ...c })) : [this.#vacia(tipo)];
    this.#pintarCondiciones();
  }

  #vacia(tipo: TipoCondicion): Condicion {
    return { filterType: tipo, type: opcionInicial(tipo, opcionesDe(tipo, this.#params), this.#params) };
  }

  /** maxNumConditions (2) y numAlwaysVisibleConditions (1); la siguiente aparece al llenar la anterior. */
  #visibles(tipo: TipoCondicion): number {
    const maximo = typeof this.#params['maxNumConditions'] === 'number' ? this.#params['maxNumConditions'] as number : 2;
    const minimo = Math.min(maximo, typeof this.#params['numAlwaysVisibleConditions'] === 'number' ? this.#params['numAlwaysVisibleConditions'] as number : 1);
    let n = minimo;
    while (n < maximo && condicionActiva(tipo, this.#conds[n - 1], this.#params)) n += 1;
    return Math.max(1, Math.min(maximo, n));
  }

  #pintarCondiciones(): void {
    const tipo = this.#tipo as TipoCondicion;
    const n = this.#visibles(tipo);
    while (this.#conds.length < n) this.#conds.push(this.#vacia(tipo));
    this.#conds.length = Math.max(n, this.#conds.filter((c) => condicionActiva(tipo, c, this.#params)).length);
    const piezas: HTMLElement[] = [];
    for (let i = 0; i < n; i += 1) {
      if (i > 0) piezas.push(this.#union());
      piezas.push(this.#filaCondicion(tipo, i));
    }
    this.#cuerpo.replaceChildren(...piezas);
  }

  #union(): HTMLElement {
    const caja = crear('div', 'iswc-ag-filtro__union');
    caja.setAttribute('role', 'radiogroup');
    caja.setAttribute('aria-label', this.#t('ariaFilteringOperator'));
    const opcion = (valor: OperadorUnion, texto: string): HTMLElement => {
      const b = boton(texto, () => {
        this.#operador = valor;
        this.#pintarCondiciones();
        this.#cambio();
      }, this.#operador === valor ? 'soft' : 'text');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(this.#operador === valor));
      if (this.#soloLectura()) b.setAttribute('disabled', '');
      return b;
    };
    caja.append(opcion('AND', this.#t('andCondition')), opcion('OR', this.#t('orCondition')));
    return caja;
  }

  #filaCondicion(tipo: TipoCondicion, i: number): HTMLElement {
    const fila = crear('div', 'iswc-ag-filtro__condicion');
    const opciones = opcionesDe(tipo, this.#params, (c, d) => this.#motor.texto(c, d));
    const c = this.#conds[i] as Condicion;
    const sel = selectDe(opciones.map((o) => [o.clave, o.etiqueta]), c.type ?? '', this.#t('ariaFilterOperator'), (v) => {
      c.type = v;
      this.#pintarCondiciones();
      this.#cambio();
    });
    if (this.#soloLectura() || opciones.length < 2) sel.setAttribute('disabled', '');
    fila.append(sel);
    const entradas = opciones.find((o) => o.clave === c.type)?.entradas ?? 1;
    if (entradas >= 1) fila.append(this.#entrada(tipo, c, 'desde', entradas === 2));
    if (entradas === 2) fila.append(this.#entrada(tipo, c, 'hasta', true));
    return fila;
  }

  #leer(tipo: TipoCondicion, c: Condicion, lado: 'desde' | 'hasta'): string {
    if (tipo === 'date') return (lado === 'desde' ? c.dateFrom : c.dateTo) ?? '';
    const v = lado === 'desde' ? c.filter : c.filterTo;
    return v == null ? '' : String(v);
  }

  #escribir(tipo: TipoCondicion, c: Condicion, lado: 'desde' | 'hasta', v: string): void {
    const propio = this.#params['numberParser'] as ((t: string) => number | null) | undefined;
    if (tipo === 'date') {
      if (lado === 'desde') c.dateFrom = v || null;
      else c.dateTo = v || null;
      return;
    }
    const numero = propio ? propio(v) : (v === '' ? null : Number(v));
    const valor = tipo === 'number' ? numero : v;
    if (lado === 'desde') c.filter = valor;
    else c.filterTo = valor;
  }

  #entrada(tipo: TipoCondicion, c: Condicion, lado: 'desde' | 'hasta', rango: boolean): HTMLElement {
    const propio = this.#params['filterPlaceholder'];
    const respaldo = rango ? this.#t(lado === 'desde' ? 'inRangeStart' : 'inRangeEnd') : this.#t('filterOoo');
    const placeholder = typeof propio === 'string' ? propio : respaldo;
    const patron = this.#params['allowedCharPattern'] as string | undefined;
    const tipoHtml = tipo === 'date' ? 'date' : tipo === 'number' && !patron ? 'number' : 'text';
    const el = inputDe({ tipo: tipoHtml, valor: this.#leer(tipo, c, lado), placeholder, aria: this.#t('ariaFilterInput'), soloLectura: this.#soloLectura() }, (v) => {
      const eraActiva = condicionActiva(tipo, c, this.#params);
      this.#escribir(tipo, c, lado, v);
      if (eraActiva !== condicionActiva(tipo, c, this.#params)) this.#ajustarFilas(tipo);
      this.#cambio();
    });
    el.addEventListener('iswc-enter', () => { if (this.#difiere) this.#clicAplicar(); });
    return el;
  }

  /** Aparece o desaparece la condicion siguiente sin perder el foco de la actual. */
  #ajustarFilas(tipo: TipoCondicion): void {
    const quiere = this.#visibles(tipo);
    const hay = this.#cuerpo.querySelectorAll('.iswc-ag-filtro__condicion').length;
    if (quiere === hay) return;
    if (quiere > hay) {
      while (this.#conds.length < quiere) this.#conds.push(this.#vacia(tipo));
      for (let i = hay; i < quiere; i += 1) this.#cuerpo.append(this.#union(), this.#filaCondicion(tipo, i));
      return;
    }
    const sobran = [...this.#cuerpo.children].slice((quiere * 2) - 1);
    for (const nodo of sobran) nodo.remove();
    this.#conds.length = quiere;
  }

  /* ── set ────────────────────────────────────────────────────────────── */

  #cargarUniverso(): void {
    const valores = this.#params['values'];
    const lista = (v: unknown[]): void => {
      this.#universo = itemsSet(v, this.#params, this.#t('blanks'));
      this.#seleccion = seleccionDe(this.#aplicado as ModeloSet | null, this.#universo, this.#params);
      this.#pintarLista();
    };
    if (Array.isArray(valores)) {
      lista(valores);
      return;
    }
    if (typeof valores === 'function') {
      (valores as (p: Record<string, unknown>) => void)({ success: lista, colDef: this.#motor.grid.defDe(this.#col), column: this.#col });
      return;
    }
    const filas = (this.#motor.grid.modelo()?.getAllRows() ?? []) as RowNode[];
    lista(filas.map((n) => this.#motor.valorFiltro(this.#col, n)));
  }

  #armarSet(): void {
    this.#lista.replaceChildren(this.#hueco);
    this.#hueco.replaceChildren(this.#ventana);
    const piezas: HTMLElement[] = [];
    if (this.#params['suppressMiniFilter'] !== true) piezas.push(this.#miniFiltro());
    if (this.#params['suppressSelectAll'] !== true) {
      this.#todo = casilla(this.#t('selectAll'), false, (m) => this.#marcarVisibles(m));
      piezas.push(this.#todo);
    }
    piezas.push(this.#lista);
    this.#cuerpo.replaceChildren(...piezas);
    this.#cargarUniverso();
  }

  #miniFiltro(): HTMLElement {
    return inputDe({ tipo: 'search', valor: this.#mini, placeholder: this.#t('searchOoo'), aria: this.#t('searchOoo'), limpiable: true }, (v) => {
      this.#mini = v;
      this.#pintarLista();
      if (this.#params['applyMiniFilterWhileTyping'] === true) this.#aplicarMini();
    });
  }

  /** Con applyMiniFilterWhileTyping lo visible es exactamente lo seleccionado. */
  #aplicarMini(): void {
    const visibles = filtrarMini(this.#universo, this.#mini, this.#params);
    this.#seleccion = new Set(visibles.map((i) => i.clave));
    this.#pintarLista();
    this.#cambio();
  }

  #marcarVisibles(marcar: boolean): void {
    for (const i of filtrarMini(this.#universo, this.#mini, this.#params)) {
      if (marcar) this.#seleccion.add(i.clave);
      else this.#seleccion.delete(i.clave);
    }
    this.#pintarLista();
    this.#cambio();
  }

  #aplanar(nodos: NodoArbolSet[], fuera: FilaSet[]): void {
    for (const n of nodos) {
      fuera.push({ nodo: n, item: n.item ?? { clave: n.id, etiqueta: n.etiqueta, valor: null }, nivel: n.nivel });
      if (this.#abiertos.has(n.id) || this.#mini) this.#aplanar(n.hijos, fuera);
    }
  }

  #pintarLista(): void {
    const visibles = filtrarMini(this.#universo, this.#mini, this.#params);
    if (this.#params['treeList'] === true) {
      const filas: FilaSet[] = [];
      this.#aplanar(arbolSet(visibles, this.#params), filas);
      this.#filas = filas;
    } else {
      this.#filas = visibles.map((item) => ({ nodo: null, item, nivel: 0 }));
    }
    if (this.#todo) fijarCasilla(this.#todo, this.#marca(marcaDeTodo(visibles, this.#seleccion)));
    this.#hueco.style.blockSize = `${this.#filas.length * ALTO_FILA_EM}em`;
    this.#pintarVentana();
  }

  #marca(m: string): boolean | 'mixta' {
    if (m === 'some') return 'mixta';
    return m === 'all';
  }

  /** Lista virtual: con miles de valores solo existen las casillas que se ven. */
  #pintarVentana(): void {
    if (!this.#filas.length) {
      this.#ventana.style.transform = '';
      this.#ventana.replaceChildren(crear('div', 'iswc-ag-set__vacio', this.#t('noMatches')));
      this.#hueco.style.blockSize = '';
      return;
    }
    const em = Number.parseFloat(getComputedStyle(this.#lista).fontSize) || 16;
    const altoFila = ALTO_FILA_EM * em;
    const inicio = Math.max(0, Math.floor(this.#lista.scrollTop / altoFila) - COLCHON_FILAS);
    const cuantas = Math.ceil((this.#lista.clientHeight || altoFila * 12) / altoFila) + COLCHON_FILAS * 2;
    const tramo = this.#filas.slice(inicio, inicio + cuantas);
    this.#ventana.style.transform = `translateY(${inicio * ALTO_FILA_EM}em)`;
    this.#ventana.replaceChildren(...tramo.map((f) => this.#filaSet(f)));
  }

  #marcaNodo(f: FilaSet): boolean | 'mixta' {
    if (!f.nodo?.hijos.length) return this.#seleccion.has(f.item.clave);
    const hojas = hojasDe(f.nodo);
    return this.#marca(marcaDeTodo(hojas, this.#seleccion));
  }

  #filaSet(f: FilaSet): HTMLElement {
    const fila = crear('div', 'iswc-ag-set__fila');
    fila.style.paddingInlineStart = `${f.nivel * 1.25}em`;
    if (f.nodo?.hijos.length) fila.append(this.#plegador(f.nodo));
    const c = casilla(f.nodo?.etiqueta ?? f.item.etiqueta, this.#marcaNodo(f), (m) => this.#marcarFila(f, m));
    if (this.#params['showTooltips'] === true) c.title = f.item.etiqueta;
    fila.append(c);
    return fila;
  }

  #plegador(n: NodoArbolSet): HTMLElement {
    const abierto = this.#abiertos.has(n.id);
    const b = crear('button', 'iswc-ag-set__plegar');
    b.setAttribute('type', 'button');
    b.setAttribute('aria-expanded', String(abierto));
    b.setAttribute('aria-label', n.etiqueta);
    b.append(icono(abierto ? 'mdi:chevron-down' : 'mdi:chevron-right'));
    b.addEventListener('click', () => {
      if (abierto) this.#abiertos.delete(n.id);
      else this.#abiertos.add(n.id);
      this.#pintarLista();
    });
    return b;
  }

  #marcarFila(f: FilaSet, marcar: boolean): void {
    const hojas = f.nodo?.hijos.length ? hojasDe(f.nodo) : [f.item];
    for (const i of hojas) {
      if (marcar) this.#seleccion.add(i.clave);
      else this.#seleccion.delete(i.clave);
    }
    this.#pintarLista();
    this.#cambio();
  }

  /* ── multi ──────────────────────────────────────────────────────────── */

  #armarMulti(): void {
    const defs = this.#motor.hijosDe(this.#col);
    const modelos = (this.#aplicado as ModeloMulti | null)?.filterModels ?? [];
    this.#hijos = defs.map((d, i) => new PanelFiltro(this.#motor, this.#col, {
      tipo: this.#motor.tipoHijo(d),
      params: (d['filterParams'] ?? {}) as ParamsFiltro,
      modelo: (modelos[i] ?? null) as ModeloColumna | null,
      sinBotones: true,
      alCambiar: () => this.#cambio(),
    }));
    const piezas = this.#hijos.flatMap((h, i) => {
      const d = defs[i] as Record<string, unknown>;
      const seccion = this.#seccionMulti(h, d, i);
      return i > 0 ? [crear('hr', 'iswc-ag-filtro__divisor'), seccion] : [seccion];
    });
    this.#cuerpo.replaceChildren(...piezas);
  }

  #seccionMulti(h: PanelFiltro, d: Record<string, unknown>, i: number): HTMLElement {
    const display = d['display'] ?? 'inline';
    if (display === 'inline') return h.el;
    const caja = crear('div', 'iswc-ag-filtro__acordeon');
    const titulo = String(d['title'] ?? this.#t('filterOoo'));
    const cabeza = crear('button', 'iswc-ag-filtro__acordeon-boton');
    cabeza.setAttribute('type', 'button');
    cabeza.setAttribute('aria-expanded', String(i === 0));
    const flecha = icono(i === 0 ? 'mdi:chevron-down' : 'mdi:chevron-right');
    cabeza.append(flecha, titulo);
    h.el.hidden = i !== 0;
    cabeza.addEventListener('click', () => {
      h.el.hidden = !h.el.hidden;
      cabeza.setAttribute('aria-expanded', String(!h.el.hidden));
      flecha.setAttribute('icon', h.el.hidden ? 'mdi:chevron-right' : 'mdi:chevron-down');
    });
    caja.append(cabeza, h.el);
    return caja;
  }

  #modeloMulti(): ModeloMulti | null {
    const filterModels = this.#hijos.map((h) => h.modelo());
    return filterModels.some(Boolean) ? { filterType: 'multi', filterModels } : null;
  }
}
