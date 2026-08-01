import { adoptCss } from '../_shared/adopt-css.js';
import { resolveIconRaw, ensureIconify } from '../_shared/iconify-loader.js';

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
      <span class="inline" aria-hidden="true" hidden></span>
      <iconify-icon class="ii" aria-hidden="true" hidden></iconify-icon>
    </span>
  `;

  const OBSERVED = ['icon', 'name', 'library', 'label', 'src', 'fallback'];

  class IsIcon extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #ii;
    #inline;
    #inlineErrored = false;
    #mounted = false;
    #renderGen = 0;
    #abortCtrl = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#inline = shadow.querySelector('.inline');
      this.#ii = shadow.querySelector('.ii');
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
        this.#inline.innerHTML = '';
        this.#inlineErrored = false;
        await this.#mountInlineFromUrl(src, gen);
        return;
      }

      // Caso 2: icono Iconify
      this.#inline.innerHTML = '';
      this.#ii.setAttribute('hidden', '');
      this.#ii.removeAttribute('icon');

      if (!icon) return;

      const [prefix, name] = icon.split(':', 2);
      if (!prefix || !name) return;

      // Intentar SVG inline (local, jsDelivr o Iconify API)
      try {
        const raw = await resolveIconRaw(prefix, name, this.#abortCtrl.signal);
        if (raw && gen === this.#renderGen) {
          this.#ii.setAttribute('hidden', '');
          this.#ii.removeAttribute('icon');
          this.#inlineErrored = false;
          this.#inline.innerHTML = raw;
          this.#inline.removeAttribute('hidden');
          // Asegurarse de que el SVG inline herede `currentColor`.
          this.#normalizeInlineSvg();
          return;
        }
      } catch {
        // Error de red; caer a fallback si procede.
      }

      if (gen !== this.#renderGen) return;

      // Caso 3: fallback a <iconify-icon>
      if (this.fallback === 'none') {
        this.#inline.setAttribute('hidden', '');
        return;
      }
      try {
        await ensureIconify();
      } catch {
        this.#inline.setAttribute('hidden', '');
        return;
      }
      if (!this.#mounted || gen !== this.#renderGen) return;
      this.#inline.setAttribute('hidden', '');
      this.#ii.removeAttribute('hidden');
      this.#ii.setAttribute('icon', icon);
      this.#ii.removeAttribute('width');
      this.#ii.removeAttribute('height');
    }

    /**
     * Caso `src` manual (URL absoluta): trae el raw SVG por fetch y lo
     * inyecta inline. Si falla, no cae al fallback (es un src del usuario).
     */
    async #mountInlineFromUrl(url, gen) {
      try {
        const res = await fetch(url, { signal: this.#abortCtrl.signal });
        if (!res.ok) throw new Error('svg fetch failed');
        const text = await res.text();
        if (gen !== this.#renderGen || !text.includes('<svg')) return;
        this.#inline.innerHTML = text;
        this.#inline.removeAttribute('hidden');
        this.#normalizeInlineSvg();
      } catch {
        this.#inline.setAttribute('hidden', '');
      }
    }

    /**
     * Normaliza el SVG inline para que `currentColor` funcione aunque el
     * icono venga con fill="black" o fill="#000" del CDN. Forzamos
     * fill="currentColor" y stroke="currentColor" en todos los hijos.
     */
    #normalizeInlineSvg() {
      const svg = this.#inline.querySelector('svg');
      if (!svg) return;
      // viewBox siempre; ancho/alto flexible a 1em.
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('width', '1em');
      svg.setAttribute('height', '1em');
      svg.setAttribute('focusable', 'false');
      svg.style.fill = 'currentColor';
      svg.style.stroke = 'currentColor';
      for (const el of svg.querySelectorAll('*')) {
        // No pisar elementos sin fill/stroke.
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (fill && fill !== 'none') el.style.fill = 'currentColor';
        if (stroke && stroke !== 'none') el.style.stroke = 'currentColor';
      }
    }
  }

  if (!customElements.get('is-icon')) {
    customElements.define('is-icon', IsIcon);
  }
  if (typeof window !== 'undefined') window.IsIcon = IsIcon;
})();