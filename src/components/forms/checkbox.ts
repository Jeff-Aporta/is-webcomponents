import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';

import {
  attachFormInternals,
  clearValidity,
  setCustomState,
  setFormValue,
  setValidity,
} from '../_shared/form-associated.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr, setOptionalAttr } from '../_shared/reflect.js';
import { hasSlotted } from '../_shared/dom-utils.js';
/**
 * <is-checkbox> — Casilla form-associated: entra en FormData y en la validación del <form>.
 *
 * Atributos
 *   name, value (default "on"), hint
 *   color             brand (default) | neutral | success | warning | danger
 *   label-placement     end (default) | start | top | bottom
 *   icon                nombre de <is-icon> para el estado sin marcar
 *   checked-icon        nombre de <is-icon> para el estado marcado (default mdi:check)
 *   indeterminate-icon  nombre de <is-icon> para el estado mixto (default mdi:minus)
 *   checked, indeterminate, disabled, readonly, required, error   (boolean)
 *
 * Slots: default (etiqueta), hint
 * Parts: form-control, base, control, mark, label, hint
 * Custom states: checked, indeterminate, disabled, readonly, error
 * Events: is-change { checked, value }
 *
 * Sin atributo `size`: escala con el font-size del contexto.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <div part="base" class="base">
        <span part="control" class="control">
          <is-icon part="mark" class="mark" hidden></is-icon>
        </span>
        <span part="label" class="label" id="label"><slot></slot></span>
      </div>
      <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
    </div>
  `;

  const OBSERVED = [
    'name', 'value', 'checked', 'disabled', 'readonly', 'required', 'indeterminate',
    'error', 'hint', 'color', 'label-placement',
    'icon', 'checked-icon', 'indeterminate-icon',
  ];

  const VARIANTS = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const PLACEMENTS = ['end', 'start', 'top', 'bottom'];

  /** Sin flatten: el texto de fallback del slot no cuenta como contenido propio. */

  class IsCheckbox extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    size: '--is-checkbox-size',
    radius: '--is-checkbox-radius',
    bg: { prop: '--is-checkbox-bg', onlyColorValues: true },
    'bg-hover': { prop: '--is-checkbox-bg-hover', onlyColorValues: true },
    'border-color': { prop: '--is-checkbox-border', onlyColorValues: true },
    accent: { prop: '--is-checkbox-accent', onlyColorValues: true },
    'focus-color': { prop: '--is-checkbox-focus', onlyColorValues: true },
    'mark-color': { prop: '--is-checkbox-mark', onlyColorValues: true },
    halo: '--is-checkbox-halo',
    };

    static formAssociated = true;
    static get observedAttributes(): string[] { return [...OBSERVED, 'size', 'radius', 'bg', 'bg-hover', 'border-color', 'accent', 'focus-color', 'mark-color', 'halo']; }

    #internals = null;
    #control!: HTMLElement;
    #mark!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintEl!: HTMLElement;
    #hintSlot!: HTMLSlotElement;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultChecked = false;
    #defaultIndeterminate = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#control = shadow.querySelector<HTMLElement>('.control')!;
      this.#mark = shadow.querySelector<HTMLElement>('.mark')!;
      this.#labelEl = shadow.getElementById('label')!;
      this.#labelSlot = this.#labelEl.querySelector<HTMLSlotElement>('slot')!;
      this.#hintEl = shadow.getElementById('hint')!;
      this.#hintSlot = this.#hintEl.querySelector<HTMLSlotElement>('slot')!;
      this.#internals = attachFormInternals(this);

      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKey);
      this.#labelSlot.addEventListener('slotchange', this.#syncSlots);
      this.#hintSlot.addEventListener('slotchange', this.#syncSlots);
    }

    onConnected() {
      if (!this.#defaultsRead) {
        this.#defaultsRead = true;
        this.#defaultChecked = this.checked;
        this.#defaultIndeterminate = this.indeterminate;
      }
      if (!this.hasAttribute('role')) this.setAttribute('role', 'checkbox');
      this.#syncSlots();
      this.#sync();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'hint') {
        this.#syncSlots();
        return;
      }
      this.#sync();
    }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

    get indeterminate() { return this.hasAttribute('indeterminate'); }
    set indeterminate(v) { this.toggleAttribute('indeterminate', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get error() { return this.hasAttribute('error'); }
    set error(v) { this.toggleAttribute('error', !!v); }

    get value() { return this.getAttribute('value') ?? 'on'; }
    set value(v) { setStringAttr(this, 'value', v); }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { setStringAttr(this, 'name', v); }

    get hint() { return this.getAttribute('hint') ?? ''; }
    set hint(v) { setOptionalAttr(this, 'hint', v); }

    get color() {
      const v = this.getAttribute('color');
      return VARIANTS.includes(v) ? v : 'brand';
    }
    set color(v) { this.setAttribute('color', VARIANTS.includes(v) ? v : 'brand'); }

    get labelPlacement() {
      const v = this.getAttribute('label-placement');
      return PLACEMENTS.includes(v) ? v : 'end';
    }
    set labelPlacement(v) { this.setAttribute('label-placement', PLACEMENTS.includes(v) ? v : 'end'); }

    get icon() { return this.getAttribute('icon') ?? ''; }
    set icon(v) { setStringAttr(this, 'icon', v); }

    get checkedIcon() { return this.getAttribute('checked-icon') ?? ''; }
    set checkedIcon(v) { setStringAttr(this, 'checked-icon', v); }

    get indeterminateIcon() { return this.getAttribute('indeterminate-icon') ?? ''; }
    set indeterminateIcon(v) { setStringAttr(this, 'indeterminate-icon', v); }

    get form() { return this.#internals?.form ?? null; }
    get validity() { return this.#internals?.validity ?? null; }
    get validationMessage() { return this.#internals?.validationMessage ?? ''; }

    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#control);
      else this.#updateValidity();
    }

    formResetCallback() {
      this.toggleAttribute('checked', this.#defaultChecked);
      this.toggleAttribute('indeterminate', this.#defaultIndeterminate);
      this.#sync();
    }

    formDisabledCallback(disabled) {
      this.#formDisabled = !!disabled;
      this.#sync();
    }

    get #isDisabled() { return this.disabled || this.#formDisabled; }

    #syncSlots = () => {
      const hint = this.hint.trim();
      const hasHintSlot = hasSlotted(this.#hintSlot);
      if (!hasHintSlot && this.#hintSlot.textContent !== hint) this.#hintSlot.textContent = hint;
      this.#hintEl.hidden = !hint && !hasHintSlot;
      this.#labelEl.hidden = !hasSlotted(this.#labelSlot);
      try {
        this.#internals.ariaDescribedByElements = this.#hintEl.hidden ? [] : [this.#hintEl];
      } catch { /* motores sin ariaDescribedByElements */ }
    };

    #sync() {
      const disabled = this.#isDisabled;
      const readonly = this.readonly;
      const mixed = this.indeterminate;
      const checked = this.checked;

      this.setAttribute('aria-checked', mixed ? 'mixed' : String(checked));
      this.setAttribute('aria-disabled', String(disabled));
      if (readonly) this.setAttribute('aria-readonly', 'true');
      else this.removeAttribute('aria-readonly');
      if (this.error) this.setAttribute('aria-invalid', 'true');
      else this.removeAttribute('aria-invalid');
      if (this.required) this.setAttribute('aria-required', 'true');
      else this.removeAttribute('aria-required');
      this.setAttribute('tabindex', disabled ? '-1' : '0');

      const icon = mixed
        ? (this.indeterminateIcon || 'mdi:minus')
        : checked ? (this.checkedIcon || 'mdi:check') : this.icon;
      if (icon) this.#mark.setAttribute('icon', icon);
      else this.#mark.removeAttribute('icon');
      this.#mark.hidden = !icon;

      setCustomState(this.#internals, 'checked', checked && !mixed);
      setCustomState(this.#internals, 'indeterminate', mixed);
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', readonly);
      setCustomState(this.#internals, 'error', this.error);

      setFormValue(this.#internals, checked ? this.value : null);
      this.#updateValidity();
    }

    #updateValidity() {
      if (this.required && !this.checked) {
        setValidity(this.#internals, { valueMissing: true }, 'Marque esta casilla', this.#control);
        return;
      }
      clearValidity(this.#internals, this.#control);
    }

    /** Toggle por interacción: el estado mixto se limpia al primer clic. */
    #toggle() {
      if (this.#isDisabled || this.readonly) return;
      const next = !this.checked;
      if (this.indeterminate) this.indeterminate = false;
      this.checked = next;
      emit(this, 'is-change', { checked: next, value: this.value });
    }

    #onClick = (e: PointerEvent) => {
      if (this.#isDisabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // El texto de ayuda no forma parte del control.
      if (e.composedPath().includes(this.#hintEl)) return;
      this.#toggle();
    };

    #onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      this.#toggle();
    };
  }

  defineElement('is-checkbox', IsCheckbox, 'IsCheckbox');
})();
