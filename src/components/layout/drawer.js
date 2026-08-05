import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-drawer> — Web Component (vanilla, zero dependencies).
 *
 * Panel que se desliza desde un borde del viewport. Ideal para menús, filtros
 * y contenido secundario. Equivalente accesible a wa-drawer (Web Awesome).
 *
 * Modelo: hereda conceptualmente de is-dialog (mismo shadow DOM) con la
 * diferencia de placement (start/end/top/bottom) y --size en lugar de --width.
 *
 * Atributos
 *   open              boolean — si está abierto (reflected).
 *   label             string  — título en el header (a11y).
 *   placement         start | end | top | bottom  (default 'end').
 *   without-header    boolean — oculta el header y el botón de cerrar.
 *   light-dismiss     boolean — cierra al hacer click fuera.
 *
 * Slots
 *   (default)        contenido principal (body).
 *   label            header label propio.
 *   header-actions   acciones adicionales en el header.
 *   footer           pie del drawer.
 *
 * Métodos: show() / hide() / toggle()
 *
 * Eventos: is-show, is-after-show, is-hide (cancelable, detail.source), is-after-hide
 *
 * CSS Parts: drawer, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --size            tamaño preferido (ancho o alto según placement)
 *   --spacing         padding interno
 *   --show-duration, --hide-duration
 *   --backdrop-color
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="backdrop" part="backdrop"></div>
    <div class="drawer" part="drawer" role="dialog" aria-modal="true" tabindex="-1">
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

  const OBSERVED = ['open', 'label', 'placement', 'without-header', 'light-dismiss'];
  const VALID_PLACEMENT = ['start', 'end', 'top', 'bottom'];
  const HIDDEN_KEYFRAME = {
    start: { transform: 'translateX(-100%)' },
    end: { transform: 'translateX(100%)' },
    top: { transform: 'translateY(-100%)' },
    bottom: { transform: 'translateY(100%)' },
  };

  class IsDrawer extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #backdrop;
    #drawer;
    #title;
    #closeBtn;
    #header;
    #footer;
    #body;
    #lastFocus = null;
    #keyDownBound = false;
    #upgradeProps = ['open', 'label', 'placement', 'without-header', 'light-dismiss'];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#backdrop = shadow.querySelector('.backdrop');
      this.#drawer = shadow.querySelector('.drawer');
      this.#title = shadow.querySelector('.title');
      this.#closeBtn = shadow.querySelector('.close-btn');
      this.#header = shadow.querySelector('.header');
      this.#footer = shadow.querySelector('.footer');
      this.#body = shadow.querySelector('.body');

      this.#closeBtn.addEventListener('click', () => this.#requestClose(this.#closeBtn));
      this.#backdrop.addEventListener('click', () => {
        if (this.hasAttribute('light-dismiss')) this.#requestClose(this.#backdrop);
      });
      this.shadowRoot.querySelector('slot[name="label"]')
        .addEventListener('slotchange', () => this.#syncLabel());
      this.shadowRoot.querySelector('slot[name="footer"]')
        .addEventListener('slotchange', () => this.#syncFooterVisibility());

      this.addEventListener('click', this.#onDelegatedClick);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProperties();
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'end');
      this.#syncLabel();
      this.#syncFooterVisibility();
      this.#syncHeaderVisibility();
      if (this.open) {
        this.dataset.state = 'open';
        this.#drawer.hidden = false;
        this.#attachKeydown();
      } else {
        this.#drawer.hidden = false;
      }
    }

    disconnectedCallback() { this.#detachKeydown(); }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'open') this.#onOpenAttrChanged();
      if (name === 'label') this.#syncLabel();
      if (name === 'without-header') this.#syncHeaderVisibility();
      if (name === 'placement' && newVal && !VALID_PLACEMENT.includes(newVal)) {
        this.setAttribute('placement', 'end');
      }
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

    get placement() {
      const v = this.getAttribute('placement');
      return VALID_PLACEMENT.includes(v) ? v : 'end';
    }
    set placement(v) {
      if (v == null || v === '') this.removeAttribute('placement');
      else if (VALID_PLACEMENT.includes(v)) this.setAttribute('placement', v);
    }

    get withoutHeader() { return this.hasAttribute('without-header'); }
    set withoutHeader(v) { this.toggleAttribute('without-header', !!v); }

    get lightDismiss() { return this.hasAttribute('light-dismiss'); }
    set lightDismiss(v) { this.toggleAttribute('light-dismiss', !!v); }

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
      const t = e.target.closest('[data-drawer]');
      if (!t || !this.contains(t)) return;
      const action = t.getAttribute('data-drawer');
      if (action === 'close') this.#requestClose(t);
    };

    #onOpenAttrChanged() {
      if (this.open) this.#setOpen(true);
      else this.#doClose();
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
        this.#drawer.animate(
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
        if (this.dataset.state === 'open' || this.dataset.state === 'opening') {
          return Promise.resolve();
        }
        this.dispatchEvent(new CustomEvent('is-show', { detail: {}, bubbles: true, composed: true }));
        this.#lastFocus = document.activeElement;
        this.dataset.state = 'opening';
        this.#drawer.hidden = false;
        this.#attachKeydown();
        // eslint-disable-next-line no-unused-expressions
        this.#drawer.offsetHeight;
        this.setAttribute('open', '');
        return this.#animateOpen().then(() => {
          this.dataset.state = 'open';
          this.#focusInitial();
          this.dispatchEvent(new CustomEvent('is-after-show', { detail: {}, bubbles: true, composed: true }));
        });
      }
      this.#doClose();
      return Promise.resolve();
    }

    #doClose() {
      // El estado manda, no el atributo: cerrar quitando `open` desde fuera
      // llega aquí con this.open ya en false, y con la guarda puesta en el
      // atributo el drawer se quedaba pintado en pantalla.
      const state = this.dataset.state;
      if (!state || state === 'closing') return Promise.resolve();
      this.dataset.state = 'closing';
      this.removeAttribute('open');
      return this.#animateClose().then(() => {
        this.#drawer.hidden = false;
        delete this.dataset.state;
        this.#detachKeydown();
        if (this.#lastFocus && this.#lastFocus.focus) {
          try { this.#lastFocus.focus(); } catch (_e) { /* ignore */ }
        }
        this.#lastFocus = null;
        this.dispatchEvent(new CustomEvent('is-after-hide', { detail: {}, bubbles: true, composed: true }));
      });
    }

    #animateOpen() {
      const dur = this.#readDur('--show-duration', 220);
      this.#drawer.animate(
        [this.#hiddenKeyframe(), this.#visibleKeyframe()],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
      );
      this.#backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: dur, easing: 'ease-out', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    #animateClose() {
      const dur = this.#readDur('--hide-duration', 180);
      this.#drawer.animate(
        [this.#visibleKeyframe(), this.#hiddenKeyframe()],
        { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
      );
      this.#backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: dur, easing: 'ease-in', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    /** Posición fuera de pantalla, del lado del borde que ocupa el drawer. */
    #hiddenKeyframe() { return HIDDEN_KEYFRAME[this.placement]; }

    #visibleKeyframe() { return { transform: 'translate(0,0)' }; }

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
      this.#drawer.focus();
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
          this.#drawer.focus();
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

  if (!customElements.get('is-drawer')) customElements.define('is-drawer', IsDrawer);
  if (typeof window !== 'undefined') window.IsDrawer = IsDrawer;
})();
