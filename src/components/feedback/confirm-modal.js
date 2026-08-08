import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';
import '../actions/button.js';

/**
 * <is-confirm-modal> — Web Component (vanilla, zero dependencies).
 *
 * Confirmación en modal centrado con backdrop. Complemento de
 * <is-popconfirm> (que confirma con popover anclado al trigger).
 *
 *   <is-button id="del">Borrar</is-button>
 *   <is-confirm-modal for="del" heading="Eliminar registro" message="¿Seguro?">
 *     <is-button slot="confirm" color="danger">Sí, eliminar</is-button>
 *     <is-button slot="cancel">Cancelar</is-button>
 *   </is-confirm-modal>
 *
 * Atributos
 *   for       string  — id del trigger element (abre el modal al click).
 *   heading   string  — título del modal (opcional).
 *   message   string  — texto principal.
 *   open      boolean — controlado.
 *
 * Slots
 *   message — contenido rico en vez del atributo message.
 *   confirm — botón de confirmación (default "Aceptar").
 *   cancel  — botón de cancelar (default "Cancelar").
 *
 * Eventos
 *   is-confirm-show / is-confirm-hide      detail: { trigger }
 *   is-confirm-confirm / is-confirm-cancel detail: { trigger }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="backdrop" part="backdrop" hidden>
      <div class="modal" part="base" role="alertdialog" aria-modal="true">
        <h2 class="heading" part="heading" hidden></h2>
        <div class="message" part="message"><span class="message-text"></span><slot name="message"></slot></div>
        <div class="actions" part="actions">
          <span class="cancel-wrap"><slot name="cancel"><is-button variant="text" color="neutral" class="cancel" data-confirm-cancel>Cancelar</is-button></slot></span>
          <span class="confirm-wrap"><slot name="confirm"><is-button color="brand" class="confirm" data-confirm-confirm>Aceptar</is-button></slot></span>
        </div>
      </div>
    </div>
  `;

  const OBSERVED = ['for', 'heading', 'message', 'open'];

  class IsConfirmModal extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #backdrop;
    #modal;
    #heading;
    #trigger = null;
    #onTriggerClick = null;
    #lastFocus = null;

    // El click fuera lo resuelve el propio backdrop (ver constructor), así que
    // aquí solo vive el Escape. scrollLock: el modal bloquea el fondo.
    #dismiss = createPopupDismiss(this, {
      onEscape: () => { if (this.hasAttribute('open')) this.#cancel(); },
      scrollLock: true,
    });

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#backdrop = shadow.querySelector('.backdrop');
      this.#modal = shadow.querySelector('.modal');
      this.#heading = shadow.querySelector('.heading');

      this.#backdrop.addEventListener('click', (e) => {
        if (e.target === this.#backdrop) this.#cancel();
      });
      shadow.addEventListener('click', (e) => {
        const path = e.composedPath();
        if (path.some((n) => n instanceof HTMLElement && n.hasAttribute?.('data-confirm-confirm'))) this.#confirm();
        else if (path.some((n) => n instanceof HTMLElement && n.hasAttribute?.('data-confirm-cancel'))) this.#cancel();
      });
      // Slots confirm/cancel: cualquier elemento slotted dispara su acción.
      shadow.querySelector('.confirm-wrap').addEventListener('click', (e) => {
        if (e.target.closest('[slot="confirm"]')) this.#confirm();
      });
      shadow.querySelector('.cancel-wrap').addEventListener('click', (e) => {
        if (e.target.closest('[slot="cancel"]')) this.#cancel();
      });
    }

    onConnected() {
      this.#bindTrigger();
      this.#syncHeading();
      this.#syncMessage();
      if (this.hasAttribute('open')) this.#showUI();
    }

    onDisconnected() {
      this.#unbindTrigger();
      this.#dismiss.detach();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'for') { this.#unbindTrigger(); this.#bindTrigger(); }
      if (name === 'heading') this.#syncHeading();
      if (name === 'message') this.#syncMessage();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.#showUI();
        else this.#hideUI();
      }
    }

    show() {
      if (this.hasAttribute('open')) return;
      this.setAttribute('open', '');
      this.#emit('is-confirm-show');
    }

    hide() {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.#emit('is-confirm-hide');
    }

    #confirm() {
      this.#emit('is-confirm-confirm');
      this.hide();
    }

    #cancel() {
      this.#emit('is-confirm-cancel');
      this.hide();
    }

    #emit(type) {
      emit(this, type, { trigger: this.#trigger });
    }

    #showUI() {
      this.#dismiss.attach();
      this.#lastFocus = document.activeElement;
      this.#backdrop.hidden = false;
      requestAnimationFrame(() => {
        const btn = this.querySelector('[slot="confirm"]')
          || this.shadowRoot.querySelector('.confirm');
        btn?.focus?.();
      });
    }

    #hideUI() {
      this.#dismiss.detach();
      this.#backdrop.hidden = true;
      this.#lastFocus?.focus?.();
      this.#lastFocus = null;
    }

    #bindTrigger() {
      const id = this.getAttribute('for');
      if (!id) return;
      const trigger = this.getRootNode().getElementById?.(id) || document.getElementById(id);
      if (!trigger) return;
      this.#trigger = trigger;
      this.#onTriggerClick = () => this.show();
      trigger.addEventListener('click', this.#onTriggerClick);
      trigger.setAttribute('aria-haspopup', 'dialog');
    }

    #unbindTrigger() {
      if (this.#trigger && this.#onTriggerClick) {
        this.#trigger.removeEventListener('click', this.#onTriggerClick);
      }
      this.#trigger = null;
      this.#onTriggerClick = null;
    }

    #syncHeading() {
      const text = this.getAttribute('heading') || '';
      this.#heading.textContent = text;
      this.#heading.hidden = !text;
    }

    #syncMessage() {
      const slot = this.shadowRoot.querySelector('slot[name="message"]');
      const hasSlotted = slot.assignedNodes().length > 0;
      const textEl = this.shadowRoot.querySelector('.message-text');
      textEl.textContent = hasSlotted ? '' : (this.getAttribute('message') || '');
    }
  }

  defineElement('is-confirm-modal', IsConfirmModal, 'IsConfirmModal');
})();
