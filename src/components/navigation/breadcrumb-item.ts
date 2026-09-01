import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-breadcrumb-item> — un paso individual dentro de un <is-breadcrumb>.
 *
 * Si tiene `href` (incluido `href=""`), el item se renderiza como <a href>.
 * Con `href=""` se marca como current page (aria-current="page", CSS [current]).
 * Si no tiene href, se renderiza como <span> (SPAs: el desarrollador maneja eventos).
 *
 * Atributos
 *   href    string  — opcional: el item se vuelve enlace. "" = current page.
 *   target  string  — opcional.
 *   rel     string  — opcional.
 *   icon    string  — opcional: Iconify id para icono al inicio si no se usa slot start.
 *
 * Slots
 *   (default)  texto del item.
 *   start      icono propio al inicio (gana sobre icon).
 *   end        icono propio al final.
 *   separator  override del separador (chevron-right por default).
 *
 * CSS Parts: ::part(label) ::part(separator) ::part(start) ::part(end)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="separator" part="separator" aria-hidden="true">
      <slot name="separator">
        <is-icon icon="mdi:chevron-right" aria-hidden="true"></is-icon>
      </slot>
    </span>
    <span class="start" part="start" aria-hidden="true">
      <slot name="start"></slot>
    </span>
    <span class="label" part="label">
      <slot></slot>
    </span>
    <span class="end" part="end" aria-hidden="true">
      <slot name="end"></slot>
    </span>
  `;

  const OBSERVED = ['href', 'icon', 'target', 'rel'];

  class IsBreadcrumbItem extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #anchor;
    #upgradeProps = ['href', 'icon', 'target', 'rel'];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    onConnected() {
      this.#upgradeProperties();
      this.#renderInteractive();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'href' || name === 'target' || name === 'rel') {
        this.#renderInteractive();
      }
      if (name === 'icon') this.#syncDefaultIcon();
    }

    // ---- public properties ----

    get href() {
      return this.hasAttribute('href') ? this.getAttribute('href') : null;
    }
    set href(v) {
      if (v == null) this.removeAttribute('href');
      else this.setAttribute('href', v);
    }

    get target() { return this.getAttribute('target') || ''; }
    set target(v) {
      if (v == null || v === '') this.removeAttribute('target');
      else this.setAttribute('target', v);
    }

    get rel() { return this.getAttribute('rel') || ''; }
    set rel(v) {
      if (v == null || v === '') this.removeAttribute('rel');
      else this.setAttribute('rel', v);
    }

    get icon() { return this.getAttribute('icon') || ''; }
    set icon(v) {
      if (v == null || v === '') this.removeAttribute('icon');
      else this.setAttribute('icon', v);
    }

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

    #renderInteractive() {
      // Restaurar el span.label por si acaso.
      this.#restoreLabel();
      const href = this.href;
      if (href === null) return;
      const isCurrent = href === '';
      const label = this.shadowRoot!.querySelector<HTMLElement>('.label');
      const a = document.createElement('a');
      a.part = 'label';
      a.className = 'label';
      a.appendChild(document.createElement('slot'));
      if (isCurrent) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.setAttribute('href', href);
        if (this.target) a.setAttribute('target', this.target);
        if (this.rel) a.setAttribute('rel', this.rel);
      }
      label.replaceWith(a);
      this.#anchor = a;
      this.toggleAttribute('current', isCurrent);
    }

    #restoreLabel() {
      if (this.#anchor) {
        const span = document.createElement('span');
        span.part = 'label';
        span.className = 'label';
        span.appendChild(document.createElement('slot'));
        this.#anchor.replaceWith(span);
        this.#anchor = null;
        this.removeAttribute('current');
      }
    }

    #syncDefaultIcon() {
      const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="start"]');
      const assigned = slot?.assignedNodes({ flatten: true });
      if (assigned && assigned.length > 0) return;
      const start = this.shadowRoot!.querySelector<HTMLElement>('.start');
      start.innerHTML = '';
      const icon = document.createElement('is-icon');
      icon.setAttribute('aria-hidden', 'true');
      const target = this.getAttribute('icon');
      if (target) icon.setAttribute('icon', target);
      start.appendChild(icon);
    }
  }

  defineElement('is-breadcrumb-item', IsBreadcrumbItem, 'IsBreadcrumbItem');
})();
