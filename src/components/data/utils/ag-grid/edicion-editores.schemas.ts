// @contexto INDICE.md · src/components/data/README.md
/** Tipos de editores.ts. */
import type { ColDefAg, GridHost } from './contrato.schemas.js';
import type { Parametros } from './edicion-apoyo.schemas.js';
import type { OpcionLista } from './edicion.schemas.js';

/** Contrato interno de un editor montado en la capa de edicion. */
export type Editor = { el: HTMLElement; popup: boolean; valor: () => unknown; enfocar: (seleccionar: boolean) => void; errores: () => string[]; destruir?: () => void; cancelarAntes?: () => boolean; cancelarDespues?: () => boolean; alEntrar?: () => void; alSalir?: () => void; retieneEnter?: (e: KeyboardEvent) => boolean; };

export type EntornoEditor = { grid: GridHost; def: ColDefAg; params: Parametros; extra: Parametros; inicial: unknown; caracter: string | null; borrar: boolean; terminar: (cancelar: boolean) => void; };

export type CrearEditor = (entorno: EntornoEditor) => Editor;

export type ConValor = HTMLElement & { value: string; focus: () => void; select?: () => void };

export type ConChecked = HTMLElement & { checked: boolean };

export type EstadoRico = { opciones: OpcionLista[]; visibles: OpcionLista[]; activo: number; marcadas: unknown[] };

export type EditorPropio = { init?: (p: Parametros) => void; getGui?: () => HTMLElement; getValue?: () => unknown; afterGuiAttached?: () => void; destroy?: () => void; isPopup?: () => boolean; isCancelBeforeStart?: () => boolean; isCancelAfterEnd?: () => boolean; focusIn?: () => void; focusOut?: () => void; getValidationErrors?: () => string[] | null; };
