import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { StatusPillPropsSchema } from './schemas/status-pill.schemas.js';
import type { StatusPillProps, StatusPillStatus } from './schemas/status-pill.schemas.js';
import './spinner.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-status-pill> — pastilla de una línea para un paso de un proceso: spinner o ícono según `status`, la frase y el
 * rótulo del estado. Varias apiladas forman un feed de pasos en paralelo.
 *
 * CSS parts: pill, marca, texto, estado.
 */

const INICIAL: StatusPillProps = { text: '', status: 'pending', ts: '', icon: '', pendingLabel: 'en curso', doneLabel: 'listo', errorLabel: 'error' };
const ICONOS: Record<Exclude<StatusPillStatus, 'pending'>, string> = { done: 'mdi:check-circle-outline', error: 'mdi:alert-circle-outline' };

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <article class="pill" part="pill">
    <span class="marca" part="marca" aria-hidden="true"><iswc-spinner></iswc-spinner><iswc-icon></iswc-icon></span>
    <span class="texto" part="texto"></span>
    <span class="estado" part="estado"></span>
  </article>
`;

class IswcStatusPill extends PropsElement<StatusPillProps> {
  static override tag = 'iswc-status-pill';
  static override css = css;
  static override deps = ['iswc-icon'];
  static override observed = atributosDe(INICIAL);

  #pill: HTMLElement;
  #spinner: HTMLElement;
  #icono: HTMLElement;
  #texto: HTMLElement;
  #estado: HTMLElement;

  constructor() {
    super(INICIAL, StatusPillPropsSchema.partial());
    const shadow = this.shadowRoot!;
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#pill = shadow.querySelector<HTMLElement>('.pill')!;
    this.#spinner = shadow.querySelector<HTMLElement>('iswc-spinner')!;
    this.#icono = shadow.querySelector<HTMLElement>('iswc-icon')!;
    this.#texto = shadow.querySelector<HTMLElement>('.texto')!;
    this.#estado = shadow.querySelector<HTMLElement>('.estado')!;
  }

  protected override pintar(): void {
    const { text, status, ts, icon, pendingLabel, doneLabel, errorLabel } = this.props;
    const rotulo = { pending: pendingLabel, done: doneLabel, error: errorLabel }[status];
    this.#pill.dataset.status = status;
    this.#pill.title = [text, rotulo, ts].filter(Boolean).join(' · ');
    this.#spinner.hidden = status !== 'pending';
    this.#icono.hidden = status === 'pending';
    if (status !== 'pending') this.#icono.setAttribute('icon', icon || ICONOS[status]);
    this.#texto.textContent = text;
    this.#estado.textContent = rotulo;
  }
}

define(IswcStatusPill, 'IswcStatusPill');
