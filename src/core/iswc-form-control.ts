/**
 * iswc-form-control.ts — Base de los controles de formulario del kit (F8): validez, estados y chrome común.
 * Mismo contrato que el control form-associated de referencia (ver la spec de paridad, F8), sin Lit; absorbe
 * `form-associated` y el antiguo `form-control-mixin`.
 *
 *   class IswcFoo extends IswcFormControl {
 *     static tag = 'iswc-foo';
 *     @prop({ attr: 'value', reflect: false, vacio: true }) accessor value = '';
 *     valorFormulario() { return this.value || null; }      // lo que entra en FormData
 *     restablecer() { this.value = this.defaultValue; }       // formResetCallback
 *     get controlNativo() { return this.shadowRoot!.querySelector('input'); }  // validez nativa reflejada
 *   }
 *
 * Lo que hace el molde: `static formAssociated`, `name`/`disabled`/`required`/`readonly` reflejados, `form`,
 * `validity`, `validationMessage`, `willValidate`; `checkValidity`/`reportValidity`/`setCustomValidity`;
 * `formResetCallback`/`formDisabledCallback`/`formStateRestoreCallback`; evento `iswc-invalid`; y los estados
 * `:state(user-invalid)`/`:state(user-valid)` (solo tras interacción), `required`/`optional`, `disabled` y `readonly`.
 *
 * Valor y validez se sincronizan en el SETTER (lo que lee el consumidor no espera al pintado) y otra vez tras cada
 * pintado, cuando el control nativo ya tiene el valor nuevo.
 */
import { IswcReactive, html, prop, state } from './iswc-reactive.js';
import type { DefProp, Resultado } from './schemas/iswc-reactive.schemas.js';
import type { ControlNativo, Validez, ValorFormulario } from './schemas/iswc-form-control.schemas.js';

/** Banderas de la validez nativa que se copian al host. */
const BANDERAS: readonly (keyof ValidityStateFlags)[] = [
  'badInput', 'patternMismatch', 'rangeOverflow', 'rangeUnderflow', 'stepMismatch', 'tooLong', 'tooShort', 'typeMismatch', 'valueMissing',
];

export class IswcFormControl extends IswcReactive {
  static formAssociated = true;
  /** Propiedades cuyo cambio resincroniza valor y validez en el setter. */
  static camposFormulario: readonly string[] = ['value', 'checked', 'name', 'disabled', 'required', 'readonly'];

  @prop() accessor name = '';
  @prop({ type: 'bool' }) accessor disabled = false;
  @prop({ type: 'bool' }) accessor required = false;
  @prop({ type: 'bool' }) accessor readonly = false;
  /** Chrome común: etiqueta, ayuda y texto de error (también por slot del mismo nombre). */
  @prop() accessor label = '';
  @prop() accessor hint = '';
  @prop() accessor errorText = '';
  /** Marca de error forzada por el consumidor (sin texto). */
  @prop({ type: 'bool' }) accessor error = false;
  /** El usuario ya interactuó (cambio, salida tras editar, `reportValidity` o `invalid` nativo). */
  @state() accessor interactuado = false;

  #deFormulario = false;
  #mensajePropio = '';
  #comprobando = false;

  constructor() {
    super();
    void this.internals;
    this.addEventListener('invalid', (e) => {
      if (e.target !== this) return;
      if (!this.#comprobando) this.interactuado = true;
      this.emit('iswc-invalid', { message: this.validationMessage });
    });
  }

  /** `true` si está deshabilitado por sí mismo o por un `<fieldset disabled>` / `<form>` ancestro. */
  get inhabilitado(): boolean {
    return this.disabled || this.#deFormulario;
  }

  get form(): HTMLFormElement | null { return this.internals?.form ?? null; }
  get validity(): ValidityState | undefined { return this.internals?.validity; }
  get validationMessage(): string { return this.internals?.validationMessage ?? ''; }
  get willValidate(): boolean { return this.internals?.willValidate ?? false; }

  /** Valor por defecto (el atributo `value`): lo restaura `formResetCallback`. */
  get defaultValue(): string {
    return this.getAttribute('value') ?? '';
  }

  /** Control nativo interno cuya validez se copia (y que ancla la burbuja del navegador). `null` = no hay. */
  get controlNativo(): ControlNativo | null {
    return null;
  }

  /** Lo que el control entrega al `<form>`. La subclase lo define; `null` = no envía nada. */
  valorFormulario(): ValorFormulario {
    return null;
  }

  /** `required` sin valor. La subclase lo afina (p. ej. checkbox: sin marcar). */
  estaVacio(): boolean {
    const v = this.valorFormulario();
    return v == null || v === '';
  }

  /** Validez propia: `required` + la validez del control nativo. La subclase añade sus reglas. */
  validar(): Validez {
    if (this.#mensajePropio) return [{ customError: true }, this.#mensajePropio];
    if (this.required && this.estaVacio()) return [{ valueMissing: true }, this.t('campoObligatorio')];
    const nativa = this.controlNativo?.validity;
    if (nativa && !nativa.valid && !this.estaVacio()) {
      const flags: ValidityStateFlags = {};
      for (const f of BANDERAS) if (nativa[f]) flags[f] = true;
      if (Object.keys(flags).length) return [flags, this.controlNativo?.validationMessage ?? ''];
    }
    return [{}, ''];
  }

  /** Recalcula la validez y los estados que dependen de ella. */
  actualizarValidez(): void {
    const [flags, mensaje] = this.inhabilitado ? [{}, ''] as Validez : this.validar();
    const ancla = this.controlNativo ?? undefined;
    try {
      if (Object.keys(flags).length) this.internals?.setValidity(flags, mensaje, ancla);
      else this.internals?.setValidity({});
    } catch {
      // Ancla fuera del shadow o motor sin validación: queda la validez anterior.
    }
    const valido = this.internals?.validity?.valid ?? true;
    this.estado('user-invalid', this.interactuado && !valido);
    this.estado('user-valid', this.interactuado && valido);
    this.estado('required', this.required);
    this.estado('optional', !this.required);
    this.estado('disabled', this.inhabilitado);
    this.estado('readonly', this.readonly);
    // aria-invalid solo tras interacción (como `user-invalid`): un campo vacío recién pintado no se anuncia como error.
    const nativo = this.controlNativo;
    if (nativo) {
      if (this.interactuado && !valido) nativo.setAttribute('aria-invalid', 'true');
      else nativo.removeAttribute('aria-invalid');
      if (this.required) nativo.setAttribute('aria-required', 'true');
      else nativo.removeAttribute('aria-required');
    }
  }

  /* ─────────────── chrome común (absorbe el de form-control-mixin) ─────────────── */

  /** Etiqueta: `part="label"`, slot `label` con el atributo como respaldo. `para` = id del control nativo. */
  chromeEtiqueta(para = 'input'): Resultado {
    return html`<label part="label" class="label" id="label" for=${para} ?hidden=${!this.label && !this.querySelector(':scope > [slot="label"]')}><slot name="label">${this.label}</slot></label>`;
  }

  /** Ayuda y error bajo el control: `part="support"`, `hint`, `error-text` y, con `extra`, `count`. */
  chromeAyuda(extra = ''): Resultado {
    const error = this.error || !!this.errorText;
    return html`<div part="support" class="support">
      <div part="hint" class="hint" id="hint" ?hidden=${error || (!this.hint && !this.querySelector(':scope > [slot="hint"]'))}><slot name="hint">${this.hint}</slot></div>
      <div part="error-text" class="error-text" id="error-text" role="alert" ?hidden=${!this.errorText}><slot name="error-text">${this.errorText}</slot></div>
      ${extra ? html`<span part="count" class="count">${extra}</span>` : null}
    </div>`;
  }

  /** Entrega el valor al `<form>` y revalida. Se llama desde los setters y tras cada pintado. */
  sincronizarFormulario(): void {
    try {
      this.internals?.setFormValue(this.valorFormulario());
    } catch {
      // Motor sin form-associated: no hay nada que entregar.
    }
    this.actualizarValidez();
  }

  override escribirProp(d: DefProp, v: unknown, desdeSetter: boolean): void {
    super.escribirProp(d, v, desdeSetter);
    const campos = (this.constructor as typeof IswcFormControl).camposFormulario;
    // Solo con el elemento ya montado: durante la construcción los campos privados de la subclase aún no existen.
    if (this.mounted && (campos.includes(d.prop) || d.prop === 'interactuado')) this.sincronizarFormulario();
  }

  override actualizado(): void {
    this.sincronizarFormulario();
  }

  /** Como el nativo: comprueba sin contar como interacción (el `invalid` que dispara no marca `user-invalid`). */
  checkValidity(): boolean {
    this.actualizarValidez();
    this.#comprobando = true;
    try {
      return this.internals?.checkValidity() ?? true;
    } finally {
      this.#comprobando = false;
    }
  }

  reportValidity(): boolean {
    this.interactuado = true;
    this.actualizarValidez();
    return this.internals?.reportValidity() ?? true;
  }

  setCustomValidity(mensaje: string): void {
    this.#mensajePropio = mensaje ?? '';
    this.actualizarValidez();
  }

  /** Lo que hace `formResetCallback` además de olvidar la interacción. La subclase restaura su valor. */
  restablecer(): void {}

  formResetCallback(): void {
    this.interactuado = false;
    this.restablecer();
    this.sincronizarFormulario();
  }

  formDisabledCallback(deshabilitado: boolean): void {
    this.#deFormulario = deshabilitado;
    this.sincronizarFormulario();
    this.solicitarRender('disabled', this.disabled);
  }

  formStateRestoreCallback(estado: string | File | FormData | null): void {
    const host = this as unknown as { value?: unknown };
    if (typeof estado === 'string' && 'value' in host) host.value = estado;
  }

  /** Cambio hecho por el usuario: marca la interacción (solo en `change`) y emite `iswc-input` / `iswc-change`. */
  cambioDelUsuario<T>(tipo: 'input' | 'change', detalle: T): void {
    if (tipo === 'change') this.interactuado = true;
    this.emit(`iswc-${tipo}`, detalle);
  }
}
