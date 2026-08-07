import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-mention> — Input con autocompletado al tipear @usuario o #etiqueta.
 *
 * Atributos
 *   value, name, placeholder, disabled, readonly
 *   trigger       caracteres que abren el popup (default "@#")
 *   max-items     tope del popup (default 8)
 *
 * Sugerencias
 *   <script type="application/json">
 *   { "@": ["Ana", "Pedro", "Sofía"], "#": ["urgente", "bug", "idea"] }
 *   </script>
 *
 * O vía propiedad: `suggestions = { "@": [...], "#": [...] }`.
 *
 * Tokens seleccionados
 *   Se renderizan como texto plano con el carácter trigger delante
 *   ("@Ana "). Para chips visuales en backend, el `value` siempre es texto.
 *
 * Eventos
 *   is-input, is-change
 *   is-select  detail: { trigger, item, range: [start, end] }
 */
(() => {
  const OBSERVED = ['value', 'name', 'placeholder', 'disabled', 'readonly', 'trigger', 'max-items'];

  class IsMention extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #input;
    #onDocPointerDown;
    #suggestions = {};
    #popup;
    #activeIndex = 0;
    #lastTriggerRange = null;
    #lastTriggerChar = '';
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <input part="input" class="input" id="input" type="text" />
          <div part="popup" class="popup" role="listbox" hidden></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#input = this.shadowRoot.getElementById('input');
      this.#popup = this.shadowRoot.querySelector('.popup');
      this.#input.addEventListener('input', () => this.#onInput());
      this.#input.addEventListener('keydown', (e) => this.#onKey(e));
      this.#input.addEventListener('blur', () => this.#hidePopup());
      this.#onDocPointerDown = (e) => {
        if (!this.isOpen) return;
        if (e.composedPath().includes(this)) return;
        this.#hidePopup();
      };
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
      this.#readSlot();
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') {
        if (this.#input.value !== newVal) this.#input.value = newVal ?? '';
      }
      if (name === 'disabled' || name === 'readonly') this.#syncDisabled();
    }

    get value() { return this.#input?.value ?? ''; }
    set value(v) {
      const next = v ?? '';
      if (this.#input) this.#input.value = next;
      this.setAttribute('value', next);
    }
    get suggestions() { return this.#suggestions; }
    set suggestions(obj) { this.#suggestions = obj || {}; }

    get isOpen() { return !this.#popup.hidden; }

    #sync() {
      if (this.hasAttribute('value')) this.#input.value = this.getAttribute('value');
      this.#syncDisabled();
    }

    #syncDisabled() {
      this.#input.disabled = this.hasAttribute('disabled');
      this.#input.readOnly = this.hasAttribute('readonly');
    }

    #readSlot() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) return;
      try {
        const data = JSON.parse(script.textContent);
        if (data && typeof data === 'object') this.#suggestions = data;
      } catch { /* noop */ }
    }

    #onInput() {
      this.setAttribute('value', this.#input.value);
      emit(this, 'is-input');
      const triggers = (this.getAttribute('trigger') || '@#').split('');
      const caret = this.#input.selectionStart ?? this.#input.value.length;
      const before = this.#input.value.slice(0, caret);
      const triggerChar = [...before].reverse().find((c) => triggers.includes(c));
      if (!triggerChar) { this.#hidePopup(); return; }
      // encontrar el trigger actual más cercano (último)
      const idx = before.lastIndexOf(triggerChar);
      if (idx < 0) { this.#hidePopup(); return; }
      const start = idx;
      // la query es el texto desde el trigger hasta el caret, sin espacios
      const query = before.slice(start + 1);
      if (/\s/.test(query)) { this.#hidePopup(); return; }
      // guardar referencia para reemplazo
      this.#lastTriggerChar = triggerChar;
      this.#lastTriggerRange = [start, caret];
      // buscar candidatos
      const list = this.#suggestions[triggerChar] || [];
      const filtered = query
        ? list.filter((s) => String(s).toLowerCase().includes(query.toLowerCase())).slice(0, Number(this.getAttribute('max-items')) || 8)
        : list.slice(0, Number(this.getAttribute('max-items')) || 8);
      if (!filtered.length) { this.#hidePopup(); return; }
      this.#renderPopup(filtered, triggerChar);
      this.#positionPopup();
    }

    #renderPopup(items, triggerChar) {
      this.#popup.innerHTML = '';
      items.forEach((it, i) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'opt' + (i === this.#activeIndex ? ' is-active' : '');
        opt.setAttribute('role', 'option');
        opt.dataset.value = it;
        opt.innerHTML = `<span class="t">${triggerChar}</span><span>${String(it).replace(/</g, '&lt;')}</span>`;
        opt.addEventListener('pointerdown', (e) => e.preventDefault());
        opt.addEventListener('click', () => this.#select(it));
        this.#popup.appendChild(opt);
      });
      this.#popup.hidden = false;
    }

    #positionPopup() {
      // posición debajo del caret, aproximado
      const inputRect = this.#input.getBoundingClientRect();
      this.#popup.style.left = '0px';
      this.#popup.style.top = `${inputRect.height + 4}px`;
    }

    #hidePopup() {
      this.#popup.hidden = true;
      this.#popup.innerHTML = '';
    }

    #onKey(e) {
      if (!this.isOpen) return;
      const items = [...this.#popup.querySelectorAll('.opt')];
      if (e.key === 'ArrowDown') { e.preventDefault(); this.#activeIndex = (this.#activeIndex + 1) % items.length; this.#renderPopup(items.map((b) => b.dataset.value), this.#lastTriggerChar); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.#activeIndex = (this.#activeIndex - 1 + items.length) % items.length; this.#renderPopup(items.map((b) => b.dataset.value), this.#lastTriggerChar); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        if (items.length) { e.preventDefault(); this.#select(items[this.#activeIndex].dataset.value); }
      }
      else if (e.key === 'Escape') { this.#hidePopup(); }
    }

    #select(item) {
      if (!this.#lastTriggerRange) return;
      const [start, end] = this.#lastTriggerRange;
      const cur = this.#input.value;
      const replacement = `${this.#lastTriggerChar}${item} `;
      const next = cur.slice(0, start) + replacement + cur.slice(end);
      this.#input.value = next;
      const caret = (start + replacement.length);
      try { this.#input.setSelectionRange(caret, caret); } catch { /* noop */ }
      this.setAttribute('value', next);
      this.#hidePopup();
      emit(this, 'is-select', { trigger: this.#lastTriggerChar, item, range: [start, caret] });
      emit(this, 'is-change', { value: next });
    }
  }

  defineElement('is-mention', IsMention);
})();
