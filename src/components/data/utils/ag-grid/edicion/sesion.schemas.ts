/** Tipos de sesion.ts. */

import type { ColumnState } from '../contrato.js';
import type { Flotante } from '../contrato.js';
import type { RowNode } from '../contrato.js';
import type { Editor } from './editores.js';

export type Montado = { col: ColumnState; editor: Editor; caja: HTMLElement; flotante: Flotante | null; antes: unknown; };

export type Sesion = { node: RowNode; indice: number; completa: boolean; montados: Map<string, Montado>; activa: string; };

export type Arranque = { tecla?: string | null; caracter?: string | null; };

export type AlCerrar = { rango: (valor: unknown, node: RowNode, colId: string) => void; anunciar: (texto: string) => void; };
