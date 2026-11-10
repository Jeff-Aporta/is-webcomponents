// @contexto INDICE.md · src/components/data/README.md
/** Tipos de interaccion.ts. */
import type { ManejadorCelda, ManejadorTeclado } from './contrato.schemas.js';
import type { SelectionModeLocal } from './nucleo-tipos.schemas.js';

export type PuertosInteraccion = { modo: () => SelectionModeLocal; seleccionPropia: () => boolean; ordenar: (colId: string, ev: MouseEvent) => void; abrirFiltro: (colId: string, ancla: HTMLElement) => void; };

export type Manejadores = { teclado: ManejadorTeclado[]; abajo: ManejadorCelda[]; clic: ManejadorCelda[]; dobleClic: ManejadorCelda[]; };
