import { adoptCss, defineElement, emit } from '@jeff-aporta/iswc-base/core/element.js';
import { crearNodo } from '@jeff-aporta/iswc-base/core/dom-utils.js';
import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { TenantSelectorPropsSchema } from './schemas/tenant-selector.schemas.js';
import type { TenantChangeDetail, TenantSelectEl, TenantSelectorProps } from './schemas/tenant-selector.schemas.js';
import './select.js';
import '@jeff-aporta/iswc-base/components/feedback/tag.js';
import '@jeff-aporta/iswc-base/components/media/icon.js';

/**
 * <iswc-tenant-selector> — selector del cliente activo en apps con varios clientes (empresa, organización, espacio).
 * Solo elige: quien lo usa guarda la elección al oír `iswc-tenant-change { id }`.
 *
 * CSS parts: selector, sin-opciones.
 */

const INICIAL: TenantSelectorProps = { opciones: [], activa: null, icono: 'mdi:domain', etiqueta: 'Cliente activo', sinOpciones: 'Sin opciones' };

class IswcTenantSelector extends PropsElement<TenantSelectorProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #root: ShadowRoot;

  constructor() {
    super(INICIAL, TenantSelectorPropsSchema.partial());
    this.#root = this.attachShadow({ mode: 'open' });
    adoptCss(this.#root, import.meta.url);
  }

  #cambiar = (e: Event): void => {
    const valor = (e.target as TenantSelectEl).value;
    const { opciones, activa } = this.props;
    const opcion = opciones.find((o) => String(o.id) === valor);
    if (!opcion || String(activa) === valor) return;
    emit<TenantChangeDetail>(this, 'iswc-tenant-change', { id: opcion.id });
  };

  protected override pintar(): void {
    const { opciones, activa, icono, etiqueta, sinOpciones } = this.props;
    if (opciones.length === 0) {
      this.#root.replaceChildren(crearNodo('iswc-tag', { color: 'neutral', part: 'sin-opciones' }, sinOpciones));
      return;
    }
    const valor = String(activa ?? opciones[0]!.id);
    const select = crearNodo(
      'iswc-select',
      { class: 'selector', part: 'selector', 'aria-label': etiqueta, value: valor },
      crearNodo('iswc-icon', { slot: 'start', icon: icono }),
      ...opciones.map((o) => crearNodo('iswc-option', { value: String(o.id) }, o.nombre)),
    );
    select.addEventListener('iswc-change', this.#cambiar);
    this.#root.replaceChildren(select);
  }
}

defineElement('iswc-tenant-selector', IswcTenantSelector, 'IswcTenantSelector');
