import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import {
  classifyColor,
  normalizeMix,
  syncIspColor,
} from '../_shared/isp-color.js';

/**
 * <is-text> — port de ISP `typography/Text.svelte`.
 *
 * Atributos
 *   color      brand | neutral | info | success | warning | danger
 *              | current | <color CSS>
 *              Ausente → hereda el color del contexto.
 *   mix        % → mezcla hacia `mix-with` (atenuar / aclarar / oscurecer).
 *   mix-with   text | transparent | white | black | current | <color CSS>
 *              (default: texto del tema)
 *   lines      number >= 1 → clamp con ellipsis. 0 / ausente = sin clamp.
 *
 * `current` fuerza `currentColor` (útil junto a `mix` sobre el color heredado).
 * Strings no semánticos se aplican como color CSS/HTML natural.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  class IsText extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'mix-with': { prop: '--is-text-mix-with', onlyColorValues: true },
    };

    static TEMPLATE = TEMPLATE;
    static get observedAttributes() {
      return ['color', 'mix', 'mix-with', 'lines'];
    }

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    onConnected() {
      this.#syncColor();
      this.#syncLines();
    }

    onAttributeChanged(name) {
      if (name === 'lines') this.#syncLines();
      else if (name === 'color' || name === 'mix' || name === 'mix-with') this.#syncColor();
    }

    #syncColor() {
      syncIspColor(this, {
        colorVar: '--is-text-color',
        mixVar: '--is-text-mix',
        mixWithVar: '--is-text-mix-with',
      });
      // Sin attr mix → no forzar --text-mix (el CSS solo mezcla si hay [mix]).
      if (!normalizeMix(this.getAttribute('mix'))) {
        this.style.removeProperty('--is-text-mix');
      }
      this.toggleAttribute('data-has-mix', !!normalizeMix(this.getAttribute('mix')));
    }

    #syncLines() {
      const raw = this.getAttribute('lines');
      const n = raw == null || raw === '' ? 0 : Math.max(0, Math.floor(Number(raw)));
      if (Number.isFinite(n) && n >= 1) this.style.setProperty('--mx-lns', String(n));
      else this.style.removeProperty('--mx-lns');
    }

    get color() { return this.getAttribute('color'); }
    set color(v) {
      if (v == null || v === '') this.removeAttribute('color');
      else this.setAttribute('color', String(v));
    }

    get mix() { return this.getAttribute('mix'); }
    set mix(v) {
      if (v == null || v === '') this.removeAttribute('mix');
      else this.setAttribute('mix', String(v));
    }

    get mixWith() { return this.getAttribute('mix-with'); }
    set mixWith(v) {
      if (v == null || v === '') this.removeAttribute('mix-with');
      else this.setAttribute('mix-with', String(v));
    }

    get lines() { return Number(this.getAttribute('lines') ?? 0) || 0; }
    set lines(v) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n >= 1) this.setAttribute('lines', String(n));
      else this.removeAttribute('lines');
    }

    /** @returns {'none'|'semantic'|'current'|'css'} */
    get colorKind() {
      return classifyColor(this.color).kind;
    }
  }

  defineElement('is-text', IsText, 'IsText');
})();
