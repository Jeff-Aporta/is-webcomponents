import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-mega-menu> — Mega-menú para e-commerce/portal masivo. Abre un panel
 * ancho con varias columnas, cada una con un encabezado, links y,
 * opcionalmente, un bloque destacado.
 *
 *   <is-mega-menu label="Catálogo" placement="bottom-start">
 *     <div slot="column" title="Muebles" icon="mdi:sofa">
 *       <a href="/sillas">Sillas</a>
 *       <a href="/mesas">Mesas</a>
 *       ...
 *     </div>
 *     <div slot="column" title="Iluminación" icon="mdi:lightbulb">...</div>
 *     <div slot="feature">
 *       Imagen + título de producto destacado.
 *     </div>
 *   </is-mega-menu>
 *
 * Atributos
 *   label        texto del trigger
 *   icon         icono del trigger
 *   placement    bottom-start (default) | bottom | bottom-end | ...
 *   width        ancho del panel (default min(60rem, 92vw))
 *   hover        boolean — abre al hover, no al click
 *
 * Slots
 *   column    elementos con atributo "title" e "icon" para columnas
 *   feature   bloque destacado (imagen, CTA, lo que sea)
 *
 * Eventos
 *   is-open, is-close, is-select  detail: { href }
 */
(() => {
  const OBSERVED = ['label', 'icon', 'placement', 'width', 'hover'];

  class IsMegaMenu extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #openTimer = 0;
    #closeTimer = 0;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <button part="trigger" class="trigger" type="button" aria-haspopup="true" aria-expanded="false">
            <span class="trigger-label"></span>
            <span class="caret"></span>
          </button>
          <dialog part="panel" class="panel" aria-label="Mega menú"></dialog>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#trigger = this.shadowRoot.querySelector('.trigger');
      this.#panel = this.shadowRoot.querySelector('.panel');
      this.#labelEl = this.shadowRoot.querySelector('.trigger-label');

      this.#trigger.addEventListener('click', () => this.toggle());
      this.#trigger.addEventListener('mouseenter', () => this.hasAttribute('hover') && this.#scheduleOpen());
      this.#trigger.addEventListener('mouseleave', () => this.hasAttribute('hover') && this.#scheduleClose());
      this.#panel.addEventListener('mouseenter', () => this.#scheduleOpen());
      this.#panel.addEventListener('mouseleave', () => this.hasAttribute('hover') && this.#scheduleClose());
      this.#panel.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (a) {
          this.dispatchEvent(new CustomEvent('is-select', { bubbles: true, composed: true, detail: { href: a.getAttribute('href'), text: a.textContent.trim() } }));
          this.close();
        }
      });
    }

    connectedCallback() {
      this.#sync();
      this.#panel.addEventListener('click', this.#positionPanel);
    }

    attributeChangedCallback() {
      if (!this.#sync) return;
      this.#sync();
      this.#positionPanel();
    }

    #sync() {
      this.#labelEl.textContent = this.getAttribute('label') || '';
    }

    open() {
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.#positionPanel();
      this.#panel.show();
      this.setAttribute('open', '');
      this.dispatchEvent(new CustomEvent('is-open', { bubbles: true, composed: true }));
    }

    close() {
      this.#panel.close();
      this.#trigger.setAttribute('aria-expanded', 'false');
      this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('is-close', { bubbles: true, composed: true }));
    }

    toggle() { this.#panel.open ? this.close() : this.open(); }

    #positionPanel = () => {
      const placement = this.getAttribute('placement') || 'bottom-start';
      const rect = this.#trigger.getBoundingClientRect();
      const panelWidth = parseInt(this.getAttribute('width') || 'min(60rem, 92vw)', 10) || Math.min(960, window.innerWidth - 32);
      this.#panel.style.minWidth = `${panelWidth}px`;
      this.#panel.style.maxWidth = `${Math.min(960, window.innerWidth - 32)}px`;
      // posición vía top/left con nativos; el panel es dialog con position:fixed
      const top = rect.bottom + 8;
      this.#panel.style.top = `${top}px`;
      if (placement.endsWith('-end')) this.#panel.style.left = `${Math.max(rect.right - panelWidth, 8)}px`;
      else this.#panel.style.left = `${Math.max(rect.left, 8)}px`;
    };

    #scheduleOpen() {
      clearTimeout(this.#closeTimer);
      this.#openTimer = setTimeout(() => this.open(), 90);
    }
    #scheduleClose() {
      clearTimeout(this.#openTimer);
      this.#closeTimer = setTimeout(() => this.close(), 220);
    }

    #trigger;
    #panel;
    #labelEl;
  }

  if (!customElements.get('is-mega-menu')) customElements.define('is-mega-menu', IsMegaMenu);
})();
