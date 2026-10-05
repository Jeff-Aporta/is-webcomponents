import { defineElement, emit } from '../../core/element.js';

/**
 * <iswc-demo> — sección de demo de documentación (light DOM, zero dependencies).
 *
 * Componente reutilizable para las cajas de demo de los previews. Reusa el
 * chrome incumbente (fondo con retícula, borde, sombra de presentation.css)
 * y los botones de chrome:
 *   - "Ver código" (`demo-code.js`) — snippet CDN del ejemplo
 *   - "Ver fuentes" (`view-sources.js`) — JS/CSS/MD del módulo sin minificar
 *   - `demo-file-meta.js` — ya no pinta barra; solo limpia restos legacy
 *
 *   <iswc-demo heading="Apariencias">
 *     <iswc-button variant="filled">Filled</iswc-button>
 *     <iswc-button variant="outlined">Outlined</iswc-button>
 *   </iswc-demo>
 *
 * Atributos
 *   heading         string  — título pequeño sobre el contenido (opcional).
 *   contain         boolean — containing block para hijos `position: fixed`.
 *   data-no-code    boolean — desactiva el botón "Ver código".
 *   data-no-sources boolean — desactiva el botón "Ver fuentes".
 *   data-no-file-meta boolean — legacy (la barra de meta ya no se monta).
 *
 * El contenido va en light DOM a propósito: los estilos de la página y el
 * extractor de código del demo ven el markup real del ejemplo.
 */
(() => {
  class IswcDemo extends HTMLElement {
    #headingEl: HTMLElement | null = null;

    connectedCallback(): void {
      this.classList.add('demo');
      this.#syncHeading();
      // Un componente no puede importar de `scripts/`, así que el aviso va por
      // evento: `demo-code.js` escucha `iswc-demo-connected` en `document` y
      // añade el botón "Ver código" a los <iswc-demo> conectados tarde. Si
      // demo-code.js aún no cargó, su barrido inicial nos recogerá igual.
      emit(this, 'iswc-demo-connected');
    }

    static get observedAttributes(): string[] { return ['heading']; }

    attributeChangedCallback(): void {
      if (this.isConnected) this.#syncHeading();
    }

    #syncHeading(): void {
      const text = this.getAttribute('heading') || '';
      if (!text) {
        this.#headingEl?.remove();
        this.#headingEl = null;
        return;
      }
      if (!this.#headingEl) {
        const el = document.createElement('p');
        el.className = 'demo__heading';
        this.#headingEl = el;
        this.prepend(el);
      }
      this.#headingEl.textContent = text;
    }
  }

  defineElement('iswc-demo', IswcDemo, 'IswcDemo');
})();
