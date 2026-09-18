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
  type Shape = 'circle' | 'rounded' | 'square';
  type Fit = 'contain' | 'cover';
  type Theme = 'dark' | 'light';

  function asShape(s: string | null): Shape | null {
    return s !== null && VALID_SHAPE.has(s) ? s as Shape : null;
  }
  function asFit(s: string | null): Fit {
    return s !== null && VALID_FIT.has(s) ? s as Fit : 'contain';
  }
  function asTheme(v: string | null): Theme | null {
    return v === 'light' || v === 'dark' ? v : null;
  }
  function asThemeInput(v: unknown): Theme | null {
    return v === 'light' || v === 'dark' ? v : null;
  }

  class IsThemeImg extends ElementBase {
    static styleAttrs = {
      fit: '--is-theme-img-fit',
    };

    static get observedAttributes(): string[] {
      return [...OBSERVED];
    }

    #img!: HTMLImageElement;
    #unwatch: (() => void) | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#img = shadow.querySelector<HTMLImageElement>('.img')!;
    }

    onConnected() {
      this.#watch();
      this.#sync();
    }

    onDisconnected() {
      const unwatch = this.#unwatch;
      if (unwatch) unwatch();
      this.#unwatch = null;
    }

    onAttributeChanged() {
      this.#sync();
    }

    get srcDark(): string { return this.getAttribute('src-dark') ?? ''; }
    set srcDark(v: string) { setStringAttr(this, 'src-dark', v); }

    get srcLight(): string { return this.getAttribute('src-light') ?? ''; }
    set srcLight(v: string) { setStringAttr(this, 'src-light', v); }

    get alt(): string { return this.getAttribute('alt') ?? ''; }
    set alt(v: string | null | undefined) { setStringAttr(this, 'alt', v ?? ''); }

    get shape(): Shape | null { return asShape(this.getAttribute('shape')); }
    set shape(v: Shape | string | null | undefined) { setStringAttr(this, 'shape', asShape(typeof v === 'string' ? v : null)); }

    get fit(): Fit { return asFit(this.getAttribute('fit')); }
    set fit(v: Fit | string | null | undefined) { setStringAttr(this, 'fit', asFit(typeof v === 'string' ? v : null)); }

    /** Tema forzado; vacío = seguir contenedor. */
    get theme(): Theme | null { return asTheme(this.getAttribute('theme')); }
    set theme(v: Theme | string | null | undefined) { setStringAttr(this, 'theme', asThemeInput(v)); }

    get themeContainer(): Element { return findThemeContainer(this); }

    /** Tema efectivo (forzado o del contenedor). */
    get activeTheme(): 'dark' | 'light' {
      const forced = this.theme;
      return forced ?? (readTheme(this.themeContainer) as 'dark' | 'light');
    }

    #watch() {
      const prev = this.#unwatch;
      if (prev) prev();
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
