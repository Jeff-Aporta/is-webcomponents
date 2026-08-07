import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { INTENT } from '../_shared/intent.js';
import './button.js';

/**
 * <is-fab> — Floating Action Button (vanilla, zero dependencies).
 *
 * Botón flotante de acción principal. Material-like.
 *
 *   <is-fab icon="mdi:plus" position="bottom-end">Crear</is-fab>
 *
 * Está construido SOBRE <is-button>: el fab no vuelve a implementar colores,
 * estados, foco, ni el cambio a <a> cuando hay `href`; todo eso ya vive en el
 * botón. Lo que añade es lo que de verdad es suyo: el anclaje fijo a una
 * esquina, la forma circular, la sombra flotante y el pulso.
 *
 * Antes tenía su propia tabla `.fab[data-color=…]`, una segunda copia de los
 * colores del kit que ya se había desincronizado de la de is-button (tonos
 * distintos para el mismo intent). Delegar el color deja una sola tabla.
 *
 * Atributos
 *   icon        string  — iconify id del icono principal.
 *   position    bottom-end | bottom-start | top-end | top-start | inline (default 'bottom-end')
 *   color       brand | neutral | success | warning | danger  (default 'brand')
 *   href        string — si se define, renderiza <a>.
 *   pulse       boolean — animación de pulso para llamar la atención.
 *   extended    boolean — ancho extendido con label.
 *   without-shadow boolean
 *   label       string — texto accesible (y label extendido).
 *
 * Slots
 *   (default)    contenido / label (si extended).
 *   icon         override del icono.
 *
 * Eventos
 *   is-fab-click  detail: { originalEvent }
 *
 * CSS Parts: ::part(base) — la caja del botón · ::part(icon) · ::part(label)
 */
(() => {
  const TEMPLATE = document.createElement('template');
  // `exportparts` reetiqueta las parts de is-button con los nombres que
  // <is-fab> ya publicaba, para que ::part(base|icon|label) siga funcionando
  // igual desde fuera pese al cambio de estructura.
  TEMPLATE.innerHTML = /* html */ `
    <is-button
      class="fab"
      shape="pill"
      exportparts="button: base, start: icon, label: label"
    >
      <span class="icon" slot="start">
        <slot name="icon">
          <is-icon icon="mdi:plus" aria-hidden="true"></is-icon>
        </slot>
      </span>
      <slot></slot>
    </is-button>
  `;

  const OBSERVED = ['icon', 'position', 'color', 'href', 'pulse', 'extended', 'without-shadow', 'label'];
  const VALID_COLOR = INTENT;
  const VALID_POSITION = ['bottom-end', 'bottom-start', 'top-end', 'top-start', 'inline'];

  class IsFab extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #root;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('is-button');
    }

    onConnected() {
      this.setAttribute('role', this.hasAttribute('href') ? 'link' : 'button');
      this.#sync();
      this.#root.addEventListener('click', (e) => {
        emit(this, 'is-fab-click', { originalEvent: e });
      });
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'href') {
        this.setAttribute('role', this.hasAttribute('href') ? 'link' : 'button');
      }
      this.#sync();
    }

    get position() {
      const v = this.getAttribute('position');
      return VALID_POSITION.includes(v) ? v : 'bottom-end';
    }
    set position(v) {
      if (v == null || v === '') this.removeAttribute('position');
      else if (VALID_POSITION.includes(v)) this.setAttribute('position', v);
    }

    get color() {
      const v = this.getAttribute('color');
      return VALID_COLOR.includes(v) ? v : 'brand';
    }
    set color(v) {
      if (v == null || v === '') this.removeAttribute('color');
      else if (VALID_COLOR.includes(v)) this.setAttribute('color', v);
    }

    #sync() {
      const position = this.position;
      // El color viaja tal cual a is-button, que es quien tiene la tabla.
      this.#root.setAttribute('color', this.color);
      this.dataset.position = position;
      if (!this.hasAttribute('position')) this.setAttribute('position', position);
      this.#root.classList.toggle('pulse', this.hasAttribute('pulse'));
      this.#root.classList.toggle('extended', this.hasAttribute('extended'));
      this.#root.classList.toggle('no-shadow', this.hasAttribute('without-shadow'));

      // `href` convierte el is-button interno en <a> — el fab no reimplementa
      // nada de eso, solo propaga el atributo.
      const href = this.getAttribute('href');
      if (href == null) this.#root.removeAttribute('href');
      else this.#root.setAttribute('href', href);

      // Aplicar icono si no hay slotted icon
      const icon = this.getAttribute('icon');
      if (icon) {
        const slot = this.shadowRoot.querySelector('slot[name="icon"]');
        if (slot && slot.assignedNodes().length === 0) {
          const ic = this.shadowRoot.querySelector('is-icon');
          if (ic) ic.setAttribute('icon', icon);
        }
      }
      // aria-label: is-button lo reenvía a su <button> interno.
      const label = this.getAttribute('label') || this.textContent.trim();
      if (label) this.#root.setAttribute('aria-label', label);

      // Con `extended` hay que PINTAR el texto: el slot por defecto solo
      // muestra contenido slotted, asi que `<is-fab extended label="X">` sin
      // hijos salia con la pildora vacia. El atributo pasa a ser el fallback
      // del slot (si el usuario slotea contenido, ese gana).
      const slot = this.#root.querySelector(':scope > slot:not([name])');
      if (slot) {
        const slotted = slot.assignedNodes({ flatten: true })
          .some((n) => (n.textContent || '').trim());
        slot.textContent = slotted ? '' : (this.getAttribute('label') || '');
      }
    }
  }

  defineElement('is-fab', IsFab, 'IsFab');
})();
