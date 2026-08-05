import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-heading> — port de ISP `typography/H1.svelte` … `H6.svelte`.
 *
 * ISP tenía seis componentes idénticos salvo por el tag y el `--h-mix`
 * (15/30/45/65/80/90 %). Aquí es UN módulo con el atributo `level` (1-6): el
 * shadow root construye el `<hN>` real, así que la semántica y el árbol de
 * accesibilidad se conservan sin duplicar seis archivos.
 *
 * Color: ISP pintaba `color-mix(in srgb, var(--h-clr), var(--is-color) --h-mix)`,
 * con `--h-clr` = `colorVar(color, "primary")`, es decir tintado de marca por
 * defecto y cada vez más cercano al color de texto según baja el nivel. Aquí
 * `--h-clr` cae a `--is-accent` / `--is-color-brand-500` y el color de mezcla
 * es `--is-text` (equivalente de `--is-color` en este kit).
 *
 * Atributos
 *   level   1 | 2 | 3 | 4 | 5 | 6                       (default 1, reflejado)
 *   color   brand | neutral | info | success | warning | danger  (default brand)
 *
 * No hay atributo `size`: la escala de cada nivel es en `em` sobre el
 * `font-size` heredado.
 */

(() => {
  const LEVELS = ['1', '2', '3', '4', '5', '6'];

  class IsHeading extends ElementBase {
    static get observedAttributes() { return ['level', 'color']; }
    // El attributeChangedCallback lo aporta ElementBase; aquí va el hook.

    #heading = null;

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
      // El <hN> se construye en connect: el constructor no debe leer atributos
      // ni tocar el DOM del host (regla de custom elements).
    }

    onConnected() {
      if (!this.hasAttribute('level')) this.setAttribute('level', '1');
      this.#render();
    }

    onAttributeChanged(name, _oldVal, newVal) {
      if (name !== 'level') return;
      if (newVal && !LEVELS.includes(newVal)) { this.setAttribute('level', '1'); return; }
      this.#render();
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
    set color(v) { v ? this.setAttribute('color', v) : this.removeAttribute('color'); }
  }

  if (!customElements.get('is-heading')) customElements.define('is-heading', IsHeading);
  if (typeof window !== 'undefined') window.IsHeading = IsHeading;
})();
