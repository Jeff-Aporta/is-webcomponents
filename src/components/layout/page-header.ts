import { adoptCss, defineElement } from '@jeff-aporta/iswc-base/core/element.js';
import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { PageHeaderPropsSchema } from './schemas/page-header.schemas.js';
import type { PageHeaderProps } from './schemas/page-header.schemas.js';
import '@jeff-aporta/iswc-base/components/media/icon.js';

/**
 * <iswc-page-header> — cabecera de una vista: ícono, título, subtítulo, acciones (slot `acciones`) e ilustración
 * opcional a la derecha (slot `ilustracion`; se oculta en contenedores angostos).
 * Datos por atributos (`titulo`, `subtitulo`, `icono`) o por `props`.
 *
 * CSS parts: cabecera, titulo, subtitulo, acciones, ilustracion.
 * CSS custom properties: --iswc-page-header-title-font, --iswc-page-header-ilustracion-size.
 */

const INICIAL: PageHeaderProps = { titulo: '', subtitulo: '', icono: '' };

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <header class="cabecera" part="cabecera">
    <div class="texto">
      <h1 class="titulo" part="titulo"><iswc-icon hidden></iswc-icon><span class="rotulo"></span></h1>
      <p class="subtitulo" part="subtitulo" hidden></p>
    </div>
    <div class="acciones" part="acciones"><slot name="acciones"></slot></div>
    <div class="ilustracion" part="ilustracion" aria-hidden="true" hidden><slot name="ilustracion"></slot></div>
  </header>
`;

class IswcPageHeader extends PropsElement<PageHeaderProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #icono: HTMLElement;
  #rotulo: HTMLElement;
  #subtitulo: HTMLElement;
  #ilustracion: HTMLElement;

  constructor() {
    super(INICIAL, PageHeaderPropsSchema.partial());
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#icono = shadow.querySelector<HTMLElement>('iswc-icon')!;
    this.#rotulo = shadow.querySelector<HTMLElement>('.rotulo')!;
    this.#subtitulo = shadow.querySelector<HTMLElement>('.subtitulo')!;
    this.#ilustracion = shadow.querySelector<HTMLElement>('.ilustracion')!;
    const ranura = shadow.querySelector<HTMLSlotElement>('slot[name="ilustracion"]')!;
    ranura.addEventListener('slotchange', () => this.#verIlustracion(ranura));
  }

  /** La caja de la ilustración solo ocupa espacio si algo se proyecta en ella. */
  #verIlustracion(ranura: HTMLSlotElement): void {
    this.#ilustracion.hidden = ranura.assignedElements().length === 0;
  }

  protected override pintar(): void {
    const { titulo, subtitulo, icono } = this.props;
    this.#icono.hidden = !icono;
    if (icono) this.#icono.setAttribute('icon', icono);
    this.#rotulo.textContent = titulo;
    this.#subtitulo.textContent = subtitulo;
    this.#subtitulo.hidden = !subtitulo;
  }
}

defineElement('iswc-page-header', IswcPageHeader, 'IswcPageHeader');
