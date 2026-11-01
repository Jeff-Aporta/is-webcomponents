/**
 * filtros.schemas — Modelos de filtro de <iswc-ag-grid> con los nombres de AG Grid.
 *
 * Los modelos que entran por api (setFilterModel, setAdvancedFilterModel) se validan
 * aqui; son `looseObject` porque el consumidor puede traer campos extra y porque las
 * opciones propias de filterOptions no son una lista cerrada.
 */
import { z } from 'zod';
import type { ColumnState, RowNode } from '../../../schemas/datagrid-types.schemas.js';
import type { PanelFiltro } from './ui/panel-filtro.js';

export const OperadorUnionSchema = z.enum(['AND', 'OR']);
export type OperadorUnion = z.infer<typeof OperadorUnionSchema>;

export const TipoFiltroSchema = z.enum(['text', 'number', 'date', 'set', 'multi', 'boolean']);
export type TipoFiltro = z.infer<typeof TipoFiltroSchema>;

export const TipoCondicionSchema = z.enum(['text', 'number', 'date']);
export type TipoCondicion = z.infer<typeof TipoCondicionSchema>;

export const CondicionSchema = z.looseObject({ filterType: z.string().optional(), type: z.string().nullish(), filter: z.union([z.string(), z.number(), z.null()]).optional(), filterTo: z.union([z.string(), z.number(), z.null()]).optional(), dateFrom: z.string().nullish(), dateTo: z.string().nullish() });
export type Condicion = z.infer<typeof CondicionSchema>;

export const ModeloCombinadoSchema = z.looseObject({ filterType: z.string().optional(), operator: OperadorUnionSchema, conditions: z.array(CondicionSchema) });
export type ModeloCombinado = z.infer<typeof ModeloCombinadoSchema>;

export const ModeloSetSchema = z.looseObject({ filterType: z.literal('set'), values: z.array(z.union([z.string(), z.null()])) });
export type ModeloSet = z.infer<typeof ModeloSetSchema>;

export const ModeloMultiSchema = z.looseObject({ filterType: z.literal('multi'), filterModels: z.array(z.unknown()) });
export type ModeloMulti = z.infer<typeof ModeloMultiSchema>;

export const ModeloColumnaSchema = z.union([ModeloSetSchema, ModeloMultiSchema, ModeloCombinadoSchema, CondicionSchema]);
export type ModeloColumna = z.infer<typeof ModeloColumnaSchema>;

export const ModeloFiltrosSchema = z.record(z.string(), ModeloColumnaSchema);
export type ModeloFiltros = z.infer<typeof ModeloFiltrosSchema>;

export const CondicionAvanzadaSchema = z.looseObject({ filterType: z.string(), colId: z.string(), type: z.string(), filter: z.union([z.string(), z.number(), z.null()]).optional(), filterTo: z.union([z.string(), z.number(), z.null()]).optional() });
export type CondicionAvanzada = z.infer<typeof CondicionAvanzadaSchema>;

export const GrupoAvanzadoSchema = z.looseObject({ filterType: z.literal('join'), type: OperadorUnionSchema, conditions: z.array(z.unknown()) });
export type GrupoAvanzado = { filterType: 'join'; type: OperadorUnion; conditions: ModeloAvanzado[]; [extra: string]: unknown };
export type ModeloAvanzado = CondicionAvanzada | GrupoAvanzado;

export const OpcionFiltroSchema = z.looseObject({ displayKey: z.string(), displayName: z.string().optional(), numberOfInputs: z.number().optional() });
export type OpcionFiltroDef = z.infer<typeof OpcionFiltroSchema> & { predicate?: (valores: unknown[], valorCelda: unknown) => boolean };
export type OpcionFiltro = { clave: string; etiqueta: string; entradas: number; predicado?: (valores: unknown[], valorCelda: unknown) => boolean };

export type ParamsFiltro = Record<string, unknown>;
export type ContextoValor = { valor: unknown; texto: string; data: unknown; node: unknown; col: unknown; def: Record<string, unknown>; ahora: () => Date };
export type PruebaHija = (modelo: unknown, indice: number) => boolean;

export type ItemSet = { clave: string | null; etiqueta: string; valor: unknown; ruta?: string[] };
export type NodoArbolSet = { id: string; etiqueta: string; nivel: number; hijos: NodoArbolSet[]; item: ItemSet | null };
export type MarcaTodo = 'all' | 'some' | 'none';

export type ErrorAvanzado = { mensaje: string; posicion: number };
export type ResultadoAvanzado = { modelo: ModeloAvanzado | null; error: ErrorAvanzado | null };
export type ColumnaAvanzada = { colId: string; nombre: string; tipo: string };
export type TokenAvanzado = { t: 'col' | 'texto' | 'pal' | 'op' | 'par'; v: string; pos: number };

export type DirOrden = 'asc' | 'desc' | null;
export type ItemOrden = { colId: string; dir: 'asc' | 'desc'; type?: 'default' | 'absolute' };
export type OpcionesClicOrden = { multi: boolean; orden?: Array<string | null>; absoluto?: boolean };
export type ColumnaOrden = { colId: string; tipo: string; comparador?: (a: unknown, b: unknown, nodoA: unknown, nodoB: unknown, desc: boolean) => number; valor: (node: unknown) => unknown };

export type ResumenPagina = { pagina: number; paginas: number; desde: number; hasta: number; total: number; tam: number };

export type FuncionAgregado = 'count' | 'sum' | 'min' | 'max' | 'avg';
export type ResultadoAgregados = { count: number; sum: number | null; min: number | null; max: number | null; avg: number | null };

export type PanelLateralDef = { id: string; labelDefault?: string; labelKey?: string; iconKey?: string; toolPanel?: unknown; toolPanelParams?: Record<string, unknown>; minWidth?: number; maxWidth?: number; width?: number };
export type SideBarDef = { toolPanels: PanelLateralDef[]; defaultToolPanel: string | null; hiddenByDefault: boolean; position: 'left' | 'right'; hideButtons: boolean };

export type NodoColumna = { id: string; etiqueta: string; colId: string | null; hijos: NodoColumna[] };
export type DefItemMenu = Record<string, unknown>;

/* Tipos internos de los paneles */
export type ConValor = HTMLElement & { value: string };
export type ActivoFiltro = { col: ColumnState; prueba: (node: RowNode) => boolean };
export type OpcionesPanelFiltro = { tipo?: TipoFiltro; params?: ParamsFiltro; modelo?: ModeloColumna | null; alCambiar?: (m: ModeloColumna | null) => void; alCerrar?: () => void; sinBotones?: boolean };
export type FilaSet = { nodo: NodoArbolSet | null; item: ItemSet; nivel: number };
export type CeldaFlotante = { col: ColumnState; el: HTMLElement; entrada: ConValor | null };
export type SeccionColumnas = 'grupos' | 'valores' | 'pivotes';
export type InstanciaPanel = { el: HTMLElement; refrescar?: (colIds?: string[]) => void };
export type PanelMontado = { def: PanelLateralDef; instancia: InstanciaPanel; pestana: HTMLElement | null };
export type DefPanelEstado = { statusPanel?: unknown; align?: string; key?: string; statusPanelParams?: Record<string, unknown> };
export type PanelEstadoVivo = { def: DefPanelEstado; el: HTMLElement; pintar: () => void; instancia: unknown };
export type RangoCeldas = { startRow?: { rowIndex: number }; endRow?: { rowIndex: number }; columns?: Array<{ colId?: string; getColId?: () => string }> };
export type EstadoOverlay = 'loading' | 'noRows' | 'noMatchingRows' | null;
export type EntradaPanelFiltros = { col: ColumnState; caja: HTMLElement; panel: PanelFiltro | null; cuerpo: HTMLElement; flecha: HTMLElement; boton: HTMLElement; punto: HTMLElement };
