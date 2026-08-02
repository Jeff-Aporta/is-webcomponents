import { adoptCss } from '../_shared/adopt-css.js';
import {
  attachFormInternals, setCustomState, setFormValue, setValidity, clearValidity
} from '../_shared/form-associated.js';

/**
 * <is-textarea> — Área de texto form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   name, value, placeholder, label, hint, maxlength
 *   rows            número de filas visibles (default 3)
 *   resize          none | vertical | both | auto   (default vertical; auto = autosize)
 *   min-rows        filas mínimas con autosize (default: rows)
 *   max-rows        filas máximas con autosize; a partir de ahí hace scroll
 *   variant      outlined (default) | filled | underlined
 *   label-placement top (default) | start
 *   error-text      mensaje mostrado en lugar del hint cuando hay error
 *   disabled, required, readonly, autosize, error, show-count, full-width  (boolean)
 *
 * Slots: label, hint
 * Parts: form-control, label, base, textarea, support, hint, error-text, count
 * Custom states: blank, disabled, readonly, focused, invalid
 * Eventos: is-input, is-change (bubbles + composed) y los nativos input/change
 * Tokens: --is-field-width, --is-field-label-width, --is-textarea-*
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" id="label" for="textarea" hidden><slot name="label"></slot></label>
      <div part="base" class="base">
        <textarea part="textarea" class="textarea" id="textarea" rows="3" aria-describedby="hint error-text"></textarea>
      </div>
      <div part="support" class="support" id="support" hidden>
        <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
        <div part="error-text" class="error-text" id="error-text" hidden></div>
        <div part="count" class="count" id="count" hidden></div>
      </div>
    </div>
  `;

  const RESIZE = ['none', 'vertical', 'both', 'auto'];
  const APPEARANCES = ['outlined', 'filled', 'underlined'];
  const PLACEMENTS = ['top', 'start'];

  const OBSERVED = [
    'name', 'value', 'placeholder', 'label', 'hint',
    'disabled', 'required', 'readonly', 'rows', 'maxlength', 'resize',
    'autosize', 'min-rows', 'max-rows', 'error', 'error-text', 'show-count'
  ];

  const PROPS = [
    'name', 'value', 'placeholder', 'label', 'hint',
    'disabled', 'required', 'readonly', 'rows', 'maxlength', 'resize',
    'autosize', 'minRows', 'maxRows', 'variant', 'labelPlacement',
    'error', 'errorText', 'showCount', 'fullWidth'
  ];

  function hasSlotted(slot) {
    return slot.assignedNodes({ flatten: true }).some(
      (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
    );
  }

  class IsTextarea extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #textarea;
    #labelEl;
    #supportEl;
    #hintEl;
    #errorEl;
    #countEl;
    #labelSlot;
    #hintSlot;
    #value = '';
    #mounted = false;
    #hasHint = false;
    #touched = false;
    #ro = null;
    #lastWidth = -1;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#textarea = shadow.getElementById('textarea');
      this.#labelEl = shadow.getElementById('label');
      this.#supportEl = shadow.getElementById('support');
      this.#hintEl = shadow.getElementById('hint');
      this.#errorEl = shadow.getElementById('error-text');
      this.#countEl = shadow.getElementById('count');
      this.#labelSlot = this.#labelEl.querySelector('slot');
      this.#hintSlot = this.#hintEl.querySelector('slot');

      this.#internals = attachFormInternals(this);

      this.#textarea.addEventListener('input', this.#onInput);
      this.#textarea.addEventListener('change', this.#onChange);
      this.#textarea.addEventListener('focus', this.#onFocus);
      this.#textarea.addEventListener('blur', this.#onBlur);
      this.#labelSlot.addEventListener('slotchange', this.#syncSlots);
      this.#hintSlot.addEventListener('slotchange', this.#syncSlots);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProps();
      this.#value = this.getAttribute('value') ?? '';
      this.#syncSlots();
      this.#syncNative();
      this.#syncDisabled();
      this.#update();
      // El ancho decide cuántas líneas ocupa el texto: refit al cambiar.
      if (typeof ResizeObserver !== 'undefined' && !this.#ro) {
        this.#ro = new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width ?? 0;
          if (w === this.#lastWidth) return;
          this.#lastWidth = w;
          this.#autofit();
        });
        this.#ro.observe(this);
      }
    }

    disconnectedCallback() {
      this.#ro?.disconnect();
      this.#ro = null;
      this.#lastWidth = -1;
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
      } else if (name === 'label' || name === 'hint') {
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
      if (this.#textarea.value !== next) this.#textarea.value = next;
      this.#update();
    }

    get defaultValue() { return this.getAttribute('value') ?? ''; }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { v == null || v === '' ? this.removeAttribute('name') : this.setAttribute('name', String(v)); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get rows() { return Number(this.getAttribute('rows')) || 3; }
    set rows(v) { this.setAttribute('rows', String(v)); }

    get resize() {
      const r = (this.getAttribute('resize') || 'vertical').toLowerCase();
      return RESIZE.includes(r) ? r : 'vertical';
    }
    set resize(v) { this.setAttribute('resize', String(v)); }

    get autosize() { return this.hasAttribute('autosize') || this.resize === 'auto'; }
    set autosize(v) { this.toggleAttribute('autosize', !!v); }

    get minRows() { return Number(this.getAttribute('min-rows')) || this.rows; }
    set minRows(v) { v == null ? this.removeAttribute('min-rows') : this.setAttribute('min-rows', String(v)); }

    get maxRows() { return Number(this.getAttribute('max-rows')) || 0; }
    set maxRows(v) { v == null ? this.removeAttribute('max-rows') : this.setAttribute('max-rows', String(v)); }

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

    get error() { return this.hasAttribute('error'); }
    set error(v) { this.toggleAttribute('error', !!v); }

    get errorText() { return this.getAttribute('error-text') ?? ''; }
    set errorText(v) { v == null ? this.removeAttribute('error-text') : this.setAttribute('error-text', String(v)); }

    get showCount() { return this.hasAttribute('show-count'); }
    set showCount(v) { this.toggleAttribute('show-count', !!v); }

    get fullWidth() { return this.hasAttribute('full-width'); }
    set fullWidth(v) { this.toggleAttribute('full-width', !!v); }

    get placeholder() { return this.getAttribute('placeholder') ?? ''; }
    set placeholder(v) { v == null ? this.removeAttribute('placeholder') : this.setAttribute('placeholder', String(v)); }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null ? this.removeAttribute('label') : this.setAttribute('label', String(v)); }

    get hint() { return this.getAttribute('hint') ?? ''; }
    set hint(v) { v == null ? this.removeAttribute('hint') : this.setAttribute('hint', String(v)); }

    get maxlength() { return this.getAttribute('maxlength'); }
    set maxlength(v) { v == null ? this.removeAttribute('maxlength') : this.setAttribute('maxlength', String(v)); }

    get textarea() { return this.#textarea; }

    // ---- API pública -----------------------------------------------------

    focus(options) { this.#textarea.focus(options); }
    blur() { this.#textarea.blur(); }
    select() { this.#textarea.select(); }
    setSelectionRange(...args) { this.#textarea.setSelectionRange(...args); }

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
        setValidity(this.#internals, { customError: true }, msg, this.#textarea);
        this.#syncSupport();
      } else this.#update();
    }

    // ---- form-associated callbacks --------------------------------------

    formResetCallback() {
      this.#value = this.defaultValue;
      this.#textarea.value = this.#value;
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
      this.#syncSupport();
    };

    #syncNative() {
      const ta = this.#textarea;
      for (const a of ['placeholder', 'maxlength', 'name']) {
        const v = this.getAttribute(a);
        if (v == null) ta.removeAttribute(a);
        else ta.setAttribute(a, v);
      }
      ta.rows = this.rows;
      ta.style.resize = this.autosize ? 'none' : this.resize;
      if (ta.value !== this.#value) ta.value = this.#value;
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      this.#textarea.disabled = disabled;
      this.#textarea.readOnly = this.readonly;
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', this.readonly);
    }

    #update() {
      const v = this.#value;
      setCustomState(this.#internals, 'blank', v === '');
      setFormValue(this.#internals, v || null);
      this.#updateValidity();
      this.#syncSupport();
      this.#autofit();
    }

    #updateValidity() {
      if (!this.#internals) return;
      const v = this.#value;
      if (this.required && v === '') {
        setValidity(this.#internals, { valueMissing: true }, 'Este campo es obligatorio', this.#textarea);
        this.#textarea.setAttribute('aria-invalid', 'true');
        return;
      }
      const native = this.#textarea.validity;
      if (v !== '' && native?.tooLong) {
        setValidity(this.#internals, { tooLong: true }, this.#textarea.validationMessage, this.#textarea);
        this.#textarea.setAttribute('aria-invalid', 'true');
        return;
      }
      clearValidity(this.#internals, this.#textarea);
      this.#textarea.removeAttribute('aria-invalid');
    }

    /** Fila de apoyo: hint / error-text / contador, y el estado visual `invalid`. */
    #syncSupport() {
      const failed = this.#touched && this.#internals?.validity?.valid === false;
      const invalid = this.error || failed;
      setCustomState(this.#internals, 'invalid', invalid);

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

    /** Autosize: mide el contenido con la altura a cero y la acota entre min-rows y max-rows. */
    #autofit() {
      const ta = this.#textarea;
      if (!this.autosize) {
        if (ta.style.height) { ta.style.height = ''; ta.style.overflowY = ''; }
        return;
      }
      if (!ta.clientWidth) return; // sin layout todavía: manda `rows`

      const cs = getComputedStyle(ta);
      const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + borders;
      const min = this.minRows * line + extra;
      const max = this.maxRows ? this.maxRows * line + extra : Infinity;

      // height:auto devolvería la altura intrínseca de `rows`, no la del texto.
      ta.style.overflowY = 'hidden';
      ta.style.height = '0px';
      const fit = ta.scrollHeight + borders;
      ta.style.height = `${Math.min(Math.max(fit, min), max)}px`;
      if (fit > max) ta.style.overflowY = 'auto';
    }

    #onInput = () => {
      this.#value = this.#textarea.value;
      this.#update();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.#emit('is-input', { value: this.#value });
    };

    #onChange = () => {
      this.#value = this.#textarea.value;
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
  }

  if (!customElements.get('is-textarea')) {
    customElements.define('is-textarea', IsTextarea);
  }
  if (typeof window !== 'undefined') window.IsTextarea = IsTextarea;
})();
