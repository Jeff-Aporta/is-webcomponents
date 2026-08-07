import { adoptCss } from '../_shared/adopt-css.js';
import '../actions/button.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-form> — Formulario de ficha con cabecera, contenido y pie automático.
 *
 * Port de `src/lib/form/Form.svelte` (ISP-SvelteComponents): un `<form>` en
 * columna con header + contenido scrolleable + footer que ya trae los botones
 * Aceptar / Cancelar. Por debajo de 600px de ANCHO PROPIO el pie pasa de fila
 * a columna (container query, no media query: el formulario suele vivir dentro
 * de un panel más estrecho que la ventana).
 *
 * Atributos
 *   mode           edit (default) | view   — `view` oculta el botón Aceptar,
 *                  igual que el `itdForm === "view"` de ISP.
 *   submit-label   texto del botón de aceptar   (default "Aceptar")
 *   cancel-label   texto del botón de cancelar  (default "Cancelar")
 *   loading        boolean — pone el botón Aceptar en estado de carga
 *
 * Slots
 *   header        cabecera del formulario
 *   content       cuerpo (crece y hace scroll)
 *   pre-buttons   contenido a la izquierda del bloque de botones
 *   post-buttons  contenido bajo el bloque de botones
 *
 * Eventos (bubbles + composed)
 *   is-submit  cancelable — el envío nativo siempre se detiene; el consumidor
 *              decide qué hacer. detail: { form }
 *   is-cancel  detail: { form }
 *
 * CSS Parts: ::part(form) ::part(header) ::part(content) ::part(footer)
 *            ::part(buttons)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <form part="form" class="form" novalidate>
      <header part="header" class="header"><slot name="header"></slot></header>
      <article part="content" class="content"><slot name="content"></slot></article>
      <footer part="footer" class="footer">
        <slot name="pre-buttons"></slot>
        <div part="buttons" class="buttons">
          <is-button class="submit" type="submit" color="brand">Aceptar</is-button>
          <is-button class="cancel" type="button" color="neutral" variant="outlined">Cancelar</is-button>
        </div>
        <slot name="post-buttons"></slot>
      </footer>
    </form>
  `;

  const VALID_MODE = ['edit', 'view'];
  const OBSERVED = ['mode', 'submit-label', 'cancel-label', 'loading'];

  class IsForm extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #form;
    #submitBtn;
    #cancelBtn;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#form = shadow.querySelector('.form');
      this.#submitBtn = shadow.querySelector('.submit');
      this.#cancelBtn = shadow.querySelector('.cancel');
    }

    onConnected() {
      this.#upgradeProperties();
      if (!this.hasAttribute('mode')) this.setAttribute('mode', 'edit');
      this.#form.addEventListener('submit', this.#onSubmit);
      this.#submitBtn.addEventListener('click', this.#onSubmitClick);
      this.#cancelBtn.addEventListener('click', this.#onCancel);
      this.#syncMode();
      this.#syncLabels();
      this.#syncLoading();
    }

    onDisconnected() {
      this.#form.removeEventListener('submit', this.#onSubmit);
      this.#submitBtn.removeEventListener('click', this.#onSubmitClick);
      this.#cancelBtn.removeEventListener('click', this.#onCancel);
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'mode') {
        if (newVal && !VALID_MODE.includes(newVal)) { this.setAttribute('mode', 'edit'); return; }
        this.#syncMode();
      } else if (name === 'loading') {
        this.#syncLoading();
      } else {
        this.#syncLabels();
      }
    }

    // ---- propiedades ------------------------------------------------------

    get mode() {
      const v = this.getAttribute('mode');
      return VALID_MODE.includes(v) ? v : 'edit';
    }
    set mode(v) {
      if (v == null || v === '') this.removeAttribute('mode');
      else if (VALID_MODE.includes(String(v))) this.setAttribute('mode', String(v));
    }

    get submitLabel() { return this.getAttribute('submit-label') || 'Aceptar'; }
    set submitLabel(v) {
      if (v == null || v === '') this.removeAttribute('submit-label');
      else this.setAttribute('submit-label', String(v));
    }

    get cancelLabel() { return this.getAttribute('cancel-label') || 'Cancelar'; }
    set cancelLabel(v) {
      if (v == null || v === '') this.removeAttribute('cancel-label');
      else this.setAttribute('cancel-label', String(v));
    }

    get loading() { return this.hasAttribute('loading'); }
    set loading(v) { this.toggleAttribute('loading', !!v); }

    /** `<form>` interno — para checkValidity() o FormData desde fuera. */
    get form() { return this.#form; }

    // ---- API pública ------------------------------------------------------

    /** Lanza el mismo flujo que pulsar Aceptar. */
    submit() { this.#form.requestSubmit(); }
    /** Restablece los controles nativos proyectados dentro del formulario. */
    reset() { this.#form.reset(); }

    // ---- privados ---------------------------------------------------------

    #upgradeProperties() {
      for (const p of ['mode', 'submitLabel', 'cancelLabel', 'loading']) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = this[p];
          delete this[p];
          this[p] = v;
        }
      }
    }

    #emit(name) {
      return emit(this, name, { form: this.#form }, { cancelable: true });
    }

    #onSubmit = (e) => {
      // El envío nativo nunca navega: este componente es de UI, el consumidor
      // decide (fetch, router, etc.) escuchando `is-submit`.
      e.preventDefault();
      if (this.mode === 'view' || this.loading) return;
      this.#emit('is-submit');
    };

    // El <button type="submit"> real vive en el shadow de <is-button>, y los
    // formularios no cruzan shadow roots: hay que pedir el submit a mano.
    #onSubmitClick = () => {
      if (this.mode === 'view' || this.loading) return;
      this.#form.requestSubmit();
    };

    #onCancel = () => { this.#emit('is-cancel'); };

    #syncMode() { this.#submitBtn.hidden = this.mode === 'view'; }

    #syncLabels() {
      this.#submitBtn.textContent = this.submitLabel;
      this.#cancelBtn.textContent = this.cancelLabel;
    }

    #syncLoading() { this.#submitBtn.toggleAttribute('loading', this.loading); }
  }

  defineElement('is-form', IsForm, 'IsForm');
})();
