import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-tree> + <is-tree-item> — Web Components (vanilla, zero dependencies).
 *
 * Árbol jerárquico con expansión, selección, checkboxes, navegación por teclado
 * (Arrow, Home, End, Enter, Space) e iconos por slot.
 *
 *   <is-tree selection="leaf">
 *     <is-tree-item expanded>
 *       <is-icon slot="icon" icon="mdi:folder"></is-icon>
 *       Documentos
 *       <is-tree-item> … </is-tree-item>
 *       <is-tree-item> … </is-tree-item>
 *     </is-tree-item>
 *   </is-tree>
 *
 * Atributos <is-tree>
 *   selection  none | single | leaf | multiple (default 'single')
 *   expanded   boolean — todos los nodos empiezan expandidos.
 *
 * Atributos <is-tree-item>
 *   expanded         boolean
 *   selected         boolean
 *   disabled         boolean
 *   has-children     boolean (si lo declaras, se ignoran los hijos declarados)
 *   lazy             boolean — carga hijos bajo demanda.
 *
 * Slots
 *   <is-tree-item>
 *     (default)   label.
 *     icon        icono a la izquierda.
 *     expand-icon override del caret.
 *     checkbox    override del checkbox.
 *
 * Eventos
 *   is-tree-select    detail: { item, selected, selectedItems }
 *   is-tree-expand    detail: { item, expanded }
 *   is-tree-toggle    detail: { item, expanded }
 *
 * CSS Parts
 *   is-tree: ::part(base) ::part(items)
 *   is-tree-item: ::part(item) ::part(item-content) ::part(item-children) ::part(checkbox) ::part(expand-toggle)
 */
(() => {
  const TREE_TEMPLATE = document.createElement('template');
  TREE_TEMPLATE.innerHTML = /* html */ `
    <div class="tree" part="base" role="tree">
      <div class="items" part="items"><slot></slot></div>
    </div>
  `;

  const TREE_OBSERVED = ['selection', 'expanded'];

  const VALID_SELECTION = ['none', 'single', 'leaf', 'multiple'];

  class IsTree extends HTMLElement {
    static get observedAttributes() { return TREE_OBSERVED; }

    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TREE_TEMPLATE.content.cloneNode(true));
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKeyDown);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('selection')) this.setAttribute('selection', 'single');
      this.#syncRoots();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'selection') {
        if (newVal && !VALID_SELECTION.includes(newVal)) this.setAttribute('selection', 'single');
      }
      if (name === 'expanded') this.#syncExpansion();
    }

    get selection() {
      const v = this.getAttribute('selection');
      return VALID_SELECTION.includes(v) ? v : 'single';
    }
    set selection(v) {
      if (v == null || v === '') this.removeAttribute('selection');
      else if (VALID_SELECTION.includes(v)) this.setAttribute('selection', v);
    }

    // ---- private ----

    #syncRoots() {
      const items = [...this.querySelectorAll(':scope > is-tree-item')];
      items.forEach((it) => {
        it.setAttribute('role', 'treeitem');
        if (it.parentElement === this) it.setAttribute('data-root', '');
      });
      if (this.hasAttribute('expanded')) this.#syncExpansion();
    }

    #syncExpansion() {
      const all = [...this.querySelectorAll('is-tree-item')];
      const expanded = this.hasAttribute('expanded');
      all.forEach((it) => {
        if (expanded && !it.hasAttribute('expanded') && !it.hasAttribute('disabled')) it.setAttribute('expanded', '');
        if (!expanded) it.removeAttribute('expanded');
      });
    }

    #allItems() {
      // BFS de todos los is-tree-item descendientes.
      const all = [];
      const walk = (root) => {
        const items = [...root.children].filter((c) => c.tagName && c.tagName.toLowerCase() === 'is-tree-item');
        items.forEach((it) => { all.push(it); walk(it); });
      };
      walk(this);
      return all;
    }

    #selectedItems() {
      return this.#allItems().filter((it) => it.hasAttribute('selected'));
    }

    #onClick = (e) => {
      const toggle = e.target.closest('[data-tree-toggle]');
      if (toggle) {
        const item = toggle.closest('is-tree-item');
        if (item) {
          item.toggleAttribute('expanded');
          this.dispatchEvent(new CustomEvent('is-tree-toggle', {
            detail: { item, expanded: item.hasAttribute('expanded') },
            bubbles: true,
            composed: true,
          }));
        }
        e.stopPropagation();
        return;
      }
      const item = e.target.closest('is-tree-item');
      if (!item || item.hasAttribute('disabled')) return;
      this.#select(item);
    };

    #onKeyDown = (e) => {
      const item = e.target.closest('is-tree-item');
      if (!item) return;
      const visible = this.#visibleItems();
      const idx = visible.indexOf(item);
      if (idx === -1) return;
      let next = -1;
      switch (e.key) {
        case 'ArrowDown': next = Math.min(idx + 1, visible.length - 1); e.preventDefault(); break;
        case 'ArrowUp': next = Math.max(idx - 1, 0); e.preventDefault(); break;
        case 'ArrowRight':
          if (item.hasAttribute('expanded')) {
            next = Math.min(idx + 1, visible.length - 1);
          } else {
            item.setAttribute('expanded', '');
            this.dispatchEvent(new CustomEvent('is-tree-toggle', { detail: { item, expanded: true }, bubbles: true, composed: true }));
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (item.hasAttribute('expanded')) {
            item.removeAttribute('expanded');
            this.dispatchEvent(new CustomEvent('is-tree-toggle', { detail: { item, expanded: false }, bubbles: true, composed: true }));
          } else {
            const parent = item.parentElement && item.parentElement.closest('is-tree-item');
            if (parent) next = visible.indexOf(parent);
          }
          e.preventDefault();
          break;
        case 'Home': next = 0; e.preventDefault(); break;
        case 'End': next = visible.length - 1; e.preventDefault(); break;
        case ' ':
        case 'Enter':
          this.#select(item);
          e.preventDefault();
          break;
      }
      if (next !== -1 && visible[next]) visible[next].focus();
    };

    #visibleItems() {
      const out = [];
      const walk = (root) => {
        const items = [...root.children].filter((c) => c.tagName && c.tagName.toLowerCase() === 'is-tree-item');
        items.forEach((it) => {
          out.push(it);
          if (it.hasAttribute('expanded')) walk(it);
        });
      };
      walk(this);
      return out;
    }

    #select(item) {
      const sel = this.selection;
      if (sel === 'none') return;
      const isLeaf = item.querySelectorAll(':scope > is-tree-item').length === 0;
      if (sel === 'leaf' && !isLeaf) return;
      const willSelect = !item.hasAttribute('selected');
      if (sel === 'single' || sel === 'leaf') {
        this.#allItems().forEach((it) => it.removeAttribute('selected'));
      }
      if (willSelect) item.setAttribute('selected', '');
      else item.removeAttribute('selected');
      this.dispatchEvent(new CustomEvent('is-tree-select', {
        detail: {
          item,
          selected: willSelect,
          selectedItems: this.#selectedItems(),
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  if (!customElements.get('is-tree')) customElements.define('is-tree', IsTree);
  if (typeof window !== 'undefined') window.IsTree = IsTree;

  // ============ <is-tree-item> ============
  const ITEM_TEMPLATE = document.createElement('template');
  ITEM_TEMPLATE.innerHTML = /* html */ `
    <div class="row" part="item">
      <button type="button" class="expand-toggle" part="expand-toggle" tabindex="-1" data-tree-toggle aria-hidden="true">
        <slot name="expand-icon">
          <is-icon icon="mdi:chevron-right" aria-hidden="true"></is-icon>
        </slot>
      </button>
      <span class="checkbox" part="checkbox" data-tree-toggle="select">
        <slot name="checkbox">
          <is-checkbox aria-hidden="true"></is-checkbox>
        </slot>
      </span>
      <span class="icon" part="icon"><slot name="icon"></slot></span>
      <span class="content" part="item-content"><slot></slot></span>
    </div>
    <div class="children" part="item-children" role="group">
      <slot></slot>
    </div>
  `;

  const ITEM_OBSERVED = ['expanded', 'selected', 'disabled', 'has-children', 'lazy'];

  class IsTreeItem extends HTMLElement {
    static get observedAttributes() { return ITEM_OBSERVED; }

    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(ITEM_TEMPLATE.content.cloneNode(true));
      this.setAttribute('tabindex', '0');
    }

    connectedCallback() {
      this.#mounted = true;
      // ESCUCHAR eventos del is-checkbox interno para sincronizar.
      const cb = this.shadowRoot.querySelector('is-checkbox');
      if (cb) {
        cb.addEventListener('input', (e) => {
          if (e.detail.checked) this.setAttribute('selected', '');
          else this.removeAttribute('selected');
        });
      }
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    #sync() {
      const children = this.querySelectorAll(':scope > is-tree-item');
      const hasKids = this.hasAttribute('has-children') || children.length > 0;
      const toggle = this.shadowRoot.querySelector('.expand-toggle');
      const childrenPane = this.shadowRoot.querySelector('.children');
      if (!hasKids) {
        toggle.hidden = true;
        toggle.setAttribute('aria-hidden', 'true');
      } else {
        toggle.hidden = false;
        if (this.hasAttribute('expanded')) {
          toggle.setAttribute('aria-expanded', 'true');
          childrenPane.hidden = false;
        } else {
          toggle.setAttribute('aria-expanded', 'false');
          childrenPane.hidden = true;
        }
      }
      const cb = this.shadowRoot.querySelector('is-checkbox');
      if (cb) cb.checked = this.hasAttribute('selected');
    }

    focus() {
      // Hacer focusable el shadow host.
      super.focus();
    }
  }

  if (!customElements.get('is-tree-item')) customElements.define('is-tree-item', IsTreeItem);
  if (typeof window !== 'undefined') window.IsTreeItem = IsTreeItem;
})();
