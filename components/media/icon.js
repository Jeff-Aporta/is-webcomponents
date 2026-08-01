import { adoptCss } from '../_shared/adopt-css.js';
import { resolveIconSvg, ensureIconify } from '../_shared/iconify-loader.js';

/**
 * <is-icon> — Web Component (vanilla).
 *
 * Resolucion de iconos, en orden:
 *
 *   1. Local: si `assets/icons/{prefix}/{name}.svg` existe (descargado por
 *      `node scripts/download-icons.mjs`), se sirve como <img>.
 *   2. CDN: si falla el local o no existe, se sirve el .svg desde
 *      https://api.iconify.design/{prefix}/{name}.svg
 *   3. Fallback final: <iconify-icon> (CDN iconify.min.js) si fetch falla
 *      por red o porque el navegador esta offline.
 *
 * Atributos
 *   icon    string  — "grupo:nombre" Iconify (ej. mdi:home). Preferido.
 *   label   string  — a11y; si vacío → aria-hidden
 *   src     string  — URL img/svg alternativa (gana sobre icon)
 *
 * Compat: name + library (default mdi) se combinan a icon si falta `icon`.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="wrap" part="icon">
      <img class="img" alt="" hidden />
      <iconify-icon class="ii" aria-hidden="true" hidden></iconify-icon>
    </span>
  `;

  const OBSERVED = ['icon', 'name', 'library', 'label', 'src', 'fallback'];

  class IsIcon extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #ii;
    #img;
    #imgErrored = false;
    #mounted = false;
    #renderGen = 0;
    #abortCtrl = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#img = shadow.querySelector('.img');
      this.#ii = shadow.querySelector('.ii');
      this.#img.addEventListener('error', () => this.#onImgError());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    disconnectedCallback() {
      if (this.#abortCtrl) {
        try { this.#abortCtrl.abort(); } catch {}
        this.#abortCtrl = null;
      }
    }

    attributeChangedCallback(_n, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (_n === 'src' || _n === 'icon' || _n === 'name' || _n === 'library' || _n === 'fallback') {
        this.#render();
      }
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

    /**
     * Política de fallback. "iconify" (default) cae a <iconify-icon> en CDN
     * si el SVG local/remoto falla. "none" deja el slot vacío.
     */
    get fallback() { return this.getAttribute('fallback') || 'iconify'; }
    set fallback(v) { v == null || v === '' ? this.removeAttribute('fallback') : this.setAttribute('fallback', v); }

    async #render() {
      const gen = ++this.#renderGen;
      const src = this.src.trim();
      const label = this.label.trim();
      const icon = this.icon;

      // a11y
      if (label) {
        this.removeAttribute('aria-hidden');
        this.setAttribute('role', 'img');
        this.setAttribute('aria-label', label);
      } else {
        this.setAttribute('aria-hidden', 'true');
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
      }

      // Cancelar fetch anterior
      if (this.#abortCtrl) {
        try { this.#abortCtrl.abort(); } catch {}
      }
      this.#abortCtrl = new AbortController();

      // Caso 1: src manual
      if (src) {
        this.#ii.setAttribute('hidden', '');
        this.#ii.removeAttribute('icon');
        this.#img.removeAttribute('hidden');
        this.#img.alt = label;
        this.#imgErrored = false;
        this.#img.src = src;
        return;
      }

      // Caso 2: icono Iconify
      this.#img.setAttribute('hidden', '');
      this.#img.removeAttribute('src');

      if (!icon) {
        this.#ii.setAttribute('hidden', '');
        this.#ii.removeAttribute('icon');
        return;
      }

      const [prefix, name] = icon.split(':', 2);
      if (!prefix || !name) {
        this.#ii.setAttribute('hidden', '');
        return;
      }

      // Intentar SVG directo (local o CDN api)
      try {
        const svgUrl = await resolveIconSvg(prefix, name);
        if (svgUrl && gen === this.#renderGen) {
          this.#ii.setAttribute('hidden', '');
          this.#ii.removeAttribute('icon');
          this.#img.removeAttribute('hidden');
          this.#img.alt = label;
          this.#imgErrored = false;
          this.#img.src = svgUrl;
          return;
        }
      } catch {
        // Error de red; caer a fallback si procede.
      }

      if (gen !== this.#renderGen) return;

      // Caso 3: fallback a <iconify-icon>
      if (this.fallback === 'none') {
        this.#ii.setAttribute('hidden', '');
        this.#ii.removeAttribute('icon');
        return;
      }
      try {
        await ensureIconify();
      } catch {
        this.#ii.setAttribute('hidden', '');
        return;
      }
      if (!this.#mounted || gen !== this.#renderGen) return;
      this.#ii.removeAttribute('hidden');
      this.#ii.setAttribute('icon', icon);
      this.#ii.removeAttribute('width');
      this.#ii.removeAttribute('height');
    }

    /** Cuando el SVG local/remoto falla (404, etc.), cae al <iconify-icon>. */
    #onImgError() {
      if (this.#imgErrored) return;
      this.#imgErrored = true;
      this.#img.setAttribute('hidden', '');
      this.#img.removeAttribute('src');
      const icon = this.icon;
      if (!icon) return;
      if (this.fallback === 'none') return;
      ensureIconify()
        .then(() => {
          if (!this.#mounted) return;
          this.#ii.removeAttribute('hidden');
          this.#ii.setAttribute('icon', icon);
        })
        .catch(() => {});
    }
  }

  if (!customElements.get('is-icon')) {
    customElements.define('is-icon', IsIcon);
  }
  if (typeof window !== 'undefined') window.IsIcon = IsIcon;
})();