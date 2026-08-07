import { adoptCss } from '../_shared/adopt-css.js';
import { resolveIconRaw } from '../_shared/icon-loader.js';
import { defineElement } from '../_shared/define.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-icon> — Web Component (vanilla, zero dependencies).
 *
 * UNICA API de iconos del kit. No depende del web component `<iconify-icon>`
 * ni de ningun script externo: el SVG se trae por fetch desde el sistema de
 * iconos propio (`assets/icons/`, publicado en `dist/cdn/assets/icons/`) y se
 * inyecta INLINE en el Shadow DOM, para que `currentColor` del contexto se
 * propague al fill del path. Ver `_shared/icon-loader.js` para el orden de
 * las bases (bundle CDN -> fuente -> GitHub Pages -> jsDelivr).
 *
 * Atributos
 *   icon    string  — "grupo:nombre" Iconify (ej. mdi:home). Preferido.
 *   label   string  — a11y; si vacio -> aria-hidden
 *   src     string  — URL de un SVG propio (gana sobre icon)
 *
 * Compat: name + library (default mdi) se combinan a icon si falta `icon`.
 *
 * Estados: mientras resuelve marca `data-loading`; si el icono no existe en
 * ninguna base marca `data-missing` y no pinta nada (hueco del tamano del
 * icono, sin caja rota).
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="wrap" part="icon">
      <span class="inline" aria-hidden="true" hidden></span>
    </span>
  `;

  const OBSERVED = ['icon', 'name', 'library', 'label', 'src'];

  class IsIcon extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #inline;
    #mounted = false;
    #renderGen = 0;
    #abortCtrl = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#inline = shadow.querySelector('.inline');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#abort();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'label') { this.#syncA11y(); return; }
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
      setStringAttr(this, 'icon', v);
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    get src() { return this.getAttribute('src') ?? ''; }
    set src(v) { setStringAttr(this, 'src', v); }

    #abort() {
      if (this.#abortCtrl) {
        try { this.#abortCtrl.abort(); } catch { /* ya abortado */ }
        this.#abortCtrl = null;
      }
    }

    #syncA11y() {
      const label = this.label.trim();
      if (label) {
        this.removeAttribute('aria-hidden');
        this.setAttribute('role', 'img');
        this.setAttribute('aria-label', label);
      } else {
        this.setAttribute('aria-hidden', 'true');
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
      }
    }

    #clear() {
      this.#inline.innerHTML = '';
      this.#inline.setAttribute('hidden', '');
    }

    #paint(text) {
      this.#inline.innerHTML = text;
      this.#inline.removeAttribute('hidden');
      this.#normalizeInlineSvg();
      this.removeAttribute('data-missing');
    }

    async #render() {
      const gen = ++this.#renderGen;
      const src = this.src.trim();
      const icon = this.icon;

      this.#syncA11y();
      this.#abort();
      this.#abortCtrl = new AbortController();
      const { signal } = this.#abortCtrl;

      // src manual gana sobre icon.
      if (src) {
        this.setAttribute('data-loading', '');
        const text = await this.#fetchSvg(src, signal);
        if (gen !== this.#renderGen) return;
        this.removeAttribute('data-loading');
        if (text) this.#paint(text);
        else { this.#clear(); this.setAttribute('data-missing', ''); }
        return;
      }

      if (!icon) { this.#clear(); this.removeAttribute('data-missing'); return; }

      const sep = icon.indexOf(':');
      const prefix = sep > 0 ? icon.slice(0, sep) : '';
      const name = sep > 0 ? icon.slice(sep + 1) : '';
      if (!prefix || !name) { this.#clear(); this.setAttribute('data-missing', ''); return; }

      this.setAttribute('data-loading', '');
      let raw = null;
      try {
        raw = await resolveIconRaw(prefix, name, signal);
      } catch {
        raw = null; // red offline o abort
      }
      if (gen !== this.#renderGen) return;
      this.removeAttribute('data-loading');

      if (raw) this.#paint(raw);
      else { this.#clear(); this.setAttribute('data-missing', ''); }
    }

    /** Trae un SVG por URL (para el atributo `src`). */
    async #fetchSvg(url, signal) {
      try {
        // 'default', no 'force-cache': ver la nota en icon-loader.js. El
        // cache HTTP normal ya evita el trafico; force-cache ademas impide
        // que un SVG corregido llegue nunca al navegador.
        const res = await fetch(url, { signal, cache: 'default' });
        if (!res.ok) return null;
        const text = await res.text();
        return text.includes('<svg') ? text : null;
      } catch {
        return null;
      }
    }

    /**
     * Colores que significan "este icono es monocromo y su negro es
     * sustituible": el autor no eligio un color, es el negro por defecto.
     */
    static #NEUTRAL = new Set([
      'currentcolor', '#000', '#000000', '#000f', '#000000ff',
      'black', 'rgb(0,0,0)', 'rgb(0 0 0)',
    ]);

    /**
     * ¿El SVG trae paleta propia? Los sets multicolor (banderas, logos, emoji:
     * circle-flags, cif, logos, twemoji, openmoji, skill-icons…) pintan cada
     * path con su color. Aplastarlos a `currentColor` los convierte en una
     * silueta solida — el sintoma reportado: "CoreUI Flags se ven como bloques
     * oscuros en la rejilla, pero al abrir el icono si se ve".
     */
    static #isMulticolor(svg) {
      // Degradados, patrones e imagenes incrustadas: multicolor por definicion.
      if (svg.querySelector('linearGradient, radialGradient, pattern, image, stop')) return true;
      for (const el of svg.querySelectorAll('*')) {
        for (const attr of ['fill', 'stroke']) {
          const v = el.getAttribute(attr);
          if (!v || v === 'none') continue;
          if (!IsIcon.#NEUTRAL.has(v.trim().toLowerCase().replace(/\s+/g, ''))) return true;
        }
      }
      return false;
    }

    /**
     * Normaliza el SVG inline para que `currentColor` funcione aunque el
     * icono venga con fill="black" o fill="#000".
     *
     * Solo se normaliza el color si el icono es monocromo. Si tiene paleta
     * propia se respeta tal cual: `color`/`currentColor` no le aplican.
     */
    #normalizeInlineSvg() {
      const svg = this.#inline.querySelector('svg');
      if (!svg) return;
      // viewBox siempre; ancho/alto flexible a 1em. El viewBox no se toca: cada
      // coleccion tiene su grid nativo (24, 32, 512…) y reescribirlo deja el
      // path dibujado fuera de la caja = icono vacio.
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('width', '1em');
      svg.setAttribute('height', '1em');
      svg.setAttribute('focusable', 'false');

      if (IsIcon.#isMulticolor(svg)) {
        this.#inline.classList.add('is-multicolor');
        return;
      }
      this.#inline.classList.remove('is-multicolor');

      svg.style.fill = 'currentColor';
      // OJO: no forzar stroke a nivel de <svg> — los iconos de relleno no
      // traen stroke y anadirselo contornea cada path (se ven engrosados).
      for (const el of svg.querySelectorAll('*')) {
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (fill && fill !== 'none') el.style.fill = 'currentColor';
        if (stroke && stroke !== 'none') el.style.stroke = 'currentColor';
      }
    }
  }

  defineElement('is-icon', IsIcon, 'IsIcon');
})();
