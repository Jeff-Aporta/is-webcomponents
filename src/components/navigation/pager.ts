import { adoptCss, defineElement, emitCancelable } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import type { PagerDirection, PagerNavigateDetail } from './pager.schemas.js';

/**
 * <iswc-pager> — paso a la página anterior / siguiente con el título de cada una
 * (pie de una hoja de documentación, de un artículo o de un paso de un tutorial).
 * Sustituye al par de botones «← Anterior · título / Siguiente → · título» armado a mano.
 *
 * Attributes
 *   prev / next              título de la página anterior / siguiente (vacío = sin ese lado)
 *   prev-href / next-href    destino; con href el lado es un enlace, sin href es un botón
 *   prev-label / next-label  rótulo pequeño (default «← Anterior» / «Siguiente →»)
 *   label                    aria-label de la navegación (default «Paginación»)
 *
 * CSS parts: base, prev, next, label, title.
 * Evento: `iswc-pager-navigate` {direction, href} cancelable; con href, `preventDefault()`
 *   cancela la navegación del enlace (p. ej. para navegar en una SPA).
 * CSS custom properties: --iswc-pager-gap, --iswc-pager-radius.
 */

const OBSERVED = ['prev', 'next', 'prev-href', 'next-href', 'prev-label', 'next-label', 'label'] as const;
const DEFAULT_LABEL: Record<PagerDirection, string> = { prev: '← Anterior', next: 'Siguiente →' };

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <nav class="base" part="base">
    <a class="side prev" part="prev" data-dir="prev" hidden><small class="label" part="label"></small><span class="title" part="title"></span></a>
    <a class="side next" part="next" data-dir="next" hidden><small class="label" part="label"></small><span class="title" part="title"></span></a>
  </nav>
`;

class IswcPager extends ElementBase {
  static override get observedAttributes(): string[] { return [...OBSERVED]; }

  #nav: HTMLElement;
  #sides: Record<PagerDirection, HTMLAnchorElement>;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#nav = shadow.querySelector<HTMLElement>('.base')!;
    this.#sides = {
      prev: shadow.querySelector<HTMLAnchorElement>('.prev')!,
      next: shadow.querySelector<HTMLAnchorElement>('.next')!,
    };
    for (const a of Object.values(this.#sides)) {
      a.addEventListener('click', this.#onClick);
      a.addEventListener('keydown', this.#onKey);
    }
  }

  override onConnected(): void { this.#sync(); }
  override onAttributeChanged(): void { this.#sync(); }

  /** Título de la página anterior (vacío = sin enlace anterior). */
  get prev(): string { return this.getAttribute('prev') ?? ''; }
  set prev(v: string) { setStringAttr(this, 'prev', v); }

  /** Título de la página siguiente (vacío = sin enlace siguiente). */
  get next(): string { return this.getAttribute('next') ?? ''; }
  set next(v: string) { setStringAttr(this, 'next', v); }

  /** Destino de la página anterior (opcional). */
  get prevHref(): string { return this.getAttribute('prev-href') ?? ''; }
  set prevHref(v: string) { setStringAttr(this, 'prev-href', v); }

  /** Destino de la página siguiente (opcional). */
  get nextHref(): string { return this.getAttribute('next-href') ?? ''; }
  set nextHref(v: string) { setStringAttr(this, 'next-href', v); }

  #onClick = (e: MouseEvent): void => {
    const a = e.currentTarget as HTMLAnchorElement;
    const direction = a.dataset.dir as PagerDirection;
    const detail: PagerNavigateDetail = { direction, href: a.getAttribute('href') ?? '' };
    if (!emitCancelable(this, 'iswc-pager-navigate', detail) || !detail.href) e.preventDefault();
  };

  /** Sin href el lado es un botón: Enter y Espacio lo activan. */
  #onKey = (e: KeyboardEvent): void => {
    const a = e.currentTarget as HTMLAnchorElement;
    if (a.hasAttribute('href') || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    a.click();
  };

  #sync(): void {
    this.#nav.setAttribute('aria-label', this.getAttribute('label') || 'Paginación');
    for (const dir of ['prev', 'next'] as const) {
      const a = this.#sides[dir];
      const title = this.getAttribute(dir) ?? '';
      const href = this.getAttribute(`${dir}-href`) ?? '';
      a.hidden = title.trim() === '';
      a.querySelector('.label')!.textContent = this.getAttribute(`${dir}-label`) || DEFAULT_LABEL[dir];
      a.querySelector('.title')!.textContent = title;
      if (href) {
        a.href = href;
        a.removeAttribute('role');
        a.removeAttribute('tabindex');
      } else {
        a.removeAttribute('href');
        a.setAttribute('role', 'button');
        a.tabIndex = 0;
      }
    }
  }
}

defineElement('iswc-pager', IswcPager, 'IswcPager');
