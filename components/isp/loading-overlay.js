import { adoptCss } from '../_shared/adopt-css.js';
import '../feedback/spinner.js';

/**
 * <is-loading-overlay> — Capa de bloqueo a pantalla completa con spinner.
 *
 * Port de `src/lib/overlays/Loading.svelte` (ISP-SvelteComponents), donde el
 * diálogo se abre con `notClose`: NO se cierra con Escape, ni con clic fuera,
 * ni tiene botón de cerrar. Solo el código que lo abrió puede cerrarlo. Por eso
 * no extiende `ModalBase` (ese sí trae Escape + light-dismiss + botón X).
 *
 * Atributos
 *   open       boolean — visible (reflected)
 *   message    string  — texto bajo el spinner
 *   scroll-lock boolean — bloquea el scroll del documento mientras está abierto
 *
 * Slots
 *   (default)  reemplaza el spinner por un indicador propio
 *   message    contenido rico en lugar del atributo `message`
 *
 * Métodos
 *   show() / hide() / toggle()
 *
 * Eventos (bubbles + composed)
 *   is-show / is-hide  detail: {}
 *
 * CSS Parts: ::part(backdrop) ::part(panel) ::part(indicator) ::part(message)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="backdrop" class="backdrop" role="alertdialog" aria-modal="true" aria-busy="true" hidden>
      <div part="panel" class="panel">
        <div part="indicator" class="indicator">
          <slot><is-spinner></is-spinner></slot>
        </div>
        <p part="message" class="message" hidden><span class="message-text"></span><slot name="message"></slot></p>
      </div>
    </div>
  `;

  const OBSERVED = ['open', 'message', 'scroll-lock'];

  class IsLoadingOverlay extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #backdrop;
    #messageEl;
    #messageText;
    #messageSlot;
    #prevOverflow = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);
      this.#backdrop = shadow.querySelector('.backdrop');
      this.#messageEl = shadow.querySelector('.message');
      this.#messageText = shadow.querySelector('.message-text');
      this.#messageSlot = shadow.querySelector('slot[name="message"]');
    }

    connectedCallback() {
      this.#mounted = true;
      for (const p of ['open', 'message', 'scrollLock']) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = this[p];
          delete this[p];
          this[p] = v;
        }
      }
      this.#messageSlot.addEventListener('slotchange', this.#syncMessage);
      this.#syncMessage();
      this.#syncOpen();
    }

    disconnectedCallback() {
      this.#messageSlot.removeEventListener('slotchange', this.#syncMessage);
      this.#releaseScroll();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'open') this.#syncOpen();
      else if (name === 'message') this.#syncMessage();
    }

    // ---- propiedades ------------------------------------------------------

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get message() { return this.getAttribute('message') || ''; }
    set message(v) {
      if (v == null || v === '') this.removeAttribute('message');
      else this.setAttribute('message', String(v));
    }

    get scrollLock() { return this.hasAttribute('scroll-lock'); }
    set scrollLock(v) { this.toggleAttribute('scroll-lock', !!v); }

    // ---- API pública ------------------------------------------------------

    show() { this.open = true; }
    hide() { this.open = false; }
    toggle() { this.open = !this.open; }

    // ---- privados ---------------------------------------------------------

    #emit(name) {
      this.dispatchEvent(new CustomEvent(name, { detail: {}, bubbles: true, composed: true }));
    }

    #syncOpen() {
      const open = this.open;
      this.#backdrop.hidden = !open;
      if (open) this.#lockScroll();
      else this.#releaseScroll();
      this.#emit(open ? 'is-show' : 'is-hide');
    }

    #syncMessage = () => {
      const slotted = this.#messageSlot.assignedNodes({ flatten: true })
        .some((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
      const text = slotted ? '' : this.message;
      this.#messageText.textContent = text;
      this.#messageEl.hidden = !text && !slotted;
    };

    #lockScroll() {
      if (!this.scrollLock || this.#prevOverflow !== null) return;
      this.#prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }

    #releaseScroll() {
      if (this.#prevOverflow === null) return;
      document.documentElement.style.overflow = this.#prevOverflow;
      this.#prevOverflow = null;
    }
  }

  if (!customElements.get('is-loading-overlay')) {
    customElements.define('is-loading-overlay', IsLoadingOverlay);
  }
  if (typeof window !== 'undefined') window.IsLoadingOverlay = IsLoadingOverlay;
})();
