import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-demo> — sección de demo de documentación (light DOM, zero dependencies).
 *
 * Componente reutilizable para las cajas de demo de los previews. Reusa el
 * chrome incumbente (fondo con retícula, borde, sombra de presentation.css)
 * y los botones de chrome:
 *   - "Ver código" (`demo-code.js`) — snippet CDN del ejemplo
 *   - "Ver fuentes" (`view-sources.js`) — JS/CSS/MD del módulo sin minificar
 *
 *   <is-demo heading="Apariencias">
 *     <is-button variant="filled">Filled</is-button>
 *     <is-button variant="outlined">Outlined</is-button>
 *   </is-demo>
 *
 * Atributos
 *   heading         string  — título pequeño sobre el contenido (opcional).
 *   contain         boolean — containing block para hijos `position: fixed`.
 *   data-no-code    boolean — desactiva el botón "Ver código".
 *   data-no-sources boolean — desactiva el botón "Ver fuentes".
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
      // Un componente no puede importar de `scripts/`, así que el aviso va por
      // evento: `demo-code.js` escucha `is-demo-connected` en `document` y
      // añade el botón "Ver código" a los <is-demo> conectados tarde. Si
      // demo-code.js aún no cargó, su barrido inicial nos recogerá igual.
      emit(this, 'is-demo-connected');
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

  defineElement('is-demo', IsDemo, 'IsDemo');
})();
