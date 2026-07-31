import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-icon> — Web Component (vanilla).
 *
 * Envuelve <iconify-icon> (cargado una vez desde CDN) o una imagen/SVG vía src.
 * API pública única de iconos del kit — no usar <iconify-icon> en light DOM.
 *
 * Atributos
 *   icon    string  — "grupo:nombre" Iconify (ej. mdi:home). Preferido.
 *   label   string  — a11y; si vacío → aria-hidden
 *   src     string  — URL img/svg alternativa (gana sobre icon)
 *
 * Compat: name + library (default mdi) se combinan a icon si falta `icon`.
 */

(() => {
  const ICONIFY_SRC = 'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js';
  let iconifyReady = null;

  function ensureIconify() {
    if (customElements.get('iconify-icon')) return Promise.resolve();
    if (iconifyReady) return iconifyReady;
    iconifyReady = new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((s) => s.src.includes('iconify-icon'));
      if (existing) {
        customElements.whenDefined('iconify-icon').then(resolve, reject);
        return;
      }
      const el = document.createElement('script');
      el.src = ICONIFY_SRC;
      el.async = true;
      el.onload = () => customElements.whenDefined('iconify-icon').then(resolve, reject);
      el.onerror = () => reject(new Error('iconify-icon CDN failed'));
      document.head.appendChild(el);
    });
    return iconifyReady;
  }

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="wrap" part="icon">
      <iconify-icon class="ii" aria-hidden="true"></iconify-icon>
      <img class="img" alt="" hidden />
    </span>
  `;

  const OBSERVED = ['icon', 'name', 'library', 'label', 'src'];

  class IsIcon extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #ii;
    #img;
    #mounted = false;
    #renderGen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#ii = shadow.querySelector('.ii');
      this.#img = shadow.querySelector('.img');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    attributeChangedCallback(_n, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    /** Iconify id completo: "mdi:home" */
    get icon() {
      const raw = (this.getAttribute('icon') || '').trim();
      if (raw) return raw;
      const name = (this.getAttribute('name') || '').trim();
      if (!name) return '';
      if (name.includes(':')) return name;
      const lib = (this.getAttribute('library') || 'mdi').trim() || 'mdi';
      return `${lib}:${name}`;
    }
    set icon(v) {
      v == null || v === '' ? this.removeAttribute('icon') : this.setAttribute('icon', v);
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null || v === '' ? this.removeAttribute('label') : this.setAttribute('label', v); }

    get src() { return this.getAttribute('src') ?? ''; }
    set src(v) { v == null || v === '' ? this.removeAttribute('src') : this.setAttribute('src', v); }

    async #render() {
      const gen = ++this.#renderGen;
      const src = this.src.trim();
      const label = this.label.trim();
      const icon = this.icon;

      if (label) {
        this.removeAttribute('aria-hidden');
        this.setAttribute('role', 'img');
        this.setAttribute('aria-label', label);
      } else {
        this.setAttribute('aria-hidden', 'true');
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
      }

      if (src) {
        this.#ii.removeAttribute('icon');
        this.#ii.setAttribute('hidden', '');
        this.#img.removeAttribute('hidden');
        this.#img.src = src;
        this.#img.alt = label;
        return;
      }

      this.#img.setAttribute('hidden', '');
      this.#img.removeAttribute('src');
      this.#ii.removeAttribute('hidden');

      if (!icon) {
        this.#ii.removeAttribute('icon');
        return;
      }

      try {
        await ensureIconify();
      } catch {
        /* sin CDN el slot queda vacío */
        return;
      }
      if (!this.#mounted || gen !== this.#renderGen) return;

      this.#ii.setAttribute('icon', icon);
      this.#ii.removeAttribute('width');
      this.#ii.removeAttribute('height');
    }
  }

  if (!customElements.get('is-icon')) {
    customElements.define('is-icon', IsIcon);
  }
  if (typeof window !== 'undefined') window.IsIcon = IsIcon;
})();
