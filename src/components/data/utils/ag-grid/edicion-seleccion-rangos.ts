// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion-seleccion-rangos — Cell selection, fill handle y operaciones
 * sobre rangos. Marca las celdas por clase (no por capa): asi un rango cruza
 * columnas y filas fijadas sin desfases, y el reciclado se repara en `pintado`.
 */
import type { OpcionesAsa, OpcionesCelda, Gesto } from './edicion-seleccion-rangos.schemas.js';
import { colsVisibles, esEditable, nodoDeFila, paramsCelda, posDeRef, refDePos, valorBorrado } from './edicion-apoyo.js';
import * as R from './edicion-rangos.js';
import { planRelleno, valoresRelleno } from './edicion-relleno.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Desinstalar, EventoCelda, GridHost } from './contrato.schemas.js';
import type { Escritor } from './edicion-escritor.js';
import type { EjeRelleno, PlanRelleno, Posicion, Rango } from './edicion.schemas.js';

const CLASES = ['iswc-ag-rango', 'iswc-ag-rango-arriba', 'iswc-ag-rango-abajo', 'iswc-ag-rango-izquierda', 'iswc-ag-rango-derecha', 'iswc-ag-relleno-previo'];
const SELECTOR_CELDA = '[data-col-id][data-row-id]';
const SELECTOR_ENCABEZADO = '[role="columnheader"][data-col-id]';

export class SeleccionRangos {
  #grid: GridHost;
  #escritor: Escritor;
  #rangos: Rango[] = [];
  #gesto: Gesto | null = null;
  #previo: PlanRelleno | null = null;
  #ultimaCol: number | null = null;
  #asa: HTMLElement;
  #indices: Map<string, number> | null = null;

  constructor(grid: GridHost, escritor: Escritor) {
    this.#grid = grid;
    this.#escritor = escritor;
    this.#asa = document.createElement('span');
    this.#asa.className = 'iswc-ag-asa';
    this.#asa.setAttribute('aria-hidden', 'true');
  }

  get #opciones(): OpcionesCelda | null {
    const valor = this.#grid.opcion<unknown>('cellSelection', false);
    if (valor === true) return {};
    return valor && typeof valor === 'object' ? (valor as OpcionesCelda) : null;
  }

  get activo(): boolean {
    return this.#opciones !== null;
  }

  get rangos(): Rango[] {
    return this.#rangos;
  }

  instalar(): Desinstalar {
    const grid = this.#grid;
    const pulsar = (e: Event): void => this.#clicEncabezado(e as MouseEvent);
    const encima = (e: Event): void => this.#mover(e as PointerEvent);
    const soltar = (e: Event): void => this.#soltar(e as PointerEvent);
    const doble = (e: Event): void => this.#dobleAsa(e);
    grid.shadow.addEventListener('click', pulsar, true);
    grid.el.addEventListener('pointermove', encima);
    grid.el.addEventListener('pointerup', soltar);
    grid.el.addEventListener('pointercancel', soltar);
    this.#asa.addEventListener('pointerdown', (e) => this.#tomarAsa(e));
    this.#asa.addEventListener('dblclick', doble);
    const quitar = [
      grid.celdaAbajo((ev) => this.#abajo(ev)),
      grid.on('pintado', () => this.#alPintar()),
    ];
    return () => {
      grid.shadow.removeEventListener('click', pulsar, true);
      grid.el.removeEventListener('pointermove', encima);
      grid.el.removeEventListener('pointerup', soltar);
      grid.el.removeEventListener('pointercancel', soltar);
      for (const fn of quitar) fn();
    };
  }

  /* ── Estado ────────────────────────────────────────────────────────── */

  fijar(rangos: Rango[], terminado = true): void {
    const grid = this.#grid;
    const unico = this.#opciones?.suppressMultiRanges === true;
    this.#rangos = unico ? rangos.slice(-1) : rangos;
    this.pintar();
    const detalle = { started: !terminado, finished: terminado };
    grid.emitir('cellSelectionChanged', detalle);
  }

  limpiar(): void {
    if (this.#rangos.length) this.fijar([]);
  }

  #alPintar(): void {
    this.#indices = null;
    const totalFilas = this.#grid.totalFilas();
    const totalCols = colsVisibles(this.#grid).length;
    this.#rangos = this.#rangos.flatMap((r) => R.recortar(r, totalFilas, totalCols) ?? []);
    this.pintar();
  }

  /** Indice de display de una fila renderizada; la tabla se reconstruye tras cada render. */
  #indiceDeFila(celda: HTMLElement): number {
    const directo = celda.closest<HTMLElement>('[data-row-index]')?.dataset['rowIndex'];
    if (directo != null) return Number(directo);
    if (!this.#indices) {
      this.#indices = new Map();
      for (let i = 0; i < this.#grid.totalFilas(); i++) {
        const node = nodoDeFila(this.#grid.filaEn(i));
        if (node) this.#indices.set(node.id, i);
      }
    }
    return this.#indices.get(celda.dataset['rowId'] ?? '') ?? -1;
  }

  /** Repinta las celdas montadas. Cuesta lo que la ventana virtual, no lo que el rango. */
  pintar(): void {
    const cols = colsVisibles(this.#grid);
    const indiceCol = new Map(cols.map((c, i) => [c.colId, i]));
    const previo = this.#previo?.nuevas ?? this.#previo?.reducidas ?? null;
    const ultimo = this.#rangos[this.#rangos.length - 1];
    const conAsa = Boolean(this.#opciones?.handle) && this.#rangos.length === 1;
    this.#asa.remove();
    for (const celda of this.#grid.shadow.querySelectorAll<HTMLElement>(SELECTOR_CELDA)) {
      const fila = this.#indiceDeFila(celda);
      const col = indiceCol.get(celda.dataset['colId'] ?? '') ?? -1;
      const pos = { fila, col };
      const dentro = this.#rangos.filter((r) => R.contiene(r, pos));
      celda.classList.remove(...CLASES);
      if (previo && R.contiene(previo, pos)) celda.classList.add('iswc-ag-relleno-previo');
      if (!dentro.length) continue;
      celda.classList.add('iswc-ag-rango');
      celda.classList.toggle('iswc-ag-rango-arriba', dentro.some((r) => r.filaDesde === fila));
      celda.classList.toggle('iswc-ag-rango-abajo', dentro.some((r) => r.filaHasta === fila));
      celda.classList.toggle('iswc-ag-rango-izquierda', dentro.some((r) => r.colDesde === col));
      celda.classList.toggle('iswc-ag-rango-derecha', dentro.some((r) => r.colHasta === col));
      if (conAsa && ultimo && ultimo.filaHasta === fila && ultimo.colHasta === col) celda.append(this.#asa);
    }
    this.#resaltarEncabezados(cols);
  }

  #resaltarEncabezados(cols: ColumnState[]): void {
    const activo = this.#opciones?.enableHeaderHighlight === true;
    for (const celda of this.#grid.shadow.querySelectorAll<HTMLElement>(SELECTOR_ENCABEZADO)) {
      const col = cols.findIndex((c) => c.colId === celda.dataset['colId']);
      const marcada = activo && this.#rangos.some((r) => col >= r.colDesde && col <= r.colHasta);
      celda.classList.toggle('iswc-ag-encabezado-rango', marcada);
    }
  }

  /* ── Puntero ───────────────────────────────────────────────────────── */

  #celdaEnPunto(x: number, y: number): Posicion | null {
    const tocado = this.#grid.shadow.elementFromPoint(x, y);
    const celda = tocado?.closest<HTMLElement>(SELECTOR_CELDA);
    if (!celda) return null;
    const col = colsVisibles(this.#grid).findIndex((c) => c.colId === celda.dataset['colId']);
    const fila = this.#indiceDeFila(celda);
    return col >= 0 && fila >= 0 ? { fila, col } : null;
  }

  #abajo(ev: EventoCelda): boolean | void {
    if (!this.activo) return;
    const e = ev.evento as PointerEvent;
    if (e.button !== 0) return;
    const pos = posDeRef(this.#grid, ev);
    if (!pos) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const foco = this.#grid.foco();
    if (e.shiftKey && foco) {
      const ancla = posDeRef(this.#grid, foco) ?? pos;
      const conservados = this.#rangos.slice(0, -1);
      this.fijar([...conservados, R.normalizar(ancla, pos)], false);
      this.#gesto = { ancla, modo: 'nuevo', ultimo: pos, base: null };
      return true;
    }
    this.#grid.enfocar({ indice: ev.indice, colId: ev.colId });
    const quitar = ctrl && R.enAlguno(this.#rangos, pos);
    if (!ctrl) this.#rangos = [];
    if (quitar) this.fijar(R.restarDeLista(this.#rangos, R.celda(pos)), false);
    else this.fijar([...this.#rangos, R.celda(pos)], false);
    this.#gesto = { ancla: pos, modo: quitar ? 'quitar' : 'nuevo', ultimo: pos, base: null };
  }

  /** Capturar en pointerdown desviaria el click de la celda: se hace al salir de ella. */
  #capturar(pointerId: number): void {
    try {
      this.#grid.el.setPointerCapture(pointerId);
    } catch {
      /* eventos sinteticos no tienen puntero activo */
    }
  }

  #mover(e: PointerEvent): void {
    const gesto = this.#gesto;
    if (!gesto) return;
    const pos = this.#celdaEnPunto(e.clientX, e.clientY);
    if (!pos || (pos.fila === gesto.ultimo.fila && pos.col === gesto.ultimo.col)) return;
    gesto.ultimo = pos;
    this.#capturar(e.pointerId);
    const ref = refDePos(this.#grid, pos);
    if (ref) this.#grid.asegurarVisible(ref);
    if (gesto.modo === 'asa') {
      this.#moverAsa(gesto, pos);
      return;
    }
    if (gesto.modo === 'quitar') return;
    const conservados = this.#rangos.slice(0, -1);
    this.fijar([...conservados, R.normalizar(gesto.ancla, pos)], false);
  }

  #soltar(e: PointerEvent): void {
    const gesto = this.#gesto;
    if (!gesto) return;
    this.#gesto = null;
    if (gesto.modo === 'asa') {
      this.#soltarAsa(gesto, e.altKey);
      return;
    }
    if (gesto.modo === 'quitar') {
      this.fijar(R.restarDeLista(this.#rangos, R.normalizar(gesto.ancla, gesto.ultimo)));
      return;
    }
    this.fijar(this.#rangos);
  }

  /** Clic en encabezado: `enableColumnSelection`. Ordenar pasa a pedir Alt. */
  #clicEncabezado(e: MouseEvent): void {
    if (!this.#opciones?.enableColumnSelection || e.altKey) return;
    const celda = (e.target as Element | null)?.closest?.<HTMLElement>(SELECTOR_ENCABEZADO);
    if (!celda || (e.target as Element).closest('button')) return;
    const col = colsVisibles(this.#grid).findIndex((c) => c.colId === celda.dataset['colId']);
    if (col < 0) return;
    e.stopPropagation();
    const total = this.#grid.totalFilas();
    const ctrl = e.ctrlKey || e.metaKey;
    const propio = R.deColumnas(col, col, total);
    if (e.shiftKey && this.#ultimaCol != null) {
      const base = ctrl ? this.#rangos : [];
      this.fijar([...base, R.deColumnas(this.#ultimaCol, col, total)]);
      return;
    }
    this.#ultimaCol = col;
    if (ctrl && this.#rangos.some((r) => R.interseccion(r, propio))) this.fijar(R.restarDeLista(this.#rangos, propio));
    else this.fijar(ctrl ? [...this.#rangos, propio] : [propio]);
  }

  /* ── Asa ───────────────────────────────────────────────────────────── */

  #tomarAsa(e: PointerEvent): void {
    const base = this.#rangos[0];
    if (!base) return;
    e.preventDefault();
    e.stopPropagation();
    const ancla = { fila: base.filaHasta, col: base.colHasta };
    this.#gesto = { ancla, modo: 'asa', ultimo: ancla, base };
    this.#capturar(e.pointerId);
  }

  #direccion(): EjeRelleno {
    return this.#opciones?.handle?.direction ?? 'xy';
  }

  #moverAsa(gesto: Gesto, pos: Posicion): void {
    if (!gesto.base) return;
    if (this.#opciones?.handle?.mode === 'range') {
      this.fijar([R.normalizar({ fila: gesto.base.filaDesde, col: gesto.base.colDesde }, pos)], false);
      return;
    }
    this.#previo = planRelleno(gesto.base, pos, this.#direccion());
    this.pintar();
  }

  #soltarAsa(gesto: Gesto, alt: boolean): void {
    const plan = this.#previo;
    this.#previo = null;
    if (this.#opciones?.handle?.mode === 'range') {
      this.fijar(this.#rangos);
      return;
    }
    if (plan?.eje && gesto.base) this.#rellenar(gesto.base, plan, alt);
    else this.pintar();
  }

  #dobleAsa(e: Event): void {
    const base = this.#rangos[0];
    if (!base) return;
    e.stopPropagation();
    const horizontal = this.#direccion() === 'x';
    const fin = horizontal ? { fila: base.filaHasta, col: colsVisibles(this.#grid).length - 1 } : { fila: this.#grid.totalFilas() - 1, col: base.colHasta };
    const plan = planRelleno(base, fin, horizontal ? 'x' : 'y');
    if (plan.eje) this.#rellenar(base, plan, false);
  }

  #leerCelda(pos: Posicion): { col: ColumnState; node: RowNode } | null {
    const col = colsVisibles(this.#grid)[pos.col];
    const node = nodoDeFila(this.#grid.filaEn(pos.fila));
    return col && node ? { col, node } : null;
  }

  #puedeEscribir(pos: Posicion, col: ColumnState, node: RowNode): boolean {
    return esEditable(this.#grid, col, node, pos.fila);
  }

  /** Tira de celdas de una columna o fila, desde el rango hacia afuera. */
  #tiras(base: Rango, plan: PlanRelleno): Array<{ origen: Posicion[]; destino: Posicion[] }> {
    const nuevas = plan.nuevas;
    if (!nuevas) return [];
    const tiras: Array<{ origen: Posicion[]; destino: Posicion[] }> = [];
    const ordenar = (lista: Posicion[]): Posicion[] => (plan.inverso ? lista.reverse() : lista);
    if (plan.eje === 'y') {
      for (let col = base.colDesde; col <= base.colHasta; col++) {
        const origen: Posicion[] = [];
        const destino: Posicion[] = [];
        for (let fila = base.filaDesde; fila <= base.filaHasta; fila++) origen.push({ fila, col });
        for (let fila = nuevas.filaDesde; fila <= nuevas.filaHasta; fila++) destino.push({ fila, col });
        tiras.push({ origen, destino: ordenar(destino) });
      }
    } else {
      for (let fila = base.filaDesde; fila <= base.filaHasta; fila++) {
        const origen: Posicion[] = [];
        const destino: Posicion[] = [];
        for (let col = base.colDesde; col <= base.colHasta; col++) origen.push({ fila, col });
        for (let col = nuevas.colDesde; col <= nuevas.colHasta; col++) destino.push({ fila, col });
        tiras.push({ origen, destino: ordenar(destino) });
      }
    }
    return tiras;
  }

  #valorRelleno(propio: OpcionesAsa['setFillValue'], base: { pos: Posicion; col: ColumnState; node: RowNode; valores: unknown[]; iniciales: unknown[]; indice: number; defecto: unknown; direccion: string }): { saltar: boolean; valor: unknown } {
    if (!propio) return { saltar: false, valor: base.defecto };
    let resultado = { saltar: false, valor: base.defecto };
    const actual = this.#escritor.valorVisible(base.col, base.node);
    propio({
      ...paramsCelda(this.#grid, base.col, base.node, base.pos.fila),
      values: base.valores, initialValues: base.iniciales, currentIndex: base.indice, currentCellValue: actual, direction: base.direccion,
      useValue: (valor: unknown) => { resultado = { saltar: valor === actual, valor }; },
      skipCell: () => { resultado = { saltar: true, valor: undefined }; },
      useDefault: () => { resultado = { saltar: false, valor: base.defecto }; },
    });
    return resultado;
  }

  #rellenar(base: Rango, plan: PlanRelleno, alt: boolean): void {
    const grid = this.#grid;
    const asa = this.#opciones?.handle;
    const direccion = plan.eje === 'y' ? (plan.inverso ? 'up' : 'down') : plan.inverso ? 'left' : 'right';
    grid.emitir('fillStart', {});
    this.#escritor.agrupar(() => {
      for (const { origen, destino } of this.#tiras(base, plan)) {
        const leidas = origen.map((pos) => this.#leerCelda(pos));
        const iniciales = leidas.map((l) => (l ? this.#escritor.valorVisible(l.col, l.node) : null));
        const serie = valoresRelleno(iniciales, destino.length, plan.inverso, alt);
        const valores = [...iniciales];
        destino.forEach((pos, indice) => {
          const leida = this.#leerCelda(pos);
          if (!leida) return;
          const { col, node } = leida;
          const def = grid.defDe(col);
          if (def['suppressFillHandle'] === true || !this.#puedeEscribir(pos, col, node)) return;
          const decision = this.#valorRelleno(asa?.setFillValue, { pos, col, node, valores, iniciales, indice, defecto: serie[indice], direccion });
          if (decision.saltar) return;
          valores.push(decision.valor);
          this.#escritor.escribir(node, col.colId, decision.valor, 'rangeSvc');
        });
      }
      if (plan.reducidas && !asa?.suppressClearOnFillReduction) this.borrar([plan.reducidas], 'rangeSvc');
    });
    grid.emitir('fillEnd', { finalRange: plan.final, initialRange: base });
    this.fijar([plan.final]);
  }

  /* ── Operaciones ───────────────────────────────────────────────────── */

  /** Borra sin eventos de inicio/fin: quien llama decide cuales corresponden. */
  borrar(rangos: Rango[], origen: string): void {
    const grid = this.#grid;
    this.#escritor.agrupar(() => {
      for (const pos of R.celdasDeLista(rangos)) {
        const leida = this.#leerCelda(pos);
        if (!leida || !this.#puedeEscribir(pos, leida.col, leida.node)) continue;
        const params = paramsCelda(grid, leida.col, leida.node, pos.fila);
        this.#escritor.escribir(leida.node, leida.col.colId, valorBorrado(grid.defDe(leida.col), params), origen);
      }
    });
  }

  /** Delete con rango. */
  borrarSeleccion(): boolean {
    if (!this.#rangos.length) return false;
    this.#grid.emitir('cellSelectionDeleteStart', {});
    this.borrar(this.#rangos, 'rangeSvc');
    this.#grid.emitir('cellSelectionDeleteEnd', {});
    return true;
  }

  /** Ctrl+D: la fila superior de cada rango baja a las demas. */
  rellenarAbajo(): boolean {
    if (!this.#rangos.length) return false;
    const grid = this.#grid;
    grid.emitir('fillStart', {});
    this.#escritor.agrupar(() => {
      for (const r of this.#rangos) {
        for (const pos of R.celdas({ ...r, filaDesde: r.filaDesde + 1 })) {
          const leida = this.#leerCelda(pos);
          const fuente = this.#leerCelda({ fila: r.filaDesde, col: pos.col });
          if (!leida || !fuente || !this.#puedeEscribir(pos, leida.col, leida.node)) continue;
          this.#escritor.escribir(leida.node, leida.col.colId, this.#escritor.valorVisible(fuente.col, fuente.node), 'rangeSvc');
        }
      }
    });
    grid.emitir('fillEnd', {});
    return true;
  }

  /** Ctrl+Enter en un editor: el valor va a todas las celdas editables del rango. */
  asignar(valor: unknown, node: RowNode, colId: string): void {
    const col = colsVisibles(this.#grid).findIndex((c) => c.colId === colId);
    this.#escritor.agrupar(() => {
      for (const pos of R.celdasDeLista(this.#rangos)) {
        const leida = this.#leerCelda(pos);
        if (!leida || !this.#puedeEscribir(pos, leida.col, leida.node)) continue;
        if (leida.node.id === node.id && pos.col === col) continue;
        this.#escritor.escribir(leida.node, leida.col.colId, valor, 'rangeSvc');
      }
    });
  }

  /** Forma publica de un rango para `getCellRanges`. */
  aPublico(r: Rango): Record<string, unknown> {
    const cols = colsVisibles(this.#grid).slice(r.colDesde, r.colHasta + 1);
    return { startRow: { rowIndex: r.filaDesde, rowPinned: null }, endRow: { rowIndex: r.filaHasta, rowPinned: null }, columns: cols, startColumn: cols[0] };
  }

  /** `addCellRange({ rowStartIndex, rowEndIndex, columnStart, columnEnd, columns })`. */
  desdePublico(p: Record<string, unknown>): Rango | null {
    const cols = colsVisibles(this.#grid);
    const idDe = (c: unknown): string => (typeof c === 'string' ? c : (c as ColumnState | null)?.colId ?? '');
    const lista = Array.isArray(p['columns']) ? p['columns'].map(idDe) : [idDe(p['columnStart']), idDe(p['columnEnd'])];
    const indices = lista.map((id) => cols.findIndex((c) => c.colId === id)).filter((i) => i >= 0);
    if (!indices.length) return null;
    const desde = Number(p['rowStartIndex'] ?? 0);
    const hasta = Number(p['rowEndIndex'] ?? desde);
    return { filaDesde: Math.min(desde, hasta), filaHasta: Math.max(desde, hasta), colDesde: Math.min(...indices), colHasta: Math.max(...indices) };
  }
}
