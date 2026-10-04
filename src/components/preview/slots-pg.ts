/**
 * <iswc-slots-pg> — Helper para playgrounds con slots.
 *
 * Estandar W11 (2026-10-03-zod-migration): cualquier componente con slots debe
 * envolver su playground en `<iswc-slots-pg tag="<iswc-x>">` con dos tabs:
 *
 *   - Tab "Simple": la instancia viva (delegar al PG existente del componente).
 *   - Tab "Slots": un segundo ejemplar con TODOS los slots, mostrando:
 *       * Estructura interna del Shadow DOM (HTML con parts) — read-only.
 *       * Implementacion real del componente con slots editables.
 *       * Code dropdown editable por cada slot.
 *       * Boton "Restart" para resetear todo al estado inicial.
 *
 * Layout del tab "Slots" (ajuste W11.1):
 *   ┌──────────────────────────────────────────┐
 *   │ 2nd instance (live)                      │
 *   ├───────────────────────┬──────────────────┤
 *   │ Shadow DOM template   │ Real impl code   │  ← split horizontal
 *   │ (read-only)           │ (editable)       │
 *   ├───────────────────────┴──────────────────┤
 *   │ Per-slot dropdown editors                │
 *   ├──────────────────────────────────────────┤
 *   │ Restart button                           │
 *   └──────────────────────────────────────────┘
 *
 * Deteccion de slots:
 *   1. Lee los hijos del slots-pg (children con `slot="<name>"` son templates).
 *   2. Crea un hidden instance del target tag e introspecta su Shadow DOM en
 *      busca de `<slot>` elements para listar los slots REALES del componente.
 *
 * Uso:
 *   <iswc-slots-pg tag="iswc-button">
 *     <iswc-button>Texto</iswc-button>
 *     <iswc-icon slot="start" icon="mdi:check"></iswc-icon>
 *     <iswc-icon slot="end" icon="mdi:arrow-right"></iswc-icon>
 *   </iswc-slots-pg>
 *
 * Atributos
 *   tag           string  — el target component (e.g. "iswc-button"). Required.
 *   title         string  — titulo visible del header (default: "<iswc-x> slots")
 *   default-tab   simple | slots   | auto (default: "auto")
 *                           auto usa "simple" salvo que el target tenga >2 slots.
 *
 * Slots light DOM
 *   (default)     — children con `slot="<name>"` se interpretan como contenido
 *                   inicial para cada slot del target. Children sin slot
 *                   van al default slot.
 *
 * Eventos
 *   iswc-slots-pg-restart — al pulsar Restart. detail: { tag, slots }.
 */
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import '../actions/button.js';
import '../media/icon.js';

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root" part="root">
      <header class="head" part="head">
        <h3 class="title" part="title"></h3>
        <p class="lede" part="lede" hidden></p>
      </header>
      <nav class="tabs" part="tabs" role="tablist" aria-label="Tabs del playground">
        <button type="button" class="tab tab--simple" part="tab tab--simple"
                role="tab" data-tab="simple" aria-selected="true"
                aria-controls="pgSimplePanel">
          <iswc-icon class="tab__icon" icon="mdi:view-grid-outline" aria-hidden="true"></iswc-icon>
          <span class="tab__label">Simple</span>
        </button>
        <button type="button" class="tab tab--slots" part="tab tab--slots"
                role="tab" data-tab="slots" aria-selected="false"
                aria-controls="pgSlotsPanel">
          <iswc-icon class="tab__icon" icon="mdi:puzzle-outline" aria-hidden="true"></iswc-icon>
          <span class="tab__label">Slots</span>
          <span class="tab__badge" part="tab-badge" data-slot-count></span>
        </button>
      </nav>

      <section id="pgSimplePanel" class="panel panel--simple" part="panel panel--simple"
               role="tabpanel" data-panel="simple">
        <div class="stage" part="stage" data-stage="simple"></div>
      </section>

      <section id="pgSlotsPanel" class="panel panel--slots" part="panel panel--slots"
               role="tabpanel" data-panel="slots" hidden>
        <div class="stage stage--slots" part="stage stage--slots" data-stage="slots"></div>

        <div class="splits" part="splits">
          <div class="splits__cell splits__cell--anatomy" part="anatomy">
            <header class="splits__head">
              <h4 class="splits__title">Shadow DOM template</h4>
              <span class="splits__hint" part="splits-hint">read-only</span>
            </header>
            <pre class="code splits__code splits__code--readonly"
                 part="shadow-template" data-role="shadow-template"></pre>
          </div>
          <div class="splits__cell splits__cell--impl" part="impl">
            <header class="splits__head">
              <h4 class="splits__title">Implementacion real</h4>
              <span class="splits__hint" part="splits-hint">editable</span>
            </header>
            <textarea class="code splits__code splits__code--editable"
                      part="impl-code" data-role="impl-code" spellcheck="false"
                      aria-label="Implementacion editable del componente con slots"></textarea>
          </div>
        </div>

        <details class="drops" part="drops" open>
          <summary class="drops__summary">
            Editar slots individualmente
            <span class="drops__count" part="drops-count" data-slot-count></span>
          </summary>
          <div class="drops__list" part="drops-list" data-role="drops-list"></div>
        </details>

        <footer class="actions" part="actions">
          <button type="button" class="restart" part="restart"
                  data-role="restart">
            <iswc-icon class="restart__icon" icon="mdi:refresh" aria-hidden="true"></iswc-icon>
            <span>Restart</span>
          </button>
        </footer>
      </section>
    </div>
  `;

  type SlotInfo = {
    /** Slot name ('' = default). */
    name: string;
    /** Initial HTML for the slot, captured at connect time. */
    initialHtml: string;
  };

  const OBSERVED = ['tag', 'title', 'default-tab'];

  class IswcSlotsPg extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #tag = '';
    #titleEl!: HTMLElement;
    #ledeEl!: HTMLElement;
    #tabSimple!: HTMLButtonElement;
    #tabSlots!: HTMLButtonElement;
    #panelSimple!: HTMLElement;
    #panelSlots!: HTMLElement;
    #stageSimple!: HTMLElement;
    #stageSlots!: HTMLElement;
    #shadowPre!: HTMLElement;
    #implTextarea!: HTMLTextAreaElement;
    #dropsList!: HTMLElement;
    #restartBtn!: HTMLButtonElement;
    #slotBadges!: NodeListOf<HTMLElement>;

    /** Snapshot del HTML inicial del Light DOM (text content del primer target). */
    #initialTargetHtml = '';
    /** Slot info: name → initial HTML (captured at connect time). */
    #slots: SlotInfo[] = [];
    /** Initial Shadow DOM template string. */
    #initialShadowTemplate = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      const root = shadow as unknown as Document | ShadowRoot;
      this.#titleEl = root.querySelector<HTMLElement>('.title')!;
      this.#ledeEl = root.querySelector<HTMLElement>('.lede')!;
      this.#tabSimple = root.querySelector<HTMLButtonElement>('.tab--simple')!;
      this.#tabSlots = root.querySelector<HTMLButtonElement>('.tab--slots')!;
      this.#panelSimple = root.querySelector<HTMLElement>('#pgSimplePanel')!;
      this.#panelSlots = root.querySelector<HTMLElement>('#pgSlotsPanel')!;
      this.#stageSimple = root.querySelector<HTMLElement>('[data-stage="simple"]')!;
      this.#stageSlots = root.querySelector<HTMLElement>('[data-stage="slots"]')!;
      this.#shadowPre = root.querySelector<HTMLElement>('[data-role="shadow-template"]')!;
      this.#implTextarea = root.querySelector<HTMLTextAreaElement>('[data-role="impl-code"]')!;
      this.#dropsList = root.querySelector<HTMLElement>('[data-role="drops-list"]')!;
      this.#restartBtn = root.querySelector<HTMLButtonElement>('[data-role="restart"]')!;
      this.#slotBadges = root.querySelectorAll<HTMLElement>('[data-slot-count]');
    }

    onConnected(): void {
      this.#tag = (this.getAttribute('tag') || '').trim();
      if (!this.#tag) {
        console.warn('[iswc-slots-pg] falta el atributo `tag`.');
      }
      this.#syncTitle();
      this.#captureInitial();
      // La detección de slots requiere el componente target ya registrado.
      // Si no lo está, fallback a los slots de los children capturados.
      this.#detectAndRender();
      this.#wireTabs();
      this.#wireRestart();
      this.#wireImplEditor();
      this.#syncDefaultTab();
    }

    onAttributeChanged(): void {
      if (!this.isConnected) return;
      this.#syncTitle();
      this.#syncDefaultTab();
    }

    get tag(): string { return this.getAttribute('tag') ?? ''; }
    set tag(v: string) {
      if (v == null) this.removeAttribute('tag');
      else this.setAttribute('tag', String(v));
    }

    get title(): string {
      return this.getAttribute('title') ?? '';
    }
    set title(v: string) {
      if (v == null) this.removeAttribute('title');
      else this.setAttribute('title', String(v));
    }

    get defaultTab(): string {
      const v = (this.getAttribute('default-tab') || 'auto').trim().toLowerCase();
      return v === 'simple' || v === 'slots' ? v : 'auto';
    }
    set defaultTab(v: string) {
      if (v == null || v === 'auto') this.removeAttribute('default-tab');
      else this.setAttribute('default-tab', String(v));
    }

    #syncTitle(): void {
      const fallback = this.#tag ? `Slots de <${this.#tag}>` : 'Playground de slots';
      this.#titleEl.textContent = this.title || fallback;
      const lede = this.getAttribute('lede') || '';
      if (lede) {
        this.#ledeEl.textContent = lede;
        this.#ledeEl.hidden = false;
      } else {
        this.#ledeEl.hidden = true;
      }
    }

    /**
     * Captura los hijos del slots-pg y los prepara:
     *   - `#slots` lista de slots con su contenido inicial (HTML).
     *   - `#initialTargetHtml` es el outerHTML del primer hijo target encontrado,
     *     o el outerHTML combinado de los hijos si no hay target aislado.
     */
    #captureInitial(): void {
      const children = [...this.children].filter(
        (n): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE,
      );
      const slotMap = new Map<string, SlotInfo>();
      // Default slot: children sin atributo slot (o slot="").
      const defaults: string[] = [];
      for (const child of children) {
        const slotName = child.getAttribute('slot') ?? '';
        const html = child.outerHTML;
        if (!slotName) {
          defaults.push(html);
        }
        if (!slotMap.has(slotName)) {
          slotMap.set(slotName, { name: slotName, initialHtml: html });
        }
      }
      // Asegurar que el slot default exista aunque esté vacío.
      if (!slotMap.has('')) {
        slotMap.set('', { name: '', initialHtml: '' });
      }
      this.#slots = [...slotMap.values()];

      // Outer HTML combinado (todos los children en orden) → initial impl code.
      this.#initialTargetHtml = children.map((c) => c.outerHTML).join('\n');
    }

    /** Detecta slots reales del target component y arranca el render. */
    #detectAndRender(): void {
      const tag = this.#tag;
      if (!tag) {
        this.#renderFallback();
        return;
      }
      const ctor = customElements.get(tag);
      if (!ctor) {
        // No se puede introspectar sin el CE registrado.
        this.#renderFallback();
        return;
      }
      // Intentar leer __TEMPLATE estático (muchos modal/tempés lo exponen).
      const tpl = (ctor as unknown as { __TEMPLATE?: HTMLTemplateElement }).__TEMPLATE;
      if (tpl && tpl.innerHTML) {
        this.#initialShadowTemplate = tpl.innerHTML.trim();
        this.#renderPanels();
        return;
      }
      // Fallback: crear un hidden instance e introspectar su shadowRoot.
      this.#introspectInstance(tag).then((shadowHtml) => {
        this.#initialShadowTemplate = shadowHtml;
        this.#renderPanels();
      }).catch(() => {
        this.#renderFallback();
      });
    }

    /** Crea un hidden instance y devuelve su shadowRoot serializado. */
    async #introspectInstance(tag: string): Promise<string> {
      const probe = document.createElement(tag);
      probe.style.position = 'absolute';
      probe.style.left = '-99999px';
      probe.style.top = '-99999px';
      probe.style.pointerEvents = 'none';
      probe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(probe);
      // Esperar a que el shadow se monte (connectedCallback + initShadow).
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const root = probe.shadowRoot;
      const html = root ? root.innerHTML.trim() : '';
      probe.remove();
      return html;
    }

    #renderFallback(): void {
      this.#initialShadowTemplate = `<!-- No se pudo detectar el shadow DOM de <${this.#tag}>. -->`;
      this.#renderPanels();
    }

    /** Renderiza los dos tabs usando el estado capturado. */
    #renderPanels(): void {
      // Stage "Simple": clonar los children dentro de un <target-tag>.
      this.#stageSimple.replaceChildren();
      this.#stageSimple.append(this.#buildTargetInstance(false));

      // Stage "Slots": clonar los children dentro de un <target-tag> (live).
      this.#stageSlots.replaceChildren();
      this.#stageSlots.append(this.#buildTargetInstance(true));

      // Shadow DOM template (read-only).
      this.#shadowPre.textContent = this.#initialShadowTemplate;

      // Impl code editable: empezamos con la versión "bonita" (un nodo por slot).
      const implInitial = this.#composeImplHtml();
      this.#implTextarea.value = implInitial;
      this.#initialTargetHtml = implInitial;

      // Slot badge counts.
      const count = this.#slots.length;
      for (const badge of this.#slotBadges) badge.textContent = String(count);

      // Per-slot dropdown editors.
      this.#renderDrops();

      this.#applyActiveTab(this.#readActiveTabFromDom());
    }

    /** Construye un <target-tag> con clones de los children. */
    #buildTargetInstance(useInitialCaptured: boolean): HTMLElement {
      const tag = this.#tag || 'div';
      const el = document.createElement(tag);
      for (const slot of this.#slots) {
        if (!slot.initialHtml) continue;
        const frag = this.#parseFragment(slot.initialHtml);
        // Mover todos los nodos hijos del fragment al target, conservando `slot`.
        for (const node of [...frag.childNodes]) {
          el.appendChild(node);
        }
      }
      // Marcar para debugging.
      el.setAttribute('data-pg-source', useInitialCaptured ? 'slots-tab' : 'simple-tab');
      return el;
    }

    /** Parsea un HTML string y devuelve el fragment. */
    #parseFragment(html: string): DocumentFragment {
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      return tpl.content;
    }

    /** Compone el HTML del "real impl" agrupando nodos por slot. */
    #composeImplHtml(): string {
      const tag = this.#tag || 'div';
      const inner = this.#slots
        .filter((s) => !!s.initialHtml)
        .map((s) => {
          const attr = s.name ? ` slot="${s.name}"` : '';
          // Cada child se queda en su propia línea, indentado.
          const content = s.initialHtml
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n');
          return content ? content.replace(/^  /, `  ${attr.trim() ? `<${attr.slice(1).trim()}` : ''}`)
            : '';
        })
        .filter(Boolean)
        .join('\n');
      if (inner) {
        return `<${tag}>\n${inner}\n</${tag}>`;
      }
      return `<${tag}></${tag}>`;
    }

    /** Renderiza los per-slot `<details>` editors. */
    #renderDrops(): void {
      this.#dropsList.replaceChildren();
      if (!this.#slots.length) {
        const empty = document.createElement('p');
        empty.className = 'drops__empty';
        empty.textContent = 'Este componente no tiene slots detectables.';
        this.#dropsList.append(empty);
        return;
      }
      for (const slot of this.#slots) {
        const det = document.createElement('details');
        det.className = 'drop';
        det.dataset.slotName = slot.name;
        det.setAttribute('part', 'drop');

        const sum = document.createElement('summary');
        sum.className = 'drop__summary';
        sum.setAttribute('part', 'drop-summary');
        const label = document.createElement('span');
        label.className = 'drop__label';
        label.textContent = slot.name ? `slot="${slot.name}"` : 'slot (default)';
        const meta = document.createElement('span');
        meta.className = 'drop__meta';
        meta.textContent = `${slot.initialHtml.length} chars`;
        sum.append(label, meta);
        det.append(sum);

        const ta = document.createElement('textarea');
        ta.className = 'code drop__editor';
        ta.setAttribute('part', 'drop-editor');
        ta.spellcheck = false;
        ta.setAttribute('aria-label', `Slot ${slot.name || 'default'} HTML`);
        ta.value = slot.initialHtml;
        ta.dataset.slotName = slot.name;
        det.append(ta);
        this.#dropsList.append(det);
      }
    }

    #wireTabs(): void {
      this.#tabSimple.addEventListener('click', () => this.#showTab('simple'));
      this.#tabSlots.addEventListener('click', () => this.#showTab('slots'));
    }

    #showTab(which: 'simple' | 'slots'): void {
      this.#applyActiveTab(which);
    }

    #applyActiveTab(which: 'simple' | 'slots'): void {
      const isSimple = which === 'simple';
      this.#tabSimple.setAttribute('aria-selected', String(isSimple));
      this.#tabSlots.setAttribute('aria-selected', String(!isSimple));
      this.#tabSimple.toggleAttribute('active', isSimple);
      this.#tabSlots.toggleAttribute('active', !isSimple);
      this.#panelSimple.toggleAttribute('hidden', !isSimple);
      this.#panelSlots.toggleAttribute('hidden', isSimple);
      this.dataset.activeTab = which;
    }

    #readActiveTabFromDom(): 'simple' | 'slots' {
      return this.dataset.activeTab === 'slots' ? 'slots' : 'simple';
    }

    #syncDefaultTab(): void {
      // "auto" → simple si ≤2 slots, slots si >2.
      // "simple" / "slots" → forzar.
      const which = this.defaultTab;
      if (which === 'auto') {
        this.#applyActiveTab(this.#slots.length > 2 ? 'slots' : 'simple');
      } else {
        this.#applyActiveTab(which);
      }
    }

    #wireRestart(): void {
      this.#restartBtn.addEventListener('click', () => this.#restart());
    }

    /** Reset de todo al estado inicial. */
    #restart(): void {
      // 1. Restaurar slots desde el snapshot inicial.
      this.#slots = this.#slots.map((s) => ({ ...s }));
      // 2. Reconstruir el target instance en el tab Slots.
      this.#stageSlots.replaceChildren();
      this.#stageSlots.append(this.#buildTargetInstance(true));
      // 3. Resetear el editor "Real impl".
      const implInitial = this.#composeImplHtml();
      this.#implTextarea.value = implInitial;
      this.#initialTargetHtml = implInitial;
      // 4. Resetear todos los per-slot editors.
      for (const ta of this.#dropsList.querySelectorAll<HTMLTextAreaElement>('textarea')) {
        const name = ta.dataset.slotName ?? '';
        const slot = this.#slots.find((s) => s.name === name);
        if (slot) ta.value = slot.initialHtml;
      }
      // 5. Avisar al exterior.
      emit(this, 'iswc-slots-pg-restart', { tag: this.#tag, slots: this.#slots.length });
    }

    /** Re-sincroniza el target instance del tab Slots desde los editores. */
    #syncFromEditors(): void {
      // 1. Recoger los valores actuales de los per-slot editors.
      const overrides = new Map<string, string>();
      for (const ta of this.#dropsList.querySelectorAll<HTMLTextAreaElement>('textarea')) {
        const name = ta.dataset.slotName ?? '';
        overrides.set(name, ta.value);
      }
      // 2. Reconstruir el target con esos contenidos.
      this.#stageSlots.replaceChildren();
      const inst = document.createElement(this.#tag || 'div');
      for (const [name, html] of overrides) {
        if (!html.trim()) continue;
        const frag = this.#parseFragment(html);
        for (const node of [...frag.childNodes]) {
          // Conservar o asignar el slot.
          if (name && node.nodeType === Node.ELEMENT_NODE) {
            (node as Element).setAttribute('slot', name);
          }
          inst.appendChild(node);
        }
      }
      inst.setAttribute('data-pg-source', 'slots-tab');
      this.#stageSlots.append(inst);

      // 3. Actualizar el editor "Real impl".
      this.#implTextarea.value = this.#composeImplFromMap(overrides);
    }

    #wireImplEditor(): void {
      this.#implTextarea.addEventListener('input', () => {
        // El editor "Real impl" es de solo lectura para el render: el usuario
        // edita per-slot y el textarea refleja el resultado. Para mantener
        // feedback inmediato, permitimos que el textarea también empuje cambios
        // al render, pero con un debounce ligero.
        this.#syncFromImplText();
      });
    }

    /** Sincroniza el target desde el textarea "Real impl". */
    #syncFromImplText(): void {
      const raw = this.#implTextarea.value;
      // Re-parsear y asignar slots basándonos en atributo slot="…".
      const frag = this.#parseFragment(raw);
      // Buscar el wrapper: el primer nodo de tipo elemento debe ser <target-tag>.
      // Si el usuario rompió la estructura, fallback a ignorar.
      const wrapper = [...frag.childNodes].find(
        (n): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE && (n as Element).localName === (this.#tag || '').toLowerCase(),
      );
      if (!wrapper) return;
      this.#stageSlots.replaceChildren();
      wrapper.setAttribute('data-pg-source', 'slots-tab');
      this.#stageSlots.append(wrapper);
    }

    #composeImplFromMap(overrides: Map<string, string>): string {
      const tag = this.#tag || 'div';
      const inner = [...overrides.entries()]
        .filter(([, html]) => !!html.trim())
        .map(([, html]) => html.split('\n').map((l) => `  ${l}`).join('\n'))
        .join('\n');
      if (inner) {
        return `<${tag}>\n${inner}\n</${tag}>`;
      }
      return `<${tag}></${tag}>`;
    }
  }

  defineElement('iswc-slots-pg', IswcSlotsPg, 'IswcSlotsPg');
})();