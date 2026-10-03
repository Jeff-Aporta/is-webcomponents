/**
 * <iswc-preview-component> — shell homogéneo de documentación/demo.
 *
 * Recibe una instancia de ISComponentPreview (propiedad `.preview`) y:
 * 1. Pinta split-panel + main + TOC desde `preview.definition`
 * 2. Llama `preview.mount({ root, main, aside, definition })` con lógica real
 * 3. En disconnect / cambio de preview llama `unmount`
 *
 * No evalúa strings de comportamiento. El markup estático de demos sí puede
 * ser HTML string en la definición (serializable); los listeners viven en mount.
 *
 *   import ButtonGroupPreview from '../actions/button-group.preview.controller.js';
 *   el.preview = new ButtonGroupPreview();
 */
import { withStyleAttrs } from '../../core/attrs.js';
import { renderDefinition } from '../../previews/_kit/render.js';
import './drawer.js';
import '../actions/button.js';
import '../media/icon.js';
import { defineElement } from '../../core/element.js';
import type {
  ISComponentPreviewLike,
  PreviewMountContext,
} from '../../previews/_kit/types.d.ts';

/** Ancho a partir del cual el TOC deja de caber al lado del contenido. */
const COMPACT_QUERY = '(max-width: 900px)';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <iswc-split-panel class="page" part="page" orientation="horizontal" position-in-pixels="220" primary="end">
    <iswc-main class="main" part="main" slot="start"></iswc-main>
    <aside class="sidebar" part="aside" slot="end"></aside>
  </iswc-split-panel>
  <iswc-button class="toc-toggle" part="toc-toggle" color="brand" variant="plain" pill type="button"
          aria-expanded="false" aria-label="Abrir el índice de la página" title="Índice de la página" hidden>
    <iswc-icon slot="start" icon="mdi:format-list-bulleted"></iswc-icon>
  </iswc-button>
  <iswc-drawer class="toc-drawer" part="toc-drawer" placement="end" light-dismiss
             label="Índice"></iswc-drawer>
`;

interface DrawerEl extends HTMLElement {
  show?(): void;
  hide?(): void;
}

class IswcPreviewComponent extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    size: '--iswc-preview-size',
    spacing: '--iswc-preview-spacing',
    };

  #preview: ISComponentPreviewLike | null = null;
  #ctx: PreviewMountContext | null = null;
  #styleEl: HTMLStyleElement | null = null;
  #mounted = false;
  /** Invalida mounts en vuelo al cambiar de preview a mitad de un `await`. */
  #paintGen = 0;
  #compactMql: MediaQueryList | null = null;
  #onCompactChange = (): void => { this.#syncLayout(); };

  /** Galería / host fuerza TOC en drawer (btn compactar paneles). */
  #isForceCompact(): boolean {
    return document.body?.dataset?.panelsCompact === '1';
  }

  static get observedAttributes(): string[] {
    return ['storage-key', ...IswcPreviewComponent.styleAttrNames];
  }

  constructor() {
    super();
    // Light DOM a propósito: presentation.css + demo-code + is-* ven el markup.
  }

  connectedCallback(): void {

    super.connectedCallback();
    if (!this.querySelector<HTMLElement>(':scope > iswc-split-panel')) {
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
   * al `<iswc-main>` es todo lo que hace falta.
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
    document.removeEventListener('iswc-panels-compact-change', this.#onCompactChange);
    this.#compactMql = null;
    this.#mounted = false;
  }

  get preview(): ISComponentPreviewLike | null {
    return this.#preview;
  }

  set preview(value: ISComponentPreviewLike | null) {
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

  #panel(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > iswc-split-panel');
  }

  #main(): HTMLElement | null {
    return this.querySelector<HTMLElement>('iswc-main');
  }

  #aside(): HTMLElement | null {
    return this.querySelector<HTMLElement>('aside.sidebar');
  }

  #drawer(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > iswc-drawer.toc-drawer');
  }

  #toggle(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > iswc-button.toc-toggle, :scope > button.toc-toggle');
  }

  /** Hamburguesa + drawer del TOC: solo hace falta atarlos una vez. */
  #wireCompactChrome(): void {
    const drawer = this.#drawer() as DrawerEl | null;
    const toggle = this.#toggle();
    if (!drawer || !toggle) return;

    if (!this.#compactMql) {
      toggle.addEventListener('click', () => drawer.show?.() ?? drawer.setAttribute('open', ''));
      drawer.addEventListener('iswc-show', () => toggle.setAttribute('aria-expanded', 'true'));
      drawer.addEventListener('iswc-after-hide', () => toggle.setAttribute('aria-expanded', 'false'));
      // Ir a una sección cierra el índice: en compacto el drawer tapa el texto.
      drawer.addEventListener('click', (e: Event) => {
        const target = e.target as Element | null;
        if (target?.closest('a')) drawer.hide?.();
      });
      this.#compactMql = window.matchMedia(COMPACT_QUERY);
      this.#compactMql.addEventListener('change', this.#onCompactChange);
      document.addEventListener('iswc-panels-compact-change', this.#onCompactChange);
    }
    this.#syncLayout();
  }

  /**
   * Ancho: TOC al lado del contenido en el split. Compacto: TOC dentro del
   * drawer derecho y el split cede todo el ancho al contenido.
   * `withoutToc`, o una sola seccion: sin indice ni panel derecho.
   */
  #syncLayout(): void {
    const panel = this.#panel();
    const aside = this.#aside();
    const drawer = this.#drawer() as DrawerEl | null;
    const toggle = this.#toggle();
    if (!panel || !aside || !drawer || !toggle) return;

    const defToc = this.#preview?.definition;
    const withoutToc = !!defToc?.withoutToc || (defToc?.sections?.length ?? 0) < 2;
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

    const compact = this.#isForceCompact() || !!this.#compactMql?.matches;
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

  #teardown(): void {
    if (this.#ctx && this.#preview?.unmount) {
      try {
        this.#preview.unmount(this.#ctx);
      } catch (err: unknown) {
        console.error('[iswc-preview-component] unmount', err);
      }
    }
    this.#ctx = null;
    this.#styleEl?.remove();
    this.#styleEl = null;
  }

  async #paint(): Promise<void> {
    const preview = this.#preview;
    const main = this.#main();
    const aside = this.#aside();
    const panel = this.#panel();
    if (!preview || !main || !aside || !panel) return;

    const gen = ++this.#paintGen;

    // Cambiar de componente cierra el índice, igual que resetea el scroll.
    (this.#drawer() as DrawerEl | null)?.hide?.();

    const def = preview.definition;
    const storageKey =
      this.getAttribute('storage-key') ||
      def.storageKey ||
      `docs-${def.tag}`;
    // remember-scroll + storage-key juntos: si el attr va en el template sin
    // key, iswc-main avisa en consola en el tick 0 (antes de #paint).
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
    } catch (err: unknown) {
      console.error(`[iswc-preview-component] mount ${def.tag}`, err);
    }

    // Otro `preview =` arrancó mientras montábamos: no emitir ready viejo.
    if (gen !== this.#paintGen || this.#preview !== preview) return;

    // Avisar a docs-chrome / demo-code por si ya estaban cargados
    this.dispatchEvent(
      new CustomEvent('iswc-preview-ready', {
        bubbles: true,
        composed: true,
        detail: { tag: def.tag },
      }),
    );
  }
}

defineElement('iswc-preview-component', IswcPreviewComponent);

export { IswcPreviewComponent };
export default IswcPreviewComponent;
