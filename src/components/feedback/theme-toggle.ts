import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/check-icon-button.js';
import { findThemeContainer } from '../_shared/theme-scope.js';

/**
 * <iswc-theme-toggle> — Web Component (vanilla).
 *
 * Compone <iswc-check-icon-button> (noche ↔ sol). Al activarse:
 *   1. Busca el contenedor de tema más cercano:
 *        [container-theme] | .container-theme | [data-theme]
 *      (fallback: document.documentElement)
 *   2. Alterna data-theme en ese contenedor
 *   3. Refleja `dark` en el host
 *   4. Emite `iswc-theme-change` { detail: { theme, dark, container } }
 *
 * Attributes
 *   dark   boolean (reflected) — tema actual (dark=true → icono de sol / próximo click a light)
 *   scope  root | closest. root escribe <html>. closest (default) usa el
 *          primer contenedor de tema. Si no hay, <html>.
 */

(() => {
  // W51: SCOPE simplificado — solo data-theme. Las clases .theme-dark/.theme-light
  // se erradicaron en W48 del CSS, asi que mantenerlas en el SCOPE solo añade
  // ruido y posibles falsos positivos (un nodo con .theme-dark residual haria
  // match aunque no tuviera data-theme).
  const SCOPE = '[container-theme], .container-theme, [data-theme]';

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <iswc-check-icon-button
      id="btn"
      part="button"
      icon="mdi:weather-night"
      checked-icon="mdi:weather-sunny"
      label="Cambiar a tema oscuro"
      checked-label="Cambiar a tema claro"
    ></iswc-check-icon-button>
  `;

  type ThemeName = 'dark' | 'light';

  function readTheme(el: HTMLElement): ThemeName {
    if (!el) return 'dark';
    const dt = el.getAttribute?.('data-theme') || el.dataset?.theme;
    return dt === 'light' ? 'light' : 'dark';
  }

  function applyTheme(el: HTMLElement, theme: ThemeName): void {
    if (!el) return;
    if (el.dataset) el.dataset.theme = theme;
    else el.setAttribute('data-theme', theme);
  }

  interface IsCheckIconButtonEvent extends CustomEvent<{ checked: boolean }> {}

  class IswcThemeToggle extends HTMLElement {
    static get observedAttributes(): string[] { return ['dark', 'scope']; }

    #btn!: HTMLElement;
    #mounted = false;
    #scopeObs: MutationObserver | null = null;
    #applying = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector<HTMLElement>('#btn')!;
      this.#btn.addEventListener('iswc-change', this.#onChange as EventListener);
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
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'scope') {
        this.#syncFromScope();
        this.#watchScope();
        this.#render();
        return;
      }
      if (name === 'dark') this.#render();
    }

    get dark(): boolean { return this.hasAttribute('dark'); }
    set dark(v: boolean) { this.toggleAttribute('dark', !!v); }

    /** root = html. closest = primer contenedor; atraviesa Shadow DOM. */
    get themeContainer(): HTMLElement {
      if ((this.getAttribute('scope') || '').trim().toLowerCase() === 'root') {
        return document.documentElement;
      }
      const found = findThemeContainer(this) || this.closest(SCOPE);
      return (found as HTMLElement | null) || document.documentElement;
    }

    #syncFromScope(): void {
      this.dark = readTheme(this.themeContainer) === 'dark';
    }

    #watchScope(): void {
      this.#scopeObs?.disconnect();
      const container = this.themeContainer;
      const obs = new MutationObserver(() => {
        if (!this.#mounted || this.#applying) return;
        this.#syncFromScope();
        this.#render();
      });
      this.#scopeObs = obs;
      obs.observe(container, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    #onChange = (e: Event): void => {
      const detail = (e as IsCheckIconButtonEvent).detail;
      const next: ThemeName = detail?.checked ? 'dark' : 'light';
      const container = this.themeContainer;
      this.#applying = true;
      applyTheme(container, next);
      this.dark = next === 'dark';
      this.#applying = false;
      this.#render();
      emit(this, 'iswc-theme-change', { theme: next, dark: next === 'dark', container });
      if (container === document.documentElement && window.parent !== window) {
        window.parent.postMessage({ type: 'iswc-shell-sync', theme: next }, location.origin);
      }
    };

    /** Re-sincroniza el icono desde fuera (p.ej. iswc-context por postMessage)
     *  releyendo el tema real del container. */
    forceSync(): void {
      this.dark = readTheme(this.themeContainer) === 'dark';
      this.#render();
    }

    #render(): void {
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
      // g07 (Cat 28): exponer el estado como switch accesible. role=switch
      // es el patrón APG para un toggle de dos estados; aria-checked refleja
      // el valor actual y aria-label cambia según el destino del próximo
      // click (mismo texto que el <iswc-check-icon-button> interno).
      this.setAttribute('role', 'switch');
      this.setAttribute('aria-checked', want ? 'true' : 'false');
      this.setAttribute('aria-label', want
        ? (this.getAttribute('checked-label') || 'Cambiar a tema claro')
        : (this.getAttribute('label') || 'Cambiar a tema oscuro'));
    }
  }

  defineElement('iswc-theme-toggle', IswcThemeToggle, 'IswcThemeToggle');
})();
