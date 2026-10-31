import { adoptCss, defineElement } from '../../core/element.js';
import { atributosDe, PropsElement } from '../../core/props-element.js';
import { PersonPropsSchema } from './schemas/person.schemas.js';
import type { PersonProps } from './schemas/person.schemas.js';
import './avatar.js';

/**
 * <iswc-person> — una persona en línea: avatar con iniciales, nombre (o usuario) y un detalle. Escala con el
 * font-size del contexto.
 *
 * CSS parts: persona, avatar, nombre, detalle.
 */

const INICIAL: PersonProps = { usuario: '', nombre: null, detalle: '', compacto: false };

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <span class="persona" part="persona">
    <iswc-avatar class="avatar" part="avatar"></iswc-avatar>
    <span class="texto"><span class="nombre" part="nombre"></span><span class="detalle" part="detalle" hidden></span></span>
  </span>
`;

/** Iniciales de un nombre (máximo 2) o del usuario. */
function iniciales(nombre: string | null, usuario: string): string {
  const base = (nombre || usuario || '?').trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const dos = partes.length > 1 ? `${partes[0]![0]}${partes[1]![0]}` : base.slice(0, 2);
  return dos.toUpperCase();
}

class IswcPerson extends PropsElement<PersonProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #persona: HTMLElement;
  #avatar: HTMLElement;
  #texto: HTMLElement;
  #nombre: HTMLElement;
  #detalle: HTMLElement;

  constructor() {
    super(INICIAL, PersonPropsSchema.partial());
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#persona = shadow.querySelector<HTMLElement>('.persona')!;
    this.#avatar = shadow.querySelector<HTMLElement>('.avatar')!;
    this.#texto = shadow.querySelector<HTMLElement>('.texto')!;
    this.#nombre = shadow.querySelector<HTMLElement>('.nombre')!;
    this.#detalle = shadow.querySelector<HTMLElement>('.detalle')!;
  }

  protected override pintar(): void {
    const { usuario, nombre, detalle, compacto } = this.props;
    const visible = nombre || usuario;
    this.#persona.title = compacto ? visible : '';
    this.#avatar.setAttribute('initials', iniciales(nombre, usuario));
    this.#avatar.setAttribute('label', visible);
    this.#texto.hidden = compacto;
    this.#nombre.textContent = visible;
    this.#detalle.textContent = detalle;
    this.#detalle.hidden = !detalle;
  }
}

defineElement('iswc-person', IswcPerson, 'IswcPerson');
