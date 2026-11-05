import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import '@jeff-aporta/iswc-base/components/forms/input.js';
import css from 'iswc:css';

/**
 * <iswc-transfer> — Doble lista de selección (vanilla, zero dependencies).
 *
 * Mueve elementos entre una lista de origen y una lista de destino.
 *
 *   <iswc-transfer id="t1">
 *     <iswc-transfer-item value="a">Alpha</iswc-transfer-item>
 *     <iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
 *   </iswc-transfer>
 *
 * Atributos <iswc-transfer>
 *   source-title       string
 *   target-title       string
 *   searchable         boolean
 *   without-buttons    boolean  — sin botones prev/next
 *   without-headings   boolean
 *   max-target         number   — máximo de items en target.
 *
 * Atributos <iswc-transfer-item>
 *   value        string
 *   disabled     boolean
 *
 * Slots
 *   <iswc-transfer-item>
 *     (default)   label.
 *
 * Eventos
 *   iswc-transfer-change  detail: { item, source, target, values }
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
          <iswc-input type="search" density="compact" placeholder="Buscar…" aria-label="Buscar" clearable></iswc-input>
        </div>
        <div class="list" part="list" role="listbox" aria-multiselectable="true"></div>
      </div>
      <div class="controls" part="controls">
        <iswc-button class="ctrl" data-action="to-target" variant="outlined" color="text" aria-label="Mover todos a destino" title="Mover todos a destino">
          <iswc-icon slot="start" icon="mdi:chevron-double-right" aria-hidden="true"></iswc-icon>
        </iswc-button>
        <iswc-button class="ctrl" data-action="to-source" variant="outlined" color="text" aria-label="Mover todos a origen" title="Mover todos a origen">
          <iswc-icon slot="start" icon="mdi:chevron-double-left" aria-hidden="true"></iswc-icon>
        </iswc-button>
      </div>
      <div class="pane target" part="pane">
        <div class="pane-head" part="pane-head">
          <span class="title" part="title">Target</span>
          <span class="count" part="count">0</span>
        </div>
        <div class="search" part="search">
          <iswc-input type="search" density="compact" placeholder="Buscar…" aria-label="Buscar" clearable></iswc-input>
        </div>
        <div class="list" part="list" role="listbox" aria-multiselectable="true"></div>
      </div>
      <div class="sr-status" part="sr-status" aria-live="polite" aria-atomic="true"></div>
    </div>
  `;

  const TRANSFER_OBSERVED = ['source-title', 'target-title', 'searchable', 'without-buttons', 'without-headings', 'max-target'];

  class IswcTransfer extends IswcElement {
    static tag = 'iswc-transfer';
    static css = css;
    static deps = ['iswc-button', 'iswc-empty-state', 'iswc-icon'];

    static observed = [...TRANSFER_OBSERVED];
    #panelSource!: HTMLElement;
    #panelTarget!: HTMLElement;
    #searchSource!: HTMLElement & { value?: string };
    #searchTarget!: HTMLElement & { value?: string };
    #listSource!: HTMLElement;
    #listTarget!: HTMLElement;
    #countSource!: HTMLElement;
    #countTarget!: HTMLElement;
    #titleSource!: HTMLElement;
    #titleTarget!: HTMLElement;
    #srStatus!: HTMLElement;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TRANSFER_TEMPLATE.content.cloneNode(true));
      this.#panelSource = shadow.querySelector<HTMLElement>('.pane.source')!;
      this.#panelTarget = shadow.querySelector<HTMLElement>('.pane.target')!;
      this.#searchSource = this.#panelSource.querySelector<HTMLElement>('.search iswc-input')!;
      this.#searchTarget = this.#panelTarget.querySelector<HTMLElement>('.search iswc-input')!;
      this.#listSource = this.#panelSource.querySelector<HTMLElement>('.list')!;
      this.#listTarget = this.#panelTarget.querySelector<HTMLElement>('.list')!;
      this.#countSource = this.#panelSource.querySelector<HTMLElement>('.count')!;
      this.#countTarget = this.#panelTarget.querySelector<HTMLElement>('.count')!;
      this.#titleSource = this.#panelSource.querySelector<HTMLElement>('.title')!;
      this.#titleTarget = this.#panelTarget.querySelector<HTMLElement>('.title')!;
      this.#srStatus = shadow.querySelector<HTMLElement>('.sr-status')!;
      shadow.querySelector('[data-action="to-target"]')!.addEventListener('click', () => this.#move(true));
      shadow.querySelector('[data-action="to-source"]')!.addEventListener('click', () => this.#move(false));
      this.#searchSource.addEventListener('iswc-input', () => this.#render());
      this.#searchTarget.addEventListener('iswc-input', () => this.#render());
    }

    onConnected() {
      if (!this.hasAttribute('source-title')) this.setAttribute('source-title', 'Disponibles');
      if (!this.hasAttribute('target-title')) this.setAttribute('target-title', 'Asignados');
      this.#render();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
      this.#render();
    }

    get values() {
      return [...this.querySelectorAll<HTMLElement>(':scope > iswc-transfer-item[selected]')].map((it: HTMLElement) => it.getAttribute('value'));
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
      return [...this.querySelectorAll<HTMLElement>(':scope > iswc-transfer-item')];
    }

    #visibleItems(inTarget: boolean): HTMLElement[] {
      const term = (inTarget ? this.#searchTarget : this.#searchSource).value?.trim().toLowerCase() ?? '';
      return this.#items().filter((it: HTMLElement) => it.hasAttribute('selected') === inTarget)
        .filter((it) => !term || (it.textContent ?? '').toLowerCase().includes(term));
    }

    #render() {
      this.#sync();
      const source = this.#visibleItems(false);
      const target = this.#visibleItems(true);
      this.#listSource.innerHTML = '';
      this.#listTarget.innerHTML = '';
      this.#pintarLista(this.#listSource, source, this.#searchSource.value ?? '');
      this.#pintarLista(this.#listTarget, target, this.#searchTarget.value ?? '');
      this.#countSource.textContent = String(source.length);
      this.#countTarget.textContent = String(target.length);
      // Bloquear el paso a target al alcanzar el máximo.
      this.shadowRoot!.querySelector('[data-action="to-target"]')?.toggleAttribute('disabled', this.#lleno());
    }

    #pintarLista(lista: HTMLElement, items: HTMLElement[], termino: string): void {
      if (items.length) {
        items.forEach((it) => lista.appendChild(this.#renderItem(it)));
        return;
      }
      const vacio = document.createElement('iswc-empty-state');
      vacio.setAttribute('titulo', termino.trim() ? 'Sin resultados' : 'Sin elementos');
      lista.appendChild(vacio);
    }

    /** Tope de `max-target` alcanzado. */
    #lleno(): boolean {
      const max = parseInt(this.getAttribute('max-target') || '0', 10);
      return max > 0 && this.values.length >= max;
    }

    #renderItem(it: HTMLElement) {
      const div = document.createElement('div');
      div.className = 'item';
      div.setAttribute('role', 'option');
      div.setAttribute('aria-selected', String(it.hasAttribute('selected')));
      div.dataset.value = it.getAttribute('value') || '';
      div.textContent = it.textContent;
      if (it.hasAttribute('disabled')) {
        div.classList.add('disabled');
        div.setAttribute('aria-disabled', 'true');
        return div;
      }
      div.tabIndex = 0;
      div.addEventListener('click', () => this.#alternar(it));
      div.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        this.#alternar(it);
      });
      return div;
    }

    /** Pasa un elemento a la otra lista; el foco queda en él para seguir con el teclado. */
    #alternar(it: HTMLElement): void {
      if (!it.hasAttribute('selected') && this.#lleno()) {
        this.#announce('Se alcanzó el máximo de elementos asignados');
        return;
      }
      it.toggleAttribute('selected');
      this.#render();
      this.#emitChange(it);
      const valor = it.getAttribute('value') || '';
      const movido = [...this.shadowRoot!.querySelectorAll<HTMLElement>('.item')].find((d) => d.dataset.value === valor);
      movido?.focus();
    }

    #move(toTarget: boolean): void {
      const items = this.#items();
      const movedLabels: string[] = [];
      items.forEach((it: HTMLElement) => {
        if (it.hasAttribute('disabled')) return;
        if (toTarget) {
          if (this.#lleno()) return;
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
      emit(this, 'iswc-transfer-change', { source: items.length - this.values.length, target: this.values.length, values: this.values });
    }

    #emitChange(item: HTMLElement): void {
      const label = (item.textContent || item.getAttribute('value') || '').trim();
      const wasSelected = !item.hasAttribute('selected');
      this.#announce(`${label} ${wasSelected ? 'movido a origen' : 'movido a destino'}`);
      emit(this, 'iswc-transfer-change', {
        item,
        source: this.#items().filter((it: HTMLElement) => !it.hasAttribute('selected')).length,
        target: this.values.length,
        values: this.values,
      });
    }
  }

  define(IswcTransfer, 'IswcTransfer');

  // ============ <iswc-transfer-item> ============
  const ITEM_OBSERVED = ['value', 'selected', 'disabled'];

  class IswcTransferItem extends IswcElement {
    static tag = 'iswc-transfer-item';
    static shadowInit: ShadowRootInit | null = null;
    static observed = ITEM_OBSERVED;

    connectedCallback(): void {
      this.setAttribute('role', 'presentation');
    }

    attributeChangedCallback() {}
  }

  define(IswcTransferItem, 'IswcTransferItem');
})();
