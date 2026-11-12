// @contexto INDICE.md · src/components/actions/README.md
/**
 * button.preview.ts — tipos del behavior de `<iswc-button>`.
 *
 * W54: los tipos viven aquí.
 */

/**
 * Contexto de montaje del playground de `<iswc-button>`.
 *
 * `main`/`root` son el contenedor donde el preview pintó el demo: el
 * playground busca ahí sus nodos. Si no hay contexto, el behavior cae al
 * `document`.
 */
export interface MountCtx {
  /** Contenedor principal del preview. */
  main?: HTMLElement;
  /** Raíz del preview. */
  root?: HTMLElement;
}
