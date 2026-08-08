import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { computePosition } from '../_shared/position.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';
import '../actions/button.js';

/**
 * <is-popconfirm> — Web Component (vanilla, zero dependencies).
 *
 * Cuadro de confirmación emergente anclado a un disparador. Sin modal de fondo.
 *
 *   <is-button id="trigger">Borrar</is-button>
 *   <is-popconfirm for="trigger" message="¿Seguro?">
 *     <is-button slot="confirm" color="danger">Sí</is-button>
 *     <is-button slot="cancel">No</is-button>
 *   </is-popconfirm>
 *
 * Atributos
 *   for          string — id del trigger element.
 *   message      string — texto principal.
 *   placement    top | bottom | start | end | top-start | top-end | bottom-start | bottom-end (default 'top')
 *   hide-arrow   boolean
 *   open         boolean — controlado.
 *   without-backdrop boolean
 *
 * Slots
 *   confirm — slot del botón de confirmación.
 *   cancel  — slot del botón de cancelar.
 *
 * Eventos
 *   is-popconfirm-show  detail: { trigger }
 *   is-popconfirm-hide  detail: { trigger }
 *   is-popconfirm-confirm detail: { trigger }
 *   is-popconfirm-cancel detail: { trigger }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="popconfirm" part="base" role="dialog" aria-modal="false">
      <div class="arrow" part="arrow"></div>
      <div class="message" part="message"><slot name="message"></slot></div>
      <div class="actions" part="actions">
        <span class="cancel-wrap"><slot name="cancel"><is-button variant="text" color="neutral" class="cancel" data-popconfirm-cancel>Cancelar</is-button></slot></span>
        <span class="confirm-wrap"><slot name="confirm"><is-button color="brand" class="confirm" data-popconfirm-confirm>Aceptar</is-button></slot></span>
      </div>
    </div>
  `;

  const OBSERVED = ['for', 'message', 'placement', 'hide-arrow', 'open', 'without-backdrop'];

  const VALID_PLACEMENT = [
    'top', 'bottom', 'start', 'end',
    'top-start', 'top-end', 'bottom-start', 'bottom-end',
  ];

  class IsPopconfirm extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #pop;
    #trigger;
    #onTriggerClick;
    #onDocClick;

    /**
     * Ciclo "abierto" compartido con is-dropdown / is-context-menu
     * (_shared/popup-dismiss.js): Escape + reposicionado en scroll/resize.
     * El cierre por click fuera sigue siendo propio (ver #onDocClick más
     * abajo) porque hay que EXCLUIR el trigger externo — igual que
     * is-dropdown no le pasa `onOutside` porque resuelve el suyo con el
     * backdrop del <dialog>.
     */
    #dismiss = createPopupDismiss(this, {
      onEscape: () => { if (this.hasAttribute('open')) this.hide(); },
      onReposition: () => { if (this.hasAttribute('open')) this.#reposition(); },
    });

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#pop = shadow.querySelector('.popconfirm');
    }

    onConnected() {
      this.popup = document.createElement('div');
      this.popup.style.position = 'fixed';
      this.popup.style.top = '0';
      this.popup.style.left = '0';
      this.popup.style.zIndex = '99999';
      this.popup.style.display = 'none';
      this.appendChild(this.popup);
      this.popup.appendChild(this.#pop);
      this.#bindTrigger();
      this.#bindActions();
      this.#onDocClick = (e) => {
        if (!this.hasAttribute('open')) return;
        if (e.composedPath().includes(this)) return;
        if (this.#trigger && e.composedPath().includes(this.#trigger)) return;
        this.hide();
      };
      document.addEventListener('click', this.#onDocClick);
      // Si el atributo message está presente y slot vacío, pintar text.
      this.#syncMessage();
    }

    onDisconnected() {
      this.#unbindTrigger();
      document.removeEventListener('click', this.#onDocClick);
      this.#dismiss.detach();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'for') {
        this.#unbindTrigger();
        this.#bindTrigger();
      }
      if (name === 'placement') {
        this.#pop.dataset.placement = this.placement;
      }
      if (name === 'message') this.#syncMessage();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.#show();
        else this.hide();
      }
    }

    get placement() {
      const v = this.getAttribute('placement');
      return VALID_PLACEMENT.includes(v) ? v : 'top';
    }
    set placement(v) {
      if (v == null || v === '') this.removeAttribute('placement');
      else if (VALID_PLACEMENT.includes(v)) this.setAttribute('placement', v);
    }

    show() {
      const trigger = this.#trigger;
      this.setAttribute('open', '');
      this.#show();
      emit(this, 'is-popconfirm-show', { trigger });
    }

    hide() {
      this.removeAttribute('open');
      this.popup.style.display = 'none';
      emit(this, 'is-popconfirm-hide', { trigger: this.#trigger });
    }

    #show() {
      this.popup.style.display = 'block';
      requestAnimationFrame(() => this.#reposition());
    }

    #reposition = () => {
      if (!this.hasAttribute('open')) return;
      const trig = this.#trigger;
      if (!trig) return;
      const tRect = trig.getBoundingClientRect();
      const pRect = this.#pop.getBoundingClientRect();
      const placement = this.placement;
      let top = 0;
      let left = 0;
      const centerX = tRect.left + tRect.width / 2 - pRect.width / 2;
      const centerY = tRect.top + tRect.height / 2 - pRect.height / 2;
      switch (placement) {
        case 'top':
          left = centerX;
          top = tRect.top - pRect.height - 8;
          break;
        case 'top-start':
          left = tRect.left;
          top = tRect.top - pRect.height - 8;
          break;
        case 'top-end':
          left = tRect.right - pRect.width;
          top = tRect.top - pRect.height - 8;
          break;
        case 'bottom':
          left = centerX;
          top = tRect.bottom + 8;
          break;
        case 'bottom-start':
          left = tRect.left;
          top = tRect.bottom + 8;
          break;
        case 'bottom-end':
          left = tRect.right - pRect.width;
          top = tRect.bottom + 8;
          break;
        case 'start':
          left = tRect.left - pRect.width - 8;
          top = centerY;
          break;
        case 'end':
          left = tRect.right + 8;
          top = centerY;
          break;
      }
      // evitar overflow
      const margin = 8;
      const docW = document.documentElement.clientWidth;
      const docH = document.documentElement.clientHeight;
      if (left < margin) left = margin;
      if (left + pRect.width > docW - margin) left = docW - pRect.width - margin;
      if (top < margin) top = margin;
      if (top + pRect.height > docH - margin) top = docH - pRect.height - margin;
      this.popup.style.transform = `translate(${left}px, ${top}px)`;
    };

    #bindTrigger() {
      const id = this.getAttribute('for');
      if (!id) return;
      this.#trigger = document.getElementById(id);
      if (!this.#trigger) return;
      this.#onTriggerClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.hasAttribute('open')) this.hide();
        else this.show();
      };
      this.#trigger.addEventListener('click', this.#onTriggerClick);
    }

    #unbindTrigger() {
      if (this.#trigger && this.#onTriggerClick) {
        this.#trigger.removeEventListener('click', this.#onTriggerClick);
      }
      this.#trigger = null;
    }

    #bindActions() {
      this.#pop.addEventListener('click', (e) => {
        if (e.target.closest('[data-popconfirm-confirm]')) {
          emit(this, 'is-popconfirm-confirm', { trigger: this.#trigger });
          this.hide();
        }
        if (e.target.closest('[data-popconfirm-cancel]')) {
          emit(this, 'is-popconfirm-cancel', { trigger: this.#trigger });
          this.hide();
        }
      });
    }

    #syncMessage() {
      const msg = this.getAttribute('message');
      if (msg) {
        const slot = this.#pop.querySelector('slot[name="message"]');
        if (slot && slot.assignedNodes().length === 0) {
          slot.replaceWith(Object.assign(document.createElement('span'), { textContent: msg }));
        }
      }
    }
  }

  defineElement('is-popconfirm', IsPopconfirm, 'IsPopconfirm');
})();
