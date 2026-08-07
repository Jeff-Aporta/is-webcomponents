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
import { setStringAttr } from '../_shared/reflect.js';
/**
 * <is-color-picker> — Selector de color form-associated.
 *
 * El panel (color nativo + hex + swatches) vive en un <dialog modal> (top layer)
 * para no perderse por overflow de ancestros.
 *
 * Atributos: name, value (#rrggbb, default #808080), label, hint,
 *            disabled, required, swatches (lista hex separada por comas)
 * Slots: label, hint
 * Parts: base, trigger, swatch, panel, input, hex-input, label, hint
 * Events: is-input { value }, is-change { value }
 */

(() => {
  const DEFAULT_VALUE = '#808080';
  const DEFAULT_SWATCHES = [
    '#212529', '#495057', '#868e96', '#ced4da', '#f8f9fa', '#ffffff',
    '#e03131', '#f76707', '#f59f00', '#2f9e44', '#0ca678', '#1098ad',
    '#1971c2', '#4c6ef5', '#6741d9', '#9c36b5', '#c2255c', '#e64980',
  ];

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="form-control">
      <label part="label" class="label" hidden><slot name="label"><span class="label-text"></span></slot></label>
      <div part="base" class="base">
        <is-button variant="plain" with-caret part="trigger" class="trigger" aria-haspopup="dialog" aria-expanded="false">
          <span part="swatch" class="swatch" aria-hidden="true"></span>
          <span class="hex-text"></span>
        </is-button>
      </div>
      <div part="hint" class="hint" hidden><slot name="hint"><span class="hint-text"></span></slot></div>
    </div>
    <dialog part="dialog" class="popup" tabindex="-1">
      <div part="panel" class="panel" role="document">
        <div class="row">
          <input part="input" class="native" type="color" aria-label="Color" />
          <is-input part="hex-input" class="hex" type="text" spellcheck="false" autocomplete="off"
            maxlength="7" aria-label="Código hexadecimal"></is-input>
        </div>
        <div class="swatches" role="group" aria-label="Colores predefinidos"></div>
      </div>
    </dialog>
  `;

  const OBSERVED = ['name', 'value', 'label', 'hint', 'disabled', 'required', 'swatches'];

  /** Normaliza a #rrggbb en minúsculas; devuelve '' si no es un hex válido. */
  function normalizeHex(raw) {
    if (raw == null) return '';
    let s = String(raw).trim().toLowerCase();
    if (s.startsWith('#')) s = s.slice(1);
    if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('');
    return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : '';
  }

  class IsColorPicker extends ElementBase {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #base;
    #trigger;
    #swatch;
    #hexText;
    #labelEl;
    #labelSlot;
    #hintEl;
    #hintSlot;
    #dialog;
    #panel;
    #native;
    #hexInput;
    #swatchesEl;

    #open = false;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultValue = DEFAULT_VALUE;
    #writingValue = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.querySelector('.base');
      this.#trigger = shadow.querySelector('.trigger');
      this.#swatch = shadow.querySelector('.swatch');
      this.#hexText = shadow.querySelector('.hex-text');
      this.#labelEl = shadow.querySelector('.label');
      this.#labelSlot = shadow.querySelector('slot[name="label"]');
      this.#hintEl = shadow.querySelector('.hint');
      this.#hintSlot = shadow.querySelector('slot[name="hint"]');
      this.#dialog = shadow.querySelector('.popup');
      this.#panel = shadow.querySelector('.panel');
      this.#native = shadow.querySelector('.native');
      this.#hexInput = shadow.querySelector('.hex');
      this.#swatchesEl = shadow.querySelector('.swatches');

      this.#internals = attachFormInternals(this);

      this.#trigger.addEventListener('click', this.#onTrigger);
      this.#trigger.addEventListener('keydown', this.#onTriggerKey);
      this.#native.addEventListener('input', this.#onNativeInput);
      this.#native.addEventListener('change', this.#onNativeChange);
      this.#hexInput.addEventListener('input', this.#onHexInput);
      this.#hexInput.addEventListener('change', this.#onHexChange);
      this.#hexInput.addEventListener('keydown', this.#onHexKey);
      this.#swatchesEl.addEventListener('click', this.#onSwatchClick);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#labelSlot.addEventListener('slotchange', () => this.#syncMeta());
      this.#hintSlot.addEventListener('slotchange', () => this.#syncMeta());
    }

    onConnected() {
      this.#upgradeProps();
      const initial = normalizeHex(this.getAttribute('value')) || DEFAULT_VALUE;
      this.#writeValueAttr(initial);
      if (!this.#defaultsRead) {
        this.#defaultsRead = true;
        this.#defaultValue = initial;
      }
      this.#syncMeta();
      this.#renderSwatches();
      this.#sync();
      this.#syncDisabled();
      addEventListener('resize', this.#onReposition, { passive: true });
      addEventListener('scroll', this.#onReposition, true);
    }

    onDisconnected() {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      if (this.#dialog.open) this.#dialog.close();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'value') {
        if (this.#writingValue) return;
        const norm = normalizeHex(newVal) || DEFAULT_VALUE;
        if (norm !== newVal) this.#writeValueAttr(norm);
        this.#sync();
      } else if (name === 'disabled') this.#syncDisabled();
      else if (name === 'swatches') this.#renderSwatches();
      else if (name === 'required') this.#updateValidity();
      else this.#syncMeta();
    }

    get value() { return normalizeHex(this.getAttribute('value')) || DEFAULT_VALUE; }
    set value(v) {
      const norm = normalizeHex(v);
      if (!norm) this.removeAttribute('value');
      else this.setAttribute('value', norm);
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { setStringAttr(this, 'name', v); }

    /** @returns {string[]} paleta activa */
    get swatches() {
      const raw = this.getAttribute('swatches');
      if (!raw) return [...DEFAULT_SWATCHES];
      const list = raw.split(',').map((s) => normalizeHex(s)).filter(Boolean);
      return list.length ? list : [...DEFAULT_SWATCHES];
    }
    set swatches(list) {
      if (!Array.isArray(list) || !list.length) this.removeAttribute('swatches');
      else this.setAttribute('swatches', list.join(','));
    }

    get open() { return this.#open; }
    get form() { return this.#internals?.form ?? null; }
    get validity() { return this.#internals?.validity ?? null; }
    get validationMessage() { return this.#internals?.validationMessage ?? ''; }

    show() {
      if (this.#isDisabled || this.#open) return;
      this.#open = true;
      setCustomState(this.#internals, 'open', true);
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.#positionPanel();
      if (!this.#dialog.open) this.#dialog.showModal();
      this.#positionPanel();
      queueMicrotask(() => {
        try { this.#hexInput.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    hide() {
      if (!this.#open) return;
      this.#open = false;
      setCustomState(this.#internals, 'open', false);
      this.#trigger.setAttribute('aria-expanded', 'false');
      if (this.#dialog.open) this.#dialog.close();
      queueMicrotask(() => {
        try { this.#trigger.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#trigger);
      else this.#updateValidity();
    }

    formResetCallback() {
      this.#writeValueAttr(this.#defaultValue);
      this.#sync();
    }

    formDisabledCallback(disabled) {
      this.#formDisabled = !!disabled;
      this.#syncDisabled();
    }

    #upgradeProps() {
      for (const a of OBSERVED) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          this[a] = v;
        }
      }
    }

    get #isDisabled() { return this.disabled || this.#formDisabled; }

    #writeValueAttr(hex) {
      this.#writingValue = true;
      this.setAttribute('value', hex);
      this.#writingValue = false;
    }

    #syncMeta() {
      const labelAttr = this.getAttribute('label') || '';
      const labelSlotted = this.#labelSlot.assignedNodes({ flatten: true }).length > 0;
      this.#labelEl.querySelector('.label-text').textContent = labelAttr;
      this.#labelEl.hidden = !labelAttr && !labelSlotted;

      const hintAttr = this.getAttribute('hint') || '';
      const hintSlotted = this.#hintSlot.assignedNodes({ flatten: true }).length > 0;
      this.#hintEl.querySelector('.hint-text').textContent = hintAttr;
      this.#hintEl.hidden = !hintAttr && !hintSlotted;

      if (labelAttr) this.#trigger.setAttribute('aria-label', labelAttr);
      if (this.required) this.#trigger.setAttribute('aria-required', 'true');
      else this.#trigger.removeAttribute('aria-required');
    }

    #syncDisabled() {
      const disabled = this.#isDisabled;
      this.#trigger.disabled = disabled;
      this.#native.disabled = disabled;
      this.#hexInput.disabled = disabled;
      setCustomState(this.#internals, 'disabled', disabled);
      if (disabled) this.hide();
    }

    /** Refleja el valor en trigger, inputs, swatches, FormData y validez. */
    #sync() {
      const v = this.value;
      this.#swatch.style.background = v;
      this.#hexText.textContent = v;
      this.#native.value = v;
      if (document.activeElement !== this && this.#hexInput.value.toLowerCase() !== v) {
        this.#hexInput.value = v;
      }
      for (const btn of this.#swatchesEl.children) {
        btn.toggleAttribute('data-selected', btn.dataset.value === v);
        btn.setAttribute('aria-pressed', String(btn.dataset.value === v));
      }
      setFormValue(this.#internals, v || null);
      this.#updateValidity();
    }

    #updateValidity() {
      if (this.required && !normalizeHex(this.getAttribute('value'))) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione un color', this.#trigger);
        return;
      }
      clearValidity(this.#internals, this.#trigger);
    }

    #renderSwatches() {
      this.#swatchesEl.replaceChildren();
      for (const hex of this.swatches) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch-btn';
        btn.setAttribute('part', 'swatch');
        btn.dataset.value = hex;
        btn.style.background = hex;
        btn.title = hex;
        btn.setAttribute('aria-label', hex);
        this.#swatchesEl.appendChild(btn);
      }
      this.#sync();
    }

    /** @param {string} hex @param {boolean} committed dispara también is-change */
    #setValue(hex, committed) {
      const norm = normalizeHex(hex);
      if (!norm) return;
      const prev = this.value;
      this.#writeValueAttr(norm);
      this.#sync();
      if (norm !== prev) emit(this, 'is-input', { value: norm });
      if (committed && norm !== prev) emit(this, 'is-change', { value: norm });
    }

    #positionPanel() {
      const rect = this.#base.getBoundingClientRect();
      const panelW = Math.min(17 * 16, window.innerWidth - 16);
      let left = rect.left;
      if (left + panelW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - panelW - 8);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = spaceBelow < 200 && rect.top > spaceBelow;
      Object.assign(this.#panel.style, {
        width: `${panelW}px`,
        left: `${left}px`,
        top: openUp ? 'auto' : `${rect.bottom + 4}px`,
        bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : 'auto',
      });
    }

    #onReposition = () => { if (this.#open) this.#positionPanel(); };

    #onTrigger = (e) => {
      e.preventDefault();
      if (this.#isDisabled) return;
      if (this.#open) this.hide();
      else this.show();
    };

    #onTriggerKey = (e) => {
      if (e.key !== 'ArrowDown' || this.#open) return;
      e.preventDefault();
      this.show();
    };

    #onNativeInput = () => this.#setValue(this.#native.value, false);
    #onNativeChange = () => this.#setValue(this.#native.value, true);

    #onHexInput = () => {
      const norm = normalizeHex(this.#hexInput.value);
      if (norm) this.#setValue(norm, false);
    };

    #onHexChange = () => {
      const norm = normalizeHex(this.#hexInput.value);
      if (norm) this.#setValue(norm, true);
      else this.#hexInput.value = this.value;
    };

    #onHexKey = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const norm = normalizeHex(this.#hexInput.value);
      if (norm) this.#setValue(norm, true);
      this.hide();
    };

    #onSwatchClick = (e) => {
      const btn = e.target.closest('.swatch-btn');
      if (!btn) return;
      e.preventDefault();
      this.#setValue(btn.dataset.value, true);
      this.hide();
    };

    #onDialogClick = (e) => {
      if (e.target !== this.#dialog) return;
      this.hide();
    };

    #onDialogCancel = (e) => {
      e.preventDefault();
      this.hide();
    };
  }

  defineElement('is-color-picker', IsColorPicker, 'IsColorPicker');
})();
