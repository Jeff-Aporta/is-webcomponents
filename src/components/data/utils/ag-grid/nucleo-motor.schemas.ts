// @contexto INDICE.md · src/components/data/README.md
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ContextoCelda, Decoracion, Desinstalar, FilaDisplay, PresentacionCelda, PresentacionFila, RendererMontable } from './contrato.schemas.js';
import type { crearMotor } from './nucleo-motor.js';

/** Tipos de alturas.ts. */

export type VentanaFilas = { inicio: number; fin: number; total: number; };

// ── motor.schemas ──
/** Tipos de motor.ts. */
export type ColPos = { col: ColumnState; x: number; ancho: number; aria: number; };

export type Diseno = { izq: ColPos[]; centro: ColPos[]; der: ColPos[]; anchoIzq: number; anchoCentro: number; anchoDer: number; anchoTotal: number; total: number; };

export type PiezasMotor = { viewport: HTMLElement; cuerpo: HTMLElement; zonaArriba: HTMLElement; zonaAbajo: HTMLElement; cabecera: HTMLElement; sondaFila: HTMLElement; };

export type InternosMotor = { resolver: (ctx: ContextoCelda) => RendererMontable; presentarCelda: (ctx: ContextoCelda) => PresentacionCelda | null; presentarFila: (node: RowNode, indice: number) => PresentacionFila | null; decorar: (ctx: ContextoCelda) => Decoracion[]; columnaSeleccion: () => boolean; multiple: () => boolean; seleccionados: () => Set<string>; expuesto: (nombre: string) => unknown; ocupado: () => boolean; };

export type RecCelda = { el: HTMLElement; html: string; clase: string; estilo: string; limpiar: Desinstalar | null; };

export type RecFila = { el: HTMLElement; tipo: string; clave: string; indice: number; gen: number; ventana: string; top: number; celdas: Map<string, RecCelda>; secs: HTMLElement[]; limpiar: Desinstalar | null; medido: boolean; };

export type GrupoFila = Extract<FilaDisplay, { kind: 'group' }>;

export type Motor = ReturnType<typeof crearMotor>;
