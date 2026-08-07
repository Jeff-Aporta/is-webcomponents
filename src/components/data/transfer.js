import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-transfer> — Doble lista de selección (vanilla, zero dependencies).
 *
 * Mueve elementos entre una lista de origen y una lista de destino.
 *
 *   <is-transfer id="t1">
 *     <is-transfer-item value="a">Alpha</is-transfer-item>
 *     <is-transfer-item value="b" selected>Beta</is-transfer-item>
 *   </is-transfer>
 *
 * Atributos <is-transfer>
 *   source-title       string
 *   target-title       string
 *   searchable         boolean
 *   without-buttons    boolean  — sin botones prev/next
 *   without-headings   boolean
 *   max-target         number   — máximo de items en target.
 *
 * Atributos <is-transfer-item>
 *   value        string
 *   disabled     boolean
 *
 * Slots
 *   <is-transfer-item>
 *     (default)   label.
 *
 * Eventos
 *   is-transfer-change  detail: { item, source, target, values }
 */
(() => {
  const TRANSFER_TEMPLATE = document.createElement('template');
  TRANSFER_TEMPLATE.innerHTML = /* html */ `
    <div class="transfer" part="base">
      <div class="pane source" part="pane">
        <div class="pane-head" part="pane-head">
          <span class="title" part="title">Source</span>
          <span class="count" part="count">0</span>
        </div>
        <div class="search" part="search">
          <input type="text" placeholder="Buscar…" aria-label="Buscar" />
        </div>
        <div class="list" part="list" role="listbox" aria-multiselectable="true"></div>
      </div>
      <div class="controls" part="controls">
        <button type="button" class="ctrl" data-action="to-target" aria-label="Mover a destino">
          <is-icon icon="mdi:chevron-double-right" aria-hidden="true"></is-icon>
        </button>
        <button type="button" class="ctrl" data-action="to-source" aria-label="Mover a origen">
          <is-icon icon="mdi:chevron-double-left" aria-hidden="true"></is-icon>
        </button>
      </div>
      <div class="pane target" part="pane">
        <div class="pane-head" part="pane-head">
          <span class="title" part="title">Target</span>
          <span class="count" part="count">0</span>
        </div>
        <div class="search" part="search">
          <input type="text" placeholder="Buscar…" aria-label="Buscar" />
        </div>
        <div class="list" part="list" role="listbox" aria-multiselectable="true"></div>
      </div>
    </div>
  `;

  const TITEM_TEMPLATE = document.createElement('template');
  TITEM_TEMPLATE.innerHTML = /* html */ `
    <div class="item" part="item" role="option">
      <slot></slot>
    </div>
  `;

  const TRANSFER_OBSERVED = ['source-title', 'target-title', 'searchable', 'without-buttons', 'without-headings', 'max-target'];

  class IsTransfer extends ElementBase {
    static get observedAttributes() { return TRANSFER_OBSERVED; }
    #panelSource;
    #panelTarget;
    #searchSource;
    #searchTarget;
    #listSource;
    #listTarget;
    #countSource;
    #countTarget;
    #titleSource;
    #titleTarget;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TRANSFER_TEMPLATE.content.cloneNode(true));
      this.#panelSource = shadow.querySelector('.pane.source');
      this.#panelTarget = shadow.querySelector('.pane.target');
      this.#searchSource = this.#panelSource.querySelector('.search input');
      this.#searchTarget = this.#panelTarget.querySelector('.search input');
      this.#listSource = this.#panelSource.querySelector('.list');
      this.#listTarget = this.#panelTarget.querySelector('.list');
      this.#countSource = this.#panelSource.querySelector('.count');
      this.#countTarget = this.#panelTarget.querySelector('.count');
      this.#titleSource = this.#panelSource.querySelector('.title');
      this.#titleTarget = this.#panelTarget.querySelector('.title');
    }

    onConnected() {
      if (!this.hasAttribute('source-title')) this.setAttribute('source-title', 'Disponibles');
      if (!this.hasAttribute('target-title')) this.setAttribute('target-title', 'Asignados');
      this.#bindControls();
      this.#bindSearch();
      this.#render();
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#sync();
      this.#render();
    }

    get values() {
      return [...this.querySelectorAll(':scope > is-transfer-item[selected]')].map((it) => it.getAttribute('value'));
    }

    #bindControls() {
      this.shadowRoot.querySelector('[data-action="to-target"]').addEventListener('click', () => this.#move(true));
      this.shadowRoot.querySelector('[data-action="to-source"]').addEventListener('click', () => this.#move(false));
    }

    #bindSearch() {
      this.#searchSource.addEventListener('input', () => this.#render());
      this.#searchTarget.addEventListener('input', () => this.#render());
    }

    #sync() {
      const titleSource = this.getAttribute('source-title') || 'Disponibles';
      const titleTarget = this.getAttribute('target-title') || 'Asignados';
      this.#titleSource.textContent = titleSource;
      this.#titleTarget.textContent = titleTarget;
      this.#panelSource.querySelector('.search').hidden = !this.hasAttribute('searchable');
      this.#panelTarget.querySelector('.search').hidden = !this.hasAttribute('searchable');
      this.shadowRoot.querySelector('.controls').hidden = this.hasAttribute('without-buttons');
      this.#panelSource.querySelector('.pane-head').hidden = this.hasAttribute('without-headings');
      this.#panelTarget.querySelector('.pane-head').hidden = this.hasAttribute('without-headings');
    }

    #items() {
      return [...this.querySelectorAll(':scope > is-transfer-item')];
    }

    #visibleItems(inTarget) {
      const term = (inTarget ? this.#searchTarget : this.#searchSource).value.toLowerCase();
      return this.#items().filter((it) => it.hasAttribute('selected') === inTarget)
        .filter((it) => !term || it.textContent.toLowerCase().includes(term));
    }

    #render() {
      this.#sync();
      const source = this.#visibleItems(false);
      const target = this.#visibleItems(true);
      this.#listSource.innerHTML = '';
      this.#listTarget.innerHTML = '';
      source.forEach((it) => this.#listSource.appendChild(this.#renderItem(it)));
      target.forEach((it) => this.#listTarget.appendChild(this.#renderItem(it)));
      this.#countSource.textContent = source.length;
      this.#countTarget.textContent = target.length;
      // Bloquear botón hacia target si alcanzó max
      const max = parseInt(this.getAttribute('max-target') || '0', 10);
      const btn = this.shadowRoot.querySelector('[data-action="to-target"]');
      if (max > 0 && target.length >= max) btn.disabled = true;
      else btn.disabled = false;
    }

    #renderItem(it) {
      const div = document.createElement('div');
      div.className = 'item';
      div.setAttribute('role', 'option');
      div.dataset.value = it.getAttribute('value') || '';
      div.textContent = it.textContent;
      if (it.hasAttribute('disabled')) {
        div.classList.add('disabled');
        div.setAttribute('aria-disabled', 'true');
      }
      div.addEventListener('click', () => {
        it.toggleAttribute('selected');
        this.#render();
        this.#emitChange(it);
      });
      return div;
    }

    #move(toTarget) {
      const max = parseInt(this.getAttribute('max-target') || '0', 10);
      const items = this.#items();
      items.forEach((it) => {
        if (it.hasAttribute('disabled')) return;
        if (toTarget) {
          if (max > 0 && items.filter((x) => x.hasAttribute('selected')).length >= max) return;
          it.setAttribute('selected', '');
        } else {
          it.removeAttribute('selected');
        }
      });
      this.#render();
      emit(this, 'is-transfer-change', { source: this.values.length, target: this.values.length, values: this.values });
    }

    #emitChange(item) {
      emit(this, 'is-transfer-change', { item, source: this.#items().filter((it) => !it.hasAttribute('selected')).length, target: this.values.length, values: this.values });
    }
  }

  defineElement('is-transfer', IsTransfer, 'IsTransfer');

  // ============ <is-transfer-item> ============
  const ITEM_OBSERVED = ['value', 'selected', 'disabled'];

  class IsTransferItem extends HTMLElement {
    static get observedAttributes() { return ITEM_OBSERVED; }

    connectedCallback() {
      this.setAttribute('role', 'presentation');
    }

    attributeChangedCallback() {}
  }

  defineElement('is-transfer-item', IsTransferItem, 'IsTransferItem');
})();
