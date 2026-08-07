import { adoptCss } from '../_shared/adopt-css.js';
import './option.js';
import '../media/icon.js';
import '../feedback/tag.js';

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
 * <is-select> — Select form-associated con listbox en <dialog modal> (top layer),
 * así el desplegable nunca se pierde por overflow/clipping de ancestros.
 *
 * Atributos: name, value, multiple, placeholder, label, hint, disabled, required,
 *            clearable, open, variant, checkmarks, selection-display, limit-tags,
 *            error, error-text, full-width, auto-width, max-visible
 * Slots: default (<is-option>), label, hint, start
 * Parts: base, trigger, listbox, group, group-label, option, check, option-start,
 *        option-description, tag, clear, label, hint, error-text
 * Events: is-change { value, values }, is-show, is-hide
 *
 * En modo `multiple` con `name`, el valor de formulario se envía como FormData
 * con una entrada por opción seleccionada.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="form-control">
      <label part="label" class="label" hidden><slot name="label"><span class="label-text"></span></slot></label>
      <div part="base" class="base">
        <div part="trigger" class="trigger" role="combobox" tabindex="0"
          aria-haspopup="listbox" aria-expanded="false" aria-controls="listbox">
          <span class="start"><slot name="start"></slot></span>
          <span class="content">
            <span class="display"></span>
            <span class="tags" hidden></span>
          </span>
        </div>
        <button type="button" part="clear" class="clear" hidden aria-label="Limpiar" tabindex="-1">
          <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
        </button>
        <span class="caret" aria-hidden="true"><is-icon icon="mdi:chevron-down"></is-icon></span>
      </div>
      <div part="hint" class="hint" hidden><slot name="hint"><span class="hint-text"></span></slot></div>
      <div part="error-text" class="error-text" hidden></div>
    </div>
    <dialog part="dialog" class="popup" tabindex="-1">
      <div part="listbox" class="listbox" id="listbox" role="listbox"></div>
    </dialog>
    <slot hidden></slot>
  `;

  const OBSERVED = [
    'name', 'value', 'multiple', 'placeholder', 'label', 'hint',
    'disabled', 'required', 'clearable', 'open',
    'variant', 'checkmarks', 'selection-display', 'limit-tags',
    'error', 'error-text', 'full-width', 'auto-width', 'max-visible',
  ];

  const PROPS = [
    'name', 'value', 'values', 'multiple', 'placeholder', 'label', 'hint',
    'disabled', 'required', 'clearable', 'open',
    'variant', 'checkmarks', 'selectionDisplay', 'limitTags',
    'error', 'errorText', 'fullWidth', 'autoWidth', 'maxVisible',
  ];

  const TYPEAHEAD_MS = 500;
  const SELECTION_DISPLAY = ['tags', 'text', 'count'];
  const APPEARANCE = ['outlined', 'filled', 'underlined'];
  const DEFAULT_MAX_HEIGHT = 16 * 16;

  const positive = (raw) => {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  let uidSeq = 0;

  class IsSelect extends ElementBase {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #base;
    #trigger;
    #display;
    #tags;
    #labelEl;
    #labelSlot;
    #hintEl;
    #hintSlot;
    #errorEl;
    #clearBtn;
    #dialog;
    #listbox;
    #slot;

    #uid = `is-sel-${++uidSeq}`;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultValues = [];
    #options = [];
    #values = [];
    #activeIndex = -1;
    #wasOpen = false;
    #writingValue = false;
    #typeBuf = '';
    #typeTimer = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.querySelector('.base');
      this.#trigger = shadow.querySelector('.trigger');
      this.#display = shadow.querySelector('.display');
      this.#tags = shadow.querySelector('.tags');
      this.#labelEl = shadow.querySelector('.label');
      this.#labelSlot = shadow.querySelector('slot[name="label"]');
      this.#hintEl = shadow.querySelector('.hint');
      this.#hintSlot = shadow.querySelector('slot[name="hint"]');
      this.#errorEl = shadow.querySelector('.error-text');
      this.#clearBtn = shadow.querySelector('.clear');
      this.#dialog = shadow.querySelector('.popup');
      this.#listbox = shadow.querySelector('.listbox');
      this.#slot = shadow.querySelector('slot:not([name])');

      this.#hintEl.id = `${this.#uid}-hint`;
      this.#errorEl.id = `${this.#uid}-error`;

      this.#internals = attachFormInternals(this);

      this.#base.addEventListener('click', this.#onBaseClick);
      this.#trigger.addEventListener('keydown', this.#onKeydown);
      this.#clearBtn.addEventListener('click', this.#onClear);
      this.#tags.addEventListener('is-remove', this.#onTagRemove);
      this.#listbox.addEventListener('click', this.#onOptionClick);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('keydown', this.#onKeydown);
      this.#slot.addEventListener('slotchange', this.#onSlotChange);
      this.#labelSlot.addEventListener('slotchange', () => this.#syncMeta());
      this.#hintSlot.addEventListener('slotchange', () => this.#syncMeta());
    }

    onConnected() {
      this.#upgradeProps();
      this.#collectOptions();
      this.#readValueAttr(true);
      if (!this.#defaultsRead) {
        this.#defaultsRead = true;
        this.#defaultValues = [...this.#values];
      }
      this.#syncMeta();
      this.#apply();
      this.#syncDisabled();
      this.#syncOpen();
      addEventListener('resize', this.#onReposition, { passive: true });
      addEventListener('scroll', this.#onReposition, true);
    }

    onDisconnected() {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      clearTimeout(this.#typeTimer);
      if (this.#dialog.open) this.#dialog.close();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'value') {
        if (this.#writingValue) return;
        this.#readValueAttr(false);
        this.#apply();
      } else if (name === 'open') this.#syncOpen();
      else if (name === 'disabled') this.#syncDisabled();
      else if (name === 'multiple') {
        this.#readValueAttr(false);
        this.#syncMeta();
        this.#apply();
      } else if (name === 'required') this.#updateValidity();
      else if (name === 'clearable') this.#syncClear();
      else if (name === 'checkmarks' || name === 'max-visible' || name === 'auto-width') {
        this.#renderList();
      } else this.#syncMeta();
    }

    get value() { return this.multiple ? this.#values.join(',') : (this.#values[0] ?? ''); }
    set value(v) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    /** @returns {string[]} copia de los valores seleccionados */
    get values() { return [...this.#values]; }
    set values(list) {
      const next = Array.isArray(list) ? list.map(String) : [];
      this.#values = this.multiple ? [...new Set(next)] : next.slice(0, 1);
      this.#writeValueAttr();
      this.#apply();
    }

    /** @returns {{ value: string, label: string }[]} */
    get selectedOptions() {
      return this.#options
        .filter((o) => this.#values.includes(o.value))
        .map((o) => ({ value: o.value, label: o.label }));
    }

    get multiple() { return this.hasAttribute('multiple'); }
    set multiple(v) { this.toggleAttribute('multiple', !!v); }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get clearable() { return this.hasAttribute('clearable'); }
    set clearable(v) { this.toggleAttribute('clearable', !!v); }

    get checkmarks() { return this.hasAttribute('checkmarks'); }
    set checkmarks(v) { this.toggleAttribute('checkmarks', !!v); }

    get error() { return this.hasAttribute('error'); }
    set error(v) { this.toggleAttribute('error', !!v); }

    get errorText() { return this.getAttribute('error-text') ?? ''; }
    set errorText(v) { setStringAttr(this, 'error-text', v); }

    get fullWidth() { return this.hasAttribute('full-width'); }
    set fullWidth(v) { this.toggleAttribute('full-width', !!v); }

    get autoWidth() { return this.hasAttribute('auto-width'); }
    set autoWidth(v) { this.toggleAttribute('auto-width', !!v); }

    /** Altura del listbox en nº de opciones (0 = sin límite propio) */
    get maxVisible() { return positive(this.getAttribute('max-visible')); }
    set maxVisible(v) { positive(v) ? this.setAttribute('max-visible', String(v)) : this.removeAttribute('max-visible'); }

    /** Chips visibles en `selection-display="tags"` (0 = todos) */
    get limitTags() { return positive(this.getAttribute('limit-tags')); }
    set limitTags(v) { positive(v) ? this.setAttribute('limit-tags', String(v)) : this.removeAttribute('limit-tags'); }

    get selectionDisplay() {
      const raw = (this.getAttribute('selection-display') || '').toLowerCase();
      return SELECTION_DISPLAY.includes(raw) ? raw : 'tags';
    }
    set selectionDisplay(v) {
      const raw = String(v ?? '').toLowerCase();
      SELECTION_DISPLAY.includes(raw) ? this.setAttribute('selection-display', raw) : this.removeAttribute('selection-display');
    }

    get variant() {
      const raw = (this.getAttribute('variant') || '').toLowerCase();
      return APPEARANCE.includes(raw) ? raw : 'outlined';
    }
    set variant(v) {
      const raw = String(v ?? '').toLowerCase();
      APPEARANCE.includes(raw) ? this.setAttribute('variant', raw) : this.removeAttribute('variant');
    }

    get placeholder() { return this.getAttribute('placeholder') ?? ''; }
    set placeholder(v) { setStringAttr(this, 'placeholder', v); }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { setStringAttr(this, 'name', v); }

    get form() { return this.#internals?.form ?? null; }
    get validity() { return this.#internals?.validity ?? null; }
    get validationMessage() { return this.#internals?.validationMessage ?? ''; }

    show() { this.open = true; }
    hide() { this.open = false; }

    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#trigger);
      else this.#updateValidity();
    }

    formResetCallback() {
      this.#values = [...this.#defaultValues];
      this.#writeValueAttr();
      this.#apply();
    }

    formDisabledCallback(disabled) {
      this.#formDisabled = !!disabled;
      this.#syncDisabled();
    }

    #upgradeProps() {
      for (const a of PROPS) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          this[a] = v;
        }
      }
    }

    get #isDisabled() { return this.disabled || this.#formDisabled; }

    // ---------------------------------------------------------------- opciones

    #onSlotChange = () => {
      this.#collectOptions();
      this.#renderDisplay();
      this.#renderList();
    };

    #collectOptions() {
      const assigned = this.#slot.assignedElements({ flatten: true });
      const source = assigned.length ? assigned : [...this.children];
      const list = [];
      for (const el of source) {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'is-option' && tag !== 'option') continue;
        const label = typeof el.label === 'string' ? el.label : (el.textContent || '').trim();
        list.push({
          value: el.hasAttribute('value') ? el.getAttribute('value') : label,
          label,
          group: el.getAttribute('group') || '',
          description: (el.querySelector(':scope > [slot="description"]')?.textContent || '').trim(),
          start: [...el.querySelectorAll(':scope > [slot="start"]')],
          disabled: el.hasAttribute('disabled'),
          el,
        });
      }
      this.#options = this.#sortByGroup(list);
    }

    /** Agrupa sin alterar el orden relativo; las opciones sin `group` van primero. */
    #sortByGroup(list) {
      if (!list.some((o) => o.group)) return list;
      const groups = [];
      for (const o of list) if (!groups.includes(o.group)) groups.push(o.group);
      groups.sort((a, b) => (a ? 1 : 0) - (b ? 1 : 0));
      return groups.flatMap((g) => list.filter((o) => o.group === g));
    }

    #optionByValue(value) { return this.#options.find((o) => o.value === value); }

    #labelOf(value) { return this.#optionByValue(value)?.label ?? value; }

    // ------------------------------------------------------------------ valores

    #readValueAttr(allowOptionDefaults) {
      const raw = this.getAttribute('value');
      if (raw != null && raw !== '') {
        const parts = this.multiple
          ? raw.split(',').map((s) => s.trim()).filter(Boolean)
          : [raw];
        this.#values = this.multiple ? [...new Set(parts)] : parts.slice(0, 1);
        return;
      }
      if (allowOptionDefaults && raw == null) {
        const preset = this.#options.filter((o) => o.el.hasAttribute('selected')).map((o) => o.value);
        this.#values = this.multiple ? preset : preset.slice(0, 1);
        if (this.#values.length) this.#writeValueAttr();
        return;
      }
      this.#values = [];
    }

    #writeValueAttr() {
      this.#writingValue = true;
      const v = this.value;
      if (v) this.setAttribute('value', v);
      else this.removeAttribute('value');
      this.#writingValue = false;
    }

    /** Refresca todo lo derivado del estado de selección. */
    #apply() {
      this.#syncOptionEls();
      this.#renderDisplay();
      this.#renderList();
      this.#setFormValue();
      this.#updateValidity();
      this.#syncClear();
      setCustomState(this.#internals, 'blank', this.#values.length === 0);
    }

    #syncOptionEls() {
      for (const o of this.#options) {
        const on = this.#values.includes(o.value);
        if (o.el.hasAttribute('selected') !== on) o.el.toggleAttribute('selected', on);
      }
    }

    #setFormValue() {
      const name = this.name;
      if (this.multiple && name) {
        const fd = new FormData();
        for (const v of this.#values) fd.append(name, v);
        setFormValue(this.#internals, fd);
        return;
      }
      setFormValue(this.#internals, this.value || null);
    }

    #updateValidity() {
      if (this.required && !this.#values.length) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione una opción', this.#trigger);
        return;
      }
      clearValidity(this.#internals, this.#trigger);
    }

    #commit(values) {
      const prev = this.value;
      this.#values = this.multiple ? [...new Set(values)] : values.slice(0, 1);
      this.#writeValueAttr();
      this.#apply();
      if (this.value !== prev) emit(this, 'is-change', { value: this.value, values: this.values });
    }

    #toggleValue(value) {
      if (this.multiple) {
        const next = this.#values.includes(value)
          ? this.#values.filter((v) => v !== value)
          : [...this.#values, value];
        this.#commit(next);
        return;
      }
      this.#commit([value]);
      this.open = false;
      this.#focusTrigger();
    }

    // -------------------------------------------------------------------- vista

    #syncMeta() {
      const labelAttr = this.getAttribute('label') || '';
      const labelSlotted = this.#labelSlot.assignedNodes({ flatten: true }).length > 0;
      this.#labelEl.querySelector('.label-text').textContent = labelAttr;
      this.#labelEl.hidden = !labelAttr && !labelSlotted;

      const errorText = this.errorText;
      const showError = this.error && !!errorText;
      this.#errorEl.textContent = errorText;
      this.#errorEl.hidden = !showError;

      const hintAttr = this.getAttribute('hint') || '';
      const hintSlotted = this.#hintSlot.assignedNodes({ flatten: true }).length > 0;
      this.#hintEl.querySelector('.hint-text').textContent = hintAttr;
      this.#hintEl.hidden = showError || (!hintAttr && !hintSlotted);

      const describedBy = [
        this.#hintEl.hidden ? '' : this.#hintEl.id,
        showError ? this.#errorEl.id : '',
      ].filter(Boolean).join(' ');
      if (describedBy) this.#trigger.setAttribute('aria-describedby', describedBy);
      else this.#trigger.removeAttribute('aria-describedby');

      if (this.error) this.#trigger.setAttribute('aria-invalid', 'true');
      else this.#trigger.removeAttribute('aria-invalid');
      setCustomState(this.#internals, 'error', this.error);

      if (this.required) this.#trigger.setAttribute('aria-required', 'true');
      else this.#trigger.removeAttribute('aria-required');
      if (labelAttr) this.#trigger.setAttribute('aria-label', labelAttr);
      this.#listbox.setAttribute('aria-multiselectable', String(this.multiple));
      this.#renderDisplay();
    }

    #syncClear() {
      this.#clearBtn.hidden = !(this.clearable && this.#values.length > 0 && !this.#isDisabled);
    }

    #syncDisabled() {
      const disabled = this.#isDisabled;
      this.#trigger.setAttribute('aria-disabled', String(disabled));
      this.#trigger.setAttribute('tabindex', disabled ? '-1' : '0');
      this.#clearBtn.disabled = disabled;
      setCustomState(this.#internals, 'disabled', disabled);
      this.#syncClear();
      if (disabled && this.open) this.open = false;
    }

    #renderDisplay() {
      const placeholder = this.placeholder;
      if (this.multiple) {
        const n = this.#values.length;
        const mode = this.selectionDisplay;
        if (!n) {
          this.#showTags(false);
          this.#display.textContent = placeholder;
          this.#display.classList.add('is-placeholder');
          return;
        }
        this.#display.classList.remove('is-placeholder');
        if (mode === 'tags') {
          this.#showTags(true);
          this.#renderTags();
          return;
        }
        this.#showTags(false);
        this.#display.textContent = mode === 'count'
          ? `${n} seleccionado${n === 1 ? '' : 's'}`
          : this.#values.map((v) => this.#labelOf(v)).join(', ');
        return;
      }
      this.#showTags(false);
      const selected = this.#values[0];
      const empty = selected == null || selected === '';
      this.#display.textContent = empty ? placeholder : this.#labelOf(selected);
      this.#display.classList.toggle('is-placeholder', empty);
    }

    #showTags(on) {
      this.#tags.hidden = !on;
      this.#display.hidden = on;
      if (!on) this.#tags.replaceChildren();
    }

    #renderTags() {
      this.#tags.replaceChildren();
      const limit = this.limitTags;
      const shown = limit ? this.#values.slice(0, limit) : this.#values;
      for (const v of shown) {
        const label = this.#labelOf(v);
        const tag = document.createElement('is-tag');
        tag.setAttribute('part', 'tag');
        tag.setAttribute('with-remove', '');
        tag.setAttribute('remove-label', `Quitar ${label}`);
        tag.dataset.value = v;
        tag.textContent = label;
        this.#tags.appendChild(tag);
      }
      const rest = this.#values.length - shown.length;
      if (!rest) return;
      const more = document.createElement('is-tag');
      more.setAttribute('part', 'tag tag-more');
      more.textContent = `+${rest}`;
      this.#tags.appendChild(more);
    }

    #renderList() {
      this.#listbox.replaceChildren();
      let group = null;
      let container = this.#listbox;
      this.#options.forEach((opt, i) => {
        if (opt.group !== group) {
          group = opt.group;
          container = group ? this.#openGroup(group, i) : this.#listbox;
        }
        container.appendChild(this.#buildRow(opt, i));
      });
      this.#syncActiveDescendant();
      if (this.#dialog.open) this.#positionList();
    }

    #openGroup(name, index) {
      const id = `${this.#uid}-g${index}`;
      const box = document.createElement('div');
      box.className = 'group';
      box.setAttribute('part', 'group');
      box.setAttribute('role', 'group');
      box.setAttribute('aria-labelledby', id);
      const head = document.createElement('div');
      head.className = 'group-label';
      head.setAttribute('part', 'group-label');
      head.id = id;
      head.textContent = name;
      box.appendChild(head);
      this.#listbox.appendChild(box);
      return box;
    }

    #buildRow(opt, index) {
      const row = document.createElement('div');
      row.className = 'option';
      row.id = `${this.#uid}-o${index}`;
      row.setAttribute('part', 'option');
      row.setAttribute('role', 'option');
      row.dataset.index = String(index);
      row.setAttribute('aria-selected', String(this.#values.includes(opt.value)));
      if (opt.disabled) {
        row.setAttribute('aria-disabled', 'true');
        row.setAttribute('data-disabled', '');
      }
      if (index === this.#activeIndex) row.setAttribute('data-active', '');

      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.setAttribute('part', 'check');
      const check = document.createElement('is-icon');
      check.className = 'check';
      check.setAttribute('icon', 'mdi:check');
      check.setAttribute('aria-hidden', 'true');
      mark.appendChild(check);
      row.appendChild(mark);

      if (opt.start.length) {
        const start = document.createElement('span');
        start.className = 'option-start';
        start.setAttribute('part', 'option-start');
        start.setAttribute('aria-hidden', 'true');
        for (const node of opt.start) start.appendChild(node.cloneNode(true));
        row.appendChild(start);
      }

      const body = document.createElement('span');
      body.className = 'option-body';
      const text = document.createElement('span');
      text.className = 'option-label';
      text.textContent = opt.label;
      body.appendChild(text);
      if (opt.description) {
        const desc = document.createElement('span');
        desc.className = 'option-desc';
        desc.setAttribute('part', 'option-description');
        desc.textContent = opt.description;
        body.appendChild(desc);
      }
      row.appendChild(body);
      return row;
    }

    #syncActiveDescendant() {
      const active = this.#activeIndex >= 0 ? `${this.#uid}-o${this.#activeIndex}` : '';
      if (active) this.#trigger.setAttribute('aria-activedescendant', active);
      else this.#trigger.removeAttribute('aria-activedescendant');
    }

    #scrollActive() {
      this.#listbox.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });
    }

    #focusTrigger() {
      queueMicrotask(() => {
        try { this.#trigger.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    // ------------------------------------------------------------------ popover

    /** Alto máximo del listbox: `max-visible` opciones o el tope por defecto. */
    #heightCap() {
      const n = this.maxVisible;
      if (!n) return DEFAULT_MAX_HEIGHT;
      const row = this.#listbox.querySelector('.option');
      const rowH = row?.getBoundingClientRect().height;
      if (!rowH) return DEFAULT_MAX_HEIGHT;
      const cs = getComputedStyle(this.#listbox);
      return Math.ceil(rowH * n + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom));
    }

    #positionList() {
      const rect = this.#base.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = spaceBelow < 160 && rect.top > spaceBelow;
      const maxH = Math.min(this.#heightCap(), Math.max(120, openUp ? rect.top - 8 : spaceBelow));
      const width = Math.max(rect.width, 10);
      const auto = this.autoWidth;
      Object.assign(this.#listbox.style, {
        left: `${rect.left}px`,
        width: auto ? 'auto' : `${width}px`,
        minWidth: auto ? `${width}px` : '',
        maxWidth: auto ? `${Math.max(width, window.innerWidth - 16)}px` : '',
        maxHeight: `${maxH}px`,
        top: openUp ? 'auto' : `${rect.bottom + 4}px`,
        bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : 'auto',
      });
      if (!auto) return;
      const overflow = this.#listbox.getBoundingClientRect().right - (window.innerWidth - 8);
      if (overflow > 0) this.#listbox.style.left = `${Math.max(8, rect.left - overflow)}px`;
    }

    #syncOpen() {
      const open = this.open && !this.#isDisabled;
      this.#trigger.setAttribute('aria-expanded', String(open));
      setCustomState(this.#internals, 'open', open);

      if (open) {
        if (this.#activeIndex < 0) {
          const first = this.#options.findIndex((o) => !o.disabled && this.#values.includes(o.value));
          this.#activeIndex = first >= 0 ? first : this.#options.findIndex((o) => !o.disabled);
        }
        this.#renderList();
        this.#positionList();
        if (!this.#dialog.open) this.#dialog.showModal();
        this.#positionList();
        queueMicrotask(() => {
          try { this.#dialog.focus({ preventScroll: true }); } catch { /* noop */ }
          this.#scrollActive();
        });
        if (!this.#wasOpen) emit(this, 'is-show', {});
      } else {
        this.#activeIndex = -1;
        this.#typeBuf = '';
        this.#syncActiveDescendant();
        if (this.#dialog.open) this.#dialog.close();
        if (this.#wasOpen) emit(this, 'is-hide', {});
      }
      this.#wasOpen = open;
    }

    #onReposition = () => { if (this.open) this.#positionList(); };

    // ----------------------------------------------------------------- eventos

    #onBaseClick = (e) => {
      if (this.#isDisabled) return;
      if (e.target.closest('.clear')) return;
      this.open = !this.open;
      if (!this.open) this.#focusTrigger();
    };

    #onOptionClick = (e) => {
      const row = e.target.closest('[role="option"]');
      if (!row || row.hasAttribute('data-disabled')) return;
      e.preventDefault();
      const index = Number(row.dataset.index);
      const opt = this.#options[index];
      if (!opt) return;
      this.#activeIndex = index;
      this.#toggleValue(opt.value);
    };

    #onTagRemove = (e) => {
      const tag = e.target.closest('is-tag');
      if (!tag?.dataset.value || this.#isDisabled) return;
      e.stopPropagation();
      this.#commit(this.#values.filter((v) => v !== tag.dataset.value));
    };

    #onClear = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.#isDisabled) return;
      this.#commit([]);
      this.#focusTrigger();
    };

    #onDialogClick = (e) => {
      if (e.target !== this.#dialog) return;
      this.open = false;
      this.#focusTrigger();
    };

    #onDialogCancel = (e) => {
      e.preventDefault();
      this.open = false;
      this.#focusTrigger();
    };

    #setActive(index) {
      this.#activeIndex = index;
      this.#renderList();
      this.#scrollActive();
    }

    #move(dir) {
      const n = this.#options.length;
      if (!n) return;
      let i = this.#activeIndex;
      for (let step = 0; step < n; step++) {
        i = i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n;
        if (!this.#options[i].disabled) { this.#setActive(i); return; }
      }
    }

    /** Typeahead ARIA: repetir la misma letra cicla entre las coincidencias. */
    #typeahead(ch) {
      clearTimeout(this.#typeTimer);
      this.#typeBuf += ch.toLowerCase();
      this.#typeTimer = setTimeout(() => { this.#typeBuf = ''; }, TYPEAHEAD_MS);
      const buf = this.#typeBuf;
      const cycling = buf.length > 1 && [...buf].every((c) => c === buf[0]);
      const query = cycling ? buf[0] : buf;
      const n = this.#options.length;
      const from = cycling ? this.#activeIndex + 1 : 0;
      for (let step = 0; step < n; step++) {
        const i = (from + step + n) % n;
        const o = this.#options[i];
        if (!o.disabled && o.label.toLowerCase().startsWith(query)) { this.#setActive(i); return; }
      }
    }

    #onKeydown = (e) => {
      if (this.#isDisabled) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          this.#move(1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          if (e.altKey) {
            if (this.open) { this.open = false; this.#focusTrigger(); }
            return;
          }
          if (!this.open) { this.open = true; return; }
          this.#move(-1);
          return;
        case 'Home':
          if (!this.open) return;
          e.preventDefault();
          this.#activeIndex = -1;
          this.#move(1);
          return;
        case 'End':
          if (!this.open) return;
          e.preventDefault();
          this.#activeIndex = -1;
          this.#move(-1);
          return;
        case 'Enter':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          if (this.#activeIndex >= 0) this.#toggleValue(this.#options[this.#activeIndex].value);
          return;
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          // Espacio dentro de una búsqueda en curso pertenece al término
          if (this.#typeBuf) { this.#typeahead(' '); return; }
          if (this.#activeIndex >= 0) this.#toggleValue(this.#options[this.#activeIndex].value);
          return;
        case 'Escape':
          if (!this.open) return;
          e.preventDefault();
          this.open = false;
          this.#focusTrigger();
          return;
        case 'Tab':
          if (this.open) { this.open = false; this.#focusTrigger(); }
          return;
        default:
          if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
          e.preventDefault();
          if (!this.open) this.open = true;
          this.#typeahead(e.key);
      }
    };
  }

  defineElement('is-select', IsSelect, 'IsSelect');
})();
