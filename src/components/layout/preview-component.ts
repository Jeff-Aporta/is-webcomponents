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
import { withStyleAttrs } from '../../core/attrs.js';
import { renderDefinition } from '../../previews/_kit/render.js';
import './drawer.js';
import '../actions/button.js';
import '../media/icon.js';
import { defineElement } from '../../core/element.js';

/** Ancho a partir del cual el TOC deja de caber al lado del contenido. */
const COMPACT_QUERY = '(max-width: 900px)';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <is-split-panel class="page" part="page" orientation="horizontal" position-in-pixels="220" primary="end">
    <is-main class="main" part="main" slot="start"></is-main>
    <aside class="sidebar" part="aside" slot="end"></aside>
  </is-split-panel>
  <is-button class="toc-toggle" part="toc-toggle" color="brand" variant="plain" pill type="button"
          aria-expanded="false" aria-label="Abrir el índice de la página" title="Índice de la página" hidden>
    <is-icon slot="start" icon="mdi:format-list-bulleted"></is-icon>
  </is-button>
  <is-drawer class="toc-drawer" part="toc-drawer" placement="end" light-dismiss
             label="Índice"></is-drawer>
`;

class IsPreviewComponent extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    size: '--is-preview-size',
    spacing: '--is-preview-spacing',
    };

  /** @type {import('../../previews/_kit/types.d.ts').ISComponentPreviewLike | null} */
  #preview = null;
  /** @type {import('../../previews/_kit/types.d.ts').PreviewMountContext | null} */
  #ctx = null;
  #styleEl = null;
  #mounted = false;
  /** Invalida mounts en vuelo al cambiar de preview a mitad de un `await`. */
  #paintGen = 0;
  #compactMql = null;
  #onCompactChange = () => this.#syncLayout();

  static get observedAttributes(): string[] {
    return ['storage-key', ...IsPreviewComponent.styleAttrNames];
  }

  constructor() {
    super();
    // Light DOM a propósito: presentation.css + demo-code + is-* ven el markup.
  }

  connectedCallback(): void {

    super.connectedCallback();
    if (!this.querySelector<HTMLElement>(':scope > is-split-panel')) {
      this.append(TEMPLATE.content.cloneNode(true));
    }
    this.#mounted = true;
    this.#wireCompactChrome();
    if (this.#preview) this.#paint();
  }

  /**
   * `storage-key` se leía sólo dentro de `#paint()`, así que declararlo en
   * `observedAttributes` no servía de nada: cambiarlo en caliente no movía
   * la clave de scroll hasta el siguiente cambio de componente. Propagarlo
   * al `<is-main>` es todo lo que hace falta.
   */
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name !== 'storage-key' || oldVal === newVal || !this.#mounted) return;
    const main = this.#main();
    const def = this.#preview?.definition;
    if (main && def) main.setAttribute('storage-key', newVal || def.storageKey || `docs-${def.tag}`);
  }

  disconnectedCallback(): void {
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
    if (!value) {
      this.#paintGen += 1;
      this.#main()?.replaceChildren();
      this.#aside()?.replaceChildren();
      this.#syncLayout();
      return;
    }
    if (this.#mounted) this.#paint();
  }

  #panel() {
    return this.querySelector<HTMLElement>(':scope > is-split-panel');
  }

  #main() {
    return this.querySelector<HTMLElement>('is-main');
  }

  #aside() {
    return this.querySelector<HTMLElement>('aside.sidebar');
  }

  #drawer() {
    return this.querySelector<HTMLElement>(':scope > is-drawer.toc-drawer');
  }

  #toggle() {
    return this.querySelector<HTMLElement>(':scope > is-button.toc-toggle, :scope > button.toc-toggle');
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
      drawer.addEventListener('click', (e: Event) => {
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
   * `withoutToc` en la definición: sin índice ni panel derecho (home).
   */
  #syncLayout() {
    const panel = this.#panel();
    const aside = this.#aside();
    const drawer = this.#drawer();
    const toggle = this.#toggle();
    if (!panel || !aside || !drawer || !toggle) return;

    const withoutToc = !!this.#preview?.definition?.withoutToc;
    if (withoutToc) {
      this.dataset.layout = 'full';
      toggle.hidden = true;
      drawer.hide?.();
      if (aside.parentElement !== panel) {
        aside.setAttribute('slot', 'end');
        panel.append(aside);
      }
      panel.setAttribute('collapse', 'end');
      return;
    }

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

    const gen = ++this.#paintGen;

    // Cambiar de componente cierra el índice, igual que resetea el scroll.
    this.#drawer()?.hide?.();

    const def = preview.definition;
    const storageKey =
      this.getAttribute('storage-key') ||
      def.storageKey ||
      `docs-${def.tag}`;
    // remember-scroll + storage-key juntos: si el attr va en el template sin
    // key, is-main avisa en consola en el tick 0 (antes de #paint).
    main.setAttribute('storage-key', storageKey);
    main.toggleAttribute('remember-scroll', true);
    panel.setAttribute('storage-key', `docs-toc-${def.tag}`);

    if (def.styles) {
      this.#styleEl = document.createElement('style');
      this.#styleEl.setAttribute('data-preview-styles', def.tag);
      this.#styleEl.textContent = def.styles;
      this.prepend(this.#styleEl);
    }

    renderDefinition(def, { main, aside });
    this.#syncLayout();

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

    // Otro `preview =` arrancó mientras montábamos: no emitir ready viejo.
    if (gen !== this.#paintGen || this.#preview !== preview) return;

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

defineElement('is-preview-component', IsPreviewComponent);

export { IsPreviewComponent };
export default IsPreviewComponent;
