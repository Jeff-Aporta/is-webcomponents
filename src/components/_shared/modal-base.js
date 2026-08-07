/**
 * modal-base.js — Mixin/controlador compartido por <is-dialog> y <is-drawer>.
 *
 * Centraliza TODO el ciclo de vida de un modal accesible que no es nativo:
 *
 *   - open/close con animación cancelable
 *   - focus management (last-focus, autofocus, focus trap, escape, tab cycling)
 *   - slot detection para header/footer/label
 *   - close-button (X) y backdrop (light-dismiss)
 *   - data-attribute de close declarativo en descendientes (data-dialog / data-drawer)
 *   - atributos observados: open, label, without-header, light-dismiss
 *   - eventos: is-show, is-after-show, is-hide (cancelable), is-after-hide
 *
 * Cada componente que usa el mixin sólo define:
 *
 *   1. Su propio `TEMPLATE` (clases CSS, parts, slots).
 *   2. Su propio `modalClass` (selector de la caja modal: '.dialog' o '.drawer').
 *   3. Sus animaciones de apertura/cierre (#animateOpen / #animateClose).
 *   4. Atributos adicionales (p.ej. drawer → 'placement').
 *   5. El nombre del data-attribute de close (p.ej. 'data-drawer' o 'data-dialog').
 *
 * Esto evita la duplicación masiva que existía antes entre dialog.js y
 * drawer.js (370 líneas cada uno, ~80% idénticas).
 *
 * Uso:
 *
 *   import { ModalBase } from '../_shared/modal-base.js';
 *
 *   class IsDialog extends ModalBase {
 *     static get observedAttributes() {
 *       return [...super.observedAttributes, ...EXTRA];
 *     }
 *     get modalClass() { return '.dialog'; }
 *     get closeAttr()  { return 'data-dialog'; }
 *     #animateOpen()  { /* dialog-specific keyframes *\/ }
 *     #animateClose() { /* dialog-specific keyframes *\/ }
 *   }
 *
 * El mixin está implementado como una *clase abstracta* que el subclass
 * extiende con `super(...)`. No se puede usar como decorator (todavía no
 * hay stage 4 en todos los navegadores); herencia clásica funciona en
 * cualquier navegador con Custom Elements.
 */

import { upgradeProperties } from './upgrade-properties.js';
import { emit } from './emit.js';
const BASE_OBSERVED = ['open', 'label', 'without-header', 'light-dismiss'];

/** Selector CSS para "cualquier elemento focuseable" usado en focus trap. */
const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type=hidden]),' +
  ' select:not([disabled]), textarea:not([disabled]),' +
  ' button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export class ModalBase extends HTMLElement {
  static get observedAttributes() { return BASE_OBSERVED; }

  // ── Subclass hooks ──────────────────────────────────────────────────
  /** Selector del contenedor modal dentro del shadow (p.ej. '.dialog'). */
  get modalClass() { return '.modal'; }
  /** Atributo data-* para close declarativo en hijos (p.ej. 'data-dialog'). */
  get closeAttr()   { return 'data-modal'; }

  // ── Refs expuestas a subclases ──────────────────────────────────────
  // Las subclases que extiendan ModalBase necesitan acceder al modal y al
  // backdrop desde sus métodos animateOpen / animateClose. Como los campos
  // privados (#modal, #backdrop) son inaccesibles fuera de esta clase,
  // exponemos getters públicos que devuelven las refs cacheadas.
  get $modal()    { return this.#modal; }
  get $backdrop() { return this.#backdrop; }

  // ── Privados compartidos ────────────────────────────────────────────
  #mounted = false;
  #backdrop;
  #modal;
  #title;
  #closeBtn;
  #header;
  #footer;
  #body;
  #lastFocus = null;
  #keyDownBound = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    if (!this.constructor.__TEMPLATE) {
      throw new Error(`${this.constructor.name} must define a static __TEMPLATE`);
    }
    shadow.appendChild(this.constructor.__TEMPLATE.content.cloneNode(true));
    this.#backdrop = shadow.querySelector('.backdrop');
    this.#modal    = shadow.querySelector(this.modalClass);
    this.#title    = shadow.querySelector('.title');
    this.#closeBtn = shadow.querySelector('.close-btn');
    this.#header   = shadow.querySelector('.header');
    this.#footer   = shadow.querySelector('.footer');
    this.#body     = shadow.querySelector('.body');

    this.#closeBtn.addEventListener('click', () => this.#requestClose(this.#closeBtn));
    this.#backdrop.addEventListener('click', () => {
      if (this.hasAttribute('light-dismiss')) this.#requestClose(this.#backdrop);
    });
    this.shadowRoot.querySelector('slot[name="label"]')
      ?.addEventListener('slotchange', () => this.#syncLabel());
    this.shadowRoot.querySelector('slot[name="footer"]')
      ?.addEventListener('slotchange', () => this.#syncFooterVisibility());

    this.addEventListener('click', this.#onDelegatedClick);
  }

  connectedCallback() {
    this.#mounted = true;
    upgradeProperties(this, this.constructor.observedAttributes);
    this.#syncLabel();
    this.#syncFooterVisibility();
    this.#syncHeaderVisibility();
    this.onConnected?.();
    if (this.open) {
      this.dataset.state = 'open';
      this.#modal.hidden = false;
      this.#attachKeydown();
    } else {
      this.#modal.hidden = false;
    }
  }

  disconnectedCallback() {
    this.#detachKeydown();
    this.onDisconnected?.();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.#mounted || oldVal === newVal) return;
    if (name === 'open') this.#onOpenAttrChanged();
    if (name === 'label') this.#syncLabel();
    if (name === 'without-header') this.#syncHeaderVisibility();
    this.onAttributeChanged?.(name, oldVal, newVal);
  }

  // ── Public API ──────────────────────────────────────────────────────
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

  show() { return this.#setOpen(true); }
  hide() { return this.#setOpen(false); }
  toggle() { return this.#setOpen(!this.open); }

  // ── Privados compartidos ────────────────────────────────────────────

  #onDelegatedClick = (e) => {
    const t = e.target.closest(`[${this.closeAttr}]`);
    if (!t || !this.contains(t)) return;
    const action = t.getAttribute(this.closeAttr);
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
      // Pulso de "no!" para que el usuario vea que su preventDefault sirvió.
      this.#modal.animate(
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
      emit(this, 'is-show', {});
      this.#lastFocus = document.activeElement;
      this.dataset.state = 'opening';
      this.#modal.hidden = false;
      this.#attachKeydown();
      // eslint-disable-next-line no-unused-expressions
      this.#modal.offsetHeight; // forzar reflow antes de la animación
      this.setAttribute('open', '');
      return this.animateOpen().then(() => {
        this.dataset.state = 'open';
        this.#focusInitial();
        emit(this, 'is-after-show', {});
      });
    }
    return this.#doClose();
  }

  #doClose() {
    if (!this.open) return Promise.resolve();
    this.dataset.state = 'closing';
    this.removeAttribute('open');
    return this.animateClose().then(() => {
      this.#modal.hidden = false;
      delete this.dataset.state;
      this.#detachKeydown();
      if (this.#lastFocus?.focus) {
        try { this.#lastFocus.focus(); } catch (_e) { /* ignore */ }
      }
      this.#lastFocus = null;
      emit(this, 'is-after-hide', {});
    });
  }

  /** Lee --show-duration / --hide-duration del host con fallback. */
  #readDur(propName, fallback) {
    const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
    return Number.isFinite(v) ? v : fallback;
  }

  #focusInitial() {
    const af = this.querySelector('[autofocus]');
    if (af) { af.focus(); return; }
    const focusable = this.querySelector(FOCUSABLE_SELECTOR);
    if (focusable) { focusable.focus(); return; }
    this.#modal.focus();
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
      const focusable = [...this.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        this.#modal.focus();
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

  // ── Métodos que la subclase debe implementar ───────────────────────
  /** Anima la apertura. Devuelve Promise<void> que se resuelve al terminar. */
  animateOpen() { throw new Error('animateOpen not implemented'); }
  /** Anima el cierre. Devuelve Promise<void> que se resuelve al terminar. */
  animateClose() { throw new Error('animateClose not implemented'); }
}
