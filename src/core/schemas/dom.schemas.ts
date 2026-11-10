// @contexto INDICE.md · src/core/README.md
/**
 * dom-utils.schemas.ts — tipos de `core/dom.ts`.
 */

/** Hijo admitido por `crearNodo`: nodos, texto, o nada (`null`/`undefined`/`false` se omiten). */
export type HijoNodo = Node | string | null | undefined | false;
