/**
 * <iswc-doc-demo> — shell homogéneo de documentación/demo para cualquier app.
 *
 * Light DOM (`display: contents`): IDs estables (`shellBar`, `shellNav`,
 * `previewHost`, …) para que la SPA consumidora no cambie. Pinta sync en
 * `connectedCallback`; CSS/chrome vía loader.
 *
 * Bootstrap (cualquier app):
 *   <script type="module" src="…/cdn/preview/doc-demo-host.min.js"></script>
 *   <script type="module" src="./app.min.js"></script>
 *   <iswc-doc-demo brand="MiApp" sheets-cache="mi-app-sheets"></iswc-doc-demo>
 *
 * Local (kit self-test): añadir `local` (+ opcional `dev` para hot-reload).
 */
import { defineElement } from '../../core/element.js';
import './split-panel.js';
import './drawer.js';
import './demo.js';
import './scrollspy.js';
import './main.js';
import './preview-component.js';
import '../actions/button.js';
import '../media/icon.js';
import '../feedback/theme-toggle.js';
import '../feedback/palette-selector.js';
import '../code/code.js';
import type { LoaderLike } from "./doc-demo.schemas.js";

/** CSS del shell vía aliases del loader (apps pueden override con `page-styles`). */
const DEFAULT_PAGE_STYLES = [
  'iswc-palettes-default',
  'iswc-doc-shell',
  'iswc-doc-presentation',
];

/**
 * Chrome de demos compartido. Sin `dev-reload` (eso es opt-in con attr `dev`
 * o listándolo en `page-modules`) — otras apps CDN no deben arrastrarlo.
 */
const DEFAULT_PAGE_MODULES = [
  'highlight-pre',
  'demo-code',
  'docs-chrome',
  'cdn-panel',
  'view-sources',
  'demo-file-meta',
];

function loader(): LoaderLike | null {
  const L = (globalThis as unknown as { ISWebComponentsLoader?: LoaderLike }).ISWebComponentsLoader;
  return L || null;
}

function parseListAttr(raw: string | null, fallback: string[]): string[] {
  if (raw == null || raw.trim() === '') return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed as string[];
    }
  } catch { /* CSV */ }
  return raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

class IswcDocDemo extends HTMLElement {
  #booted = false;
  #readySignaled = false;

  static get observedAttributes(): string[] {
    return [
      'brand',
      'brand-icon',
      'brand-href',
      'brand-label',
      'nav-label',
      'drawer-label',
      'storage-key-nav',
      'tools-label',
      'page-styles',
      'page-modules',
      'dev',
    ];
  }

  /** Shell ya pintado y evento `iswc-doc-demo-ready` disparado. */
  get ready(): boolean {
    return this.dataset.ready === '1';
  }

  /** Resuelve cuando el shell light-DOM está listo (IDs estables presentes). */
  whenReady(): Promise<this> {
    if (this.ready) return Promise.resolve(this);
    return new Promise((resolve) => {
      this.addEventListener('iswc-doc-demo-ready', () => resolve(this), { once: true });
    });
  }

  connectedCallback(): void {
    if (!this.querySelector(':scope > .shell-bar')) {
      this.#paintShell();
    } else {
      this.#syncAttrs();
    }
    // Listo sync tras paint: SPAs hermanas (TLA sibling) no esperan CSS/chrome.
    this.#signalReady();
    void this.#bootAssets();
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.querySelector(':scope > .shell-bar')) {
      this.#syncAttrs();
    }
  }

  #paintShell(): void {
    const brand = this.getAttribute('brand') || 'ISWC';
    const brandIcon = this.getAttribute('brand-icon') || 'mdi:apps-box';
    const brandHref = this.getAttribute('brand-href') || './';
    const brandLabel = this.getAttribute('brand-label') || 'Inicio (Home)';
    const navLabel = this.getAttribute('nav-label') || 'Componentes';
    const drawerLabel = this.getAttribute('drawer-label') || navLabel;
    const storageNav = this.getAttribute('storage-key-nav') || 'iswc-doc-nav';
    const toolsLabel = this.getAttribute('tools-label') || 'Herramientas';

    this.innerHTML = /* html */ `
      <header class="shell-bar" id="shellBar">
        <a class="shell-brand" id="shellBrand" href="${escapeAttr(brandHref)}" aria-label="${escapeAttr(brandLabel)}">
          <iswc-icon class="shell-brand__icon" icon="${escapeAttr(brandIcon)}" aria-hidden="true"></iswc-icon>
          <span class="shell-brand__text">${escapeHtml(brand)}</span>
        </a>

        <iswc-button class="shell-menu-btn" id="navToggle" color="text" variant="plain" pill type="button"
                aria-expanded="false" aria-controls="navDrawer"
                aria-label="Abrir el catálogo de componentes" title="Catálogo de componentes" hidden>
          <iswc-icon slot="start" icon="mdi:menu"></iswc-icon>
        </iswc-button>

        <iswc-palette-selector id="brandPalette" scope="root" aria-label="Elegir paleta"></iswc-palette-selector>

        <div class="shell-tools" role="toolbar" aria-label="${escapeAttr(toolsLabel)}">
          <iswc-button class="shell-icon-btn shell-tool-btn" id="panelsCompactBtn" color="text" variant="plain" pill type="button"
                  aria-pressed="false"
                  aria-label="Compactar paneles laterales" title="Compactar paneles laterales">
            <iswc-icon slot="start" icon="mdi:arrow-collapse-horizontal"></iswc-icon>
          </iswc-button>
        </div>

        <iswc-button class="shell-icon-btn" id="fullscreenBtn" color="text" variant="plain" pill type="button" aria-label="Abrir preview en pantalla completa" title="Abrir preview en pantalla completa">
          <iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>
        </iswc-button>

        <iswc-theme-toggle id="themeToggle" scope="root" dark="true"></iswc-theme-toggle>
      </header>

      <iswc-split-panel id="mainSplit" class="main-split" orientation="horizontal" position-in-pixels="200" primary="start" storage-key="${escapeAttr(storageNav)}">
        <nav class="shell-nav" slot="start" id="shellNav" aria-label="${escapeAttr(navLabel)}"></nav>
        <div class="preview-stage" slot="end">
          <iswc-preview-component class="preview-host" id="previewHost" hidden></iswc-preview-component>
          <iframe class="preview-frame" id="previewFrame" title="Vista del componente"></iframe>
        </div>
      </iswc-split-panel>

      <iswc-drawer id="navDrawer" class="shell-nav-drawer" placement="start" light-dismiss
                 label="${escapeAttr(drawerLabel)}"></iswc-drawer>
    `;
  }

  #syncAttrs(): void {
    const brand = this.getAttribute('brand');
    if (brand != null) {
      const text = this.querySelector('.shell-brand__text');
      if (text) text.textContent = brand;
    }
    const icon = this.getAttribute('brand-icon');
    if (icon != null) {
      const el = this.querySelector('.shell-brand__icon');
      if (el) el.setAttribute('icon', icon);
    }
    const href = this.getAttribute('brand-href');
    if (href != null) {
      const a = this.querySelector<HTMLAnchorElement>('#shellBrand');
      if (a) a.setAttribute('href', href);
    }
    const storageNav = this.getAttribute('storage-key-nav');
    if (storageNav != null) {
      this.querySelector('#mainSplit')?.setAttribute('storage-key', storageNav);
    }
    const toolsLabel = this.getAttribute('tools-label');
    if (toolsLabel != null) {
      this.querySelector('.shell-tools')?.setAttribute('aria-label', toolsLabel);
    }
  }

  async #bootAssets(): Promise<void> {
    if (this.#booted) return;
    this.#booted = true;
    const L = loader();
    if (!L) {
      console.warn('[iswc-doc-demo] ISWebComponentsLoader no disponible');
      return;
    }

    const styles = parseListAttr(this.getAttribute('page-styles'), DEFAULT_PAGE_STYLES);
    const modules = parseListAttr(this.getAttribute('page-modules'), [...DEFAULT_PAGE_MODULES]);
    if (this.hasAttribute('dev') && !modules.includes('dev-reload')) {
      modules.push('dev-reload');
    }

    try {
      void L.loadPageStyles(styles);
      await L.loadPageModules(modules).catch((err) => console.warn('[iswc-doc-demo] page modules', err));
    } catch (err) {
      console.error('[iswc-doc-demo] boot', err);
    }
  }

  #signalReady(): void {
    if (this.#readySignaled) return;
    this.#readySignaled = true;
    document.documentElement.dataset.kitShell = '1';
    this.dataset.ready = '1';
    // Canónico para cualquier app; alias legacy para galería ISWC.
    this.dispatchEvent(new CustomEvent('iswc-doc-demo-ready', { bubbles: true, composed: true }));
    window.dispatchEvent(new Event('iswc-gallery-shell-ready'));
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

defineElement('iswc-doc-demo', IswcDocDemo, 'IswcDocDemo');
