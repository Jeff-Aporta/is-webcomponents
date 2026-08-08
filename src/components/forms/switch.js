import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

import {
  attachFormInternals,
  clearValidity,
  setCustomState,
  setFormValue,
  setValidity,
} from '../_shared/form-associated.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { setStringAttr, setOptionalAttr } from '../_shared/reflect.js';
import { hasSlotted } from '../_shared/dom-utils.js';
/**
 * <is-switch> — Interruptor form-associated (track + thumb).
 *
 * Atributos
 *   name, value (default "on"), hint
 *   color          brand (default) | neutral | success | warning | danger
 *   label-placement  end (default) | start | top | bottom
 *   icon             nombre de <is-icon> dentro del thumb apagado
 *   checked-icon     nombre de <is-icon> dentro del thumb encendido
 *   on-label         texto corto dentro del track cuando está encendido
 *   off-label        texto corto dentro del track cuando está apagado
 *   checked, disabled, readonly, required, error   (boolean)
 *
 * Slots: default (etiqueta), hint
 * Parts: form-control, base, control, track-label, thumb, mark, label, hint
 * Custom states: checked, disabled, readonly, error
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
          <span part="track-label" class="track-label on" id="onLabel" hidden></span>
          <span part="track-label" class="track-label off" id="offLabel" hidden></span>
          <span part="thumb" class="thumb">
            <is-icon part="mark" class="mark" hidden></is-icon>
          </span>
        </span>
        <span part="label" class="label" id="label"><slot></slot></span>
      </div>
      <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
    </div>
  `;

  const OBSERVED = [
    'name', 'value', 'checked', 'disabled', 'readonly', 'required',
    'error', 'hint', 'color', 'label-placement',
    'icon', 'checked-icon', 'on-label', 'off-label',
  ];

  const VARIANTS = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const PLACEMENTS = ['end', 'start', 'top', 'bottom'];

  /** Sin flatten: el texto de fallback del slot no cuenta como contenido propio. */

  class IsSwitch extends ElementBase {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #control;
    #mark;
    #onLabelEl;
    #offLabelEl;
    #labelEl;
    #labelSlot;
    #hintEl;
    #hintSlot;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultChecked = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#control = shadow.querySelector('.control');
      this.#mark = shadow.querySelector('.mark');
      this.#onLabelEl = shadow.getElementById('onLabel');
      this.#offLabelEl = shadow.getElementById('offLabel');
      this.#labelEl = shadow.getElementById('label');
      this.#labelSlot = this.#labelEl.querySelector('slot');
      this.#hintEl = shadow.getElementById('hint');
      this.#hintSlot = this.#hintEl.querySelector('slot');
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
      }
      if (!this.hasAttribute('role')) this.setAttribute('role', 'switch');
      this.#syncSlots();
      this.#sync();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'hint') {
        this.#syncSlots();
        return;
      }
      this.#sync();
    }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

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

    get onLabel() { return this.getAttribute('on-label') ?? ''; }
    set onLabel(v) { setStringAttr(this, 'on-label', v); }

    get offLabel() { return this.getAttribute('off-label') ?? ''; }
    set offLabel(v) { setStringAttr(this, 'off-label', v); }

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
      const checked = this.checked;

      this.setAttribute('aria-checked', String(checked));
      this.setAttribute('aria-disabled', String(disabled));
      if (readonly) this.setAttribute('aria-readonly', 'true');
      else this.removeAttribute('aria-readonly');
      if (this.error) this.setAttribute('aria-invalid', 'true');
      else this.removeAttribute('aria-invalid');
      if (this.required) this.setAttribute('aria-required', 'true');
      else this.removeAttribute('aria-required');
      this.setAttribute('tabindex', disabled ? '-1' : '0');

      const icon = checked ? this.checkedIcon : this.icon;
      if (icon) this.#mark.setAttribute('icon', icon);
      else this.#mark.removeAttribute('icon');
      this.#mark.hidden = !icon;

      const on = this.onLabel;
      const off = this.offLabel;
      this.#onLabelEl.textContent = on;
      this.#onLabelEl.hidden = !on;
      this.#offLabelEl.textContent = off;
      this.#offLabelEl.hidden = !off;

      setCustomState(this.#internals, 'checked', checked);
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', readonly);
      setCustomState(this.#internals, 'error', this.error);

      setFormValue(this.#internals, checked ? this.value : null);
      this.#updateValidity();
    }

    #updateValidity() {
      if (this.required && !this.checked) {
        setValidity(this.#internals, { valueMissing: true }, 'Active esta opción', this.#control);
        return;
      }
      clearValidity(this.#internals, this.#control);
    }

    #toggle() {
      if (this.#isDisabled || this.readonly) return;
      const next = !this.checked;
      this.checked = next;
      emit(this, 'is-change', { checked: next, value: this.value });
    }

    #onClick = (e) => {
      if (this.#isDisabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // El texto de ayuda no forma parte del control.
      if (e.composedPath().includes(this.#hintEl)) return;
      this.#toggle();
    };

    #onKey = (e) => {
      if (e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Enter') return;
      e.preventDefault();
      this.#toggle();
    };
  }

  defineElement('is-switch', IsSwitch, 'IsSwitch');
})();
