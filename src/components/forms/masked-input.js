import { adoptCss } from '../_shared/adopt-css.js';
import { attachFormInternals, setCustomState, setFormValue } from '../_shared/form-associated.js';
import { apply, isComplete } from './masks-tokens.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-masked-input> — Input con formato aplicado (tarjeta de crédito, fecha,
 * teléfono, etc.). Tokeniza un patrón y aplica `apply()` al valor crudo en cada
 * cambio del campo.
 *
 * Atributos
 *   pattern         Cadena con tokens y literales.
 *                    0 = dígito requerido      (9999 9999 9999 9999, etc.)
 *                    9 = dígito opcional
 *                    A = letra A-Z mayúscula   se aplica case fold a mayúsculas
 *                    a = letra a-z minúscula
 *                    * = alfanumérico
 *                    cualquier otro char = literal (se imprime tal cual)
 *   value           Texto crudo (interno y público).
 *   name            form-associated
 *   placeholder, autocomplete, maxlength, disabled, readonly, required
 *   variant      outlined (default) | filled | underlined
 *   invalid         se setea automáticamente al perder focus si required+empty
 *
 * Slots
 *   start, end      adornos
 *
 * Eventos
 *   is-input, is-change, is-complete (bubbles + composed)
 *
 * Token CSS: --is-field-width
 */
(() => {
  const OBSERVED = [
    'pattern', 'value', 'name', 'placeholder', 'autocomplete',
    'maxlength', 'disabled', 'readonly', 'required',
    'variant', 'invalid',
  ];

  class IsMaskedInput extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #internals;
    #mounted = false;
    #suppress = false;
    #input;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = /* html */ `
        <div part="field" class="field">
          <slot name="start"></slot>
          <input part="input" class="input" id="input" type="text" />
          <slot name="end"></slot>
        </div>
      `;
      adoptCss(shadow, import.meta.url);
      this.#internals = attachFormInternals(this);
      this.#input = shadow.getElementById('input');
      this.#input.addEventListener('input', () => this.#onInput());
      this.#input.addEventListener('blur', () => this.#syncValidity());
      // El input interno vive en shadow: su `change` no cruza el límite, hay
      // que reemitirlo con el vocabulario de la librería.
      this.#input.addEventListener('change', () => emit(this, 'is-change', { value: this.value }));
      this.addEventListener('slotchange', () => this.#syncSlots());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncPattern();
      this.#syncSlots();
      // initial value (si el atributo vino pre-formateado, se reformatea igual)
      const attrValue = this.getAttribute('value');
      if (attrValue != null) this.value = attrValue;
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'pattern') this.#syncPattern();
      if (name === 'value') {
        if (this.value !== newVal) this.value = newVal;
      }
      if (name === 'invalid') {
        setCustomState(this.#internals, 'invalid', this.hasAttribute('invalid'));
      }
      if (name === 'disabled' || name === 'readonly' || name === 'required') {
        this.#syncDisabled();
        this.#syncValidity();
      }
    }

    get pattern() { return this.getAttribute('pattern') || ''; }
    set pattern(v) {
      setStringAttr(this, 'pattern', v);
    }

    get value() { return this.#input.value; }
    set value(v) {
      const next = apply(v, this.pattern);
      if (this.#input.value === next) return;
      this.#suppress = true;
      this.#input.value = next;
      this.#suppress = false;
      this.#syncComplete();
      if (this.#mounted) {
        emit(this, 'is-input');
        setFormValue(this.#internals, next);
      }
    }

    /** Sólo caracteres limpios (sin literales). Útil para enviar al backend. */
    get raw() {
      return String(this.#input.value || '').replace(/[^A-Za-z0-9]/g, '');
    }

    /** Devuelve el texto formateado actual. */
    get formatted() { return this.#input.value; }

    /** ¿El usuario rellenó todos los slots requeridos? */
    get complete() { return isComplete(this.#input.value, this.pattern); }

    focus() { this.#input.focus(); }
    blur() { this.#input.blur(); }

    #onInput() {
      if (this.#suppress) return;
      // aceptar lo que el usuario escribió, reformatearlo, restaurar caret razonable
      const before = this.#input.value;
      const next = apply(this.#input.value, this.pattern);
      const caret = this.#input.selectionStart ?? before.length;
      // ajuste simple: deja el caret al final del valor formateado
      this.#input.value = next;
      const newCaret = Math.min(next.length, caret + (next.length - before.length));
      try { this.#input.setSelectionRange(newCaret, newCaret); } catch { /* noop */ }
      this.#syncComplete();
      emit(this, 'is-input');
      setFormValue(this.#internals, next);
    }

    #syncPattern() {
      const p = this.pattern;
      this.#input.placeholder = p;
      // maxlength opcional desde el usuario, sin pisarlo si ya estaba
      if (!this.hasAttribute('maxlength')) {
        try { this.#input.maxLength = p.length || -1; } catch { /* noop */ }
      }
      // re-formatear valor actual con el nuevo patrón
      if (this.#mounted) this.value = this.value;
    }

    #syncSlots() {
      const startSlot = this.shadowRoot.querySelector('slot[name="start"]');
      const endSlot = this.shadowRoot.querySelector('slot[name="end"]');
      // si los slots están vacíos, ocupa todo el ancho; si no, deja hueco
      this.#input.classList.toggle('with-start', !!startSlot?.assignedNodes?.().length);
      this.#input.classList.toggle('with-end', !!endSlot?.assignedNodes?.().length);
    }

    #syncDisabled() {
      const dis = this.hasAttribute('disabled');
      const ro = this.hasAttribute('readonly');
      this.#input.disabled = dis;
      this.#input.readOnly = ro;
      if (this.#input.disabled) this.#input.blur();
    }

    #syncComplete() {
      const complete = this.complete;
      setCustomState(this.#internals, 'complete', complete);
      if (complete) emit(this, 'is-complete');
    }

    #syncValidity() {
      if (this.hasAttribute('required') && !this.value) {
        this.setAttribute('invalid', '');
      } else if (this.hasAttribute('invalid') && !this.hasAttribute('required')) {
        this.removeAttribute('invalid');
      }
    }
  }

  defineElement('is-masked-input', IsMaskedInput);
})();
