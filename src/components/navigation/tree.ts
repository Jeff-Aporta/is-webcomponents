import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

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

  class IsTree extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    indent: '--is-tree-indent',
    'row-padding-y': '--is-tree-row-padding-y',
    'row-padding-x': '--is-tree-row-padding-x',
    'row-hover': { prop: '--is-tree-row-hover', onlyColorValues: true },
    'row-selected-bg': { prop: '--is-tree-row-selected-bg', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...TREE_OBSERVED, ...IsTree.styleAttrNames]; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TREE_TEMPLATE.content.cloneNode(true));
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKeyDown);
    }

    onConnected() {
      if (!this.hasAttribute('selection')) this.setAttribute('selection', 'single');
      this.#syncRoots();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
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
      const items = [...this.querySelectorAll<HTMLElement>(':scope > is-tree-item')];
      items.forEach((it: HTMLElement) => {
        it.setAttribute('role', 'treeitem');
        if (it.parentElement === this) it.setAttribute('data-root', '');
      });
      if (this.hasAttribute('expanded')) this.#syncExpansion();
    }

    #syncExpansion() {
      const all = [...this.querySelectorAll<HTMLElement>('is-tree-item')];
      const expanded = this.hasAttribute('expanded');
      all.forEach((it: HTMLElement) => {
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
      return this.#allItems().filter((it: HTMLElement) => it.hasAttribute('selected'));
    }

    #onClick = (e: PointerEvent) => {
      const toggle = e.target.closest('[data-tree-toggle]');
      if (toggle) {
        const item = toggle.closest('is-tree-item');
        if (item) {
          item.toggleAttribute('expanded');
          emit(this, 'is-tree-toggle', { item, expanded: item.hasAttribute('expanded') });
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
            emit(this, 'is-tree-toggle', { item, expanded: true });
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (item.hasAttribute('expanded')) {
            item.removeAttribute('expanded');
            emit(this, 'is-tree-toggle', { item, expanded: false });
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
        items.forEach((it: HTMLElement) => {
          out.push(it);
          if (it.hasAttribute('expanded')) walk(it);
        });
      };
      walk(this);
      return out;
    }

    #select(item: HTMLElement) {
      const sel = this.selection;
      if (sel === 'none') return;
      const isLeaf = item.querySelectorAll<HTMLElement>(':scope > is-tree-item').length === 0;
      if (sel === 'leaf' && !isLeaf) return;
      const willSelect = !item.hasAttribute('selected');
      if (sel === 'single' || sel === 'leaf') {
        this.#allItems().forEach((it: HTMLElement) => it.removeAttribute('selected'));
      }
      if (willSelect) item.setAttribute('selected', '');
      else item.removeAttribute('selected');
      emit(this, 'is-tree-select', {
          item,
          selected: willSelect,
          selectedItems: this.#selectedItems(),
        });
    }
  }

  defineElement('is-tree', IsTree, 'IsTree');

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

  class IsTreeItem extends ElementBase {
    static get observedAttributes(): string[] { return ITEM_OBSERVED; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(ITEM_TEMPLATE.content.cloneNode(true));
      this.setAttribute('tabindex', '0');
    }

    onConnected() {
      // ESCUCHAR eventos del is-checkbox interno para sincronizar.
      const cb = this.shadowRoot!.querySelector<HTMLElement>('is-checkbox');
      if (cb) {
        cb.addEventListener('input', (e) => {
          if (e.detail.checked) this.setAttribute('selected', '');
          else this.removeAttribute('selected');
        });
      }
      this.#sync();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
    }

    #sync() {
      const children = this.querySelectorAll<HTMLElement>(':scope > is-tree-item');
      const hasKids = this.hasAttribute('has-children') || children.length > 0;
      const toggle = this.shadowRoot!.querySelector<HTMLElement>('.expand-toggle');
      const childrenPane = this.shadowRoot!.querySelector<HTMLElement>('.children');
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
      const cb = this.shadowRoot!.querySelector<HTMLElement>('is-checkbox');
      if (cb) cb.checked = this.hasAttribute('selected');
    }

    focus() {
      // Hacer focusable el shadow host.
      super.focus();
    }
  }

  defineElement('is-tree-item', IsTreeItem, 'IsTreeItem');
})();
