import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { escapeHtml, copyText } from '../_shared/dom-utils.js';

import {
  resolveRef,
  jsdelivrBase,
} from '../_shared/cdn-ref.js';
import { totalCdnSize } from '../_shared/cdn-sizes.js';
import { paint } from '../_shared/highlight-code.js';
import {
  SKILL_DOCS,
  LLM_PROMPT_FALLBACK,
  loadAgentPromptMd,
  buildLlmPrompt,
} from '../_shared/llm-agent-prompt.js';
import '../media/icon.js';
import '../helpers/format-bytes.js';
import '../helpers/md-editor.js';
import '../code/code.js';
import { defineElement } from '../_shared/define.js';

/**
 * <is-cdn-snippet> — panel CDN copy-paste vía loader.min.js (sin npm/npx).
 *
 * Un solo bloque:
 *   <script type="module" src="…/loader.min.js"></script>
 *   <script type="module"> … loadCSS* + load(…) …</script>
 *
 *   tag / category / base / title / dependencies / config
 */
(() => {
  const LLM_PROMPT = buildLlmPrompt(SKILL_DOCS, { sha: 'main', base: LLM_PROMPT_FALLBACK });

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
          <span class="cdn__label">
            Copy-paste · loader
            <is-format-bytes class="cdn__size" data-slot="size-loader" autofit display="short" hidden></is-format-bytes>
          </span>
          <button type="button" class="cdn__copy is-focus-ring" data-copy="loader"
                  aria-label="Copiar snippet del loader">
            <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
            Copiar
          </button>
        </div>
        <is-code class="cdn__pre code is-code-view" data-slot="loader" readonly compact wrap
                 line-numbers="false" lang="html"></is-code>
      </div>

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

    static get observedAttributes() {
      return ['tag', 'category', 'base', 'title', 'dependencies', 'config', ...IsCdnSnippet.styleAttrNames];
    }

    #mounted = false;
    #urls = { loader: '', llmPrompt: LLM_PROMPT, loadArg: '' };
    #onHighlightReady = () => this.#render();
    #deps = [];
    #docs = [];
    #resolvedRef = 'main';
    #sizeGen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      shadow.addEventListener('click', this.#onClick);
    }

    connectedCallback() {
      super.connectedCallback();
      this.#mounted = true;
      this.#render();
      void this.#ensurePromptLoaded();
      resolveRef().then((ref) => {
        if (!this.#mounted) return;
        this.#resolvedRef = ref;
        this.#render();
      }).catch(() => { /* sin red: se queda en main */ });
      document.addEventListener('is-theme-change', this.#onHighlightReady);
    }

    disconnectedCallback() {
      this.#mounted = false;
      document.removeEventListener('is-theme-change', this.#onHighlightReady);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    #cdnBase() {
      if (this.hasAttribute('base')) return String(this.getAttribute('base') || '').replace(/\/?$/, '/');
      return `${jsdelivrBase(this.#resolvedRef || 'main').replace(/\/?$/, '/')}`;
    }

    #loaderHref() {
      return `${this.#cdnBase()}loader.min.js`;
    }

    #loadArg() {
      const tag = (this.getAttribute('tag') || '').trim();
      if (tag) return tag;
      const category = (this.getAttribute('category') || '').trim();
      return category || '';
    }

    #parseConfig() {
      let raw = this.getAttribute('config');
      if (!raw) {
        const script = this.querySelector('script[type="application/json"][slot="config"]');
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
      const ed = this.shadowRoot?.querySelector('is-md-editor[data-slot="llm-prompt"]');
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
        const script = this.querySelector('script[type="application/json"][slot="deps"]');
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
      const root = this.shadowRoot;
      const list = root.querySelector('[data-slot="deps-list"]');
      const template = root.querySelector('[data-kind="dep"][hidden]');
      if (!list || !template) return;
      for (const row of list.querySelectorAll('[data-kind="dep"]:not([hidden])')) row.remove();
      for (const dep of this.#deps) {
        const clone = template.cloneNode(true);
        clone.hidden = false;
        const label = clone.querySelector('[data-slot="dep-name"]');
        if (label) label.textContent = dep.version ? `${dep.name}@${dep.version}` : dep.name;
        const pre = clone.querySelector('[data-slot="dep-pre"]');
        const snippet = this.#buildDepSnippet(dep);
        this.#setCode(pre, snippet);
        const note = clone.querySelector('[data-slot="dep-note"]');
        if (note) { note.textContent = dep.note; note.hidden = !dep.note; }
        const btn = clone.querySelector('[data-copy="dep"]');
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
      const root = this.shadowRoot;
      if (!root) return;

      const loadArg = this.#loadArg();
      this.#urls = {
        loader: this.#buildLoaderSnippet(),
        loadArg,
        llmPrompt: this.#urls.llmPrompt || LLM_PROMPT,
      };

      const titleEl = root.querySelector('.cdn__title');
      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      this.#setCode(root.querySelector('[data-slot="loader"]'), this.#urls.loader);

      const cfg = this.#parseConfig();
      if (cfg?.title && titleEl) titleEl.textContent = cfg.title;
      this.#syncLlmPrompt();
      const llmPromptEd = root.querySelector('[data-slot="llm-prompt"]');
      if (llmPromptEd && llmPromptEd.tagName === 'IS-MD-EDITOR') {
        llmPromptEd.value = this.#urls.llmPrompt;
      }

      this.#parseDeps();
      this.#renderDeps();
      this.#paintSizes();
      this.#highlight();
    }

    #paintSizes() {
      const root = this.shadowRoot;
      if (!root) return;
      const base = this.#cdnBase();
      const host = globalThis.location?.hostname || '';
      const localDev = host === 'localhost' || host === '127.0.0.1';
      const sizeBase = localDev ? `${globalThis.location.origin}/dist/cdn/` : base;
      const gen = ++this.#sizeGen;
      const tag = (this.getAttribute('tag') || '').replace(/^is-/, '');
      const category = (this.getAttribute('category') || '').trim();

      const urls = [`${base}loader.min.js`, `${base}is-base.min.css`, `${base}palettes.min.css`];
      if (tag && category) urls.push(`${base}${category}/${tag}.min.js`);

      const el = root.querySelector('[data-slot="size-loader"]');
      if (el) { el.removeAttribute('value'); el.hidden = true; }

      Promise.all([
        totalCdnSize(urls, sizeBase),
        sizeBase !== base ? totalCdnSize(urls, base) : Promise.resolve(null),
      ]).then(([localBytes, remoteBytes]) => {
        if (!this.#mounted || gen !== this.#sizeGen || !el) return;
        const bytes = localBytes ?? remoteBytes;
        if (bytes == null || !Number.isFinite(bytes)) {
          el.removeAttribute('value');
          el.hidden = true;
          return;
        }
        el.setAttribute('value', String(bytes));
        el.hidden = false;
      });
    }

    #highlight() {
      for (const ed of this.shadowRoot.querySelectorAll('is-code.cdn__pre')) {
        if (!(ed.value || '').trim()) continue;
        ed.dataset.cmMode = 'htmlmixed';
        delete ed.dataset.cm;
        void paint(ed);
      }
    }

    #onClick = async (e) => {
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
