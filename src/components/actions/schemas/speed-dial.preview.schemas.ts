// @contexto INDICE.md · src/components/actions/README.md
/**
 * speed-dial.preview.ts — tipos del behavior de `<iswc-speed-dial>`.
 *
 * W54: los tipos viven aquí.
 */

/**
 * Evento custom con `detail` tipado.
 *
 * Es el `CustomEvent<T>` del navegador, visto por el preview: cada
 * consumidor declara la forma de su detalle (aquí, `{ open?: boolean }` o
 * `{ action?: … }`).
 */
export interface CustomEventWithDetail<T = unknown> {
  detail?: T;
}
