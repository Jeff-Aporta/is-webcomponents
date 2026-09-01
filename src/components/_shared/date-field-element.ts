import { adoptCss } from '../../core/element.js';
import { SectionField } from './date-field-core.js';
import { splitDateTime, uses12Hour } from './date-utils.js';
import { defineElement } from '../../core/element.js';
import { emit } from '../../core/element.js';
import { resolveLocale } from './resolve-locale.js';
import '../media/icon.js';
import '../actions/button.js';

/**
 * Fábrica de los campos por secciones: is-date-field, is-time-field e
 * is-date-time-field solo cambian en el `kind`, así que comparten motor,
 * hoja de estilos y asociación con el formulario.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="form-control" class="form-control">
    <label part="label" class="label" hidden></label>
    <div part="base" class="base">
      <slot name="start"></slot>
      <div part="sections" class="sections" role="group"></div>
      <is-button
        type="button"
        part="clear"
        class="clear"
        variant="text"
        color="neutral"
        tabindex="-1"
        aria-label="Borrar"
        hidden
      >
        <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
      </is-button>
      <slot name="end"></slot>
    </div>
    <div part="hint" class="hint" hidden></div>
  </div>
`;

const OBSERVED = [
  'label', 'hint', 'name', 'value', 'min', 'max', 'required', 'disabled',
  'readonly', 'locale', 'ampm', 'hour24', 'seconds', 'clearable', 'invalid',
];

export function defineDateField({ tag, kind, cssUrl }) {
  class IsDateFieldBase extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes(): string[] { return OBSERVED; }

    #internals = null;
    #labelEl!: HTMLElement;
    #hintEl!: HTMLElement;
    #base!: HTMLElement;
    #clearBtn!: HTMLElement;
    #field;
    #mounted = false;
    #silent = false;
    #writing = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, cssUrl);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#hintEl = shadow.querySelector<HTMLElement>('.hint')!;
      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#clearBtn = shadow.querySelector<HTMLElement>('.clear')!;

      if ('attachInternals' in this) {
        try { this.#internals = this.attachInternals(); } catch { /* noop */ }
      }

      this.#field = new SectionField({
        container: shadow.querySelector<HTMLElement>('.sections'),
        kind,
        locale: this.locale,
        ampm: this.ampm,
        seconds: this.seconds,
        onChange: (value) => this.#onEdit(value),
      });

      this.#clearBtn.addEventListener('click', () => {
        this.#field.clear();
        this.#field.focusFirst();
      });
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#syncMeta();
      this.#field.configure({ locale: this.locale, ampm: this.ampm, seconds: this.seconds });
      this.#silent = true;
      this.#field.value = this.getAttribute('value') || '';
      this.#silent = false;
      this.#syncDisabled();
      this.#syncClear();
      this.#setFormValue();
      this.#updateValidity();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') {
        // Al editar, el atributo lo escribimos nosotros: reinyectarlo borraría
        // las secciones a medias (día y mes puestos, año vacío).
        if (!this.#writing && (newVal || '') !== this.#field.value) {
          this.#silent = true;
          this.#field.value = newVal || '';
          this.#silent = false;
        }
        this.#syncClear();
        this.#setFormValue();
        this.#updateValidity();
        return;
      }
      if (name === 'locale' || name === 'ampm' || name === 'hour24' || name === 'seconds') {
        this.#field.configure({ locale: this.locale, ampm: this.ampm, seconds: this.seconds });
        return;
      }
      if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
        return;
      }
      if (name === 'required' || name === 'min' || name === 'max') {
        this.#updateValidity();
        return;
      }
      if (name === 'clearable') {
        this.#syncClear();
        return;
      }
      this.#syncMeta();
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v: string) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get kind() { return kind; }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { v ? this.setAttribute('name', v) : this.removeAttribute('name'); }

    get min() { return this.getAttribute('min') ?? ''; }
    set min(v) { v ? this.setAttribute('min', v) : this.removeAttribute('min'); }

    get max() { return this.getAttribute('max') ?? ''; }
    set max(v) { v ? this.setAttribute('max', v) : this.removeAttribute('max'); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get clearable() { return this.hasAttribute('clearable'); }
    set clearable(v) { this.toggleAttribute('clearable', !!v); }

    get locale() { return resolveLocale(this.getAttribute('locale')); }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    /** 12 horas: lo decide el locale salvo que `ampm`/`hour24` lo fuercen. */
    get ampm() {
      if (kind === 'date') return false;
      if (this.hasAttribute('hour24')) return false;
      if (this.hasAttribute('ampm')) return this.getAttribute('ampm') !== 'false';
      return uses12Hour(this.locale);
    }
    set ampm(v) { this.toggleAttribute('ampm', !!v); }

    get seconds() { return kind !== 'date' && this.hasAttribute('seconds'); }
    set seconds(v) { this.toggleAttribute('seconds', !!v); }

    /** ¿Hay algo escrito a medias? (aa/mm sin año, por ejemplo) */
    get incomplete() { return this.#field.incomplete; }

    focus(opts) {
      this.#field.focusFirst(opts);
    }

    clear() {
      this.#field.clear();
    }

    formResetCallback() {
      const initial = this.getAttribute('value') || '';
      this.#silent = true;
      this.#field.value = initial;
      this.#silent = false;
      this.#syncClear();
      this.#setFormValue();
      this.#updateValidity();
    }

    formDisabledCallback(disabled) { this.#syncDisabled(disabled); }

    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (!this.#internals) return;
      this.#internals.setValidity(msg ? { customError: true } : {}, msg || '', this.#base);
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    #setState(name, on) {
      const s = this.#internals?.states;
      if (!s) return;
      if (on) s.add(name);
      else s.delete(name);
    }

    #onEdit(value) {
      this.#writing = true;
      if (value) this.setAttribute('value', value);
      else this.removeAttribute('value');
      this.#writing = false;
      this.#syncClear();
      this.#setFormValue();
      this.#updateValidity();
      if (this.#silent) return;
      emit(this, 'is-input', { value });
      emit(this, 'is-change', { value });
    }

    #syncMeta() {
      const label = this.getAttribute('label');
      this.#labelEl.hidden = !label;
      this.#labelEl.textContent = label || '';
      const hint = this.getAttribute('hint');
      this.#hintEl.hidden = !hint;
      this.#hintEl.textContent = hint || '';
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      this.#setState('disabled', disabled);
      this.#base.toggleAttribute('data-disabled', disabled);
      this.#base.toggleAttribute('data-readonly', this.readonly);
      for (const sec of this.shadowRoot!.querySelectorAll<HTMLElement>('.sec')) {
        sec.tabIndex = disabled ? -1 : 0;
        sec.setAttribute('aria-disabled', String(disabled));
        sec.setAttribute('aria-readonly', String(this.readonly));
      }
    }

    #syncClear() {
      this.#clearBtn.hidden = !this.clearable || this.disabled || this.readonly || !this.value;
    }

    #setFormValue() {
      this.#internals?.setFormValue(this.value || null);
    }

    /** El valor es una cadena ordenable, así que min/max se comparan directo. */
    #updateValidity() {
      if (!this.#internals) return;
      const value = this.value;
      const invalidFlag = this.hasAttribute('invalid');
      if (this.required && !value) {
        this.#fail({ valueMissing: true }, 'Complete la fecha');
        return;
      }
      if (this.#field.incomplete) {
        this.#fail({ badInput: true }, 'Fecha incompleta');
        return;
      }
      const { date } = splitDateTime(value);
      const min = this.min;
      const max = this.max;
      if (value && min && this.#compare(value, min, date) < 0) {
        this.#fail({ rangeUnderflow: true }, `No puede ser antes de ${min}`);
        return;
      }
      if (value && max && this.#compare(value, max, date) > 0) {
        this.#fail({ rangeOverflow: true }, `No puede ser después de ${max}`);
        return;
      }
      if (invalidFlag) {
        this.#fail({ customError: true }, this.getAttribute('invalid') || 'Valor inválido');
        return;
      }
      this.#internals.setValidity({});
      this.#setState('invalid', false);
      this.#base.removeAttribute('data-invalid');
    }

    /** Compara valor y límite en la misma granularidad. */
    #compare(value, limit, datePart) {
      if (kind === 'datetime' && !limit.includes('T')) return datePart.localeCompare(limit);
      return value.localeCompare(limit);
    }

    #fail(flags, message) {
      this.#internals.setValidity(flags, message, this.#base);
      this.#setState('invalid', true);
      this.#base.setAttribute('data-invalid', '');
    }
  }

  defineElement(tag, IsDateFieldBase, true);
  return IsDateFieldBase;
}
