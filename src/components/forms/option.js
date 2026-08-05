import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-option> — Opción para is-combobox / is-select (listboxes).
 *
 * Atributos: value, disabled, selected, group
 * Slots: default (etiqueta), start (icono/avatar), description (texto secundario)
 * Parts: base, start, label, description
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="option" role="option">
      <span part="start" class="start"><slot name="start"></slot></span>
      <span class="body">
        <span part="label" class="label"><slot></slot></span>
        <span part="description" class="description"><slot name="description"></slot></span>
      </span>
    </div>
  `;

  const OBSERVED = ['value', 'disabled', 'selected', 'group'];

  class IsOption extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #root;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.option');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    get value() {
      return this.hasAttribute('value') ? this.getAttribute('value') : this.label;
    }
    set value(v) {
      if (v == null) this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get selected() { return this.hasAttribute('selected'); }
    set selected(v) { this.toggleAttribute('selected', !!v); }

    /** Cabecera bajo la que agrupar la opción en el listbox */
    get group() { return this.getAttribute('group') ?? ''; }
    set group(v) { v == null || v === '' ? this.removeAttribute('group') : this.setAttribute('group', String(v)); }

    get description() {
      return (this.querySelector(':scope > [slot="description"]')?.textContent || '').trim();
    }

    /** Solo el contenido del slot por defecto: los slots con nombre no son etiqueta */
    get label() {
      let out = '';
      for (const node of this.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('slot')) continue;
        out += node.textContent || '';
      }
      return out.trim();
    }

    #sync() {
      this.#root.setAttribute('aria-selected', String(this.selected));
      this.#root.setAttribute('aria-disabled', String(this.disabled));
      this.#root.toggleAttribute('data-disabled', this.disabled);
      this.#root.toggleAttribute('data-selected', this.selected);
    }
  }

  if (!customElements.get('is-option')) {
    customElements.define('is-option', IsOption);
  }
  if (typeof window !== 'undefined') window.IsOption = IsOption;
})();
