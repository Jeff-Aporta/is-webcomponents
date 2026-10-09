import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../media/icon.js';
import { clearAllComponentPrefs, peekComponentPrefsRoot } from '../_shared/prefs.js';

/**
 * <iswc-prefs-clear> — borra la memoria persistente de los is-* (localStorage).
 *
 * Limpia `iswc-root` (y el legacy `is-components`): tamaños de
 * iswc-split-panel, scroll remember, snapshots de grid, etc. Sirve para auditar
 * la carga inicial “limpia” de layouts sin arrastrar prefs viejas.
 *
 * Attributes
 *   confirm   boolean — pide window.confirm antes (default true)
 *   reload    boolean — recarga la página tras limpiar (default true)
 *   variant / color / shape — se reenvían al iswc-button interno
 *   Sin hijos en el slot → solo icono (aria-label / title dan el nombre).
 *
 * Events
 *   iswc-prefs-clear  detail: { tags: string[], reloaded: boolean }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <iswc-button part="button" type="button" color="neutral" variant="plain" aria-label="Limpiar memoria UI">
      <iswc-icon slot="start" icon="mdi:broom" aria-hidden="true"></iswc-icon>
      <slot></slot>
    </iswc-button>
  `;

  class IswcPrefsClear extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['confirm', 'reload', 'variant', 'color', 'shape', 'disabled', 'title', 'aria-label'];
    }

    #btn!: HTMLElement;
    #busy = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector<HTMLElement>('iswc-button')!;
      this.#btn.addEventListener('iswc-click', this.#onClick as EventListener);
    }

    connectedCallback(): void {
      this.#syncAttrs();
      if (!this.hasAttribute('title')) {
        this.#btn.title = 'Borra splits, scrolls y demás prefs de iswc-root';
      }
    }

    attributeChangedCallback() {
      this.#syncAttrs();
    }

    get confirm() {
      return this.getAttribute('confirm') !== 'false';
    }
    set confirm(v) {
      this.setAttribute('confirm', v ? 'true' : 'false');
    }

    get reload() {
      return this.getAttribute('reload') !== 'false';
    }
    set reload(v) {
      this.setAttribute('reload', v ? 'true' : 'false');
    }

    /** API: limpia sin UI (respeta confirm/reload del host). */
    clear() {
      return this.#run();
    }

    /** API: peeks sin borrar. */
    peek() {
      return peekComponentPrefsRoot();
    }

    #syncAttrs() {
      if (!this.#btn) return;
      for (const a of ['variant', 'color', 'shape', 'disabled', 'title', 'aria-label']) {
        const v = this.getAttribute(a);
        if (v != null) this.#btn.setAttribute(a, v);
        else if (a === 'disabled' || a === 'title') this.#btn.removeAttribute(a);
        else if (a === 'aria-label') {
          this.#btn.setAttribute('aria-label', 'Limpiar memoria UI');
        }
      }
    }

    #onClick = (e: PointerEvent) => {
      e.stopPropagation();
      void this.#run();
    };

    async #run() {
      if (this.#busy) return null;
      const tags = Object.keys(peekComponentPrefsRoot() || {});
      if (this.confirm) {
        const ok = window.confirm(
          tags.length
            ? `¿Borrar memoria UI de iswc-root?\n\nTags: ${tags.join(', ')}`
            : 'No hay prefs guardadas. ¿Recargar igual?',
        );
        if (!ok) return null;
      }

      this.#busy = true;
      const result = clearAllComponentPrefs();
      emit(this, 'iswc-prefs-clear', { tags: result.tags, reloaded: this.reload });

      if (this.reload) {
        location.reload();
        return result;
      }
      this.#busy = false;
      return result;
    }
  }

  defineElement('iswc-prefs-clear', IswcPrefsClear, 'IswcPrefsClear');
})();
