import { adoptCss, defineElement, emit } from '../../core/element.js';
import './option.js';
import '../media/icon.js';
import '../actions/button.js';
import '../feedback/tag.js';

import {
  attachFormInternals,
  clearValidity,
  setCustomState,
  setFormValue,
  setValidity,
} from '../_shared/form-associated.js';
import { ElementBase } from '../../core/element-base.js';
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

  const TYPEAHEAD_MS = 500;
  const SELECTION_DISPLAY = ['tags', 'text', 'count'];
  const APPEARANCE = ['outlined', 'filled', 'underlined'];
  const DEFAULT_MAX_HEIGHT = 16 * 16;

  type SelectOption = {
    value: string;
    label: string;
    group: string;
    description: string;
    start: HTMLElement[];
    disabled: boolean;
    el: HTMLElement;
  };

  const positive = (raw: unknown): number => {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  let uidSeq = 0;

  class IsSelect extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    radius: '--is-select-border-radius',
    'border-color': { prop: '--is-select-border', onlyColorValues: true },
    bg: { prop: '--is-select-bg', onlyColorValues: true },
    'text-color': { prop: '--is-select-text', onlyColorValues: true },
    'focus-color': { prop: '--is-select-focus', onlyColorValues: true },
    'danger-color': { prop: '--is-select-danger', onlyColorValues: true },
    };

    static formAssociated = true;
    static get observedAttributes(): string[] { return [...OBSERVED, 'radius', 'border-color', 'bg', 'text-color', 'focus-color', 'danger-color']; }

    #internals: ElementInternals | null = null;
    #base!: HTMLElement;
    #trigger!: HTMLElement;
    #display!: HTMLElement;
    #tags!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintEl!: HTMLElement;
    #hintSlot!: HTMLSlotElement;
    #errorEl!: HTMLElement;
    #clearBtn!: HTMLElement;
    #dialog!: HTMLDialogElement;
    #listbox!: HTMLElement;
    #slot!: HTMLSlotElement;
    #uid = `is-sel-${++uidSeq}`;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultValues: string[] = [];
    #options: SelectOption[] = [];
    #values: string[] = [];
    #activeIndex = -1;
    #wasOpen = false;
    #writingValue = false;
    #typeBuf = '';
    #typeTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#trigger = shadow.querySelector<HTMLElement>('.trigger')!;
      this.#display = shadow.querySelector<HTMLElement>('.display')!;
      this.#tags = shadow.querySelector<HTMLElement>('.tags')!;
      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#labelSlot = shadow.querySelector<HTMLSlotElement>('slot[name="label"]')!;
      this.#hintEl = shadow.querySelector<HTMLElement>('.hint')!;
      this.#hintSlot = shadow.querySelector<HTMLSlotElement>('slot[name="hint"]')!;
      this.#errorEl = shadow.querySelector<HTMLElement>('.error-text')!;
      this.#clearBtn = shadow.querySelector<HTMLElement>('.clear')!;
      this.#dialog = shadow.querySelector<HTMLDialogElement>('.popup')!;
      this.#listbox = shadow.querySelector<HTMLElement>('.listbox')!;
      this.#slot = shadow.querySelector<HTMLSlotElement>('slot:not([name])')!;

      this.#hintEl.id = `${this.#uid}-hint`;
      this.#errorEl.id = `${this.#uid}-error`;

      this.#internals = attachFormInternals(this);

      this.#base.addEventListener('click', this.#onBaseClick);
      this.#trigger.addEventListener('keydown', this.#onKeydown);
      this.#clearBtn.addEventListener('click', this.#onClear);
      this.#tags.addEventListener('is-remove', this.#onTagRemove as EventListener);
      this.#listbox.addEventListener('click', this.#onOptionClick);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('keydown', this.#onKeydown);
      this.#slot.addEventListener('slotchange', this.#onSlotChange);
      this.#labelSlot.addEventListener('slotchange', () => this.#syncMeta());
      this.#hintSlot.addEventListener('slotchange', () => this.#syncMeta());
    }

    onConnected(): void {
      const self = this as unknown as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(this, 'values')) {
        const v = self['values'];
        delete self['values'];
        if (v != null) self['values'] = v;
      }
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

    onDisconnected(): void {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      if (this.#typeTimer != null) clearTimeout(this.#typeTimer);
      this.#typeTimer = null;
      if (this.#dialog.open) this.#dialog.close();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
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

    get value(): string { return this.multiple ? this.#values.join(',') : (this.#values[0] ?? ''); }
    set value(v: string | null) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    /** @returns {string[]} copia de los valores seleccionados */
    get values(): string[] { return [...this.#values]; }
    set values(list: string[] | null) {
      const next = Array.isArray(list) ? list.map(String) : [];
      this.#values = this.multiple ? [...new Set(next)] : next.slice(0, 1);
      this.#writeValueAttr();
      this.#apply();
    }

    /** @returns {{ value: string, label: string }[]} */
    get selectedOptions(): { value: string; label: string }[] {
      return this.#options
        .filter((o) => this.#values.includes(o.value))
        .map((o) => ({ value: o.value, label: o.label }));
    }

    get multiple(): boolean { return this.hasAttribute('multiple'); }
    set multiple(v: boolean) { this.toggleAttribute('multiple', !!v); }

    get open(): boolean { return this.hasAttribute('open'); }
    set open(v: boolean) { this.toggleAttribute('open', !!v); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get required(): boolean { return this.hasAttribute('required'); }
    set required(v: boolean) { this.toggleAttribute('required', !!v); }

    get clearable(): boolean { return this.hasAttribute('clearable'); }
    set clearable(v: boolean) { this.toggleAttribute('clearable', !!v); }

    get checkmarks(): boolean { return this.hasAttribute('checkmarks'); }
    set checkmarks(v: boolean) { this.toggleAttribute('checkmarks', !!v); }

    get error(): boolean { return this.hasAttribute('error'); }
    set error(v: boolean) { this.toggleAttribute('error', !!v); }

    get errorText(): string { return this.getAttribute('error-text') ?? ''; }
    set errorText(v: string | null) { setStringAttr(this, 'error-text', v); }

    get fullWidth(): boolean { return this.hasAttribute('full-width'); }
    set fullWidth(v: boolean) { this.toggleAttribute('full-width', !!v); }

    get autoWidth(): boolean { return this.hasAttribute('auto-width'); }
    set autoWidth(v: boolean) { this.toggleAttribute('auto-width', !!v); }

    /** Altura del listbox en nº de opciones (0 = sin límite propio) */
    get maxVisible(): number { return positive(this.getAttribute('max-visible')); }
    set maxVisible(v: number) { positive(v) ? this.setAttribute('max-visible', String(v)) : this.removeAttribute('max-visible'); }

    /** Chips visibles en `selection-display="tags"` (0 = todos) */
    get limitTags(): number { return positive(this.getAttribute('limit-tags')); }
    set limitTags(v: number) { positive(v) ? this.setAttribute('limit-tags', String(v)) : this.removeAttribute('limit-tags'); }

    get selectionDisplay(): string {
      const raw = (this.getAttribute('selection-display') || '').toLowerCase();
      return SELECTION_DISPLAY.includes(raw) ? raw : 'tags';
    }
    set selectionDisplay(v: string | null) {
      const raw = String(v ?? '').toLowerCase();
      SELECTION_DISPLAY.includes(raw) ? this.setAttribute('selection-display', raw) : this.removeAttribute('selection-display');
    }

    get variant(): string {
      const raw = (this.getAttribute('variant') || '').toLowerCase();
      return APPEARANCE.includes(raw) ? raw : 'outlined';
    }
    set variant(v: string | null) {
      const raw = String(v ?? '').toLowerCase();
      APPEARANCE.includes(raw) ? this.setAttribute('variant', raw) : this.removeAttribute('variant');
    }

    get placeholder(): string { return this.getAttribute('placeholder') ?? ''; }
    set placeholder(v: string | null) { setStringAttr(this, 'placeholder', v); }

    get name(): string { return this.getAttribute('name') ?? ''; }
    set name(v: string | null) { setStringAttr(this, 'name', v); }

    get form(): HTMLFormElement | null { return this.#internals?.form ?? null; }
    get validity(): ValidityState | null { return this.#internals?.validity ?? null; }
    get validationMessage(): string { return this.#internals?.validationMessage ?? ''; }

    show(): void { this.open = true; }
    hide(): void { this.open = false; }

    checkValidity(): boolean { return this.#internals?.checkValidity() ?? true; }
    reportValidity(): boolean { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg: string): void {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#trigger);
      else this.#updateValidity();
    }

    formResetCallback(): void {
      this.#values = [...this.#defaultValues];
      this.#writeValueAttr();
      this.#apply();
    }

    formDisabledCallback(disabled: boolean): void {
      this.#formDisabled = !!disabled;
      this.#syncDisabled();
    }

    get #isDisabled(): boolean { return this.disabled || this.#formDisabled; }

    // ---------------------------------------------------------------- opciones

    #onSlotChange = (): void => {
      this.#collectOptions();
      this.#renderDisplay();
      this.#renderList();
    };

    #collectOptions(): void {
      const assigned = this.#slot.assignedElements({ flatten: true });
      const source = assigned.length ? assigned : [...this.children];
      const list: SelectOption[] = [];
      for (const el of source) {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'is-option' && tag !== 'option') continue;
        const elAny = el as Element & { label?: string };
        const label = typeof elAny.label === 'string' ? elAny.label : (el.textContent || '').trim();
        list.push({
          value: el.hasAttribute('value') ? (el.getAttribute('value') ?? label) : label,
          label,
          group: el.getAttribute('group') || '',
          description: (el.querySelector<HTMLElement>(':scope > [slot="description"]')?.textContent || '').trim(),
          start: [...el.querySelectorAll<HTMLElement>(':scope > [slot="start"]')],
          disabled: el.hasAttribute('disabled'),
          el: el as HTMLElement,
        });
      }
      this.#options = this.#sortByGroup(list);
    }

    /** Agrupa sin alterar el orden relativo; las opciones sin `group` van primero. */
    #sortByGroup(list: SelectOption[]): SelectOption[] {
      if (!list.some((o) => o.group)) return list;
      const groups: string[] = [];
      for (const o of list) if (!groups.includes(o.group)) groups.push(o.group);
      groups.sort((a, b) => (a ? 1 : 0) - (b ? 1 : 0));
      return groups.flatMap((g) => list.filter((o) => o.group === g));
    }

    #optionByValue(value: string): SelectOption | undefined { return this.#options.find((o) => o.value === value); }

    #labelOf(value: string): string { return this.#optionByValue(value)?.label ?? value; }

    // ------------------------------------------------------------------ valores

    #readValueAttr(allowOptionDefaults: boolean): void {
      const raw = this.getAttribute('value');
      if (raw != null && raw !== '') {
        const parts = this.multiple
          ? raw.split(',').map((s: string) => s.trim()).filter(Boolean)
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

    #writeValueAttr(): void {
      this.#writingValue = true;
      const v = this.value;
      if (v) this.setAttribute('value', v);
      else this.removeAttribute('value');
      this.#writingValue = false;
    }

    /** Refresca todo lo derivado del estado de selección. */
    #apply(): void {
      this.#syncOptionEls();
      this.#renderDisplay();
      this.#renderList();
      this.#setFormValue();
      this.#updateValidity();
      this.#syncClear();
      setCustomState(this.#internals, 'blank', this.#values.length === 0);
    }

    #syncOptionEls(): void {
      for (const o of this.#options) {
        const on = this.#values.includes(o.value);
        if (o.el.hasAttribute('selected') !== on) o.el.toggleAttribute('selected', on);
      }
    }

    #setFormValue(): void {
      const name = this.name;
      if (this.multiple && name) {
        const fd = new FormData();
        for (const v of this.#values) fd.append(name, v);
        setFormValue(this.#internals, fd as unknown as FormDataEntryValue);
        return;
      }
      setFormValue(this.#internals, this.value || null);
    }

    #updateValidity(): void {
      if (this.required && !this.#values.length) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione una opción', this.#trigger);
        return;
      }
      clearValidity(this.#internals, this.#trigger);
    }

    #commit(values: string[]): void {
      const prev = this.value;
      this.#values = this.multiple ? [...new Set(values)] : values.slice(0, 1);
      this.#writeValueAttr();
      this.#apply();
      if (this.value !== prev) emit(this, 'is-change', { value: this.value, values: this.values });
    }

    #toggleValue(value: string): void {
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

    #syncMeta(): void {
      const labelAttr = this.getAttribute('label') || '';
      const labelSlotted = this.#labelSlot.assignedNodes({ flatten: true }).length > 0;
      const labelText = this.#labelEl.querySelector<HTMLElement>('.label-text');
      if (labelText) labelText.textContent = labelAttr;
      this.#labelEl.hidden = !labelAttr && !labelSlotted;

      const errorText = this.errorText;
      const showError = this.error && !!errorText;
      this.#errorEl.textContent = errorText;
      this.#errorEl.hidden = !showError;

      const hintAttr = this.getAttribute('hint') || '';
      const hintSlotted = this.#hintSlot.assignedNodes({ flatten: true }).length > 0;
      const hintText = this.#hintEl.querySelector<HTMLElement>('.hint-text');
      if (hintText) hintText.textContent = hintAttr;
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

    #syncClear(): void {
      this.#clearBtn.hidden = !(this.clearable && this.#values.length > 0 && !this.#isDisabled);
    }

    #syncDisabled(): void {
      const disabled = this.#isDisabled;
      this.#trigger.setAttribute('aria-disabled', String(disabled));
      this.#trigger.setAttribute('tabindex', disabled ? '-1' : '0');
      this.#clearBtn.toggleAttribute('disabled', disabled);
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

    #showTags(on: boolean): void {
      this.#tags.hidden = !on;
      this.#display.hidden = on;
      if (!on) this.#tags.replaceChildren();
    }

    #renderTags(): void {
      this.#tags.replaceChildren();
      const limit = this.limitTags;
      const shown = limit ? this.#values.slice(0, limit) : this.#values;
      for (const v of shown) {
        const label = this.#labelOf(v);
        const tag = document.createElement('is-tag') as HTMLElement & { dataset: DOMStringMap };
        tag.setAttribute('part', 'tag');
        tag.setAttribute('with-remove', '');
        tag.setAttribute('remove-label', `Quitar ${label}`);
        tag.dataset['value'] = v;
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

    #renderList(): void {
      this.#listbox.replaceChildren();
      let group: string | null = null;
      let container: HTMLElement = this.#listbox;
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

    #openGroup(name: string, index: number): HTMLElement {
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

    #buildRow(opt: SelectOption, index: number): HTMLElement {
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

    #syncActiveDescendant(): void {
      const active = this.#activeIndex >= 0 ? `${this.#uid}-o${this.#activeIndex}` : '';
      if (active) this.#trigger.setAttribute('aria-activedescendant', active);
      else this.#trigger.removeAttribute('aria-activedescendant');
    }

    #scrollActive(): void {
      this.#listbox.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' });
    }

    #focusTrigger(): void {
      queueMicrotask(() => {
        try { this.#trigger.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    // ------------------------------------------------------------------ popover

    /** Alto máximo del listbox: `max-visible` opciones o el tope por defecto. */
    #heightCap(): number {
      const n = this.maxVisible;
      if (!n) return DEFAULT_MAX_HEIGHT;
      const row = this.#listbox.querySelector<HTMLElement>('.option');
      const rowH = row?.getBoundingClientRect().height;
      if (!rowH) return DEFAULT_MAX_HEIGHT;
      const cs = getComputedStyle(this.#listbox);
      return Math.ceil(rowH * n + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom));
    }

    #positionList(): void {
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

    #syncOpen(): void {
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

    #onReposition = (): void => { if (this.open) this.#positionList(); };

    // ----------------------------------------------------------------- eventos

    #onBaseClick = (e: PointerEvent): void => {
      if (this.#isDisabled) return;
      const target = e.target as Element | null;
      if (target?.closest('.clear')) return;
      this.open = !this.open;
      if (!this.open) this.#focusTrigger();
    };

    #onOptionClick = (e: PointerEvent): void => {
      const target = e.target as Element | null;
      const row = target?.closest('[role="option"]') as HTMLElement | null;
      if (!row || row.hasAttribute('data-disabled')) return;
      e.preventDefault();
      const index = Number(row.dataset.index);
      const opt = this.#options[index];
      if (!opt) return;
      this.#activeIndex = index;
      this.#toggleValue(opt.value);
    };

    #onTagRemove = (e: Event): void => {
      const target = e.target as Element | null;
      const tag = target?.closest('is-tag') as HTMLElement | null;
      const value = tag?.dataset['value'];
      if (!value || this.#isDisabled) return;
      e.stopPropagation();
      this.#commit(this.#values.filter((v) => v !== value));
    };

    #onClear = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (this.#isDisabled) return;
      this.#commit([]);
      this.#focusTrigger();
    };

    #onDialogClick = (e: PointerEvent): void => {
      if (e.target !== this.#dialog) return;
      this.open = false;
      this.#focusTrigger();
    };

    #onDialogCancel = (e: Event): void => {
      e.preventDefault();
      this.open = false;
      this.#focusTrigger();
    };

    #setActive(index: number): void {
      this.#activeIndex = index;
      this.#renderList();
      this.#scrollActive();
    }

    #move(dir: number): void {
      const n = this.#options.length;
      if (!n) return;
      let i = this.#activeIndex;
      for (let step = 0; step < n; step++) {
        i = i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n;
        if (!this.#options[i].disabled) { this.#setActive(i); return; }
      }
    }

    /** Typeahead ARIA: repetir la misma letra cicla entre las coincidencias. */
    #typeahead(ch: string): void {
      if (this.#typeTimer != null) clearTimeout(this.#typeTimer);
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

    #onKeydown = (e: KeyboardEvent): void => {
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
