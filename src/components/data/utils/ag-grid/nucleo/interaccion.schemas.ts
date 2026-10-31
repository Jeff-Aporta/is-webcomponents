/** Tipos de interaccion.ts. */

import type { ManejadorCelda, ManejadorTeclado, SelectionModeLocal } from './tipos.js';

export type PuertosInteraccion = { modo: () => SelectionModeLocal; seleccionPropia: () => boolean; ordenar: (colId: string, ev: MouseEvent) => void; abrirFiltro: (colId: string, ancla: HTMLElement) => void; };

export type Manejadores = { teclado: ManejadorTeclado[]; abajo: ManejadorCelda[]; clic: ManejadorCelda[]; dobleClic: ManejadorCelda[]; };
