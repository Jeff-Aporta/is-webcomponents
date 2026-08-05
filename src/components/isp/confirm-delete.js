import { adoptCss } from '../_shared/adopt-css.js';
import '../actions/button.js';
import '../forms/input.js';
import '../media/icon.js';

/**
 * <is-confirm-delete> — Confirmación destructiva de tipo "escribe para confirmar".
 *
 * Port genérico de `src/lib/base/modal/ModalEliminar.svelte` (ISP): el botón de
 * eliminar permanece deshabilitado hasta que el usuario RE-ESCRIBE la clave del
 * registro. `<is-confirm-modal>` y `<is-popconfirm>` confirman con un clic; este
 * añade la fricción deliberada para borrados irreversibles.
 *
 * Atributos
 *   for            string  — id del trigger que abre el diálogo
 *   open           boolean — controlado
 *   heading        string  — título (default "Eliminar registro")
 *   entity         string  — nombre de la entidad, se usa en el título por defecto
 *   confirm-value  string  — el valor que hay que re-escribir (la clave primaria)
 *   confirm-label  string  — etiqueta del campo de confirmación
 *   pk-label       string  — nombre legible de la clave ("código", "NIT"…)
 *   message        string  — texto principal
 *   delete-label   string  — texto del botón destructivo (default "Eliminar")
 *   cancel-label   string  — texto del botón de cancelar (default "Cancelar")
 *   maxlength      número  — límite del campo de confirmación
 *   case-sensitive boolean — por defecto se compara sin distinguir mayúsculas
 *   loading        boolean — bloquea ambos botones mientras corre el borrado
 *
 * Slots
 *   message      contenido rico en lugar del atributo `message`
 *   description   detalle adicional bajo los campos
 *
 * Eventos (bubbles + composed)
 *   is-confirm-delete   detail: { value } — solo se emite si la clave coincide
 *   is-cancel-delete    detail: {}
 *
 * CSS Parts: ::part(backdrop) ::part(base) ::part(heading) ::part(message)
 *            ::part(fields) ::part(actions)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="backdrop" class="backdrop" hidden>
      <div part="base" class="modal" role="alertdialog" aria-modal="true" aria-labelledby="heading">
        <h2 part="heading" class="heading" id="heading">
          <is-icon icon="mdi:trash-can-outline" aria-hidden="true"></is-icon>
          <span class="heading-text"></span>
        </h2>
        <div part="message" class="message"><span class="message-text"></span><slot name="message"></slot></div>
        <div part="fields" class="fields">
          <is-input class="current" label-placement="float" readonly></is-input>
          <is-input class="confirm" label-placement="float" required autocomplete="off"></is-input>
          <p class="help"></p>
        </div>
        <slot name="description"></slot>
        <div part="actions" class="actions">
          <is-button class="cancel" color="neutral" variant="outlined">Cancelar</is-button>
          <is-button class="delete" color="danger" disabled>Eliminar</is-button>
        </div>
      </div>
    </div>
  `;

  const OBSERVED = [
    'for', 'open', 'heading', 'entity', 'confirm-value', 'confirm-label',
    'pk-label', 'message', 'delete-label', 'cancel-label', 'maxlength',
    'case-sensitive', 'loading'
  ];

  class IsConfirmDelete extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #backdrop;
    #headingText;
    #messageText;
    #messageSlot;
    #currentField;
    #confirmField;
    #helpEl;
    #deleteBtn;
    #cancelBtn;
    #trigger = null;
    #lastFocus = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#backdrop = shadow.querySelector('.backdrop');
      this.#headingText = shadow.querySelector('.heading-text');
      this.#messageText = shadow.querySelector('.message-text');
      this.#messageSlot = shadow.querySelector('slot[name="message"]');
      this.#currentField = shadow.querySelector('.current');
      this.#confirmField = shadow.querySelector('.confirm');
      this.#helpEl = shadow.querySelector('.help');
      this.#deleteBtn = shadow.querySelector('.delete');
      this.#cancelBtn = shadow.querySelector('.cancel');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProperties();
      this.#confirmField.addEventListener('is-input', this.#onConfirmInput);
      this.#deleteBtn.addEventListener('click', this.#onDelete);
      this.#cancelBtn.addEventListener('click', this.#onCancel);
      this.#backdrop.addEventListener('click', this.#onBackdropClick);
      this.#messageSlot.addEventListener('slotchange', this.#syncMessage);
      document.addEventListener('keydown', this.#onKeydown);
      this.#bindTrigger();
      this.#syncTexts();
      this.#syncMessage();
      this.#syncGate();
      if (this.open) this.#showUI();
    }

    disconnectedCallback() {
      this.#confirmField.removeEventListener('is-input', this.#onConfirmInput);
      this.#deleteBtn.removeEventListener('click', this.#onDelete);
      this.#cancelBtn.removeEventListener('click', this.#onCancel);
      this.#backdrop.removeEventListener('click', this.#onBackdropClick);
      this.#messageSlot.removeEventListener('slotchange', this.#syncMessage);
      document.removeEventListener('keydown', this.#onKeydown);
      this.#unbindTrigger();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'for') { this.#unbindTrigger(); this.#bindTrigger(); }
      else if (name === 'open') { if (this.open) this.#showUI(); else this.#hideUI(); }
      else if (name === 'message') this.#syncMessage();
      else if (name === 'loading') this.#syncGate();
      else { this.#syncTexts(); this.#syncGate(); }
    }

    // ---- propiedades ------------------------------------------------------

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get confirmValue() { return this.getAttribute('confirm-value') || ''; }
    set confirmValue(v) {
      if (v == null || v === '') this.removeAttribute('confirm-value');
      else this.setAttribute('confirm-value', String(v));
    }

    get entity() { return this.getAttribute('entity') || ''; }
    set entity(v) {
      if (v == null || v === '') this.removeAttribute('entity');
      else this.setAttribute('entity', String(v));
    }

    get pkLabel() { return this.getAttribute('pk-label') || 'código'; }
    set pkLabel(v) {
      if (v == null || v === '') this.removeAttribute('pk-label');
      else this.setAttribute('pk-label', String(v));
    }

    get caseSensitive() { return this.hasAttribute('case-sensitive'); }
    set caseSensitive(v) { this.toggleAttribute('case-sensitive', !!v); }

    get loading() { return this.hasAttribute('loading'); }
    set loading(v) { this.toggleAttribute('loading', !!v); }

    /** `true` cuando lo escrito coincide con `confirm-value`. */
    get confirmed() {
      const target = this.confirmValue.trim();
      if (!target) return false;
      const typed = String(this.#confirmField.value ?? '').trim();
      return this.caseSensitive
        ? typed === target
        : typed.toLocaleLowerCase() === target.toLocaleLowerCase();
    }

    // ---- API pública ------------------------------------------------------

    show() { this.open = true; }
    hide() { this.open = false; }

    /** Vacía el campo de confirmación y vuelve a bloquear el botón. */
    reset() {
      this.#confirmField.value = '';
      this.#syncGate();
    }

    // ---- privados ---------------------------------------------------------

    #upgradeProperties() {
      for (const p of ['open', 'confirmValue', 'entity', 'pkLabel', 'caseSensitive', 'loading']) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = this[p];
          delete this[p];
          this[p] = v;
        }
      }
    }

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #syncTexts() {
      const entity = this.entity;
      this.#headingText.textContent = this.getAttribute('heading')
        || (entity ? `Eliminar ${entity}` : 'Eliminar registro');

      const pk = this.pkLabel;
      const value = this.confirmValue;
      this.#currentField.label = this.getAttribute('current-label') || `Actual ${pk}`;
      this.#currentField.value = value;
      this.#confirmField.label = this.getAttribute('confirm-label') || `Confirma "${value}"`;
      const max = this.getAttribute('maxlength');
      if (max) this.#confirmField.maxlength = max;
      else this.#confirmField.maxlength = null;
      this.#helpEl.textContent = `Escriba el ${pk} indicado para confirmar.`;

      this.#deleteBtn.textContent = this.getAttribute('delete-label') || 'Eliminar';
      this.#cancelBtn.textContent = this.getAttribute('cancel-label') || 'Cancelar';
    }

    #syncMessage = () => {
      const slotted = this.#messageSlot.assignedNodes({ flatten: true })
        .some((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
      this.#messageText.textContent = slotted
        ? ''
        : (this.getAttribute('message') || '¿Confirma que desea eliminar este registro?');
    };

    /** Única fuente de verdad del "candado" del botón destructivo. */
    #syncGate() {
      const enabled = this.confirmed && !this.loading;
      this.#deleteBtn.toggleAttribute('disabled', !enabled);
      this.#deleteBtn.toggleAttribute('loading', this.loading);
      this.#cancelBtn.toggleAttribute('disabled', this.loading);
    }

    #onConfirmInput = () => { this.#syncGate(); };

    #onDelete = () => {
      // Doble comprobación: el botón podría habilitarse desde fuera.
      if (!this.confirmed || this.loading) return;
      this.#emit('is-confirm-delete', { value: this.#confirmField.value });
    };

    #onCancel = () => {
      if (this.loading) return;
      this.#emit('is-cancel-delete');
      this.hide();
    };

    #onBackdropClick = (e) => {
      if (e.target === this.#backdrop) this.#onCancel();
    };

    #onKeydown = (e) => {
      if (e.key === 'Escape' && this.open) this.#onCancel();
    };

    #showUI() {
      this.#lastFocus = document.activeElement;
      this.reset();
      this.#syncTexts();
      this.#backdrop.hidden = false;
      requestAnimationFrame(() => this.#confirmField.focus?.());
    }

    #hideUI() {
      this.#backdrop.hidden = true;
      this.#lastFocus?.focus?.();
      this.#lastFocus = null;
    }

    #bindTrigger() {
      const id = this.getAttribute('for');
      if (!id) return;
      const root = this.getRootNode();
      const trigger = root.getElementById?.(id) || document.getElementById(id);
      if (!trigger) return;
      this.#trigger = trigger;
      trigger.addEventListener('click', this.#onTriggerClick);
      trigger.setAttribute('aria-haspopup', 'dialog');
    }

    #unbindTrigger() {
      this.#trigger?.removeEventListener('click', this.#onTriggerClick);
      this.#trigger = null;
    }

    #onTriggerClick = () => { this.show(); };
  }

  if (!customElements.get('is-confirm-delete')) {
    customElements.define('is-confirm-delete', IsConfirmDelete);
  }
  if (typeof window !== 'undefined') window.IsConfirmDelete = IsConfirmDelete;
})();
