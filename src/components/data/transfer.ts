import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-transfer> — Doble lista de selección (vanilla, zero dependencies).
 *
 * Mueve elementos entre una lista de origen y una lista de destino.
 *
 *   <is-transfer id="t1">
 *     <is-transfer-item value="a">Alpha</is-transfer-item>
 *     <is-transfer-item value="b" selected>Beta</is-transfer-item>
 *   </is-transfer>
 *
 * Atributos <is-transfer>
 *   source-title       string
 *   target-title       string
 *   searchable         boolean
 *   without-buttons    boolean  — sin botones prev/next
 *   without-headings   boolean
 *   max-target         number   — máximo de items en target.
 *
 * Atributos <is-transfer-item>
 *   value        string
 *   disabled     boolean
 *
 * Slots
 *   <is-transfer-item>
 *     (default)   label.
 *
 * Eventos
 *   is-transfer-change  detail: { item, source, target, values }
 */
(() => {
  const TRANSFER_TEMPLATE = document.createElement('template');
  TRANSFER_TEMPLATE.innerHTML = /* html */ `
    <div class="transfer" part="base">
      <div class="pane source" part="pane">
        <div class="pane-head" part="pane-head">
          <span class="title" part="title">Source</span>
          <span class="count" part="count">0</span>
        </div>
        <div class="search" part="search">
          <input type="text" placeholder="Buscar…" aria-label="Buscar" />
        </div>
        <div class="list" part="list" role="listbox" aria-multiselectable="true" tabindex="0"></div>
      </div>
      <div class="controls" part="controls">
        <button type="button" class="ctrl" data-action="to-target" aria-label="Mover a destino">
          <is-icon icon="mdi:chevron-double-right" aria-hidden="true"></is-icon>
        </button>
        <button type="button" class="ctrl" data-action="to-source" aria-label="Mover a origen">
          <is-icon icon="mdi:chevron-double-left" aria-hidden="true"></is-icon>
        </button>
      </div>
      <div class="pane target" part="pane">
        <div class="pane-head" part="pane-head">
          <span class="title" part="title">Target</span>
          <span class="count" part="count">0</span>
        </div>
        <div class="search" part="search">
          <input type="text" placeholder="Buscar…" aria-label="Buscar" />
        </div>
        <div class="list" part="list" role="listbox" aria-multiselectable="true" tabindex="0"></div>
      </div>
      <div class="sr-status" part="sr-status" aria-live="polite" aria-atomic="true"></div>
    </div>
  `;

  const TITEM_TEMPLATE = document.createElement('template');
  TITEM_TEMPLATE.innerHTML = /* html */ `
    <div class="item" part="item" role="option">
      <slot></slot>
    </div>
  `;

  const TRANSFER_OBSERVED = ['source-title', 'target-title', 'searchable', 'without-buttons', 'without-headings', 'max-target'];

  class IsTransfer extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'row-height': '--is-transfer-row-height',
    };

    static get observedAttributes(): string[] { return [...TRANSFER_OBSERVED, ...IsTransfer.styleAttrNames]; }
    #panelSource!: HTMLElement;
    #panelTarget!: HTMLElement;
    #searchSource!: HTMLInputElement;
    #searchTarget!: HTMLInputElement;
    #listSource!: HTMLElement;
    #listTarget!: HTMLElement;
    #countSource!: HTMLElement;
    #countTarget!: HTMLElement;
    #titleSource!: HTMLElement;
    #titleTarget!: HTMLElement;
    #srStatus!: HTMLElement;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TRANSFER_TEMPLATE.content.cloneNode(true));
      this.#panelSource = shadow.querySelector<HTMLElement>('.pane.source')!;
      this.#panelTarget = shadow.querySelector<HTMLElement>('.pane.target')!;
      this.#searchSource = this.#panelSource.querySelector<HTMLInputElement>('.search input')!;
      this.#searchTarget = this.#panelTarget.querySelector<HTMLInputElement>('.search input')!;
      this.#listSource = this.#panelSource.querySelector<HTMLElement>('.list')!;
      this.#listTarget = this.#panelTarget.querySelector<HTMLElement>('.list')!;
      this.#countSource = this.#panelSource.querySelector<HTMLElement>('.count')!;
      this.#countTarget = this.#panelTarget.querySelector<HTMLElement>('.count')!;
      this.#titleSource = this.#panelSource.querySelector<HTMLElement>('.title')!;
      this.#titleTarget = this.#panelTarget.querySelector<HTMLElement>('.title')!;
      this.#srStatus = shadow.querySelector<HTMLElement>('.sr-status')!;
    }

    onConnected() {
      if (!this.hasAttribute('source-title')) this.setAttribute('source-title', 'Disponibles');
      if (!this.hasAttribute('target-title')) this.setAttribute('target-title', 'Asignados');
      this.#bindControls();
      this.#bindSearch();
      this.#render();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
      this.#render();
    }

    get values() {
      return [...this.querySelectorAll<HTMLElement>(':scope > is-transfer-item[selected]')].map((it: HTMLElement) => it.getAttribute('value'));
    }

    #bindControls() {
      const btnTarget = this.shadowRoot!.querySelector<HTMLElement>('[data-action="to-target"]');
      if (btnTarget) btnTarget.addEventListener('click', () => this.#move(true));
      const btnSource = this.shadowRoot!.querySelector<HTMLElement>('[data-action="to-source"]');
      if (btnSource) btnSource.addEventListener('click', () => this.#move(false));
    }

    #bindSearch() {
      this.#searchSource.addEventListener('input', () => this.#render());
      this.#searchTarget.addEventListener('input', () => this.#render());
    }

    #sync() {
      const titleSource = this.getAttribute('source-title') || 'Disponibles';
      const titleTarget = this.getAttribute('target-title') || 'Asignados';
      this.#titleSource.textContent = titleSource;
      this.#titleTarget.textContent = titleTarget;
      // aria-label de los listboxes (las etiquetas accesibles).
      this.#listSource.setAttribute('aria-label', `${titleSource}: lista de elementos disponibles`);
      this.#listTarget.setAttribute('aria-label', `${titleTarget}: lista de elementos asignados`);
      this.#panelSource.querySelector<HTMLElement>('.search')?.toggleAttribute('hidden', !this.hasAttribute('searchable'));
      this.#panelTarget.querySelector<HTMLElement>('.search')?.toggleAttribute('hidden', !this.hasAttribute('searchable'));
      this.shadowRoot!.querySelector<HTMLElement>('.controls')?.toggleAttribute('hidden', this.hasAttribute('without-buttons'));
      this.#panelSource.querySelector<HTMLElement>('.pane-head')?.toggleAttribute('hidden', this.hasAttribute('without-headings'));
      this.#panelTarget.querySelector<HTMLElement>('.pane-head')?.toggleAttribute('hidden', this.hasAttribute('without-headings'));
    }

    /** Anuncia un mensaje al lector de pantalla (región aria-live). */
    #announce(msg: string): void {
      if (!this.#srStatus) return;
      this.#srStatus.textContent = '';
      // Forzar re-announce en sucesivas llamadas idénticas.
      setTimeout(() => { if (this.#srStatus) this.#srStatus.textContent = msg; }, 30);
    }

    #items(): HTMLElement[] {
      return [...this.querySelectorAll<HTMLElement>(':scope > is-transfer-item')];
    }

    #visibleItems(inTarget: boolean): HTMLElement[] {
      const term = (inTarget ? this.#searchTarget : this.#searchSource).value.toLowerCase();
      return this.#items().filter((it: HTMLElement) => it.hasAttribute('selected') === inTarget)
        .filter((it) => !term || (it.textContent ?? '').toLowerCase().includes(term));
    }

    #render() {
      this.#sync();
      const source = this.#visibleItems(false);
      const target = this.#visibleItems(true);
      this.#listSource.innerHTML = '';
      this.#listTarget.innerHTML = '';
      source.forEach((it) => this.#listSource.appendChild(this.#renderItem(it)));
      target.forEach((it) => this.#listTarget.appendChild(this.#renderItem(it)));
      this.#countSource.textContent = String(source.length);
      this.#countTarget.textContent = String(target.length);
      // Bloquear botón hacia target si alcanzó max
      const max = parseInt(this.getAttribute('max-target') || '0', 10);
      const btn = this.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="to-target"]');
      if (btn) {
        if (max > 0 && target.length >= max) btn.disabled = true;
        else btn.disabled = false;
      }
    }

    #renderItem(it: HTMLElement) {
      const div = document.createElement('div');
      div.className = 'item';
      div.setAttribute('role', 'option');
      div.dataset.value = it.getAttribute('value') || '';
      div.textContent = it.textContent;
      if (it.hasAttribute('disabled')) {
        div.classList.add('disabled');
        div.setAttribute('aria-disabled', 'true');
      }
      div.addEventListener('click', () => {
        it.toggleAttribute('selected');
        this.#render();
        this.#emitChange(it);
      });
      return div;
    }

    #move(toTarget: boolean): void {
      const max = parseInt(this.getAttribute('max-target') || '0', 10);
      const items = this.#items();
      const movedLabels: string[] = [];
      items.forEach((it: HTMLElement) => {
        if (it.hasAttribute('disabled')) return;
        if (toTarget) {
          if (max > 0 && items.filter((x: HTMLElement) => x.hasAttribute('selected')).length >= max) return;
          if (!it.hasAttribute('selected')) movedLabels.push((it.textContent || it.getAttribute('value') || '').trim());
          it.setAttribute('selected', '');
        } else {
          if (it.hasAttribute('selected')) movedLabels.push((it.textContent || it.getAttribute('value') || '').trim());
          it.removeAttribute('selected');
        }
      });
      this.#render();
      // Anuncio al lector de pantalla.
      if (movedLabels.length > 0) {
        const dest = toTarget ? 'destino' : 'origen';
        this.#announce(`Movidos ${movedLabels.length} elemento${movedLabels.length === 1 ? '' : 's'} a ${dest}: ${movedLabels.slice(0, 3).join(', ')}${movedLabels.length > 3 ? '…' : ''}`);
      }
      emit(this, 'is-transfer-change', { source: this.values.length, target: this.values.length, values: this.values });
    }

    #emitChange(item: HTMLElement): void {
      const label = (item.textContent || item.getAttribute('value') || '').trim();
      const wasSelected = !item.hasAttribute('selected');
      this.#announce(`${label} ${wasSelected ? 'movido a origen' : 'movido a destino'}`);
      emit(this, 'is-transfer-change', {
        item,
        source: this.#items().filter((it: HTMLElement) => !it.hasAttribute('selected')).length,
        target: this.values.length,
        values: this.values,
      });
    }
  }

  defineElement('is-transfer', IsTransfer, 'IsTransfer');

  // ============ <is-transfer-item> ============
  const ITEM_OBSERVED = ['value', 'selected', 'disabled'];

  class IsTransferItem extends HTMLElement {
    static get observedAttributes(): string[] { return ITEM_OBSERVED; }

    connectedCallback(): void {
      this.setAttribute('role', 'presentation');
    }

    attributeChangedCallback() {}
  }

  defineElement('is-transfer-item', IsTransferItem, 'IsTransferItem');
})();
