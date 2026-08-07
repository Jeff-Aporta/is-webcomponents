import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

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
 *   orientation    column | row — layout de los stacks (default column:
 *                  stacks lado a lado; row: stacks apilados en filas).
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
 *   tag-color    brand | neutral | success | warning | danger
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
 *   is-kanban-move        detail: { card, from, to } — card soltada en otra
 *                         columna (o reordenada en la misma).
 */
(() => {
  // Card en vuelo durante un drag (una sola por documento).
  let dragCard = null;
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

  const BOARD_OBSERVED = ['columns', 'orientation'];
  const COLUMN_OBSERVED = ['title', 'accent', 'badge'];
  const CARD_OBSERVED = ['heading', 'meta', 'tag', 'tag-color', 'cover', 'without-shadow'];

  class IsKanban extends HTMLElement {
    static get observedAttributes() { return BOARD_OBSERVED; }
    #mo = null;
    connectedCallback() {
      if (!this.hasAttribute('role')) this.setAttribute('role', 'list');
      this.#syncOrientation();
      this.#mo = new MutationObserver(() => this.#syncOrientation());
      this.#mo.observe(this, { childList: true });
    }
    disconnectedCallback() {
      this.#mo?.disconnect();
      this.#mo = null;
    }
    attributeChangedCallback(name) {
      if (name === 'orientation') this.#syncOrientation();
    }
    /** Propaga la orientación a las columnas (su lane fluye horizontal en row). */
    #syncOrientation() {
      const row = this.getAttribute('orientation') === 'row';
      for (const col of this.querySelectorAll(':scope > is-kanban-column')) {
        if (row) col.setAttribute('data-orientation', 'row');
        else col.removeAttribute('data-orientation');
      }
    }
  }
  defineElement('is-kanban', IsKanban);

  class IsKanbanColumn extends ElementBase {
    static get observedAttributes() { return COLUMN_OBSERVED; }
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

    onConnected() {
      this.setAttribute('role', 'listitem');
      this.#sync();
      this.#bindDrop();
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#sync();
    }

    /** Zona de drop: la lane acepta cards arrastradas desde cualquier columna. */
    #bindDrop() {
      const lane = this.shadowRoot.querySelector('.lane');
      lane.addEventListener('dragover', (e) => {
        if (!dragCard) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.#root.classList.add('drop-target');
      });
      lane.addEventListener('dragleave', () => this.#root.classList.remove('drop-target'));
      lane.addEventListener('drop', (e) => {
        if (!dragCard) return;
        e.preventDefault();
        this.#root.classList.remove('drop-target');
        const from = dragCard.parentElement;
        // Insertar antes de la card bajo el cursor; si no hay, al final.
        const cards = [...this.querySelectorAll(':scope > is-kanban-card')].filter((c) => c !== dragCard);
        const horizontal = this.getAttribute('data-orientation') === 'row';
        const after = cards.find((c) => {
          const r = c.getBoundingClientRect();
          return horizontal ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
        });
        if (after) this.insertBefore(dragCard, after);
        else this.appendChild(dragCard);
        this.#sync();
        if (from && from !== this && typeof from.refreshBadge === 'function') from.refreshBadge();
        emit(dragCard, 'is-kanban-move', { card: dragCard, from, to: this });
      });
    }

    /** Recalcula el contador del badge (p. ej. tras perder una card). */
    refreshBadge() { this.#sync(); }

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
  defineElement('is-kanban-column', IsKanbanColumn);

  class IsKanbanCard extends ElementBase {
    static get observedAttributes() { return CARD_OBSERVED; }
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

    onConnected() {
      this.setAttribute('role', 'article');
      this.#sync();
      // Transferible entre stacks vía HTML5 drag & drop.
      this.setAttribute('draggable', 'true');
      this.addEventListener('dragstart', (e) => {
        dragCard = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.getAttribute('heading') || 'card');
        this.classList.add('is-dragging');
      });
      this.addEventListener('dragend', () => {
        dragCard = null;
        this.classList.remove('is-dragging');
      });
      this.#root.addEventListener('click', (e) => {
        const column = this.parentElement;
        emit(this, 'is-kanban-card-click', { card: this, column });
      });
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#sync();
    }

    #sync() {
      const heading = this.getAttribute('heading') || '';
      const meta = this.getAttribute('meta') || '';
      const tag = this.getAttribute('tag') || '';
      const tv = this.getAttribute('tag-color') || 'neutral';
      const cover = this.getAttribute('cover') || '';
      this.#heading.textContent = heading;
      this.#meta.textContent = meta;
      if (tag) {
        this.#tag.textContent = tag;
        this.#tag.dataset.color = tv;
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
  defineElement('is-kanban-card', IsKanbanCard);
})();
