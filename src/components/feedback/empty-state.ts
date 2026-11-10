// @contexto INDICE.md · src/components/feedback/empty-state.md
import { ocultarSlotsVacios } from '@jeff-aporta/iswc-base/core/dom.js';
import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { EmptyStatePropsSchema } from './schemas/empty-state.schemas.js';
import type { EmptyStateProps } from './schemas/empty-state.schemas.js';
import './spinner.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-empty-state> — estado de una lista o un panel: vacío (ícono, título, texto y acción en el slot), cargando
 * (spinner) o error. Datos por atributos o por `props`; `variante` elige caja punteada o tarjeta.
 *
 * CSS parts: caja, icono, titulo, texto.
 */

const INICIAL: EmptyStateProps = { icono: 'mdi:inbox-outline', titulo: 'Nada por aquí', texto: '', estado: 'vacio', variante: 'caja', textoCargando: 'Cargando…' };
const ICONO_ERROR = 'mdi:alert-circle-outline';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div class="caja" part="caja">
    <iswc-spinner class="icono" aria-hidden="true" hidden></iswc-spinner>
    <iswc-icon class="icono" part="icono"></iswc-icon>
    <strong class="titulo" part="titulo"></strong>
    <p class="texto" part="texto" hidden></p>
    <div class="accion" hidden><slot></slot></div>
  </div>
`;

class IswcEmptyState extends PropsElement<EmptyStateProps> {
  static override tag = 'iswc-empty-state';
  static override css = css;
  static override deps = ['iswc-icon'];
  static override observed = atributosDe(INICIAL);

  #caja: HTMLElement;
  #spinner: HTMLElement;
  #icono: HTMLElement;
  #titulo: HTMLElement;
  #texto: HTMLElement;

  constructor() {
    super(INICIAL, EmptyStatePropsSchema.partial());
    const shadow = this.shadowRoot!;
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    ocultarSlotsVacios(shadow, '.accion > slot');
    this.#caja = shadow.querySelector<HTMLElement>('.caja')!;
    this.#spinner = shadow.querySelector<HTMLElement>('iswc-spinner')!;
    this.#icono = shadow.querySelector<HTMLElement>('iswc-icon')!;
    this.#titulo = shadow.querySelector<HTMLElement>('.titulo')!;
    this.#texto = shadow.querySelector<HTMLElement>('.texto')!;
  }

  protected override pintar(): void {
    const { icono, titulo, texto, estado, variante, textoCargando } = this.props;
    const cargando = estado === 'cargando';
    this.#caja.dataset.estado = estado;
    this.#caja.dataset.variante = variante;
    this.#caja.setAttribute('role', estado === 'error' ? 'alert' : 'status');
    this.#spinner.hidden = !cargando;
    this.#icono.hidden = cargando;
    this.#icono.setAttribute('icon', estado === 'error' ? ICONO_ERROR : icono);
    this.#titulo.textContent = cargando ? textoCargando : titulo;
    this.#texto.textContent = texto;
    this.#texto.hidden = !texto;
  }
}

define(IswcEmptyState, 'IswcEmptyState');
