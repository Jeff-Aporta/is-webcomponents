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
import './drawer.js';

/** Ancho a partir del cual el TOC deja de caber al lado del contenido. */
const COMPACT_QUERY = '(max-width: 900px)';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <is-split-panel class="page" part="page" orientation="horizontal" position-in-pixels="220" primary="end">
    <is-main class="main" part="main" slot="start" remember-scroll></is-main>
    <aside class="sidebar" part="aside" slot="end"></aside>
  </is-split-panel>
  <button type="button" class="toc-toggle" part="toc-toggle" aria-expanded="false"
          aria-label="Abrir el índice de la página" title="Índice de la página" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 7h11M9 12h11M9 17h11" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" />
      <circle cx="4.6" cy="7" r="1.4" fill="currentColor" />
      <circle cx="4.6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4.6" cy="17" r="1.4" fill="currentColor" />
    </svg>
  </button>
  <is-drawer class="toc-drawer" part="toc-drawer" placement="end" light-dismiss
             label="Índice"></is-drawer>
`;

class IsPreviewComponent extends HTMLElement {
  /** @type {import('../../previews/_kit/types.d.ts').ISComponentPreviewLike | null} */
  #preview = null;
  /** @type {import('../../previews/_kit/types.d.ts').PreviewMountContext | null} */
  #ctx = null;
  #styleEl = null;
  #mounted = false;
  #compactMql = null;
  #onCompactChange = () => this.#syncLayout();

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
    this.#wireCompactChrome();
    if (this.#preview) this.#paint();
  }

  disconnectedCallback() {
    this.#teardown();
    this.#compactMql?.removeEventListener('change', this.#onCompactChange);
    this.#compactMql = null;
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

  #drawer() {
    return this.querySelector(':scope > is-drawer.toc-drawer');
  }

  #toggle() {
    return this.querySelector(':scope > button.toc-toggle');
  }

  /** Hamburguesa + drawer del TOC: solo hace falta atarlos una vez. */
  #wireCompactChrome() {
    const drawer = this.#drawer();
    const toggle = this.#toggle();
    if (!drawer || !toggle) return;

    if (!this.#compactMql) {
      toggle.addEventListener('click', () => drawer.show?.() ?? drawer.setAttribute('open', ''));
      drawer.addEventListener('is-show', () => toggle.setAttribute('aria-expanded', 'true'));
      drawer.addEventListener('is-after-hide', () => toggle.setAttribute('aria-expanded', 'false'));
      // Ir a una sección cierra el índice: en compacto el drawer tapa el texto.
      drawer.addEventListener('click', (e) => {
        if (e.target.closest('a')) drawer.hide?.();
      });
      this.#compactMql = window.matchMedia(COMPACT_QUERY);
      this.#compactMql.addEventListener('change', this.#onCompactChange);
    }
    this.#syncLayout();
  }

  /**
   * Ancho: TOC al lado del contenido en el split. Compacto: TOC dentro del
   * drawer derecho y el split cede todo el ancho al contenido.
   */
  #syncLayout() {
    const panel = this.#panel();
    const aside = this.#aside();
    const drawer = this.#drawer();
    const toggle = this.#toggle();
    if (!panel || !aside || !drawer || !toggle) return;

    const compact = !!this.#compactMql?.matches;
    this.dataset.layout = compact ? 'compact' : 'wide';
    toggle.hidden = !compact;

    if (compact) {
      if (aside.parentElement !== drawer) {
        // El slot del split no aplica dentro del drawer, y con `slot="end"`
        // puesto el drawer no lo asignaría a su slot por defecto.
        aside.removeAttribute('slot');
        drawer.append(aside);
      }
      panel.setAttribute('collapse', 'end');
      return;
    }

    if (aside.parentElement !== panel) {
      drawer.hide?.();
      aside.setAttribute('slot', 'end');
      panel.append(aside);
    }
    panel.removeAttribute('collapse');
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

    // Cambiar de componente cierra el índice, igual que resetea el scroll.
    this.#drawer()?.hide?.();

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
