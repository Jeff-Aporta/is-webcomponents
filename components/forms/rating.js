import { adoptCss } from '../_shared/adopt-css.js';
import {
  attachFormInternals, setCustomState, setFormValue, setValidity, clearValidity
} from '../_shared/form-associated.js';
import '../media/icon.js';

/**
 * <is-rating> — Valoración form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   name, label, variant (brand|neutral|success|warning|danger)
 *   value        0..max (default 0)
 *   max          número de iconos (default 5)
 *   precision    granularidad del valor: 1 (default) | 0.5 | 0.25 | 0.1
 *   allow-half   alias de precision="0.5"
 *   icon         nombre is-icon del estado relleno (ej. tabler:heart-filled)
 *   empty-icon   nombre is-icon del estado vacío
 *   highlight-selected-only  resalta solo el icono del valor, no los anteriores
 *   label-format plantilla del texto del valor, ej. "{v} de {max}"
 *   show-label   muestra ese texto junto a los iconos (sigue al hover)
 *   clearable, disabled, readonly, required   (boolean)
 *
 * Propiedades
 *   labels        string[] — índice 0 = valor 1
 *   getLabelText  (value) => string — gana sobre labels y label-format
 *
 * Slots: label
 * Parts: form-control, label, base, star, icon-empty, icon-filled, hover-label
 * Custom states: blank, disabled, readonly
 * Eventos: is-change (valor confirmado), is-hover (previsualización)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" id="label" hidden><slot name="label"></slot></label>
      <div class="row">
        <div
          part="base"
          class="base"
          id="base"
          role="slider"
          tabindex="0"
          aria-labelledby="label"
          aria-valuemin="0"
        ></div>
        <span part="hover-label" class="hover-label" id="hoverLabel" hidden></span>
      </div>
    </div>
  `;

  const STAR_TEMPLATE = document.createElement('template');
  STAR_TEMPLATE.innerHTML = /* html */ `
    <span part="star" class="star">
      <span part="icon-empty" class="layer layer-empty"><is-icon></is-icon></span>
      <span part="icon-filled" class="layer layer-fill"><is-icon></is-icon></span>
    </span>
  `;

  const OBSERVED = [
    'name', 'value', 'max', 'precision', 'allow-half', 'icon', 'empty-icon',
    'highlight-selected-only', 'variant', 'label-format', 'show-label',
    'clearable', 'disabled', 'readonly', 'required', 'label',
  ];

  const PROPS = [
    'name', 'value', 'max', 'precision', 'allowHalf', 'icon', 'emptyIcon',
    'highlightSelectedOnly', 'variant', 'labels', 'labelFormat', 'getLabelText',
    'showLabel', 'clearable', 'disabled', 'readonly', 'required', 'label',
  ];

  const VARIANTS = ['brand', 'neutral', 'success', 'warning', 'danger'];

  const ICON_FULL = 'mdi:star';
  const ICON_EMPTY = 'mdi:star-outline';

  function hasSlotted(slot) {
    return slot.assignedNodes({ flatten: true }).some(
      (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
    );
  }

  function clampTo(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /** Quita el ruido float que dejan las sumas de precisiones decimales. */
  function tidy(n, unit) {
    const decimals = (String(unit).split('.')[1] || '').length;
    return decimals ? Number(n.toFixed(Math.min(20, decimals))) : n;
  }

  class IsRating extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #base;
    #labelEl;
    #labelSlot;
    #hoverLabel;
    #stars = [];
    #fullIcons = [];
    #emptyIcons = [];
    #value = 0;
    #hover = null;
    #labels = null;
    #getLabelText = null;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.getElementById('base');
      this.#labelEl = shadow.getElementById('label');
      this.#labelSlot = this.#labelEl.querySelector('slot');
      this.#hoverLabel = shadow.getElementById('hoverLabel');

      this.#internals = attachFormInternals(this);

      this.#base.addEventListener('pointermove', this.#onPointerMove);
      this.#base.addEventListener('pointerleave', this.#onPointerLeave);
      this.#base.addEventListener('click', this.#onClick);
      this.#base.addEventListener('keydown', this.#onKeyDown);
      this.#labelSlot.addEventListener('slotchange', this.#syncSlots);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProps();
      this.#value = this.#coerce(Number(this.getAttribute('value') ?? 0));
      this.#syncSlots();
      this.#buildStars();
      this.#syncDisabled();
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') {
        this.#value = this.#coerce(Number(newVal ?? 0));
        this.#render();
      } else if (name === 'max') {
        this.#value = this.#coerce(this.#value);
        this.#buildStars();
        this.#render();
      } else if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
        this.#render();
      } else if (name === 'label') {
        this.#syncSlots();
      } else {
        this.#value = this.#coerce(this.#value);
        this.#render();
      }
    }

    // ---- propiedades ----------------------------------------------------

    get value() { return this.#value; }
    set value(v) {
      const next = this.#coerce(Number(v));
      if (next === this.#value) return;
      this.#value = next;
      this.#render();
    }

    get max() {
      const n = Number(this.getAttribute('max') ?? 5);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
    }
    set max(v) { this.setAttribute('max', String(v)); }

    /** Granularidad del valor; `allow-half` es el alias histórico de 0.5. */
    get precision() {
      const n = Number(this.getAttribute('precision'));
      if (Number.isFinite(n) && n > 0 && n <= 1) return n;
      return this.hasAttribute('allow-half') ? 0.5 : 1;
    }
    set precision(v) { this.setAttribute('precision', String(v)); }

    get allowHalf() { return this.hasAttribute('allow-half'); }
    set allowHalf(v) { this.toggleAttribute('allow-half', !!v); }

    get icon() { return this.getAttribute('icon') || ICON_FULL; }
    set icon(v) { v == null || v === '' ? this.removeAttribute('icon') : this.setAttribute('icon', String(v)); }

    /** Sin `empty-icon`, un `icon` propio se reutiliza para el hueco (como MUI). */
    get emptyIcon() {
      return this.getAttribute('empty-icon') || (this.hasAttribute('icon') ? this.icon : ICON_EMPTY);
    }
    set emptyIcon(v) {
      v == null || v === '' ? this.removeAttribute('empty-icon') : this.setAttribute('empty-icon', String(v));
    }

    get highlightSelectedOnly() { return this.hasAttribute('highlight-selected-only'); }
    set highlightSelectedOnly(v) { this.toggleAttribute('highlight-selected-only', !!v); }

    get variant() {
      const v = this.getAttribute('variant');
      return VARIANTS.includes(v) ? v : 'brand';
    }
    set variant(v) { this.setAttribute('variant', VARIANTS.includes(v) ? v : 'brand'); }

    /** Textos por valor entero: índice 0 = valor 1. */
    get labels() { return this.#labels ? this.#labels.slice() : null; }
    set labels(v) {
      this.#labels = Array.isArray(v) ? v.slice() : null;
      this.#render();
    }

    get labelFormat() { return this.getAttribute('label-format') ?? ''; }
    set labelFormat(v) {
      v == null ? this.removeAttribute('label-format') : this.setAttribute('label-format', String(v));
    }

    get getLabelText() { return this.#getLabelText; }
    set getLabelText(fn) {
      this.#getLabelText = typeof fn === 'function' ? fn : null;
      this.#render();
    }

    get showLabel() { return this.hasAttribute('show-label'); }
    set showLabel(v) { this.toggleAttribute('show-label', !!v); }

    get clearable() { return this.hasAttribute('clearable'); }
    set clearable(v) { this.toggleAttribute('clearable', !!v); }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { v == null || v === '' ? this.removeAttribute('name') : this.setAttribute('name', String(v)); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null ? this.removeAttribute('label') : this.setAttribute('label', String(v)); }

    // ---- API pública -----------------------------------------------------

    focus(options) { this.#base.focus(options); }
    blur() { this.#base.blur(); }

    clear() { this.#commit(0); }

    get validity() { return this.#internals?.validity; }
    get validationMessage() { return this.#internals?.validationMessage ?? ''; }
    get willValidate() { return this.#internals?.willValidate ?? false; }
    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#base);
      else this.#updateValidity();
    }

    // ---- form-associated callbacks --------------------------------------

    formResetCallback() {
      this.#value = this.#coerce(Number(this.getAttribute('value') ?? 0));
      this.#hover = null;
      this.#render();
    }

    formDisabledCallback(disabled) {
      this.#syncDisabled(disabled);
      this.#render();
    }

    formStateRestoreCallback(state) {
      if (state != null) this.value = Number(state);
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

    #emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    /** Ajusta a `precision`; en readonly se admite cualquier fracción (ej. 3.7). */
    #coerce(n) {
      if (!Number.isFinite(n) || n <= 0) return 0;
      const max = this.max;
      if (this.readonly) return Math.min(max, n);
      const unit = this.precision;
      return Math.min(max, tidy(Math.round(n / unit) * unit, unit));
    }

    #labelText(v) {
      if (this.#getLabelText) return String(this.#getLabelText(v));
      const text = this.#labels?.[Math.ceil(v) - 1];
      if (text != null && text !== '') return String(text);
      const tpl = this.labelFormat;
      if (tpl) return tpl.replace(/\{v\}/g, String(v)).replace(/\{max\}/g, String(this.max));
      return `${v} de ${this.max}`;
    }

    #syncSlots = () => {
      const labelAttr = this.label.trim();
      const hasLabelSlot = hasSlotted(this.#labelSlot);
      if (!hasLabelSlot) this.#labelSlot.textContent = labelAttr;
      this.#labelEl.hidden = !labelAttr && !hasLabelSlot;
    };

    #buildStars() {
      const max = this.max;
      this.#base.replaceChildren();
      this.#stars = [];
      this.#fullIcons = [];
      this.#emptyIcons = [];
      for (let i = 0; i < max; i++) {
        const star = STAR_TEMPLATE.content.cloneNode(true).firstElementChild;
        star.dataset.index = String(i + 1);
        this.#base.appendChild(star);
        this.#stars.push(star);
        this.#emptyIcons.push(star.querySelector('.layer-empty is-icon'));
        this.#fullIcons.push(star.querySelector('.layer-fill is-icon'));
      }
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      const inert = disabled || this.readonly;
      this.#base.setAttribute('aria-disabled', String(disabled));
      this.#base.setAttribute('aria-readonly', String(this.readonly));
      this.#base.tabIndex = inert ? -1 : 0;
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', this.readonly);
      if (inert) this.#hover = null;
    }

    #render() {
      const display = this.#hover ?? this.#value;
      const only = this.highlightSelectedOnly;
      const selected = Math.ceil(display);
      const icon = this.icon;
      const emptyIcon = this.emptyIcon;

      this.#stars.forEach((star, i) => {
        const n = i + 1;
        const fill = only
          ? (n === selected ? clampTo(display - i, 0, 1) : 0)
          : clampTo(display - i, 0, 1);
        star.style.setProperty('--fill', `${Math.round(fill * 10000) / 100}%`);
        star.toggleAttribute('data-filled', fill >= 1);
        star.toggleAttribute('data-half', fill > 0 && fill < 1);
        star.setAttribute('aria-label', this.#labelText(n));
        this.#fullIcons[i].setAttribute('icon', icon);
        this.#emptyIcons[i].setAttribute('icon', emptyIcon);
      });

      const text = this.showLabel && display > 0 ? this.#labelText(display) : '';
      this.#hoverLabel.textContent = text;
      this.#hoverLabel.hidden = !text;

      this.#base.setAttribute('aria-valuemax', String(this.max));
      this.#base.setAttribute('aria-valuenow', String(this.#value));
      this.#base.setAttribute('aria-valuetext', this.#labelText(this.#value));
      setCustomState(this.#internals, 'blank', this.#value === 0);
      setFormValue(this.#internals, this.#value > 0 ? String(this.#value) : null);
      this.#updateValidity();
    }

    #updateValidity() {
      if (!this.#internals) return;
      if (this.required && this.#value === 0) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione una valoración', this.#base);
        return;
      }
      clearValidity(this.#internals, this.#base);
    }

    #interactive() {
      return !this.disabled && !this.readonly && this.#base.getAttribute('aria-disabled') !== 'true';
    }

    #commit(next) {
      const v = this.#coerce(next);
      this.#hover = null;
      if (v === this.#value) { this.#render(); return; }
      this.#value = v;
      this.setAttribute('value', String(v));
      this.#render();
      this.#emit('is-change', { value: v, label: this.#labelText(v) });
    }

    /** El primer paso dentro de un icono ya cuenta como `precision`, nunca 0. */
    #valueFromPointer(clientX) {
      const unit = this.precision;
      for (let i = 0; i < this.#stars.length; i++) {
        const rect = this.#stars[i].getBoundingClientRect();
        if (clientX <= rect.right || i === this.#stars.length - 1) {
          if (!rect.width) return i + 1;
          const ratio = clampTo((clientX - rect.left) / rect.width, 0, 1);
          const frac = clampTo(Math.ceil(ratio / unit - 1e-9) * unit, unit, 1);
          return tidy(i + frac, unit);
        }
      }
      return 0;
    }

    #onPointerMove = (e) => {
      if (!this.#interactive()) return;
      const next = this.#valueFromPointer(e.clientX);
      if (next === this.#hover) return;
      this.#hover = next;
      this.#render();
      this.#emit('is-hover', { value: this.#value, phantomValue: next, label: this.#labelText(next) });
    };

    #onPointerLeave = () => {
      if (this.#hover === null) return;
      this.#hover = null;
      this.#render();
      this.#emit('is-hover', { value: this.#value, phantomValue: null, label: this.#labelText(this.#value) });
    };

    #onClick = (e) => {
      if (!this.#interactive()) return;
      const next = this.#valueFromPointer(e.clientX);
      const clear = this.clearable && this.#value >= 1 && next === this.#value;
      this.#commit(clear ? 0 : next);
    };

    #onKeyDown = (e) => {
      if (!this.#interactive()) return;
      const unit = this.precision;
      const from = this.#coerce(this.#value);
      let next = null;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown': next = from - unit; break;
        case 'ArrowRight':
        case 'ArrowUp': next = from + unit; break;
        case 'Home': next = 0; break;
        case 'End': next = this.max; break;
        case 'Delete':
        case 'Backspace':
          if (!this.clearable) return;
          next = 0;
          break;
        default: return;
      }

      e.preventDefault();
      this.#commit(next);
    };
  }

  if (!customElements.get('is-rating')) {
    customElements.define('is-rating', IsRating);
  }
  if (typeof window !== 'undefined') window.IsRating = IsRating;
})();
