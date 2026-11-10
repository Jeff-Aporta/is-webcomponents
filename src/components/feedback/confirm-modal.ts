import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { abrirCapaModal } from '@jeff-aporta/iswc-base/core/position.js';
import { cerrarCapaModal } from '@jeff-aporta/iswc-base/core/position.js';
import css from 'iswc:css';
import type { ConfirmModalEventos } from './schemas/confirm-modal.schemas.js';

/**
 * <iswc-confirm-modal> — Web Component (vanilla, zero dependencies).
 *
 * Confirmación en modal centrado con backdrop. Complemento de
 * <iswc-popconfirm> (que confirma con popover anclado al trigger).
 *
 *   <iswc-button id="del">Borrar</iswc-button>
 *   <iswc-confirm-modal for="del" heading="Eliminar registro" message="¿Seguro?">
 *     <iswc-button slot="confirm" color="danger">Sí, eliminar</iswc-button>
 *     <iswc-button slot="cancel">Cancelar</iswc-button>
 *   </iswc-confirm-modal>
 *
 * Atributos
 *   for       string  — id del trigger element (abre el modal al click).
 *   heading   string  — título del modal (opcional).
 *   message   string  — texto principal.
 *   open      boolean — controlado.
 *   color         brand | danger | … — color del botón de aceptar por defecto (default brand).
 *   confirm-label texto del botón de aceptar por defecto (default "Aceptar").
 *   cancel-label  texto del botón de cancelar por defecto (default "Cancelar").
 *
 * Foco: capa modal de la pila de core/position.ts. Al abrir va a Cancelar (WAI-APG alertdialog), Tab queda
 * dentro del modal, el resto de la página queda `inert`, Escape cancela solo si es la capa de arriba y al
 * cerrar el foco vuelve a quien lo tenía.
 *
 * Slots
 *   message — contenido rico en vez del atributo message.
 *   confirm — botón de confirmación (default "Aceptar").
 *   cancel  — botón de cancelar (default "Cancelar").
 *
 * Eventos
 *   iswc-confirm-show / iswc-confirm-hide      detail: { trigger }
 *   iswc-confirm-confirm / iswc-confirm-cancel detail: { trigger }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="backdrop" part="backdrop" hidden>
      <div class="modal" part="base" role="alertdialog" aria-modal="true" aria-labelledby="titulo" aria-describedby="mensaje">
        <h2 class="heading" id="titulo" part="heading" hidden></h2>
        <div class="message" id="mensaje" part="message"><span class="message-text"></span><slot name="message"></slot></div>
        <div class="actions" part="actions">
          <span class="cancel-wrap"><slot name="cancel"><iswc-button variant="text" color="text" class="cancel">Cancelar</iswc-button></slot></span>
          <span class="confirm-wrap"><slot name="confirm"><iswc-button color="brand" class="confirm">Aceptar</iswc-button></slot></span>
        </div>
      </div>
    </div>
  `;

  const OBSERVED = ['for', 'heading', 'message', 'open', 'color', 'confirm-label', 'cancel-label'];

  class IswcConfirmModal extends IswcReactive {
    static override tag = 'iswc-confirm-modal';
    declare static events: ConfirmModalEventos;
    static override css = css;
    static override deps = ['iswc-button'];

    static override observed = [...OBSERVED, 'bg', 'text-color', 'border-color', 'accent'];

    #backdrop!: HTMLElement;
    #modal!: HTMLElement;
    #heading!: HTMLElement;
    #trigger: HTMLElement | null = null;
    #onTriggerClick: (() => void) | null = null;
    /** `overflow` del documento antes de abrir: el modal bloquea el scroll del fondo. */
    #overflowPrevio: string | null = null;
    #envolturaAceptar!: HTMLElement;
    #envolturaCancelar!: HTMLElement;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#backdrop = shadow.querySelector<HTMLElement>('.backdrop')!;
      this.#backdrop.popover = 'manual';
      this.#modal = shadow.querySelector<HTMLElement>('.modal')!;
      this.#heading = shadow.querySelector<HTMLElement>('.heading')!;

      this.#backdrop.addEventListener('click', (e: Event) => {
        if (e.target === this.#backdrop) this.#cancel();
      });
      // Cada envoltura cubre su slot: botón por defecto o el del consumidor, una sola vez.
      this.#envolturaAceptar = shadow.querySelector<HTMLElement>('.confirm-wrap')!;
      this.#envolturaCancelar = shadow.querySelector<HTMLElement>('.cancel-wrap')!;
      this.#envolturaAceptar.addEventListener('click', () => this.#confirm());
      this.#envolturaCancelar.addEventListener('click', () => this.#cancel());
      shadow.querySelector('slot[name="message"]')!.addEventListener('slotchange', () => this.#syncMessage());
    }

    #botonCancelar(): HTMLElement | null {
      return this.querySelector<HTMLElement>('[slot="cancel"]') ?? this.shadowRoot!.querySelector<HTMLElement>('.cancel');
    }

    /** Repinta los botones por defecto al cambiar el idioma heredado. */
    override actualizado(): void {
      if (this.mounted) this.#syncBotones();
    }

    #syncBotones(): void {
      const aceptar = this.shadowRoot!.querySelector<HTMLElement>('.confirm')!;
      const cancelar = this.shadowRoot!.querySelector<HTMLElement>('.cancel')!;
      aceptar.setAttribute('color', this.getAttribute('color') || 'brand');
      aceptar.textContent = this.getAttribute('confirm-label') || this.t('aceptar');
      cancelar.textContent = this.getAttribute('cancel-label') || this.t('cancelar');
    }

    override onConnected() {
      this.#bindTrigger();
      this.#syncHeading();
      this.#syncMessage();
      this.#syncBotones();
      if (this.hasAttribute('open')) this.#showUI();
    }

    override onDisconnected() {
      this.#unbindTrigger();
      this.#hideUI();
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'for') { this.#unbindTrigger(); this.#bindTrigger(); }
      if (name === 'heading') this.#syncHeading();
      if (name === 'message') this.#syncMessage();
      if (name === 'color' || name === 'confirm-label' || name === 'cancel-label') this.#syncBotones();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.#showUI();
        else this.#hideUI();
      }
    }

    show() {
      if (this.hasAttribute('open')) return;
      this.setAttribute('open', '');
      this.#emit('iswc-confirm-show');
    }

    hide() {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.#emit('iswc-confirm-hide');
    }

    #confirm() {
      this.#emit('iswc-confirm-confirm');
      this.hide();
    }

    #cancel() {
      this.#emit('iswc-confirm-cancel');
      this.hide();
    }

    #emit(type: string): void {
      emit(this, type, { trigger: this.#trigger });
    }

    #showUI(): void {
      if (!this.isConnected) return;
      this.#backdrop.hidden = false;
      if (!this.#backdrop.matches(':popover-open')) this.#backdrop.showPopover();
      if (this.#overflowPrevio === null) {
        this.#overflowPrevio = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      }
      // WAI-APG alertdialog: el foco va a la opción menos destructiva. El clic fuera lo resuelve el backdrop.
      abrirCapaModal(this, { cerrar: () => { if (this.hasAttribute('open')) this.#cancel(); }, inicial: this.#botonCancelar(), contenedor: this.#modal });
      // Un iswc-button que aún no se mejoró no toma el foco: se reintenta en el siguiente cuadro.
      requestAnimationFrame(() => { if (!this.contains(document.activeElement) && document.activeElement !== this) this.#botonCancelar()?.focus(); });
    }

    #hideUI(): void {
      if (this.#backdrop.matches(':popover-open')) this.#backdrop.hidePopover();
      this.#backdrop.hidden = true;
      if (this.#overflowPrevio !== null) {
        document.documentElement.style.overflow = this.#overflowPrevio;
        this.#overflowPrevio = null;
      }
      cerrarCapaModal(this);
    }

    #bindTrigger(): void {
      const id = this.getAttribute('for');
      if (!id) return;
      const root = this.getRootNode() as Document | ShadowRoot;
      const trigger = root.getElementById?.(id) || document.getElementById(id);
      if (!trigger) return;
      this.#trigger = trigger;
      this.#onTriggerClick = (): void => { this.show(); };
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
      if (text) this.#modal.setAttribute('aria-labelledby', 'titulo');
      else this.#modal.removeAttribute('aria-labelledby');
    }

    #syncMessage(): void {
      const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="message"]');
      const hasSlotted = slot ? slot.assignedNodes().length > 0 : false;
      const textEl = this.shadowRoot!.querySelector<HTMLElement>('.message-text');
      if (textEl) textEl.textContent = hasSlotted ? '' : (this.getAttribute('message') || '');
    }
  }

  define(IswcConfirmModal, 'IswcConfirmModal');
})();
