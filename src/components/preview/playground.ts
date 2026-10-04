/**
 * <iswc-playground> — stage + knobs homogeneos (CDN).
 * Spec: specs/playground/spec.md (S-PG1).
 *
 * Layout: split | panel
 * Slot stage: host vivo
 * Spec: propiedad `spec` o <script type="application/json" slot="spec">
 * Knobs: reusa iswc-preview-controls (mismo contrato controls).
 */
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { definePreviewControls } from '../layout/preview-controls.js';

(() => {
  definePreviewControls();

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root" part="root">
      <header class="head" part="head">
        <h2 class="title" part="title"></h2>
        <p class="lede" part="lede" hidden></p>
      </header>
      <div class="body" part="body">
        <div class="stage-wrap" part="stage-wrap">
          <div class="stage" part="stage"><slot name="stage"></slot></div>
        </div>
        <aside class="config" part="config">
          <iswc-preview-controls part="controls" id="panel" label="Configuracion"></iswc-preview-controls>
        </aside>
      </div>
    </div>
  `;

  const OBSERVED = ['layout', 'title', 'lede', 'target'];

  type SpecItem = {
    control: string;
    prop: string;
    label: string;
    group?: string;
    options?: unknown[];
    default?: unknown;
    value?: unknown;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
  };

  class IswcPlayground extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #titleEl!: HTMLElement;
    #ledeEl!: HTMLElement;
    #panel!: HTMLElement & { spec: SpecItem[] };
    #spec: SpecItem[] = [];
    #applyBound = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#titleEl = shadow.querySelector('.title')!;
      this.#ledeEl = shadow.querySelector('.lede')!;
      this.#panel = shadow.getElementById('panel') as HTMLElement & { spec: SpecItem[] };
    }

    onConnected(): void {
      this.#syncChrome();
      this.#readSpecSlot();
      this.#mountPanel();
      this.#wireApply();
    }

    onAttributeChanged(): void {
      this.#syncChrome();
      if (this.isConnected) this.#mountPanel();
    }

    get layout(): string {
      const v = this.getAttribute('layout');
      return v === 'panel' ? 'panel' : 'split';
    }
    set layout(v: string) { setStringAttr(this, 'layout', v === 'panel' ? 'panel' : 'split'); }

    get title(): string { return this.getAttribute('title') ?? 'Playground'; }
    set title(v: string) { setStringAttr(this, 'title', v); }

    get lede(): string { return this.getAttribute('lede') ?? ''; }
    set lede(v: string) { setStringAttr(this, 'lede', v); }

    get target(): string { return this.getAttribute('target') ?? ''; }
    set target(v: string) { setStringAttr(this, 'target', v); }

    get spec(): SpecItem[] { return this.#spec; }
    set spec(v: SpecItem[]) {
      this.#spec = Array.isArray(v) ? v : [];
      if (this.isConnected) this.#mountPanel();
    }

    #syncChrome(): void {
      this.toggleAttribute('layout', false);
      this.setAttribute('layout', this.layout);
      this.#titleEl.textContent = this.title;
      const lede = this.lede || (this.layout === 'split'
        ? 'Modifica las opciones y observa el resultado al instante.'
        : '');
      this.#ledeEl.textContent = lede;
      this.#ledeEl.hidden = !lede;
    }

    #readSpecSlot(): void {
      const script = this.querySelector('script[type="application/json"][slot="spec"]');
      if (!script?.textContent?.trim()) return;
      try {
        const raw = JSON.parse(script.textContent);
        const list = Array.isArray(raw) ? raw : raw?.controls;
        if (Array.isArray(list)) this.#spec = list;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          if (raw.target && !this.hasAttribute('target')) this.setAttribute('target', String(raw.target));
          if (raw.title && !this.hasAttribute('title')) this.setAttribute('title', String(raw.title));
          if (raw.layout && !this.hasAttribute('layout')) this.setAttribute('layout', String(raw.layout));
          if (raw.lede && !this.hasAttribute('lede')) this.setAttribute('lede', String(raw.lede));
        }
      } catch (e) {
        console.warn('[iswc-playground] spec JSON invalido', e);
      }
    }

    #mountPanel(): void {
      this.#panel.spec = this.#spec.map((c) => ({ ...c }));
      this.#panel.setAttribute('label', this.layout === 'split' ? 'Configuracion' : 'Controles');
      // Phase W20: propaga el `tag` del host (o de la primera instancia is-*)
      // al panel para que la pestaña Code pueda introspectar el Shadow DOM.
      const host = this.#host();
      const tag = host?.localName;
      if (tag) this.#panel.setAttribute('tag', tag);
      else this.#panel.removeAttribute('tag');
    }

    #host(): Element | null {
      const slot = this.shadowRoot?.querySelector('slot[name="stage"]') as HTMLSlotElement | null;
      const assigned = slot?.assignedElements({ flatten: true }) ?? [];
      const sel = this.target;
      if (sel) {
        for (const el of assigned) {
          if (el.matches?.(sel)) return el;
          const hit = el.querySelector?.(sel);
          if (hit) return hit;
        }
        return this.querySelector(sel);
      }
      return assigned.find((el) => el.tagName.toLowerCase().startsWith('iswc-'))
        ?? [...this.querySelectorAll('*')].find((el) => el.tagName.toLowerCase().startsWith('iswc-'))
        ?? null;
    }

    #wireApply(): void {
      if (this.#applyBound) return;
      this.#applyBound = true;
      this.#panel.addEventListener('iswc-controls-change', ((e: Event) => {
        const detail = (e as CustomEvent<{ def: SpecItem; valor: unknown }>).detail;
        const host = this.#host();
        if (!detail?.def || !host) return;
        this.#aplicar(host, detail.def, detail.valor);
        emit(this, 'iswc-controls-change', detail);
      }) as EventListener);
    }

    #aplicar(host: Element, def: SpecItem, valor: unknown): void {
      const prop = String(def.prop || '');
      if (prop.startsWith('attr:')) {
        const attr = prop.slice(5);
        if (typeof valor === 'boolean') host.toggleAttribute(attr, valor);
        else if (valor == null || valor === '') host.removeAttribute(attr);
        else host.setAttribute(attr, String(valor));
        return;
      }
      const key = prop.startsWith('prop:') ? prop.slice(5) : prop;
      try {
        (host as unknown as Record<string, unknown>)[key] = valor as never;
      } catch {
        console.warn('[iswc-playground] no se pudo aplicar', key, valor);
      }
    }
  }

  defineElement('iswc-playground', IswcPlayground, 'IswcPlayground');
})();
