import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import {
  findThemeContainer,
  readTheme,
  watchThemeContainer,
} from '../_shared/theme-scope.js';

/**
 * <is-theme-img> — una sola imagen que cambia dark ↔ light según el tema.
 *
 * Evita el anti-patrón de dos <img> con :host-context (ambos visibles a la vez
 * si el CSS de hide falla o el slot del padre los pone en fila).
 *
 * Caja = 1em × 1em (escala con font-size del contexto, como is-avatar / is-icon).
 *
 * Attributes
 *   src-dark / src-light  URLs (ambas recomendadas; si falta una, usa la otra)
 *   alt                   string
 *   shape                 circle | rounded | square (opcional)
 *   fit                   contain | cover (default contain → CSS var)
 *   theme                 dark | light — forzado; si falta, lee el contenedor
 *
 * CSS Parts: ::part(image)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <img class="img" part="image" alt="" decoding="async" draggable="false" />
  `;

  const OBSERVED = ['src-dark', 'src-light', 'alt', 'shape', 'fit', 'theme', 'loading'];
  const VALID_SHAPE = new Set(['circle', 'rounded', 'square']);
  const VALID_FIT = new Set(['contain', 'cover']);

  class IsThemeImg extends ElementBase {
    static styleAttrs = {
      fit: '--is-theme-img-fit',
    };

    static get observedAttributes(): string[] {
      return [...OBSERVED];
    }

    #img!: HTMLElement;
    #unwatch = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#img = shadow.querySelector<HTMLElement>('.img')!;
    }

    onConnected() {
      this.#watch();
      this.#sync();
    }

    onDisconnected() {
      this.#unwatch?.();
      this.#unwatch = null;
    }

    onAttributeChanged() {
      this.#sync();
    }

    get srcDark() {
      return this.getAttribute('src-dark') ?? '';
    }
    set srcDark(v) {
      setStringAttr(this, 'src-dark', v);
    }

    get srcLight() {
      return this.getAttribute('src-light') ?? '';
    }
    set srcLight(v) {
      setStringAttr(this, 'src-light', v);
    }

    get alt() {
      return this.getAttribute('alt') ?? '';
    }
    set alt(v) {
      setStringAttr(this, 'alt', v ?? '');
    }

    get shape() {
      const s = this.getAttribute('shape');
      return VALID_SHAPE.has(s) ? s : null;
    }
    set shape(v) {
      setStringAttr(this, 'shape', VALID_SHAPE.has(v) ? v : null);
    }

    get fit() {
      const f = this.getAttribute('fit');
      return VALID_FIT.has(f) ? f : 'contain';
    }
    set fit(v) {
      setStringAttr(this, 'fit', VALID_FIT.has(v) ? v : null);
    }

    /** Tema forzado; vacío = seguir contenedor. */
    get theme() {
      const t = this.getAttribute('theme');
      return t === 'light' || t === 'dark' ? t : null;
    }
    set theme(v) {
      setStringAttr(this, 'theme', v === 'light' || v === 'dark' ? v : null);
    }

    get themeContainer() {
      return findThemeContainer(this);
    }

    /** Tema efectivo (forzado o del contenedor). */
    get activeTheme() {
      return this.theme || readTheme(this.themeContainer);
    }

    #watch() {
      this.#unwatch?.();
      const container = this.themeContainer;
      this.#unwatch = watchThemeContainer(container, () => this.#sync());
    }

    #sync() {
      if (!this.#img) return;
      const theme = this.activeTheme;
      // data-active-theme (NO data-theme): data-theme entraría en THEME_SCOPE
      // y closest() devolvería este host → el switch deja de seguir a <html>.
      this.setAttribute('data-active-theme', theme);

      const dark = this.srcDark;
      const light = this.srcLight;
      const src = theme === 'light' ? light || dark : dark || light;
      // Forzar src: getAttribute vs .src (absoluto) puede no coincidir.
      if (src) this.#img.src = src;

      this.#img.alt = this.alt;
      const loading = this.getAttribute('loading');
      if (loading === 'lazy' || loading === 'eager') this.#img.loading = loading;
      else this.#img.removeAttribute('loading');
    }
  }

  defineElement('is-theme-img', IsThemeImg, 'IsThemeImg');
})();
