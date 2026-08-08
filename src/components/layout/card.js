import { adoptCss } from '../_shared/adopt-css.js';
import { upgradeProperties } from '../_shared/upgrade-properties.js';
import { defineElement } from '../_shared/define.js';
import { TONE } from '../_shared/tone.js';

/**
 * <is-card> — Web Component (vanilla, zero dependencies).
 *
 * Define el custom element `is-card` automáticamente al importarse.
 * Usa Shadow DOM con CSS propio, sin frameworks.
 *
 * Atributos
 *   variant    accent | filled | outlined | filled-outlined | plain
 *                 (default 'outlined', reflected)
 *   orientation   horizontal | vertical
 *                 (default 'vertical', reflected)
 *
 * Slots
 *   (default)        cuerpo principal (body, requerido)
 *   media            sección de medios (vertical: top; horizontal: start)
 *   header           encabezado (vertical only)
 *   footer           pie (vertical only)
 *   actions          acciones (horizontal: end)
 *   header-actions   acciones dentro del header (vertical only)
 *   footer-actions   acciones dentro del footer (vertical only)
 *
 * CSS Parts:  ::part(media) ::part(header) ::part(body) ::part(footer) ::part(actions)
 *
 * CSS custom properties
 *   --spacing     padding/gap entre secciones (default var(--is-space-l, 1rem))
 *
 * Layout:
 *   vertical  → media → header → body → footer  (column)
 *   horizontal→ media | body | actions           (row, body grows)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `

    <div class="layout">
      <div class="section section-media" part="media">
        <slot name="media"></slot>
      </div>
      <div class="section section-header" part="header">
        <div class="row">
          <slot name="header"></slot>
          <slot name="header-actions"></slot>
        </div>
      </div>
      <div class="section section-body" part="body">
        <slot></slot>
      </div>
      <div class="section section-footer" part="footer">
        <div class="row">
          <slot name="footer"></slot>
          <slot name="footer-actions"></slot>
        </div>
      </div>
      <div class="section section-actions" part="actions">
        <slot name="actions"></slot>
      </div>
    </div>
  `;

  const OBSERVED = ['variant', 'orientation'];

  const VALID_VARIANT = TONE;
  const VALID_ORIENTATION = ['horizontal', 'vertical'];

  class IsCard extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this._sections = shadow.querySelectorAll('.section');
      this._slots = shadow.querySelectorAll('slot');
      this._mounted = false;

      // Ocultar secciones vacías: un section sin nada asignado no debe
      // pintar border/padding ni romper la rejilla del layout.
      this._onSlotChange = this._syncEmpty.bind(this);
    }

    connectedCallback() {
      this._mounted = true;
      upgradeProperties(this, OBSERVED);
      // reflejar defaults para que :host([orientation]/[appearance]) siempre matcheen
      if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'vertical');
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'outlined');
      for (const slot of this._slots) slot.addEventListener('slotchange', this._onSlotChange);
      this._syncEmpty();
    }

    disconnectedCallback() {
      for (const slot of this._slots) slot.removeEventListener('slotchange', this._onSlotChange);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._mounted || oldVal === newVal) return;
      // appearance + orientation son reflected (van y vuelven vía attr)
      // y el render se hace 100% por CSS → no hace falta sincronizar nada.
      // Mantenemos el callback solo para que el atributo se refleje y se
      // dispare correctamente cuando se asigna por JS.
      if (name === 'variant' && newVal && !VALID_VARIANT.includes(newVal)) {
        this.setAttribute('variant', 'outlined');
      }
      if (name === 'orientation' && newVal && !VALID_ORIENTATION.includes(newVal)) {
        this.setAttribute('orientation', 'vertical');
      }
    }

    // ---- public properties ----

    get variant() {
      const v = this.getAttribute('variant');
      return VALID_VARIANT.includes(v) ? v : 'outlined';
    }
    set variant(v) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (VALID_VARIANT.includes(v)) this.setAttribute('variant', v);
    }

    get orientation() {
      const v = this.getAttribute('orientation');
      return VALID_ORIENTATION.includes(v) ? v : 'vertical';
    }
    set orientation(v) {
      if (v == null || v === '') this.removeAttribute('orientation');
      else if (VALID_ORIENTATION.includes(v)) this.setAttribute('orientation', v);
    }

    // ---- private ----

    _syncEmpty() {
      // Cada section es empty si TODOS sus slots no tienen contenido
      // asignado (flatten=true para no contar fallback <slot>).
      for (const section of this._sections) {
        let empty = true;
        const slots = section.querySelectorAll(':scope > slot, :scope > .row > slot');
        for (const slot of slots) {
          if (slot.assignedElements({ flatten: true }).length > 0) { empty = false; break; }
        }
        // body (default slot) cuenta también nodos de texto no vacíos
        const onlyDefault = slots.length === 1 && slots[0].name === '';
        if (onlyDefault && empty) {
          const text = slots[0].assignedNodes({ flatten: true })
            .filter(n => n.nodeType === 3 && n.textContent.trim());
          if (text.length) empty = false;
        }
        section.classList.toggle('is-empty', empty);
      }
    }
  }

  defineElement('is-card', IsCard, 'IsCard');
})();