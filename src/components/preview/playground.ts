/**
 * <iswc-playground> — stage + knobs homogeneos (CDN).
 * Spec: specs/playground/spec.md (S-PG1).
 *
 * Layout: split | panel
 * Slot stage: host vivo
 * Spec: propiedad `spec` o <script type="application/json" slot="spec">
 * Knobs: reusa iswc-preview-controls (mismo contrato controls).
 * Extras: grupos ≠ General → disclosure; `style` también en disclosure.
 * Format del style: botón plain/pill solo icono.
 *
 * Prefijos de prop:
 *   attr:name     → setAttribute
 *   prop:name     → propiedad JS
 *   content:      → textContent del host (label / “Hola mundo”)
 *   style: / attr:style → style.cssText
 */
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { definePreviewControls } from '../layout/preview-controls.js';
import '../code/code.js';
import '../actions/button.js';
import '../media/icon.js';
import '../layout/details.js';

(() => {
  definePreviewControls();

  const DEFAULT_STYLE_FORMAT = Object.freeze({
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    semi: true,
    singleQuote: false,
    trailingComma: false,
    endOfLine: 'lf' as const,
  });

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
          <iswc-preview-controls part="controls" id="panel" label="Atributos"></iswc-preview-controls>
          <iswc-details class="style-editor" part="style-editor" summary="style"
                        variant="plain" icon-placement="end" aria-label="style">
            <header class="style-editor__bar">
              <span class="style-editor__hint">CSS del ejemplar (style attribute)</span>
              <iswc-button id="styleFormatBtn" type="button" color="text" variant="plain" shape="pill"
                      title="Formatear CSS" aria-label="Formatear CSS">
                <iswc-icon icon="mdi:code-tags-check" aria-hidden="true"></iswc-icon>
              </iswc-button>
            </header>
            <div class="style-editor__body">
              <iswc-code id="styleCode" lang="css" wrap line-numbers="false"
                         placeholder="/* CSS del ejemplar (style attribute) */"
                         min-height="6rem"></iswc-code>
            </div>
          </iswc-details>
        </aside>
      </div>
    </div>
  `;

  const OBSERVED = ['layout', 'title', 'heading', 'lede', 'target'];

  type SpecItem = {
    control: string;
    prop: string;
    label: string;
    group?: string;
    disclosure?: boolean;
    options?: unknown[];
    default?: unknown;
    value?: unknown;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
  };

  type CodeEl = HTMLElement & {
    value: string;
    formatConfig: unknown;
    format(config?: unknown): string;
  };

  class IswcPlayground extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #titleEl!: HTMLElement;
    #ledeEl!: HTMLElement;
    #panel!: HTMLElement & { spec: SpecItem[] };
    #styleCode!: CodeEl;
    #styleFormatBtn!: HTMLElement;
    #spec: SpecItem[] = [];
    #applyBound = false;
    #styleBound = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#titleEl = shadow.querySelector('.title')!;
      this.#ledeEl = shadow.querySelector('.lede')!;
      this.#panel = shadow.getElementById('panel') as HTMLElement & { spec: SpecItem[] };
      this.#styleCode = shadow.getElementById('styleCode') as CodeEl;
      this.#styleFormatBtn = shadow.getElementById('styleFormatBtn')!;
    }

    onConnected(): void {
      // `spec` asignado pre-upgrade tapa el setter (data-prop propia).
      if (Object.prototype.hasOwnProperty.call(this, 'spec')) {
        const raw = (this as unknown as { spec: unknown }).spec;
        delete (this as unknown as { spec?: unknown }).spec;
        this.spec = Array.isArray(raw) ? raw as SpecItem[] : [];
      }
      this.#syncChrome();
      this.#readSpecSlot();
      this.#ensureContentControl();
      this.#mountPanel();
      this.#wireApply();
      this.#wireStyleEditor();
      // Empuja defaults/valores al host vivo (knobs ↔ ejemplar).
      queueMicrotask(() => this.#pushSpecToHost());
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

    get title(): string {
      return this.getAttribute('heading')
        ?? this.getAttribute('title')
        ?? 'Playground';
    }
    set title(v: string) {
      // `title` HTML nativo se hereda como tooltip a knobs/selects → usar heading.
      setStringAttr(this, 'heading', v);
      this.removeAttribute('title');
    }

    get lede(): string { return this.getAttribute('lede') ?? ''; }
    set lede(v: string) { setStringAttr(this, 'lede', v); }

    get target(): string { return this.getAttribute('target') ?? ''; }
    set target(v: string) { setStringAttr(this, 'target', v); }

    get spec(): SpecItem[] { return this.#spec; }
    set spec(v: SpecItem[]) {
      this.#spec = Array.isArray(v) ? v : [];
      this.#ensureContentControl();
      if (this.isConnected) {
        this.#mountPanel();
        queueMicrotask(() => this.#pushSpecToHost());
      }
    }

    #syncChrome(): void {
      const layout = this.layout;
      if (this.getAttribute('layout') !== layout) {
        this.setAttribute('layout', layout);
      }
      this.#titleEl.textContent = this.title;
      // Si alguien puso title= (attr HTML), mover a heading y quitar tooltip nativo.
      if (this.hasAttribute('title')) {
        const t = this.getAttribute('title');
        if (t && !this.hasAttribute('heading')) this.setAttribute('heading', t);
        this.removeAttribute('title');
      }
      const lede = this.lede || (layout === 'split'
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
          if (raw.title && !this.hasAttribute('heading') && !this.hasAttribute('title')) {
            this.setAttribute('heading', String(raw.title));
          }
          if (raw.layout && !this.hasAttribute('layout')) this.setAttribute('layout', String(raw.layout));
          if (raw.lede && !this.hasAttribute('lede')) this.setAttribute('lede', String(raw.lede));
        }
      } catch (e) {
        console.warn('[iswc-playground] spec JSON invalido', e);
      }
    }

    /** Si el host es texto plano y no hay knob content:, lo inyecta. */
    #ensureContentControl(): void {
      const hasContent = this.#spec.some((c) => isContentProp(c.prop));
      if (hasContent) return;
      const host = this.#host();
      if (!host) return;
      // Con hijos elemento (slots/iconos) no inventamos content.
      if (host.children.length > 0) return;
      const text = (host.textContent || '').replace(/\s+/g, ' ').trim();
      this.#spec = [
        {
          control: 'text',
          prop: 'content:',
          label: 'content',
          default: text,
          placeholder: 'Texto del ejemplar',
        },
        ...this.#spec,
      ];
    }

    #mountPanel(): void {
      this.#panel.spec = this.#spec.map((c) => ({ ...c }));
      this.#panel.setAttribute('label', 'Atributos');
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
        if (!detail?.def || !host) {
          console.warn('[iswc-playground] change sin host', detail?.def?.prop, this.target);
          return;
        }
        this.#aplicar(host, detail.def, detail.valor);
        emit(this, 'iswc-controls-change', detail);
      }) as EventListener);
    }

    #wireStyleEditor(): void {
      if (this.#styleBound) return;
      this.#styleBound = true;
      this.#styleCode.formatConfig = { ...DEFAULT_STYLE_FORMAT };
      const applyStyle = (): void => {
        const host = this.#host();
        if (!host) return;
        const css = String(this.#styleCode.value || '').trim();
        if (!css) host.removeAttribute('style');
        else host.setAttribute('style', css);
        emit(this, 'iswc-controls-change', {
          def: { control: 'json', prop: 'attr:style', label: 'style' },
          valor: css,
        });
      };
      this.#styleCode.addEventListener('iswc-input', applyStyle as EventListener);
      this.#styleCode.addEventListener('iswc-change', applyStyle as EventListener);
      this.#styleFormatBtn.addEventListener('click', () => {
        this.#styleCode.format({ ...DEFAULT_STYLE_FORMAT });
        applyStyle();
      });
    }

    #pushSpecToHost(): void {
      const host = this.#host();
      if (!host) return;
      for (const c of this.#spec) {
        const v = c.value !== undefined && c.value !== null ? c.value : c.default;
        if (v === undefined) continue;
        this.#aplicar(host, c, v);
      }
      const style = host.getAttribute('style') || '';
      if (this.#styleCode && this.#styleCode.value !== style) {
        this.#styleCode.value = style;
      }
    }

    #aplicar(host: Element, def: SpecItem, valor: unknown): void {
      const prop = String(def.prop || '');

      if (isContentProp(prop)) {
        host.textContent = valor == null ? '' : String(valor);
        return;
      }

      if (prop === 'style:' || prop === 'attr:style' || prop === 'style') {
        const css = valor == null ? '' : String(valor).trim();
        if (!css) host.removeAttribute('style');
        else host.setAttribute('style', css);
        return;
      }

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
        // Fallback attr si la prop no es writable.
        if (typeof valor === 'boolean') host.toggleAttribute(key, valor);
        else if (valor == null || valor === '') host.removeAttribute(key);
        else host.setAttribute(key, String(valor));
      }
    }
  }

  function isContentProp(prop: string): boolean {
    return prop === 'content:'
      || prop === 'content'
      || prop === 'prop:textContent'
      || prop === 'textContent';
  }

  defineElement('iswc-playground', IswcPlayground, 'IswcPlayground');
})();
