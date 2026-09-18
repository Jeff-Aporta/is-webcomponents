/**
 * popup-dismiss.js — el "mientras está abierto" de un popup.
 *
 * Todo panel flotante del kit (is-dropdown, is-context-menu, y cualquiera que
 * venga) necesita exactamente lo mismo mientras está abierto:
 *
 *   · Escape lo cierra.
 *   · Un pointerdown fuera lo cierra.
 *   · Al hacer scroll o redimensionar, o se recoloca o se cierra.
 *   · Y al cerrar hay que quitar TODOS esos listeners, incluidos los que se
 *     pusieron en `document` y `window`, que sobreviven al elemento.
 *
 * Eso último es lo que hace que valga la pena tenerlo en un sitio: cada
 * componente lo escribía con su propio par `#setupListeners/#teardown`, y
 * basta olvidar un `capture: true` en el remove para dejar un listener global
 * colgado del documento cada vez que se abre el panel.
 *
 * Este módulo NO decide dónde se coloca el panel ni cómo se abre: el anclaje
 * de is-dropdown (a un trigger) y el de is-context-menu (a las coordenadas
 * del click derecho) son distintos a propósito, y forzarlos al mismo molde
 * complicaría los dos. Aquí solo vive el ciclo de escucha.
 *
 * Uso:
 *
 *   #dismiss = createPopupDismiss(this, {
 *     onEscape:     () => this.close(),
 *     onOutside:    () => this.close(),
 *     onReposition: () => this.#reposition(),   // ya viene con rAF
 *   });
 *
 *   abrir()  { …;  this.#dismiss.attach(); }
 *   cerrar() { …;  this.#dismiss.detach(); }
 */

/**
 * Opciones del ciclo de cierre compartido por is-dropdown, is-context-menu,
 * is-palette-selector y cualquier popup que necesite el patrón "abrir →
 * escuchar Escape/fuera/scroll → cerrar y limpiar".
 */
export interface PopupDismissOpciones {
  /** Escape pulsado. */
  onEscape?: () => void;
  /** Cualquier tecla, para navegación propia del panel (flechas). Comparte el
   *  mismo listener que `onEscape`. */
  onKeydown?: (e: KeyboardEvent) => void;
  /** pointerdown fuera del host. */
  onOutside?: () => void;
  /** scroll o resize. Se llama como mucho una vez por frame. */
  onReposition?: () => void;
  /** scroll en crudo, con el evento y sin agrupar por frame. Lo necesita
   *  quien CIERRA al hacer scroll en vez de recolocarse. */
  onScroll?: (e: Event) => void;
  /** Congela el scroll del documento mientras esté enganchado. */
  scrollLock?: boolean;
}

/**
 * @param host  El componente dueño del popup. Se usa para saber qué es
 *              "dentro" (vía `composedPath`, que sí atraviesa el Shadow DOM:
 *              con `e.target` a secas un click en el panel parecería venir
 *              de fuera).
 * @returns `{ attach, detach, get attached() }`
 */
export function createPopupDismiss(host: HTMLElement, opciones: PopupDismissOpciones = {}) {
  const {
    onEscape,
    onKeydown,
    onOutside,
    onReposition,
    onScroll,
    scrollLock = false,
  } = opciones;
  let enganchado = false;
  let raf = 0;
  let overflowPrevio: string | null = null;

  const alPulsar = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onEscape?.();
    onKeydown?.(e);
  };

  const alApuntar = (e: PointerEvent) => {
    // composedPath ve el interior del shadow: sin esto, un pointerdown en el
    // propio panel se leería como "fuera" y lo cerraría al instante.
    if (e.composedPath().includes(host)) return;
    onOutside?.();
  };

  const alMover = () => {
    if (!onReposition) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => onReposition());
  };

  return {
    get attached() { return enganchado; },

    attach() {
      if (enganchado) return;
      enganchado = true;

      if (onEscape || onKeydown) document.addEventListener('keydown', alPulsar, true);
      if (onOutside) document.addEventListener('pointerdown', alApuntar, true);

      if (scrollLock) {
        overflowPrevio = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      } else {
        // capture: el scroll de un contenedor interno no burbujea hasta
        // window; en fase de captura sí se ve.
        if (onScroll) window.addEventListener('scroll', onScroll, true);
        if (onReposition) {
          window.addEventListener('scroll', alMover, true);
          window.addEventListener('resize', alMover, { passive: true });
        }
      }
    },

    detach() {
      if (!enganchado) return;
      enganchado = false;

      document.removeEventListener('keydown', alPulsar, true);
      document.removeEventListener('pointerdown', alApuntar, true);
      if (onScroll) window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', alMover);
      cancelAnimationFrame(raf);

      if (overflowPrevio !== null) {
        document.documentElement.style.overflow = overflowPrevio;
        overflowPrevio = null;
      }
    },
  };
}
