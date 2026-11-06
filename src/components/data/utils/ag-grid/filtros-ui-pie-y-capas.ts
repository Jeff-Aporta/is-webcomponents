/**
 * ui/pie-y-capas — Status Bar en zona('estado') y overlays sobre el cuerpo.
 */
import { agregados, funcionesAgregado } from './filtros-resumen.js';
import { TEXTOS } from './filtros-textos.js';
import { crear } from './filtros-ui-controles.js';
import type { DefPanelEstado, EstadoOverlay, FuncionAgregado, PanelEstadoVivo, RangoCeldas } from './filtros.schemas.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { GridHost, PanelEstado } from './contrato.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import '@jeff-aporta/iswc-base/components/feedback/empty-state.js';

const DEFECTO: DefPanelEstado[] = [{ statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' }, { statusPanel: 'agSelectedRowCountComponent', align: 'center' }, { statusPanel: 'agAggregationComponent', align: 'right' }];
const NUMERO = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function numero(n: number): string {
  return NUMERO.format(n);
}

export class BarraEstado {
  #grid: GridHost;
  #raiz = crear('div', 'iswc-ag-estado');
  #lados: Record<string, HTMLElement> = { left: crear('div', 'iswc-ag-estado__lado'), center: crear('div', 'iswc-ag-estado__lado iswc-ag-estado__lado--centro'), right: crear('div', 'iswc-ag-estado__lado iswc-ag-estado__lado--derecha') };
  #vivos: PanelEstadoVivo[] = [];
  #propios = new Map<string, PanelEstado>();

  constructor(motor: MotorFiltros) {
    this.#grid = motor.grid;
    this.#raiz.append(this.#lados['left'] as HTMLElement, this.#lados['center'] as HTMLElement, this.#lados['right'] as HTMLElement);
    this.#raiz.setAttribute('role', 'status');
  }

  #t(clave: string): string {
    return this.#grid.texto(clave, TEXTOS[clave] ?? clave);
  }

  registrar(p: PanelEstado): void {
    this.#propios.set(p.id, p);
  }

  /** statusBar: true usa los paneles por defecto; { statusPanels } los que pida; lo demas apaga la barra. */
  configurar(valor: unknown): void {
    for (const l of Object.values(this.#lados)) l.replaceChildren();
    this.#vivos = [];
    const lista = valor === true ? DEFECTO : (valor as { statusPanels?: DefPanelEstado[] } | null)?.statusPanels;
    if (!Array.isArray(lista) || !lista.length) {
      this.#raiz.remove();
      return;
    }
    const zona = this.#grid.zona('estado');
    if (this.#raiz.parentElement !== zona) zona.append(this.#raiz);
    for (const def of lista) this.#montar(def);
    this.pintar();
  }

  #montar(def: DefPanelEstado): void {
    const vivo = this.#construir(def);
    if (!vivo) return;
    this.#vivos.push(vivo);
    (this.#lados[def.align ?? 'right'] ?? this.#lados['right'] as HTMLElement).append(vivo.el);
  }

  #construir(def: DefPanelEstado): PanelEstadoVivo | null {
    const fijo = (texto: () => string): PanelEstadoVivo => {
      const el = crear('span', 'iswc-ag-estado__panel');
      return { def, el, instancia: null, pintar: () => { el.textContent = texto(); } };
    };
    const tipo = def.statusPanel;
    if (tipo === 'agTotalRowCountComponent') return fijo(() => `${this.#t('totalRows')}: ${numero(this.#total())}`);
    if (tipo === 'agFilteredRowCountComponent') return this.#condicional(fijo(() => `${this.#t('filteredRows')}: ${numero(this.#filtradas())}`), () => this.#filtradas() !== this.#total());
    if (tipo === 'agSelectedRowCountComponent') return this.#condicional(fijo(() => `${this.#t('selectedRows')}: ${numero(this.#seleccion())}`), () => this.#seleccion() > 0);
    if (tipo === 'agTotalAndFilteredRowCountComponent') return fijo(() => this.#textoTotalFiltradas());
    if (tipo === 'agAggregationComponent') return this.#agregacion(def);
    return this.#propio(def);
  }

  #condicional(v: PanelEstadoVivo, visible: () => boolean): PanelEstadoVivo {
    const base = v.pintar;
    return { ...v, pintar: () => {
      v.el.hidden = !visible();
      base();
    } };
  }

  #propio(def: DefPanelEstado): PanelEstadoVivo | null {
    const registrado = typeof def.statusPanel === 'string' ? this.#propios.get(def.statusPanel) : undefined;
    if (registrado) return { def, el: registrado.crear(this.#grid), instancia: null, pintar: () => undefined };
    if (typeof def.statusPanel !== 'function') return null;
    const fn = def.statusPanel as (p: Record<string, unknown>) => unknown;
    const ctx = { ...def.statusPanelParams, api: (this.#grid.el as HTMLElement & { api?: unknown }).api };
    const esClase = /^class\s/.test(Function.prototype.toString.call(fn));
    const creado = esClase ? new (fn as unknown as new () => { init?: (p: unknown) => void; getGui: () => HTMLElement })() : fn(ctx);
    if (creado instanceof HTMLElement) return { def, el: creado, instancia: creado, pintar: () => undefined };
    const inst = creado as { init?: (p: unknown) => void; getGui: () => HTMLElement };
    inst.init?.(ctx);
    return { def, el: inst.getGui(), instancia: inst, pintar: () => undefined };
  }

  #total(): number { return this.#grid.modelo()?.getAllRows().length ?? 0; }

  #filtradas(): number { return this.#grid.estado()?.totalRows ?? 0; }

  #seleccion(): number { return this.#grid.estado()?.selection.size ?? 0; }

  #textoTotalFiltradas(): string {
    const total = this.#total();
    const filtradas = this.#filtradas();
    if (filtradas === total) return `${this.#t('totalAndFilteredRows')}: ${numero(total)}`;
    return `${this.#t('totalAndFilteredRows')}: ${numero(filtradas)} ${this.#t('of')} ${numero(total)}`;
  }

  /** Solo aparece con un rango de celdas y valores numericos; el rango lo publica edicion. */
  #agregacion(def: DefPanelEstado): PanelEstadoVivo {
    const el = crear('span', 'iswc-ag-estado__panel iswc-ag-estado__panel--agregados');
    const funciones = funcionesAgregado(def.statusPanelParams?.['aggFuncs']);
    const pintar = (): void => {
      const valores = this.#valoresRango();
      const r = agregados(valores);
      el.hidden = valores.length < 2 || r.count === 0;
      if (el.hidden) return;
      el.replaceChildren(...funciones.flatMap((f: FuncionAgregado) => {
        const v = r[f];
        if (v === null) return [];
        const parte = crear('span', '', `${this.#t(f)}: `);
        parte.append(crear('b', '', numero(v)));
        return [parte];
      }));
    };
    return { def, el, instancia: null, pintar };
  }

  #valoresRango(): unknown[] {
    const api = (this.#grid.el as HTMLElement & { api?: { getCellRanges?: () => RangoCeldas[] | null } }).api;
    const rangos = api?.getCellRanges?.() ?? [];
    const salida: unknown[] = [];
    for (const r of rangos) {
      const a = r.startRow?.rowIndex ?? 0;
      const b = r.endRow?.rowIndex ?? a;
      for (let i = Math.min(a, b); i <= Math.max(a, b); i += 1) {
        const fila = this.#grid.filaEn(i) as { node?: RowNode } | null;
        if (!fila?.node) continue;
        for (const c of r.columns ?? []) {
          const col = this.#grid.columna(c.getColId?.() ?? c.colId ?? '');
          if (col) salida.push(this.#grid.valor(col, fila.node));
        }
      }
    }
    return salida;
  }

  pintar(): void {
    for (const v of this.#vivos) v.pintar();
  }

  getStatusPanel(key: string): unknown {
    const v = this.#vivos.find((x) => x.def.key === key);
    return v ? v.instancia ?? v.el : null;
  }

  destruir(): void {
    this.#raiz.remove();
  }
}

export class Overlays {
  #grid: GridHost;
  #capa = crear('div', 'iswc-ag-overlay');
  #mostrado: EstadoOverlay = null;
  /** Forzado por api; undefined = decide el estado de la grilla. */
  #forzado: EstadoOverlay | undefined = undefined;
  #conteo = -1;

  constructor(motor: MotorFiltros) {
    this.#grid = motor.grid;
    this.#capa.hidden = true;
  }

  #t(clave: string): string {
    return this.#grid.texto(clave, TEXTOS[clave] ?? clave);
  }

  showLoadingOverlay(): void {
    this.#forzado = 'loading';
    this.actualizar();
  }

  showNoRowsOverlay(): void {
    this.#forzado = 'noRows';
    this.actualizar();
  }

  hideOverlay(): void {
    this.#forzado = null;
    this.actualizar();
  }

  #automatico(): EstadoOverlay {
    if (this.#grid.opcion('loading') === true) return 'loading';
    const api = this.#grid.modelo();
    if (!api) return 'loading';
    if (this.#grid.opcion('suppressNoRowsOverlay') === true) return null;
    if (this.#grid.opcion('rowModelType', 'clientSide') !== 'clientSide') return null;
    if (api.getAllRows().length === 0) return 'noRows';
    return (this.#grid.estado()?.totalRows ?? 1) === 0 ? 'noMatchingRows' : null;
  }

  actualizar(): void {
    const conteo = (this.#grid.modelo()?.getAllRows().length ?? 0) * 1e7 + (this.#grid.estado()?.totalRows ?? 0);
    if (conteo !== this.#conteo && this.#conteo !== -1) this.#forzado = undefined;
    this.#conteo = conteo;
    const carga = this.#grid.opcion('loading') === true;
    const quiere = carga ? 'loading' : this.#forzado !== undefined ? this.#forzado : this.#automatico();
    if (quiere === this.#mostrado) return;
    this.#mostrado = quiere;
    this.#capa.hidden = quiere === null;
    if (quiere === null) return;
    const zona = this.#grid.zona('principal');
    if (this.#capa.parentElement !== zona) {
      if (getComputedStyle(zona).position === 'static') zona.style.position = 'relative';
      zona.append(this.#capa);
    }
    const arriba = this.#grid.zona('cabecera').getBoundingClientRect().bottom - zona.getBoundingClientRect().top;
    this.#capa.style.insetBlockStart = `${Math.max(0, arriba) / (Number.parseFloat(getComputedStyle(zona).fontSize) || 16)}em`;
    this.#pintar(quiere);
  }

  #pintar(estado: Exclude<EstadoOverlay, null>): void {
    const plantilla = this.#grid.opcion<string | undefined>(estado === 'loading' ? 'overlayLoadingTemplate' : 'overlayNoRowsTemplate');
    if (typeof plantilla === 'string' && plantilla) {
      this.#capa.innerHTML = plantilla;
      return;
    }
    const vacio = crear('iswc-empty-state');
    const claves: Record<string, string> = { loading: 'loadingOoo', noRows: 'noRowsToShow', noMatchingRows: 'noMatchingRows' };
    vacio.setAttribute('titulo', this.#t(claves[estado] as string));
    vacio.setAttribute('estado', estado === 'loading' ? 'cargando' : 'vacio');
    vacio.setAttribute('texto-cargando', this.#t('loadingOoo'));
    if (estado === 'noMatchingRows') vacio.setAttribute('icono', 'mdi:filter-off-outline');
    this.#capa.replaceChildren(vacio);
  }

  destruir(): void {
    this.#capa.remove();
  }
}
