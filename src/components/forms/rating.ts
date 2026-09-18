import { adoptCss, defineElement, emit } from '../../core/element.js';
import {
  attachFormInternals, setCustomState, setFormValue, setValidity, clearValidity
} from '../_shared/form-associated.js';
import '../media/icon.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr, setOptionalAttr } from '../_shared/reflect.js';
import { hasSlotted } from '../_shared/dom-utils.js';
import { clampTo, tidyToStep } from '../_shared/misc-utils.js';
/**
 * <is-rating> — Valoración form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   name, label, color (brand|neutral|success|warning|danger)
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
    'highlight-selected-only', 'color', 'label-format', 'show-label',
    'clearable', 'disabled', 'readonly', 'required', 'label',
  ];

  const EXTRA_UPGRADE_PROPS: string[] = ['labels', 'getLabelText'];

  const VARIANTS = ['brand', 'neutral', 'success', 'warning', 'danger'];

  const ICON_FULL = 'mdi:star';
  const ICON_EMPTY = 'mdi:star-outline';

  type LabelFn = (value: number) => string;

  class IsRating extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    size: '--is-rating-size',
    gap: '--is-rating-gap',
    color: { prop: '--is-rating-color', onlyColorValues: true },
    'empty-color': { prop: '--is-rating-empty', onlyColorValues: true },
    'focus-color': { prop: '--is-rating-focus', onlyColorValues: true },
    };

    static formAssociated = true;
    static get observedAttributes(): string[] { return [...OBSERVED, 'size', 'gap', 'color', 'empty-color', 'focus-color']; }

    #internals: ElementInternals | null = null;
    #base!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hoverLabel!: HTMLElement;
    #stars: HTMLElement[] = [];
    #fullIcons: HTMLElement[] = [];
    #emptyIcons: HTMLElement[] = [];
    #value = 0;
    #hover: number | null = null;
    #labels: string[] | null = null;
    #getLabelText: LabelFn | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.getElementById('base')!;
      this.#labelEl = shadow.getElementById('label')!;
      this.#labelSlot = this.#labelEl.querySelector<HTMLSlotElement>('slot')!;
      this.#hoverLabel = shadow.getElementById('hoverLabel')!;

      this.#internals = attachFormInternals(this);

      this.#base.addEventListener('pointermove', this.#onPointerMove);
      this.#base.addEventListener('pointerleave', this.#onPointerLeave);
      this.#base.addEventListener('click', this.#onClick);
      this.#base.addEventListener('keydown', this.#onKeyDown);
      this.#labelSlot.addEventListener('slotchange', this.#syncSlots);
    }

    onConnected(): void {
      for (const p of EXTRA_UPGRADE_PROPS) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = (this as unknown as Record<string, unknown>)[p];
          delete (this as unknown as Record<string, unknown>)[p];
          if (v != null) (this as unknown as Record<string, unknown>)[p] = v;
        }
      }
      this.#value = this.#coerce(Number(this.getAttribute('value') ?? '0'));
      this.#syncSlots();
      this.#buildStars();
      this.#syncDisabled();
      this.#render();
    }

    onAttributeChanged(name: string, _oldVal: string | null, newVal: string | null): void {
      if (name === 'value') {
        this.#value = this.#coerce(Number(newVal ?? '0'));
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

    get value(): number { return this.#value; }
    set value(v: number | string) {
      const next = this.#coerce(Number(v));
      if (next === this.#value) return;
      this.#value = next;
      this.#render();
    }

    get max(): number {
      const n = Number(this.getAttribute('max') ?? '5');
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
    }
    set max(v: number | string) { this.setAttribute('max', String(v)); }

    /** Granularidad del valor; `allow-half` es el alias histórico de 0.5. */
    get precision(): number {
      const n = Number(this.getAttribute('precision'));
      if (Number.isFinite(n) && n > 0 && n <= 1) return n;
      return this.hasAttribute('allow-half') ? 0.5 : 1;
    }
    set precision(v: number | string) { this.setAttribute('precision', String(v)); }

    get allowHalf(): boolean { return this.hasAttribute('allow-half'); }
    set allowHalf(v: boolean) { this.toggleAttribute('allow-half', !!v); }

    get icon(): string { return this.getAttribute('icon') || ICON_FULL; }
    set icon(v: string) { setStringAttr(this, 'icon', v); }

    /** Sin `empty-icon`, un `icon` propio se reutiliza para el hueco (como MUI). */
    get emptyIcon(): string {
      return this.getAttribute('empty-icon') || (this.hasAttribute('icon') ? this.icon : ICON_EMPTY);
    }
    set emptyIcon(v: string) {
      setStringAttr(this, 'empty-icon', v);
    }

    get highlightSelectedOnly(): boolean { return this.hasAttribute('highlight-selected-only'); }
    set highlightSelectedOnly(v: boolean) { this.toggleAttribute('highlight-selected-only', !!v); }

    get color(): string {
      const v = this.getAttribute('color');
      return VARIANTS.includes(v ?? '') ? (v as string) : 'brand';
    }
    set color(v: string) { this.setAttribute('color', VARIANTS.includes(v) ? v : 'brand'); }

    /** Textos por valor entero: índice 0 = valor 1. */
    get labels(): string[] | null { return this.#labels ? this.#labels.slice() : null; }
    set labels(v: string[] | null) {
      this.#labels = Array.isArray(v) ? v.slice() : null;
      this.#render();
    }

    get labelFormat(): string { return this.getAttribute('label-format') ?? ''; }
    set labelFormat(v: string | null | undefined) {
      setOptionalAttr(this, 'label-format', v);
    }

    get getLabelText(): LabelFn | null { return this.#getLabelText; }
    set getLabelText(fn: LabelFn | null | undefined) {
      this.#getLabelText = typeof fn === 'function' ? fn : null;
      this.#render();
    }

    get showLabel(): boolean { return this.hasAttribute('show-label'); }
    set showLabel(v: boolean) { this.toggleAttribute('show-label', !!v); }

    get clearable(): boolean { return this.hasAttribute('clearable'); }
    set clearable(v: boolean) { this.toggleAttribute('clearable', !!v); }

    get name(): string { return this.getAttribute('name') ?? ''; }
    set name(v: string) { setStringAttr(this, 'name', v); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get readonly(): boolean { return this.hasAttribute('readonly'); }
    set readonly(v: boolean) { this.toggleAttribute('readonly', !!v); }

    get required(): boolean { return this.hasAttribute('required'); }
    set required(v: boolean) { this.toggleAttribute('required', !!v); }

    get label(): string { return this.getAttribute('label') ?? ''; }
    set label(v: string | null | undefined) { setOptionalAttr(this, 'label', v); }

    // ---- API pública -----------------------------------------------------

    focus(options?: FocusOptions): void { this.#base.focus(options); }
    blur(): void { this.#base.blur(); }

    clear(): void { this.#commit(0); }

    get validity(): ValidityState | null | undefined { return this.#internals?.validity; }
    get validationMessage(): string { return this.#internals?.validationMessage ?? ''; }
    get willValidate(): boolean { return this.#internals?.willValidate ?? false; }
    checkValidity(): boolean { return this.#internals?.checkValidity() ?? true; }
    reportValidity(): boolean { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg: string): void {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#base);
      else this.#updateValidity();
    }

    // ---- form-associated callbacks --------------------------------------

    formResetCallback(): void {
      this.#value = this.#coerce(Number(this.getAttribute('value') ?? '0'));
      this.#hover = null;
      this.#render();
    }

    formDisabledCallback(disabled: boolean): void {
      this.#syncDisabled(disabled);
      this.#render();
    }

    formStateRestoreCallback(state: string | File | FormData | null): void {
      if (state != null) this.value = Number(state);
    }

    // ---- privados --------------------------------------------------------

    /** Ajusta a `precision`; en readonly se admite cualquier fracción (ej. 3.7). */
    #coerce(n: number): number {
      if (!Number.isFinite(n) || n <= 0) return 0;
      const max = this.max;
      if (this.readonly) return Math.min(max, n);
      const unit = this.precision;
      return Math.min(max, tidyToStep(Math.round(n / unit) * unit, unit));
    }

    #labelText(v: number): string {
      if (this.#getLabelText) return String(this.#getLabelText(v));
      const text = this.#labels?.[Math.ceil(v) - 1];
      if (text != null && text !== '') return String(text);
      const tpl = this.labelFormat;
      if (tpl) return tpl.replace(/\{v\}/g, String(v)).replace(/\{max\}/g, String(this.max));
      return `${v} de ${this.max}`;
    }

    #syncSlots = (): void => {
      const labelAttr = this.label.trim();
      const hasLabelSlot = hasSlotted(this.#labelSlot);
      if (!hasLabelSlot) this.#labelSlot.textContent = labelAttr;
      this.#labelEl.hidden = !labelAttr && !hasLabelSlot;
    };

    #buildStars(): void {
      const max = this.max;
      this.#base.replaceChildren();
      this.#stars = [];
      this.#fullIcons = [];
      this.#emptyIcons = [];
      for (let i = 0; i < max; i++) {
        const star = (STAR_TEMPLATE.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
        star.dataset['index'] = String(i + 1);
        this.#base.appendChild(star);
        this.#stars.push(star);
        const emptyIcon = star.querySelector<HTMLElement>('.layer-empty is-icon');
        const fullIcon = star.querySelector<HTMLElement>('.layer-fill is-icon');
        if (emptyIcon) this.#emptyIcons.push(emptyIcon);
        if (fullIcon) this.#fullIcons.push(fullIcon);
      }
    }

    #syncDisabled(formDisabled?: boolean): void {
      const disabled = !!formDisabled || this.disabled;
      const inert = disabled || this.readonly;
      this.#base.setAttribute('aria-disabled', String(disabled));
      this.#base.setAttribute('aria-readonly', String(this.readonly));
      this.#base.tabIndex = inert ? -1 : 0;
      setCustomState(this.#internals, 'disabled', disabled);
      setCustomState(this.#internals, 'readonly', this.readonly);
      if (inert) this.#hover = null;
    }

    #render(): void {
      const display = this.#hover ?? this.#value;
      const only = this.highlightSelectedOnly;
      const selected = Math.ceil(display);
      const icon = this.icon;
      const emptyIcon = this.emptyIcon;

      this.#stars.forEach((star: HTMLElement, i: number) => {
        const n = i + 1;
        const fill = only
          ? (n === selected ? clampTo(display - i, 0, 1) : 0)
          : clampTo(display - i, 0, 1);
        star.style.setProperty('--fill', `${Math.round(fill * 10000) / 100}%`);
        star.toggleAttribute('data-filled', fill >= 1);
        star.toggleAttribute('data-half', fill > 0 && fill < 1);
        star.setAttribute('aria-label', this.#labelText(n));
        this.#fullIcons[i]?.setAttribute('icon', icon);
        this.#emptyIcons[i]?.setAttribute('icon', emptyIcon);
      });

      const text = this.showLabel && display > 0 ? this.#labelText(display) : '';
      this.#hoverLabel.textContent = text;
      this.#hoverLabel.hidden = !text;

      this.#base.setAttribute('aria-valuemax', String(this.max));
      this.#base.setAttribute('aria-valuenow', String(this.#value));
      this.#base.setAttribute('aria-valuetext', this.#labelText(this.#value));
      setCustomState(this.#internals, 'blank', this.#value === 0);
      setFormValue(this.#internals, this.#value > 0 ? String(this.#value) : null, null);
      this.#updateValidity();
    }

    #updateValidity(): void {
      if (!this.#internals) return;
      if (this.required && this.#value === 0) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione una valoración', this.#base);
        return;
      }
      clearValidity(this.#internals, this.#base);
    }

    #interactive(): boolean {
      return !this.disabled && !this.readonly && this.#base.getAttribute('aria-disabled') !== 'true';
    }

    #commit(next: number): void {
      const v = this.#coerce(next);
      this.#hover = null;
      if (v === this.#value) { this.#render(); return; }
      this.#value = v;
      this.setAttribute('value', String(v));
      this.#render();
      emit(this, 'is-change', { value: v, label: this.#labelText(v) });
    }

    /** El primer paso dentro de un icono ya cuenta como `precision`, nunca 0. */
    #valueFromPointer(clientX: number): number {
      const unit = this.precision;
      for (let i = 0; i < this.#stars.length; i++) {
        const rect = this.#stars[i]!.getBoundingClientRect();
        if (clientX <= rect.right || i === this.#stars.length - 1) {
          if (!rect.width) return i + 1;
          const ratio = clampTo((clientX - rect.left) / rect.width, 0, 1);
          const frac = clampTo(Math.ceil(ratio / unit - 1e-9) * unit, unit, 1);
          return tidyToStep(i + frac, unit);
        }
      }
      return 0;
    }

    #onPointerMove = (e: PointerEvent): void => {
      if (!this.#interactive()) return;
      const next = this.#valueFromPointer(e.clientX);
      if (next === this.#hover) return;
      this.#hover = next;
      this.#render();
      emit(this, 'is-hover', { value: this.#value, phantomValue: next, label: this.#labelText(next) });
    };

    #onPointerLeave = (): void => {
      if (this.#hover === null) return;
      this.#hover = null;
      this.#render();
      emit(this, 'is-hover', { value: this.#value, phantomValue: null, label: this.#labelText(this.#value) });
    };

    #onClick = (e: PointerEvent): void => {
      if (!this.#interactive()) return;
      const next = this.#valueFromPointer(e.clientX);
      const clear = this.clearable && this.#value >= 1 && next === this.#value;
      this.#commit(clear ? 0 : next);
    };

    #onKeyDown = (e: KeyboardEvent): void => {
      if (!this.#interactive()) return;
      const unit = this.precision;
      const from = this.#coerce(this.#value);
      let next: number | null = null;

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

  defineElement('is-rating', IsRating, 'IsRating');
})();
