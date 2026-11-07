import { ModalBase } from './utils/modal-base.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { getComponentPrefs, setComponentPrefs } from '@jeff-aporta/iswc-base/core/prefs.js';
import css from 'iswc:css';

/**
 * <iswc-drawer> — Web Component (vanilla, zero dependencies).
 *
 * Panel que se desliza desde un borde del viewport. Ideal para menús, filtros
 * y contenido secundario. Equivalente accesible a wa-drawer (Web Awesome).
 *
 * Comparte con <iswc-dialog> TODO el ciclo de vida (focus-trap, Escape, backdrop
 * light-dismiss, restore de foco, `data-drawer="close"`, eventos) vía
 * `_shared/modal-base.js`. Aquí sólo queda el chrome propio, el `placement` y
 * las animaciones de deslizamiento.
 *
 * Atributos
 *   open              boolean — si está abierto (reflected).
 *   label             string  — título en el header (a11y).
 *   placement         start | end | top | bottom  (default 'end').
 *   without-header    boolean — oculta el header y el botón de cerrar.
 *   light-dismiss     boolean — cierra al hacer click fuera.
 *
 * Slots
 *   (default)        contenido principal (body).
 *   label            header label propio.
 *   header-actions   acciones adicionales en el header.
 *   footer           pie del drawer.
 *
 * Métodos: show() / hide() / toggle()
 *
 * Eventos: iswc-show, iswc-after-show, iswc-hide (cancelable, detail.source), iswc-after-hide
 *
 * CSS Parts: drawer, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --size            tamaño preferido (ancho o alto según placement)
 *   --spacing         padding interno
 *   --show-duration, --hide-duration
 *   --backdrop-color
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="backdrop" part="backdrop"></div>
    <div class="drawer" part="drawer" role="dialog" aria-modal="true" tabindex="-1">
      <header class="header" part="header">
        <h2 class="title" part="title">
          <slot name="label"></slot>
        </h2>
        <div class="header-actions" part="header-actions">
          <slot name="header-actions"></slot>
          <iswc-button
            type="button"
            class="close-btn"
            part="close-button"
            variant="text"
            color="text"
            aria-label="Cerrar"
          >
            <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
          </iswc-button>
        </div>
      </header>
      <div class="body" part="body">
        <slot></slot>
      </div>
      <footer class="footer" part="footer">
        <slot name="footer"></slot>
      </footer>
      <div class="resize-handle" part="resize-handle" role="separator" aria-orientation="vertical" tabindex="0" title="Arrastra para cambiar el ancho"></div>
    </div>
  `;

  const VALID_PLACEMENT = ['start', 'end', 'top', 'bottom'];
  /** Alias que la gente escribe de otra forma (y sus equivalentes en español). */
  const ALIAS_PLACEMENT: Record<string, string> = { left: 'start', right: 'end', izquierda: 'start', derecha: 'end' };
  const HIDDEN_KEYFRAME = {
    start: { transform: 'translateX(-100%)' },
    end: { transform: 'translateX(100%)' },
    top: { transform: 'translateY(-100%)' },
    bottom: { transform: 'translateY(100%)' },
  };

  class IswcDrawer extends ModalBase {
    static tag = 'iswc-drawer';
    static css = css;
    static deps = ['iswc-icon', 'iswc-button'];

    static template = TEMPLATE;

    static observed = [...super.observed, 'placement', 'storage-key'];

    get modalClass() { return '.drawer'; }
    get closeAttr() { return 'data-drawer'; }


    onConnected() {
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'end');
      this.#normalizarPlacement();
      this.#conectarResize();
      this.#restaurarAncho();
    }

    onAttributeChanged(name: string, _oldVal: string | null, newVal: string | null) {
      if (name === 'placement') this.#normalizarPlacement();
    }

    /**
     * Normaliza el borde: acepta los alias (left/right, izquierda/derecha) y deja siempre un valor
     * válido. El CSS se apoya en 'data-placement' (nunca en el atributo crudo): así un valor raro
     * no deja la caja sin tamaño —y sin scroll— en el borde equivocado.
     */
    #normalizarPlacement(): void {
      const bruto = (this.getAttribute('placement') ?? '').trim().toLowerCase();
      const normal = ALIAS_PLACEMENT[bruto] ?? bruto;
      const valor = VALID_PLACEMENT.includes(normal) ? normal : 'end';
      if (this.getAttribute('placement') !== valor) this.setAttribute('placement', valor);
      this.setAttribute('data-placement', valor);
    }

    onConnected() {
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'end');
      this.#normalizarPlacement();
      this.#conectarResize();
      this.#restaurarAncho();
    }

    /** El tirador de tamaño: aparece en los bordes horizontales (start/end). */
    #conectarResize(): void {
      const handle = this.shadowRoot?.querySelector('.resize-handle');
      if (!handle) return;
      handle.addEventListener('pointerdown', this.#iniciarResize);
      handle.addEventListener('keydown', this.#teclaResize);
    }

    /** Arrastrar el tirador cambia el ancho del cajón (--iswc-drawer-size). */
    #iniciarResize = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      const handle = e.currentTarget as HTMLElement;
      handle.setPointerCapture(e.pointerId);
      const inicio = this.placement === 'start' ? e.clientX : -e.clientX;
      const anchoInicial = this.#anchoActual();
      const mover = (ev: PointerEvent): void => {
        const ahora = this.placement === 'start' ? ev.clientX : -ev.clientX;
        const ancho = anchoInicial + (ahora - inicio);
        this.#fijarAncho(Math.max(224, Math.min(ancho, window.innerWidth - 80)));
      };
      const soltar = (): void => {
        handle.removeEventListener('pointermove', mover);
        handle.removeEventListener('pointerup', soltar);
        handle.removeEventListener('pointercancel', soltar);
        this.#persistirAncho();
      };
      handle.addEventListener('pointermove', mover);
      handle.addEventListener('pointerup', soltar);
      handle.addEventListener('pointercancel', soltar);
      e.preventDefault();
    };

    /** Con el teclado el ancho también cambia (flechas: 16 px; Inicio/Fin: mínimo/máximo). */
    #teclaResize = (e: KeyboardEvent): void => {
      const paso = e.shiftKey ? 64 : 16;
      const ancho = this.#anchoActual();
      if (e.key === 'ArrowLeft') this.#fijarAncho(this.placement === 'start' ? ancho + paso : ancho - paso);
      else if (e.key === 'ArrowRight') this.#fijarAncho(this.placement === 'start' ? ancho - paso : ancho + paso);
      else if (e.key === 'Home') this.#fijarAncho(240);
      else if (e.key === 'End') this.#fijarAncho(Math.max(240, window.innerWidth - 80));
      else return;
      e.preventDefault();
      this.#persistirAncho();
    };

    /** El ancho actual en píxeles (el que dice el CSS). */
    #anchoActual(): number {
      const valor = getComputedStyle(this).getPropertyValue('--iswc-drawer-size').trim();
      if (valor.endsWith('px')) return parseFloat(valor) || 0;
      const em = parseFloat(valor) || 0;
      return em * parseFloat(getComputedStyle(this).fontSize || '16');
    }

    /** Fija el ancho del cajón. */
    #fijarAncho(px: number): void {
      this.style.setProperty('--iswc-drawer-size', `${Math.round(px)}px`);
    }

    /** La memoria del ancho (opcional: solo si hay storage-key). */
    get storageKey(): string {
      return (this.getAttribute('storage-key') ?? '').trim();
    }
    set storageKey(v: string | null) {
      if (v == null || v === '') this.removeAttribute('storage-key');
      else this.setAttribute('storage-key', String(v));
    }

    /** Recupera el ancho guardado (si hay storage-key). */
    #restaurarAncho(): void {
      const key = this.storageKey;
      if (!key) return;
      const guardado = getComponentPrefs('iswc-drawer', key) as { width?: number } | null;
      const ancho = Number(guardado?.width);
      if (Number.isFinite(ancho) && ancho > 0) this.#fijarAncho(ancho);
    }

    /** Guarda el ancho (si hay storage-key). */
    #persistirAncho(): void {
      const key = this.storageKey;
      if (!key) return;
      setComponentPrefs('iswc-drawer', key, { width: Math.round(this.#anchoActual()) });
    }

    // ---- placement ----

    get placement(): string {
      return this.getAttribute('data-placement') ?? 'end';
    }
    set placement(v) {
      if (v == null || v === '') this.removeAttribute('placement');
      else this.setAttribute('placement', v);
      this.#normalizarPlacement();
    }

    // ---- animaciones ----

    animateOpen(): Promise<void> {
      const dur = this.#readDur('--iswc-drawer-show-duration', 220);
      this.$modal.animate(
        [this.#hiddenKeyframe(), this.#visibleKeyframe()],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
      );
      this.$backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: dur, easing: 'ease-out', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    animateClose(): Promise<void> {
      const dur = this.#readDur('--iswc-drawer-hide-duration', 180);
      this.$modal.animate(
        [this.#visibleKeyframe(), this.#hiddenKeyframe()],
        { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
      );
      this.$backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: dur, easing: 'ease-in', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    /** Posición fuera de pantalla, del lado del borde que ocupa el drawer. */
    #hiddenKeyframe(): Keyframe { return HIDDEN_KEYFRAME[this.placement as keyof typeof HIDDEN_KEYFRAME]; }

    #visibleKeyframe(): Keyframe { return { transform: 'translate(0,0)' }; }

    #readDur(propName: string, fallback: number): number {
      const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
      return Number.isFinite(v) ? v : fallback;
    }
  }

  define(IswcDrawer, 'IswcDrawer');
})();
