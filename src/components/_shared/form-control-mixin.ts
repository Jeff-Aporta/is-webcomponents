/**
 * form-control-mixin.js — Helper para form-controls del kit.
 *
 * Muchos componentes de formulario (checkbox, input, select, etc.) repiten
 * la misma estructura de chrome:
 *
 *   <div part="form-control" class="form-control">
 *     <slot></slot>           <!-- el control en sí -->
 *     <div part="hint"        class="hint"      [hidden]><slot name="hint"></slot></div>
 *     <div part="error-text"  class="error-text" [hidden]><slot name="error-text"></slot></div>
 *   </div>
 *
 * Y los mismos atributos:
 *
 *   label            string  — texto del label (también slot `label`).
 *   hint             string  — texto del hint (también slot `hint`).
 *   error-text       string  — texto del error (también slot `error-text`).
 *   disabled, readonly, required   — boolean.
 *
 * Y los mismos aria-* reflejados.
 *
 * Este módulo provee:
 *
 *   - Una función `formControlTemplate()` que devuelve el HTML del wrapper.
 *   - Una clase `FormControlMixin` que añade properties/attributes y
 *     maneja la lógica de visibility (hide cuando vacío).
 *   - Helpers para sincronizar aria-describedby / aria-invalid.
 *
 * La subclase sólo decide:
 *   1. Cuál es el "control" (la pieza interactiva: input, checkbox, etc.).
 *   2. Cómo se inserta en el slot default.
 *   3. Qué hacer con la validación (específico de cada componente).
 *
 * Aún así, **no obliga** a usar todo. Las subclases pueden usar sólo
 * `formControlTemplate()` y `FormControlMixin` por separado.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="form-control" class="form-control">
    <slot></slot>
    <div part="hint" class="hint" id="fc-hint" hidden>
      <slot name="hint"></slot>
    </div>
    <div part="error-text" class="error-text" id="fc-error" hidden>
      <slot name="error-text"></slot>
    </div>
  </div>
`;

/**
 * Devuelve el HTML estandarizado para el wrapper de form-control.
 * Llamarlo en el constructor de la subclase para componer el template.
 *
 *   const TEMPLATE = document.createElement('template');
 *   TEMPLATE.innerHTML = `
 *     <label part="label">${formControlTemplate()}</label>
 *     <!-- ... -->
 *   `;
 *
 * Uso típico sólo inline (sin etiqueta):
 *
 *   const TEMPLATE = document.createElement('template');
 *   TEMPLATE.innerHTML = formControlTemplate();
 */
export function formControlTemplate() {
  return /* html */ `
    <div part="form-control" class="form-control">
      <slot></slot>
      <div part="hint" class="hint" id="fc-hint" hidden>
        <slot name="hint"></slot>
      </div>
      <div part="error-text" class="error-text" id="fc-error" hidden>
        <slot name="error-text"></slot>
      </div>
    </div>
  `;
}

/** Devuelve el TEMPLATE pre-construido, listo para clonar. */
export function getFormControlTemplate() {
  return TEMPLATE;
}

/**
 * Helpers para strings consistentes. Las subclases pueden usar
 * estos para evitar repetir el getter/setter en cada componente.
 */
export const FORM_CONTROL_PROPS = [
  'label', 'hint', 'errorText',
  'disabled', 'readonly', 'required',
];

const VALID_PLACEMENTS = ['start', 'end', 'top', 'bottom'];

/**
 * Mixin que dota a una clase de las properties/attributes típicos de un
 * form-control. La subclase llama a `super()` primero y luego usa
 * `#initFormControl()` desde su constructor y `onConnected()`.
 *
 *   class IsInput extends MixinFormControl(HTMLElement) {
 *     constructor() {
 *       super();
 *       this.initShadow();
 *       this.#initFormControl();
 *     }
 *   }
 *
 * Requiere que el shadow DOM del componente tenga un `<div id="fc-hint">`
 * y un `<div id="fc-error">` (los provee `formControlTemplate()`).
 */
export const MixinFormControl = (Base) => class extends Base {
  // ── Properties ──
  get label() { return this.getAttribute('label') ?? ''; }
  set label(v) {
    if (v == null || v === '') this.removeAttribute('label');
    else this.setAttribute('label', v);
  }

  get hint() { return this.getAttribute('hint') ?? ''; }
  set hint(v) {
    if (v == null) this.removeAttribute('hint');
    else this.setAttribute('hint', v);
  }

  get errorText() { return this.getAttribute('error-text') ?? ''; }
  set errorText(v) {
    if (v == null) this.removeAttribute('error-text');
    else this.setAttribute('error-text', v);
  }

  get error() { return this.hasAttribute('error') || this.hasAttribute('error-text'); }
  set error(v) {
    this.toggleAttribute('error', !!v);
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  get readonly() { return this.hasAttribute('readonly'); }
  set readonly(v) { this.toggleAttribute('readonly', !!v); }

  get required() { return this.hasAttribute('required'); }
  set required(v) { this.toggleAttribute('required', !!v); }

  get labelPlacement() {
    const v = this.getAttribute('label-placement');
    return VALID_PLACEMENTS.includes(v) ? v : 'top';
  }
  set labelPlacement(v) {
    if (VALID_PLACEMENTS.includes(v)) this.setAttribute('label-placement', v);
  }

  /** Sincroniza la visibilidad de hint y error-text según
   *  contenido slotted o atributo. Llamar en onConnected y en
   *  attributeChangedCallback cuando 'hint' o 'error-text' cambien. */
  syncFormControl() {
    const hintEl = this.shadowRoot?.getElementById('fc-hint');
    const errEl = this.shadowRoot?.getElementById('fc-error');
    if (hintEl) {
      const hintSlot = hintEl.querySelector<HTMLSlotElement>('slot');
      const hasContent = this.hint.trim() ||
        (hintSlot?.assignedNodes({ flatten: true }).some(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
        ));
      hintEl.hidden = !hasContent;
    }
    if (errEl) {
      const errSlot = errEl.querySelector<HTMLSlotElement>('slot');
      const hasContent = this.errorText.trim() || this.error ||
        (errSlot?.assignedNodes({ flatten: true }).some(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
        ));
      errEl.hidden = !hasContent;
    }

    // aria-describedby
    const ids = [];
    if (hintEl && !hintEl.hidden) ids.push('fc-hint');
    if (errEl && !errEl.hidden) ids.push('fc-error');
    if (ids.length) this.setAttribute('aria-describedby', ids.join(' '));
    else this.removeAttribute('aria-describedby');

    if (this.error) this.setAttribute('aria-invalid', 'true');
    else this.removeAttribute('aria-invalid');

    if (this.required) this.setAttribute('aria-required', 'true');
    else this.removeAttribute('aria-required');

    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }
};
