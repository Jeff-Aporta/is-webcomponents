import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-dialog> — Web Component (vanilla, zero dependencies).
 *
 * Modal sobre la página que requiere atención inmediata del usuario. Equivalente
 * accesible a <dialog> nativo + wa-dialog (Web Awesome).
 *
 * Atributos
 *   open              boolean — si está abierto (reflected).
 *   label             string  — título en el header (a11y).
 *   without-header    boolean — oculta el header y el botón de cerrar.
 *   light-dismiss     boolean — cierra al hacer click fuera del diálogo.
 *
 * Slots
 *   (default)        contenido principal (body).
 *   label            header label propio (gana sobre el atributo label).
 *   header-actions   acciones adicionales en el header.
 *   footer           pie, normalmente con botones.
 *
 * Métodos
 *   show() / hide() / toggle()
 *
 * Eventos
 *   is-show        detail: {} — antes de abrir.
 *   is-after-show  detail: {} — tras la animación de apertura.
 *   is-hide        detail: { source } — antes de cerrar (cancelable).
 *                  source = null (Escape) | elemento que disparó el cierre.
 *   is-after-hide  detail: {} — tras la animación de cierre.
 *
 * CSS Parts
 *   dialog, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --width          ancho preferido (default 500px)
 *   --spacing        padding interno (default var(--is-space-l, 1rem))
 *   --show-duration  duración de la animación de apertura
 *   --hide-duration  duración de la animación de cierre
 *   --backdrop-color color del backdrop
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="backdrop" part="backdrop"></div>
    <div class="dialog" part="dialog" role="dialog" aria-modal="true" tabindex="-1">
      <header class="header" part="header">
        <h2 class="title" part="title">
          <slot name="label"></slot>
        </h2>
        <div class="header-actions" part="header-actions">
          <slot name="header-actions"></slot>
          <button type="button" class="close-btn" part="close-button"
                  aria-label="Cerrar">
            <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
          </button>
        </div>
      </header>
      <div class="body" part="body">
        <slot></slot>
      </div>
      <footer class="footer" part="footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  `;

  const OBSERVED = ['open', 'label', 'without-header', 'light-dismiss'];

  class IsDialog extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #backdrop;
    #dialog;
    #title;
    #closeBtn;
    #header;
    #footer;
    #body;
    #lastFocus = null;
    #keyDownBound = false;
    #upgradeProps = ['open', 'label', 'without-header', 'light-dismiss'];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#backdrop = shadow.querySelector('.backdrop');
      this.#dialog = shadow.querySelector('.dialog');
      this.#title = shadow.querySelector('.title');
      this.#closeBtn = shadow.querySelector('.close-btn');
      this.#header = shadow.querySelector('.header');
      this.#footer = shadow.querySelector('.footer');
      this.#body = shadow.querySelector('.body');

      this.#closeBtn.addEventListener('click', () => this.#requestClose(this.#closeBtn));
      this.#backdrop.addEventListener('click', () => {
        if (this.hasAttribute('light-dismiss')) this.#requestClose(this.#backdrop);
      });
      // Slot change hooks
      this.shadowRoot.querySelector('slot[name="label"]')
        .addEventListener('slotchange', () => this.#syncLabel());
      this.shadowRoot.querySelector('slot[name="footer"]')
        .addEventListener('slotchange', () => this.#syncFooterVisibility());

      // Click-to-close / open declarative.
      this.addEventListener('click', this.#onDelegatedClick);
    }

    onConnected() {
      this.#upgradeProperties();
      this.#syncLabel();
      this.#syncFooterVisibility();
      this.#syncHeaderVisibility();
      if (this.open) {
        this.dataset.state = 'open';
        this.#dialog.hidden = false;
        this.#attachKeydown();
      } else {
        // Sin data-state: el CSS oculta .dialog y .backdrop.
        this.#dialog.hidden = false;
      }
    }

    onDisconnected() {
      this.#detachKeydown();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'open') this.#onOpenAttrChanged();
      if (name === 'label') this.#syncLabel();
      if (name === 'without-header') this.#syncHeaderVisibility();
    }

    // ---- public properties ----

    get open() { return this.hasAttribute('open'); }
    set open(v) {
      const desired = !!v;
      if (desired === this.open) return;
      if (desired) this.show();
      else this.hide();
    }

    get label() { return this.getAttribute('label') || ''; }
    set label(v) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', v);
    }

    get withoutHeader() { return this.hasAttribute('without-header'); }
    set withoutHeader(v) { this.toggleAttribute('without-header', !!v); }

    get lightDismiss() { return this.hasAttribute('light-dismiss'); }
    set lightDismiss(v) { this.toggleAttribute('light-dismiss', !!v); }

    // ---- public methods ----

    show() { return this.#setOpen(true); }
    hide() { return this.#setOpen(false); }
    toggle() { return this.#setOpen(!this.open); }

    // ---- private ----

    #upgradeProperties() {
      for (const a of this.#upgradeProps) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          if (v != null && v !== false) {
            if (v === true) this.setAttribute(a, '');
            else this.setAttribute(a, v);
          }
        }
      }
    }

    #onDelegatedClick = (e) => {
      const t = e.target.closest('[data-dialog]');
      if (!t || !this.contains(t)) return;
      const action = t.getAttribute('data-dialog');
      if (action === 'close') this.#requestClose(t);
    };

    #onOpenAttrChanged() {
      if (this.open) {
        this.#setOpen(true);
      } else {
        // External removal of open: cerrar sin animación de pulse.
        this.#doClose();
      }
    }

    #requestClose(source) {
      const evt = new CustomEvent('is-hide', {
        detail: { source: source ?? null },
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      this.dispatchEvent(evt);
      if (evt.defaultPrevented) {
        this.#dialog.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 220, easing: 'ease-in-out' },
        );
        return;
      }
      this.#doClose();
    }

    #setOpen(desired) {
      if (desired) {
        // Emit is-show
        emit(this, 'is-show', {});
        this.#lastFocus = document.activeElement;
        this.dataset.state = 'opening';
        this.#dialog.hidden = false;
        this.#attachKeydown();
        // Forzar reflow antes de mostrar la animación.
        // eslint-disable-next-line no-unused-expressions
        this.#dialog.offsetHeight;
        this.setAttribute('open', '');
        return this.#animateOpen().then(() => {
          this.dataset.state = 'open';
          this.#focusInitial();
          emit(this, 'is-after-show', {});
        });
      }
      this.#doClose();
      return Promise.resolve();
    }

    #doClose() {
      if (!this.open) return Promise.resolve();
      this.dataset.state = 'closing';
      this.removeAttribute('open');
      return this.#animateClose().then(() => {
        this.#dialog.hidden = false;
        delete this.dataset.state;
        this.#detachKeydown();
        if (this.#lastFocus && this.#lastFocus.focus) {
          try { this.#lastFocus.focus(); } catch (_e) { /* ignore */ }
        }
        this.#lastFocus = null;
        emit(this, 'is-after-hide', {});
      });
    }

    #animateOpen() {
      const dur = this.#readDur('--show-duration', 200);
      this.#dialog.animate(
        [
          { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
      );
      this.#backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: dur, easing: 'ease-out', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    #animateClose() {
      const dur = this.#readDur('--hide-duration', 160);
      this.#dialog.animate(
        [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        ],
        { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
      );
      this.#backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: dur, easing: 'ease-in', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    #readDur(propName, fallback) {
      const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
      return Number.isFinite(v) ? v : fallback;
    }

    #focusInitial() {
      const af = this.querySelector('[autofocus]');
      if (af) { af.focus(); return; }
      const focusable = this.querySelector(
        'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable) { focusable.focus(); return; }
      this.#dialog.focus();
    }

    #syncLabel() {
      const slot = this.shadowRoot.querySelector('slot[name="label"]');
      const assigned = slot?.assignedNodes({ flatten: true });
      if (assigned && assigned.length > 0) {
        this.#title.textContent = '';
        return;
      }
      this.#title.textContent = this.label || '';
    }

    #syncHeaderVisibility() {
      this.#header.hidden = this.hasAttribute('without-header');
    }

    #syncFooterVisibility() {
      const slot = this.shadowRoot.querySelector('slot[name="footer"]');
      const hasFooter = (slot?.assignedElements({ flatten: true }) ?? []).length > 0;
      this.#footer.hidden = !hasFooter;
    }

    #onKeyDown = (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.#requestClose(null);
      } else if (e.key === 'Tab') {
        const focusable = [...this.querySelectorAll(
          'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        )].filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) {
          e.preventDefault();
          this.#dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    #attachKeydown() {
      if (this.#keyDownBound) return;
      document.addEventListener('keydown', this.#onKeyDown, true);
      this.#keyDownBound = true;
    }

    #detachKeydown() {
      if (!this.#keyDownBound) return;
      document.removeEventListener('keydown', this.#onKeyDown, true);
      this.#keyDownBound = false;
    }
  }

  defineElement('is-dialog', IsDialog, 'IsDialog');
})();
