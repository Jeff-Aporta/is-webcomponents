import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../forms/input.js';
import '../media/icon.js';
import '../layout/dialog.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-confirm-delete> — Confirmación destructiva de tipo "escribe para confirmar".
 *
 * Port genérico de `src/lib/base/modal/ModalEliminar.svelte` (ISP): el botón de
 * eliminar permanece deshabilitado hasta que el usuario RE-ESCRIBE la clave del
 * registro. `<is-confirm-modal>` y `<is-popconfirm>` confirman con un clic; este
 * añade la fricción deliberada para borrados irreversibles.
 *
 * El ciclo de vida del modal (focus-trap, Escape, backdrop, restore de foco,
 * animaciones) NO se implementa aquí: se COMPONE un `<is-dialog>` dentro del
 * shadow root y el contenido va como light DOM suyo, que es justo lo que el
 * focus-trap de `ModalBase` recorre. Antes este componente no tenía trap.
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
 *   light-dismiss  boolean — OPT-IN: cerrar al hacer click en el backdrop.
 *                  Antes cerraba siempre; ahora hay que pedirlo, igual que en
 *                  <is-dialog> / <is-drawer>.
 *
 * Slots
 *   message       contenido rico en lugar del atributo `message`
 *   description   detalle adicional bajo los campos
 *
 * Eventos (bubbles + composed)
 *   is-show / is-after-show / is-hide (cancelable) / is-after-hide
 *                       — ciclo estándar, re-emitidos por el <is-dialog> interno.
 *   is-confirm-delete   detail: { value } — solo se emite si la clave coincide
 *   is-cancel-delete    detail: {} — evento semántico ADICIONAL, acompaña a
 *                       `is-hide` cuando el cierre lo pide el usuario.
 *
 * CSS Parts: ::part(backdrop) ::part(base) ::part(heading) ::part(message)
 *            ::part(fields) ::part(actions)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  // ponytail: `tabindex="0"` en los custom elements NO es decorativo. El
  // focus-trap de ModalBase busca `[tabindex]:not([tabindex="-1"])` y compañía;
  // <is-button>/<is-input> usan `delegatesFocus`, así que el host no matchea
  // ningún selector focuseable y el trap se quedaría sin anclas (Tab muerto).
  TEMPLATE.innerHTML = /* html */ `
    <is-dialog class="dlg" exportparts="backdrop, dialog: base">
      <span slot="label" part="heading" class="heading">
        <is-icon icon="mdi:trash-can-outline" aria-hidden="true"></is-icon>
        <span class="heading-text"></span>
      </span>
      <div part="message" class="message"><span class="message-text"></span><slot name="message"></slot></div>
      <div part="fields" class="fields">
        <is-input class="current" label-placement="float" readonly tabindex="0"></is-input>
        <is-input class="confirm" label-placement="float" required autocomplete="off" autofocus tabindex="0"></is-input>
        <p class="help"></p>
      </div>
      <slot name="description"></slot>
      <div part="actions" class="actions" slot="footer">
        <is-button class="cancel" color="neutral" variant="outlined" data-dialog="close" tabindex="0">Cancelar</is-button>
        <is-button class="delete" color="danger" disabled tabindex="0">Eliminar</is-button>
      </div>
    </is-dialog>
  `;

  const OBSERVED = [
    'for', 'open', 'heading', 'entity', 'confirm-value', 'confirm-label',
    'pk-label', 'message', 'delete-label', 'cancel-label', 'maxlength',
    'case-sensitive', 'loading', 'light-dismiss'
  ];

  class IsConfirmDelete extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    accent: { prop: '--is-confirm-delete-accent', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'accent']; }

    #dlg!: HTMLElement;
    #headingText!: HTMLElement;
    #messageText!: HTMLElement;
    #messageSlot!: HTMLSlotElement;
    #currentField!: HTMLElement;
    #confirmField!: HTMLElement;
    #helpEl!: HTMLElement;
    #deleteBtn!: HTMLElement;
    #cancelBtn!: HTMLElement;
    #trigger = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#dlg = shadow.querySelector<HTMLElement>('.dlg')!;
      this.#headingText = shadow.querySelector<HTMLElement>('.heading-text')!;
      this.#messageText = shadow.querySelector<HTMLElement>('.message-text')!;
      this.#messageSlot = shadow.querySelector<HTMLSlotElement>('slot[name="message"]')!;
      this.#currentField = shadow.querySelector<HTMLElement>('.current')!;
      this.#confirmField = shadow.querySelector<HTMLElement>('.confirm')!;
      this.#helpEl = shadow.querySelector<HTMLElement>('.help')!;
      this.#deleteBtn = shadow.querySelector<HTMLElement>('.delete')!;
      this.#cancelBtn = shadow.querySelector<HTMLElement>('.cancel')!;
    }

    onConnected() {
      this.#confirmField.addEventListener('is-input', this.#onConfirmInput);
      this.#deleteBtn.addEventListener('click', this.#onDelete);
      this.#messageSlot.addEventListener('slotchange', this.#syncMessage);
      this.#dlg.addEventListener('is-hide', this.#onDialogHide);
      this.#dlg.addEventListener('is-after-hide', this.#onDialogAfterHide);
      this.#bindTrigger();
      this.#syncTexts();
      this.#syncMessage();
      this.#syncGate();
      this.#syncLightDismiss();
      if (this.open) this.#showUI();
    }

    onDisconnected() {
      this.#confirmField.removeEventListener('is-input', this.#onConfirmInput);
      this.#deleteBtn.removeEventListener('click', this.#onDelete);
      this.#messageSlot.removeEventListener('slotchange', this.#syncMessage);
      this.#dlg.removeEventListener('is-hide', this.#onDialogHide);
      this.#dlg.removeEventListener('is-after-hide', this.#onDialogAfterHide);
      this.#unbindTrigger();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'for') { this.#unbindTrigger(); this.#bindTrigger(); }
      else if (name === 'open') { if (this.open) this.#showUI(); else this.#hideUI(); }
      else if (name === 'message') this.#syncMessage();
      else if (name === 'loading') this.#syncGate();
      else if (name === 'light-dismiss') this.#syncLightDismiss();
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

    get lightDismiss() { return this.hasAttribute('light-dismiss'); }
    set lightDismiss(v) { this.toggleAttribute('light-dismiss', !!v); }

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

    /** `light-dismiss` es opt-in y se delega tal cual al <is-dialog>. */
    #syncLightDismiss() {
      this.#dlg.toggleAttribute('light-dismiss', this.lightDismiss);
    }

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
      emit(this, 'is-confirm-delete', { value: this.#confirmField.value });
    };

    /**
     * `is-hide` sólo lo emite ModalBase cuando el cierre lo PIDE el usuario
     * (Escape, backdrop, botón Cancelar): `hide()` programático no pasa por
     * aquí. Es justo la semántica que tenía `is-cancel-delete`.
     */
    #onDialogHide = (e: Event) => {
      if (this.loading) { e.preventDefault(); return; }
      emit(this, 'is-cancel-delete', {});
    };

    #onDialogAfterHide = () => { this.removeAttribute('open'); };

    #showUI() {
      this.reset();
      this.#syncTexts();
      this.#dlg.show();
    }

    #hideUI() {
      this.#dlg.hide();
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

  defineElement('is-confirm-delete', IsConfirmDelete, 'IsConfirmDelete');
})();
