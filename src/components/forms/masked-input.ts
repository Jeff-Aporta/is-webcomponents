import { adoptCss, defineElement, emit } from '@jeff-aporta/iswc-base/core/element.js';
import { attachFormInternals, clearValidity, setCustomState, setFormValue, setValidity } from '@jeff-aporta/iswc-base/core/form-associated.js';
import { apply, isComplete } from './utils/masks-tokens.js';
import { setStringAttr } from '@jeff-aporta/iswc-base/core/reflect.js';
import './input.js';

/**
 * <iswc-masked-input> — Input con formato aplicado (tarjeta de crédito, fecha,
 * teléfono, etc.). Tokeniza un patrón y aplica `apply()` al valor crudo en cada
 * cambio del campo.
 *
 * Está construido SOBRE <iswc-input>: etiqueta, ayuda, error, variantes, foco,
 * densidad y adornos viven allí. Lo que añade es solo la máscara.
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
 *   label, hint, error, error-text, placeholder (por defecto, el patrón), autocomplete,
 *   maxlength (por defecto, el largo del patrón), disabled, readonly, required,
 *   clearable, full-width
 *   variant         outlined (default) | filled | underlined
 *   label-placement top (default) | start | float
 *   invalid         se setea automáticamente al perder focus si required+empty
 *
 * Slots
 *   start, end      adornos
 *
 * Eventos
 *   iswc-input, iswc-change, iswc-complete (bubbles + composed)
 *
 * Token CSS: --iswc-field-width
 */
(() => {
  /** Atributos que <iswc-input> ya sabe resolver: se le pasan tal cual. */
  const REENVIADOS: string[] = [
    'label', 'hint', 'error-text', 'autocomplete', 'disabled', 'readonly', 'required',
    'variant', 'label-placement', 'full-width', 'clearable',
  ];
  const OBSERVED: string[] = [...REENVIADOS, 'pattern', 'value', 'name', 'placeholder', 'maxlength', 'invalid', 'error'];

  class IswcMaskedInput extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes(): string[] { return OBSERVED; }

    #internals: ElementInternals | null;
    #mounted = false;
    #field: HTMLElement & { value: string };
    #input: HTMLInputElement;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      this.#field = document.createElement('iswc-input') as HTMLElement & { value: string };
      this.#field.className = 'field';
      this.#field.setAttribute('part', 'field');
      this.#field.setAttribute('exportparts', 'form-control, label, base, input, hint, error-text');
      this.#field.innerHTML = /* html */ `
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
      `;
      shadow.appendChild(this.#field);
      this.#input = this.#field.shadowRoot!.getElementById('input') as HTMLInputElement;
      this.#internals = attachFormInternals(this);
      // Los eventos del campo interno se reemiten aquí con el valor enmascarado.
      this.#field.addEventListener('iswc-input', (e: Event) => { e.stopPropagation(); this.#onInput(); });
      this.#field.addEventListener('iswc-change', (e: Event) => {
        e.stopPropagation();
        emit(this, 'iswc-change', { value: this.value });
      });
      this.#field.addEventListener('focusout', () => this.#syncValidity());
    }

    connectedCallback(): void {
      this.#mounted = true;
      for (const name of REENVIADOS) this.#forward(name);
      this.#syncPattern();
      // initial value (si el atributo vino pre-formateado, se reformatea igual)
      const attrValue = this.getAttribute('value');
      if (attrValue != null) this.value = attrValue;
      this.#syncInvalid();
      this.#syncFormState();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (!this.#mounted || oldVal === newVal) return;
      if (REENVIADOS.includes(name)) this.#forward(name);
      if (name === 'pattern' || name === 'placeholder' || name === 'maxlength') this.#syncPattern();
      if (name === 'value' && this.value !== newVal) this.value = newVal;
      if (name === 'invalid' || name === 'error') this.#syncInvalid();
      if (name === 'required') this.#syncFormState();
    }

    get pattern(): string { return this.getAttribute('pattern') || ''; }
    set pattern(v: string) {
      setStringAttr(this, 'pattern', v);
    }

    get value(): string { return this.#field.value; }
    set value(v: string | null | undefined) {
      const next = apply(v, this.pattern);
      if (this.#field.value === next) return;
      this.#field.value = next;
      this.#syncComplete();
      if (!this.#mounted) return;
      emit(this, 'iswc-input');
      this.#syncFormState();
    }

    /** Sólo caracteres limpios (sin literales). Útil para enviar al backend. */
    get raw(): string {
      return String(this.value || '').replace(/[^A-Za-z0-9]/g, '');
    }

    /** Devuelve el texto formateado actual. */
    get formatted(): string { return this.value; }

    /** ¿El usuario rellenó todos los slots requeridos? */
    get complete(): boolean { return isComplete(this.value, this.pattern); }

    formResetCallback(): void {
      this.value = this.getAttribute('value') ?? '';
    }

    focus(): void { this.#input.focus(); }
    blur(): void { this.#input.blur(); }

    #forward(name: string): void {
      const v = this.getAttribute(name);
      if (v == null) this.#field.removeAttribute(name);
      else this.#field.setAttribute(name, v);
    }

    #onInput(): void {
      // aceptar lo que el usuario escribió, reformatearlo, restaurar caret razonable
      const before = this.#input.value;
      const next = apply(before, this.pattern);
      const caret = this.#input.selectionStart ?? before.length;
      this.#field.value = next;
      const newCaret = Math.min(next.length, caret + (next.length - before.length));
      try { this.#input.setSelectionRange(newCaret, newCaret); } catch { /* noop */ }
      this.#syncComplete();
      emit(this, 'iswc-input');
      this.#syncFormState();
    }

    #syncPattern(): void {
      const p = this.pattern;
      this.#field.setAttribute('placeholder', this.getAttribute('placeholder') ?? p);
      const max = this.getAttribute('maxlength') ?? (p.length ? String(p.length) : null);
      if (max == null) this.#field.removeAttribute('maxlength');
      else this.#field.setAttribute('maxlength', max);
      // re-formatear valor actual con el nuevo patrón
      if (this.#mounted) this.value = this.value;
    }

    #syncComplete(): void {
      const complete = this.complete;
      setCustomState(this.#internals, 'complete', complete);
      if (complete) emit(this, 'iswc-complete');
    }

    #syncInvalid(): void {
      const invalid = this.hasAttribute('invalid');
      this.#field.toggleAttribute('error', invalid || this.hasAttribute('error'));
      setCustomState(this.#internals, 'invalid', invalid);
    }

    #syncFormState(): void {
      setFormValue(this.#internals, this.value);
      if (this.hasAttribute('required') && !this.value) {
        setValidity(this.#internals, { valueMissing: true }, 'Completa este campo', this.#input);
      } else {
        clearValidity(this.#internals);
      }
    }

    #syncValidity(): void {
      this.toggleAttribute('invalid', this.hasAttribute('required') && !this.value);
    }
  }

  defineElement('iswc-masked-input', IswcMaskedInput);
})();
