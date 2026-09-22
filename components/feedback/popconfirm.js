import { adoptCss } from '../_shared/adopt-css.js';
import '../helpers/popover.js';

/**
 * <is-popconfirm> — Web Component (vanilla).
 *
 * Cuadro de confirmación emergente anclado a un disparador. Sin modal de fondo.
 * Construido sobre <is-popover>: hereda el positioning, flip, shift, arrow,
 * distance, skidding, hover-bridge y el ciclo de vida show/hide sin duplicar
 * lógica. Popconfirm añade: message propio (texto o slot), botones de
 * confirm/cancel (slots), eventos semánticos (confirm/cancel).
 *
 *   <is-button id="trigger">Borrar</is-button>
 *   <is-popconfirm for="trigger" message="¿Seguro?">
 *     <is-button slot="confirm" variant="danger">Sí</is-button>
 *     <is-button slot="cancel">No</is-button>
 *   </is-popconfirm>
 *
 * Atributos (todos delegan al <is-popover> interno; popconfirm añade):
 *   for             string — id del trigger element.
 *   message         string — texto principal si no se usa el slot message.
 *   open            boolean — controlado (lo gestiona is-popover).
 *   placement       top | bottom | start | end | top-start | ... (is-popover).
 *   distance        number (is-popover, default 8).
 *   skidding        number (is-popover).
 *   without-arrow   boolean (is-popover, default false).
 *
 * Slots
 *   message   texto principal (gana sobre el atributo message).
 *   confirm   botón de confirmación.
 *   cancel    botón de cancelar.
 *
 * Eventos
 *   is-popconfirm-show    detail: { trigger } — antes de abrir.
 *   is-popconfirm-hide    detail: { trigger } — antes de cerrar.
 *   is-popconfirm-confirm detail: { trigger } — click en botón confirm.
 *   is-popconfirm-cancel  detail: { trigger } — click en botón cancel.
 *   + is-show / is-hide / is-after-show / is-after-hide del popover.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-popover
      part="base"
      class="popconfirm"
      strategy="fixed"
      placement="top"
      distance="8"
      arrow
    >
      <div part="dialog" class="dialog" role="dialog" aria-modal="false">
        <div part="message" class="message">
          <slot name="message">¿Confirmas?</slot>
        </div>
        <div part="actions" class="actions">
          <span class="cancel-wrap"><slot name="cancel"><button type="button" class="cancel" data-popconfirm-cancel>Cancelar</button></slot></span>
          <span class="confirm-wrap"><slot name="confirm"><button type="button" class="confirm" data-popconfirm-confirm>Aceptar</button></slot></span>
        </div>
      </div>
    </is-popover>
  `;

  class IsPopconfirm extends HTMLElement {
    static get observedAttributes() {
      return [
        'for', 'message', 'open',
        // Delegados al <is-popover> interno:
        'placement', 'distance', 'skidding', 'without-arrow', 'hide-arrow',
      ];
    }

    #mounted = false;
    #popover;
    #trigger = null;
    #onTriggerClick;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popover = shadow.querySelector('is-popover');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#bindTrigger();
      this.#bindActions();
      this.#bindPropagation();
      // Si message está y slot vacío, el template ya pinta un fallback;
      // sincronizamos atributos → popover y cerramos el ciclo.
      this.#syncMessage();
    }

    disconnectedCallback() {
      this.#unbindTrigger();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'for') {
        this.#unbindTrigger();
        this.#bindTrigger();
      } else if (name === 'message') {
        this.#syncMessage();
      } else if (name === 'open') {
        if (this.hasAttribute('open')) this.#popover.show();
        else this.#popover.hide();
      } else if (name === 'placement' || name === 'distance' || name === 'skidding') {
        // Delegar al popover interno.
        if (this.#popover) {
          this.#popover.setAttribute(name, newVal ?? '');
        }
      } else if (name === 'without-arrow' || name === 'hide-arrow') {
        const wantsNoArrow = this.hasAttribute('without-arrow') || this.hasAttribute('hide-arrow');
        if (this.#popover) this.#popover.withoutArrow = wantsNoArrow;
      }
    }

    // ── API pública ──
    show() { this.setAttribute('open', ''); }
    hide() { this.removeAttribute('open'); }
    toggle() { if (this.hasAttribute('open')) this.hide(); else this.show(); }
    get open() { return this.hasAttribute('open'); }
    set open(v) { v ? this.show() : this.hide(); }

    get for() { return this.getAttribute('for') || ''; }
    set for(v) { v ? this.setAttribute('for', v) : this.removeAttribute('for'); }

    get message() { return this.getAttribute('message') ?? ''; }
    set message(v) { v ? this.setAttribute('message', v) : this.removeAttribute('message'); }

    // Atributos delegados al <is-popover> interno:
    get placement() { return this.#popover.placement; }
    set placement(v) { this.#popover.placement = v; }
    get distance() { return this.#popover.distance; }
    set distance(v) { this.#popover.distance = v; }
    get skidding() { return this.#popover.skidding; }
    set skidding(v) { this.#popover.skidding = v; }
    get withoutArrow() { return this.#popover.withoutArrow; }
    set withoutArrow(v) { this.#popover.withoutArrow = v; }
    // Alias kebab-case para mantener compatibilidad con el demo antiguo.
    get hideArrow() { return this.withoutArrow; }
    set hideArrow(v) { this.withoutArrow = v; }

    // ── Privados ──
    #bindTrigger() {
      const id = this.getAttribute('for');
      if (!id) return;
      this.#trigger = document.getElementById(id);
      if (!this.#trigger) return;
      this.#onTriggerClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      };
      this.#trigger.addEventListener('click', this.#onTriggerClick);
      // Vincular el popover al anchor automáticamente.
      this.#popover.anchor = this.#trigger;
    }

    #unbindTrigger() {
      if (this.#trigger && this.#onTriggerClick) {
        this.#trigger.removeEventListener('click', this.#onTriggerClick);
      }
      this.#trigger = null;
    }

    #bindActions() {
      // Auto-decorar cualquier botón que el consumidor meta en los slots
      // `confirm` / `cancel` con data-popconfirm-confirm/cancel, para que
      // un único listener en el host pueda identificarlos en click.
      const decorate = (slotName, attr) => {
        const slot = this.shadowRoot.querySelector(`slot[name="${slotName}"]`);
        const hasMarker = (n) => n?.matches?.('[data-popconfirm-confirm],[data-popconfirm-cancel]');
        const apply = () => {
          const assigned = slot?.assignedElements({ flatten: true }) ?? [];
          for (const el of assigned) {
            if (!hasMarker(el)) el.setAttribute(attr, '');
          }
          // Si el slot está vacío, el fallback ya lleva el atributo por template.
        };
        apply();
        slot?.addEventListener('slotchange', apply);
      };

      decorate('confirm', 'data-popconfirm-confirm');
      decorate('cancel', 'data-popconfirm-cancel');

      // Un único listener en el host captura tanto el fallback (dentro del
      // shadow del popover) como los botones decorados del consumidor.
      const emit = (eventName) => {
        const detail = { trigger: this.#trigger };
        this.dispatchEvent(new CustomEvent(eventName, {
          detail, bubbles: true, composed: true,
        }));
        // Re-emitimos también desde el trigger para retrocompatibilidad con
        // consumidores que escuchan `is-popconfirm-*` en el elemento que
        // disparó el popconfirm (p.ej. el is-button).
        this.#trigger?.dispatchEvent(new CustomEvent(eventName, {
          detail, bubbles: true, composed: true,
        }));
      };

      this.addEventListener('click', (e) => {
        const path = e.composedPath();
        const inConfirm = path.some((n) => n.nodeType === 1 && n.matches?.('[data-popconfirm-confirm]'));
        const inCancel = path.some((n) => n.nodeType === 1 && n.matches?.('[data-popconfirm-cancel]'));
        if (inConfirm) {
          emit('is-popconfirm-confirm');
          this.hide();
        } else if (inCancel) {
          emit('is-popconfirm-cancel');
          this.hide();
        }
      });
    }

    #bindPropagation() {
      // Re-emitir los eventos semánticos de popconfirm cuando el popover
      // muestra/oculta, manteniendo la API histórica (is-popconfirm-show/hide).
      this.#popover.addEventListener('is-show', (e) => {
        this.dispatchEvent(new CustomEvent('is-popconfirm-show', {
          detail: { trigger: this.#trigger, original: e },
          bubbles: true,
          composed: true,
        }));
      });
      this.#popover.addEventListener('is-hide', (e) => {
        this.dispatchEvent(new CustomEvent('is-popconfirm-hide', {
          detail: { trigger: this.#trigger, original: e },
          bubbles: true,
          composed: true,
        }));
      });
    }

    #syncMessage() {
      const msg = this.getAttribute('message');
      if (!msg) return;
      // El slot `name="message"` está en NUESTRO shadow (no en el del popover).
      const slot = this.shadowRoot.querySelector('slot[name="message"]');
      if (slot && slot.assignedNodes({ flatten: true }).length === 0) {
        // El slot está vacío y tenemos un message propio → lo pintamos.
        // Mantenemos un nodo de fallback para que el template no muestre
        // el "¿Confirmas?" por defecto si message está definido.
        const existing = this.shadowRoot.querySelector('[data-fallback-msg]');
        if (existing) existing.textContent = msg;
        else {
          const span = document.createElement('span');
          span.setAttribute('data-fallback-msg', '');
          span.textContent = msg;
          slot.replaceWith(span);
        }
      }
    }
  }

  if (!customElements.get('is-popconfirm')) customElements.define('is-popconfirm', IsPopconfirm);
  if (typeof window !== 'undefined') window.IsPopconfirm = IsPopconfirm;
})();