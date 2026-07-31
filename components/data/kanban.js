import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-kanban> + <is-kanban-column> + <is-kanban-card> — Tablero (vanilla, zero dependencies).
 *
 *   <is-kanban>
 *     <is-kanban-column title="Pendiente">
 *       <is-kanban-card heading="Tarea 1">Descripción</is-kanban-card>
 *     </is-kanban-column>
 *   </is-kanban>
 *
 * Atributos <is-kanban>
 *   columns        number — nº columnas visibles al estilo "compact".
 *
 * Atributos <is-kanban-column>
 *   title          string
 *   accent         string (color, e.g. dodgerblue, #0bb783)
 *   badge          string — opcional en el header.
 *
 * Atributos <is-kanban-card>
 *   heading        string
 *   meta           string — bajo el heading.
 *   tag            string — texto de la badge lateral.
 *   tag-variant    brand | neutral | success | warning | danger
 *   cover          string — URL de imagen de cabecera.
 *   without-shadow boolean
 *
 * Slots
 *   <is-kanban-column>
 *     (default)       cards.
 *     header-actions  elementos en la cabecera.
 *   <is-kanban-card>
 *     (default)        descripción.
 *     footer           pie de la card.
 *
 * Eventos
 *   is-kanban-card-click  detail: { card, column }
 */
(() => {
  const BOARD_TEMPLATE = document.createElement('template');
  BOARD_TEMPLATE.innerHTML = /* html */ `
    <div class="board" part="base">
      <slot></slot>
    </div>
  `;

  const COLUMN_TEMPLATE = document.createElement('template');
  COLUMN_TEMPLATE.innerHTML = /* html */ `
    <div class="column" part="column">
      <header class="col-head" part="col-head">
        <span class="title" part="title"></span>
        <span class="badge" part="badge"></span>
        <span class="actions" part="actions"><slot name="header-actions"></slot></span>
      </header>
      <div class="lane" part="lane">
        <slot></slot>
      </div>
      <footer class="col-foot" part="col-foot">
        <slot name="footer"></slot>
      </footer>
    </div>
  `;

  const CARD_TEMPLATE = document.createElement('template');
  CARD_TEMPLATE.innerHTML = /* html */ `
    <div class="card" part="card">
      <div class="cover" part="cover" hidden></div>
      <div class="body">
        <div class="head" part="head">
          <div class="heading" part="heading"></div>
          <span class="tag" part="tag" hidden></span>
        </div>
        <div class="meta" part="meta"></div>
        <div class="content"><slot></slot></div>
      </div>
      <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
    </div>
  `;

  const BOARD_OBSERVED = ['columns'];
  const COLUMN_OBSERVED = ['title', 'accent', 'badge'];
  const CARD_OBSERVED = ['heading', 'meta', 'tag', 'tag-variant', 'cover', 'without-shadow'];

  class IsKanban extends HTMLElement {
    static get observedAttributes() { return BOARD_OBSERVED; }
    connectedCallback() {
      if (!this.hasAttribute('role')) this.setAttribute('role', 'list');
    }
  }
  if (!customElements.get('is-kanban')) customElements.define('is-kanban', IsKanban);

  class IsKanbanColumn extends HTMLElement {
    static get observedAttributes() { return COLUMN_OBSERVED; }
    #mounted = false;
    #root;
    #title;
    #badge;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(COLUMN_TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.column');
      this.#title = shadow.querySelector('.title');
      this.#badge = shadow.querySelector('.badge');
    }

    connectedCallback() {
      this.#mounted = true;
      this.setAttribute('role', 'listitem');
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    #sync() {
      const title = this.getAttribute('title') || '';
      const badge = this.getAttribute('badge');
      const accent = this.getAttribute('accent');
      this.#title.textContent = title;
      if (badge) {
        this.#badge.textContent = badge;
        this.#badge.hidden = false;
      } else {
        this.#badge.hidden = true;
      }
      if (accent) {
        this.#root.style.setProperty('--accent', accent);
      }
      // Update badge count
      const cards = this.querySelectorAll(':scope > is-kanban-card');
      this.#badge.textContent = badge || String(cards.length);
    }
  }
  if (!customElements.get('is-kanban-column')) customElements.define('is-kanban-column', IsKanbanColumn);

  class IsKanbanCard extends HTMLElement {
    static get observedAttributes() { return CARD_OBSERVED; }
    #mounted = false;
    #root;
    #cover;
    #heading;
    #meta;
    #tag;
    #footer;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(CARD_TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.card');
      this.#cover = shadow.querySelector('.cover');
      this.#heading = shadow.querySelector('.heading');
      this.#meta = shadow.querySelector('.meta');
      this.#tag = shadow.querySelector('.tag');
      this.#footer = shadow.querySelector('.footer');
    }

    connectedCallback() {
      this.#mounted = true;
      this.setAttribute('role', 'article');
      this.#sync();
      this.#root.addEventListener('click', (e) => {
        const column = this.parentElement;
        this.dispatchEvent(new CustomEvent('is-kanban-card-click', {
          detail: { card: this, column },
          bubbles: true,
          composed: true,
        }));
      });
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    #sync() {
      const heading = this.getAttribute('heading') || '';
      const meta = this.getAttribute('meta') || '';
      const tag = this.getAttribute('tag') || '';
      const tv = this.getAttribute('tag-variant') || 'neutral';
      const cover = this.getAttribute('cover') || '';
      this.#heading.textContent = heading;
      this.#meta.textContent = meta;
      if (tag) {
        this.#tag.textContent = tag;
        this.#tag.dataset.variant = tv;
        this.#tag.hidden = false;
      } else {
        this.#tag.hidden = true;
      }
      if (cover) {
        this.#cover.style.backgroundImage = `url(${cover})`;
        this.#cover.hidden = false;
      } else {
        this.#cover.hidden = true;
      }
      this.#root.classList.toggle('no-shadow', this.hasAttribute('without-shadow'));
      const footerSlot = this.shadowRoot.querySelector('slot[name="footer"]');
      this.#footer.hidden = !footerSlot.assignedNodes().length;
    }
  }
  if (!customElements.get('is-kanban-card')) customElements.define('is-kanban-card', IsKanbanCard);
})();
