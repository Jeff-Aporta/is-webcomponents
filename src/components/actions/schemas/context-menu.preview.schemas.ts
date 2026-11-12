// @contexto INDICE.md · src/components/actions/README.md
/**
 * context-menu.preview.ts — tipos del behavior de `<iswc-context-menu>`.
 *
 * W54: los tipos viven aquí.
 */

/**
 * Evento custom con `detail` tipado.
 *
 * Es el `CustomEvent<T>` del navegador, visto por el preview: cada
 * consumidor declara la forma de su detalle (aquí, `{ value?: string }`).
 */
export interface CustomEventWithDetail<T = unknown> {
  detail?: T;
}
