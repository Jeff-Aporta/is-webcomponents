// @contexto INDICE.md · src/components/forms/input.md
import { emit, upgradeProperties, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormChrome } from '@jeff-aporta/iswc-base/core/iswc-form-chrome.js';
import { isOtpAutocomplete, listenWebOtp } from './utils/input-tokens.js';
import { hasSlotted } from '@jeff-aporta/iswc-base/core/dom.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import { html } from '@jeff-aporta/iswc-base/core/plantilla.js';
import type { Resultado } from '@jeff-aporta/iswc-base/core/schemas/plantilla.schemas.js';
import css from 'iswc:css';
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import type { InputEventos } from './schemas/input.schemas.js';
/**
 * <iswc-input> — Campo de texto form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   type            text | email | password | number | search | tel | url | date  (default text)
 *   name, value, placeholder, label, hint, autocomplete
 *   variant      outlined (default) | filled | underlined
 *   label-placement top (default) | start | float
 *                   `float` = etiqueta flotante (paridad con ISP `form/Input.svelte`):
 *                   la etiqueta descansa sobre el campo y sube al enfocar o al
 *                   tener valor. Colorea el borde con --iswc-b-required /
 *                   --iswc-b-optional / --iswc-b-readonly / --iswc-bg-readonly.
 *   data-typing-delay  número (ms, default 600) — debounce del evento
 *                   `iswc-typing-end`. `0` lo emite en el siguiente tick.
 *   error-text      mensaje mostrado en lugar del hint cuando hay error
 *   prefix, suffix  adornos de texto corto ("$", "kg") sin usar slot
 *   min, max, step, maxlength     (pasan al input nativo interno)
 *   disabled, required, readonly, clearable, password-toggle,
 *   error, show-count, full-width                              (boolean)
 *
 * Slots: label, hint, start, end
 * Parts: form-control, label, base, start, prefix, input, clear, toggle, suffix, end,
 *        support, hint, error-text, count
 * Custom states: blank, disabled, readonly, focused, invalid, password-visible
 * Eventos: iswc-input, iswc-change, iswc-typing-end, iswc-enter (bubbles + composed) y los
 *          nativos input/change
 * Tokens: --iswc-field-width, --iswc-field-label-width, --iswc-input-*
 *
 * La vista la pinta el molde (F8): `render()` con el `html` de `core/plantilla.ts`. El shadow se
 * pinta al conectar (antes de `onConnected`), asi que el DOM del campo no existe antes.
 */

(() => {
  registrarTerminos('es', { mostrarContrasena: 'Mostrar contraseña', ocultarContrasena: 'Ocultar contraseña' });

  const TYPES = ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'date'];
  const APPEARANCES = ['outlined', 'filled', 'underlined'];
  const PLACEMENTS = ['top', 'start', 'float'];

  /** Debounce por defecto del evento `iswc-typing-end` (ms) — mismo valor que ISP. */
  const DEFAULT_TYPING_DELAY = 600;

  // Los demás atributos los declara cada `@prop` (y name, disabled, required y readonly, `IswcFormControl`; label, hint,
  // error-text y error, `IswcFormChrome`).
  const OBSERVED = ['type', 'value'];

  const EXTRA_UPGRADE_ATTRS = ['variant', 'label-placement', 'full-width'];
  const EXTRA_UPGRADE_PROPS = ['typingDelay', 'prefixText', 'suffixText'];

  const NATIVE_ATTRS = ['placeholder', 'min', 'max', 'step', 'maxlength', 'autocomplete', 'name'];

  class IswcInput extends IswcFormChrome {
    static override tag = 'iswc-input';
    declare static events: InputEventos;
    static override css = css;
    static override shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
    static override deps = ['iswc-icon'];

    static override observed = [...OBSERVED, 'radius', 'border-color', 'bg', 'text-color', 'focus-color', 'danger-color'];

    #input: HTMLInputElement | null = null;
    #clearBtn: HTMLElement | null = null;
    #toggleBtn: HTMLElement | null = null;
    #labelSlot: HTMLSlotElement | null = null;
    #hintSlot: HTMLSlotElement | null = null;
    #startSlot: HTMLSlotElement | null = null;
    #endSlot: HTMLSlotElement | null = null;
    #anclado = false;
    #value = '';
    #passwordVisible = false;
    #etiquetaSloteada = false;
    #ayudaSloteada = false;
    #inicioSloteado = false;
    #finSloteado = false;
    #typingTimer: ReturnType<typeof setTimeout> | null = null;
    #otpAbort: AbortController | null = null;

    // ---- vista ----------------------------------------------------------

    /**
     * Lo que ve el usuario. El molde la pinta y solo toca lo que cambia; el valor del campo lo
     * lleva el `<input>` nativo (ahi escribe el usuario, no la plantilla).
     */
    override render(): Resultado | null {
      const c = this.estadoChrome();
      const conEtiqueta = !!c.etiqueta || this.#etiquetaSloteada;
      const conAyuda = !!c.ayuda || this.#ayudaSloteada;
      const conError = !!c.error;
      const valor = this.#value;
      const max = this.maxlength;
      const interactivo = !this.inhabilitado && !this.readonly;
      const contador = this.showCount ? (max ? `${valor.length}/${max}` : String(valor.length)) : '';
      return html`
        <div part="form-control" class="form-control">
          <label part="label" class="label" id="label" for="input" ?hidden=${!conEtiqueta}>
            <slot name="label" @slotchange=${this.#onSlotChange}>${c.etiqueta}</slot>
          </label>
          <div part="base" class="base">
            <span part="start" class="adorn" id="start" ?hidden=${!this.prefixText && !this.#inicioSloteado}>
              <span part="prefix" class="adorn-text" id="prefix" ?hidden=${!this.prefixText}>${this.prefixText}</span>
              <slot name="start" @slotchange=${this.#onSlotChange}></slot>
            </span>
            <input
              part="input"
              class="input"
              id="input"
              type="text"
              aria-describedby="hint error-text"
              @input=${this.#onInput}
              @change=${this.#onChange}
              @keydown=${this.#onKeydown}
              @focus=${this.#onFocus}
              @blur=${this.#onBlur}
            />
            <iswc-button
              part="clear"
              class="icon-btn"
              id="clear"
              type="button"
              variant="text"
              color="text"
              tabindex="-1"
              ?hidden=${!(this.clearable && valor !== '' && interactivo)}
              @click=${this.#onClear}
            >
              <iswc-icon icon="mdi:close-circle" aria-hidden="true"></iswc-icon>
            </iswc-button>
            <iswc-check-icon-button
              part="toggle"
              class="icon-btn"
              id="toggle"
              icon="mdi:eye-outline"
              checked-icon="mdi:eye-off-outline"
              tabindex="-1"
              ?hidden=${!(this.type === 'password' && this.passwordToggle && !this.disabled)}
              @iswc-change=${this.#onTogglePassword}
            ></iswc-check-icon-button>
            <span part="end" class="adorn" id="end" ?hidden=${!this.suffixText && !this.#finSloteado}>
              <slot name="end" @slotchange=${this.#onSlotChange}></slot>
              <span part="suffix" class="adorn-text" id="suffix" ?hidden=${!this.suffixText}>${this.suffixText}</span>
            </span>
          </div>
          <div part="support" class="support" id="support" ?hidden=${!(conError || conAyuda || this.showCount)}>
            <div part="hint" class="hint" id="hint" ?hidden=${conError || !conAyuda}>
              <slot name="hint" @slotchange=${this.#onSlotChange}>${c.ayuda}</slot>
            </div>
            <div part="error-text" class="error-text" id="error-text" ?hidden=${!conError}>${c.error}</div>
            <div part="count" class="count" id="count" ?hidden=${!this.showCount}>${contador}</div>
          </div>
        </div>
      `;
    }

    /** Tras cada pintado: toma los nodos de la vista y deja los botones con su texto. */
    override actualizado(): void {
      super.actualizado();
      this.#anclar();
      this.#leerRanuras();
      this.#clearBtn?.setAttribute('aria-label', this.t('limpiar'));
      this.#toggleBtn?.setAttribute('label', this.t('mostrarContrasena'));
      this.#toggleBtn?.setAttribute('checked-label', this.t('ocultarContrasena'));
      this.estado('invalid', this.estadoChrome().invalido);
    }

    /** Los nodos de la vista ya pintada (la pinta el molde al conectar). */
    #anclar(): void {
      if (this.#anclado) return;
      const shadow = this.shadowRoot!;
      this.#input = shadow.getElementById('input') as HTMLInputElement;
      this.#clearBtn = shadow.getElementById('clear');
      this.#toggleBtn = shadow.getElementById('toggle');
      this.#labelSlot = shadow.querySelector<HTMLSlotElement>('slot[name="label"]');
      this.#hintSlot = shadow.querySelector<HTMLSlotElement>('slot[name="hint"]');
      this.#startSlot = shadow.querySelector<HTMLSlotElement>('slot[name="start"]');
      this.#endSlot = shadow.querySelector<HTMLSlotElement>('slot[name="end"]');
      this.#anclado = true;
    }

    /** Que hay en las ranuras (la etiqueta y la ayuda pueden venir del slot y no del atributo). */
    #leerRanuras(): void {
      this.#etiquetaSloteada = hasSlotted(this.#labelSlot);
      this.#ayudaSloteada = hasSlotted(this.#hintSlot);
      this.#inicioSloteado = hasSlotted(this.#startSlot);
      this.#finSloteado = hasSlotted(this.#endSlot);
    }

    /** Cambio en una ranura: al repintar puede cambiar lo que se ve (la etiqueta, la ayuda). */
    #onSlotChange = (): void => {
      this.#leerRanuras();
      this.solicitarRender();
    };

    override onConnected(): void {
      upgradeProperties(this, EXTRA_UPGRADE_ATTRS);
      const self = this as unknown as Record<string, unknown>;
      for (const p of EXTRA_UPGRADE_PROPS) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = self[p];
          delete self[p];
          if (v != null) self[p] = v;
        }
      }
      this.#value = this.getAttribute('value') ?? '';
      this.#syncNative();
      this.#syncDisabled();
      this.#update();
      this.#listenOtp();
    }

    override onDisconnected(): void {
      // El debounce de `iswc-typing-end` no debe sobrevivir al desmontaje.
      if (this.#typingTimer != null) {
        clearTimeout(this.#typingTimer);
        this.#typingTimer = null;
      }
      this.#otpAbort?.abort();
      this.#otpAbort = null;
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'value') {
        this.#value = newVal ?? '';
        this.#syncNative();
        this.#update();
      } else if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
        this.#update();
      } else if (name === 'label' || name === 'hint' || name === 'prefix' || name === 'suffix') {
        this.solicitarRender();
      } else if (name === 'error' || name === 'error-text' || name === 'show-count') {
        this.solicitarRender();
      } else if (name === 'autocomplete') {
        this.#syncNative();
        this.#listenOtp();
      } else {
        this.#syncNative();
        this.#update();
      }
    }

    #listenOtp(): void {
      this.#otpAbort?.abort();
      this.#otpAbort = null;
      const ac = String(this.getAttribute('autocomplete') || '');
      if (!isOtpAutocomplete(ac)) return;
      const ctrl = new AbortController();
      this.#otpAbort = ctrl;
      listenWebOtp(ctrl.signal, (code) => {
        this.value = code;
        emit(this, 'iswc-otp', { code });
      });
    }

    // ---- propiedades ----------------------------------------------------

    get value() { return this.#value; }
    set value(v) {
      const next = v == null ? '' : String(v);
      if (next === this.#value) return;
      this.#value = next;
      if (this.#input && this.#input.value !== next) this.#input.value = next;
      this.#update();
    }

    get type() {
      const t = (this.getAttribute('type') || 'text').toLowerCase();
      return TYPES.includes(t) ? t : 'text';
    }
    set type(v) { this.setAttribute('type', String(v)); }

    get variant() {
      const a = (this.getAttribute('variant') || '').toLowerCase();
      return APPEARANCES.includes(a) ? a : 'outlined';
    }
    set variant(v) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (APPEARANCES.includes(String(v))) this.setAttribute('variant', String(v));
    }

    get labelPlacement() {
      const p = (this.getAttribute('label-placement') || '').toLowerCase();
      return PLACEMENTS.includes(p) ? p : 'top';
    }
    set labelPlacement(v) {
      if (v == null || v === '') this.removeAttribute('label-placement');
      else if (PLACEMENTS.includes(String(v))) this.setAttribute('label-placement', String(v));
    }

    /**
     * Debounce (ms) del evento `iswc-typing-end`. Config declarativa por `data-*`
     * según la convención del repo: `data-typing-delay="300"`.
     */
    get typingDelay(): number {
      const raw = this.dataset.typingDelay;
      if (raw == null || raw === '') return DEFAULT_TYPING_DELAY;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TYPING_DELAY;
    }
    set typingDelay(v: number | string | null) {
      if (v == null || v === '') delete this.dataset.typingDelay;
      else this.dataset.typingDelay = String(v);
    }

    @prop({ type: 'bool' }) accessor clearable: boolean = false;

    @prop({ type: 'bool' }) accessor passwordToggle: boolean = false;

    @prop({ vacio: true }) override accessor errorText: string = '';

    @prop({ type: 'bool' }) accessor showCount: boolean = false;

    @prop({ type: 'bool' }) accessor fullWidth: boolean = false;

    /** `prefix` ya existe en Element (namespace XML): la propiedad se llama prefixText. */
    @prop({ attr: 'prefix', vacio: true }) accessor prefixText: string = '';

    @prop({ attr: 'suffix', vacio: true }) accessor suffixText: string = '';

    @prop({ vacio: true }) override accessor placeholder: string = '';

    @prop({ vacio: true }) override accessor label: string = '';

    @prop({ vacio: true }) override accessor hint: string = '';

    @prop({ vacio: true }) override accessor min: string | null = null;

    @prop({ vacio: true }) override accessor max: string | null = null;

    @prop({ vacio: true }) override accessor step: string | null = null;

    @prop({ vacio: true }) override accessor maxlength: string | null = null;

    @prop({ vacio: true }) override accessor autocomplete: string | null = null;

    /** Input nativo interno — útil para casos avanzados. */
    get input(): HTMLInputElement { return this.#input as HTMLInputElement; }

    // ---- API pública -----------------------------------------------------

    override focus(options?: FocusOptions): void { this.#input?.focus(options); }
    override blur(): void { this.#input?.blur(); }
    select(): void { this.#input?.select?.(); }
    setSelectionRange(...args: Parameters<HTMLInputElement['setSelectionRange']>): void {
      this.#input?.setSelectionRange?.(...args);
    }

    override reportValidity(): boolean {
      const ok = super.reportValidity();
      this.solicitarRender();
      return ok;
    }
    override setCustomValidity(msg: string): void {
      super.setCustomValidity(msg);
      this.solicitarRender();
    }

    // ---- formulario (IswcFormControl) -----------------------------------

    /** Vacío no entra en FormData. Validez: `required` + la del <input> nativo (type, min/max, step…). */
    override valorFormulario(): string | null { return this.#value || null; }

    override get controlNativo(): HTMLInputElement | null { return this.#input; }

    /** Restaura el atributo `value` (`defaultValue`): lo llama `formResetCallback`. */
    override restablecer(): void {
      this.#value = this.defaultValue;
      if (this.#input) this.#input.value = this.#value;
      this.#update();
    }

    override formDisabledCallback(disabled: boolean): void {
      super.formDisabledCallback(disabled);
      this.#syncDisabled();
      this.#update();
    }

    // ---- privados --------------------------------------------------------

    #syncNative() {
      const input = this.#input;
      if (!input) return;
      const type = this.type;
      const effective = type === 'password' && this.#passwordVisible ? 'text' : type;
      if (input.getAttribute('type') !== effective) input.setAttribute('type', effective);
      for (const a of NATIVE_ATTRS) {
        const v = this.getAttribute(a);
        if (v == null) input.removeAttribute(a);
        else input.setAttribute(a, v);
      }
      if (input.value !== this.#value) input.value = this.#value;
    }

    #syncDisabled(): void {
      const disabled = this.inhabilitado;
      const readonly = this.readonly;
      if (this.#input) {
        this.#input.disabled = disabled;
        this.#input.readOnly = readonly;
      }
      this.#clearBtn?.toggleAttribute('disabled', disabled);
      this.#toggleBtn?.toggleAttribute('disabled', disabled);
      this.estado('disabled', disabled);
      this.estado('readonly', readonly);
    }

    /**
     * `iswc-button` (limpiar) e `iswc-check-icon-button` (ver contraseña) son opcionales: se piden solo si el campo los
     * usa (al loader si está, si no por `import()`), así el cierre del campo no los arrastra (tope en navegador/carga).
     */
    #piezas(): void {
      const pedir = (tag: string, cargar: () => Promise<unknown>) => {
        if (customElements.get(tag)) return;
        const loader = (globalThis as { iswcLoader?: { ensure?(t: string): Promise<unknown> | undefined } }).iswcLoader;
        (loader?.ensure?.(tag) ?? cargar()).catch?.(() => false);
      };
      if (this.clearable) pedir('iswc-button', () => import('@jeff-aporta/iswc-base/components/actions/button.js'));
      if (this.passwordToggle) pedir('iswc-check-icon-button', () => import('@jeff-aporta/iswc-base/components/actions/check-icon-button.js'));
    }

    #update() {
      this.#piezas();
      this.estado('blank', this.#value === '');
      this.sincronizarFormulario();
      this.solicitarRender();
    }

    #onInput = (): void => {
      this.#value = this.#input ? this.#input.value : this.#value;
      this.#update();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      emit(this, 'iswc-input', { value: this.#value });
      this.#scheduleTypingEnd();
    };

    /** Debounce equivalente al `onTypingEnd` de ISP: un solo timer por elemento. */
    #scheduleTypingEnd(): void {
      if (this.#typingTimer != null) clearTimeout(this.#typingTimer);
      this.#typingTimer = setTimeout(() => {
        this.#typingTimer = null;
        emit(this, 'iswc-typing-end', { value: this.#value });
      }, this.typingDelay);
    }

    #onChange = (): void => {
      this.#value = this.#input ? this.#input.value : this.#value;
      this.interactuado = true;
      this.#update();
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      emit(this, 'iswc-change', { value: this.#value });
    };

    #onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Enter') return;
      this.#value = this.#input ? this.#input.value : this.#value;
      emit(this, 'iswc-enter', { value: this.#value });
    };

    #onFocus = (): void => { this.estado('focused', true); };

    #onBlur = (): void => {
      this.estado('focused', false);
      this.interactuado = true;
      this.solicitarRender();
    };

    #onClear = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (this.#value === '') return;
      this.#value = '';
      if (this.#input) this.#input.value = '';
      this.#update();
      this.#input?.focus();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      emit(this, 'iswc-input', { value: '' });
      emit(this, 'iswc-change', { value: '' });
      this.#scheduleTypingEnd();
    };

    #onTogglePassword = (e: CustomEvent<{ checked?: boolean }>): void => {
      this.#passwordVisible = !!e.detail?.checked;
      this.estado('password-visible', this.#passwordVisible);
      this.#syncNative();
      this.#input?.focus();
    };
  }

  define(IswcInput, 'IswcInput');
})();
