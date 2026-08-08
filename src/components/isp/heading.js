import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import {
  classifyColor,
  normalizeMix,
  syncIspColor,
} from '../_shared/isp-color.js';

/**
 * <is-heading> — port de ISP `typography/H1.svelte` … `H6.svelte`.
 *
 * Atributos
 *   level      1 | 2 | 3 | 4 | 5 | 6                       (default 1)
 *   color      brand | neutral | info | success | warning | danger
 *              | current | <color CSS>                     (default: acento)
 *   mix        % → `--h-mix`; ausente = default del nivel
 *   mix-with   text | transparent | white | black | current | <color CSS>
 *              (default: texto del tema)
 *   size       string CSS → `--h-size`; ausente = default del nivel
 *
 * `current` hereda el color tipográfico del contexto (`currentColor`).
 * Cualquier otro string no semántico se usa como color CSS tal cual.
 */

(() => {
  const LEVELS = ['1', '2', '3', '4', '5', '6'];
  const DEFAULT_MIX = { 1: '15%', 2: '30%', 3: '45%', 4: '65%', 5: '80%', 6: '90%' };

  class IsHeading extends ElementBase {
    static get observedAttributes() {
      return ['level', 'color', 'mix', 'mix-with', 'size'];
    }

    #heading = null;

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    onConnected() {
      if (!this.hasAttribute('level')) this.setAttribute('level', '1');
      this.#render();
      this.#syncVars();
    }

    onAttributeChanged(name, _oldVal, newVal) {
      if (name === 'level') {
        if (newVal && !LEVELS.includes(newVal)) { this.setAttribute('level', '1'); return; }
        this.#render();
        this.#syncVars();
        return;
      }
      if (name === 'color' || name === 'mix' || name === 'mix-with' || name === 'size') {
        this.#syncVars();
      }
    }

    #syncVars() {
      syncIspColor(this, {
        colorVar: '--h-clr',
        mixVar: '--h-mix',
        mixWithVar: '--h-mix-with',
      });

      // mix: si el attr está ausente, quitar override para que gane el default del nivel.
      const mix = normalizeMix(this.getAttribute('mix'));
      if (!mix) this.style.removeProperty('--h-mix');

      const size = this.getAttribute('size');
      if (size != null && String(size).trim() !== '') {
        this.style.setProperty('--h-size', String(size).trim());
      } else {
        this.style.removeProperty('--h-size');
      }
    }

    /** Reemplaza SOLO el <hN>; los <link> que puso adoptCss se conservan. */
    #render() {
      const level = this.level;
      const tag = `h${level}`;
      if (this.#heading && this.#heading.localName === tag) return;

      const next = document.createElement(tag);
      next.setAttribute('part', 'heading');
      next.className = 'heading';
      next.appendChild(document.createElement('slot'));

      if (this.#heading) this.#heading.replaceWith(next);
      else this.shadowRoot.appendChild(next);
      this.#heading = next;
    }

    get level() {
      const v = this.getAttribute('level');
      return LEVELS.includes(v) ? v : '1';
    }
    set level(v) {
      const s = String(v);
      if (LEVELS.includes(s)) this.setAttribute('level', s);
      else this.removeAttribute('level');
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

    get size() { return this.getAttribute('size'); }
    set size(v) {
      if (v == null || v === '') this.removeAttribute('size');
      else this.setAttribute('size', String(v));
    }

    get computedMix() {
      return normalizeMix(this.mix) || DEFAULT_MIX[this.level] || '15%';
    }

    /** @returns {'none'|'semantic'|'current'|'css'} */
    get colorKind() {
      return classifyColor(this.color).kind;
    }
  }

  defineElement('is-heading', IsHeading, 'IsHeading');
})();
