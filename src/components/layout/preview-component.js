/**
 * <is-preview-component> — shell homogéneo de documentación/demo.
 *
 * Recibe una instancia de ISComponentPreview (propiedad `.preview`) y:
 * 1. Pinta split-panel + main + TOC desde `preview.definition`
 * 2. Llama `preview.mount({ root, main, aside, definition })` con lógica real
 * 3. En disconnect / cambio de preview llama `unmount`
 *
 * No evalúa strings de comportamiento. El markup estático de demos sí puede
 * ser HTML string en la definición (serializable); los listeners viven en mount.
 *
 *   import ButtonGroupPreview from '../previews/actions/is-button-group.preview.js';
 *   el.preview = new ButtonGroupPreview();
 */
import { renderDefinition } from '../../previews/_kit/render.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <is-split-panel class="page" part="page" orientation="horizontal" position-in-pixels="220" primary="end">
    <is-main class="main" part="main" slot="start" remember-scroll></is-main>
    <aside class="sidebar" part="aside" slot="end"></aside>
  </is-split-panel>
`;

class IsPreviewComponent extends HTMLElement {
  /** @type {import('../../previews/_kit/types.d.ts').ISComponentPreviewLike | null} */
  #preview = null;
  /** @type {import('../../previews/_kit/types.d.ts').PreviewMountContext | null} */
  #ctx = null;
  #styleEl = null;
  #mounted = false;

  static get observedAttributes() {
    return ['storage-key'];
  }

  constructor() {
    super();
    // Light DOM a propósito: presentation.css + demo-code + is-* ven el markup.
  }

  connectedCallback() {
    if (!this.querySelector(':scope > is-split-panel')) {
      this.append(TEMPLATE.content.cloneNode(true));
    }
    this.#mounted = true;
    if (this.#preview) this.#paint();
  }

  disconnectedCallback() {
    this.#teardown();
    this.#mounted = false;
  }

  /**
   * @returns {import('../../previews/_kit/types.d.ts').ISComponentPreviewLike | null}
   */
  get preview() {
    return this.#preview;
  }

  /**
   * @param {import('../../previews/_kit/types.d.ts').ISComponentPreviewLike | null} value
   */
  set preview(value) {
    this.#teardown();
    this.#preview = value;
    if (this.#mounted) this.#paint();
  }

  #panel() {
    return this.querySelector(':scope > is-split-panel');
  }

  #main() {
    return this.querySelector('is-main');
  }

  #aside() {
    return this.querySelector('aside.sidebar');
  }

  #teardown() {
    if (this.#ctx && this.#preview?.unmount) {
      try {
        this.#preview.unmount(this.#ctx);
      } catch (err) {
        console.error('[is-preview-component] unmount', err);
      }
    }
    this.#ctx = null;
    this.#styleEl?.remove();
    this.#styleEl = null;
  }

  async #paint() {
    const preview = this.#preview;
    const main = this.#main();
    const aside = this.#aside();
    const panel = this.#panel();
    if (!preview || !main || !aside || !panel) return;

    const def = preview.definition;
    const storageKey =
      this.getAttribute('storage-key') ||
      def.storageKey ||
      `docs-${def.tag}`;
    main.setAttribute('storage-key', storageKey);
    panel.setAttribute('storage-key', `docs-toc-${def.tag}`);

    if (def.styles) {
      this.#styleEl = document.createElement('style');
      this.#styleEl.setAttribute('data-preview-styles', def.tag);
      this.#styleEl.textContent = def.styles;
      this.prepend(this.#styleEl);
    }

    renderDefinition(def, { main, aside });

    this.#ctx = {
      root: this,
      main,
      aside,
      definition: def,
    };

    try {
      await preview.mount(this.#ctx);
    } catch (err) {
      console.error(`[is-preview-component] mount ${def.tag}`, err);
    }

    // Avisar a docs-chrome / demo-code por si ya estaban cargados
    this.dispatchEvent(
      new CustomEvent('is-preview-ready', {
        bubbles: true,
        composed: true,
        detail: { tag: def.tag },
      }),
    );
  }
}

if (!customElements.get('is-preview-component')) {
  customElements.define('is-preview-component', IsPreviewComponent);
}

export { IsPreviewComponent };
export default IsPreviewComponent;
