import { adoptCss } from '../_shared/adopt-css.js';
import './toast-item.js';

/**
 * <is-toast> — Web Component (vanilla).
 *
 * Contenedor fijo de toasts. Los ítems son <is-toast-item> en light DOM
 * (proyección al stack) o creados vía create().
 *
 * Atributos
 *   placement  top-start | top-center | top-end |
 *              bottom-start | bottom-center | bottom-end  (default bottom-end)
 *
 * Métodos
 *   create(message, options?) → Promise<is-toast-item>
 *     options: { variant, icon, duration, allowHtml } — sin size
 *     variant: brand | success | warning | danger | neutral
 *     duration default 5000; 0 = hasta dismiss
 *
 * CSS Parts: ::part(stack)
 *
 * Escucha is-after-hide de los ítems y los elimina del DOM.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="stack" class="stack" role="region" aria-label="Notificaciones">
      <slot></slot>
    </div>
  `;

  const OBSERVED = ['placement'];
  const VALID_PLACEMENT = [
    'top-start', 'top-center', 'top-end',
    'bottom-start', 'bottom-center', 'bottom-end'
  ];
  const VALID_VARIANT = ['brand', 'success', 'warning', 'danger', 'neutral'];
  const DEFAULT_ICONS = {
    brand: 'mdi:information',
    success: 'mdi:check-circle',
    warning: 'mdi:alert',
    danger: 'mdi:alert-circle',
    neutral: 'mdi:information-outline'
  };

  class IsToast extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.addEventListener('is-after-hide', this.#onItemHide);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'bottom-end');
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'placement' && newVal && !VALID_PLACEMENT.includes(newVal)) {
        this.setAttribute('placement', 'bottom-end');
      }
    }

    get placement() {
      const v = this.getAttribute('placement');
      return VALID_PLACEMENT.includes(v) ? v : 'bottom-end';
    }
    set placement(v) {
      this.setAttribute('placement', VALID_PLACEMENT.includes(v) ? v : 'bottom-end');
    }

    /**
     * @param {string} message
     * @param {{ variant?: string, icon?: string|boolean, duration?: number, allowHtml?: boolean }} [options]
     * @returns {Promise<HTMLElement>}
     */
    async create(message, options = {}) {
      await customElements.whenDefined('is-toast-item');
      const item = document.createElement('is-toast-item');
      const variant = VALID_VARIANT.includes(options.variant) ? options.variant : 'neutral';
      item.variant = variant;

      const duration = options.duration != null ? Number(options.duration) : 5000;
      item.duration = Number.isFinite(duration) ? Math.max(0, duration) : 5000;

      if (options.allowHtml) {
        item.innerHTML = String(message ?? '');
      } else {
        item.textContent = String(message ?? '');
      }

      const iconOpt = options.icon;
      if (iconOpt !== false && iconOpt !== null) {
        const iconEl = document.createElement('is-icon');
        iconEl.setAttribute('slot', 'icon');
        iconEl.setAttribute('aria-hidden', 'true');
        const iconName = typeof iconOpt === 'string' && iconOpt
          ? iconOpt
          : DEFAULT_ICONS[variant];
        iconEl.setAttribute('icon', iconName);
        item.appendChild(iconEl);
      }

      this.appendChild(item);
      // Wait a frame so CSS/layout settle before show
      await new Promise((r) => requestAnimationFrame(() => r()));
      item.show();
      return item;
    }

    /**
     * Patrón Promise estilo react-hot-toast:
     *   toaster.promise(fetchData(), {
     *     loading: 'Cargando…',
     *     success: (data) => `${data.total} filas`,
     *     error: (err) => `Falló: ${err.message}`,
     *   })
     *
     * Cada callback acepta string | fn(valor) | { message, options }.
     * Reusa el MISMO toast (update) en vez de crear otro.
     *
     * @template T
     * @param {Promise<T>} p
     * @param {{ loading?: any, success?: any, error?: any }} [callbacks]
     * @returns {Promise<T>} la promesa original (re-throw en error)
     */
    async promise(p, callbacks = {}) {
      const loading = this.#normalizePromiseMsg(callbacks.loading, undefined, 'Cargando…');
      const item = await this.create(loading.message, {
        variant: 'neutral',
        icon: 'mdi:loading',
        duration: 0,
        ...loading.options,
      });
      item.querySelector('is-icon[slot="icon"]')?.setAttribute('data-loading', '');
      try {
        const data = await p;
        const ok = this.#normalizePromiseMsg(callbacks.success, data, 'Listo');
        this.#update(item, ok.message, { variant: 'success', icon: DEFAULT_ICONS.success, ...ok.options });
        return data;
      } catch (err) {
        const bad = this.#normalizePromiseMsg(callbacks.error, err, 'Algo salió mal');
        this.#update(item, bad.message, { variant: 'danger', icon: DEFAULT_ICONS.danger, ...bad.options });
        throw err;
      }
    }

    /** string | fn(valor) | { message, options } → { message, options } */
    #normalizePromiseMsg(cb, value, fallback) {
      if (typeof cb === 'function') return { message: String(cb(value)), options: {} };
      if (cb && typeof cb === 'object') return { message: String(cb.message ?? fallback), options: cb.options || {} };
      return { message: String(cb ?? fallback), options: {} };
    }

    /** Actualiza un toast vivo: mensaje, variant, icono y relanza el timer. */
    #update(item, message, options = {}) {
      if (!item?.isConnected) return;
      const variant = VALID_VARIANT.includes(options.variant) ? options.variant : item.variant;
      item.variant = variant;
      // Reemplazar texto conservando el slot icon.
      for (const n of [...item.childNodes]) {
        if (n.nodeType === Node.TEXT_NODE || (n instanceof HTMLElement && n.slot !== 'icon')) n.remove();
      }
      item.appendChild(document.createTextNode(String(message ?? '')));
      const iconEl = item.querySelector('is-icon[slot="icon"]');
      if (iconEl) {
        iconEl.removeAttribute('data-loading');
        if (options.icon) iconEl.setAttribute('icon', options.icon);
      }
      const duration = options.duration != null ? Number(options.duration) : 5000;
      item.duration = Number.isFinite(duration) ? Math.max(0, duration) : 5000;
      item.restartTimer?.();
    }

    #onItemHide = (e) => {
      const item = e.target;
      if (!(item instanceof HTMLElement) || item.localName !== 'is-toast-item') return;
      if (item.parentNode === this) {
        // Defer removal so listeners of is-after-hide still see the node
        queueMicrotask(() => {
          if (item.parentNode === this) item.remove();
        });
      }
    };
  }

  if (!customElements.get('is-toast')) {
    customElements.define('is-toast', IsToast);
  }
  if (typeof window !== 'undefined') {
    window.IsToast = IsToast;
  }
})();
