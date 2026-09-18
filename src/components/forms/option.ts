import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-option> — Opción para is-combobox / is-select (listboxes).
 *
 * Atributos: value, disabled, selected, group
 * Slots: default (etiqueta), start (icono/avatar), description (texto secundario)
 * Parts: base, start, label, description
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="option" role="option">
      <span part="start" class="start"><slot name="start"></slot></span>
      <span class="body">
        <span part="label" class="label"><slot></slot></span>
        <span part="description" class="description"><slot name="description"></slot></span>
      </span>
    </div>
  `;

  const OBSERVED: string[] = ['value', 'disabled', 'selected', 'group'];

  class IsOption extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #root!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector<HTMLElement>('.option')!;
    }

    onConnected(): void {
      this.#sync();
    }

    onAttributeChanged(_name: string, _oldVal: string | null, _newVal: string | null): void {
      this.#sync();
    }

    get value(): string {
      return this.hasAttribute('value') ? (this.getAttribute('value') ?? '') : this.label;
    }
    set value(v: string | null | undefined) {
      if (v == null) this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get selected(): boolean { return this.hasAttribute('selected'); }
    set selected(v: boolean) { this.toggleAttribute('selected', !!v); }

    /** Cabecera bajo la que agrupar la opción en el listbox */
    get group(): string { return this.getAttribute('group') ?? ''; }
    set group(v: string) { setStringAttr(this, 'group', v); }

    get description(): string {
      return (this.querySelector<HTMLElement>(':scope > [slot="description"]')?.textContent || '').trim();
    }

    /** Solo el contenido del slot por defecto: los slots con nombre no son etiqueta */
    get label(): string {
      let out = '';
      for (const node of this.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute('slot')) continue;
        out += node.textContent || '';
      }
      return out.trim();
    }

    #sync(): void {
      this.#root.setAttribute('aria-selected', String(this.selected));
      this.#root.setAttribute('aria-disabled', String(this.disabled));
      this.#root.toggleAttribute('data-disabled', this.disabled);
      this.#root.toggleAttribute('data-selected', this.selected);
    }
  }

  defineElement('is-option', IsOption, 'IsOption');
})();
