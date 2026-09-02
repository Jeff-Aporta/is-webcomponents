import { adoptCss, defineElement } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import { escapeHtml, copyText } from '../_shared/dom-utils.js';
import { readUrlNav, writeUrlNav } from '../_shared/url-nav.js';

import {
  resolveRef,
  jsdelivrBase,
} from '../_shared/cdn-ref.js';
import { paint } from '../_shared/highlight-code.js';
import {
  SKILL_DOCS,
  LLM_PROMPT_FALLBACK,
  loadAgentPromptMd,
  buildLlmPrompt,
} from '../_shared/llm-agent-prompt.js';
import '../media/icon.js';
import '../helpers/md-editor.js';
import '../code/code.js';

/**
 * <is-cdn-snippet> — panel CDN copy-paste vía loader.min.js (sin npm/npx).
 *
 * Un solo bloque:
 *   <script type="module" src="…/loader.min.js"></script>
 *   <script type="module"> … loadCSS* + load(…) …</script>
 *
 *   tag / category / base / title / dependencies / config
 *
 * Alcance de la carga (radio tag | category | all): el fieldset aparece cuando
 * el host trae tag y/o category; las opciones cuyo atributo falte quedan
 * deshabilitadas. Con `url-key` el alcance se persiste dentro de ?s= (b64url
 * JSON, mismo contrato de url-nav.js que usa <is-tab-group>) y sobrevive al
 * F5; sin url-key el snippet arranca en tag (o category si no hay tag).
 */
(() => {
  const LLM_PROMPT = buildLlmPrompt(SKILL_DOCS, { sha: 'main', base: LLM_PROMPT_FALLBACK });

  /** Opciones del radio de alcance: componente | categoría | kit completo. */
  const SCOPES = ['tag', 'category', 'all'];

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <section class="cdn" aria-label="Consumo por CDN">
      <header class="cdn__head">
        <h3 class="cdn__title">Consumo por CDN</h3>
        <p class="cdn__hint">
          Estrategia única: <code>loader.min.js</code>. Pegá los dos
          <code>&lt;script&gt;</code> en el <code>&lt;head&gt;</code>
          (o al final del <code>&lt;body&gt;</code>). El primero carga el
          loader; el segundo pide CSS + el componente de <code>tag</code>.
        </p>
      </header>

      <div class="cdn__row" data-kind="loader">
        <div class="cdn__row-head">
          <span class="cdn__label">Copy-paste · loader</span>
          <button type="button" class="cdn__copy is-focus-ring" data-copy="loader"
                  aria-label="Copiar snippet del loader">
            <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
            Copiar
          </button>
        </div>
        <is-code class="cdn__pre code is-code-view" data-slot="loader" readonly compact wrap
                 line-numbers="false" lang="html"></is-code>
      </div>

      <fieldset class="cdn__scope" data-slot="scope" hidden>
        <legend class="cdn__scope-legend">Alcance de la carga</legend>
        <label class="cdn__radio"><input type="radio" name="cdn-scope" value="tag"><span>Cargar solo este componente (<code data-slot="scope-tag"></code>)</span></label>
        <label class="cdn__radio"><input type="radio" name="cdn-scope" value="category"><span>Cargar la categoría completa (<code data-slot="scope-cat"></code>)</span></label>
        <label class="cdn__radio"><input type="radio" name="cdn-scope" value="all"><span>Cargar todo el kit (<code>all</code>)</span></label>
      </fieldset>

      <ol class="cdn__list" data-slot="deps-list">
        <li class="cdn__row cdn__row--dep" data-kind="dep" hidden>
          <div class="cdn__row-head">
            <span class="cdn__label cdn__dep-name">Dependencia · <code data-slot="dep-name"></code></span>
            <button type="button" class="cdn__copy is-focus-ring" data-copy="dep"
                    aria-label="Copiar enlaces de la dependencia">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <is-code class="cdn__pre code is-code-view" data-slot="dep-pre" readonly compact wrap
                   line-numbers="false" lang="html"></is-code>
          <p class="cdn__dep-note" data-slot="dep-note" hidden></p>
        </li>
      </ol>

      <section class="cdn__agents" aria-label="Documentación para agentes">
        <header class="cdn__head">
          <h4 class="cdn__docs-title">Para agentes / LLM</h4>
          <p class="cdn__hint">
            Prompt canónico (CDN-only + tools). Vista previa con scroll;
            clic para abrir y copiar. Solo lectura aquí.
          </p>
        </header>
        <div class="cdn__row" data-kind="llm-prompt">
          <div class="cdn__row-head">
            <span class="cdn__label">Prompt · agents</span>
            <button type="button" class="cdn__copy is-focus-ring" data-copy="llm-prompt"
                    aria-label="Copiar prompt para agentes">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <is-md-editor data-slot="llm-prompt" readonly compact preview="split"
                        aria-label="Prompt para agentes"></is-md-editor>
        </div>
      </section>
    </section>
  `;

  class IsCdnSnippet extends withStyleAttrs(HTMLElement) {
    static styleAttrs = {
      radius: '--is-cdn-snippet-radius',
      'border-color': '--is-cdn-snippet-border',
      'pre-bg': '--is-cdn-snippet-pre-bg',
    };

    static get observedAttributes(): string[] {
      return ['tag', 'category', 'base', 'title', 'dependencies', 'config', 'url-key', ...IsCdnSnippet.styleAttrNames];
    }

    #mounted = false;
    #urls = { loader: '', llmPrompt: LLM_PROMPT, loadArg: '' };
    #onHighlightReady = () => this.#render();
    #deps = [];
    #docs: { label: string; url: string; }[] = [];
    #resolvedRef = 'main';
    /** Alcance elegido (radio o ?s=); null = automático según atributos. */
    #scope: string | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      shadow.querySelector<HTMLElement>('[data-slot="scope"]')
        ?.addEventListener('change', this.#onScopeChange);
      shadow.addEventListener('click', this.#onClick);
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      // url-key opt-in: restaurar el alcance persistido en ?s= ANTES del
      // primer render, para que el snippet arranque con la elección recordada.
      if (this.#urlKey) this.#restoreScopeFromUrl();
      this.#render();
      void this.#ensurePromptLoaded();
      resolveRef().then((ref) => {
        if (!this.#mounted) return;
        this.#resolvedRef = ref;
        this.#render();
      }).catch(() => { /* sin red: se queda en main */ });
      document.addEventListener('is-theme-change', this.#onHighlightReady);
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      document.removeEventListener('is-theme-change', this.#onHighlightReady);
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      // La key puede llegar tras el mount (cdn-panel la setea al crear el
      // elemento): adoptar el alcance persistido al aparecer.
      if (name === 'url-key') this.#restoreScopeFromUrl();
      this.#render();
    }

    #cdnBase() {
      if (this.hasAttribute('base')) return String(this.getAttribute('base') || '').replace(/\/?$/, '/');
      return `${jsdelivrBase(this.#resolvedRef || 'main').replace(/\/?$/, '/')}`;
    }

    #loaderHref() {
      return `${this.#cdnBase()}core/loader.min.js`;
    }

    /** Key del estado en ?s= (url-nav). Vacío = sin persistencia. */
    get #urlKey() {
      return (this.getAttribute('url-key') || '').trim();
    }

    /** ¿El host trae tag y/o category? Sin ambos el radio no tiene sentido. */
    #hasScopeTargets() {
      return !!(this.getAttribute('tag') || '').trim()
        || !!(this.getAttribute('category') || '').trim();
    }

    /** Alcance automático (cuando no se eligió radio ni ?s=). */
    #defaultScope() {
      if ((this.getAttribute('tag') || '').trim()) return 'tag';
      if ((this.getAttribute('category') || '').trim()) return 'category';
      return 'all';
    }

    #loadArg() {
      const tag = (this.getAttribute('tag') || '').trim();
      const category = (this.getAttribute('category') || '').trim();
      const scope = this.#scope || this.#defaultScope();
      if (scope === 'tag') return tag || category || '';
      if (scope === 'category') return category || '';
      if (scope === 'all') {
        // Sin tag, sin category y sin url-key el elemento nunca mostró radios:
        // conservar el comportamiento histórico (sin línea load) en lugar de
        // lanzar L.load('all') por sorpresa.
        if (!tag && !category && !this.#urlKey) return '';
        return 'all';
      }
      return tag || category || '';
    }

    /** Sincroniza el fieldset: oculto sin tag/category; radio activo marcado y
     *  las opciones cuyo atributo falte deshabilitadas. */
    #syncScopeUi() {
      const fieldset = this.shadowRoot?.querySelector<HTMLFieldSetElement>('[data-slot="scope"]');
      if (!fieldset) return;
      const tag = (this.getAttribute('tag') || '').trim();
      const category = (this.getAttribute('category') || '').trim();
      // Sin tag ni category el alcance no tiene sentido: ocultar el fieldset.
      fieldset.hidden = !this.#hasScopeTargets();
      const scope = this.#scope || this.#defaultScope();
      const tagCode = fieldset.querySelector<HTMLElement>('[data-slot="scope-tag"]');
      if (tagCode) tagCode.textContent = tag || '(sin tag)';
      const catCode = fieldset.querySelector<HTMLElement>('[data-slot="scope-cat"]');
      if (catCode) catCode.textContent = category || '(sin categoría)';
      for (const label of fieldset.querySelectorAll<HTMLLabelElement>('label.cdn__radio')) {
        const input = label.querySelector<HTMLInputElement>('input[name="cdn-scope"]');
        if (!input) continue;
        const available = input.value === 'all'
          || (input.value === 'tag' && !!tag)
          || (input.value === 'category' && !!category);
        input.disabled = !available;
        label.classList.toggle('is-disabled', !available);
        input.checked = input.value === scope;
      }
    }

    #onScopeChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input || !input.matches?.('input[name="cdn-scope"]')) return;
      const value = input.value;
      if (!SCOPES.includes(value) || input.disabled) return;
      this.#scope = value;
      if (this.#urlKey) this.#persistScopeToUrl(value);
      this.#render();
    };

    /** url-key opt-in: adopta el alcance persistido en ?s= si la opción existe
     *  y no está deshabilitada (su atributo está presente). */
    #restoreScopeFromUrl() {
      const key = this.#urlKey;
      if (!key) return;
      const fromUrl = readUrlNav(key);
      if (!fromUrl || !SCOPES.includes(fromUrl)) return;
      const tag = (this.getAttribute('tag') || '').trim();
      const category = (this.getAttribute('category') || '').trim();
      if (fromUrl === 'tag' && !tag) return;
      if (fromUrl === 'category' && !category) return;
      this.#scope = fromUrl;
    }

    /** url-key opt-in: escribe el alcance dentro de ?s= (b64url JSON). */
    #persistScopeToUrl(scope: string) {
      const key = this.#urlKey;
      if (!key) return;
      writeUrlNav(key, scope);
    }

    #parseConfig() {
      let raw = this.getAttribute('config');
      if (!raw) {
        const script = this.querySelector<HTMLElement>('script[type="application/json"][slot="config"]');
        raw = script?.textContent || '';
      }
      this.#docs = [...SKILL_DOCS];
      if (!raw?.trim()) return null;
      try {
        const cfg = JSON.parse(raw) || {};
        if (Array.isArray(cfg.docs)) {
          const seen = new Set(this.#docs.map((d) => d.url));
          for (const d of cfg.docs) {
            if (!d?.url) continue;
            const url = String(d.url);
            if (seen.has(url)) continue;
            seen.add(url);
            this.#docs.push({ label: String(d.label || 'Documentación'), url });
          }
        }
        return cfg;
      } catch {
        return null;
      }
    }

    #syncLlmPrompt() {
      this.#urls.llmPrompt = buildLlmPrompt(this.#docs, {
        sha: this.#resolvedRef || 'main',
      });
      const ed = this.shadowRoot?.querySelector<HTMLElement>('is-md-editor[data-slot="llm-prompt"]');
      if (ed && ed.value !== this.#urls.llmPrompt) ed.value = this.#urls.llmPrompt;
    }

    async #ensurePromptLoaded() {
      await loadAgentPromptMd();
      if (!this.#mounted) return;
      this.#parseConfig();
      this.#syncLlmPrompt();
    }

    #parseDeps() {
      let raw = this.getAttribute('dependencies');
      if (!raw) {
        const script = this.querySelector<HTMLElement>('script[type="application/json"][slot="deps"]');
        raw = script?.textContent || '';
      }
      if (!raw?.trim()) { this.#deps = []; return; }
      try {
        const data = JSON.parse(raw);
        this.#deps = Array.isArray(data)
          ? data.filter((d) => d && (d.js || d.css)).map((d) => ({
              name: String(d.name || 'dependencia'),
              version: d.version ? String(d.version) : '',
              css: d.css ? String(d.css) : '',
              js: d.js ? String(d.js) : '',
              note: d.note ? String(d.note) : '',
            }))
          : [];
      } catch { this.#deps = []; }
    }

    #buildDepSnippet(dep) {
      const lines = [];
      if (dep.css) lines.push(`<link rel="stylesheet" href="${dep.css}">`);
      if (dep.js) lines.push(`<script src="${dep.js}"><\/script>`);
      return lines.join('\n');
    }

    #buildLoaderSnippet() {
      const href = this.#loaderHref();
      const arg = this.#loadArg();
      const loadLine = arg ? `  await L.load(${JSON.stringify(arg)});` : '';
      return [
        `<script type="module" src="${href}"><\/script>`,
        `<script type="module">`,
        `  const L = globalThis.ISWebComponentsLoader;`,
        `  await L.loadCSSBase();`,
        `  await L.loadCSSPalettesDefault();`,
        loadLine,
        `<\/script>`,
      ].filter(Boolean).join('\n');
    }

    #renderDeps() {
      const root = this.shadowRoot!;
      const list = root.querySelector<HTMLElement>('[data-slot="deps-list"]');
      const template = root.querySelector<HTMLElement>('[data-kind="dep"][hidden]');
      if (!list || !template) return;
      for (const row of list.querySelectorAll<HTMLElement>('[data-kind="dep"]:not([hidden])')) row.remove();
      for (const dep of this.#deps) {
        const clone = template.cloneNode(true);
        clone.hidden = false;
        const label = clone.querySelector<HTMLElement>('[data-slot="dep-name"]');
        if (label) label.textContent = dep.version ? `${dep.name}@${dep.version}` : dep.name;
        const pre = clone.querySelector<HTMLElement>('[data-slot="dep-pre"]');
        const snippet = this.#buildDepSnippet(dep);
        this.#setCode(pre, snippet);
        const note = clone.querySelector<HTMLElement>('[data-slot="dep-note"]');
        if (note) { note.textContent = dep.note; note.hidden = !dep.note; }
        const btn = clone.querySelector<HTMLElement>('[data-copy="dep"]');
        if (btn) btn.dataset.copyValue = snippet;
        list.insertBefore(clone, template);
      }
    }

    #setCode(el, text) {
      if (!el) return;
      const src = text || '';
      if (el.localName === 'is-code') {
        if (el.value !== src) el.value = src;
        el.dataset.cmSource = src;
        delete el.dataset.cm;
      } else {
        el.textContent = src;
      }
    }

    #render() {
      const root = this.shadowRoot!;
      if (!root) return;

      const loadArg = this.#loadArg();
      this.#urls = {
        loader: this.#buildLoaderSnippet(),
        loadArg,
        llmPrompt: this.#urls.llmPrompt || LLM_PROMPT,
      };

      const titleEl = root.querySelector<HTMLElement>('.cdn__title');
      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      this.#setCode(root.querySelector<HTMLElement>('[data-slot="loader"]'), this.#urls.loader);

      const cfg = this.#parseConfig();
      if (cfg?.title && titleEl) titleEl.textContent = cfg.title;
      this.#syncLlmPrompt();
      const llmPromptEd = root.querySelector<HTMLElement>('[data-slot="llm-prompt"]');
      if (llmPromptEd && llmPromptEd.tagName === 'IS-MD-EDITOR') {
        llmPromptEd.value = this.#urls.llmPrompt;
      }

      this.#parseDeps();
      this.#renderDeps();
      this.#syncScopeUi();
      this.#highlight();
    }

    #highlight() {
      for (const ed of this.shadowRoot!.querySelectorAll<HTMLElement>('is-code.cdn__pre')) {
        if (!(ed.value || '').trim()) continue;
        ed.dataset.cmMode = 'htmlmixed';
        delete ed.dataset.cm;
        void paint(ed);
      }
    }

    #onClick = async (e: Event) => {
      const btn = e.target.closest('.cdn__copy');
      if (!btn) return;
      e.preventDefault();
      const kind = btn.dataset.copy;
      let text = '';
      if (kind === 'dep') text = btn.dataset.copyValue || '';
      else if (kind === 'llm-prompt') text = this.#urls.llmPrompt || LLM_PROMPT;
      else if (kind === 'loader') text = this.#urls.loader || this.#buildLoaderSnippet();
      if (!text) return;
      await copyText(text);
      const original = btn.innerHTML;
      btn.innerHTML = '<is-icon icon="mdi:check" aria-hidden="true"></is-icon> Copiado';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('is-copied');
      }, 1200);
    };
  }

  defineElement('is-cdn-snippet', IsCdnSnippet, 'IsCdnSnippet');
})();
