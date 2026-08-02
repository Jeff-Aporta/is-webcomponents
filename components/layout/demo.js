/**
 * <is-demo> — sección de demo de documentación (light DOM, zero dependencies).
 *
 * Componente reutilizable para las cajas de demo de los previews. Reusa el
 * chrome incumbente (fondo con retícula, borde, sombra de presentation.css)
 * y el botón "Ver código" de demo-code.js, que ahora también procesa
 * elementos <is-demo>.
 *
 *   <is-demo heading="Apariencias">
 *     <is-button variant="filled">Filled</is-button>
 *     <is-button variant="outlined">Outlined</is-button>
 *   </is-demo>
 *
 * Atributos
 *   heading       string  — título pequeño sobre el contenido (opcional).
 *   contain       boolean — crea un containing block para que los hijos con
 *                 `position: fixed` (is-fab, is-speed-dial, is-toast…) queden
 *                 anclados al demo y no al viewport.
 *   data-no-code  boolean — desactiva el botón "Ver código".
 *
 * El contenido va en light DOM a propósito: los estilos de la página y el
 * extractor de código del demo ven el markup real del ejemplo.
 */
(() => {
  class IsDemo extends HTMLElement {
    #headingEl = null;

    connectedCallback() {
      this.classList.add('demo');
      this.#syncHeading();
      // Si demo-code.js ya corrió, se auto-registra; si no, él nos recogerá.
      if (typeof window.__isDemoEnhance === 'function') window.__isDemoEnhance(this);
    }

    static get observedAttributes() { return ['heading']; }

    attributeChangedCallback() {
      if (this.isConnected) this.#syncHeading();
    }

    #syncHeading() {
      const text = this.getAttribute('heading') || '';
      if (!text) {
        this.#headingEl?.remove();
        this.#headingEl = null;
        return;
      }
      if (!this.#headingEl) {
        this.#headingEl = document.createElement('p');
        this.#headingEl.className = 'demo__heading';
        this.prepend(this.#headingEl);
      }
      this.#headingEl.textContent = text;
    }
  }

  if (!customElements.get('is-demo')) customElements.define('is-demo', IsDemo);
  if (typeof window !== 'undefined') window.IsDemo = IsDemo;
})();
