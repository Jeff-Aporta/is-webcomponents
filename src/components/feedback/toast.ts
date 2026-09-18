import { adoptCss, defineElement } from '../../core/element.js';
import './toast-item.js';
import { ElementBase } from '../../core/element-base.js';
import { normalizeIntent } from '../_shared/intent.js';

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
 *     options: { color, icon, duration, allowHtml, caption, log } — sin size
 *     color: brand | success | warning | danger | neutral
 *     caption: texto menor bajo el título (slot caption)
 *     log: payload de consola; viaja en is-after-show, no se pinta
 *     duration default 5000; 0 = hasta dismiss
 *
 * Estáticos (paridad con ISP `overlays/Toaster.svelte`)
 *   IsToast.host()                    → el <is-toast> singleton del documento
 *   IsToast.error(msg, duration?)     → toast danger   (default 5000 ms)
 *   IsToast.success(msg, duration?)   → toast success  (default 3000 ms)
 *   IsToast.loading(msg)              → toast persistente con spinner
 *   IsToast.remove(item)              → quita un toast devuelto por los anteriores
 *   IsToast.promise(p, callbacks)     → atajo de host().promise(...)
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
  ] as const;
  type Placement = (typeof VALID_PLACEMENT)[number];

  type ToastColor = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  const DEFAULT_ICONS: Record<ToastColor, string> = {
    brand: 'mdi:information',
    success: 'mdi:check-circle',
    warning: 'mdi:alert',
    danger: 'mdi:alert-circle',
    neutral: 'mdi:information-outline'
  };

  interface ToastCreateOptions {
    color?: string;
    variant?: string;
    icon?: string | boolean | null;
    duration?: number | null;
    allowHtml?: boolean;
    caption?: string;
    log?: unknown;
  }

  interface ToastPromiseCallbacks {
    loading?: string | ToastPromiseMsg | ((value: unknown) => unknown);
    success?: string | ToastPromiseMsg | ((value: unknown) => unknown);
    error?: string | ToastPromiseMsg | ((value: unknown) => unknown);
  }

  interface ToastPromiseMsg {
    message: string;
    options?: ToastCreateOptions;
  }

  interface NormalizedMsg {
    message: string;
    options: ToastCreateOptions;
  }

  interface IsToastItemEl extends HTMLElement {
    color?: string;
    duration?: number;
    log?: unknown;
    show(): void;
    restartTimer?(): void;
  }

  class IsToast extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.addEventListener('is-after-hide', this.#onItemHide);
    }

    onConnected(): void {
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'bottom-end');
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
      if (name === 'placement' && newVal && !VALID_PLACEMENT.includes(newVal as Placement)) {
        this.setAttribute('placement', 'bottom-end');
      }
    }

    get placement(): Placement {
      const v = this.getAttribute('placement');
      return (VALID_PLACEMENT as readonly string[]).includes(v ?? '') ? (v as Placement) : 'bottom-end';
    }
    set placement(v: string) {
      this.setAttribute('placement', (VALID_PLACEMENT as readonly string[]).includes(v) ? v : 'bottom-end');
    }

    async create(message: string, options: ToastCreateOptions = {}): Promise<IsToastItemEl> {
      await customElements.whenDefined('is-toast-item');
      const item = document.createElement('is-toast-item') as IsToastItemEl;
      const color = normalizeIntent(options.color ?? options.variant, 'neutral') as ToastColor;
      item.color = color;

      const duration = options.duration != null ? Number(options.duration) : 5000;
      item.duration = Number.isFinite(duration) ? Math.max(0, duration) : 5000;
      this.#writeCopy(item, message, options);

      const iconOpt = options.icon;
      if (iconOpt !== false && iconOpt !== null) {
        const iconEl = document.createElement('is-icon');
        iconEl.setAttribute('slot', 'icon');
        iconEl.setAttribute('aria-hidden', 'true');
        const iconName = typeof iconOpt === 'string' && iconOpt
          ? iconOpt
          : DEFAULT_ICONS[color];
        iconEl.setAttribute('icon', iconName);
        item.appendChild(iconEl);
      }

      this.appendChild(item);
      // Wait a frame so CSS/layout settle before show
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
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
     */
    async promise<T>(p: Promise<T>, callbacks: ToastPromiseCallbacks = {}): Promise<T> {
      const loading = this.#normalizePromiseMsg(callbacks.loading, undefined, 'Cargando…');
      const item = await this.create(loading.message, {
        variant: 'neutral',
        icon: 'mdi:loading',
        duration: 0,
        ...loading.options,
      });
      item.querySelector<HTMLElement>('is-icon[slot="icon"]')?.setAttribute('data-loading', '');
      try {
        const data = await p;
        const ok = this.#normalizePromiseMsg(callbacks.success, data, 'Listo');
        this.#update(item, ok.message, { variant: 'success', icon: DEFAULT_ICONS.success, ...ok.options });
        return data;
      } catch (err: unknown) {
        const bad = this.#normalizePromiseMsg(callbacks.error, err, 'Algo salió mal');
        this.#update(item, bad.message, { variant: 'danger', icon: DEFAULT_ICONS.danger, ...bad.options });
        throw err;
      }
    }

    /** string | fn(valor) | { message, options } → { message, options } */
    #normalizePromiseMsg(
      cb: string | ToastPromiseMsg | ((value: unknown) => unknown) | undefined,
      value: unknown,
      fallback: string,
    ): NormalizedMsg {
      if (typeof cb === 'function') return { message: String(cb(value)), options: {} };
      if (cb && typeof cb === 'object') {
        return { message: String(cb.message ?? fallback), options: cb.options || {} };
      }
      return { message: String(cb ?? fallback), options: {} };
    }

    #writeCopy(item: IsToastItemEl, message: string, options: ToastCreateOptions = {}): void {
      for (const n of [...item.childNodes]) {
        if (n.nodeType === Node.TEXT_NODE || (n instanceof HTMLElement && n.slot !== 'icon')) n.remove();
      }
      if (options.allowHtml) item.insertAdjacentHTML('afterbegin', String(message ?? ''));
      else item.insertBefore(document.createTextNode(String(message ?? '')), item.firstChild);
      item.log = options.log;
      const caption = String(options.caption ?? '').trim();
      if (caption) {
        const el = document.createElement('span');
        el.slot = 'caption';
        el.textContent = caption;
        item.appendChild(el);
      }
    }

    /** Actualiza un toast vivo: mensaje, color, icono y relanza el timer. */
    #update(item: IsToastItemEl, message: string, options: ToastCreateOptions = {}): void {
      if (!item?.isConnected) return;
      const color = normalizeIntent(
        options.color ?? options.variant ?? item.color,
        'neutral',
      ) as ToastColor;
      item.color = color;
      this.#writeCopy(item, message, options);
      const iconEl = item.querySelector<HTMLElement>('is-icon[slot="icon"]');
      if (iconEl) {
        iconEl.removeAttribute('data-loading');
        if (options.icon) iconEl.setAttribute('icon', String(options.icon));
      }
      const duration = options.duration != null ? Number(options.duration) : 5000;
      item.duration = Number.isFinite(duration) ? Math.max(0, duration) : 5000;
      item.restartTimer?.();
    }

    // ---- API imperativa (paridad con overlays/Toaster.svelte de ISP) -----
    // ISP expone funciones sueltas (toastError/Success/Loading/Promise/Remove).
    // Aquí viven como estáticas para no ensuciar el scope global: resuelven
    // (o crean) un único <is-toast> en el documento.

    /** Toaster singleton del documento; lo crea si aún no existe. */
    static host(): IsToast {
      let el = document.querySelector<HTMLElement>('is-toast[data-default-toaster]') as IsToast | null;
      if (!el) {
        el = document.querySelector<HTMLElement>('is-toast') as IsToast | null;
        if (!el) {
          el = document.createElement('is-toast') as IsToast;
          el.setAttribute('data-default-toaster', '');
          document.body.appendChild(el);
        }
      }
      return el;
    }

    static error(message: string, duration: number | ToastCreateOptions = 5000): Promise<IsToastItemEl> {
      const extra = duration && typeof duration === 'object' ? duration : { duration };
      return IsToast.host().create(message, { variant: 'danger', ...extra });
    }

    static success(message: string, duration: number = 3000): Promise<IsToastItemEl> {
      return IsToast.host().create(message, { variant: 'success', duration });
    }

    /** Sin duración: se cierra con IsToast.remove(item). */
    static loading(message: string): Promise<IsToastItemEl> {
      return IsToast.host().create(message, { variant: 'neutral', icon: 'mdi:loading', duration: 0 });
    }

    static remove(item: IsToastItemEl | HTMLElement | null | undefined): void {
      (item as { remove?: () => void } | null)?.remove?.();
    }

    /** @see IsToast.prototype.promise */
    static promise<T>(p: Promise<T>, callbacks: ToastPromiseCallbacks = {}): Promise<T> {
      return IsToast.host().promise(p, callbacks);
    }

    #onItemHide = (e: Event): void => {
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

  defineElement('is-toast', IsToast, 'IsToast');
})();
