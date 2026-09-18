import { adoptCss, defineElement, emit } from '../../core/element.js';
import './radio.js';

import {
  attachFormInternals,
  clearValidity,
  setCustomState,
  setFormValue,
  setValidity,
} from '../_shared/form-associated.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr, setOptionalAttr } from '../_shared/reflect.js';
/**
 * <is-radio-group> — Grupo form-associated de <is-radio>. El grupo es el dueño
 * del valor: los radios solo avisan con `is-radio-select`.
 *
 * Atributos
 *   name, value, label, hint
 *   orientation      vertical (default) | horizontal   ·   row = alias booleano de horizontal
 *   color          brand (default) | neutral | success | warning | danger
 *   label-placement  end (default) | start | top | bottom   (se aplica a los hijos)
 *   error-text       mensaje de error; sustituye al hint y activa el estado de error
 *   disabled, required, readonly, error   (boolean)
 *
 * Slots: default (<is-radio>), label, hint, error-text
 * Parts: form-control, label, base, hint, error-text
 * Custom states: disabled, readonly, error, blank
 * Events: is-change { value }
 */

// Subset tipado de <is-radio> (lo que el grupo necesita saber de cada hijo).
interface IsRadioElement extends HTMLElement {
  value: string;
  checked: boolean;
  disabled: boolean;
  syncFromGroup?(): void;
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <div part="label" class="label" hidden><slot name="label"></slot></div>
      <div part="base" class="base" role="radiogroup"><slot></slot></div>
      <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
      <div part="error-text" class="error-text" id="error" hidden><slot name="error-text"></slot></div>
    </div>
  `;

  const OBSERVED = [
    'name', 'value', 'disabled', 'required', 'readonly', 'label', 'hint',
    'orientation', 'row', 'color', 'label-placement', 'error', 'error-text',
  ];

  const VARIANTS = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const PLACEMENTS = ['end', 'start', 'top', 'bottom'];
  const NEXT_KEYS = ['ArrowDown', 'ArrowRight'];
  const PREV_KEYS = ['ArrowUp', 'ArrowLeft'];

  class IsRadioGroup extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    accent: { prop: '--is-radio-accent', onlyColorValues: true },
    };

    static formAssociated = true;
    static get observedAttributes(): string[] { return [...OBSERVED, 'accent']; }

    #internals: ElementInternals | null = null;
    #base!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintEl!: HTMLElement;
    #hintSlot!: HTMLSlotElement;
    #errorEl!: HTMLElement;
    #errorSlot!: HTMLSlotElement;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultValue: string | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#labelSlot = shadow.querySelector<HTMLSlotElement>('slot[name="label"]')!;
      this.#hintEl = shadow.getElementById('hint')!;
      this.#hintSlot = shadow.querySelector<HTMLSlotElement>('slot[name="hint"]')!;
      this.#errorEl = shadow.getElementById('error')!;
      this.#errorSlot = shadow.querySelector<HTMLSlotElement>('slot[name="error-text"]')!;
      this.#internals = attachFormInternals(this);

      shadow.querySelector<HTMLSlotElement>('.base slot')!.addEventListener('slotchange', this.#onSlotChange);
      this.#labelSlot.addEventListener('slotchange', this.#syncMeta);
      this.#hintSlot.addEventListener('slotchange', this.#syncMeta);
      this.#errorSlot.addEventListener('slotchange', this.#onErrorSlotChange);
      this.addEventListener('is-radio-select', this.#onRadioSelect);
      this.addEventListener('keydown', this.#onKey);
    }

    onConnected(): void {
      if (!this.#defaultsRead) {
        this.#defaultsRead = true;
        this.#defaultValue = this.getAttribute('value');
      }
      this.#syncMeta();
      this.#sync();
    }

    onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
      if (name === 'label' || name === 'hint' || name === 'error-text') this.#syncMeta();
      if (name !== 'label' && name !== 'hint') this.#sync();
    }

    get value(): string { return this.getAttribute('value') ?? ''; }
    set value(v: string) { setStringAttr(this, 'value', v); }

    get name(): string { return this.getAttribute('name') ?? ''; }
    set name(v: string) { setStringAttr(this, 'name', v); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get required(): boolean { return this.hasAttribute('required'); }
    set required(v: boolean) { this.toggleAttribute('required', !!v); }

    get readonly(): boolean { return this.hasAttribute('readonly'); }
    set readonly(v: boolean) { this.toggleAttribute('readonly', !!v); }

    /** Un mensaje de error implica error aunque no esté el booleano. */
    get error(): boolean { return this.hasAttribute('error') || !!this.errorText || this.#errorEl?.hidden === false; }
    set error(v: boolean) { this.toggleAttribute('error', !!v); }

    get errorText(): string { return (this.getAttribute('error-text') ?? '').trim(); }
    set errorText(v: string | null | undefined) {
      if (v == null || v === '') this.removeAttribute('error-text');
      else this.setAttribute('error-text', String(v));
    }

    get label(): string { return this.getAttribute('label') ?? ''; }
    set label(v: string | null | undefined) { setOptionalAttr(this, 'label', v); }

    get hint(): string { return this.getAttribute('hint') ?? ''; }
    set hint(v: string | null | undefined) { setOptionalAttr(this, 'hint', v); }

    /** `row` solo decide cuando no hay orientation explícita. */
    get orientation(): 'horizontal' | 'vertical' {
      const o = this.getAttribute('orientation');
      if (o === 'horizontal' || o === 'vertical') return o;
      return this.hasAttribute('row') ? 'horizontal' : 'vertical';
    }
    set orientation(v: 'horizontal' | 'vertical') { this.setAttribute('orientation', v === 'horizontal' ? 'horizontal' : 'vertical'); }

    get row(): boolean { return this.orientation === 'horizontal'; }
    set row(v: boolean) { this.toggleAttribute('row', !!v); }

    get color(): string {
      const v = this.getAttribute('color');
      return VARIANTS.includes(v ?? '') ? (v as string) : 'brand';
    }
    set color(v: string) {
      if (VARIANTS.includes(v)) this.setAttribute('color', v);
      else this.removeAttribute('color');
    }

    get labelPlacement(): string {
      const v = this.getAttribute('label-placement');
      return PLACEMENTS.includes(v ?? '') ? (v as string) : 'end';
    }
    set labelPlacement(v: string) {
      if (PLACEMENTS.includes(v)) this.setAttribute('label-placement', v);
      else this.removeAttribute('label-placement');
    }

    get radios(): IsRadioElement[] { return this.#radios(); }

    get form(): HTMLFormElement | null { return this.#internals?.form ?? null; }
    get validity(): ValidityState | null { return this.#internals?.validity ?? null; }
    get validationMessage(): string { return this.#internals?.validationMessage ?? ''; }

    checkValidity(): boolean { return this.#internals?.checkValidity() ?? true; }
    reportValidity(): boolean { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg: string): void {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#base);
      else this.#updateValidity();
    }

    focus(options?: FocusOptions): void {
      const radios = this.#radios();
      const target = radios.find((r) => r.getAttribute('tabindex') === '0') ?? radios.find((r) => !r.disabled);
      target?.focus(options);
    }

    formResetCallback(): void {
      if (this.#defaultValue == null) this.removeAttribute('value');
      else this.setAttribute('value', this.#defaultValue);
      this.#sync();
    }

    formDisabledCallback(disabled: boolean): void {
      this.#formDisabled = !!disabled;
      this.#sync();
    }

    get #isDisabled(): boolean { return this.disabled || this.#formDisabled; }

    /** Ni click ni teclado cambian el valor. */
    get #isInert(): boolean { return this.#isDisabled || this.readonly; }

    /** Radios propios: ignora los de un grupo anidado. */
    #radios(): IsRadioElement[] {
      return [...this.querySelectorAll<HTMLElement>('is-radio')].filter((r) => r.closest('is-radio-group') === this) as IsRadioElement[];
    }

    /** Muestra el texto del atributo salvo que el slot homónimo traiga contenido. */
    #applyMeta(el: HTMLElement, slot: HTMLSlotElement, text: string | null): void {
      const value = (text || '').trim();
      const slotted = slot.assignedNodes({ flatten: true })
        .some((n: Node) => n.nodeType === 1 || !!n.textContent?.trim());
      if (!slotted) slot.textContent = value;
      el.hidden = !value && !slotted;
    }

    #syncMeta = (): void => {
      const label = this.label;
      this.#applyMeta(this.#labelEl, this.#labelSlot, label);
      this.#applyMeta(this.#hintEl, this.#hintSlot, this.hint);
      this.#applyMeta(this.#errorEl, this.#errorSlot, this.getAttribute('error-text'));
      // El mensaje de error sustituye al hint
      if (!this.#errorEl.hidden) this.#hintEl.hidden = true;

      if (label) this.#base.setAttribute('aria-label', label);
      else this.#base.removeAttribute('aria-label');

      const described = [!this.#hintEl.hidden && 'hint', !this.#errorEl.hidden && 'error'].filter(Boolean) as string[];
      if (described.length) this.#base.setAttribute('aria-describedby', described.join(' '));
      else this.#base.removeAttribute('aria-describedby');
    };

    #sync(): void {
      const disabled = this.#isDisabled;
      this.#base.setAttribute('aria-disabled', String(disabled));
      this.#base.setAttribute('aria-orientation', this.orientation);
      this.#base.setAttribute('aria-required', String(this.required));
      this.#base.setAttribute('aria-readonly', String(this.readonly));
      this.#base.setAttribute('aria-invalid', String(this.error));
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', this.readonly);
      setCustomState(this.#internals, 'error', this.error);
      setCustomState(this.#internals, 'blank', !this.value);
      this.#syncRadios();
      setFormValue(this.#internals, this.value || null, null);
      this.#updateValidity();
    }

    /** Marca el radio del value actual, propaga herencia y reparte el roving tabindex. */
    #syncRadios(): void {
      const radios = this.#radios();
      const value = this.value;
      let focusable: IsRadioElement | null = null;
      for (const r of radios) {
        const on = value !== '' && r.value === value;
        if (r.checked !== on) r.checked = on;
        if (on && !r.disabled) focusable = r;
        r.syncFromGroup?.();
      }
      if (!focusable) focusable = radios.find((r) => !r.disabled) ?? null;
      const groupDisabled = this.#isDisabled;
      for (const r of radios) {
        r.setAttribute('tabindex', !groupDisabled && r === focusable ? '0' : '-1');
      }
    }

    #updateValidity(): void {
      if (this.required && !this.value) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione una opción', this.#base);
        return;
      }
      clearValidity(this.#internals, this.#base);
    }

    #select(value: string): void {
      if (this.#isInert) return;
      const changed = this.value !== value;
      this.value = value;
      this.#sync();
      if (changed) emit(this, 'is-change', { value });
    }

    /** Mueve foco (y selección, salvo readonly) al radio habilitado vecino, con wrap. */
    #move(from: IsRadioElement, delta: number): void {
      const usable = this.#radios().filter((r) => !r.disabled);
      if (!usable.length) return;
      let idx = usable.indexOf(from);
      if (idx < 0) idx = delta > 0 ? -1 : 0;
      const next = usable[(((idx + delta) % usable.length) + usable.length) % usable.length];
      if (next) this.#focusRadio(next);
    }

    #focusRadio(radio: IsRadioElement | undefined): void {
      if (!radio) return;
      this.#select(radio.value);
      radio.focus();
    }

    #onSlotChange = (): void => { this.#sync(); };

    #onErrorSlotChange = (): void => { this.#syncMeta(); this.#sync(); };

    #onRadioSelect = (e: Event): void => {
      const target = e.target as HTMLElement | null;
      const radio = target?.closest('is-radio') as IsRadioElement | null;
      if (!radio || radio.closest('is-radio-group') !== this) return;
      e.stopPropagation();
      this.#select(radio.value);
    };

    #onKey = (e: KeyboardEvent): void => {
      if (this.#isDisabled) return;
      const target = e.target as HTMLElement | null;
      const radio = target?.closest('is-radio') as IsRadioElement | null;
      if (!radio || radio.closest('is-radio-group') !== this) return;
      if (NEXT_KEYS.includes(e.key)) {
        e.preventDefault();
        this.#move(radio, 1);
      } else if (PREV_KEYS.includes(e.key)) {
        e.preventDefault();
        this.#move(radio, -1);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const usable = this.#radios().filter((r) => !r.disabled);
        this.#focusRadio(e.key === 'Home' ? usable[0] : usable[usable.length - 1]);
      }
    };
  }

  defineElement('is-radio-group', IsRadioGroup, 'IsRadioGroup');
})();
