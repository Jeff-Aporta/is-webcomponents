import { adoptCss, defineElement } from '../../core/element.js';
import { atributosDe, PropsElement } from '../../core/props-element.js';
import { LoadingPropsSchema } from './schemas/loading.schemas.js';
import type { LoadingProps } from './schemas/loading.schemas.js';
import './spinner.js';

/**
 * <iswc-loading> — indicador de carga en línea: spinner y texto opcional, anunciado como estado.
 *
 * CSS parts: spinner, texto.
 * CSS custom properties: --iswc-loading-padding.
 */

const INICIAL: LoadingProps = { texto: '' };

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <iswc-spinner part="spinner"></iswc-spinner>
  <span class="texto" part="texto" hidden></span>
`;

class IswcLoading extends PropsElement<LoadingProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #texto: HTMLElement;

  constructor() {
    super(INICIAL, LoadingPropsSchema.partial());
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#texto = shadow.querySelector<HTMLElement>('.texto')!;
  }

  override onConnected(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
    if (!this.hasAttribute('aria-live')) this.setAttribute('aria-live', 'polite');
    super.onConnected();
  }

  protected override pintar(): void {
    const { texto } = this.props;
    this.#texto.textContent = texto;
    this.#texto.hidden = !texto;
  }
}

defineElement('iswc-loading', IswcLoading, 'IswcLoading');
