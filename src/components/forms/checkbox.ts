// @contexto INDICE.md · src/components/forms/checkbox.md
import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import type { Validez } from '@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js';
import { hasSlotted } from '@jeff-aporta/iswc-base/core/dom.js';
import css from 'iswc:css';
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import type { CheckboxEventos } from './schemas/checkbox.schemas.js';
/**
 * <iswc-checkbox> — Casilla form-associated: entra en FormData y en la validación del <form>.
 *
 * Atributos
 *   name, value (default "on"), hint
 *   color             brand (default) | neutral | success | warning | danger
 *   label-placement     end (default) | start | top | bottom
 *   icon                nombre de <iswc-icon> para el estado sin marcar
 *   checked-icon        nombre de <iswc-icon> para el estado marcado (default mdi:check)
 *   indeterminate-icon  nombre de <iswc-icon> para el estado mixto (default mdi:minus)
 *   checked, indeterminate, disabled, readonly, required, error   (boolean)
 *
 * Slots: default (etiqueta), hint
 * Parts: form-control, base, control, mark, label, hint
 * Custom states: checked, indeterminate, disabled, readonly, error
 * Events: iswc-change { checked, value }
 *
 * Sin atributo `size`: escala con el font-size del contexto.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <div part="base" class="base">
        <span part="control" class="control">
          <iswc-icon part="mark" class="mark" hidden></iswc-icon>
        </span>
        <span part="label" class="label" id="label"><slot></slot></span>
      </div>
      <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
    </div>
  `;

  // Los demás atributos los declara cada `@prop` (y name, disabled, readonly, required y error, `IswcFormControl`).
  const OBSERVED: string[] = ['color', 'label-placement'];

  const VARIANTS: string[] = ['brand', 'neutral', 'text', 'success', 'warning', 'danger'];
  const PLACEMENTS: string[] = ['end', 'start', 'top', 'bottom'];

  /** Sin flatten: el texto de fallback del slot no cuenta como contenido propio. */

  class IswcCheckbox extends IswcFormControl {
    static override tag = 'iswc-checkbox';
    declare static events: CheckboxEventos;
    static override css = css;
    static override deps = ['iswc-icon'];

    static override observed = [...OBSERVED, 'size', 'radius', 'bg', 'bg-hover', 'border-color', 'accent', 'focus-color', 'mark-color', 'halo'];

    #mark!: HTMLElement;
    #labelEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintEl!: HTMLElement;
    #hintSlot!: HTMLSlotElement;
    #defaultsRead = false;
    #defaultChecked = false;
    #defaultIndeterminate = false;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#mark = shadow.querySelector<HTMLElement>('.mark')!;
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
        this.#defaultIndeterminate = this.indeterminate;
      }
      if (!this.hasAttribute('role')) this.setAttribute('role', 'checkbox');
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

    @prop({ type: 'bool' }) accessor indeterminate: boolean = false;

    @prop() accessor value: string = 'on';

    @prop({ vacio: true }) override accessor hint: string = '';

    get color(): string {
      const v = this.getAttribute('color');
      return VARIANTS.includes(v ?? '') ? (v ?? '') : 'brand';
    }
    set color(v: string) { this.setAttribute('color', VARIANTS.includes(v) ? v : 'brand'); }

    get labelPlacement(): string {
      const v = this.getAttribute('label-placement');
      return PLACEMENTS.includes(v ?? '') ? (v ?? '') : 'end';
    }
    set labelPlacement(v: string) { this.setAttribute('label-placement', PLACEMENTS.includes(v) ? v : 'end'); }

    @prop() accessor icon: string = '';

    @prop() accessor checkedIcon: string = '';

    @prop() accessor indeterminateIcon: string = '';

    /** Marcada entrega `value`; sin marcar no entra en FormData. */
    override valorFormulario(): string | null { return this.checked ? this.value : null; }

    override estaVacio(): boolean { return !this.checked; }

    override validar(): Validez {
      const [flags, mensaje] = super.validar();
      return flags.valueMissing ? [flags, 'Marque esta casilla'] : [flags, mensaje];
    }

    override restablecer(): void {
      this.toggleAttribute('checked', this.#defaultChecked);
      this.toggleAttribute('indeterminate', this.#defaultIndeterminate);
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
      const mixed = this.indeterminate;
      const checked = this.checked;

      this.setAttribute('aria-checked', mixed ? 'mixed' : String(checked));
      this.setAttribute('aria-disabled', String(disabled));
      if (readonly) this.setAttribute('aria-readonly', 'true');
      else this.removeAttribute('aria-readonly');
      if (this.error) this.setAttribute('aria-invalid', 'true');
      else this.removeAttribute('aria-invalid');
      if (this.required) this.setAttribute('aria-required', 'true');
      else this.removeAttribute('aria-required');
      this.setAttribute('tabindex', disabled ? '-1' : '0');

      const icon = mixed
        ? (this.indeterminateIcon || 'mdi:minus')
        : checked ? (this.checkedIcon || 'mdi:check') : this.icon;
      if (icon) this.#mark.setAttribute('icon', icon);
      else this.#mark.removeAttribute('icon');
      this.#mark.hidden = !icon;

      this.estado('checked', checked && !mixed);
      this.estado('indeterminate', mixed);
      this.estado('disabled', disabled);
      this.estado('readonly', readonly);
      this.estado('error', this.error);

      this.sincronizarFormulario();
    }

    /** Toggle por interacción: el estado mixto se limpia al primer clic. */
    #toggle(): void {
      if (this.inhabilitado || this.readonly) return;
      const next = !this.checked;
      if (this.indeterminate) this.indeterminate = false;
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
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      this.#toggle();
    };
  }

  define(IswcCheckbox, 'IswcCheckbox');
})();
