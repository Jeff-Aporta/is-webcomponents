/** Tipos de host.ts. */

import type { Capa, Zona } from '../contrato.schemas.js';
import type { GridApi } from '../../../schemas/datagrid-types.schemas.js';
import type { SelectionModeLocal } from './tipos.schemas.js';
import type { crearNucleo } from './ag-host.js';

export type PiezasNucleo = { viewport: HTMLElement; cuerpo: HTMLElement; zonaArriba: HTMLElement; zonaAbajo: HTMLElement; cabecera: HTMLElement; grupos: HTMLElement; filaCabecera: HTMLElement; sondaFila: HTMLElement; capas: Record<Capa, HTMLElement>; zonas: Record<Zona, HTMLElement>; };

export type PuertosNucleo = { modelo: () => GridApi | null; modoSeleccion: () => SelectionModeLocal; };

export type Nucleo = ReturnType<typeof crearNucleo>;
