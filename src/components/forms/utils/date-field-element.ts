import { SectionField } from './date-field-core.js';
import { splitDateTime, uses12Hour } from './date-utils.js';
import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import type { Validez } from '@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js';
import { registrarTerminos, resolverLocale, termino } from '@jeff-aporta/iswc-base/core/localize.js';
import type { DateFieldKind, DefineDateFieldOpts } from "@jeff-aporta/iswc-base/components/forms/schemas/date-field-element.schemas.js";
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';

/**
 * Fábrica de los campos por secciones: iswc-date-field, iswc-time-field e
 * iswc-date-time-field solo cambian en el `kind`, así que comparten motor,
 * hoja de estilos y asociación con el formulario.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="form-control" class="form-control">
    <label part="label" class="label" hidden></label>
    <div part="base" class="base">
      <slot name="start"></slot>
      <div part="sections" class="sections" role="group"></div>
      <iswc-button
        type="button"
        part="clear"
        class="clear"
        variant="text"
        color="neutral"
        tabindex="-1"
        hidden
      >
        <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
      </iswc-button>
      <slot name="end"></slot>
    </div>
    <div part="hint" class="hint" hidden></div>
  </div>
`;

// min, max y clearable los declara su `@prop`; name, required, disabled y readonly (y label y hint, que aquí se leen
// del atributo), `IswcFormControl`.
registrarTerminos('es', { borrar: 'Borrar' });

const OBSERVED = ['label', 'hint', 'value', 'locale', 'ampm', 'hour24', 'seconds', 'invalid'];

/** Tipo de campo por secciones: solo fecha, hora o ambas. */

/** Opciones de `defineDateField`. */

export function defineDateField({ tag, kind, css }: DefineDateFieldOpts): typeof HTMLElement {
  class IswcDateFieldBase extends IswcFormControl {
    static tag = tag;
    static css = css;
    static deps = ['iswc-button', 'iswc-icon'];
    static shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
    static observed = OBSERVED;

    #labelEl!: HTMLElement;
    #hintEl!: HTMLElement;
    #base!: HTMLElement;
    #clearBtn!: HTMLElement;
    #field!: SectionField;
    #mounted = false;
    #silent = false;
    #writing = false;
    /** La última validación falló por una regla propia (no por `setCustomValidity`). */
    #reglaFallida = false;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#hintEl = shadow.querySelector<HTMLElement>('.hint')!;
      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#clearBtn = shadow.querySelector<HTMLElement>('.clear')!;

      this.#field = new SectionField({
        container: shadow.querySelector<HTMLElement>('.sections')!,
        kind,
        locale: this.locale,
        ampm: this.ampm,
        seconds: this.seconds,
        onChange: (value: string) => this.#onEdit(value),
      });

      this.#clearBtn.addEventListener('click', () => {
        this.#field.clear();
        this.#field.focusFirst();
      });
    }

    connectedCallback(): void {
      // El ciclo de la base primero: recupera propiedades escritas antes del upgrade, refleja los `@prop` y pinta.
      super.connectedCallback();
      this.#mounted = true;
      this.#clearBtn.setAttribute('aria-label', termino(this.locale, 'borrar'));
      this.#syncMeta();
      this.#field.configure({ locale: this.locale, ampm: this.ampm, seconds: this.seconds });
      this.#silent = true;
      this.#field.value = this.getAttribute('value') || '';
      this.#silent = false;
      this.#syncDisabled();
      this.#syncClear();
      this.sincronizarFormulario();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      // La base convierte el atributo en su `@prop` (name, disabled, required, min, max…) antes de reaccionar aquí.
      super.attributeChangedCallback(name, oldVal, newVal);
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
        this.sincronizarFormulario();
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
        this.sincronizarFormulario();
        return;
      }
      if (name === 'clearable') {
        this.#syncClear();
        return;
      }
      this.#syncMeta();
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value(): string { return this.getAttribute('value') ?? ''; }
    set value(v: string) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get kind(): DateFieldKind { return kind; }

    @prop() accessor min: string = '';

    @prop() accessor max: string = '';

    @prop({ type: 'bool' }) accessor clearable: boolean = false;

    override get locale(): string { return resolverLocale(this, this.getAttribute('locale')); }
    set locale(v: string) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    /** 12 horas: lo decide el locale salvo que `ampm`/`hour24` lo fuercen. */
    get ampm(): boolean {
      if (kind === 'date') return false;
      if (this.hasAttribute('hour24')) return false;
      if (this.hasAttribute('ampm')) return this.getAttribute('ampm') !== 'false';
      return uses12Hour(this.locale);
    }
    set ampm(v: boolean) { this.toggleAttribute('ampm', !!v); }

    get seconds(): boolean { return kind !== 'date' && this.hasAttribute('seconds'); }
    set seconds(v: boolean) { this.toggleAttribute('seconds', !!v); }

    /** ¿Hay algo escrito a medias? (aa/mm sin año, por ejemplo) */
    get incomplete(): boolean { return this.#field.incomplete; }

    focus(): void {
      this.#field.focusFirst();
    }

    clear(): void {
      this.#field.clear();
    }

    /* ── Formulario (IswcFormControl) ─────────────────────────────────── */

    /** La cadena ordenable (`YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm`) o nada. */
    override valorFormulario(): string | null { return this.value || null; }

    override restablecer(): void {
      const initial = this.getAttribute('value') || '';
      this.#silent = true;
      this.#field.value = initial;
      this.#silent = false;
      this.#syncClear();
    }

    override formDisabledCallback(disabled: boolean): void {
      super.formDisabledCallback(disabled);
      this.#syncDisabled();
    }

    /** `setCustomValidity` primero; después las reglas propias (el valor es ordenable: min/max se comparan directo). */
    override validar(): Validez {
      const base = super.validar();
      this.#reglaFallida = false;
      if (base[0].customError) return base;
      const propia = this.#reglas();
      this.#reglaFallida = !!propia;
      return propia ?? [{}, ''];
    }

    override actualizarValidez(): void {
      super.actualizarValidez();
      const fallo = this.#reglaFallida && !this.inhabilitado;
      this.estado('invalid', fallo);
      this.#base.toggleAttribute('data-invalid', fallo);
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    #onEdit(value: string): void {
      this.#writing = true;
      if (value) this.setAttribute('value', value);
      else this.removeAttribute('value');
      this.#writing = false;
      this.#syncClear();
      this.sincronizarFormulario();
      if (this.#silent) return;
      emit(this, 'iswc-input', { value });
      this.interactuado = true;
      emit(this, 'iswc-change', { value });
    }

    #syncMeta(): void {
      const label = this.getAttribute('label');
      this.#labelEl.hidden = !label;
      this.#labelEl.textContent = label || '';
      const hint = this.getAttribute('hint');
      this.#hintEl.hidden = !hint;
      this.#hintEl.textContent = hint || '';
    }

    #syncDisabled(): void {
      const disabled = this.inhabilitado;
      this.estado('disabled', disabled);
      this.#base.toggleAttribute('data-disabled', disabled);
      this.#base.toggleAttribute('data-readonly', this.readonly);
      for (const sec of this.shadowRoot!.querySelectorAll<HTMLElement>('.sec')) {
        sec.tabIndex = disabled ? -1 : 0;
        sec.setAttribute('aria-disabled', String(disabled));
        sec.setAttribute('aria-readonly', String(this.readonly));
      }
    }

    #syncClear(): void {
      this.#clearBtn.hidden = !this.clearable || this.disabled || this.readonly || !this.value;
    }

    /** Reglas propias del campo; `null` = válido. */
    #reglas(): Validez | null {
      const value = this.value;
      if (this.required && !value) return [{ valueMissing: true }, 'Complete la fecha'];
      if (this.#field.incomplete) return [{ badInput: true }, 'Fecha incompleta'];
      const { date } = splitDateTime(value);
      const min = this.min;
      const max = this.max;
      if (value && min && this.#compare(value, min, date) < 0) return [{ rangeUnderflow: true }, `No puede ser antes de ${min}`];
      if (value && max && this.#compare(value, max, date) > 0) return [{ rangeOverflow: true }, `No puede ser después de ${max}`];
      if (this.hasAttribute('invalid')) return [{ customError: true }, this.getAttribute('invalid') || 'Valor inválido'];
      return null;
    }

    /** Compara valor y límite en la misma granularidad. */
    #compare(value: string, limit: string, datePart: string): number {
      if (kind === 'datetime' && !limit.includes('T')) return datePart.localeCompare(limit);
      return value.localeCompare(limit);
    }

  }

  define(IswcDateFieldBase, true);
  return IswcDateFieldBase;
}
