import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-pin-input> — Web Component (vanilla, zero dependencies).
 *
 * Casillas para OTP / PIN de 4 a 6 dígitos. Auto-avance al escribir, Backspace
 * retrocede, pegar distribuye todos los dígitos, focus automático.
 *
 *   <is-pin-input length="6" required></is-pin-input>
 *
 * Atributos
 *   length       number  (3-8, default 6)
 *   type         number | text   (default 'number')
 *   mask         boolean — si true, muestra asteriscos.
 *   disabled     boolean
 *   invalid      boolean
 *   placeholder  string — carácter para casillas vacías.
 *   autocomplete one-time-code | numeric
 *
 * Slots
 *   (default)  — hijos ignorados (este componente es self-contained).
 *
 * Eventos
 *   is-pin-change  detail: { value, index }
 *   is-pin-complete detail: { value }
 *   is-pin-invalid detail: { value }
 *
 * API
 *   .value         string
 *   .reset()       void
 *   .focus()       void
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="pin" part="base" role="group">
      <input type="text" class="hidden-input" aria-hidden="true" tabindex="-1" autocomplete="one-time-code" inputmode="numeric" />
      <div class="cells" part="cells"></div>
    </div>
  `;

  const OBSERVED = ['length', 'type', 'mask', 'disabled', 'invalid', 'placeholder', 'value', 'autocomplete'];

  class IsPinInput extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #root;
    #cells;
    #hiddenInput;
    #values = [];
    #onPaste;
    #onHiddenInput;
    #onSlotClick;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.pin');
      this.#cells = shadow.querySelector('.cells');
      this.#hiddenInput = shadow.querySelector('.hidden-input');
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('length')) this.setAttribute('length', '6');
      if (!this.hasAttribute('type')) this.setAttribute('type', 'number');
      this.#render();
      this.#hiddenInput.addEventListener('input', this.#onHiddenInput = () => {
        // write-only sync
        this.#hiddenInput.value = '';
      });
      this.#cells.addEventListener('click', this.#onSlotClick = (e) => {
        const idx = this.#indexFromEvent(e);
        if (idx >= 0) this.#focusIndex(idx);
      });
      this.#cells.addEventListener('keydown', (e) => this.#onKeyDown(e));
      this.#cells.addEventListener('input', (e) => this.#onCellInput(e));
      this.#onPaste = (e) => this.#handlePaste(e);
      this.addEventListener('paste', this.#onPaste);
      this.#syncState();
    }

    disconnectedCallback() {
      this.removeEventListener('paste', this.#onPaste);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'length' || name === 'type' || name === 'placeholder' || name === 'mask') {
        this.#render();
      }
      if (name === 'disabled' || name === 'invalid' || name === 'autocomplete') this.#syncState();
      if (name === 'value') {
        this.#setValue(this.getAttribute('value') || '');
      }
    }

    get value() { return this.#values.join(''); }
    set value(v) {
      this.#setValue(v || '');
      this.setAttribute('value', this.value);
    }

    reset() {
      this.#values = this.#lengthArray().map(() => '');
      this.#render();
      this.dispatchEvent(new CustomEvent('is-pin-change', { detail: { value: '', index: -1 }, bubbles: true, composed: true }));
    }

    focus() {
      this.#focusIndex(0);
    }

    // ---- private ----

    #length() {
      const v = parseInt(this.getAttribute('length') || '6', 10);
      return Math.max(3, Math.min(8, Number.isFinite(v) ? v : 6));
    }
    #lengthArray() { return Array.from({ length: this.#length() }); }

    #type() {
      return this.getAttribute('type') === 'text' ? 'text' : 'number';
    }

    #render() {
      const len = this.#length();
      const t = this.#type();
      const placeholder = this.getAttribute('placeholder') || '';
      const mask = this.hasAttribute('mask');
      // Ensure values array length.
      while (this.#values.length < len) this.#values.push('');
      if (this.#values.length > len) this.#values = this.#values.slice(0, len);
      this.#cells.innerHTML = '';
      for (let i = 0; i < len; i++) {
        const inp = document.createElement('input');
        inp.type = t === 'number' ? 'tel' : 'text';
        inp.inputmode = t === 'number' ? 'numeric' : 'text';
        inp.maxLength = 1;
        inp.autocomplete = 'one-time-code';
        inp.className = 'cell';
        inp.dataset.index = String(i);
        inp.setAttribute('aria-label', `Dígito ${i + 1} de ${len}`);
        inp.placeholder = placeholder;
        inp.pattern = t === 'number' ? '[0-9]' : '[A-Za-z0-9]';
        if (mask) inp.classList.add('mask');
        this.#cells.appendChild(inp);
      }
      // Restaurar valores
      this.#values.forEach((v, i) => {
        const inp = this.#cells.querySelector(`input[data-index="${i}"]`);
        if (inp) inp.value = v;
      });
    }

    #syncState() {
      const disabled = this.hasAttribute('disabled');
      const invalid = this.hasAttribute('invalid');
      this.#root.dataset.state = invalid ? 'invalid' : 'default';
      this.#cells.querySelectorAll('input').forEach((inp) => {
        inp.disabled = disabled;
      });
      const auto = this.getAttribute('autocomplete') || 'one-time-code';
      this.#hiddenInput.setAttribute('autocomplete', auto);
    }

    #indexFromEvent(e) {
      const target = e.target.closest('input.cell');
      if (!target) return -1;
      return parseInt(target.dataset.index, 10);
    }

    #onCellInput(e) {
      const idx = this.#indexFromEvent(e);
      if (idx === -1) return;
      const inp = e.target;
      const value = inp.value;
      if (value.length > 1) {
        // varios dígitos a la vez — distribuir
        const chars = value.split('').slice(0, this.#length() - idx);
        chars.forEach((c, i) => {
          this.#values[idx + i] = c;
        });
        this.#render();
        const nextIdx = Math.min(this.#length() - 1, idx + chars.length);
        this.#focusIndex(nextIdx);
      } else {
        this.#values[idx] = value;
      }
      this.#afterChange(idx);
    }

    #onKeyDown(e) {
      const idx = this.#indexFromEvent(e);
      if (idx === -1) return;
      if (e.key === 'Backspace' && !this.#values[idx] && idx > 0) {
        this.#focusIndex(idx - 1);
        this.#values[idx - 1] = '';
        this.#render();
        this.#afterChange(idx - 1);
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        this.#focusIndex(idx - 1);
      }
      if (e.key === 'ArrowRight' && idx < this.#length() - 1) {
        e.preventDefault();
        this.#focusIndex(idx + 1);
      }
    }

    #handlePaste(e) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      this.#setValue(text);
      this.#afterChange(this.#values.findIndex((v) => !v));
    }

    #setValue(text) {
      const chars = text.split('').slice(0, this.#length());
      this.#values = chars.concat(this.#lengthArray().map(() => '')).slice(0, this.#length());
      this.#render();
    }

    #focusIndex(idx) {
      const inp = this.#cells.querySelector(`input[data-index="${idx}"]`);
      if (inp) inp.focus();
    }

    #afterChange(idx) {
      // Autoavance si idx está lleno
      if (this.#values[idx] && idx < this.#length() - 1) {
        this.#focusIndex(idx + 1);
      }
      const value = this.value;
      const completed = value.length === this.#length() && !this.#values.includes('');
      this.dispatchEvent(new CustomEvent('is-pin-change', {
        detail: { value, index: idx },
        bubbles: true,
        composed: true,
      }));
      if (completed) {
        this.dispatchEvent(new CustomEvent('is-pin-complete', {
          detail: { value },
          bubbles: true,
          composed: true,
        }));
      }
    }
  }

  if (!customElements.get('is-pin-input')) customElements.define('is-pin-input', IsPinInput);
  if (typeof window !== 'undefined') window.IsPinInput = IsPinInput;
})();
