import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import '../actions/button.js';
import '../forms/input.js';

import {
  attachFormInternals,
  clearValidity,
  setCustomState,
  setFormValue,
  setValidity,
} from '../_shared/form-associated.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { computePosition } from '../_shared/position.js';
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

// Declaración local de la API EyeDropper (Chromium ≥95, no está en lib.dom).
interface EyeDropperOpenResult { sRGBHex: string }
interface EyeDropperInterface { open(): Promise<EyeDropperOpenResult> }
interface EyeDropperConstructor { new(): EyeDropperInterface }
interface WindowWithEyeDropper { EyeDropper?: EyeDropperConstructor }

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
          <is-button part="eyedropper" class="eyedropper" variant="plain" type="button" hidden
            aria-label="Cuentagotas (EyeDropper)" title="Cuentagotas">
            <is-icon icon="mdi:eyedropper"></is-icon>
          </is-button>
        </div>
        <div class="swatches" role="group" aria-label="Colores predefinidos"></div>
      </div>
    </dialog>
  `;

  const OBSERVED = ['name', 'value', 'label', 'hint', 'disabled', 'required', 'swatches'];

  /** Normaliza a #rrggbb en minúsculas; devuelve '' si no es un hex válido. */
  function normalizeHex(raw: string | null): string {
    if (raw == null) return '';
    let s = String(raw).trim().toLowerCase();
    if (s.startsWith('#')) s = s.slice(1);
    if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('');
    return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : '';
  }

  class IsColorPicker extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    radius: '--is-picker-radius',
    'border-color': { prop: '--is-picker-border', onlyColorValues: true },
    bg: { prop: '--is-picker-bg', onlyColorValues: true },
    'text-color': { prop: '--is-picker-text', onlyColorValues: true },
    'focus-color': { prop: '--is-picker-focus', onlyColorValues: true },
    };

    static formAssociated = true;
    static get observedAttributes(): string[] { return [...OBSERVED, 'radius', 'border-color', 'bg', 'text-color', 'focus-color']; }

    #internals: ElementInternals | null = null;
    #trigger!: HTMLButtonElement;
    #swatch!: HTMLElement;
    #hexText!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintEl!: HTMLElement;
    #hintSlot!: HTMLSlotElement;
    #dialog!: HTMLDialogElement;
    #panel!: HTMLElement;
    #native!: HTMLInputElement;
    #hexInput!: HTMLInputElement;
    #dropper!: HTMLButtonElement;
    #swatchesEl!: HTMLElement;
    #open = false;
    #formDisabled = false;
    #defaultsRead = false;
    #defaultValue: string = DEFAULT_VALUE;
    #writingValue = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#trigger = shadow.querySelector<HTMLButtonElement>('.trigger')!;
      this.#swatch = shadow.querySelector<HTMLElement>('.swatch')!;
      this.#hexText = shadow.querySelector<HTMLElement>('.hex-text')!;
      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#labelSlot = shadow.querySelector<HTMLSlotElement>('slot[name="label"]')!;
      this.#hintEl = shadow.querySelector<HTMLElement>('.hint')!;
      this.#hintSlot = shadow.querySelector<HTMLSlotElement>('slot[name="hint"]')!;
      this.#dialog = shadow.querySelector<HTMLDialogElement>('.popup')!;
      this.#panel = shadow.querySelector<HTMLElement>('.panel')!;
      this.#native = shadow.querySelector<HTMLInputElement>('.native')!;
      this.#hexInput = shadow.querySelector<HTMLInputElement>('.hex')!;
      this.#dropper = shadow.querySelector<HTMLButtonElement>('.eyedropper')!;
      this.#swatchesEl = shadow.querySelector<HTMLElement>('.swatches')!;

      this.#internals = attachFormInternals(this);

      this.#trigger.addEventListener('click', this.#onTrigger);
      this.#trigger.addEventListener('keydown', this.#onTriggerKey);
      this.#native.addEventListener('input', this.#onNativeInput);
      this.#native.addEventListener('change', this.#onNativeChange);
      this.#hexInput.addEventListener('input', this.#onHexInput);
      this.#hexInput.addEventListener('change', this.#onHexChange);
      this.#hexInput.addEventListener('keydown', this.#onHexKey);
      this.#dropper.addEventListener('click', this.#onEyedrop);
      this.#swatchesEl.addEventListener('click', this.#onSwatchClick);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#labelSlot.addEventListener('slotchange', () => this.#syncMeta());
      this.#hintSlot.addEventListener('slotchange', () => this.#syncMeta());
    }

    onConnected(): void {
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
      this.#dropper.hidden = typeof (window as WindowWithEyeDropper).EyeDropper !== 'function';
      addEventListener('resize', this.#onReposition, { passive: true });
      addEventListener('scroll', this.#onReposition, true);
    }

    onDisconnected(): void {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      if (this.#dialog.open) this.#dialog.close();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
      if (name === 'value') {
        if (this.#writingValue) return;
        const norm = normalizeHex(newVal) || DEFAULT_VALUE;
        if (norm !== newVal) this.#writeValueAttr(norm);
        this.#sync();
        // 2026-Q1 fix: emitir también cuando el cambio venga de fuera
        // (programador: el.value = '#…' o setAttribute). Antes solo
        // se emitía desde los handlers internos, así que setear el valor
        // por JS no disparaba is-input / is-change y los consumidores
        // (taller de temas, formularios reactivos) parecían no responder.
        if (norm !== (oldVal ?? '')) {
          emit(this, 'is-input', { value: norm });
          emit(this, 'is-change', { value: norm });
        }
      } else if (name === 'disabled') this.#syncDisabled();
      else if (name === 'swatches') this.#renderSwatches();
      else if (name === 'required') this.#updateValidity();
      else this.#syncMeta();
    }

    get value(): string { return normalizeHex(this.getAttribute('value')) || DEFAULT_VALUE; }
    set value(v: string) {
      const norm = normalizeHex(v);
      if (!norm) this.removeAttribute('value');
      else this.setAttribute('value', norm);
    }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get required(): boolean { return this.hasAttribute('required'); }
    set required(v: boolean) { this.toggleAttribute('required', !!v); }

    get name(): string { return this.getAttribute('name') ?? ''; }
    set name(v: string) { setStringAttr(this, 'name', v); }

    /** Paleta activa (`string[]`). */
    get swatches(): string[] {
      const raw = this.getAttribute('swatches');
      if (!raw) return [...DEFAULT_SWATCHES];
      const list = raw.split(',').map((s) => normalizeHex(s)).filter(Boolean);
      return list.length ? list : [...DEFAULT_SWATCHES];
    }
    set swatches(list: string[]) {
      if (!Array.isArray(list) || !list.length) this.removeAttribute('swatches');
      else this.setAttribute('swatches', list.join(','));
    }

    get open(): boolean { return this.#open; }
    get form(): HTMLFormElement | null { return this.#internals?.form ?? null; }
    get validity(): ValidityState | null { return this.#internals?.validity ?? null; }
    get validationMessage(): string { return this.#internals?.validationMessage ?? ''; }

    show(): void {
      if (this.#isDisabled || this.#open) return;
      this.#open = true;
      setCustomState(this.#internals, 'open', true);
      this.#trigger.setAttribute('aria-expanded', 'true');
      if (!this.#dialog.open) this.#dialog.showModal();
      // Tras showModal el scrollbar del body puede desaparecer y mover el ancla:
      // posicionar en rAF garantiza rects estables.
      this.#positionPanel();
      requestAnimationFrame(() => this.#positionPanel());
      queueMicrotask(() => {
        try { this.#hexInput.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    hide(): void {
      if (!this.#open) return;
      this.#open = false;
      setCustomState(this.#internals, 'open', false);
      this.#trigger.setAttribute('aria-expanded', 'false');
      if (this.#dialog.open) this.#dialog.close();
      queueMicrotask(() => {
        try { this.#trigger.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    checkValidity(): boolean { return this.#internals?.checkValidity() ?? true; }
    reportValidity(): boolean { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg: string): void {
      if (msg) setValidity(this.#internals, { customError: true }, msg, this.#trigger);
      else this.#updateValidity();
    }

    formResetCallback(): void {
      this.#writeValueAttr(this.#defaultValue);
      this.#sync();
    }

    formDisabledCallback(disabled: boolean): void {
      this.#formDisabled = !!disabled;
      this.#syncDisabled();
    }

    get #isDisabled(): boolean { return this.disabled || this.#formDisabled; }

    #writeValueAttr(hex: string): void {
      this.#writingValue = true;
      this.setAttribute('value', hex);
      this.#writingValue = false;
    }

    #syncMeta(): void {
      const labelAttr = this.getAttribute('label') || '';
      const labelSlotted = this.#labelSlot.assignedNodes({ flatten: true }).length > 0;
      this.#labelEl.querySelector<HTMLElement>('.label-text')!.textContent = labelAttr;
      this.#labelEl.hidden = !labelAttr && !labelSlotted;

      const hintAttr = this.getAttribute('hint') || '';
      const hintSlotted = this.#hintSlot.assignedNodes({ flatten: true }).length > 0;
      this.#hintEl.querySelector<HTMLElement>('.hint-text')!.textContent = hintAttr;
      this.#hintEl.hidden = !hintAttr && !hintSlotted;

      if (labelAttr) this.#trigger.setAttribute('aria-label', labelAttr);
      if (this.required) this.#trigger.setAttribute('aria-required', 'true');
      else this.#trigger.removeAttribute('aria-required');
    }

    #syncDisabled(): void {
      const disabled = this.#isDisabled;
      this.#trigger.disabled = disabled;
      this.#native.disabled = disabled;
      this.#hexInput.disabled = disabled;
      this.#dropper.disabled = disabled;
      setCustomState(this.#internals, 'disabled', disabled);
      if (disabled) this.hide();
    }

    /** Refleja el valor en trigger, inputs, swatches, FormData y validez. */
    #sync(): void {
      const v = this.value;
      this.#swatch.style.background = v;
      this.#hexText.textContent = v;
      this.#native.value = v;
      if (document.activeElement !== this && this.#hexInput.value.toLowerCase() !== v) {
        this.#hexInput.value = v;
      }
      for (const btn of this.#swatchesEl.children) {
        const htmlBtn = btn as HTMLElement;
        htmlBtn.toggleAttribute('data-selected', htmlBtn.dataset['value'] === v);
        htmlBtn.setAttribute('aria-pressed', String(htmlBtn.dataset['value'] === v));
      }
      setFormValue(this.#internals, v || null, null);
      this.#updateValidity();
    }

    #updateValidity(): void {
      if (this.required && !normalizeHex(this.getAttribute('value'))) {
        setValidity(this.#internals, { valueMissing: true }, 'Seleccione un color', this.#trigger);
        return;
      }
      clearValidity(this.#internals, this.#trigger);
    }

    #renderSwatches(): void {
      this.#swatchesEl.replaceChildren();
      for (const hex of this.swatches) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch-btn';
        btn.setAttribute('part', 'swatch');
        btn.dataset['value'] = hex;
        btn.style.background = hex;
        btn.title = hex;
        btn.setAttribute('aria-label', hex);
        this.#swatchesEl.appendChild(btn);
      }
      this.#sync();
    }

    /** @param hex Código hex. @param committed dispara también is-change. */
    #setValue(hex: string, committed: boolean): void {
      const norm = normalizeHex(hex);
      if (!norm) return;
      const prev = this.value;
      this.#writeValueAttr(norm);
      this.#sync();
      if (norm !== prev) emit(this, 'is-input', { value: norm });
      if (committed && norm !== prev) emit(this, 'is-change', { value: norm });
    }

    #positionPanel(): void {
      if (!this.#dialog.open) return;

      // Ancho del panel ≈ ancho del trigger (mín. cómodo, máx. viewport).
      const anchor = this.#trigger.getBoundingClientRect();
      const margin = 8;
      const minW = 13 * 16;
      const maxW = Math.min(18 * 16, window.innerWidth - margin * 2);
      const panelW = Math.min(maxW, Math.max(minW, Math.round(anchor.width)));
      this.#panel.style.width = `${panelW}px`;
      this.#panel.style.maxWidth = `${maxW}px`;

      const result = computePosition({
        anchor: this.#trigger,
        popupEl: this.#panel,
        placement: 'bottom-start',
        distance: 6,
        flip: true,
        shift: true,
        shiftPadding: margin,
        flipPadding: margin,
        strategy: 'fixed',
        boundary: 'viewport',
      });
      if (!result) return;

      Object.assign(this.#panel.style, {
        position: 'fixed',
        left: `${result.left}px`,
        top: `${result.top}px`,
        right: 'auto',
        bottom: 'auto',
      });
    }

    #onReposition = (): void => { if (this.#open) this.#positionPanel(); };

    #onTrigger = (e: Event): void => {
      e.preventDefault();
      if (this.#isDisabled) return;
      if (this.#open) this.hide();
      else this.show();
    };

    #onTriggerKey = (e: KeyboardEvent): void => {
      if (e.key !== 'ArrowDown' || this.#open) return;
      e.preventDefault();
      this.show();
    };

    #onEyedrop = async (e: Event): Promise<void> => {
      e.preventDefault();
      e.stopPropagation();
      const w = window as WindowWithEyeDropper;
      if (this.#isDisabled || typeof w.EyeDropper !== 'function') return;
      try {
        const result = await new w.EyeDropper!().open();
        this.#setValue(result.sRGBHex, true);
      } catch { /* usuario canceló */ }
    };

    #onNativeInput = (): void => this.#setValue(this.#native.value, false);
    #onNativeChange = (): void => this.#setValue(this.#native.value, true);

    #onHexInput = (): void => {
      const norm = normalizeHex(this.#hexInput.value);
      if (norm) this.#setValue(norm, false);
    };

    #onHexChange = (): void => {
      const norm = normalizeHex(this.#hexInput.value);
      if (norm) this.#setValue(norm, true);
      else this.#hexInput.value = this.value;
    };

    #onHexKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const norm = normalizeHex(this.#hexInput.value);
      if (norm) this.#setValue(norm, true);
      this.hide();
    };

    #onSwatchClick = (e: PointerEvent): void => {
      const target = e.target as Element | null;
      const btn = target?.closest('.swatch-btn') as HTMLElement | null;
      if (!btn) return;
      e.preventDefault();
      this.#setValue(btn.dataset['value'] ?? '', true);
      this.hide();
    };

    #onDialogClick = (e: PointerEvent): void => {
      if (e.target !== this.#dialog) return;
      this.hide();
    };

    #onDialogCancel = (e: Event): void => {
      e.preventDefault();
      this.hide();
    };
  }

  defineElement('is-color-picker', IsColorPicker, 'IsColorPicker');
})();
