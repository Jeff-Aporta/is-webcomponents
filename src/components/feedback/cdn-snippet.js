import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { escapeHtml, copyText } from '../_shared/dom-utils.js';

import {
  resolveRef,
  jsdelivrBase,
  MIRRORS,
  mirrorById,
  readMirrorId,
  writeMirrorId,
  fallbackBases,
} from '../_shared/cdn-ref.js';
import { totalCdnSize } from '../_shared/cdn-sizes.js';
import { paint } from '../_shared/highlight-code.js';
import { readUrlNav, writeUrlNav } from '../_shared/url-nav.js';
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
 * <is-cdn-snippet> — panel CDN + mirrors + docs para agentes (sin npm/npx).
 *
 * Tabs
 *   enlaces  · snippets del espejo activo (jsDelivr / Pages)
 *   mirrors  · selector de espejo + boot con fallback encadenado
 *
 * Atributos
 *   tag         string  · p. ej. "is-button"
 *   category    string  · p. ej. "actions"
 *   base        string  · override del CDN_BASE (opcional; ignora espejo)
 *   title       string  · título del panel
 *   dependencies / config · ver #parseDeps / #parseConfig
 *   url-key     string · opt-in: tab Enlaces/Mirrors en `?s=` (`{ [url-key]: … }`)
 */
(() => {
  const CDN_BASE_DEFAULT = jsdelivrBase('main');

  const LLM_PROMPT = buildLlmPrompt(SKILL_DOCS, { sha: 'main', base: LLM_PROMPT_FALLBACK });

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <section class="cdn" aria-label="Enlaces CDN">
      <header class="cdn__head">
        <h3 class="cdn__title">Consumo por CDN</h3>
        <p class="cdn__hint">
          Primero el CSS común; luego el JS del componente (o el bundle de
          categoría / <code>all.min.js</code>). Usa el tab
          <strong>Mirrors</strong> para cambiar de espejo o copiar un boot
          con fallback.
        </p>
      </header>

      <div class="cdn__tabs" role="tablist" aria-label="CDN">
        <button type="button" class="cdn__tab is-focus-ring" role="tab" id="tab-enlaces"
                data-tab="enlaces" aria-selected="true" aria-controls="panel-enlaces">
          Enlaces
        </button>
        <button type="button" class="cdn__tab is-focus-ring" role="tab" id="tab-mirrors"
                data-tab="mirrors" aria-selected="false" aria-controls="panel-mirrors">
          Mirrors
        </button>
      </div>

      <div class="cdn__panel" role="tabpanel" id="panel-enlaces" data-panel="enlaces"
           aria-labelledby="tab-enlaces">
        <div class="cdn__mirrors" data-slot="mirror-chips" role="group" aria-label="Espejo activo"></div>
        <ol class="cdn__list">
          <li class="cdn__row" data-kind="common">
            <div class="cdn__row-head">
              <span class="cdn__label">
                1 · CSS común (una vez por página)
                <is-format-bytes class="cdn__size" data-slot="size-common" autofit display="short" hidden></is-format-bytes>
              </span>
              <button type="button" class="cdn__copy is-focus-ring" data-copy="common" aria-label="Copiar enlaces comunes">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <is-code class="cdn__pre code is-code-view" data-slot="common" readonly compact wrap line-numbers="false" lang="html"></is-code>
          </li>
          <li class="cdn__row" data-kind="single">
            <div class="cdn__row-head">
              <span class="cdn__label">
                2 · JS del componente · <code data-slot="fileTag"></code>
                <is-format-bytes class="cdn__size" data-slot="size-single" autofit display="short" hidden></is-format-bytes>
              </span>
              <button type="button" class="cdn__copy is-focus-ring" data-copy="single" aria-label="Copiar enlace individual">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <is-code class="cdn__pre code is-code-view" data-slot="single" readonly compact wrap line-numbers="false" lang="html"></is-code>
          </li>
          <li class="cdn__row" data-kind="category">
            <div class="cdn__row-head">
              <span class="cdn__label">
                Alternativa · categoría · <code data-slot="category"></code>
                <is-format-bytes class="cdn__size" data-slot="size-category" autofit display="short" hidden></is-format-bytes>
              </span>
              <button type="button" class="cdn__copy is-focus-ring" data-copy="category" aria-label="Copiar bundle de categoría">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <is-code class="cdn__pre code is-code-view" data-slot="category-pre" readonly compact wrap line-numbers="false" lang="html"></is-code>
          </li>
          <li class="cdn__row cdn__row--dep" data-kind="dep" hidden>
            <div class="cdn__row-head">
              <span class="cdn__label cdn__dep-name">Dependencia · <code data-slot="dep-name"></code></span>
              <button type="button" class="cdn__copy is-focus-ring" data-copy="dep" aria-label="Copiar enlaces de la dependencia">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <is-code class="cdn__pre code is-code-view" data-slot="dep-pre" readonly compact wrap line-numbers="false" lang="html"></is-code>
            <p class="cdn__dep-note" data-slot="dep-note" hidden></p>
          </li>
          <li class="cdn__row" data-kind="all">
            <div class="cdn__row-head">
              <span class="cdn__label">
                Alternativa · todo el kit · <code>all.min.js</code>
                <is-format-bytes class="cdn__size" data-slot="size-all" autofit display="short" hidden></is-format-bytes>
              </span>
              <button type="button" class="cdn__copy is-focus-ring" data-copy="all" aria-label="Copiar bundle completo">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <is-code class="cdn__pre code is-code-view" data-slot="all" readonly compact wrap line-numbers="false" lang="html"></is-code>
          </li>
        </ol>
      </div>

      <div class="cdn__panel" role="tabpanel" id="panel-mirrors" data-panel="mirrors"
           aria-labelledby="tab-mirrors" hidden>
        <p class="cdn__hint">
          Un solo espejo por página (los imports relativos entre bundles no
          mezclan orígenes). Default: cerrar no aplica aquí — si jsDelivr
          cae, el boot prueba Pages.
        </p>
        <div class="cdn__mirrors" data-slot="mirror-list"></div>
        <div class="cdn__row" data-kind="boot">
          <div class="cdn__row-head">
            <span class="cdn__label">Boot con fallback · jsDelivr → Pages</span>
            <button type="button" class="cdn__copy is-focus-ring" data-copy="boot" aria-label="Copiar boot con fallback">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <is-code class="cdn__pre code is-code-view" data-slot="boot" readonly compact wrap line-numbers="false" lang="html"></is-code>
        </div>
      </div>

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
            <span class="cdn__label">Prompt · kit por CDN + referencias</span>
            <button type="button" class="cdn__copy is-focus-ring" data-copy="llm-prompt" aria-label="Copiar prompt para agentes">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <is-md-editor
            class="cdn__md-prompt"
            data-slot="llm-prompt"
            label="Prompt · IS Web Components"
            edit-block-reason="Solo lectura: revisa y copia el prompt"
            placeholder="Cargando prompt…"
            style="--preview-max-height: 18rem;"
          ></is-md-editor>
        </div>
      </section>
    </section>
  `;

  const OBSERVED = ['tag', 'category', 'base', 'title', 'dependencies', 'config', 'url-key'];

  class IsCdnSnippet extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    radius: '--is-cdn-snippet-radius',
    'border-color': { prop: '--is-cdn-snippet-border', onlyColorValues: true },
    'pre-bg': { prop: '--is-cdn-snippet-pre-bg', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'radius', 'border-color', 'pre-bg']; }

    #mounted = false;
    #urls = { single: '', category: '', all: '', llmPrompt: LLM_PROMPT, boot: '' };
    #onHighlightReady = () => this.#render();
    #deps = [];
    #docs = [];
    #resolvedRef = 'main';
    #mirrorId = readMirrorId();
    #tab = 'enlaces';
    #restoringUrl = false;
    /** @type {number} evita pintar pesos de un render obsoleto */
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
      this.#mirrorId = readMirrorId();
      this.#restoreTabFromUrl();
      this.#render();
      void this.#ensurePromptLoaded();
      resolveRef().then((ref) => {
        if (!this.#mounted) return;
        this.#resolvedRef = ref;
        this.#render();
      }).catch(() => { /* sin red: se queda en main */ });
      this.shadowRoot.addEventListener('slotchange', () => this.#render());
      document.addEventListener('is-theme-change', this.#onHighlightReady);
    }

    disconnectedCallback() {
      this.#mounted = false;
      document.removeEventListener('is-theme-change', this.#onHighlightReady);
    }

    attributeChangedCallback(name, oldVal, newVal) {

      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'url-key') this.#restoreTabFromUrl();
      this.#render();
    }

    get urlKey() { return (this.getAttribute('url-key') || '').trim(); }
    set urlKey(v) {
      if (v == null || v === '') this.removeAttribute('url-key');
      else this.setAttribute('url-key', String(v));
    }

    #restoreTabFromUrl() {
      const key = this.urlKey;
      if (!key) return;
      const fromUrl = readUrlNav(key);
      if (fromUrl !== 'enlaces' && fromUrl !== 'mirrors') return;
      this.#restoringUrl = true;
      this.#tab = fromUrl;
      this.#restoringUrl = false;
    }

    #persistTabToUrl() {
      if (this.#restoringUrl) return;
      const key = this.urlKey;
      if (!key) return;
      writeUrlNav(key, this.#tab);
    }

    #activeBase() {
      if (this.hasAttribute('base')) return this.getAttribute('base');
      return mirrorById(this.#mirrorId).base(this.#resolvedRef);
    }

    #parseConfig() {
      let raw = this.getAttribute('config');
      if (!raw) {
        const script = this.querySelector('script[type="application/json"][slot="config"]');
        raw = script?.textContent || '';
      }
      /** Skills + MD del módulo/categoría: todo va al prompt único. */
      this.#docs = [...SKILL_DOCS];
      if (!raw.trim()) return null;
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

    /** Regenera el prompt único con las refs actuales (`#docs`). */
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
      if (!raw.trim()) { this.#deps = []; return; }
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

    #renderDeps() {
      const root = this.shadowRoot;
      const template = root.querySelector('[data-kind="dep"][hidden]');
      if (!template) return;
      for (const row of root.querySelectorAll('[data-kind="dep"]:not([hidden])')) row.remove();
      const list = root.querySelector('.cdn__list');
      for (const dep of this.#deps) {
        const clone = template.cloneNode(true);
        clone.hidden = false;
        const label = clone.querySelector('[data-slot="dep-name"]');
        if (label) label.textContent = dep.version ? `${dep.name}@${dep.version}` : dep.name;
        const pre = clone.querySelector('[data-slot="dep-pre"]');
        const snippet = this.#buildDepSnippet(dep);
        if (pre) {
          if (pre.localName === 'is-code') {
            pre.value = snippet;
            pre.dataset.cmSource = snippet;
            delete pre.dataset.cm;
          } else {
            pre.textContent = snippet;
          }
        }
        const note = clone.querySelector('[data-slot="dep-note"]');
        if (note) { note.textContent = dep.note; note.hidden = !dep.note; }
        const btn = clone.querySelector('[data-copy="dep"]');
        if (btn) btn.dataset.copyValue = snippet;
        list.insertBefore(clone, template);
      }
    }

    #buildBootSnippet() {
      const bases = fallbackBases(this.#resolvedRef);
      const tag = this.getAttribute('tag') || '';
      const category = this.getAttribute('category') || '';
      const fileTag = tag.replace(/^is-/, '');
      const entry = (tag && category)
        ? `${category}/${fileTag}.min.js`
        : 'all.min.js';

      return `<script type="module">
/* IS WC — boot espejos: jsDelivr(pin)→Pages. Un origen gana. */
const MIRRORS=${JSON.stringify(bases)},ENTRY=${JSON.stringify(entry)};
const loadCss=href=>new Promise((ok,bad)=>{
  document.head.append(Object.assign(document.createElement('link'),{
    rel:'stylesheet',href,onload:()=>ok(),onerror:()=>bad(new Error(href)),
  }));
});
let ok=false;
for(const base of MIRRORS){
  try{
    await loadCss(base+'/is-base.min.css');
    await loadCss(base+'/palettes.min.css');
    await import(base+'/'+ENTRY);
    ok=true;break;
  }catch(err){console.warn('[is-cdn] espejo falló',base,err)}
}
if(!ok)throw new Error('[is-cdn] ningún espejo respondió');
<\/script>`;
    }

    #buildUrls() {
      const base = this.#activeBase() || CDN_BASE_DEFAULT;
      const tag = this.getAttribute('tag');
      const category = this.getAttribute('category');
      const fileTag = (tag || '').replace(/^is-/, '');
      this.#urls = {
        common: `${base}/is-base.min.css`,
        commonPalette: `${base}/palettes.min.css`,
        single: (tag && category) ? `${base}/${category}/${fileTag}.min.js` : '',
        category: (tag && category) ? `${base}/${category}/category.${category}.min.js` : '',
        all: `${base}/all.min.js`,
        llmPrompt: LLM_PROMPT,
        boot: this.#buildBootSnippet(),
      };
    }

    #renderMirrorChips() {
      const root = this.shadowRoot;
      for (const slot of root.querySelectorAll('[data-slot="mirror-chips"], [data-slot="mirror-list"]')) {
        slot.textContent = '';
        for (const m of MIRRORS) {
          const base = m.base(this.#resolvedRef);
          if (slot.dataset.slot === 'mirror-chips') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cdn__chip';
            btn.dataset.mirror = m.id;
            btn.setAttribute('aria-pressed', String(m.id === this.#mirrorId));
            btn.innerHTML = `<span class="cdn__chip-label">${escapeHtml(m.label)}</span>`;
            if (m.id === this.#mirrorId) btn.classList.add('is-active');
            slot.appendChild(btn);
          } else {
            const row = document.createElement('div');
            row.className = 'cdn__mirror-card';
            row.dataset.mirror = m.id;
            if (m.id === this.#mirrorId) row.classList.add('is-active');
            row.innerHTML = `
              <div class="cdn__mirror-head">
                <strong>${escapeHtml(m.label)}</strong>
                <span class="cdn__mirror-hint">${escapeHtml(m.hint)}</span>
                <button type="button" class="cdn__chip" data-mirror="${escapeHtml(m.id)}"
                        aria-pressed="${m.id === this.#mirrorId}">
                  ${m.id === this.#mirrorId ? 'Activo' : 'Usar'}
                </button>
              </div>
              <code class="cdn__mirror-base">${escapeHtml(base)}</code>
            `;
            slot.appendChild(row);
          }
        }
      }
    }

    #syncTabs() {
      const root = this.shadowRoot;
      for (const tab of root.querySelectorAll('.cdn__tab')) {
        const on = tab.dataset.tab === this.#tab;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      }
      for (const panel of root.querySelectorAll('[data-panel]')) {
        panel.hidden = panel.dataset.panel !== this.#tab;
      }
    }

    #render() {
      const root = this.shadowRoot;
      if (!root) return;
      const tag = this.getAttribute('tag') || '';
      const category = this.getAttribute('category') || '';
      this.#buildUrls();
      this.#syncTabs();
      this.#renderMirrorChips();

      const titleEl = root.querySelector('.cdn__title');
      const fileTagEl = root.querySelector('[data-slot="fileTag"]');
      const catLabelEl = root.querySelector('[data-slot="category"]');
      const commonPre = root.querySelector('[data-slot="common"]');
      const singlePre = root.querySelector('[data-slot="single"]');
      const catPre = root.querySelector('[data-slot="category-pre"]');
      const allPre = root.querySelector('[data-slot="all"]');
      const llmPromptEd = root.querySelector('[data-slot="llm-prompt"]');
      const bootPre = root.querySelector('[data-slot="boot"]');

      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      if (fileTagEl) fileTagEl.textContent = (tag && category) ? `${category}/${tag.replace(/^is-/, '')}.min.js` : '—';
      if (catLabelEl) catLabelEl.textContent = category ? `${category}/category.${category}.min.js` : '—';

      const mkCss = (url) => url ? `<link rel="stylesheet" href="${escapeHtml(url)}">` : '';
      const mkJs = (url) => url ? `<script type="module" src="${escapeHtml(url)}"><\/script>` : '—';

      const commonSnippet = [mkCss(this.#urls.common), mkCss(this.#urls.commonPalette)].join('\n');
      const setCode = (el, text) => {
        if (!el) return;
        const src = text || '';
        if (el.localName === 'is-code') {
          if (el.value !== src) el.value = src;
          el.dataset.cmSource = src;
          delete el.dataset.cm;
        } else {
          el.textContent = src;
        }
      };
      setCode(commonPre, commonSnippet);
      setCode(singlePre, mkJs(this.#urls.single));
      setCode(catPre, mkJs(this.#urls.category));
      setCode(allPre, mkJs(this.#urls.all));
      setCode(bootPre, this.#urls.boot);

      const singleRow = root.querySelector('[data-kind="single"]');
      if (singleRow) singleRow.hidden = !tag;

      const cfg = this.#parseConfig();
      if (cfg?.title && titleEl) titleEl.textContent = cfg.title;
      this.#syncLlmPrompt();
      if (llmPromptEd && llmPromptEd.tagName === 'IS-MD-EDITOR') {
        llmPromptEd.value = this.#urls.llmPrompt;
      }

      this.#parseDeps();
      this.#renderDeps();
      this.#paintSizes();
      this.#highlight();
    }

    /**
     * Pinta el peso real (sizes.json) en cada caption con <is-format-bytes autofit>.
     * category / all expanden a los .min.js que acabarán bajando.
     * En localhost prioriza `dist/cdn/sizes.json` (build local fresco).
     */
    #paintSizes() {
      const root = this.shadowRoot;
      if (!root) return;
      const cdnBase = this.#activeBase() || CDN_BASE_DEFAULT;
      const host = globalThis.location?.hostname || '';
      const localDev = host === 'localhost' || host === '127.0.0.1';
      const sizeBase = localDev
        ? `${globalThis.location.origin}/dist/cdn`
        : cdnBase;
      const gen = ++this.#sizeGen;
      const jobs = [
        ['size-common', [this.#urls.common, this.#urls.commonPalette].filter(Boolean)],
        ['size-single', this.#urls.single ? [this.#urls.single] : []],
        ['size-category', this.#urls.category ? [this.#urls.category] : []],
        ['size-all', this.#urls.all ? [this.#urls.all] : []],
      ];

      for (const [slot] of jobs) {
        const el = root.querySelector(`[data-slot="${slot}"]`);
        if (el) { el.removeAttribute('value'); el.hidden = true; }
      }

      Promise.all(jobs.map(async ([slot, urls]) => {
        if (!urls.length) return [slot, null];
        let bytes = await totalCdnSize(urls, sizeBase);
        if (bytes == null && sizeBase !== cdnBase) {
          bytes = await totalCdnSize(urls, cdnBase);
        }
        return [slot, bytes];
      })).then((rows) => {
        if (!this.#mounted || gen !== this.#sizeGen) return;
        for (const [slot, bytes] of rows) {
          const el = root.querySelector(`[data-slot="${slot}"]`);
          if (!el) continue;
          if (bytes == null || !Number.isFinite(bytes)) {
            el.removeAttribute('value');
            el.hidden = true;
            continue;
          }
          el.setAttribute('value', String(bytes));
          el.hidden = false;
        }
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
      const tab = e.target.closest('.cdn__tab');
      if (tab?.dataset.tab) {
        this.#tab = tab.dataset.tab;
        this.#persistTabToUrl();
        this.#syncTabs();
        return;
      }

      const chip = e.target.closest('[data-mirror]');
      if (chip?.dataset.mirror) {
        this.#mirrorId = chip.dataset.mirror;
        writeMirrorId(this.#mirrorId);
        this.#render();
        return;
      }

      const btn = e.target.closest('.cdn__copy');
      if (!btn) return;
      e.preventDefault();
      const kind = btn.dataset.copy;
      const asCss = (u) => (u ? `<link rel="stylesheet" href="${u}">` : '');
      const asJs = (u) => (u ? `<script type="module" src="${u}"><\/script>` : '');
      let text = '';
      if (kind === 'dep') {
        text = btn.dataset.copyValue || '';
      } else if (kind === 'llm-prompt') {
        text = this.#urls.llmPrompt || LLM_PROMPT;
      } else if (kind === 'boot') {
        text = this.#urls.boot || this.#buildBootSnippet();
      } else if (kind === 'common') {
        text = [asCss(this.#urls.common), asCss(this.#urls.commonPalette)].filter(Boolean).join('\n');
      } else {
        text = asJs(this.#urls[kind]);
      }
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
