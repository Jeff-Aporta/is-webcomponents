import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/check-icon-button.js';

/**
 * <is-theme-toggle> — Web Component (vanilla).
 *
 * Compone <is-check-icon-button> (noche ↔ sol). Al activarse:
 *   1. Busca el contenedor de tema más cercano:
 *        [container-theme] | .container-theme | .theme-dark | .theme-light | [data-theme]
 *      (fallback: document.documentElement)
 *   2. Alterna theme-dark / theme-light + data-theme en ese contenedor
 *   3. Refleja `dark` en el host
 *   4. Emite `is-theme-change` { detail: { theme, dark, container } }
 *
 * Attributes
 *   dark  boolean (reflected) — tema actual (dark=true → icono de sol / próximo click a light)
 */

(() => {
  const SCOPE =
    '[container-theme], .container-theme, .theme-dark, .theme-light, [data-theme]';

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-check-icon-button
      id="btn"
      part="button"
      icon="mdi:weather-night"
      checked-icon="mdi:weather-sunny"
      label="Cambiar a tema oscuro"
      checked-label="Cambiar a tema claro"
    ></is-check-icon-button>
  `;

  function readTheme(el: HTMLElement) {
    if (!el) return 'dark';
    if (el.classList.contains('theme-light')) return 'light';
    if (el.classList.contains('theme-dark')) return 'dark';
    const dt = el.getAttribute?.('data-theme') || el.dataset?.theme;
    return dt === 'light' ? 'light' : 'dark';
  }

  function applyTheme(el: HTMLElement, theme) {
    if (!el) return;
    el.classList.toggle('theme-light', theme === 'light');
    el.classList.toggle('theme-dark', theme === 'dark');
    if (el.dataset) el.dataset.theme = theme;
    else el.setAttribute('data-theme', theme);
  }

  class IsThemeToggle extends HTMLElement {
    static get observedAttributes(): string[] { return ['dark']; }

    #btn!: HTMLElement;
    #mounted = false;
    #scopeObs = null;
    #applying = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector<HTMLElement>('#btn')!;
      this.#btn.addEventListener('is-change', this.#onChange);
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#syncFromScope();
      this.#watchScope();
      this.#render();
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#scopeObs?.disconnect();
      this.#scopeObs = null;
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (name !== 'dark' || oldVal === newVal || !this.#mounted) return;
      this.#render();
    }

    get dark() { return this.hasAttribute('dark'); }
    set dark(v) { this.toggleAttribute('dark', !!v); }

    /** Contenedor de tema más cercano en el tree. */
    get themeContainer() {
      return this.closest(SCOPE) || document.documentElement;
    }

    #syncFromScope() {
      this.dark = readTheme(this.themeContainer) === 'dark';
    }

    #watchScope() {
      this.#scopeObs?.disconnect();
      const container = this.themeContainer;
      this.#scopeObs = new MutationObserver(() => {
        if (!this.#mounted || this.#applying) return;
        this.#syncFromScope();
        this.#render();
      });
      this.#scopeObs.observe(container, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
    }

    #onChange = (e) => {
      const next = e.detail.checked ? 'dark' : 'light';
      const container = this.themeContainer;
      this.#applying = true;
      applyTheme(container, next);
      this.#applying = false;
      this.#render();
      // Un solo evento para la transicion de tema: 'is-theme-change'.
      // Antes se emitian dos nombres ('theme-toggle' en el host, sin prefijo,
      // y 'is-theme-change' en document). Como emit() ya sale con
      // bubbles+composed, este llega igual a los listeners de document
      // (highlight-code, cdn-snippet, demos) sin dispararlo dos veces.
      emit(this, 'is-theme-change', { theme: next, dark: next === 'dark', container });
    };

    /** Re-sincroniza el icono desde fuera (p.ej. is-context por postMessage)
     *  releyendo el tema real del container. */
    forceSync() {
      this.dark = readTheme(this.themeContainer) === 'dark';
      this.#render();
    }

    #render() {
      const want = this.dark;
      const btn = this.#btn;
      // toggleAttribute no dispara attributeChangedCallback si el atributo
      // ya está en el valor deseado y el icono interno se queda pegado:
      // forzar siempre el ciclo remove + set.
      if (want) {
        if (btn.hasAttribute('checked')) btn.removeAttribute('checked');
        btn.setAttribute('checked', '');
      } else {
        if (!btn.hasAttribute('checked')) btn.setAttribute('checked', '');
        btn.removeAttribute('checked');
      }
    }
  }

  defineElement('is-theme-toggle', IsThemeToggle, 'IsThemeToggle');
})();
