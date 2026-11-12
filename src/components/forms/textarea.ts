// @contexto INDICE.md · src/components/forms/textarea.md
import { emit, upgradeProperties, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormChrome } from '@jeff-aporta/iswc-base/core/iswc-form-chrome.js';
import { setOptionalAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { hasSlotted } from '@jeff-aporta/iswc-base/core/dom.js';
import { html } from '@jeff-aporta/iswc-base/core/plantilla.js';
import type { Resultado } from '@jeff-aporta/iswc-base/core/schemas/plantilla.schemas.js';
import css from 'iswc:css';
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import type { TextareaEventos } from './schemas/textarea.schemas.js';
/**
 * <iswc-textarea> — Área de texto form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   name, value, placeholder, label, hint, maxlength
 *   rows            número de filas visibles (default 3)
 *   resize          none | vertical | both | auto   (default vertical; auto = autosize)
 *   min-rows        filas mínimas con autosize (default: rows)
 *   max-rows        filas máximas con autosize; a partir de ahí hace scroll
 *   variant      outlined (default) | filled | underlined
 *   label-placement top (default) | start
 *   error-text      mensaje mostrado en lugar del hint cuando hay error
 *   disabled, required, readonly, autosize, error, show-count, full-width  (boolean)
 *
 * Slots: label, hint
 * Parts: form-control, label, base, textarea, support, hint, error-text, count
 * Custom states: blank, disabled, readonly, focused, invalid
 * Eventos: iswc-input, iswc-change (bubbles + composed) y los nativos input/change
 * Tokens: --iswc-field-width, --iswc-field-label-width, --iswc-textarea-*
 *
 * La vista la pinta el molde (F8): `render()` con el `html` de `core/plantilla.ts`. El shadow se
 * pinta al conectar (antes de `onConnected`), asi que el DOM del campo no existe antes.
 */

(() => {
  const RESIZE = ['none', 'vertical', 'both', 'auto'];
  const APPEARANCES = ['outlined', 'filled', 'underlined'];
  const PLACEMENTS = ['top', 'start'];

  // Los demás atributos los declara cada `@prop` (y name, disabled, required y readonly, `IswcFormControl`; label, hint,
  // error-text y error, `IswcFormChrome`).
  const OBSERVED = ['value', 'rows', 'resize', 'autosize', 'min-rows', 'max-rows'];

  const EXTRA_UPGRADE_ATTRS = ['variant', 'label-placement', 'full-width'];

  class IswcTextarea extends IswcFormChrome {
    static override tag = 'iswc-textarea';
    declare static events: TextareaEventos;
    static override css = css;
    static override shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };

    static override observed = [...OBSERVED, 'radius', 'border-color', 'bg', 'text-color', 'focus-color', 'danger-color'];

    #textarea: HTMLTextAreaElement | null = null;
    #labelSlot: HTMLSlotElement | null = null;
    #hintSlot: HTMLSlotElement | null = null;
    #anclado = false;
    #value = '';
    #etiquetaSloteada = false;
    #ayudaSloteada = false;
    #ro: ResizeObserver | null = null;
    #lastWidth = -1;

    // ---- vista ----------------------------------------------------------

    /** Lo que ve el usuario; el texto lo lleva el `<textarea>` nativo (no la plantilla). */
    override render(): Resultado | null {
      const c = this.estadoChrome();
      const conEtiqueta = !!c.etiqueta || this.#etiquetaSloteada;
      const conAyuda = !!c.ayuda || this.#ayudaSloteada;
      const conError = !!c.error;
      const valor = this.#value;
      const max = this.maxlength;
      const contador = this.showCount ? (max ? `${valor.length}/${max}` : String(valor.length)) : '';
      return html`
        <div part="form-control" class="form-control">
          <label part="label" class="label" id="label" for="textarea" ?hidden=${!conEtiqueta}>
            <slot name="label" @slotchange=${this.#onSlotChange}>${c.etiqueta}</slot>
          </label>
          <div part="base" class="base">
            <textarea
              part="textarea"
              class="textarea"
              id="textarea"
              rows="3"
              aria-describedby="hint error-text"
              @input=${this.#onInput}
              @change=${this.#onChange}
              @focus=${this.#onFocus}
              @blur=${this.#onBlur}
            ></textarea>
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

    /** Tras cada pintado: toma los nodos de la vista y deja el estado de error al dia. */
    override actualizado(): void {
      super.actualizado();
      this.#anclar();
      this.#leerRanuras();
      this.estado('invalid', this.estadoChrome().invalido);
    }

    /** Los nodos de la vista ya pintada (la pinta el molde al conectar). */
    #anclar(): void {
      if (this.#anclado) return;
      const shadow = this.shadowRoot!;
      this.#textarea = shadow.getElementById('textarea') as HTMLTextAreaElement;
      this.#labelSlot = shadow.querySelector<HTMLSlotElement>('slot[name="label"]');
      this.#hintSlot = shadow.querySelector<HTMLSlotElement>('slot[name="hint"]');
      this.#anclado = true;
    }

    /** Que hay en las ranuras (la etiqueta y la ayuda pueden venir del slot y no del atributo). */
    #leerRanuras(): void {
      this.#etiquetaSloteada = hasSlotted(this.#labelSlot);
      this.#ayudaSloteada = hasSlotted(this.#hintSlot);
    }

    /** Cambio en una ranura: al repintar puede cambiar lo que se ve (la etiqueta, la ayuda). */
    #onSlotChange = (): void => {
      this.#leerRanuras();
      this.solicitarRender();
    };

    override onConnected(): void {
      upgradeProperties(this, EXTRA_UPGRADE_ATTRS);
      this.#value = this.getAttribute('value') ?? '';
      this.#syncNative();
      this.#syncDisabled();
      this.#update();
      // El ancho decide cuántas líneas ocupa el texto: refit al cambiar.
      if (typeof ResizeObserver !== 'undefined' && !this.#ro) {
        this.#ro = new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width ?? 0;
          if (w === this.#lastWidth) return;
          this.#lastWidth = w;
          this.#autofit();
        });
        this.#ro.observe(this);
      }
    }

    override onDisconnected(): void {
      this.#ro?.disconnect();
      this.#ro = null;
      this.#lastWidth = -1;
    }

    override onAttributeChanged(name: string, _oldVal: string | null, newVal: string | null): void {
      if (name === 'value') {
        this.#value = newVal ?? '';
        this.#syncNative();
        this.#update();
      } else if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
        this.#update();
      } else if (name === 'label' || name === 'hint') {
        this.solicitarRender();
      } else if (name === 'error' || name === 'error-text' || name === 'show-count') {
        this.solicitarRender();
      } else {
        this.#syncNative();
        this.#update();
      }
    }

    // ---- propiedades ----------------------------------------------------

    get value(): string { return this.#value; }
    set value(v: string | number | null | undefined) {
      const next = v == null ? '' : String(v);
      if (next === this.#value) return;
      this.#value = next;
      if (this.#textarea && this.#textarea.value !== next) this.#textarea.value = next;
      this.#update();
    }

    get rows(): number { return Number(this.getAttribute('rows')) || 3; }
    set rows(v: number) { this.setAttribute('rows', String(v)); }

    get resize(): string {
      const r = (this.getAttribute('resize') || 'vertical').toLowerCase();
      return RESIZE.includes(r) ? r : 'vertical';
    }
    set resize(v: string) { this.setAttribute('resize', String(v)); }

    get autosize(): boolean { return this.hasAttribute('autosize') || this.resize === 'auto'; }
    set autosize(v: boolean) { this.toggleAttribute('autosize', !!v); }

    get minRows(): number { return Number(this.getAttribute('min-rows')) || this.rows; }
    set minRows(v: number | null) { setOptionalAttr(this, 'min-rows', v); }

    get maxRows(): number { return Number(this.getAttribute('max-rows')) || 0; }
    set maxRows(v: number | null) { setOptionalAttr(this, 'max-rows', v); }

    get variant(): string {
      const a = (this.getAttribute('variant') || '').toLowerCase();
      return APPEARANCES.includes(a) ? a : 'outlined';
    }
    set variant(v: string | null) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (APPEARANCES.includes(String(v))) this.setAttribute('variant', String(v));
    }

    get labelPlacement(): string {
      const p = (this.getAttribute('label-placement') || '').toLowerCase();
      return PLACEMENTS.includes(p) ? p : 'top';
    }
    set labelPlacement(v: string | null) {
      if (v == null || v === '') this.removeAttribute('label-placement');
      else if (PLACEMENTS.includes(String(v))) this.setAttribute('label-placement', String(v));
    }

    @prop({ vacio: true }) override accessor errorText: string = '';

    @prop({ type: 'bool' }) accessor showCount: boolean = false;

    @prop({ type: 'bool' }) accessor fullWidth: boolean = false;

    @prop({ vacio: true }) override accessor placeholder: string = '';

    @prop({ vacio: true }) override accessor label: string = '';

    @prop({ vacio: true }) override accessor hint: string = '';

    @prop({ vacio: true }) override accessor maxlength: string | null = null;

    get textarea(): HTMLTextAreaElement { return this.#textarea as HTMLTextAreaElement; }

    // ---- API pública -----------------------------------------------------

    override focus(options?: FocusOptions): void { this.#textarea?.focus(options); }
    override blur(): void { this.#textarea?.blur(); }
    select(): void { this.#textarea?.select(); }
    setSelectionRange(...args: Parameters<HTMLTextAreaElement['setSelectionRange']>): void {
      this.#textarea?.setSelectionRange?.(...(args as Parameters<HTMLTextAreaElement['setSelectionRange']>));
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

    /** Vacío no entra en FormData. Validez: `required` + la del <textarea> nativo (tooLong). */
    override valorFormulario(): string | null { return this.#value || null; }

    override get controlNativo(): HTMLTextAreaElement | null { return this.#textarea; }

    override restablecer(): void {
      this.#value = this.defaultValue;
      if (this.#textarea) this.#textarea.value = this.#value;
      this.#update();
    }

    override formDisabledCallback(disabled: boolean): void {
      super.formDisabledCallback(disabled);
      this.#syncDisabled();
      this.#update();
    }

    // ---- privados --------------------------------------------------------

    #syncNative(): void {
      const ta = this.#textarea;
      if (!ta) return;
      for (const a of ['placeholder', 'maxlength', 'name']) {
        const v = this.getAttribute(a);
        if (v == null) ta.removeAttribute(a);
        else ta.setAttribute(a, v);
      }
      ta.rows = this.rows;
      ta.style.resize = this.autosize ? 'none' : this.resize;
      if (ta.value !== this.#value) ta.value = this.#value;
    }

    #syncDisabled(): void {
      const disabled = this.inhabilitado;
      if (this.#textarea) {
        this.#textarea.disabled = disabled;
        this.#textarea.readOnly = this.readonly;
      }
      this.estado('disabled', disabled);
      this.estado('readonly', this.readonly);
    }

    #update(): void {
      this.estado('blank', this.#value === '');
      this.sincronizarFormulario();
      this.solicitarRender();
      this.#autofit();
    }

    /** Autosize: mide el contenido con la altura a cero y la acota entre min-rows y max-rows. */
    #autofit(): void {
      const ta = this.#textarea;
      if (!ta) return;
      if (!this.autosize) {
        if (ta.style.height) { ta.style.height = ''; ta.style.overflowY = ''; }
        return;
      }
      if (!ta.clientWidth) return; // sin layout todavía: manda `rows`

      const cs = getComputedStyle(ta);
      const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + borders;
      const min = this.minRows * line + extra;
      const max = this.maxRows ? this.maxRows * line + extra : Infinity;

      // height:auto devolvería la altura intrínseca de `rows`, no la del texto.
      ta.style.overflowY = 'hidden';
      ta.style.height = '0px';
      const fit = ta.scrollHeight + borders;
      ta.style.height = `${Math.min(Math.max(fit, min), max)}px`;
      if (fit > max) ta.style.overflowY = 'auto';
    }

    #onInput = (): void => {
      this.#value = this.#textarea ? this.#textarea.value : this.#value;
      this.#update();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      emit(this, 'iswc-input', { value: this.#value });
    };

    #onChange = (): void => {
      this.#value = this.#textarea ? this.#textarea.value : this.#value;
      this.interactuado = true;
      this.#update();
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      emit(this, 'iswc-change', { value: this.#value });
    };

    #onFocus = (): void => { this.estado('focused', true); };

    #onBlur = (): void => {
      this.estado('focused', false);
      this.interactuado = true;
      this.solicitarRender();
    };
  }

  define(IswcTextarea, 'IswcTextarea');
})();
