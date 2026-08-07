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
 * @param {HTMLElement} host  El componente dueño del popup. Se usa para saber
 *                            qué es "dentro" (vía `composedPath`, que sí
 *                            atraviesa el Shadow DOM: con `e.target` a secas
 *                            un click en el panel parecería venir de fuera).
 * @param {object} opciones
 * @param {() => void} [opciones.onEscape]      Escape pulsado.
 * @param {(e: KeyboardEvent) => void} [opciones.onKeydown]  Cualquier tecla,
 *                                              para la navegación propia del
 *                                              panel (flechas en un menú).
 *                                              Comparte el mismo listener que
 *                                              `onEscape`.
 * @param {() => void} [opciones.onOutside]     pointerdown fuera del host.
 * @param {() => void} [opciones.onReposition]  scroll o resize. Se llama como
 *                                              mucho una vez por frame.
 * @param {(e: Event) => void} [opciones.onScroll]  scroll en crudo, con el
 *                                              evento y sin agrupar por frame.
 *                                              Es lo que necesita quien CIERRA
 *                                              al hacer scroll en vez de
 *                                              recolocarse: hace falta mirar
 *                                              el `composedPath` para no
 *                                              cerrarse por su propio scroll
 *                                              interno, y ese dato se pierde
 *                                              si se agrupa por frame.
 * @param {boolean} [opciones.scrollLock]       Congela el scroll del documento
 *                                              mientras esté enganchado, en
 *                                              vez de escuchar el scroll.
 * @returns {{ attach: () => void, detach: () => void, get attached(): boolean }}
 */
export function createPopupDismiss(host, {
  onEscape,
  onKeydown,
  onOutside,
  onReposition,
  onScroll,
  scrollLock = false,
} = {}) {
  let enganchado = false;
  let raf = 0;
  let overflowPrevio = null;

  const alPulsar = (e) => {
    if (e.key === 'Escape') onEscape?.();
    onKeydown?.(e);
  };

  const alApuntar = (e) => {
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
