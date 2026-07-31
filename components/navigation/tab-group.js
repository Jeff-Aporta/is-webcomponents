import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-tab-group>, <is-tab>, <is-tab-panel> — Web Components (vanilla, zero dependencies).
 *
 * Tres componentes cohabitantes:
 *
 *   <is-tab-group active="general" placement="top" activation="auto">
 *     <is-tab slot="nav" panel="general">General</is-tab>
 *     <is-tab slot="nav" panel="custom" disabled>Custom</is-tab>
 *     <is-tab-panel name="general">…</is-tab-panel>
 *     <is-tab-panel name="custom">…</is-tab-panel>
 *   </is-tab-group>
 *
 * Atributos <is-tab-group>
 *   active        string   — nombre del panel activo.
 *   placement     top | bottom | start | end  (default 'top')
 *   activation    auto | manual (default 'auto')
 *   without-scroll-controls  boolean (default false)
 *
 * Atributos <is-tab>
 *   panel         string   — nombre del panel al que apunta (required).
 *   disabled      boolean
 *   closable      boolean  — muestra un botón de cerrar (slot close-button).
 *
 * Atributos <is-tab-panel>
 *   name          string   — id único dentro del tab-group (required).
 *
 * Slots
 *   <is-tab-group>
 *     nav        — tabs (se proyectan automáticamente).
 *     (default)  — paneles.
 *   <is-tab>
 *     (default)   label del tab.
 *     start       icono al inicio.
 *     end         icono al final.
 *     close-button  botón de cerrar (cuando closable).
 *   <is-tab-panel>
 *     (default)  contenido del panel.
 *
 * Eventos
 *   is-tab-show   detail: { name, panel, tab } — al activar un panel.
 *   is-tab-hide   detail: { name, panel, tab } — al ocultar un panel.
 *   is-tab-close  detail: { tab, name }  — cuando se hace click en el close-btn de un is-tab closable.
 *
 * CSS Parts
 *   is-tab-group: ::part(tab-group) ::part(nav) ::part(body) ::part(tabs)
 *   is-tab: ::part(base) ::part(active-indicator)
 *   is-tab-panel: ::part(base)
 */

(() => {
  // ============ <is-tab-group> ============
  const TG_TEMPLATE = document.createElement('template');
  TG_TEMPLATE.innerHTML = /* html */ `
    <div class="tg" part="tab-group">
      <div class="nav" part="nav">
        <button type="button" class="scroll scroll-start" part="scroll-button scroll-button-start" tabindex="-1"
                aria-label="Anterior">
          <is-icon icon="mdi:chevron-left" aria-hidden="true"></is-icon>
        </button>
        <div class="tabs" part="tabs">
          <slot name="nav"></slot>
        </div>
        <button type="button" class="scroll scroll-end" part="scroll-button scroll-button-end" tabindex="-1"
                aria-label="Siguiente">
          <is-icon icon="mdi:chevron-right" aria-hidden="true"></is-icon>
        </button>
      </div>
      <div class="body" part="body">
        <slot></slot>
      </div>
    </div>
  `;

  const TG_OBSERVED = ['active', 'placement', 'activation', 'without-scroll-controls'];

  const VALID_PLACEMENT = ['top', 'bottom', 'start', 'end'];
  const VALID_ACTIVATION = ['auto', 'manual'];

  class IsTabGroup extends HTMLElement {
    static get observedAttributes() { return TG_OBSERVED; }
    #mounted = false;
    #navSlot;
    #tabsWrap;
    #scrollStart;
    #scrollEnd;
    #upgradeProps = ['active', 'placement', 'activation', 'without-scroll-controls'];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TG_TEMPLATE.content.cloneNode(true));
      this.#navSlot = shadow.querySelector('slot[name="nav"]');
      this.#tabsWrap = shadow.querySelector('.tabs');
      this.#scrollStart = shadow.querySelector('.scroll-start');
      this.#scrollEnd = shadow.querySelector('.scroll-end');

      this.#navSlot.addEventListener('slotchange', () => this.#syncPanels());
      // Click delegado sobre tabs.
      this.addEventListener('click', this.#onClick);
      // Keydown delegado.
      this.addEventListener('keydown', this.#onKeyDown);
      // Scroll horizontal.
      this.#scrollStart.addEventListener('click', () => this.#scrollTabs(-1));
      this.#scrollEnd.addEventListener('click', () => this.#scrollTabs(1));
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProperties();
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'top');
      if (!this.hasAttribute('activation')) this.setAttribute('activation', 'auto');
      this.#syncPanels();
      this.#syncScrollUI();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'placement') {
        if (newVal && !VALID_PLACEMENT.includes(newVal)) this.setAttribute('placement', 'top');
      }
      if (name === 'activation') {
        if (newVal && !VALID_ACTIVATION.includes(newVal)) this.setAttribute('activation', 'auto');
      }
      if (name === 'active') this.#syncPanels();
    }

    // ---- public properties ----
    get active() { return this.getAttribute('active') || ''; }
    set active(v) {
      if (v == null || v === '') this.removeAttribute('active');
      else this.setAttribute('active', v);
    }

    get placement() {
      const v = this.getAttribute('placement');
      return VALID_PLACEMENT.includes(v) ? v : 'top';
    }
    set placement(v) {
      if (v == null || v === '') this.removeAttribute('placement');
      else if (VALID_PLACEMENT.includes(v)) this.setAttribute('placement', v);
    }

    get activation() {
      const v = this.getAttribute('activation');
      return VALID_ACTIVATION.includes(v) ? v : 'auto';
    }
    set activation(v) {
      if (v == null || v === '') this.removeAttribute('activation');
      else if (VALID_ACTIVATION.includes(v)) this.setAttribute('activation', v);
    }

    show(name) { this.active = name; }

    // ---- private ----

    #upgradeProperties() {
      for (const a of this.#upgradeProps) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          if (v != null && v !== false) {
            if (v === true) this.setAttribute(a, '');
            else this.setAttribute(a, v);
          }
        }
      }
    }

    #allTabs() {
      return [...this.querySelectorAll(':scope > is-tab[slot="nav"]')];
    }

    #allPanels() {
      return [...this.querySelectorAll(':scope > is-tab-panel')];
    }

    #syncPanels() {
      const tabs = this.#allTabs();
      const panels = this.#allPanels();
      const activeName = this.active;
      for (const t of tabs) {
        const on = t.getAttribute('panel') === activeName;
        t.toggleAttribute('active', on);
        if (on) t.setAttribute('aria-selected', 'true');
        else t.removeAttribute('aria-selected');
      }
      let any = false;
      for (const p of panels) {
        const on = p.getAttribute('name') === activeName;
        if (on) {
          p.removeAttribute('hidden');
          any = true;
        } else {
          p.setAttribute('hidden', '');
        }
      }
      // Si no hay panel activo aún pero hay paneles, activar el primero.
      if (!any && panels.length > 0 && !activeName) {
        const first = panels[0].getAttribute('name');
        this.active = first;
      }
    }

    #onClick = (e) => {
      const tab = e.target.closest('is-tab[slot="nav"]');
      if (!tab) return;
      if (tab.hasAttribute('disabled')) return;
      const name = tab.getAttribute('panel');
      if (!name) return;
      const oldName = this.active;
      this.active = name;
      if (oldName !== name) {
        this.dispatchEvent(new CustomEvent('is-tab-show', {
          detail: { name, panel: this.querySelector(`is-tab-panel[name="${name}"]`), tab },
          bubbles: true,
          composed: true,
        }));
      }
    };

    #onKeyDown = (e) => {
      const target = e.target.closest('is-tab[slot="nav"]');
      if (!target) return;
      const tabs = this.#allTabs().filter((t) => !t.hasAttribute('disabled'));
      const idx = tabs.indexOf(target);
      if (idx === -1) return;
      let next = -1;
      const vertical = this.placement === 'start' || this.placement === 'end';
      if (e.key === 'ArrowRight' && !vertical) { next = (idx + 1) % tabs.length; e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && !vertical) { next = (idx - 1 + tabs.length) % tabs.length; e.preventDefault(); }
      else if (e.key === 'ArrowDown' && vertical) { next = (idx + 1) % tabs.length; e.preventDefault(); }
      else if (e.key === 'ArrowUp' && vertical) { next = (idx - 1 + tabs.length) % tabs.length; e.preventDefault(); }
      else if (e.key === 'Home') { next = 0; e.preventDefault(); }
      else if (e.key === 'End') { next = tabs.length - 1; e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.active = tabs[idx].getAttribute('panel');
        return;
      } else {
        return;
      }
      if (next === -1) return;
      const nextTab = tabs[next];
      nextTab.focus();
      if (this.activation === 'auto') {
        this.active = nextTab.getAttribute('panel');
      }
    };

    #syncScrollUI() {
      if (this.hasAttribute('without-scroll-controls')) {
        this.#scrollStart.hidden = true;
        this.#scrollEnd.hidden = true;
        return;
      }
      // Mostrar/ocultar según si hay overflow.
      const check = () => {
        const tabs = this.#tabsWrap;
        if (tabs.scrollWidth > tabs.clientWidth + 1) {
          this.#scrollStart.hidden = false;
          this.#scrollEnd.hidden = false;
        } else {
          this.#scrollStart.hidden = true;
          this.#scrollEnd.hidden = true;
        }
      };
      check();
      const ro = new ResizeObserver(check);
      ro.observe(this.#tabsWrap);
    }

    #scrollTabs(direction) {
      this.#tabsWrap.scrollBy({
        left: direction * 120,
        behavior: 'smooth',
      });
    }
  }

  if (!customElements.get('is-tab-group')) customElements.define('is-tab-group', IsTabGroup);
  if (typeof window !== 'undefined') window.IsTabGroup = IsTabGroup;

  // ============ <is-tab> ============
  const TAB_TEMPLATE = document.createElement('template');
  TAB_TEMPLATE.innerHTML = /* html */ `
    <button type="button" class="tab" part="base">
      <span class="tab-start" part="start"><slot name="start"></slot></span>
      <slot></slot>
      <span class="tab-end" part="end"><slot name="end"></slot></span>
      <slot name="close-button">
        <button type="button" class="tab-close" part="close-button" tabindex="-1" data-tab-close aria-label="Cerrar">
          <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
        </button>
      </slot>
      <span class="indicator" part="active-indicator" aria-hidden="true"></span>
    </button>
  `;

  const TAB_OBSERVED = ['panel', 'disabled', 'closable', 'active'];

  class IsTab extends HTMLElement {
    static get observedAttributes() { return TAB_OBSERVED; }

    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TAB_TEMPLATE.content.cloneNode(true));
      // Capturar el click en el close button y emitir un evento 'is-tab-close' en el host.
      shadow.addEventListener('click', (e) => {
        const close = e.target.closest('[data-tab-close]');
        if (!close) return;
        e.stopPropagation();
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('is-tab-close', {
          detail: { tab: this, name: this.getAttribute('panel') },
          bubbles: true,
          composed: true,
        }));
      });
    }

    connectedCallback() {
      this.#mounted = true;
      this.setAttribute('role', 'tab');
      this.#syncState();
      // Si está dentro de un tab-group, parent lo descubre y conecta.
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted) return;
      if (name === 'panel' && newVal == null) return;
      if (name === 'active') this.#syncState();
      if (name === 'disabled') this.#syncState();
    }

    #syncState() {
      const btn = this.shadowRoot.querySelector('button.tab');
      const close = this.shadowRoot.querySelector('[data-tab-close]');
      if (btn) btn.disabled = this.hasAttribute('disabled');
      if (close) close.hidden = !this.hasAttribute('closable');
      this.toggleAttribute('aria-selected', this.hasAttribute('active'));
      this.toggleAttribute('data-active', this.hasAttribute('active'));
    }
  }

  if (!customElements.get('is-tab')) customElements.define('is-tab', IsTab);
  if (typeof window !== 'undefined') window.IsTab = IsTab;

  // ============ <is-tab-panel> ============
  const PANEL_TEMPLATE = document.createElement('template');
  PANEL_TEMPLATE.innerHTML = /* html */ `
    <div class="panel" part="base">
      <slot></slot>
    </div>
  `;

  const PANEL_OBSERVED = ['name'];

  class IsTabPanel extends HTMLElement {
    static get observedAttributes() { return PANEL_OBSERVED; }

    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(PANEL_TEMPLATE.content.cloneNode(true));
    }

    connectedCallback() {
      this.#mounted = true;
      this.setAttribute('role', 'tabpanel');
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted) return;
      // No-op: el padre (tab-group) maneja visibility.
    }
  }

  if (!customElements.get('is-tab-panel')) customElements.define('is-tab-panel', IsTabPanel);
  if (typeof window !== 'undefined') window.IsTabPanel = IsTabPanel;
})();
