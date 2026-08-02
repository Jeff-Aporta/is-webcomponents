import { adoptCss } from '../_shared/adopt-css.js';
import {
  attachFormInternals, setCustomState, setFormValue, setValidity, clearValidity
} from '../_shared/form-associated.js';
import '../media/icon.js';

/**
 * <is-input> — Campo de texto form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   type            text | email | password | number | search | tel | url | date  (default text)
 *   name, value, placeholder, label, hint, autocomplete
 *   variant      outlined (default) | filled | underlined
 *   label-placement top (default) | start
 *   error-text      mensaje mostrado en lugar del hint cuando hay error
 *   prefix, suffix  adornos de texto corto ("$", "kg") sin usar slot
 *   min, max, step, maxlength     (pasan al input nativo interno)
 *   disabled, required, readonly, clearable, password-toggle,
 *   error, show-count, full-width                              (boolean)
 *
 * Slots: label, hint, start, end
 * Parts: form-control, label, base, start, prefix, input, clear, toggle, suffix, end,
 *        support, hint, error-text, count
 * Custom states: blank, disabled, readonly, focused, invalid, password-visible
 * Eventos: is-input, is-change (bubbles + composed) y los nativos input/change
 * Tokens: --is-field-width, --is-field-label-width, --is-input-*
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" id="label" for="input" hidden><slot name="label"></slot></label>
      <div part="base" class="base">
        <span part="start" class="adorn" id="start" hidden>
          <span part="prefix" class="adorn-text" id="prefix" hidden></span>
          <slot name="start"></slot>
        </span>
        <input part="input" class="input" id="input" type="text" aria-describedby="hint error-text" />
        <button type="button" part="clear" class="icon-btn" id="clear" hidden tabindex="-1" aria-label="Limpiar">
          <is-icon icon="mdi:close-circle"></is-icon>
        </button>
        <button type="button" part="toggle" class="icon-btn" id="toggle" hidden tabindex="-1" aria-label="Mostrar contraseña">
          <is-icon icon="mdi:eye-outline"></is-icon>
        </button>
        <span part="end" class="adorn" id="end" hidden>
          <slot name="end"></slot>
          <span part="suffix" class="adorn-text" id="suffix" hidden></span>
        </span>
      </div>
      <div part="support" class="support" id="support" hidden>
        <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
        <div part="error-text" class="error-text" id="error-text" hidden></div>
        <div part="count" class="count" id="count" hidden></div>
      </div>
    </div>
  `;

  const TYPES = ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'date'];
  const APPEARANCES = ['outlined', 'filled', 'underlined'];
  const PLACEMENTS = ['top', 'start'];

  const OBSERVED = [
    'type', 'name', 'value', 'placeholder', 'label', 'hint',
    'disabled', 'required', 'readonly', 'clearable', 'password-toggle',
    'min', 'max', 'step', 'maxlength', 'autocomplete',
    'error', 'error-text', 'show-count', 'prefix', 'suffix'
  ];

  const PROPS = [
    'type', 'name', 'value', 'placeholder', 'label', 'hint',
    'disabled', 'required', 'readonly', 'clearable', 'passwordToggle',
    'min', 'max', 'step', 'maxlength', 'autocomplete',
    'variant', 'labelPlacement', 'error', 'errorText', 'showCount',
    'fullWidth', 'prefixText', 'suffixText'
  ];

  const NATIVE_ATTRS = ['placeholder', 'min', 'max', 'step', 'maxlength', 'autocomplete', 'name'];

  const MIRRORED_FLAGS = [
    'badInput', 'patternMismatch', 'rangeOverflow', 'rangeUnderflow',
    'stepMismatch', 'tooLong', 'tooShort', 'typeMismatch'
  ];

  function hasSlotted(slot) {
    return slot.assignedNodes({ flatten: true }).some(
      (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
    );
  }

  class IsInput extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #input;
    #labelEl;
    #supportEl;
    #hintEl;
    #errorEl;
    #countEl;
    #startEl;
    #endEl;
    #prefixEl;
    #suffixEl;
    #clearBtn;
    #toggleBtn;
    #labelSlot;
    #hintSlot;
    #startSlot;
    #endSlot;
    #value = '';
    #mounted = false;
    #passwordVisible = false;
    #hasHint = false;
    #touched = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#input = shadow.getElementById('input');
      this.#labelEl = shadow.getElementById('label');
      this.#supportEl = shadow.getElementById('support');
      this.#hintEl = shadow.getElementById('hint');
      this.#errorEl = shadow.getElementById('error-text');
      this.#countEl = shadow.getElementById('count');
      this.#startEl = shadow.getElementById('start');
      this.#endEl = shadow.getElementById('end');
      this.#prefixEl = shadow.getElementById('prefix');
      this.#suffixEl = shadow.getElementById('suffix');
      this.#clearBtn = shadow.getElementById('clear');
      this.#toggleBtn = shadow.getElementById('toggle');
      this.#labelSlot = this.#labelEl.querySelector('slot');
      this.#hintSlot = this.#hintEl.querySelector('slot');
      this.#startSlot = this.#startEl.querySelector('slot');
      this.#endSlot = this.#endEl.querySelector('slot');

      this.#internals = attachFormInternals(this);

      this.#input.addEventListener('input', this.#onInput);
      this.#input.addEventListener('change', this.#onChange);
      this.#input.addEventListener('focus', this.#onFocus);
      this.#input.addEventListener('blur', this.#onBlur);
      this.#clearBtn.addEventListener('click', this.#onClear);
      this.#toggleBtn.addEventListener('click', this.#onTogglePassword);
      for (const slot of shadow.querySelectorAll('slot')) {
        slot.addEventListener('slotchange', this.#syncSlots);
      }
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProps();
      this.#value = this.getAttribute('value') ?? '';
      this.#syncSlots();
      this.#syncNative();
      this.#syncDisabled();
      this.#update();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') {
        this.#value = newVal ?? '';
        this.#syncNative();
        this.#update();
      } else if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
        this.#update();
      } else if (name === 'label' || name === 'hint' || name === 'prefix' || name === 'suffix') {
        this.#syncSlots();
      } else if (name === 'error' || name === 'error-text' || name === 'show-count') {
        this.#syncSupport();
      } else {
        this.#syncNative();
        this.#update();
      }
    }

    // ---- propiedades ----------------------------------------------------

    get value() { return this.#value; }
    set value(v) {
      const next = v == null ? '' : String(v);
      if (next === this.#value) return;
      this.#value = next;
      if (this.#input.value !== next) this.#input.value = next;
      this.#update();
    }

    /** Valor del atributo `value` — el que restaura formResetCallback. */
    get defaultValue() { return this.getAttribute('value') ?? ''; }

    get type() {
      const t = (this.getAttribute('type') || 'text').toLowerCase();
      return TYPES.includes(t) ? t : 'text';
    }
    set type(v) { this.setAttribute('type', String(v)); }

    get variant() {
      const a = (this.getAttribute('variant') || '').toLowerCase();
      return APPEARANCES.includes(a) ? a : 'outlined';
    }
    set variant(v) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (APPEARANCES.includes(String(v))) this.setAttribute('variant', String(v));
    }

    get labelPlacement() {
      const p = (this.getAttribute('label-placement') || '').toLowerCase();
      return PLACEMENTS.includes(p) ? p : 'top';
    }
    set labelPlacement(v) {
      if (v == null || v === '') this.removeAttribute('label-placement');
      else if (PLACEMENTS.includes(String(v))) this.setAttribute('label-placement', String(v));
    }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { v == null || v === '' ? this.removeAttribute('name') : this.setAttribute('name', String(v)); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get clearable() { return this.hasAttribute('clearable'); }
    set clearable(v) { this.toggleAttribute('clearable', !!v); }

    get passwordToggle() { return this.hasAttribute('password-toggle'); }
    set passwordToggle(v) { this.toggleAttribute('password-toggle', !!v); }

    get error() { return this.hasAttribute('error'); }
    set error(v) { this.toggleAttribute('error', !!v); }

    get errorText() { return this.getAttribute('error-text') ?? ''; }
    set errorText(v) { v == null ? this.removeAttribute('error-text') : this.setAttribute('error-text', String(v)); }

    get showCount() { return this.hasAttribute('show-count'); }
    set showCount(v) { this.toggleAttribute('show-count', !!v); }

    get fullWidth() { return this.hasAttribute('full-width'); }
    set fullWidth(v) { this.toggleAttribute('full-width', !!v); }

    /** `prefix` ya existe en Element (namespace XML): la propiedad se llama prefixText. */
    get prefixText() { return this.getAttribute('prefix') ?? ''; }
    set prefixText(v) { v == null ? this.removeAttribute('prefix') : this.setAttribute('prefix', String(v)); }

    get suffixText() { return this.getAttribute('suffix') ?? ''; }
    set suffixText(v) { v == null ? this.removeAttribute('suffix') : this.setAttribute('suffix', String(v)); }

    get placeholder() { return this.getAttribute('placeholder') ?? ''; }
    set placeholder(v) { v == null ? this.removeAttribute('placeholder') : this.setAttribute('placeholder', String(v)); }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null ? this.removeAttribute('label') : this.setAttribute('label', String(v)); }

    get hint() { return this.getAttribute('hint') ?? ''; }
    set hint(v) { v == null ? this.removeAttribute('hint') : this.setAttribute('hint', String(v)); }

    get min() { return this.getAttribute('min'); }
    set min(v) { v == null ? this.removeAttribute('min') : this.setAttribute('min', String(v)); }

    get max() { return this.getAttribute('max'); }
    set max(v) { v == null ? this.removeAttribute('max') : this.setAttribute('max', String(v)); }

    get step() { return this.getAttribute('step'); }
    set step(v) { v == null ? this.removeAttribute('step') : this.setAttribute('step', String(v)); }

    get maxlength() { return this.getAttribute('maxlength'); }
    set maxlength(v) { v == null ? this.removeAttribute('maxlength') : this.setAttribute('maxlength', String(v)); }

    get autocomplete() { return this.getAttribute('autocomplete'); }
    set autocomplete(v) { v == null ? this.removeAttribute('autocomplete') : this.setAttribute('autocomplete', String(v)); }

    /** Input nativo interno — útil para casos avanzados. */
    get input() { return this.#input; }

    // ---- API pública -----------------------------------------------------

    focus(options) { this.#input.focus(options); }
    blur() { this.#input.blur(); }
    select() { this.#input.select?.(); }
    setSelectionRange(...args) { this.#input.setSelectionRange?.(...args); }

    get validity() { return this.#internals?.validity; }
    get validationMessage() { return this.#internals?.validationMessage ?? ''; }
    get willValidate() { return this.#internals?.willValidate ?? false; }
    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() {
      this.#touched = true;
      this.#syncSupport();
      return this.#internals?.reportValidity() ?? true;
    }
    setCustomValidity(msg) {
      if (msg) {
        setValidity(this.#internals, { customError: true }, msg, this.#input);
        this.#syncSupport();
      } else this.#update();
    }

    // ---- form-associated callbacks --------------------------------------

    formResetCallback() {
      this.#value = this.defaultValue;
      this.#input.value = this.#value;
      this.#touched = false;
      this.#update();
    }

    formDisabledCallback(disabled) {
      this.#syncDisabled(disabled);
      this.#update();
    }

    formStateRestoreCallback(state) {
      if (typeof state === 'string') this.value = state;
    }

    // ---- privados --------------------------------------------------------

    #upgradeProps() {
      for (const p of PROPS) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = this[p];
          delete this[p];
          this[p] = v;
        }
      }
    }

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #syncSlots = () => {
      const labelAttr = this.label.trim();
      const hintAttr = this.hint.trim();
      const hasLabelSlot = hasSlotted(this.#labelSlot);
      const hasHintSlot = hasSlotted(this.#hintSlot);
      if (!hasLabelSlot) this.#labelSlot.textContent = labelAttr;
      if (!hasHintSlot) this.#hintSlot.textContent = hintAttr;
      this.#labelEl.hidden = !labelAttr && !hasLabelSlot;
      this.#hasHint = !!hintAttr || hasHintSlot;

      const prefix = this.prefixText;
      const suffix = this.suffixText;
      this.#prefixEl.textContent = prefix;
      this.#prefixEl.hidden = !prefix;
      this.#suffixEl.textContent = suffix;
      this.#suffixEl.hidden = !suffix;
      this.#startEl.hidden = !prefix && !hasSlotted(this.#startSlot);
      this.#endEl.hidden = !suffix && !hasSlotted(this.#endSlot);

      this.#syncSupport();
    };

    #syncNative() {
      const input = this.#input;
      const type = this.type;
      const effective = type === 'password' && this.#passwordVisible ? 'text' : type;
      if (input.getAttribute('type') !== effective) input.setAttribute('type', effective);
      for (const a of NATIVE_ATTRS) {
        const v = this.getAttribute(a);
        if (v == null) input.removeAttribute(a);
        else input.setAttribute(a, v);
      }
      if (input.value !== this.#value) input.value = this.#value;
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      const readonly = this.readonly;
      this.#input.disabled = disabled;
      this.#input.readOnly = readonly;
      this.#clearBtn.disabled = disabled;
      this.#toggleBtn.disabled = disabled;
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', readonly);
    }

    /** Recalcula botones, form value, validez y estados. Fuente única de verdad. */
    #update() {
      const v = this.#value;
      const interactive = !this.disabled && !this.#input.disabled && !this.readonly;

      this.#clearBtn.hidden = !(this.clearable && v !== '' && interactive);
      this.#toggleBtn.hidden = !(this.type === 'password' && this.passwordToggle && !this.disabled);

      setCustomState(this.#internals, 'blank', v === '');
      setFormValue(this.#internals, v || null);
      this.#updateValidity();
      this.#syncSupport();
    }

    #updateValidity() {
      if (!this.#internals) return;
      const v = this.#value;
      if (this.required && v === '') {
        setValidity(this.#internals, { valueMissing: true }, 'Este campo es obligatorio', this.#input);
        this.#input.setAttribute('aria-invalid', 'true');
        return;
      }
      const native = this.#input.validity;
      if (v !== '' && native && !native.valid) {
        const flags = {};
        for (const f of MIRRORED_FLAGS) if (native[f]) flags[f] = true;
        if (Object.keys(flags).length) {
          setValidity(this.#internals, flags, this.#input.validationMessage, this.#input);
          this.#input.setAttribute('aria-invalid', 'true');
          return;
        }
      }
      clearValidity(this.#internals, this.#input);
      this.#input.removeAttribute('aria-invalid');
    }

    /** Fila de apoyo: hint / error-text / contador, y el estado visual `invalid`. */
    #syncSupport() {
      const failed = this.#touched && this.#internals?.validity?.valid === false;
      const invalid = this.error || failed;
      setCustomState(this.#internals, 'invalid', invalid);

      // Sin error-text propio se cae al mensaje nativo, pero solo si el error lo
      // detectó la validación (con `error` a secas el hint sigue siendo el texto).
      const msg = invalid ? (this.errorText || (failed ? this.validationMessage : '')) : '';
      this.#errorEl.textContent = msg;
      this.#errorEl.hidden = !msg;
      this.#hintEl.hidden = !!msg || !this.#hasHint;

      const showCount = this.showCount;
      if (showCount) {
        const max = this.maxlength;
        this.#countEl.textContent = max ? `${this.#value.length}/${max}` : String(this.#value.length);
      }
      this.#countEl.hidden = !showCount;

      this.#supportEl.hidden = this.#hintEl.hidden && this.#errorEl.hidden && this.#countEl.hidden;
    }

    #onInput = () => {
      this.#value = this.#input.value;
      this.#update();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.#emit('is-input', { value: this.#value });
    };

    #onChange = () => {
      this.#value = this.#input.value;
      this.#touched = true;
      this.#update();
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.#emit('is-change', { value: this.#value });
    };

    #onFocus = () => { setCustomState(this.#internals, 'focused', true); };

    #onBlur = () => {
      setCustomState(this.#internals, 'focused', false);
      this.#touched = true;
      this.#syncSupport();
    };

    #onClear = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.#value === '') return;
      this.#value = '';
      this.#input.value = '';
      this.#update();
      this.#input.focus();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.#emit('is-input', { value: '' });
      this.#emit('is-change', { value: '' });
    };

    #onTogglePassword = (e) => {
      e.preventDefault();
      this.#passwordVisible = !this.#passwordVisible;
      setCustomState(this.#internals, 'password-visible', this.#passwordVisible);
      this.#toggleBtn.querySelector('is-icon')
        .setAttribute('icon', this.#passwordVisible ? 'mdi:eye-off-outline' : 'mdi:eye-outline');
      this.#toggleBtn.setAttribute(
        'aria-label', this.#passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
      );
      this.#syncNative();
      this.#input.focus();
    };
  }

  if (!customElements.get('is-input')) {
    customElements.define('is-input', IsInput);
  }
  if (typeof window !== 'undefined') window.IsInput = IsInput;
})();
