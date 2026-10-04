import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <iswc-tree> + <iswc-tree-item> — Web Components (vanilla, zero dependencies).
 *
 * Árbol jerárquico con expansión, selección, checkboxes, navegación por teclado
 * (Arrow, Home, End, Enter, Space) e iconos por slot.
 *
 *   <iswc-tree selection="leaf">
 *     <iswc-tree-item expanded>
 *       <iswc-icon slot="icon" icon="mdi:folder"></iswc-icon>
 *       Documentos
 *       <iswc-tree-item> … </iswc-tree-item>
 *       <iswc-tree-item> … </iswc-tree-item>
 *     </iswc-tree-item>
 *   </iswc-tree>
 *
 * Atributos <iswc-tree>
 *   selection  none | single | leaf | multiple (default 'single')
 *   expanded   boolean — todos los nodos empiezan expandidos.
 *
 * Atributos <iswc-tree-item>
 *   expanded         boolean
 *   selected         boolean
 *   disabled         boolean
 *   has-children     boolean (si lo declaras, se ignoran los hijos declarados)
 *   lazy             boolean — carga hijos bajo demanda.
 *
 * Slots
 *   <iswc-tree-item>
 *     (default)   label.
 *     icon        icono a la izquierda.
 *     expand-icon override del caret.
 *     checkbox    override del checkbox.
 *
 * Eventos
 *   iswc-tree-select    detail: { item, selected, selectedItems }
 *   iswc-tree-expand    detail: { item, expanded }
 *   iswc-tree-toggle    detail: { item, expanded }
 *
 * CSS Parts
 *   iswc-tree: ::part(base) ::part(items)
 *   iswc-tree-item: ::part(item) ::part(item-content) ::part(item-children) ::part(checkbox) ::part(expand-toggle)
 */
(() => {
  const TREE_TEMPLATE = document.createElement('template');
  TREE_TEMPLATE.innerHTML = /* html */ `
    <div class="tree" part="base" role="tree" aria-label="Árbol">
      <div class="items" part="items"><slot></slot></div>
    </div>
  `;

  const TREE_OBSERVED = ['selection', 'expanded'];

  const VALID_SELECTION = ['none', 'single', 'leaf', 'multiple'];

  class IswcTree extends ElementBase {

    static get observedAttributes(): string[] { return [...TREE_OBSERVED]; }

    #syncObserver: MutationObserver | null = null;

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
      // Re-sincronizar atributos ARIA cuando el subtree cambie (hijos añadidos
      // por JS o templates que se hidratan tras el connect).
      this.#syncObserver = new MutationObserver(() => this.#syncRoots());
      this.#syncObserver.observe(this, { childList: true, subtree: true });
    }

    onDisconnected() {
      this.#syncObserver?.disconnect();
      this.#syncObserver = null;
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'selection') {
        if (newVal && !VALID_SELECTION.includes(newVal)) this.setAttribute('selection', 'single');
      }
      if (name === 'expanded') {
        this.#syncExpansion();
        this.#syncRoots();
      }
    }

    get selection(): 'none' | 'single' | 'leaf' | 'multiple' {
      const v = this.getAttribute('selection');
      return (v && (VALID_SELECTION as readonly string[]).includes(v)) ? (v as 'none' | 'single' | 'leaf' | 'multiple') : 'single';
    }
    set selection(v: 'none' | 'single' | 'leaf' | 'multiple' | null | undefined) {
      if (v == null) this.removeAttribute('selection');
      else if ((VALID_SELECTION as readonly string[]).includes(v)) this.setAttribute('selection', v);
    }

    // ---- private ----

    #syncRoots() {
      const items = [...this.querySelectorAll<HTMLElement>(':scope > iswc-tree-item')];
      items.forEach((it: HTMLElement) => {
        it.setAttribute('role', 'treeitem');
        if (it.parentElement === this) it.setAttribute('data-root', '');
      });
      // Atributos de posición para lectores de pantalla (aria-setsize/posinset/level)
      // — se calculan sobre TODOS los items para que cada nodo conozca sus
      // hermanos a cualquier nivel.
      const all = this.#allItems();
      all.forEach((it, idx) => {
        const siblings = [...((it.parentElement as HTMLElement | null)?.children ?? [])]
          .filter((c: Element) => c.tagName?.toLowerCase() === 'iswc-tree-item');
        it.setAttribute('aria-setsize', String(siblings.length));
        it.setAttribute('aria-posinset', String(siblings.indexOf(it) + 1));
        it.setAttribute('aria-level', String(this.#depthOf(it)));
        // selected: aria-selected=true cuando selected (los checkbox ya lo hacen visible).
        if (it.hasAttribute('selected')) it.setAttribute('aria-selected', 'true');
        else it.removeAttribute('aria-selected');
        // expanded: aria-expanded refleja el atributo expanded (para nodos con hijos).
        const hasKids = it.hasAttribute('has-children') || it.querySelectorAll(':scope > iswc-tree-item').length > 0;
        if (hasKids) {
          it.setAttribute('aria-expanded', it.hasAttribute('expanded') ? 'true' : 'false');
        } else {
          it.removeAttribute('aria-expanded');
        }
      });
      if (this.hasAttribute('expanded')) this.#syncExpansion();
    }

    #depthOf(item: HTMLElement): number {
      let depth = 1;
      let p: HTMLElement | null = item.parentElement;
      while (p && p !== this) {
        if (p.tagName?.toLowerCase() === 'iswc-tree-item') depth++;
        p = p.parentElement;
      }
      return depth;
    }

    #syncExpansion() {
      const all = [...this.querySelectorAll<HTMLElement>('iswc-tree-item')];
      const expanded = this.hasAttribute('expanded');
      all.forEach((it: HTMLElement) => {
        if (expanded && !it.hasAttribute('expanded') && !it.hasAttribute('disabled')) it.setAttribute('expanded', '');
        if (!expanded) it.removeAttribute('expanded');
      });
    }

    #allItems(): HTMLElement[] {
      // BFS de todos los iswc-tree-item descendientes.
      const all: HTMLElement[] = [];
      const walk = (root: Element) => {
        const items = [...root.children].filter((c: Element) => c.tagName && c.tagName.toLowerCase() === 'iswc-tree-item') as HTMLElement[];
        items.forEach((it: HTMLElement) => { all.push(it); walk(it); });
      };
      walk(this);
      return all;
    }

    #selectedItems() {
      return this.#allItems().filter((it: HTMLElement) => it.hasAttribute('selected'));
    }

    #onClick = (e: PointerEvent) => {
      if (!(e.target instanceof Element)) return;
      const toggle = e.target.closest('[data-tree-toggle]');
      if (toggle) {
        const item = toggle.closest('iswc-tree-item');
        if (item instanceof HTMLElement) {
          item.toggleAttribute('expanded');
          emit(this, 'iswc-tree-toggle', { item, expanded: item.hasAttribute('expanded') });
        }
        e.stopPropagation();
        return;
      }
      const item = e.target.closest('iswc-tree-item');
      if (!(item instanceof HTMLElement) || item.hasAttribute('disabled')) return;
      this.#select(item);
    };

    #onKeyDown = (e: KeyboardEvent) => {
      if (!(e.target instanceof Element)) return;
      const item = e.target.closest('iswc-tree-item');
      if (!(item instanceof HTMLElement)) return;
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
            emit(this, 'iswc-tree-toggle', { item, expanded: true });
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (item.hasAttribute('expanded')) {
            item.removeAttribute('expanded');
            emit(this, 'iswc-tree-toggle', { item, expanded: false });
          } else {
            const parent = item.parentElement && item.parentElement.closest('iswc-tree-item');
            if (parent instanceof HTMLElement) next = visible.indexOf(parent);
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

    #visibleItems(): HTMLElement[] {
      const out: HTMLElement[] = [];
      const walk = (root: Element) => {
        const items = [...root.children].filter((c: Element) => c.tagName && c.tagName.toLowerCase() === 'iswc-tree-item') as HTMLElement[];
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
      const isLeaf = item.querySelectorAll<HTMLElement>(':scope > iswc-tree-item').length === 0;
      if (sel === 'leaf' && !isLeaf) return;
      const willSelect = !item.hasAttribute('selected');
      if (sel === 'single' || sel === 'leaf') {
        this.#allItems().forEach((it: HTMLElement) => it.removeAttribute('selected'));
      }
      if (willSelect) item.setAttribute('selected', '');
      else item.removeAttribute('selected');
      emit(this, 'iswc-tree-select', {
          item,
          selected: willSelect,
          selectedItems: this.#selectedItems(),
        });
    }
  }

  defineElement('iswc-tree', IswcTree, 'IswcTree');

  // ============ <iswc-tree-item> ============
  const ITEM_TEMPLATE = document.createElement('template');
  ITEM_TEMPLATE.innerHTML = /* html */ `
    <div class="row" part="item">
      <button type="button" class="expand-toggle" part="expand-toggle" tabindex="-1" data-tree-toggle aria-hidden="true">
        <slot name="expand-icon">
          <iswc-icon icon="mdi:chevron-right" aria-hidden="true"></iswc-icon>
        </slot>
      </button>
      <span class="checkbox" part="checkbox" data-tree-toggle="select">
        <slot name="checkbox">
          <iswc-checkbox aria-hidden="true"></iswc-checkbox>
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

  class IswcTreeItem extends ElementBase {
    static get observedAttributes(): string[] { return ITEM_OBSERVED; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(ITEM_TEMPLATE.content.cloneNode(true));
      this.setAttribute('tabindex', '0');
    }

    onConnected() {
      // ESCUCHAR eventos del iswc-checkbox interno para sincronizar.
      const cb = this.shadowRoot!.querySelector<HTMLElement>('iswc-checkbox');
      if (cb) {
        cb.addEventListener('input', (e: Event) => {
          const detail = (e as CustomEvent<{ checked: boolean }>).detail;
          if (detail && detail.checked) this.setAttribute('selected', '');
          else this.removeAttribute('selected');
        });
      }
      this.#sync();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
    }

    #sync() {
      const children = this.querySelectorAll<HTMLElement>(':scope > iswc-tree-item');
      const hasKids = this.hasAttribute('has-children') || children.length > 0;
      const toggle = this.shadowRoot!.querySelector<HTMLElement>('.expand-toggle');
      const childrenPane = this.shadowRoot!.querySelector<HTMLElement>('.children');
      if (!hasKids) {
        if (toggle) {
          toggle.hidden = true;
          toggle.setAttribute('aria-hidden', 'true');
        }
      } else {
        if (toggle) toggle.hidden = false;
        if (this.hasAttribute('expanded')) {
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
          if (childrenPane) childrenPane.hidden = false;
        } else {
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
          if (childrenPane) childrenPane.hidden = true;
        }
      }
      const cb = this.shadowRoot!.querySelector<HTMLElement>('iswc-checkbox');
      if (cb) (cb as unknown as { checked: boolean }).checked = this.hasAttribute('selected');
    }

    focus() {
      // Hacer focusable el shadow host.
      super.focus();
    }
  }

  defineElement('iswc-tree-item', IswcTreeItem, 'IswcTreeItem');
})();
