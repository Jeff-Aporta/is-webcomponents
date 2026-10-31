/** Tipos de host.ts. */

import type { Capa, GridApi, Zona } from '../contrato.js';
import type { SelectionModeLocal } from './tipos.js';
import type { crearNucleo } from './host.js';

export type PiezasNucleo = { viewport: HTMLElement; cuerpo: HTMLElement; zonaArriba: HTMLElement; zonaAbajo: HTMLElement; cabecera: HTMLElement; grupos: HTMLElement; filaCabecera: HTMLElement; sondaFila: HTMLElement; capas: Record<Capa, HTMLElement>; zonas: Record<Zona, HTMLElement>; };

export type PuertosNucleo = { modelo: () => GridApi | null; modoSeleccion: () => SelectionModeLocal; };

export type Nucleo = ReturnType<typeof crearNucleo>;
