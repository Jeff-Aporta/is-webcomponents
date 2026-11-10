// @contexto INDICE.md · src/components/data/README.md
/** Tipos de host.ts. */
import type { Capa, Zona } from './contrato.schemas.js';
import type { GridApi } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { SelectionModeLocal } from './nucleo-tipos.schemas.js';
import type { crearNucleo } from './nucleo-ag-host.js';

export type PiezasNucleo = { viewport: HTMLElement; cuerpo: HTMLElement; zonaArriba: HTMLElement; zonaAbajo: HTMLElement; cabecera: HTMLElement; grupos: HTMLElement; filaCabecera: HTMLElement; sondaFila: HTMLElement; capas: Record<Capa, HTMLElement>; zonas: Record<Zona, HTMLElement>; };

export type PuertosNucleo = { modelo: () => GridApi | null; modoSeleccion: () => SelectionModeLocal; };

export type Nucleo = ReturnType<typeof crearNucleo>;
