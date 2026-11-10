import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import type { Validez } from '@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js';
import { DEFAULT_INTENT, ensureDefaultColor } from '@jeff-aporta/iswc-base/core/attrs.js';
import { hasSlotted } from '@jeff-aporta/iswc-base/core/dom.js';
import css from 'iswc:css';
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import type { SwitchEventos } from './schemas/switch.schemas.js';
/**
 * <iswc-switch> — Interruptor form-associated (track + thumb).
 *
 * Atributos
 *   name, value (default "on"), hint
 *   color          brand (default) | neutral | success | warning | danger | info | error
 *   label-placement  end (default) | start | top | bottom
 *   icon             nombre de <iswc-icon> dentro del thumb apagado
 *   checked-icon     nombre de <iswc-icon> dentro del thumb encendido
 *   on-label         texto corto dentro del track cuando está encendido
 *   off-label        texto corto dentro del track cuando está apagado
 *   checked, disabled, readonly, required, error   (boolean)
 *
 * Slots: default (etiqueta), hint
 * Parts: form-control, base, control, track-label, thumb, mark, label, hint
 * Custom states: checked, disabled, readonly, error
 * Events: iswc-change { checked, value }
 *
 * Sin `color`: brand (mismo contrato que button). Escala con font-size del contexto.
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
            <iswc-icon part="mark" class="mark" hidden></iswc-icon>
          </span>
        </span>
        <span part="label" class="label" id="label"><slot></slot></span>
      </div>
      <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
    </div>
  `;

  // Los demás atributos los declara cada `@prop` (y name, disabled, readonly, required y error, `IswcFormControl`).
  const OBSERVED: string[] = ['color', 'label-placement'];

  // Literal para audit/exhaustivos; alineado a INTENT (+ info/error).
  const VARIANTS: readonly string[] = [
    'brand', 'neutral', 'text', 'success', 'warning', 'danger', 'info', 'error',
  ];
  const PLACEMENTS: string[] = ['end', 'start', 'top', 'bottom'];

  /** Sin flatten: el texto de fallback del slot no cuenta como contenido propio. */

  class IswcSwitch extends IswcFormControl {
    static override tag = 'iswc-switch';
    declare static events: SwitchEventos;
    static override css = css;
    static override deps = ['iswc-icon'];

    static override observed = [...OBSERVED, 'height', 'width', 'bg', 'accent', 'thumb-color', 'focus-color', 'halo'];

    #mark!: HTMLElement;
    #onLabelEl!: HTMLElement;
    #offLabelEl!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintEl!: HTMLElement;
    #hintSlot!: HTMLSlotElement;
    #defaultsRead = false;
    #defaultChecked = false;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#mark = shadow.querySelector<HTMLElement>('.mark')!;
      this.#onLabelEl = shadow.getElementById('onLabel')!;
      this.#offLabelEl = shadow.getElementById('offLabel')!;
      this.#labelEl = shadow.getElementById('label')!;
      this.#labelSlot = this.#labelEl.querySelector<HTMLSlotElement>('slot')!;
      this.#hintEl = shadow.getElementById('hint')!;
      this.#hintSlot = this.#hintEl.querySelector<HTMLSlotElement>('slot')!;

      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKey);
      this.#labelSlot.addEventListener('slotchange', this.#syncSlots);
      this.#hintSlot.addEventListener('slotchange', this.#syncSlots);
    }

    override onConnected(): void {
      if (!this.#defaultsRead) {
        this.#defaultsRead = true;
        this.#defaultChecked = this.checked;
      }
      ensureDefaultColor(this, DEFAULT_INTENT);
      if (!this.hasAttribute('role')) this.setAttribute('role', 'switch');
      this.#syncSlots();
      this.#sync();
    }

    override onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
      if (name === 'hint') {
        this.#syncSlots();
        return;
      }
      this.#sync();
    }

    @prop({ type: 'bool' }) accessor checked: boolean = false;

    @prop() accessor value: string = 'on';

    @prop({ vacio: true }) override accessor hint: string = '';

    get color(): string {
      const v = this.getAttribute('color') ?? '';
      return VARIANTS.includes(v) ? v : DEFAULT_INTENT;
    }
    set color(v: string) {
      if (v == null || v === '') this.setAttribute('color', DEFAULT_INTENT);
      else this.setAttribute('color', VARIANTS.includes(v) ? v : DEFAULT_INTENT);
    }

    get labelPlacement(): string {
      const v = this.getAttribute('label-placement');
      return PLACEMENTS.includes(v ?? '') ? (v ?? '') : 'end';
    }
    set labelPlacement(v: string) { this.setAttribute('label-placement', PLACEMENTS.includes(v) ? v : 'end'); }

    @prop() accessor icon: string = '';

    @prop() accessor checkedIcon: string = '';

    @prop() accessor onLabel: string = '';

    @prop() accessor offLabel: string = '';

    /** Encendido entrega `value`; apagado no entra en FormData. */
    override valorFormulario(): string | null { return this.checked ? this.value : null; }

    override estaVacio(): boolean { return !this.checked; }

    override validar(): Validez {
      const [flags, mensaje] = super.validar();
      return flags.valueMissing ? [flags, 'Active esta opción'] : [flags, mensaje];
    }

    override restablecer(): void {
      this.toggleAttribute('checked', this.#defaultChecked);
      this.#sync();
    }

    override formDisabledCallback(disabled: boolean): void {
      super.formDisabledCallback(disabled);
      this.#sync();
    }

    #syncSlots = (): void => {
      const hint = this.hint.trim();
      const hasHintSlot = hasSlotted(this.#hintSlot);
      if (!hasHintSlot && this.#hintSlot.textContent !== hint) this.#hintSlot.textContent = hint;
      this.#hintEl.hidden = !hint && !hasHintSlot;
      this.#labelEl.hidden = !hasSlotted(this.#labelSlot);
      try {
        if (this.internals) this.internals.ariaDescribedByElements = this.#hintEl.hidden ? [] : [this.#hintEl];
      } catch { /* motores sin ariaDescribedByElements */ }
    };

    #sync(): void {
      const disabled = this.inhabilitado;
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

      this.estado('checked', checked);
      this.estado('disabled', disabled);
      this.estado('readonly', readonly);
      this.estado('error', this.error);

      this.sincronizarFormulario();
    }

    #toggle(): void {
      if (this.inhabilitado || this.readonly) return;
      const next = !this.checked;
      this.interactuado = true;
      this.checked = next;
      emit(this, 'iswc-change', { checked: next, value: this.value });
    }

    #onClick = (e: PointerEvent): void => {
      if (this.inhabilitado) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // El texto de ayuda no forma parte del control.
      if (e.composedPath().includes(this.#hintEl)) return;
      this.#toggle();
    };

    #onKey = (e: KeyboardEvent): void => {
      if (e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Enter') return;
      e.preventDefault();
      this.#toggle();
    };
  }

  define(IswcSwitch, 'IswcSwitch');
})();
