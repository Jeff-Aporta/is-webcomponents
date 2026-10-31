/** Tipos de cabecera.ts. */

import type { ColumnState } from '../contrato.js';

export type AccionesCabecera = { ordenar: (colId: string, ev: MouseEvent) => void; abrirMenu: (col: ColumnState, boton: HTMLElement) => void; abrirFiltro: (col: ColumnState, boton: HTMLElement) => void; alternarTodo: () => void; estadoTodo: () => 'all' | 'some' | 'none'; columnaSeleccion: () => boolean; multiple: () => boolean; };
