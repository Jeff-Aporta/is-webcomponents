import { adoptCss, defineElement, emitCancelable } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import type { FigureFit, FigureOpenDetail, FigureVariant } from './figure.schemas.js';
import './theme-img.js';

/**
 * <iswc-figure> — figura de contenido: imagen (dual tema opcional) + pie + enlace
 * «abrir en una pestaña nueva». Es la estructura que un visor de documentos o un
 * render de markdown pinta por cada imagen, sin armar `<figure><a><img>` a mano.
 *
 * Attributes
 *   src                   URL de la imagen (ambos temas)
 *   src-dark / src-light  variantes por tema (si faltan, usan `src`)
 *   alt                   texto alternativo
 *   caption               pie de figura en texto (el slot `caption` lo sustituye)
 *   link                  booleano: la imagen enlaza a `href` (o a la imagen) en pestaña nueva
 *   href                  destino del enlace (implica `link`)
 *   link-label            título/aria del enlace (default «Abrir en una pestaña nueva»)
 *   fit                   contain | cover (default contain)
 *   loading               lazy | eager
 *   variant               framed | plain (default framed: borde, fondo y hover)
 *   paper                 booleano: fondo claro fijo bajo la imagen (diagramas con trazo oscuro)
 *
 * Slots: `caption` (pie enriquecido).
 * CSS parts: frame, link, image, caption.
 * Evento: `iswc-figure-open` {href} cancelable al activar el enlace; `preventDefault()`
 *   cancela la pestaña nueva (p. ej. para abrir un lightbox propio).
 * CSS custom properties: --iswc-figure-max-height, --iswc-figure-paper.
 */

const LINK_LABEL = 'Abrir en una pestaña nueva';
const OBSERVED = ['src', 'src-dark', 'src-light', 'alt', 'caption', 'link', 'href', 'link-label', 'fit', 'loading', 'variant', 'paper'] as const;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <figure class="frame" part="frame">
    <a class="link" part="link" target="_blank" rel="noopener">
      <iswc-theme-img class="img" exportparts="image"></iswc-theme-img>
    </a>
    <figcaption class="caption" part="caption" hidden>
      <slot name="caption"><span class="caption-text"></span></slot>
    </figcaption>
  </figure>
`;

const asVariant = (v: string | null): FigureVariant => (v === 'plain' ? 'plain' : 'framed');
const asFit = (v: string | null): FigureFit => (v === 'cover' ? 'cover' : 'contain');

class IswcFigure extends ElementBase {
  static override get observedAttributes(): string[] { return [...OBSERVED]; }

  #link: HTMLAnchorElement;
  #img: HTMLElement;
  #caption: HTMLElement;
  #captionText: HTMLElement;
  #slot: HTMLSlotElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#link = shadow.querySelector<HTMLAnchorElement>('.link')!;
    this.#img = shadow.querySelector<HTMLElement>('.img')!;
    this.#caption = shadow.querySelector<HTMLElement>('.caption')!;
    this.#captionText = shadow.querySelector<HTMLElement>('.caption-text')!;
    this.#slot = shadow.querySelector<HTMLSlotElement>('slot[name="caption"]')!;
    this.#slot.addEventListener('slotchange', () => this.#syncCaption());
    this.#link.addEventListener('click', this.#onOpen);
  }

  override onConnected(): void { this.#sync(); }
  override onAttributeChanged(): void { this.#sync(); }

  /** URL de la imagen para ambos temas. */
  get src(): string { return this.getAttribute('src') ?? ''; }
  set src(v: string) { setStringAttr(this, 'src', v); }

  /** Variante para tema oscuro (cae en `src`). */
  get srcDark(): string { return this.getAttribute('src-dark') ?? ''; }
  set srcDark(v: string) { setStringAttr(this, 'src-dark', v); }

  /** Variante para tema claro (cae en `src`). */
  get srcLight(): string { return this.getAttribute('src-light') ?? ''; }
  set srcLight(v: string) { setStringAttr(this, 'src-light', v); }

  /** Texto alternativo de la imagen. */
  get alt(): string { return this.getAttribute('alt') ?? ''; }
  set alt(v: string) { setStringAttr(this, 'alt', v); }

  /** Pie de figura en texto plano (el slot `caption` lo sustituye). */
  get caption(): string { return this.getAttribute('caption') ?? ''; }
  set caption(v: string) { setStringAttr(this, 'caption', v); }

  /** La imagen enlaza a `href` (o a la propia imagen) en una pestaña nueva. */
  get link(): boolean { return this.hasAttribute('link') || this.hasAttribute('href'); }
  set link(v: boolean) { this.toggleAttribute('link', Boolean(v)); }

  /** Destino del enlace; vacío = la imagen activa. */
  get href(): string { return this.getAttribute('href') ?? ''; }
  set href(v: string) { setStringAttr(this, 'href', v); }

  /** Título accesible del enlace. */
  get linkLabel(): string { return this.getAttribute('link-label') || LINK_LABEL; }
  set linkLabel(v: string) { setStringAttr(this, 'link-label', v); }

  /** Ajuste de la imagen en su caja. */
  get fit(): FigureFit { return asFit(this.getAttribute('fit')); }
  set fit(v: FigureFit) { setStringAttr(this, 'fit', v); }

  /** Marco visual: `framed` (default) o `plain`. */
  get variant(): FigureVariant { return asVariant(this.getAttribute('variant')); }
  set variant(v: FigureVariant) { setStringAttr(this, 'variant', v); }

  /** Fondo claro fijo bajo la imagen. */
  get paper(): boolean { return this.hasAttribute('paper'); }
  set paper(v: boolean) { this.toggleAttribute('paper', Boolean(v)); }

  /** URL efectiva del enlace (vacía si la figura no enlaza). */
  get linkHref(): string {
    if (!this.link) return '';
    return this.href || this.src || this.srcLight || this.srcDark;
  }

  #onOpen = (e: MouseEvent): void => {
    const href = this.linkHref;
    if (!href) { e.preventDefault(); return; }
    const detail: FigureOpenDetail = { href };
    if (!emitCancelable(this, 'iswc-figure-open', detail)) e.preventDefault();
  };

  #sync(): void {
    const base = this.src;
    const dark = this.srcDark || base;
    const light = this.srcLight || base;
    setStringAttr(this.#img, 'src-dark', dark);
    setStringAttr(this.#img, 'src-light', light);
    setStringAttr(this.#img, 'alt', this.alt);
    setStringAttr(this.#img, 'fit', this.fit);
    const loading = this.getAttribute('loading');
    setStringAttr(this.#img, 'loading', loading === 'lazy' || loading === 'eager' ? loading : null);

    const href = this.linkHref;
    if (href) {
      this.#link.href = href;
      this.#link.title = this.linkLabel;
      this.#link.setAttribute('aria-label', this.alt ? `${this.alt} — ${this.linkLabel}` : this.linkLabel);
    } else {
      this.#link.removeAttribute('href');
      this.#link.removeAttribute('title');
      this.#link.removeAttribute('aria-label');
    }
    this.toggleAttribute('data-linked', Boolean(href));
    this.#captionText.textContent = this.caption;
    this.#syncCaption();
  }

  #syncCaption(): void {
    const slotted = this.#slot.assignedNodes().some((n) => (n.textContent ?? '').trim() !== '' || n.nodeType === Node.ELEMENT_NODE);
    this.#caption.hidden = !slotted && this.caption.trim() === '';
  }
}

defineElement('iswc-figure', IswcFigure, 'IswcFigure');
