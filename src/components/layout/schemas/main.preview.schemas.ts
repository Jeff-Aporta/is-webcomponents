// @contexto INDICE.md · src/components/layout/README.md
/**
 * main.preview.ts — tipos del behavior de `<iswc-main>`.
 *
 * W54: los tipos viven aquí.
 */

/**
 * `<iswc-main>`: HTMLElement con la API de scroll-memory que
 * `core/prefs.ts` le pega al host (`bindScrollMemoryApi`).
 *
 * El preview hace `querySelector<MainEl>('iswc-main')`: el tipo tiene que
 * ser un elemento real (hereda `scrollTop` y `addEventListener` de `Element`).
 */
export interface MainEl extends HTMLElement {
  /** Sube el scroll del contenedor a 0. */
  scrollToTop: (opts?: ScrollToOptions) => void;
  /** Guarda la posición actual en el storage del kit. */
  saveScroll: () => void;
  /** Borra la posición guardada. */
  clearRememberedScroll: () => void;
}
