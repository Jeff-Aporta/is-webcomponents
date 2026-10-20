import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setCustomState } from '../../core/form-associated.js';
import '../media/icon.js';
import '../actions/button.js';
import './drawer.js';
import '../feedback/toast.js';

/**
 * <iswc-app-shell> — Armazón de aplicación: barra superior fija + vista con scroll propio.
 *
 * El host ocupa el alto del viewport (100dvh) y NO hace scroll: lo hace la vista
 * (`part="main"`). La barra queda siempre visible arriba, con sombra tenue.
 *
 * Atributos
 *   brand           texto de la marca (se oculta < 40rem si hay logo)
 *   logo            icono `prefijo:nombre` (p. ej. `mdi:rocket`) o URL de imagen
 *   brand-href      destino de la marca; sin él la marca es un botón
 *   home-label      nombre accesible de la marca (default "Ir al inicio")
 *   sidebar-label   título del cajón móvil de la barra lateral (default "Menú")
 *   toast           placement del <iswc-toast> interno (top-end, bottom-end…); sin él no hay toast
 *   no-default-palette  boolean — no cargar la paleta por defecto (ver abajo)
 *
 * Paleta por defecto
 *   Al conectarse, si la página no tiene paleta (ni `--iswc-brand-h` ni `--iswc-color-brand`
 *   definidos en <html>), el shell carga `palettes.min.css` del kit — lo mismo que
 *   `L.loadPageStyles(['iswc-palettes-default'])`, idempotente — para que los controles tengan
 *   el color de marca. `data-palette` en <html> se respeta (la hoja lo implementa); una app con
 *   paleta propia ya define esos tokens y no se toca. `no-default-palette` lo desactiva.
 *
 * Slots
 *   brand     reemplaza logo + texto de la marca
 *   nav       navegación de la barra (p. ej. <iswc-app-nav>)
 *   actions   controles a la derecha (sesión, tema…)
 *   (default) la vista; cada hijo crece para llenar el alto disponible
 *   sidebar   barra lateral; en < 40rem pasa a un <iswc-drawer> con botón de menú
 *   footer    pie al final del scroll de la vista
 *
 * Eventos
 *   iswc-brand-home  { href } — cancelable; preventDefault() evita la navegación del enlace
 *
 * Métodos
 *   toast(message, options?)  delega en el <iswc-toast> interno (requiere atributo toast)
 *   openSidebar() / closeSidebar()
 *
 * Parts: bar, brand, logo, brand-text, nav, actions, menu-button, body, sidebar, main, footer, drawer
 * Custom states: mobile, has-sidebar
 */

const ICON_RE = /^[a-z0-9-]+:[a-z0-9-]+$/i;
const PALETTE_ALIAS = 'iswc-palettes-default';

/** `true` si <html> ya resuelve tokens de marca (paleta del kit o propia de la app). */
function hasPalette(): boolean {
  const cs = getComputedStyle(document.documentElement);
  return cs.getPropertyValue('--iswc-brand-h').trim() !== ''
    || cs.getPropertyValue('--iswc-color-brand').trim() !== '';
}

/**
 * Carga la paleta por defecto una sola vez por página. Con el loader del kit pasa por
 * `loadPageStyles` (pin, espejos y anti-redundancia: si la app la pide también, no se duplica);
 * sin loader (bundle importado a mano) enlaza el `palettes.min.css` hermano del bundle.
 */
function ensureDefaultPalette(): void {
  if (typeof document === 'undefined' || hasPalette()) return;
  const G = globalThis as typeof globalThis & {
    __iswcDefaultPalette?: boolean;
    iswcLoader?: { loadPageStyles?: (hrefs: string[]) => Promise<void> };
  };
  if (G.__iswcDefaultPalette) return;
  G.__iswcDefaultPalette = true;
  const loader = G.iswcLoader;
  if (typeof loader?.loadPageStyles === 'function') {
    void loader.loadPageStyles([PALETTE_ALIAS]).catch(() => { /* sin red: queda la base neutra */ });
    return;
  }
  const url = import.meta.url;
  if (!url.includes('/dist/cdn/')) return;
  const href = new URL('../core/palettes.min.css', url).href;
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-iswc-default-palette', '');
  document.head.append(link);
}
const MOBILE_QUERY = '(max-width: 40rem)';

const HTML_TEMPLATE = `
<header class="bar" part="bar">
  <div class="line">
    <iswc-button class="menu-button" part="menu-button" variant="plain" color="neutral" hidden>
      <iswc-icon icon="mdi:menu" aria-hidden="true"></iswc-icon>
    </iswc-button>
    <a class="brand" part="brand">
      <slot name="brand">
        <span class="logo" part="logo"></span>
        <span class="brand-text" part="brand-text"></span>
      </slot>
    </a>
    <div class="nav" part="nav"><slot name="nav"></slot></div>
    <div class="actions" part="actions"><slot name="actions"></slot></div>
  </div>
</header>
<div class="body" part="body">
  <aside class="sidebar" part="sidebar" hidden><slot name="sidebar"></slot></aside>
  <main class="main" part="main">
    <slot></slot>
    <footer class="footer" part="footer"><slot name="footer"></slot></footer>
  </main>
</div>
<iswc-drawer class="drawer" part="drawer" placement="start" light-dismiss></iswc-drawer>`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = HTML_TEMPLATE;

class IswcAppShell extends ElementBase {
  static override get observedAttributes(): string[] {
    return ['brand', 'logo', 'brand-href', 'home-label', 'sidebar-label', 'toast'];
  }

  #internals: ElementInternals | null = null;
  #brand!: HTMLAnchorElement;
  #logo!: HTMLElement;
  #brandText!: HTMLElement;
  #menuButton!: HTMLElement;
  #aside!: HTMLElement;
  #drawer!: HTMLElement & { show?: () => void; hide?: () => void };
  #sidebarSlot!: HTMLSlotElement;
  #footer!: HTMLElement;
  #footerSlot!: HTMLSlotElement;
  #toast: (HTMLElement & { create?: (m: string, o?: Record<string, unknown>) => Promise<HTMLElement> }) | null = null;
  #media: MediaQueryList | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    try { this.#internals = this.attachInternals(); } catch { this.#internals = null; }

    const $ = <T extends Element>(sel: string) => shadow.querySelector(sel) as T;
    this.#brand = $<HTMLAnchorElement>('.brand');
    this.#logo = $<HTMLElement>('.logo');
    this.#brandText = $<HTMLElement>('.brand-text');
    this.#menuButton = $<HTMLElement>('.menu-button');
    this.#aside = $<HTMLElement>('.sidebar');
    this.#drawer = $<HTMLElement>('.drawer');
    this.#sidebarSlot = $<HTMLSlotElement>('slot[name="sidebar"]');
    this.#footer = $<HTMLElement>('.footer');
    this.#footerSlot = $<HTMLSlotElement>('slot[name="footer"]');

    this.#brand.addEventListener('click', this.#onBrandClick);
    this.#brand.addEventListener('keydown', this.#onBrandKey);
    this.#menuButton.addEventListener('click', () => this.openSidebar());
    this.#sidebarSlot.addEventListener('slotchange', () => this.#syncSidebar());
    this.#footerSlot.addEventListener('slotchange', () => this.#syncFooter());
  }

  override onConnected(): void {
    if (!this.hasAttribute('no-default-palette')) ensureDefaultPalette();
    if (typeof matchMedia === 'function' && !this.#media) {
      this.#media = matchMedia(MOBILE_QUERY);
      this.#media.addEventListener('change', this.#onMedia);
    }
    this.#syncBrand();
    this.#syncToast();
    this.#syncSidebar();
    this.#syncFooter();
  }

  override onDisconnected(): void {
    this.#media?.removeEventListener('change', this.#onMedia);
    this.#media = null;
  }

  override onAttributeChanged(name: string): void {
    if (name === 'toast') this.#syncToast();
    else if (name === 'sidebar-label') this.#drawer.setAttribute('label', this.getAttribute('sidebar-label') || 'Menú');
    else this.#syncBrand();
  }

  /** Muestra un aviso en el <iswc-toast> interno. Sin atributo `toast` no hace nada. */
  toast(message: string, options?: Record<string, unknown>): Promise<HTMLElement> | null {
    return this.#toast?.create?.(message, options) ?? null;
  }

  /** Abre el cajón de la barra lateral (solo tiene efecto en pantallas estrechas). */
  openSidebar(): void { if (this.#isMobile()) this.#drawer.show?.(); }

  /** Cierra el cajón de la barra lateral. */
  closeSidebar(): void { this.#drawer.hide?.(); }

  #isMobile(): boolean { return this.#media?.matches ?? false; }

  #onMedia = (): void => this.#syncSidebar();

  #onBrandClick = (ev: MouseEvent): void => {
    // Ctrl/Cmd/Shift/clic medio: el navegador abre el enlace donde el usuario pidió.
    if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    const href = this.getAttribute('brand-href');
    const ok = emit(this, 'iswc-brand-home', { href }, { cancelable: true });
    if (!ok || !href) ev.preventDefault();
  };

  #onBrandKey = (ev: KeyboardEvent): void => {
    if (this.hasAttribute('brand-href')) return;
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    this.#brand.click();
  };

  #syncBrand(): void {
    const brand = this.getAttribute('brand') ?? '';
    const logo = this.getAttribute('logo') ?? '';
    const href = this.getAttribute('brand-href');
    const label = this.getAttribute('home-label') || 'Ir al inicio';

    this.#brandText.textContent = brand;
    this.#brandText.hidden = !brand;
    this.#logo.replaceChildren();
    if (logo) {
      if (ICON_RE.test(logo)) {
        const icon = document.createElement('iswc-icon');
        icon.setAttribute('icon', logo);
        icon.setAttribute('aria-hidden', 'true');
        this.#logo.append(icon);
      } else {
        const img = document.createElement('img');
        img.src = logo;
        img.alt = '';
        this.#logo.append(img);
      }
    }
    this.#logo.hidden = !logo;

    if (href) {
      this.#brand.setAttribute('href', href);
      this.#brand.removeAttribute('role');
      this.#brand.removeAttribute('tabindex');
    } else {
      this.#brand.removeAttribute('href');
      this.#brand.setAttribute('role', 'button');
      this.#brand.setAttribute('tabindex', '0');
    }
    this.#brand.setAttribute('aria-label', brand ? `${brand} — ${label}` : label);
    this.#brand.setAttribute('title', label);
  }

  #syncToast(): void {
    const placement = this.getAttribute('toast');
    if (placement === null) {
      this.#toast?.remove();
      this.#toast = null;
      return;
    }
    if (!this.#toast) {
      this.#toast = document.createElement('iswc-toast');
      this.shadowRoot!.append(this.#toast);
    }
    this.#toast.setAttribute('placement', placement || 'top-end');
  }

  /** Coloca el slot `sidebar` en el aside (ancho) o en el cajón (estrecho). */
  #syncSidebar(): void {
    const has = this.#sidebarSlot.assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '');
    const mobile = this.#isMobile();
    const target = mobile ? this.#drawer : this.#aside;
    if (this.#sidebarSlot.parentNode !== target) target.append(this.#sidebarSlot);
    if (!mobile) this.#drawer.hide?.();
    this.#aside.hidden = !has || mobile;
    this.#menuButton.hidden = !has || !mobile;
    this.#drawer.setAttribute('label', this.getAttribute('sidebar-label') || 'Menú');
    this.#menuButton.setAttribute('aria-label', this.getAttribute('sidebar-label') || 'Menú');
    setCustomState(this.#internals, 'mobile', mobile);
    setCustomState(this.#internals, 'has-sidebar', has);
  }

  #syncFooter(): void {
    this.#footer.hidden = this.#footerSlot.assignedNodes({ flatten: true }).length === 0;
  }
}

defineElement('iswc-app-shell', IswcAppShell as unknown as CustomElementConstructor);

declare global {
  interface HTMLElementTagNameMap {
    'iswc-app-shell': IswcAppShell;
  }
}
