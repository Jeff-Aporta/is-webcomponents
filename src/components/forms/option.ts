// @contexto INDICE.md · src/components/forms/option.md
import { setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-option> — Opción para iswc-combobox / iswc-select (listboxes).
 *
 * Atributos: value, disabled, selected, group
 * Slots: default (etiqueta), start (icono/avatar), description (texto secundario)
 * Parts: base, start, label, description
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="option">
      <span part="start" class="start"><slot name="start"></slot></span>
      <span class="body">
        <span part="label" class="label"><slot></slot></span>
        <span part="description" class="description"><slot name="description"></slot></span>
      </span>
    </div>
  `;

  const OBSERVED: string[] = ['value', 'disabled', 'selected', 'group'];

  class IswcOption extends IswcElement {
    static override tag = 'iswc-option';
    static override css = css;
    static override observed = OBSERVED;

    #root!: HTMLElement;
    constructor() {
      super();
      // El rol va en el HOST (lo que el consumidor mete en su listbox), no en un div
      // del shadow: dentro de un listbox, el rol lo lleva el elemento que el
      // consumidor coloca, no un descendiente suyo.
      this.setAttribute('role', 'option');
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector<HTMLElement>('.option')!;
    }

    override onConnected(): void {
      this.#sync();
    }

    override onAttributeChanged(_name: string, _oldVal: string | null, _newVal: string | null): void {
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
      // aria-selected / aria-disabled van con el rol: en el host, no en el div.
      this.setAttribute('aria-selected', String(this.selected));
      this.setAttribute('aria-disabled', String(this.disabled));
      this.#root.toggleAttribute('data-disabled', this.disabled);
      this.#root.toggleAttribute('data-selected', this.selected);
    }
  }

  define(IswcOption, 'IswcOption');
})();
