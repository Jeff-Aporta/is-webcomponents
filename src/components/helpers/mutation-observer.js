import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-mutation-observer> — Web Component (vanilla).
 *
 * display:contents — observa mutaciones en el host y sus hijos.
 *
 * Atributos (booleanos salvo attr)
 *   disabled         boolean
 *   attr             string — filtro de atributos
 *   child-list       boolean (default true)
 *   character-data   boolean
 *
 * Eventos
 *   is-mutate  detail: { records }
 */

(() => {
  class IsMutationObserver extends ElementBase {
    #observer = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot>';
      adoptCss(shadow, import.meta.url);
    }

    static get observedAttributes() {
      return ['disabled', 'attr', 'child-list', 'character-data'];
    }

    onConnected() {
      this.#setup();
    }

    onDisconnected() {
      this.#teardown();
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#setup();
    }

    #teardown() {
      this.#observer?.disconnect();
      this.#observer = null;
    }

    #setup() {
      this.#teardown();
      if (this.hasAttribute('disabled')) return;

      const attrRaw = this.getAttribute('attr');
      const attrFilter = attrRaw && attrRaw.trim() ? attrRaw.trim() : null;
      const childList = this.hasAttribute('child-list') || (!this.hasAttribute('character-data') && !this.hasAttribute('attr'));
      const charData = this.hasAttribute('character-data');

      const opts = {
        childList,
        characterData: charData,
        subtree: true,
        attributes: this.hasAttribute('attr') && !!attrFilter,
        attributeFilter: attrFilter ? attrFilter.split(/\s+/).filter(Boolean) : undefined
      };

      this.#observer = new MutationObserver((records) => {
        emit(this, 'is-mutate', { records });
      });

      this.#observer.observe(this, opts);
    }
  }

  defineElement('is-mutation-observer', IsMutationObserver, 'IsMutationObserver');
})();
