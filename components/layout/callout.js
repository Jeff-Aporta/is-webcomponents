import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-callout> — Web Component (vanilla, zero dependencies).
 *
 * Mensaje en línea con borde y fondo suaves. Pensado para tips, info, warnings
 * y errores que el usuario no debe pasar por alto.
 *
 * Modelo equivalente a wa-callout (Web Awesome) / v-alert.
 *
 * Atributos
 *   variant     brand | neutral | success | warning | danger
 *               (default 'neutral', reflected)
 *   appearance  accent | filled | outlined | filled-outlined | plain
 *               (default 'filled-outlined', reflected)
 *   icon        nombre Iconify para mostrar a la izquierda (ej. "mdi:bell").
 *               Si no se da, se elige uno por variante.
 *
 * Slots
 *   (default)  mensaje principal
 *   icon       icono propio (gana sobre el atributo icon)
 *
 * CSS Parts:  ::part(icon)  ::part(message)
 *
 * CSS custom properties
 *   --spacing        espacio alrededor del callout (default var(--is-space-l, 1rem))
 *   --callout-bg     fondo computado por variant/appearance
 *   --callout-border color del borde
 *   --callout-text   color del texto
 *   --callout-accent color del icono
 *
 * Eventos: ninguno propio (customizable vía slotted buttons).
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="callout" part="base">
      <span class="icon" part="icon" aria-hidden="true">
        <slot name="icon">
          <is-icon class="default-icon" aria-hidden="true"></is-icon>
        </slot>
      </span>
      <div class="message" part="message">
        <slot></slot>
      </div>
    </div>
  `;

  const OBSERVED = ['variant', 'appearance', 'icon'];

  const VALID_VARIANT = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const VALID_APPEARANCE = ['accent', 'filled', 'outlined', 'filled-outlined', 'plain'];

  const ICON_BY_VARIANT = {
    brand: 'mdi:information-outline',
    neutral: 'mdi:information-outline',
    success: 'mdi:check-circle-outline',
    warning: 'mdi:alert-outline',
    danger: 'mdi:alert-octagon-outline',
  };

  class IsCallout extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #defaultIcon;
    #customIconObserver;
    #lastIconName = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#defaultIcon = shadow.querySelector('.default-icon');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProperties();
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'neutral');
      if (!this.hasAttribute('appearance')) this.setAttribute('appearance', 'filled-outlined');

      // ¿El usuario puso un <is-icon slot="icon"> manualmente?
      const slotted = this.querySelector(':scope > [slot="icon"]');
      if (slotted) {
        this.#defaultIcon.hidden = true;
      } else {
        this.#syncDefaultIcon();
      }

      // Reaccionar a cambios en el slotted icon.
      this.#customIconObserver = new MutationObserver(() => this.#syncDefaultIcon());
      this.#customIconObserver.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'] });
    }

    disconnectedCallback() {
      this.#customIconObserver?.disconnect();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'variant' && newVal && !VALID_VARIANT.includes(newVal)) {
        this.setAttribute('variant', 'neutral');
        return;
      }
      if (name === 'appearance' && newVal && !VALID_APPEARANCE.includes(newVal)) {
        this.setAttribute('appearance', 'filled-outlined');
        return;
      }
      if (name === 'icon') this.#syncDefaultIcon();
    }

    // ---- properties ----

    get variant() {
      const v = this.getAttribute('variant');
      return VALID_VARIANT.includes(v) ? v : 'neutral';
    }
    set variant(v) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (VALID_VARIANT.includes(v)) this.setAttribute('variant', v);
    }

    get appearance() {
      const v = this.getAttribute('appearance');
      return VALID_APPEARANCE.includes(v) ? v : 'filled-outlined';
    }
    set appearance(v) {
      if (v == null || v === '') this.removeAttribute('appearance');
      else if (VALID_APPEARANCE.includes(v)) this.setAttribute('appearance', v);
    }

    get icon() { return this.getAttribute('icon') || ''; }
    set icon(v) {
      if (v == null) this.removeAttribute('icon');
      else this.setAttribute('icon', v);
    }

    // ---- private ----

    #upgradeProperties() {
      for (const a of OBSERVED) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          if (v != null) this.setAttribute(a, v);
        }
      }
    }

    #syncDefaultIcon() {
      const slotted = this.querySelector(':scope > [slot="icon"]');
      if (slotted) {
        // Usuario aportó icono propio: ocultar el default.
        this.#defaultIcon.hidden = true;
        this.toggleAttribute('data-no-icon', !this.hasAttribute('icon'));
        return;
      }
      this.#defaultIcon.hidden = false;
      this.removeAttribute('data-no-icon');
      const explicit = this.getAttribute('icon');
      const variant = this.variant;
      const targetName = explicit || ICON_BY_VARIANT[variant] || ICON_BY_VARIANT.neutral;
      if (targetName === this.#lastIconName) return;
      this.#lastIconName = targetName;
      // Resolver tras el próximo microtask para asegurar que is-icon está definido.
      queueMicrotask(() => {
        if (!this.#defaultIcon.isConnected) return;
        if (typeof this.#defaultIcon.icon === 'string' || 'icon' in this.#defaultIcon) {
          this.#defaultIcon.icon = targetName;
        }
      });
    }
  }

  if (!customElements.get('is-callout')) {
    customElements.define('is-callout', IsCallout);
  }
  if (typeof window !== 'undefined') {
    window.IsCallout = IsCallout;
  }
})();
