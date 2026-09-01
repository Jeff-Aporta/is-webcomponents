import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
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
 *   is-show / is-after-show   al abrir el panel
 *   is-hide / is-after-hide   al cerrarlo
 *   is-select                 detail: { href, text }
 *
 * El panel sigue siendo un <dialog> nativo en modo `show()` (no modal):
 * es un popover anclado al trigger, no un diálogo. Migrarlo a <is-dialog>
 * (ModalBase: focus-trap, backdrop, centrado) cambiaría la semántica y el
 * posicionamiento fijo que calcula #positionPanel, así que se deja como está.
 */
(() => {
  const OBSERVED = ['label', 'icon', 'placement', 'width', 'hover'];

  class IsMegaMenu extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #openTimer = 0;
    #closeTimer = 0;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <is-button part="trigger" class="trigger" variant="text" color="neutral" with-caret
                     aria-haspopup="true" aria-expanded="false">
            <is-icon slot="start" class="trigger-icon" hidden aria-hidden="true"></is-icon>
            <span class="trigger-label"></span>
          </is-button>
          <dialog part="panel" class="panel" aria-label="Mega menú">
            <slot name="column"></slot>
            <slot name="feature"></slot>
          </dialog>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#trigger = this.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
      this.#panel = this.shadowRoot!.querySelector<HTMLElement>('.panel')!;
      this.#labelEl = this.shadowRoot!.querySelector<HTMLElement>('.trigger-label')!;
      this.#iconEl = this.shadowRoot!.querySelector<HTMLElement>('.trigger-icon')!;

      this.#trigger.addEventListener('click', () => this.toggle());
      this.#trigger.addEventListener('mouseenter', () => this.hasAttribute('hover') && this.#scheduleOpen());
      this.#trigger.addEventListener('mouseleave', () => this.hasAttribute('hover') && this.#scheduleClose());
      this.#panel.addEventListener('mouseenter', () => this.#scheduleOpen());
      this.#panel.addEventListener('mouseleave', () => this.hasAttribute('hover') && this.#scheduleClose());
      this.#panel.addEventListener('click', (e: Event) => {
        const a = e.target.closest('a[href]');
        if (a) {
          emit(this, 'is-select', { href: a.getAttribute('href'), text: a.textContent.trim() });
          this.close();
        }
      });
    }

    connectedCallback(): void {
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
      const icon = (this.getAttribute('icon') || '').trim();
      this.#iconEl.hidden = !icon;
      if (icon) this.#iconEl.setAttribute('icon', icon);
      else this.#iconEl.removeAttribute('icon');
    }

    open() {
      emit(this, 'is-show');
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.#positionPanel();
      this.#panel.show();
      this.setAttribute('open', '');
      emit(this, 'is-after-show');
    }

    close() {
      emit(this, 'is-hide');
      this.#panel.close();
      this.#trigger.setAttribute('aria-expanded', 'false');
      this.removeAttribute('open');
      emit(this, 'is-after-hide');
    }

    toggle() { this.#panel.open ? this.close() : this.open(); }

    #positionPanel = () => {
      const placement = this.getAttribute('placement') || 'bottom-start';
      const rect = this.#trigger.getBoundingClientRect();
      const maxW = Math.min(960, window.innerWidth - 32);
      const raw = (this.getAttribute('width') || '').trim();
      const parsed = Number.parseFloat(raw);
      const panelWidth = Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, maxW)
        : maxW;
      this.#panel.style.width = raw && !Number.isFinite(parsed) ? raw : `${panelWidth}px`;
      this.#panel.style.maxWidth = `${maxW}px`;
      const top = rect.bottom + 8;
      this.#panel.style.top = `${top}px`;
      const left = placement.endsWith('-end')
        ? Math.max(rect.right - panelWidth, 8)
        : Math.max(rect.left, 8);
      this.#panel.style.left = `${Math.min(left, window.innerWidth - panelWidth - 8)}px`;
    };

    #scheduleOpen() {
      clearTimeout(this.#closeTimer);
      this.#openTimer = setTimeout(() => this.open(), 90);
    }
    #scheduleClose() {
      clearTimeout(this.#openTimer);
      this.#closeTimer = setTimeout(() => this.close(), 220);
    }

    #trigger!: HTMLElement;
    #panel!: HTMLElement;
    #labelEl!: HTMLElement;
    #iconEl!: HTMLElement;
  }

  defineElement('is-mega-menu', IsMegaMenu);
})();
