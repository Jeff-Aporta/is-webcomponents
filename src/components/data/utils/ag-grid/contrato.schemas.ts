/** Tipos de contrato.ts. */

import type { ColumnFilter, ColumnState, DisplayRow, FilterModel, GridApi, GridState, RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

export type Desinstalar = () => void;

export type InstalarPlugin = (grid: GridHost) => Desinstalar | void;

export type GridPlugin = { nombre: string; instalar: InstalarPlugin };

/** Nombres de AG Grid tal cual (columnDefs, rowData, defaultColDef, ...); el host los normaliza. */
export type OpcionesGrid = Record<string, unknown>;

/** ColDef con nombres de AG Grid; siempre leer via `grid.defDe(col)`, ya fusionado con defaultColDef y columnTypes. */
export type ColDefAg = Record<string, unknown> & { field?: string; colId?: string; headerName?: string; };

export type ContextoCelda = { grid: GridHost; col: ColumnState; def: ColDefAg; node: RowNode | null; data: RowData | null; value: unknown; texto: string; rowIndex: number; params: Record<string, unknown>; };

/** Devuelve HTML ya escapado. `grid.escapar()` para valores del usuario. */
export type RendererCelda = (ctx: ContextoCelda) => string;

/** Variante con ciclo de vida: `montar` se llama con la celda ya en el DOM; devuelve limpieza opcional. */
export type RendererMontable = { html: RendererCelda; montar?: (celda: HTMLElement, ctx: ContextoCelda) => Desinstalar | void; };

/** Filtro de columna: `filtro` es el del FilterModel; `valor` ya pasa por filterValueGetter. */
export type EvaluadorFiltro = { tipo: string; coincide: (filtro: ColumnFilter | Record<string, unknown>, valor: unknown, texto: string, node: RowNode, col: ColumnState) => boolean; activo?: (filtro: unknown) => boolean; etiqueta?: (filtro: unknown, col: ColumnState) => string; };

export type EtapaPipeline = 'filtrar' | 'ordenar' | 'agrupar' | 'aplanar';

/** `activo`: si devuelve false, una transaccion que solo actualiza filas no repite el pipeline por este transformador. */
export type TransformadorFilas = { etapa: EtapaPipeline; depende: string[]; aplicar: (filas: unknown[], grid: GridHost) => unknown[]; activo?: () => boolean; };

/** Fila de display extra que aportan los plugins, ademas de group/leaf. */
export type FilaExtra = { kind: string; id: string; level: number; node?: RowNode; alto?: number; html?: string; montar?: (fila: HTMLElement) => Desinstalar | void; pegar?: 'arriba' | 'abajo'; };

/** `pegar`: fila siempre renderizada y sticky; el transformador `aplanar` la deja al inicio/final de la lista. */
export type FilaDisplay = (DisplayRow & { pegar?: 'arriba' | 'abajo' }) | FilaExtra;

/** Modelo externo (infinite, serverSide, viewport). `filaEn` puede devolver null: el host pinta esqueleto y la pide con `asegurar`. */
export type ModeloFilas = { tipo: string; total: () => number; filaEn: (indice: number) => FilaDisplay | null; asegurar: (desde: number, hasta: number) => void; refrescar?: (motivo: string) => void; destruir?: Desinstalar; };

export type ItemMenu = { id?: string; texto?: string; icono?: string; atajo?: string; marcado?: boolean; deshabilitado?: boolean; separador?: boolean; hijos?: ItemMenu[]; accion?: () => void; };

export type ContextoMenu = { tipo: 'columna' | 'contexto'; col: ColumnState | null; node: RowNode | null; value?: unknown; };

export type ProveedorMenu = (ctx: ContextoMenu) => ItemMenu[];

export type PanelLateral = { id: string; texto: string; icono: string; crear: (grid: GridHost) => HTMLElement; alMostrar?: () => void; };

export type PanelEstado = { id: string; alinear?: 'left' | 'center' | 'right'; crear: (grid: GridHost) => HTMLElement; };

export type Exportador = { formato: string; texto: string; icono?: string; generar: (params: Record<string, unknown>) => Blob | Promise<Blob>; extension: string; };

export type Rect = { arriba: number; izquierda: number; ancho: number; alto: number; };

export type Flotante = { el: HTMLElement; abrir: (ancla: Element | Rect) => void; cerrar: () => void; };

export type Capa = 'rango' | 'edicion' | 'arrastre';

/** Zonas de montaje estables: `cabecera` (sticky, tras la fila de encabezados), `principal` (junto al viewport), `pie` y `estado` (dentro del pie). */
export type Zona = 'cabecera' | 'principal' | 'pie' | 'estado';

export type Decoracion = { clase?: string; prefijo?: string; titulo?: string; };

export type PresentacionCelda = { clases: string; estilo: string; titulo?: string; atributos?: string; };

export type PresentacionFila = { clases: string; estilo: string; };

/** Celda direccionada: `indice` es de la lista de display, no del dato. */
export type RefCelda = { indice: number; colId: string; };

export type EventoCelda = RefCelda & { evento: Event; node: RowNode | null; col: ColumnState; };

/** Devolver true detiene el procesamiento (el host no hace su comportamiento por defecto). */
export type ManejadorTeclado = (e: KeyboardEvent, foco: RefCelda | null) => boolean | void;

export type ManejadorCelda = (ev: EventoCelda) => boolean | void;

/** Lo unico que un plugin ve de la grilla. */
export type GridHost = {
  el: HTMLElement;
  shadow: ShadowRoot;
  /* opciones */
  opcion: <T = unknown>(nombre: string, porDefecto?: T) => T;
  fijarOpcion: (nombre: string, valor: unknown) => void;
  alCambiarOpcion: (nombre: string, fn: (valor: unknown) => void) => Desinstalar;
  /* modelo */
  modelo: () => GridApi | null;
  estado: () => GridState | null;
  columnas: () => ColumnState[];
  columna: (colId: string) => ColumnState | null;
  defDe: (col: ColumnState) => ColDefAg;
  valor: (col: ColumnState, node: RowNode) => unknown;
  texto: (clave: string, porDefecto: string) => string;
  textoCelda: (col: ColumnState, node: RowNode) => string;
  filaEn: (indice: number) => FilaDisplay | null;
  totalFilas: () => number;
  nodo: (id: string) => RowNode | null;
  fijarValor: (node: RowNode, colId: string, valor: unknown, origen?: string) => boolean;
  /* eventos */
  emitir: (evento: string, detalle?: Record<string, unknown>) => void;
  on: (evento: string, fn: (detalle: Record<string, unknown>) => void) => Desinstalar;
  /* api publica */
  exponer: (metodos: Record<string, (...args: never[]) => unknown>) => void;
  /* registros */
  renderer: (nombre: string, r: RendererCelda | RendererMontable) => void;
  /** Valor solo para pintar (batch edit); nunca para ordenar, filtrar ni agrupar. */
  fuenteValor: (fn: (col: ColumnState, node: RowNode) => { valor: unknown } | undefined) => Desinstalar;
  decorarCelda: (fn: (ctx: ContextoCelda) => Decoracion | void) => Desinstalar;
  editor: (nombre: string, crear: unknown) => void;
  filtro: (e: EvaluadorFiltro) => void;
  transformador: (t: TransformadorFilas) => Desinstalar;
  modeloFilas: (tipo: string, crear: (grid: GridHost) => ModeloFilas) => void;
  menu: (p: ProveedorMenu) => Desinstalar;
  panel: (p: PanelLateral) => void;
  panelEstado: (p: PanelEstado) => void;
  exportador: (e: Exportador) => void;
  /* interaccion */
  teclado: (fn: ManejadorTeclado) => Desinstalar;
  celdaAbajo: (fn: ManejadorCelda) => Desinstalar;
  celdaClic: (fn: ManejadorCelda) => Desinstalar;
  celdaDobleClic: (fn: ManejadorCelda) => Desinstalar;
  foco: () => RefCelda | null;
  enfocar: (ref: RefCelda | null) => void;
  /* render */
  em: (unidades: number) => string;
  escapar: (s: unknown) => string;
  capa: (nombre: Capa) => HTMLElement;
  zona: (nombre: Zona) => HTMLElement;
  flotante: (rol?: string) => Flotante;
  rectCelda: (ref: RefCelda) => Rect | null;
  celdaDe: (ref: RefCelda) => HTMLElement | null;
  asegurarVisible: (ref: RefCelda) => void;
  pedirRender: () => void;
  recomputar: (dep?: string) => void;
  refrescarCeldas: (ids?: string[], colIds?: string[]) => void;
  alturaFila: (id: string, unidades: number) => void;
};
