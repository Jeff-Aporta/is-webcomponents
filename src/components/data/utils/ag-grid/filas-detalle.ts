// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filas/detalle — Maestro-detalle.
 *
 * Inserta una FilaExtra `detalle` tras cada maestro abierto. El contenido se
 * crea en `montar` (la virtualizacion descarta lo que sale de pantalla), asi que
 * 100.000 maestros no crean nada hasta verse. `keepDetailRows` conserva los
 * ultimos N elementos para no recrear la grilla interior al volver con scroll.
 */
import type { InfoDetalle, ParamsDetalle } from './filas.schemas.js';
import type { Desinstalar, FilaDisplay, FilaExtra, GridHost } from './contrato.schemas.js';
import type { RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

const ALTO_DEFECTO = 300;
const CLASE_TOGGLE = 'iswc-ag-detalle-toggle';
const PREFIJO = 'detail_';

export class ControladorDetalle {
  #grid: GridHost;
  #forzados = new Map<string, boolean>();
  #vivos = new Map<string, HTMLElement>();
  #info = new Map<string, InfoDetalle>();

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  activo(): boolean {
    return this.#grid.opcion<boolean>('masterDetail', false);
  }

  esMaestro(node: RowNode): boolean {
    const fn = this.#grid.opcion<((d: RowData) => boolean) | null>('isRowMaster', null);
    return typeof fn === 'function' ? fn(node.data) === true : true;
  }

  abierto(node: RowNode): boolean {
    const f = this.#forzados.get(node.id);
    if (f !== undefined) return f;
    const porFila = this.#grid.opcion<((p: Record<string, unknown>) => boolean) | null>('isMasterOpenByDefault', null);
    if (typeof porFila === 'function') return porFila({ data: node.data, rowNode: node }) === true;
    return this.#grid.opcion<boolean>('masterDefaultExpanded', false);
  }

  fijar(node: RowNode, abierto: boolean): void {
    this.#forzados.set(node.id, abierto);
    this.#grid.emitir('rowGroupOpened', { node, data: node.data, expanded: abierto });
    this.#grid.recomputar('filas');
  }

  #hayAbiertos(): boolean {
    if (this.#grid.opcion<boolean>('masterDefaultExpanded', false)) return true;
    if (typeof this.#grid.opcion('isMasterOpenByDefault', null) === 'function') return true;
    for (const v of this.#forzados.values()) if (v) return true;
    return false;
  }

  /** Pasa de largo sin copiar si nadie esta abierto. */
  insertar(filas: readonly FilaDisplay[], excluir: (n: RowNode) => boolean): FilaDisplay[] {
    if (!this.#hayAbiertos()) return filas as FilaDisplay[];
    const out: FilaDisplay[] = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i] as FilaDisplay;
      out.push(f);
      if (f.kind !== 'leaf') continue;
      const node = (f as { node: RowNode }).node;
      if (!excluir(node) && this.esMaestro(node) && this.abierto(node)) out.push(this.#fila(node, f.level));
    }
    return out;
  }

  #fila(node: RowNode, level: number): FilaExtra {
    const id = `${PREFIJO}${node.id}`;
    const dinamico = this.#grid.opcion<boolean>('detailRowAutoHeight', false);
    const porFila = this.#grid.opcion<((p: Record<string, unknown>) => number) | null>('getRowHeight', null);
    const fijo = this.#grid.opcion<number>('detailRowHeight', ALTO_DEFECTO);
    const alto = typeof porFila === 'function' ? porFila({ node, data: node.data }) ?? fijo : fijo;
    return { kind: 'detalle', id, level, node, alto, montar: (el: HTMLElement) => this.#montar(el, id, node, dinamico) };
  }

  #montar(fila: HTMLElement, id: string, node: RowNode, dinamico: boolean): Desinstalar {
    const guardado = this.#vivos.get(id);
    const hijo = guardado ?? this.#crear(id, node);
    this.#vivos.delete(id);
    fila.appendChild(hijo);
    const parar = dinamico ? this.#observarAlto(id, hijo) : null;
    return () => {
      parar?.();
      hijo.remove();
      this.#retener(id, hijo);
    };
  }

  #retener(id: string, el: HTMLElement): void {
    if (!this.#grid.opcion<boolean>('keepDetailRows', false)) {
      this.#info.delete(id);
      return;
    }
    this.#vivos.set(id, el);
    const maximo = this.#grid.opcion<number>('keepDetailRowsCount', 10);
    while (this.#vivos.size > maximo) {
      const primero = this.#vivos.keys().next().value as string;
      this.#vivos.delete(primero);
      this.#info.delete(primero);
    }
  }

  #observarAlto(id: string, el: HTMLElement): Desinstalar {
    const obs = new ResizeObserver(() => {
      const fuente = parseFloat(getComputedStyle(el).fontSize) || 16;
      this.#grid.alturaFila(id, (el.scrollHeight / fuente) * 16);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }

  #crear(id: string, node: RowNode): HTMLElement {
    const propio = this.#grid.opcion<unknown>('detailCellRenderer', null);
    const params = this.#grid.opcion<Record<string, unknown>>('detailCellRendererParams', {});
    const doc = this.#grid.el.ownerDocument;
    if (typeof propio === 'function') {
      const r = (propio as (p: Record<string, unknown>) => unknown)({ ...params, node, data: node.data, api: this.#grid.modelo() });
      if (r instanceof HTMLElement) return r;
      const caja = doc.createElement('div');
      caja.className = 'iswc-ag-detalle';
      caja.innerHTML = String(r ?? '');
      return caja;
    }
    return this.#grillaInterior(doc, id, node, params);
  }

  #grillaInterior(doc: Document, id: string, node: RowNode, params: Record<string, unknown>): HTMLElement {
    const el = doc.createElement('iswc-ag-grid');
    el.classList.add('iswc-ag-detalle');
    const opciones = (params['detailGridOptions'] ?? {}) as Record<string, unknown>;
    const fijar = (rowData: RowData[]): void => {
      (el as unknown as { gridOptions: Record<string, unknown> }).gridOptions = { ...opciones, rowData };
      this.#info.set(id, { id, api: (el as unknown as { api?: unknown }).api ?? null, el });
    };
    const pedir = params['getDetailRowData'] as ((p: ParamsDetalle) => void) | undefined;
    if (typeof pedir === 'function') pedir({ node, data: node.data, successCallback: fijar });
    else fijar([]);
    return el;
  }

  /** Renderer `agGroupCellRenderer` para la columna maestra: chevron mas el valor. */
  rendererHtml(node: RowNode | null, texto: string): string {
    const esc = this.#grid.escapar(texto);
    if (!node || !this.activo() || !this.esMaestro(node)) return esc;
    const icono = this.abierto(node) ? 'mdi:chevron-down' : 'mdi:chevron-right';
    const titulo = this.#grid.escapar(this.#grid.texto('expandRow', 'Expandir fila'));
    return `<button type="button" class="${CLASE_TOGGLE}" aria-label="${titulo}" aria-expanded="${this.abierto(node)}"><iswc-icon icon="${icono}"></iswc-icon></button>${esc}`;
  }

  /** Clic en el chevron. Devuelve true si lo atendio. */
  alClic(objetivo: EventTarget | null, node: RowNode | null): boolean {
    if (!node || !(objetivo instanceof Element) || !objetivo.closest(`.${CLASE_TOGGLE}`)) return false;
    this.fijar(node, !this.abierto(node));
    return true;
  }

  info(id: string): InfoDetalle | undefined {
    return this.#info.get(id.startsWith(PREFIJO) ? id : `${PREFIJO}${id}`);
  }

  cadaInfo(fn: (info: InfoDetalle, i: number) => void): void {
    let i = 0;
    for (const info of this.#info.values()) fn(info, i++);
  }

  agregarInfo(id: string, api: unknown): void {
    this.#info.set(id, { id, api, el: null });
  }

  quitarInfo(id: string): void {
    this.#info.delete(id);
  }

  destruir(): void {
    this.#vivos.clear();
    this.#info.clear();
  }
}
