import '../media/icon.js';
import './button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { setStringAttr } from '../_shared/reflect.js';
import { sharePayload } from '../_shared/web-share.js';

/**
 * <is-share-button> — Web Share API; si el SO no tiene share, copia al portapapeles.
 * Share Target (recibir) es manifest de PWA, no un tag.
 *
 * Atributos: share-title, text, url, disabled
 * Eventos: is-share { how: shared|copied|fail }, is-error
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-button class="btn" variant="plain" type="button" part="button">
      <slot>
        <is-icon icon="mdi:share-variant-outline"></is-icon>
        <span class="lbl">Compartir</span>
      </slot>
    </is-button>
  `;

  class IsShareButton extends HTMLElement {
    static get observedAttributes(): string[] { return ['share-title', 'text', 'url', 'disabled']; }

    #btn!: HTMLElement;
    #busy = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector<HTMLElement>('.btn')!;
      this.#btn.addEventListener('click', (e: Event) => { e.stopPropagation(); this.share(); });
    }

    connectedCallback(): void { this.#sync(); }
    attributeChangedCallback() { this.#sync(); }

    get shareTitle() { return this.getAttribute('share-title') ?? ''; }
    set shareTitle(v) { setStringAttr(this, 'share-title', v); }
    get text() { return this.getAttribute('text') ?? ''; }
    set text(v) { setStringAttr(this, 'text', v); }
    get url() { return this.getAttribute('url') ?? location.href; }
    set url(v) { setStringAttr(this, 'url', v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    #sync() {
      this.#btn.toggleAttribute('disabled', this.disabled);
    }

    async share() {
      if (this.disabled || this.#busy) return;
      this.#busy = true;
      const how = await sharePayload({ title: this.shareTitle || document.title, text: this.text, url: this.url || location.href });
      this.#busy = false;
      if (how === 'abort') return;
      if (how === 'fail') emit(this, 'is-error');
      else emit(this, 'is-share', { how, url: this.url, text: this.text, title: this.shareTitle });
    }
  }

  defineElement('is-share-button', IsShareButton, 'IsShareButton');
})();
