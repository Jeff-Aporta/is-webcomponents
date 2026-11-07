/**
 * modal-base.js — Mixin/controlador compartido por <iswc-dialog> y <iswc-drawer>.
 *
 * Centraliza TODO el ciclo de vida de un modal accesible que no es nativo:
 *
 *   - open/close con animación cancelable
 *   - focus management (last-focus, autofocus, focus trap, escape, tab cycling)
 *   - slot detection para header/footer/label
 *   - close-button (X) y backdrop (light-dismiss)
 *   - top layer mientras está abierto: un ancestro con transform, filter o contain no recorta
 *     el host ni deja el backdrop-filter sin nada que desenfocar. `--iswc-modal-capa: local`
 *     lo mantiene dentro de su contenedor (md-editor con fullscreen-scope="local").
 *   - data-attribute de close declarativo en descendientes (data-dialog / data-drawer)
 *   - atributos observados: open, label, without-header, light-dismiss
 *   - eventos: iswc-show, iswc-after-show, iswc-hide (cancelable), iswc-after-hide
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
 *   import { ModalBase } from './modal-base.js';
 *
 *   class IswcDialog extends ModalBase {
 *     static tag = 'iswc-dialog';
 *     static css = css;                       // import css from 'iswc:css'
 *     static template = TEMPLATE;             // el molde lo clona en el shadow
 *     static observed = [...super.observed, ...EXTRA];
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

import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';

import { emit, IswcElement } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import type { ModalBaseCtor } from "@jeff-aporta/iswc-base/components/layout/schemas/modal-base.schemas.js";
const BASE_OBSERVED: readonly string[] = ['open', 'label', 'without-header', 'light-dismiss'];

/** Selector CSS para "cualquier elemento focuseable" usado en focus trap. */
const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type=hidden]),' +
  ' select:not([disabled]), textarea:not([disabled]),' +
  ' button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/** Forma del constructor de subclase: expone __TEMPLATE y observedAttributes. */

const SOPORTA_POPOVER = 'showPopover' in HTMLElement.prototype;

// `withStyleAttrs` da la personalización por atributo (radio, colores,
// duraciones) a dialog/drawer y a cualquier modal que herede de aquí, sobre el
// molde `IswcElement` (shadow + plantilla + hojas). Los hooks `onConnected`,
// `onDisconnected` y `onAttributeChanged` son los del molde (no-op por defecto).
export class ModalBase extends withStyleAttrs(IswcElement) {
  static observed = [...BASE_OBSERVED];

  // ── Subclass hooks ──────────────────────────────────────────────────
  /** Selector del contenedor modal dentro del shadow (p.ej. '.dialog'). */
  get modalClass(): string { return '.modal'; }
  /** Atributo data-* para close declarativo en hijos (p.ej. 'data-dialog'). */
  get closeAttr(): string   { return 'data-modal'; }

  // ── Refs expuestas a subclases ──────────────────────────────────────
  // Las subclases que extiendan ModalBase necesitan acceder al modal y al
  // backdrop desde sus métodos animateOpen / animateClose. Como los campos
  // privados (#modal, #backdrop) son inaccesibles fuera de esta clase,
  // exponemos getters públicos que devuelven las refs cacheadas.
  get $modal(): HTMLElement    { return this.#modal; }
  get $backdrop(): HTMLElement { return this.#backdrop; }

  // ── Privados compartidos ────────────────────────────────────────────
  #mounted = false;
  #backdrop!: HTMLElement;
  #modal!: HTMLElement;
  #title!: HTMLElement;
  #closeBtn!: HTMLElement;
  #header!: HTMLElement;
  #footer!: HTMLElement;
  #body!: HTMLElement;
  #lastFocus: Element | null = null;
  #keyDownBound = false;

  constructor() {
    super();
    // El molde ya creó el shadow y clonó `static template`.
    const shadow = this.shadowRoot!;
    const ctor = this.constructor as unknown as ModalBaseCtor;
    if (!ctor.template) {
      throw new Error(`${this.constructor.name} must define a static template`);
    }
    this.#backdrop = shadow.querySelector<HTMLElement>('.backdrop')!;
    this.#modal    = shadow.querySelector<HTMLElement>(this.modalClass)!;
    this.#title    = shadow.querySelector<HTMLElement>('.title')!;
    this.#closeBtn = shadow.querySelector<HTMLElement>('.close-btn')!;
    this.#header   = shadow.querySelector<HTMLElement>('.header')!;
    this.#footer   = shadow.querySelector<HTMLElement>('.footer')!;
    this.#body     = shadow.querySelector<HTMLElement>('.body')!;

    this.#closeBtn.addEventListener('click', () => this.#requestClose(this.#closeBtn));
    this.#backdrop.addEventListener('click', () => {
      if (this.hasAttribute('light-dismiss')) this.#requestClose(this.#backdrop);
    });
    this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="label"]')
      ?.addEventListener('slotchange', () => this.#syncLabel());
    this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="footer"]')
      ?.addEventListener('slotchange', () => this.#syncFooterVisibility());

    this.addEventListener('click', this.#onDelegatedClick);
  }

  connectedCallback(): void {
    this.#mounted = true;
    this.#syncLabel();
    this.#syncFooterVisibility();
    this.#syncHeaderVisibility();
    // Molde: upgradeProperties (una vez), deps y `onConnected()` de la subclase.
    super.connectedCallback();
    if (this.open) {
      this.dataset.state = 'open';
      this.#modal.hidden = false;
      this.#subirCapa();
      this.#attachKeydown();
    } else {
      this.#modal.hidden = false;
    }
  }

  disconnectedCallback(): void {
    this.#detachKeydown();
    this.#bajarCapa();
    this.onDisconnected();
  }

  // Pisa el del molde (no lo llama): el hook de la subclase va DESPUÉS de lo propio del modal.
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (!this.#mounted || oldVal === newVal) return;
    if (name === 'open') this.#onOpenAttrChanged();
    if (name === 'label') this.#syncLabel();
    if (name === 'without-header') this.#syncHeaderVisibility();
    this.onAttributeChanged(name, oldVal, newVal);
  }

  // ── Public API ──────────────────────────────────────────────────────
  get open(): boolean { return this.hasAttribute('open'); }
  set open(v: boolean) {
    const desired = !!v;
    if (desired === this.open) return;
    if (desired) this.show();
    else this.hide();
  }

  get label(): string { return this.getAttribute('label') || ''; }
  set label(v: string) {
    if (v == null || v === '') this.removeAttribute('label');
    else this.setAttribute('label', v);
  }

  get withoutHeader(): boolean { return this.hasAttribute('without-header'); }
  set withoutHeader(v: boolean) { this.toggleAttribute('without-header', !!v); }

  get lightDismiss(): boolean { return this.hasAttribute('light-dismiss'); }
  set lightDismiss(v: boolean) { this.toggleAttribute('light-dismiss', !!v); }

  show(): Promise<void> { return this.#setOpen(true); }
  hide(): Promise<void> { return this.#setOpen(false); }
  toggle(): Promise<void> { return this.#setOpen(!this.open); }

  // ── Privados compartidos ────────────────────────────────────────────

  get #host(): HTMLElement { return this as unknown as HTMLElement; }

  #subirCapa(): void {
    const host = this.#host;
    if (!SOPORTA_POPOVER || !host.isConnected) return;
    if (getComputedStyle(host).getPropertyValue('--iswc-modal-capa').trim() === 'local') return;
    if (!host.hasAttribute('popover')) host.setAttribute('popover', 'manual');
    if (!host.matches(':popover-open')) host.showPopover();
  }

  #bajarCapa(): void {
    const host = this.#host;
    if (!host.hasAttribute('popover')) return;
    if (host.matches(':popover-open')) host.hidePopover();
    host.removeAttribute('popover');
  }

  #onDelegatedClick = (e: PointerEvent): void => {
    const target = e.target as Element | null;
    if (!target) return;
    const t = target.closest(`[${this.closeAttr}]`);
    if (!t || !this.contains(t)) return;
    const action = t.getAttribute(this.closeAttr);
    if (action === 'close') this.#requestClose(t);
  };

  #onOpenAttrChanged(): void {
    if (this.open) this.#setOpen(true);
    // El atributo ya se removió (posiblemente desde fuera), así que el guard
    // de #doClose lo daría por cerrado y dejaría el modal pintado.
    else this.#doClose(true);
  }

  #requestClose(source: Element | null): void {
    const evt = new CustomEvent('iswc-hide', {
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
          { transform: 'translateX(-0.1875em)' },
          { transform: 'translateX(0.1875em)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 220, easing: 'ease-in-out' },
      );
      return;
    }
    this.#doClose();
  }

  #setOpen(desired: boolean): Promise<void> {
    if (desired) {
      emit(this, 'iswc-show', {});
      this.#lastFocus = document.activeElement as Element | null;
      this.dataset.state = 'opening';
      this.#modal.hidden = false;
      this.#subirCapa();
      this.#attachKeydown();
      // eslint-disable-next-line no-unused-expressions
      this.#modal.offsetHeight; // forzar reflow antes de la animación
      this.setAttribute('open', '');
      return this.animateOpen().then(() => {
        this.dataset.state = 'open';
        this.#focusInitial();
        emit(this, 'iswc-after-show', {});
      });
    }
    return this.#doClose();
  }

  #doClose(attrAlreadyRemoved: boolean = false): Promise<void> {
    if (!attrAlreadyRemoved && !this.open) return Promise.resolve();
    this.dataset.state = 'closing';
    this.removeAttribute('open');
    return this.animateClose().then(() => {
      this.#modal.hidden = false;
      delete this.dataset.state;
      if (!this.open) this.#bajarCapa();
      this.#detachKeydown();
      const last = this.#lastFocus as HTMLElement | null;
      if (last && typeof last.focus === 'function') {
        try { last.focus(); } catch (_e: unknown) { /* ignore */ }
      }
      this.#lastFocus = null;
      emit(this, 'iswc-after-hide', {});
    });
  }

  /** Lee --show-duration / --hide-duration del host con fallback. */
  #readDur(propName: string, fallback: number): number {
    const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
    return Number.isFinite(v) ? v : fallback;
  }

  #focusInitial(): void {
    const af = this.querySelector<HTMLElement>('[autofocus]');
    if (af) { af.focus(); return; }
    const focusable = this.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable) { focusable.focus(); return; }
    this.#modal.focus();
  }

  #syncLabel(): void {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="label"]');
    const assigned = slot?.assignedNodes({ flatten: true });
    if (assigned && assigned.length > 0) {
      this.#title.textContent = '';
      return;
    }
    this.#title.textContent = this.label || '';
  }

  #syncHeaderVisibility(): void {
    this.#header.hidden = this.hasAttribute('without-header');
  }

  #syncFooterVisibility(): void {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="footer"]');
    const hasFooter = (slot?.assignedElements({ flatten: true }) ?? []).length > 0;
    this.#footer.hidden = !hasFooter;
  }

  #onKeyDown = (e: KeyboardEvent): void => {
    if (!this.open) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.#requestClose(null);
    } else if (e.key === 'Tab') {
      const focusable = [...this.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        this.#modal.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  #attachKeydown(): void {
    if (this.#keyDownBound) return;
    document.addEventListener('keydown', this.#onKeyDown, true);
    this.#keyDownBound = true;
  }

  #detachKeydown(): void {
    if (!this.#keyDownBound) return;
    document.removeEventListener('keydown', this.#onKeyDown, true);
    this.#keyDownBound = false;
  }

  // ── Métodos que la subclase debe implementar ───────────────────────
  /** Anima la apertura. Devuelve Promise<void> que se resuelve al terminar. */
  animateOpen(): Promise<void> { throw new Error('animateOpen not implemented'); }
  /** Anima el cierre. Devuelve Promise<void> que se resuelve al terminar. */
  animateClose(): Promise<void> { throw new Error('animateClose not implemented'); }
}
