import { adoptCss } from '../_shared/adopt-css.js';
import './option.js';
import '../media/icon.js';
import '../actions/button.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-combobox> — Input + listbox filtrable.
 *
 * El listbox vive en un <dialog modal> (top layer) para no perderse por
 * overflow/visibility de ancestros. Clic en el backdrop del dialog cierra.
 *
 * Atributos: label, hint, name, value, placeholder, disabled, required, open, clearable
 * Slots: default — <is-option> o <option>
 * Events: is-change, is-input, is-show, is-hide
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" hidden></label>
      <div part="base" class="base">
        <input part="input" class="input" type="text" role="combobox"
          autocomplete="off" aria-autocomplete="list" aria-expanded="false"
          aria-controls="listbox" />
        <is-button
          type="button"
          part="clear"
          class="clear"
          variant="text"
          color="neutral"
          tabindex="-1"
          aria-label="Limpiar"
          hidden
        >
          <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
        </is-button>
        <is-button
          type="button"
          part="trigger"
          class="trigger"
          variant="text"
          color="neutral"
          tabindex="-1"
          aria-label="Abrir"
        >
          <is-icon icon="mdi:chevron-down" aria-hidden="true"></is-icon>
        </is-button>
      </div>
      <div part="hint" class="hint" hidden></div>
    </div>
    <dialog part="dialog" class="popup" tabindex="-1">
      <div part="listbox" class="listbox" id="listbox" role="listbox"></div>
    </dialog>
    <slot hidden></slot>
  `;

  const OBSERVED = [
    'label', 'hint', 'name', 'value', 'placeholder',
    'disabled', 'required', 'open', 'clearable'
  ];

  class IsCombobox extends ElementBase {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #input;
    #dialog;
    #listbox;
    #base;
    #labelEl;
    #hintEl;
    #clearBtn;
    #trigger;
    #slot;
    #activeIndex = -1;
    #options = [];
    #filter = '';
    #wasOpen = false;
    #ignoreFocusOpen = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#input = shadow.querySelector('.input');
      this.#dialog = shadow.querySelector('.popup');
      this.#listbox = shadow.querySelector('.listbox');
      this.#base = shadow.querySelector('.base');
      this.#labelEl = shadow.querySelector('.label');
      this.#hintEl = shadow.querySelector('.hint');
      this.#clearBtn = shadow.querySelector('.clear');
      this.#trigger = shadow.querySelector('.trigger');
      this.#slot = shadow.querySelector('slot');

      if ('attachInternals' in this) {
        try { this.#internals = this.attachInternals(); } catch { /* noop */ }
      }

      this.#input.addEventListener('input', this.#onInput);
      this.#input.addEventListener('keydown', this.#onKeydown);
      this.#input.addEventListener('focus', this.#onInputFocus);
      this.#clearBtn.addEventListener('click', this.#onClear);
      this.#trigger.addEventListener('click', this.#onTrigger);
      this.#listbox.addEventListener('mousedown', this.#onListMouseDown);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('keydown', this.#onKeydown);
      this.#slot.addEventListener('slotchange', () => this.#collectOptions());
    }

    onConnected() {
      this.#syncMeta();
      this.#collectOptions();
      this.#syncValueToInput(false);
      this.#syncOpen();
      this.#syncDisabled();
      this.#updateValidity();
      this.#setFormValue();
      addEventListener('resize', this.#onReposition, { passive: true });
      addEventListener('scroll', this.#onReposition, true);
    }

    onDisconnected() {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      if (this.#dialog.open) this.#dialog.close();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'open') this.#syncOpen();
      else if (name === 'disabled') this.#syncDisabled();
      else if (name === 'value') {
        this.#syncValueToInput(false);
        this.#setFormValue();
        this.#updateValidity();
        this.#renderList();
      } else if (name === 'clearable') this.#syncClear();
      else this.#syncMeta();
      if (name === 'required') this.#updateValidity();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get clearable() { return this.hasAttribute('clearable'); }
    set clearable(v) { this.toggleAttribute('clearable', !!v); }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { setStringAttr(this, 'name', v); }

    formResetCallback() {
      this.value = this.getAttribute('value') ?? '';
      this.#filter = '';
      this.#syncValueToInput(false);
    }

    formDisabledCallback(disabled) { this.#syncDisabled(disabled); }

    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (!this.#internals) return;
      this.#internals.setValidity(msg ? { customError: true } : {}, msg || '', this.#input);
    }

    #setState(name, on) {
      const s = this.#internals?.states;
      if (!s) return;
      if (on) s.add(name);
      else s.delete(name);
    }

    #syncMeta() {
      const label = this.getAttribute('label');
      this.#labelEl.hidden = !label;
      this.#labelEl.textContent = label || '';
      const hint = this.getAttribute('hint');
      this.#hintEl.hidden = !hint;
      this.#hintEl.textContent = hint || '';
      this.#input.placeholder = this.getAttribute('placeholder') || '';
      this.#input.required = this.required;
      this.#syncClear();
    }

    #syncClear() {
      this.#clearBtn.hidden = !(this.clearable && !!this.value && !this.disabled);
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      this.#input.disabled = disabled;
      this.#trigger.disabled = disabled;
      this.#clearBtn.disabled = disabled;
      this.#setState('disabled', disabled);
      if (disabled) this.open = false;
    }

    #positionList() {
      const rect = this.#base.getBoundingClientRect();
      const maxH = Math.min(14 * 16, Math.max(120, window.innerHeight - rect.bottom - 8));
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = spaceBelow < 120 && rect.top > spaceBelow;
      Object.assign(this.#listbox.style, {
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 10)}px`,
        maxHeight: `${maxH}px`,
        top: openUp ? 'auto' : `${rect.bottom + 4}px`,
        bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : 'auto',
      });
    }

    #syncOpen() {
      const open = this.open && !this.disabled;
      this.#input.setAttribute('aria-expanded', String(open));
      this.#setState('open', open);

      if (open) {
        this.#filter = this.#input.value;
        this.#renderList();
        this.#positionList();
        if (!this.#dialog.open) {
          this.#dialog.showModal();
        } else {
          this.#positionList();
        }
        // El modal atrapa foco: enfocamos el dialog y manejamos teclas ahí
        queueMicrotask(() => {
          try { this.#dialog.focus({ preventScroll: true }); } catch { /* noop */ }
        });
        if (!this.#wasOpen) emit(this, 'is-show', {});
      } else {
        this.#activeIndex = -1;
        if (this.#dialog.open) this.#dialog.close();
        if (this.#wasOpen) emit(this, 'is-hide', {});
      }
      this.#wasOpen = open;
    }

    #syncValueToInput(fromUser) {
      const val = this.value;
      const opt = this.#options.find((o) => o.value === val);
      const display = opt ? opt.label : val;
      if (!fromUser || this.#input.value !== display) {
        if (!this.open || !fromUser) this.#input.value = display;
      }
      this.#syncClear();
    }

    #collectOptions() {
      const nodes = this.#slot.assignedElements({ flatten: true });
      this.#options = [];
      const push = (el) => {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'is-option' && tag !== 'option') return;
        this.#options.push({
          value: el.hasAttribute('value') ? el.getAttribute('value') : (el.textContent || '').trim(),
          label: (el.textContent || '').trim(),
          disabled: el.hasAttribute('disabled'),
          el,
        });
      };
      for (const el of nodes) push(el);
      if (!this.#options.length) {
        for (const el of this.children) push(el);
      }
      this.#renderList();
    }

    #filtered() {
      const q = (this.#filter || '').trim().toLowerCase();
      if (!q) return this.#options.filter((o) => !o.disabled);
      return this.#options.filter((o) => !o.disabled && o.label.toLowerCase().includes(q));
    }

    #renderList() {
      const items = this.#filtered();
      this.#listbox.replaceChildren();
      items.forEach((opt, i) => {
        const btn = document.createElement('div');
        btn.className = 'option';
        btn.setAttribute('part', 'option');
        btn.setAttribute('role', 'option');
        btn.setAttribute('data-value', opt.value);
        btn.setAttribute('aria-selected', String(opt.value === this.value));
        if (i === this.#activeIndex) btn.setAttribute('data-active', '');
        btn.textContent = opt.label;
        this.#listbox.appendChild(btn);
      });
      if (this.#activeIndex >= items.length) this.#activeIndex = items.length - 1;
    }

    #selectIndex(i) {
      const items = this.#filtered();
      if (i < 0 || i >= items.length) return;
      const opt = items[i];
      this.#commit(opt.value, opt.label);
    }

    #commit(value, label) {
      const prev = this.value;
      this.setAttribute('value', value);
      this.#input.value = label ?? value;
      this.#filter = '';
      this.open = false;
      this.#setFormValue();
      this.#updateValidity();
      this.#syncClear();
      emit(this, 'is-input', { value });
      if (prev !== value) emit(this, 'is-change', { value });
      this.#ignoreFocusOpen = true;
      this.#input.focus();
      queueMicrotask(() => { this.#ignoreFocusOpen = false; });
    }

    #setFormValue() {
      this.#internals?.setFormValue(this.value || null);
    }

    #updateValidity() {
      if (!this.#internals) return;
      if (this.required && !this.value) {
        this.#internals.setValidity({ valueMissing: true }, 'Seleccione un valor', this.#input);
      } else {
        this.#internals.setValidity({});
      }
    }

    #onReposition = () => {
      if (this.open) this.#positionList();
    };

    #onInputFocus = () => {
      if (this.disabled || this.#ignoreFocusOpen) return;
      this.open = true;
    };

    #onInput = () => {
      this.#filter = this.#input.value;
      this.#activeIndex = 0;
      if (!this.open) this.open = true;
      else this.#renderList();
      emit(this, 'is-input', { value: this.#input.value });
    };

    #onKeydown = (e) => {
      const items = this.#filtered();

      // Si el foco está en el dialog, tipografía actualiza el filtro + input
      if (e.target === this.#dialog && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.#filter = (this.#filter || '') + e.key;
        this.#input.value = this.#filter;
        this.#activeIndex = 0;
        if (!this.open) this.open = true;
        else this.#renderList();
        emit(this, 'is-input', { value: this.#input.value });
        return;
      }
      if (e.target === this.#dialog && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        this.#filter = (this.#filter || '').slice(0, -1);
        this.#input.value = this.#filter;
        this.#activeIndex = 0;
        this.#renderList();
        emit(this, 'is-input', { value: this.#input.value });
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          this.#activeIndex = Math.min(this.#activeIndex + 1, items.length - 1);
          this.#renderList();
          this.#scrollActive();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          this.#activeIndex = Math.max(this.#activeIndex - 1, 0);
          this.#renderList();
          this.#scrollActive();
          break;
        case 'Enter':
          if (this.open && this.#activeIndex >= 0) {
            e.preventDefault();
            this.#selectIndex(this.#activeIndex);
          }
          break;
        case 'Escape':
          if (this.open) {
            e.preventDefault();
            this.open = false;
            this.#syncValueToInput(false);
            this.#ignoreFocusOpen = true;
            this.#input.focus();
            queueMicrotask(() => { this.#ignoreFocusOpen = false; });
          }
          break;
      }
    };

    #scrollActive() {
      const el = this.#listbox.querySelector('[data-active]');
      el?.scrollIntoView({ block: 'nearest' });
    }

    #onListMouseDown = (e) => {
      const opt = e.target.closest('[role="option"]');
      if (!opt) return;
      e.preventDefault();
      const value = opt.getAttribute('data-value');
      const found = this.#options.find((o) => o.value === value);
      this.#commit(value, found?.label);
    };

    #onDialogClick = (e) => {
      if (e.target !== this.#dialog) return;
      const base = this.#base.getBoundingClientRect();
      const overControl =
        e.clientX >= base.left && e.clientX <= base.right &&
        e.clientY >= base.top && e.clientY <= base.bottom;
      // Clic sobre el control (bajo el dialog transparente): no cerrar
      if (overControl) return;
      this.open = false;
      this.#syncValueToInput(false);
    };

    #onDialogCancel = (e) => {
      e.preventDefault();
      this.open = false;
      this.#syncValueToInput(false);
    };

    #onClear = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const prev = this.value;
      this.removeAttribute('value');
      this.#input.value = '';
      this.#filter = '';
      this.#setFormValue();
      this.#updateValidity();
      this.#syncClear();
      emit(this, 'is-input', { value: '' });
      if (prev) emit(this, 'is-change', { value: '' });
      this.#input.focus();
      this.open = true;
    };

    #onTrigger = (e) => {
      e.preventDefault();
      if (this.disabled) return;
      this.open = !this.open;
      if (this.open) this.#dialog.focus({ preventScroll: true });
      else this.#input.focus();
    };
  }

  defineElement('is-combobox', IsCombobox, 'IsCombobox');
})();
