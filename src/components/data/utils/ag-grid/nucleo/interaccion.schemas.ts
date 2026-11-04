/** Tipos de interaccion.ts. */

import type { ManejadorCelda, ManejadorTeclado } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { SelectionModeLocal } from './tipos.schemas.js';

export type PuertosInteraccion = { modo: () => SelectionModeLocal; seleccionPropia: () => boolean; ordenar: (colId: string, ev: MouseEvent) => void; abrirFiltro: (colId: string, ancla: HTMLElement) => void; };

export type Manejadores = { teclado: ManejadorTeclado[]; abajo: ManejadorCelda[]; clic: ManejadorCelda[]; dobleClic: ManejadorCelda[]; };
